import { describe, it, expect } from 'vitest';
import { calculateTaxAwareRebalance, DEVIATION_BAND } from './traspaso';
import type { Asset, InstrumentType, PortfolioPosition, Transaction } from './types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 15);

function makeAsset(ticker: string, type: InstrumentType, targetWeight: number): Asset {
	return {
		ticker,
		name: ticker,
		isin: '',
		targetWeight,
		color: '#000',
		icon: '📈',
		ter: 0,
		category: 'core',
		instrumentType: type
	};
}

/**
 * Construye posiciones coherentes: `targetValue` se calcula sobre el capital
 * total de la categoría, igual que hace `calculatePortfolioState`. Si se pasara
 * a mano se podrían escribir tests que cuadran con datos imposibles.
 */
function makePositions(
	specs: { ticker: string; type: InstrumentType; value: number; target: number; unitPrice?: number }[]
): PortfolioPosition[] {
	const total = specs.reduce((sum, s) => sum + s.value, 0);
	return specs.map((spec) => {
		const asset = makeAsset(spec.ticker, spec.type, spec.target);
		const unitPrice = spec.unitPrice ?? 10;
		return {
			asset,
			holdings: unitPrice > 0 ? spec.value / unitPrice : 0,
			avgCost: unitPrice,
			totalCost: spec.value,
			unitPrice,
			totalValue: spec.value,
			currentWeight: total > 0 ? spec.value / total : 0,
			deviation: (total > 0 ? spec.value / total : 0) - spec.target,
			targetValue: total * spec.target,
			targetHoldings: unitPrice > 0 ? (total * spec.target) / unitPrice : 0,
			profit: 0,
			profitPercent: 0,
			dailyChangeValue: 0,
			dailyChangePercent: 0
		};
	});
}

function tx(partial: Partial<Transaction>): Transaction {
	return {
		id: Math.random().toString(36),
		ticker: 'X',
		type: 'buy',
		date: NOW - 800 * DAY,
		shares: 0,
		price: 0,
		currency: 'EUR',
		fees: 0,
		fxRate: 1,
		...partial
	};
}

describe('calculateTaxAwareRebalance: fondo a fondo', () => {
	// Cartera 60/40 que se ha ido a 70/30. Los dos son fondos.
	const positions = makePositions([
		{ ticker: 'WORLD', type: 'fund', value: 7000, target: 0.6 },
		{ ticker: 'BONDS', type: 'fund', value: 3000, target: 0.4 }
	]);

	it('propone el traspaso exacto y sin coste fiscal', () => {
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], { now: NOW });

		expect(result.plans[0].moves).toHaveLength(1);
		const move = result.plans[0].moves[0];
		expect(move.from.ticker).toBe('WORLD');
		expect(move.to.ticker).toBe('BONDS');
		// Objetivo: 6.000 / 4.000. Hay que mover 1.000.
		expect(move.amount).toBe(1000);
		expect(move.kind).toBe('traspaso');
		expect(move.taxFree).toBe(true);
		expect(move.estimatedTax).toBe(0);
		expect(move.realizedGain).toBe(0);
	});

	it('deja la cartera en el objetivo, no cerca', () => {
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], { now: NOW });
		expect(result.plans[0].maxDeviationBefore).toBeCloseTo(0.1, 6);
		expect(result.plans[0].maxDeviationAfter).toBeLessThan(1e-9);
	});

	it('no cobra impuesto por mover un fondo con plusvalía enorme', () => {
		// El punto entero de la funcionalidad: aquí hay 6.000 € de ganancia
		// latente y el traspaso sigue costando cero.
		const transactions = [tx({ ticker: 'WORLD', shares: 700, price: 1.43 })];
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], transactions, {
			now: NOW
		});
		expect(result.totalEstimatedTax).toBe(0);
		expect(result.taxFreeAmount).toBe(1000);
		expect(result.taxableAmount).toBe(0);
	});
});

