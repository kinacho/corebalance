import { describe, it, expect } from 'vitest';
import {
	calculateSavingsTax,
	marginalSavingsRate,
	buildFifoLots,
	simulateSale,
	checkAntiApplicationRule,
	antiApplicationWindowMonths,
	SAVINGS_TAX_BRACKETS
} from './fiscal';
import type { Transaction } from './types';

const DAY = 24 * 60 * 60 * 1000;
/** Fecha fija: los tests no pueden depender de cuándo se ejecutan. */
const T0 = Date.UTC(2024, 0, 15);

function tx(partial: Partial<Transaction>): Transaction {
	return {
		id: Math.random().toString(36),
		ticker: 'FUND',
		type: 'buy',
		date: T0,
		shares: 0,
		price: 0,
		currency: 'EUR',
		fees: 0,
		fxRate: 1,
		...partial
	};
}

describe('calculateSavingsTax', () => {
	it('no cobra nada por una pérdida ni por cero', () => {
		expect(calculateSavingsTax(-1000)).toBe(0);
		expect(calculateSavingsTax(0)).toBe(0);
	});

	it('aplica el primer tramo al 19%', () => {
		expect(calculateSavingsTax(1000)).toBe(190);
		expect(calculateSavingsTax(6000)).toBe(1140);
	});

	it('es progresivo, no un tipo único', () => {
		// 6.000 al 19% = 1.140, y los 4.000 siguientes al 21% = 840.
		expect(calculateSavingsTax(10000)).toBe(1980);
	});

	it('cruza todos los tramos correctamente', () => {
		// 6.000×19% + 44.000×21% + 150.000×23% + 100.000×27% + 50.000×30%
		const expected = 1140 + 9240 + 34500 + 27000 + 15000;
		expect(calculateSavingsTax(350000)).toBe(expected);
	});

	it('mete la ganancia en su sitio de la escala si ya había otras este año', () => {
		// Con 6.000 ya realizados, los siguientes 1.000 van al 21%, no al 19%.
		expect(calculateSavingsTax(1000, 6000)).toBe(210);
		// Y una ganancia que empieza a mitad del primer tramo se parte en dos.
		// 1.000 hasta agotar los 6.000 al 19% + 1.000 al 21%.
		expect(calculateSavingsTax(2000, 5000)).toBe(190 + 210);
	});

	it('el tipo marginal coincide con los tramos declarados', () => {
		expect(marginalSavingsRate(0)).toBe(0.19);
		expect(marginalSavingsRate(6000)).toBe(0.21);
		expect(marginalSavingsRate(50000)).toBe(0.23);
		expect(marginalSavingsRate(200000)).toBe(0.27);
		expect(marginalSavingsRate(500000)).toBe(0.3);
	});

	it('los tramos declarados están ordenados y acaban en infinito', () => {
		// Un tramo desordenado rompería el cálculo en silencio.
		for (let i = 1; i < SAVINGS_TAX_BRACKETS.length; i++) {
			expect(SAVINGS_TAX_BRACKETS[i].upTo).toBeGreaterThan(SAVINGS_TAX_BRACKETS[i - 1].upTo);
		}
		expect(SAVINGS_TAX_BRACKETS[SAVINGS_TAX_BRACKETS.length - 1].upTo).toBe(Infinity);
	});
});

