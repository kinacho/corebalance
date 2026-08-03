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