describe('calculateTaxAwareRebalance: lo que sí tributa', () => {
	it('un ETF con excedente tributa por FIFO al venderse', () => {
		const positions = makePositions([
			{ ticker: 'ETF', type: 'etf', value: 7000, target: 0.6, unitPrice: 100 },
			{ ticker: 'FUND', type: 'fund', value: 3000, target: 0.4 }
		]);
		// 70 títulos comprados a 50 €: coste 3.500, valor 7.000.
		const transactions = [tx({ ticker: 'ETF', shares: 70, price: 50 })];

		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], transactions, {
			now: NOW
		});

		const move = result.plans[0].moves[0];
		expect(move.kind).toBe('venta');
		expect(move.taxFree).toBe(false);
		// Se venden 10 títulos (1.000 €) con coste 500: ganancia de 500.
		expect(move.sharesToSell).toBeCloseTo(10, 6);
		expect(move.realizedGain).toBe(500);
		expect(move.estimatedTax).toBe(95); // 500 × 19%
	});

	it('un fondo que financia un ETF es reembolso, no traspaso: tributa', () => {
		// El error fácil sería mirar solo el origen y darlo por exento.
		const positions = makePositions([
			{ ticker: 'FUND', type: 'fund', value: 7000, target: 0.6, unitPrice: 100 },
			{ ticker: 'ETF', type: 'etf', value: 3000, target: 0.4 }
		]);
		const transactions = [tx({ ticker: 'FUND', shares: 70, price: 50 })];

		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], transactions, {
			now: NOW
		});

		const move = result.plans[0].moves[0];
		expect(move.kind).toBe('reembolso');
		expect(move.taxFree).toBe(false);
		expect(move.realizedGain).toBe(500);
	});

	it('mover efectivo no genera ganancia patrimonial', () => {
		const positions = makePositions([
			{ ticker: 'CASH-EUR', type: 'cash', value: 7000, target: 0.6 },
			{ ticker: 'FUND', type: 'fund', value: 3000, target: 0.4 }
		]);
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], { now: NOW });

		expect(result.plans[0].moves[0].kind).toBe('efectivo');
		expect(result.totalEstimatedTax).toBe(0);
	});

	it('aplica la escala progresiva sobre el conjunto, no movimiento a movimiento', () => {
		// Dos ventas de 4.000 € de ganancia cada una: si cada una tributase por
		// separado saldrían 760 + 760 = 1.520. La escala real da 1.140 + 420.
		const positions = makePositions([
			{ ticker: 'ETF1', type: 'etf', value: 5000, target: 0.1, unitPrice: 100 },
			{ ticker: 'ETF2', type: 'etf', value: 5000, target: 0.1, unitPrice: 100 },
			{ ticker: 'FUND', type: 'fund', value: 0, target: 0.8 }
		]);
		const transactions = [
			tx({ ticker: 'ETF1', shares: 50, price: 20 }),
			tx({ ticker: 'ETF2', shares: 50, price: 20 })
		];

		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], transactions, {
			now: NOW
		});

		const totalGain = result.netRealizedGain;
		expect(totalGain).toBeGreaterThan(6000);
		// El impuesto total tiene que ser el de la suma, no la suma de impuestos.
		const perMoveSum = result.plans[0].moves.reduce((s, m) => s + m.estimatedTax, 0);
		expect(result.totalEstimatedTax).toBeCloseTo(perMoveSum, 2);
		// Y el primer tramo se agota una sola vez.
		expect(result.totalEstimatedTax).toBeLessThan(totalGain * 0.21);
	});

	it('coloca la ganancia en su tramo si ya había plusvalías ese año', () => {
		const positions = makePositions([
			{ ticker: 'ETF', type: 'etf', value: 7000, target: 0.6, unitPrice: 100 },
			{ ticker: 'FUND', type: 'fund', value: 3000, target: 0.4 }
		]);
		const transactions = [tx({ ticker: 'ETF', shares: 70, price: 50 })];

		const virgin = calculateTaxAwareRebalance([{ category: 'core', positions }], transactions, {
			now: NOW
		});
		const loaded = calculateTaxAwareRebalance([{ category: 'core', positions }], transactions, {
			now: NOW,
			otherGainsThisYear: 6000
		});

		expect(virgin.totalEstimatedTax).toBe(95); // 500 al 19%
		expect(loaded.totalEstimatedTax).toBe(105); // 500 al 21%
	});
});