describe('buildFifoLots', () => {
	it('crea un lote por compra con las comisiones dentro del coste', () => {
		const lots = buildFifoLots([tx({ shares: 10, price: 100, fees: 20 })], 'FUND');
		expect(lots).toHaveLength(1);
		// (10×100 + 20) / 10 = 102
		expect(lots[0].unitCostBase).toBe(102);
	});

	it('consume los lotes más antiguos primero', () => {
		const lots = buildFifoLots(
			[
				tx({ shares: 10, price: 100, date: T0 }),
				tx({ shares: 10, price: 200, date: T0 + 30 * DAY }),
				tx({ type: 'sell', shares: 10, price: 250, date: T0 + 60 * DAY })
			],
			'FUND'
		);
		// Se va el lote de 100, queda el de 200.
		expect(lots).toHaveLength(1);
		expect(lots[0].unitCostBase).toBe(200);
	});

	it('parte un lote cuando la venta es parcial', () => {
		const lots = buildFifoLots(
			[
				tx({ shares: 10, price: 100 }),
				tx({ type: 'sell', shares: 4, price: 150, date: T0 + DAY })
			],
			'FUND'
		);
		expect(lots).toHaveLength(1);
		expect(lots[0].shares).toBe(6);
		expect(lots[0].unitCostBase).toBe(100);
	});

	it('convierte a divisa base con el cambio del día de la compra', () => {
		// 10 títulos a 100 USD con fxRate 0,9 = 900 € de coste.
		const lots = buildFifoLots([tx({ shares: 10, price: 100, currency: 'USD', fxRate: 0.9 })], 'FUND');
		expect(lots[0].unitCostBase).toBeCloseTo(90, 6);
	});

	it('ignora los dividendos, que fiscalmente no tocan el valor de adquisición', () => {
		// El ledger de la app sí baja el coste con los dividendos; aquí no debe.
		const lots = buildFifoLots(
			[
				tx({ shares: 10, price: 100 }),
				tx({ type: 'dividend', shares: 10, price: 5, date: T0 + 10 * DAY })
			],
			'FUND'
		);
		expect(lots[0].unitCostBase).toBe(100);
	});

	it('no mezcla activos distintos', () => {
		const lots = buildFifoLots(
			[tx({ ticker: 'A', shares: 10, price: 100 }), tx({ ticker: 'B', shares: 10, price: 500 })],
			'A'
		);
		expect(lots).toHaveLength(1);
		expect(lots[0].unitCostBase).toBe(100);
	});
});

describe('simulateSale', () => {
	const lots = buildFifoLots(
		[
			tx({ shares: 10, price: 100, date: T0 }),
			tx({ shares: 10, price: 200, date: T0 + 30 * DAY })
		],
		'FUND'
	);

	it('calcula la plusvalía consumiendo el lote antiguo', () => {
		const sale = simulateSale(lots, 10, 250);
		expect(sale.proceeds).toBe(2500);
		expect(sale.acquisitionCost).toBe(1000);
		expect(sale.gain).toBe(1500);
		expect(sale.oldestLotDate).toBe(T0);
	});

	it('cruza dos lotes cuando la venta es mayor que el primero', () => {
		const sale = simulateSale(lots, 15, 250);
		// 10 a coste 100 + 5 a coste 200 = 2.000 de coste, 3.750 de ingreso.
		expect(sale.acquisitionCost).toBe(2000);
		expect(sale.gain).toBe(1750);
	});

	it('devuelve pérdida con signo negativo', () => {
		const sale = simulateSale(lots, 10, 60);
		expect(sale.gain).toBe(-400);
	});

	it('marca el resultado como incompleto si no hay participaciones suficientes', () => {
		const sale = simulateSale(lots, 100, 250);
		expect(sale.incomplete).toBe(true);
		expect(sale.sharesSold).toBe(20);
	});

	it('no revienta con la cartera vacía', () => {
		const sale = simulateSale([], 10, 250);
		expect(sale.gain).toBe(0);
		expect(sale.sharesSold).toBe(0);
		expect(sale.oldestLotDate).toBeNull();
	});
});

describe('checkAntiApplicationRule', () => {
	it('la ventana es de dos meses para cotizados y de un año para fondos', () => {
		expect(antiApplicationWindowMonths('etf')).toBe(2);
		expect(antiApplicationWindowMonths('equity')).toBe(2);
		// La que suele sorprender: con fondos hay que esperar un año.
		expect(antiApplicationWindowMonths('fund')).toBe(12);
	});

	it('detecta una recompra posterior dentro de la ventana', () => {
		const sale = T0;
		const check = checkAntiApplicationRule(
			[tx({ shares: 5, price: 100, date: sale + 20 * DAY })],
			'FUND',
			'etf',
			sale
		);
		expect(check.blocked).toBe(true);
		expect(check.blockingPurchases).toHaveLength(1);
	});

	it('detecta también una compra ANTERIOR a la venta', () => {
		// La ventana mira a los dos lados: comprar antes bloquea igual.
		const sale = T0;
		const check = checkAntiApplicationRule(
			[tx({ shares: 5, price: 100, date: sale - 20 * DAY })],
			'FUND',
			'etf',
			sale
		);
		expect(check.blocked).toBe(true);
	});

	it('no bloquea si la compra queda fuera de la ventana', () => {
		const sale = T0;
		const check = checkAntiApplicationRule(
			[tx({ shares: 5, price: 100, date: sale - 200 * DAY })],
			'FUND',
			'etf',
			sale
		);
		expect(check.blocked).toBe(false);
		expect(check.daysUntilSafeRepurchase).toBeNull();
	});

	it('una compra a 200 días sí bloquea un fondo, porque su ventana es de un año', () => {
		const sale = T0;
		const check = checkAntiApplicationRule(
			[tx({ shares: 5, price: 100, date: sale - 200 * DAY })],
			'FUND',
			'fund',
			sale
		);
		expect(check.blocked).toBe(true);
		expect(check.windowMonths).toBe(12);
	});

	it('dice cuántos días hay que esperar, contando desde la última compra', () => {
		const sale = T0;
		const check = checkAntiApplicationRule(
			[tx({ shares: 5, price: 100, date: sale - 30 * DAY })],
			'FUND',
			'etf',
			sale
		);
		// Ventana de ~61 días desde la compra, de los que ya han pasado 30.
		expect(check.daysUntilSafeRepurchase).toBeGreaterThan(25);
		expect(check.daysUntilSafeRepurchase).toBeLessThan(35);
	});

	it('ignora ventas y dividendos: solo bloquean las adquisiciones', () => {
		const sale = T0;
		const check = checkAntiApplicationRule(
			[
				tx({ type: 'sell', shares: 5, price: 100, date: sale + 10 * DAY }),
				tx({ type: 'dividend', shares: 5, price: 1, date: sale + 10 * DAY })
			],
			'FUND',
			'etf',
			sale
		);
		expect(check.blocked).toBe(false);
	});
});

