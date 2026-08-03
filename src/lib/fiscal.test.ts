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