describe('calculateTaxAwareRebalance: regla antiaplicación', () => {
	const positions = makePositions([
		{ ticker: 'ETF', type: 'etf', value: 7000, target: 0.6, unitPrice: 100 },
		{ ticker: 'FUND', type: 'fund', value: 3000, target: 0.4 }
	]);

	it('avisa cuando la pérdida no sería deducible y no la compensa', () => {
		// Comprado caro y con una recompra reciente dentro de la ventana.
		const transactions = [
			tx({ ticker: 'ETF', shares: 70, price: 200, date: NOW - 300 * DAY }),
			tx({ ticker: 'ETF', shares: 1, price: 100, date: NOW - 10 * DAY })
		];

		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], transactions, {
			now: NOW
		});

		const move = result.plans[0].moves[0];
		expect(move.realizedGain).toBeLessThan(0);
		expect(move.lossBlocked).not.toBeNull();
		expect(move.lossBlocked?.windowMonths).toBe(2);
		expect(move.lossBlocked?.daysUntilSafeRepurchase).toBeGreaterThan(0);
		// Bloqueada = no entra en la base y no reduce el impuesto.
		expect(result.netRealizedGain).toBe(0);
		expect(result.blockedLosses).toBeGreaterThan(0);
	});

	it('sin recompras en ventana la pérdida sí compensa', () => {
		const transactions = [tx({ ticker: 'ETF', shares: 70, price: 200, date: NOW - 300 * DAY })];

		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], transactions, {
			now: NOW
		});

		expect(result.plans[0].moves[0].lossBlocked).toBeNull();
		expect(result.netRealizedGain).toBeLessThan(0);
		expect(result.blockedLosses).toBe(0);
	});
});

describe('calculateTaxAwareRebalance: prudencia', () => {
	it('no toca los activos cuyo trato fiscal no conoce', () => {
		const positions = makePositions([
			{ ticker: 'BTC-EUR', type: 'other', value: 7000, target: 0.6 },
			{ ticker: 'FUND', type: 'fund', value: 3000, target: 0.4 }
		]);
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], { now: NOW });

		expect(result.plans[0].moves).toHaveLength(0);
		expect(result.plans[0].excludedTickers).toEqual(['BTC-EUR']);
		expect(result.hasAnythingToDo).toBe(false);
	});

	it('marca la plusvalía como parcial si el ledger no tiene lotes', () => {
		const positions = makePositions([
			{ ticker: 'ETF', type: 'etf', value: 7000, target: 0.6, unitPrice: 100 },
			{ ticker: 'FUND', type: 'fund', value: 3000, target: 0.4 }
		]);
		// Sin transacciones: no se puede saber el valor de adquisición.
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], { now: NOW });

		expect(result.plans[0].moves[0].gainIsPartial).toBe(true);
	});

	it('no propone nada si la cartera ya está en objetivo', () => {
		const positions = makePositions([
			{ ticker: 'A', type: 'fund', value: 6000, target: 0.6 },
			{ ticker: 'B', type: 'fund', value: 4000, target: 0.4 }
		]);
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], { now: NOW });
		expect(result.hasAnythingToDo).toBe(false);
	});

	it('ignora movimientos por debajo del mínimo, para no proponer calderilla', () => {
		const positions = makePositions([
			{ ticker: 'A', type: 'fund', value: 6002, target: 0.6 },
			{ ticker: 'B', type: 'fund', value: 3998, target: 0.4 }
		]);
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], { now: NOW });
		expect(result.hasAnythingToDo).toBe(false);
	});

	it('rebalancea cada categoría por separado, sin mezclar estrategias', () => {
		const core = makePositions([
			{ ticker: 'C1', type: 'fund', value: 7000, target: 0.6 },
			{ ticker: 'C2', type: 'fund', value: 3000, target: 0.4 }
		]);
		const stocks = makePositions([
			{ ticker: 'S1', type: 'equity', value: 500, target: 0.5, unitPrice: 100 },
			{ ticker: 'S2', type: 'equity', value: 500, target: 0.5, unitPrice: 100 }
		]);

		const result = calculateTaxAwareRebalance(
			[
				{ category: 'core', positions: core },
				{ category: 'stocks', positions: stocks }
			],
			[],
			{ now: NOW }
		);

		expect(result.plans).toHaveLength(2);
		// Nada cruza de una categoría a otra: los tickers de core empiezan por C
		// y los de acciones por S, así que un movimiento mixto se vería aquí.
		for (const plan of result.plans) {
			for (const move of plan.moves) {
				expect(move.from.ticker[0]).toBe(move.to.ticker[0]);
			}
		}
		// Y las acciones, que ya están en objetivo, no generan ningún movimiento.
		expect(result.plans.find((p) => p.category === 'stocks')?.moves).toHaveLength(0);
	});
});