/**
 * Casos que salen del **mutation testing**, no de leer el código.
 *
 * ⚠️ `fiscal.ts` tenía 96,29 % de cobertura y un mutation score de **75,26 %**: 46
 * mutantes sobrevivían en el módulo que estima lo que el usuario va a declarar. Aquí no
 * hay margen de «se ve raro en pantalla»: un error acaba en la declaración.
 */
describe('fiscal.ts · casos que el mutation testing dejó al descubierto', () => {
	/**
	 * La escala del ahorro, tramo por tramo y en sus bordes exactos.
	 *
	 * Seis mutantes vivos en la tabla misma —vaciar `{ upTo: 6000, rate: 0.19 }` no rompía
	 * ningún test— porque se comprobaba el primer tramo, un caso progresivo y un total que
	 * cruza todo, pero **ningún borde**. Y los bordes son justo donde una tabla de tipos se
	 * equivoca cuando alguien la actualiza.
	 */
	describe('los bordes de los tramos', () => {
		const T1 = 6000 * 0.19;
		const T2 = T1 + 44000 * 0.21;
		const T3 = T2 + 150000 * 0.23;
		const T4 = T3 + 100000 * 0.27;

		const casos: [number, number, string][] = [
			[6000, T1, 'el primer tramo completo'],
			[6000.01, T1 + 0.01 * 0.21, 'un céntimo dentro del segundo'],
			[50000, T2, 'hasta el techo del segundo'],
			[200000, T3, 'hasta el techo del tercero'],
			[300000, T4, 'hasta el techo del cuarto'],
			[400000, T4 + 100000 * 0.3, 'y el último, que no tiene techo']
		];

		it.each(casos)('%s de ganancia → %s de impuesto (%s)', (ganancia, esperado) => {
			expect(calculateSavingsTax(ganancia)).toBeCloseTo(Math.round(esperado * 100) / 100, 2);
		});

		it('el tipo marginal cambia exactamente en el borde, no antes', () => {
			expect(marginalSavingsRate(5999.99)).toBe(0.19);
			expect(marginalSavingsRate(6000)).toBe(0.21);
			expect(marginalSavingsRate(49999.99)).toBe(0.21);
			expect(marginalSavingsRate(50000)).toBe(0.23);
			expect(marginalSavingsRate(299999.99)).toBe(0.27);
			expect(marginalSavingsRate(300000)).toBe(0.3);
		});
	});

	/**
	 * `otherGains`: colocar la ganancia en su sitio de la escala.
	 *
	 * Seis mutantes vivos en el bucle que consume los tramos ya gastados. El test que había
	 * usaba una cifra que no llega a agotar el primer tramo, así que la rama
	 * `floor >= bracketWidth` —la que salta un tramo entero— no se ejercitaba nunca.
	 */
	describe('ganancias previas del ejercicio', () => {
		it('unas ganancias previas que agotan justo el primer tramo empujan al segundo', () => {
			expect(calculateSavingsTax(1000, 6000)).toBeCloseTo(1000 * 0.21, 2);
		});

		it('unas ganancias previas que cruzan dos tramos empujan al tercero', () => {
			expect(calculateSavingsTax(1000, 50000)).toBeCloseTo(1000 * 0.23, 2);
		});

		it('una ganancia puede empezar en un tramo y acabar en el siguiente', () => {
			// Desde 5.000 € previos: 1.000 € al 19 % y 1.000 € al 21 %.
			expect(calculateSavingsTax(2000, 5000)).toBeCloseTo(1000 * 0.19 + 1000 * 0.21, 2);
		});

		it('unas ganancias previas negativas no regalan tramo', () => {
			// Las pérdidas previas no amplían la escala hacia abajo: el suelo se queda en 0.
			expect(calculateSavingsTax(1000, -5000)).toBeCloseTo(1000 * 0.19, 2);
		});
	});

	/**
	 * Qué transacciones crean valor de adquisición, y por qué importa cada una por separado.
	 *
	 * Cuatro mutantes vivos en `t.type === 'buy' || 'initial_balance' || 'transfer'`, porque
	 * todos los tests usaban compras. Y las otras dos son las que más duelen: un
	 * **traspaso** que dejara de crear lote daría valor de adquisición cero, y con él una
	 * plusvalía y un impuesto inventados —y el traspaso es el caso de uso central de esta
	 * app—; un **saldo inicial** es como llega toda cartera importada de un CSV.
	 */
	describe('transacciones que crean valor de adquisición', () => {
		it('un traspaso entrante crea lote con su valor de adquisición', () => {
			const lots = buildFifoLots([tx({ type: 'transfer', shares: 10, price: 50 })], 'FUND');
			expect(lots).toHaveLength(1);
			expect(lots[0].unitCostBase).toBeCloseTo(50, 6);
		});

		it('un saldo inicial también, que es como llega una cartera importada', () => {
			const lots = buildFifoLots([tx({ type: 'initial_balance', shares: 4, price: 25 })], 'FUND');
			expect(lots).toHaveLength(1);
			expect(lots[0].unitCostBase).toBeCloseTo(25, 6);
		});

		it('una transacción sin participaciones no crea lote', () => {
			// Filas de importación con 0 títulos: si crearan lote, el coste unitario sería una
			// división por cero.
			const lots = buildFifoLots(
				[tx({ shares: 0, price: 100 }), tx({ shares: 5, price: 10 })],
				'FUND'
			);
			expect(lots).toHaveLength(1);
			expect(Number.isFinite(lots[0].unitCostBase)).toBe(true);
		});
	});

	/**
	 * El orden de las transacciones, que no llega ordenado.
	 *
	 * Cuatro mutantes vivos en los dos `sort((a, b) => a.date - b.date)`. Un CSV de bróker
	 * llega en cualquier orden —hay quien los exporta del más reciente al más antiguo— y si
	 * la ordenación se rompe, FIFO consume el lote equivocado y el valor de adquisición sale
	 * mal sin que nada avise.
	 */
	it('el resultado no depende del orden en que lleguen las transacciones', () => {
		const compras = [
			tx({ shares: 10, price: 10, date: T0 }),
			tx({ shares: 10, price: 20, date: T0 + 100 * DAY }),
			tx({ shares: 10, price: 30, date: T0 + 200 * DAY })
		];
		const venta = tx({ type: 'sell', shares: 15, price: 40, date: T0 + 300 * DAY });

		const enOrden = buildFifoLots([...compras, venta], 'FUND');
		const alReves = buildFifoLots([venta, ...compras].reverse(), 'FUND');

		// FIFO consume los 10 a 10 € y la mitad de los de 20 €: quedan 5 a 20 y 10 a 30.
		expect(enOrden.map((l) => [l.shares, l.unitCostBase])).toEqual([
			[5, 20],
			[10, 30]
		]);
		expect(alReves).toEqual(enOrden);
	});

	/**
	 * Los márgenes de coma flotante del consumo FIFO.
	 *
	 * Nueve mutantes vivos entre `lot.shares <= 1e-9`, el `filter` final y el
	 * `remaining > 1e-6` de `simulateSale`. Existen porque vender exactamente lo que tienes
	 * deja un residuo de coma flotante, y sin los epsilon quedaría un lote fantasma de
	 * 0,0000000001 participaciones que el siguiente cálculo trataría como real.
	 */
	describe('vender exactamente lo que hay', () => {
		it('una venta total no deja lotes fantasma', () => {
			const lots = buildFifoLots(
				[
					tx({ shares: 0.1, price: 100 }),
					tx({ shares: 0.2, price: 100, date: T0 + DAY }),
					tx({ type: 'sell', shares: 0.30000000000000004, date: T0 + 2 * DAY })
				],
				'FUND'
			);
			expect(lots).toEqual([]);
		});

		it('vender el total exacto no marca el resultado como incompleto', () => {
			const lots = buildFifoLots([tx({ shares: 3, price: 10 })], 'FUND');
			const venta = simulateSale(lots, 3, 20);
			expect(venta.incomplete).toBe(false);
			expect(venta.sharesSold).toBeCloseTo(3, 4);
			expect(venta.gain).toBeCloseTo(3 * 20 - 3 * 10, 2);
		});

		it('vender más de lo que hay sí lo marca, y solo cuenta lo que había', () => {
			const lots = buildFifoLots([tx({ shares: 3, price: 10 })], 'FUND');
			const venta = simulateSale(lots, 5, 20);
			expect(venta.incomplete).toBe(true);
			expect(venta.sharesSold).toBeCloseTo(3, 4);
			expect(venta.proceeds).toBeCloseTo(60, 2);
		});

		it('la fecha que devuelve es la del lote más antiguo consumido', () => {
			// Es la que decide la ventana de la regla antiaplicación, así que confundirla con
			// la del lote más reciente cambia el aviso que ve el usuario.
			const lots = buildFifoLots(
				[
					tx({ shares: 5, price: 10, date: T0 }),
					tx({ shares: 5, price: 10, date: T0 + 500 * DAY })
				],
				'FUND'
			);
			expect(simulateSale(lots, 7, 15).oldestLotDate).toBe(T0);
		});
	});

	/**
	 * El borde de la ventana antiaplicación.
	 *
	 * Cinco mutantes vivos entre `Math.abs(t.date - saleDate) <= windowMs` y la aritmética
	 * de `DAY_MS`. Los tests que había usan recompras a diez días de la venta: cómodamente
	 * dentro, así que el borde —donde se decide si una pérdida compensa o no— no se
	 * comprobaba.
	 */
	describe('el borde de la ventana', () => {
		// La ventana son `meses × 30,44 días`, que es la aproximación que usa el módulo.
		const dosMeses = 2 * 30.44 * DAY;

		it('una recompra justo dentro de la ventana bloquea', () => {
			const check = checkAntiApplicationRule(
				[tx({ shares: 1, price: 100, date: T0 + dosMeses - DAY })],
				'FUND',
				'etf',
				T0
			);
			expect(check.blocked).toBe(true);
		});

		it('una recompra un día después del borde ya no bloquea', () => {
			const check = checkAntiApplicationRule(
				[tx({ shares: 1, price: 100, date: T0 + dosMeses + DAY })],
				'FUND',
				'etf',
				T0
			);
			expect(check.blocked).toBe(false);
			expect(check.daysUntilSafeRepurchase).toBeNull();
		});

		it('los días de espera se cuentan desde la recompra más reciente', () => {
			const check = checkAntiApplicationRule(
				[
					tx({ shares: 1, price: 100, date: T0 + 10 * DAY }),
					tx({ shares: 1, price: 100, date: T0 + 20 * DAY })
				],
				'FUND',
				'etf',
				T0
			);
			expect(check.blockingPurchases).toHaveLength(2);
			// La última recompra más la ventana, contado desde la venta.
			expect(check.daysUntilSafeRepurchase).toBe(Math.ceil((20 * DAY + dosMeses) / DAY));
		});

		it('un traspaso entrante bloquea igual que una compra', () => {
			// Suscribir el mismo fondo por traspaso es adquirir un valor homogéneo: cuenta.
			const check = checkAntiApplicationRule(
				[tx({ type: 'transfer', shares: 1, price: 100, date: T0 + 5 * DAY })],
				'FUND',
				'fund',
				T0
			);
			expect(check.blocked).toBe(true);
			expect(check.windowMonths).toBe(12);
		});

		it('⚠️ un saldo inicial NO bloquea, y es deliberado', () => {
			// `initial_balance` es un artefacto de importar una cartera, no una adquisición en
			// el mercado, así que no bloquea nada. Por eso la lista de tipos de
			// `checkAntiApplicationRule` es más corta que la de `buildFifoLots` y **no hay que
			// unificarlas**, por tentador que parezca al ver los mutantes duplicados. Si algún
			// día se decide lo contrario, este test es donde se ve el cambio.
			const check = checkAntiApplicationRule(
				[tx({ type: 'initial_balance', shares: 1, price: 100, date: T0 + 5 * DAY })],
				'FUND',
				'fund',
				T0
			);
			expect(check.blocked).toBe(false);
		});
	});
});