describe('maximizar el importe exento', () => {
	it('empareja fondo con fondo antes de recurrir a una venta', () => {
		// Excedente en un fondo y en un ETF; déficit en un fondo y en un ETF.
		// Lo barato es fondo→fondo y ETF→ETF, no cruzado.
		const positions = makePositions([
			{ ticker: 'FUND_OVER', type: 'fund', value: 3000, target: 0.2, unitPrice: 100 },
			{ ticker: 'ETF_OVER', type: 'etf', value: 3000, target: 0.2, unitPrice: 100 },
			{ ticker: 'FUND_UNDER', type: 'fund', value: 2000, target: 0.3, unitPrice: 100 },
			{ ticker: 'ETF_UNDER', type: 'etf', value: 2000, target: 0.3, unitPrice: 100 }
		]);

		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], { now: NOW });
		const plan = result.plans[0];

		// El primer movimiento tiene que ser el exento.
		expect(plan.moves[0].taxFree).toBe(true);
		expect(plan.moves[0].from.ticker).toBe('FUND_OVER');
		expect(plan.moves[0].to.ticker).toBe('FUND_UNDER');
		// Y del total movido, la parte exenta es al menos la mitad.
		expect(plan.taxFreeAmount).toBeGreaterThanOrEqual(plan.taxableAmount);
	});
});

describe('comparación con la vía de solo aportar', () => {
	const positions = makePositions([
		{ ticker: 'A', type: 'fund', value: 7000, target: 0.6 },
		{ ticker: 'B', type: 'fund', value: 3000, target: 0.4 }
	]);

	it('dice cuántos meses tardaría la aportación en cerrar la brecha', () => {
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
			now: NOW,
			contribution: 200
		});
		expect(result.monthsToConvergeByContribution).not.toBeNull();
		expect(result.monthsToConvergeByContribution!).toBeGreaterThan(0);
		expect(result.monthsToConvergeByContribution!).toBeLessThanOrEqual(240);
	});

	it('una aportación mayor converge antes', () => {
		const slow = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
			now: NOW,
			contribution: 100
		}).monthsToConvergeByContribution;
		const fast = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
			now: NOW,
			contribution: 1000
		}).monthsToConvergeByContribution;

		expect(slow).not.toBeNull();
		expect(fast).not.toBeNull();
		expect(fast!).toBeLessThan(slow!);
	});

	it('sin aportación configurada no hay comparación que hacer', () => {
		const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], { now: NOW });
		expect(result.monthsToConvergeByContribution).toBeNull();
	});

	it('devuelve 0 meses si ya está dentro de la banda', () => {
		const balanced = makePositions([
			{ ticker: 'A', type: 'fund', value: 6000, target: 0.6 },
			{ ticker: 'B', type: 'fund', value: 4000, target: 0.4 }
		]);
		const result = calculateTaxAwareRebalance([{ category: 'core', positions: balanced }], [], {
			now: NOW,
			contribution: 200
		});
		expect(result.monthsToConvergeByContribution).toBe(0);
	});

	it('la banda de tolerancia es la declarada', () => {
		expect(DEVIATION_BAND).toBe(0.01);
	});
});

/**
 * Casos que salen del **mutation testing**, no de leer el código.
 *
 * ⚠️ Este módulo tenía 96,4 % de cobertura de sentencias y un mutation score de
 * **66,14 %**: 107 mutantes sobrevivían. Es el motor fiscal, así que un cambio de
 * comportamiento que ningún test note acaba en un número que el usuario declara a
 * Hacienda. Cada bloque de aquí mata un grupo concreto y dice cuál.
 */
describe('traspaso.ts · casos que el mutation testing dejó al descubierto', () => {
	/**
	 * `unitPriceBaseOf()`: de qué precio salen las participaciones que se venden.
	 *
	 * Diez mutantes vivos en una sola línea —la guarda `holdings > 0 && totalValue > 0` y
	 * su respaldo—, y es la función que decide **cuántas participaciones vender**. Todos los
	 * fixtures existentes construyen posiciones donde `totalValue / holdings` coincide
	 * exactamente con `unitPrice`, que es justo el caso en el que da igual cuál de los dos
	 * uses.
	 */
	describe('precio unitario en divisa base', () => {
		it('las participaciones a vender salen del precio en divisa base, no del precio del activo', () => {
			// Posición en dólares construida a mano: 100 títulos a 50 $ que valen 4.630 €, o
			// sea 46,30 € por título. Vender 1.000 € son 21,5983 títulos, no 20.
			const usd: PortfolioPosition = {
				asset: makeAsset('ETF-USD', 'etf', 0.5),
				holdings: 100,
				avgCost: 40,
				totalCost: 4000,
				unitPrice: 50,
				totalValue: 4630,
				currentWeight: 0.4630,
				deviation: 0,
				targetValue: 3630,
				targetHoldings: 0,
				profit: 0,
				profitPercent: 0,
				dailyChangeValue: 0,
				dailyChangePercent: 0
			};
			const destino: PortfolioPosition = {
				...usd,
				asset: makeAsset('ETF-EUR', 'etf', 0.5),
				holdings: 100,
				unitPrice: 20,
				totalValue: 2000,
				totalCost: 2000,
				targetValue: 3000
			};

			const result = calculateTaxAwareRebalance(
				[{ category: 'core', positions: [usd, destino] }],
				[],
				{ now: NOW }
			);

			const move = result.plans[0].moves[0];
			expect(move.amount).toBeCloseTo(1000, 2);
			// 1000 / 46,30 = 21,5983 títulos. Con el precio en dólares saldrían 20.
			expect(move.sharesToSell).toBeCloseTo(1000 / 46.3, 3);
			expect(move.sharesToSell).not.toBeCloseTo(1000 / 50, 2);
		});

		it('un activo que aún no se posee usa su precio de cotización para las participaciones a comprar', () => {
			// Caso real y cotidiano: entrar en un fondo nuevo. Con `totalValue` y `holdings` a
			// cero, `totalValue / holdings` es NaN, y por eso existe el respaldo a `unitPrice`.
			const positions = makePositions([
				{ ticker: 'VIEJO', type: 'fund', value: 10000, target: 0.5, unitPrice: 100 },
				{ ticker: 'NUEVO', type: 'fund', value: 0, target: 0.5, unitPrice: 25 }
			]);
			const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
				now: NOW
			});

			const move = result.plans[0].moves[0];
			expect(move.to.ticker).toBe('NUEVO');
			expect(move.amount).toBeCloseTo(5000, 2);
			// 5.000 € a 25 € el título son 200 participaciones, y no NaN ni 0.
			expect(move.sharesToBuy).toBeCloseTo(200, 4);
			expect(Number.isFinite(move.sharesToBuy)).toBe(true);
		});

		it('con participaciones pero sin valor, el respaldo sigue dando títulos comprables', () => {
			// Las dos mitades de la guarda hacen falta por separado, y esta es la que solo se
			// ve con `holdings > 0` y `totalValue === 0`: un activo cuyo precio no ha llegado
			// todavía. Con un `||` en vez del `&&`, el precio saldría `0 / 5 = 0` y no se
			// compraría ni un título.
			const sinValor: PortfolioPosition = {
				asset: makeAsset('SIN-VALOR', 'fund', 0.5),
				holdings: 5,
				avgCost: 20,
				totalCost: 100,
				unitPrice: 20,
				totalValue: 0,
				currentWeight: 0,
				deviation: -0.5,
				targetValue: 5000,
				targetHoldings: 250,
				profit: 0,
				profitPercent: 0,
				dailyChangeValue: 0,
				dailyChangePercent: 0
			};
			const conValor: PortfolioPosition = {
				...sinValor,
				asset: makeAsset('CON-VALOR', 'fund', 0.5),
				holdings: 100,
				unitPrice: 100,
				totalValue: 10000,
				totalCost: 10000,
				targetValue: 5000,
				deviation: 0.5
			};

			const result = calculateTaxAwareRebalance(
				[{ category: 'core', positions: [conValor, sinValor] }],
				[],
				{ now: NOW }
			);

			const move = result.plans[0].moves[0];
			expect(move.to.ticker).toBe('SIN-VALOR');
			expect(move.sharesToBuy).toBeCloseTo(5000 / 20, 4);
			expect(move.sharesToBuy).toBeGreaterThan(0);
		});

		it('con valor pero sin participaciones registradas, tampoco divide por cero', () => {
			// La otra mitad: `holdings === 0` con `totalValue > 0` es un dato incoherente que
			// llega de una importación a medias. Con un `||`, `totalValue / 0` es Infinity y
			// las participaciones a vender saldrían 0, o sea una orden vacía.
			const incoherente: PortfolioPosition = {
				asset: makeAsset('RARO', 'etf', 0.2),
				holdings: 0,
				avgCost: 0,
				totalCost: 5000,
				unitPrice: 50,
				totalValue: 8000,
				currentWeight: 0.8,
				deviation: 0.6,
				targetValue: 2000,
				targetHoldings: 40,
				profit: 0,
				profitPercent: 0,
				dailyChangeValue: 0,
				dailyChangePercent: 0
			};
			const destino: PortfolioPosition = {
				...incoherente,
				asset: makeAsset('NORMAL', 'etf', 0.8),
				holdings: 40,
				totalValue: 2000,
				totalCost: 2000,
				unitPrice: 50,
				currentWeight: 0.2,
				deviation: -0.6,
				targetValue: 8000
			};

			const result = calculateTaxAwareRebalance(
				[{ category: 'core', positions: [incoherente, destino] }],
				[],
				{ now: NOW }
			);

			const move = result.plans[0].moves[0];
			expect(move.from.ticker).toBe('RARO');
			// Cae al precio de cotización: 6.000 € a 50 € son 120 títulos.
			expect(move.sharesToSell).toBeCloseTo(6000 / 50, 4);
			expect(Number.isFinite(move.sharesToSell)).toBe(true);
		});

		it('redondea las participaciones a cuatro decimales', () => {
			// Cuatro, no tres: en un traspaso de fondos el importe manda y las
			// participaciones salen con más precisión que en una orden de bolsa.
			const positions = makePositions([
				{ ticker: 'A', type: 'fund', value: 7000, target: 0.5, unitPrice: 137.77 },
				{ ticker: 'B', type: 'fund', value: 3000, target: 0.5, unitPrice: 41.13 }
			]);
			const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
				now: NOW
			});

			const move = result.plans[0].moves[0];
			for (const titulos of [move.sharesToSell, move.sharesToBuy]) {
				expect(titulos).toBe(Math.round(titulos * 10000) / 10000);
				expect(String(titulos).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(4);
			}
		});
	});

	/**
	 * Qué entra en la base del ahorro: `realizedGain > 0 || lossBlocked === null`.
	 *
	 * Siete mutantes vivos, incluido el que cambia el `||` por un `&&`. Y el test de la
	 * regla antiaplicación que ya existía **no podía cazarlo**: comprueba
	 * `netRealizedGain`, que se calcula fuera de esa condición. Lo que la condición decide
	 * es si la pérdida entra en la escala progresiva, y eso solo se ve cuando hay una
	 * ganancia contra la que compensar.
	 */
	describe('base imponible del ahorro', () => {
		/** Excedente con ganancia, excedente con pérdida, y un destino que los recibe. */
		const positions = makePositions([
			{ ticker: 'GANA', type: 'etf', value: 5000, target: 0.2, unitPrice: 100 },
			{ ticker: 'PIERDE', type: 'etf', value: 5000, target: 0.2, unitPrice: 100 },
			{ ticker: 'DESTINO', type: 'etf', value: 0, target: 0.6, unitPrice: 50 }
		]);
		// GANA: 50 títulos comprados a 20 → vender 30 deja 2.400 € de plusvalía.
		// PIERDE: 50 títulos comprados a 120 → vender 30 deja 600 € de pérdida.
		const compras = [
			tx({ ticker: 'GANA', shares: 50, price: 20, date: NOW - 700 * DAY }),
			tx({ ticker: 'PIERDE', shares: 50, price: 120, date: NOW - 700 * DAY })
		];

		it('una pérdida deducible reduce el impuesto de la ganancia del mismo plan', () => {
			const conPerdida = calculateTaxAwareRebalance(
				[{ category: 'core', positions }],
				compras,
				{ now: NOW }
			);

			expect(conPerdida.netRealizedGain).toBeCloseTo(1800, 2); // 2.400 − 600
			expect(conPerdida.blockedLosses).toBe(0);
			// 19 % del primer tramo sobre 1.800 €.
			expect(conPerdida.totalEstimatedTax).toBeCloseTo(1800 * 0.19, 1);

			// Y el impuesto es **menor** que si la pérdida no compensara: es la diferencia
			// que el mutante del `&&` borraba sin que nadie se enterara.
			const soloGanancia = calculateTaxAwareRebalance(
				[
					{
						category: 'core',
						positions: makePositions([
							{ ticker: 'GANA', type: 'etf', value: 5000, target: 0.2, unitPrice: 100 },
							{ ticker: 'DESTINO', type: 'etf', value: 0, target: 0.8, unitPrice: 50 }
						])
					}
				],
				compras,
				{ now: NOW }
			);
			expect(conPerdida.totalEstimatedTax).toBeLessThan(soloGanancia.totalEstimatedTax);
		});

		it('una pérdida bloqueada NO reduce el impuesto de la ganancia', () => {
			// La misma cartera, pero con una recompra reciente de PIERDE: la pérdida se
			// declara igual, pero no compensa este año, así que la ganancia paga entera.
			const conRecompra = [
				...compras,
				tx({ ticker: 'PIERDE', shares: 1, price: 100, date: NOW - 5 * DAY })
			];
			const result = calculateTaxAwareRebalance(
				[{ category: 'core', positions }],
				conRecompra,
				{ now: NOW }
			);

			const bloqueado = result.plans[0].moves.find((m) => m.from.ticker === 'PIERDE');
			expect(bloqueado?.lossBlocked).not.toBeNull();
			expect(result.netRealizedGain).toBeCloseTo(2400, 2);
			expect(result.blockedLosses).toBeCloseTo(600, 2);
			expect(result.totalEstimatedTax).toBeCloseTo(2400 * 0.19, 1);
		});

		it('una ganancia paga aunque el mismo activo tenga recompras recientes', () => {
			// La regla antiaplicación es solo para pérdidas. Comprobarlo importa porque el
			// mutante que quita la condición `realizedGain > 0` dejaría de cobrar ganancias
			// en cuanto hubiera una recompra en ventana.
			const conRecompra = [
				tx({ ticker: 'GANA', shares: 50, price: 20, date: NOW - 700 * DAY }),
				tx({ ticker: 'GANA', shares: 1, price: 100, date: NOW - 5 * DAY })
			];
			const soloGana = makePositions([
				{ ticker: 'GANA', type: 'etf', value: 5000, target: 0.2, unitPrice: 100 },
				{ ticker: 'DESTINO', type: 'etf', value: 0, target: 0.8, unitPrice: 50 }
			]);
			const result = calculateTaxAwareRebalance([{ category: 'core', positions: soloGana }], conRecompra, {
				now: NOW
			});

			expect(result.plans[0].moves[0].lossBlocked).toBeNull();
			expect(result.totalEstimatedTax).toBeGreaterThan(0);
		});
	});

	/**
	 * Los umbrales del emparejamiento: `MIN_MOVE_AMOUNT` y el precio del destino.
	 *
	 * Diez mutantes vivos entre los dos filtros de origen y destino. Los fixtures que
	 * había usan desviaciones de miles de euros, así que ninguno pasaba cerca del mínimo
	 * de 10 €, que es donde la comparación `>` frente a `>=` se nota.
	 */
	describe('umbrales del emparejamiento', () => {
		it('una desviación de exactamente el mínimo no mueve nada', () => {
			// 510/490 sobre 1.000: excedente y déficit de 10 € justos. El mínimo es
			// **estrictamente mayor que 10**, así que aquí no hay nada que proponer.
			const positions = makePositions([
				{ ticker: 'A', type: 'fund', value: 510, target: 0.5 },
				{ ticker: 'B', type: 'fund', value: 490, target: 0.5 }
			]);
			const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
				now: NOW
			});
			expect(result.plans[0].moves).toHaveLength(0);
			expect(result.hasAnythingToDo).toBe(false);
		});

		it('un euro más y sí lo mueve', () => {
			const positions = makePositions([
				{ ticker: 'A', type: 'fund', value: 511, target: 0.5 },
				{ ticker: 'B', type: 'fund', value: 489, target: 0.5 }
			]);
			const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
				now: NOW
			});
			expect(result.plans[0].moves).toHaveLength(1);
			expect(result.plans[0].moves[0].amount).toBeCloseTo(11, 2);
		});

		it('un destino sin precio no recibe nada: no se puede comprar a ciegas', () => {
			// Un fondo cuyo precio no ha llegado del backend. El excedente se queda donde
			// está en vez de proponer una compra con un precio que no se conoce.
			const positions = makePositions([
				{ ticker: 'CARO', type: 'fund', value: 8000, target: 0.5, unitPrice: 100 },
				{ ticker: 'SIN-PRECIO', type: 'fund', value: 2000, target: 0.5, unitPrice: 0 }
			]);
			const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
				now: NOW
			});

			expect(result.plans[0].moves).toHaveLength(0);
			// Y la desviación posterior es la de antes: no se ha maquillado el resultado.
			expect(result.plans[0].maxDeviationAfter).toBeCloseTo(
				result.plans[0].maxDeviationBefore,
				6
			);
		});

		it('un excedente que no llega para dos déficits se agota en el primero', () => {
			// El emparejamiento ordena por tamaño y va agotando: el excedente de 3.000 € se
			// va entero al déficit mayor, y el segundo se queda esperando.
			const positions = makePositions([
				{ ticker: 'GORDO', type: 'fund', value: 8000, target: 0.5, unitPrice: 100 },
				{ ticker: 'MEDIANO', type: 'fund', value: 1000, target: 0.3, unitPrice: 100 },
				{ ticker: 'PEQUE', type: 'fund', value: 1000, target: 0.2, unitPrice: 100 }
			]);
			const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
				now: NOW
			});

			const moves = result.plans[0].moves;
			// Excedente de GORDO: 8.000 − 5.000 = 3.000. Déficits: MEDIANO 2.000, PEQUE 1.000.
			expect(moves).toHaveLength(2);
			expect(moves[0].from.ticker).toBe('GORDO');
			expect(moves[0].to.ticker).toBe('MEDIANO');
			expect(moves[0].amount).toBeCloseTo(2000, 2);
			expect(moves[1].to.ticker).toBe('PEQUE');
			expect(moves[1].amount).toBeCloseTo(1000, 2);
			// Y con eso la cartera queda en objetivo exacto.
			expect(result.plans[0].maxDeviationAfter).toBeCloseTo(0, 6);
		});
	});

	/**
	 * La simulación de «cuántos meses tardaría solo aportando».
	 *
	 * Dieciocho mutantes vivos repartidos por sus guardas. Los tests que había comprueban
	 * que converge, que converge antes con más dinero y que sin aportación no hay cifra;
	 * ninguno pasa por los casos en los que **no puede** converger, que son los que hacen
	 * que la comparación sea honesta.
	 */
	describe('convergencia por aportaciones', () => {
		it('sin capital no hay reparto que simular', () => {
			const vacia = makePositions([
				{ ticker: 'A', type: 'fund', value: 0, target: 0.6 },
				{ ticker: 'B', type: 'fund', value: 0, target: 0.4 }
			]);
			const result = calculateTaxAwareRebalance([{ category: 'core', positions: vacia }], [], {
				now: NOW,
				contribution: 500
			});
			expect(result.monthsToConvergeByContribution).toBeNull();
		});

		it('si el activo en déficit no se puede comprar, no converge nunca', () => {
			// Sin precio no se puede aportar a ese activo, así que la desviación no se cierra
			// ni en veinte años. Devolver un número aquí sería mentir sobre la espera.
			const positions = makePositions([
				{ ticker: 'CON-PRECIO', type: 'fund', value: 9000, target: 0.5, unitPrice: 100 },
				{ ticker: 'SIN-PRECIO', type: 'fund', value: 1000, target: 0.5, unitPrice: 0 }
			]);
			const result = calculateTaxAwareRebalance([{ category: 'core', positions }], [], {
				now: NOW,
				contribution: 500
			});
			expect(result.monthsToConvergeByContribution).toBeNull();
		});

		it('reparte la aportación entre categorías en proporción a su capital', () => {
			// La misma desviación relativa en dos categorías de tamaño muy distinto: la
			// grande recibe más dinero, así que las dos tardan lo mismo en cerrarla. Si el
			// reparto fuera a partes iguales, la grande tardaría mucho más.
			const desviada = (escala: number) =>
				makePositions([
					{ ticker: `A${escala}`, type: 'fund', value: 700 * escala, target: 0.6 },
					{ ticker: `B${escala}`, type: 'fund', value: 300 * escala, target: 0.4 }
				]);

			const juntas = calculateTaxAwareRebalance(
				[
					{ category: 'core', positions: desviada(10) },
					{ category: 'satellite', positions: desviada(1) }
				],
				[],
				{ now: NOW, contribution: 1100 }
			);
			const soloGrande = calculateTaxAwareRebalance(
				[{ category: 'core', positions: desviada(10) }],
				[],
				{ now: NOW, contribution: 1000 }
			);

			// A la categoría grande le toca 1.000 de los 1.100 en el primer caso y 1.000 de
			// 1.000 en el segundo: los meses tienen que coincidir.
			expect(juntas.monthsToConvergeByContribution).toBe(
				soloGrande.monthsToConvergeByContribution
			);
		});
	});
});
