import { describe, it, expect } from 'vitest';
import { reduceTransactionsToPositions } from './aggregator';
import type { Transaction } from './types';

/**
 * El agregador cronológico: convierte una lista de transacciones en posiciones aplicando
 * el coste medio ponderado. Es el último eslabón antes de que los números salgan del
 * subsistema de importación, y **era el único punto capaz de perder transacciones sin
 * dejar rastro** — un `if (existing)` sin `else` para las ventas y un recorte a cero
 * silencioso para las sobreventas.
 */

function tx(over: Partial<Transaction> & Pick<Transaction, 'type' | 'shares' | 'price'>): Transaction {
	return {
		date: new Date(2026, 0, 1),
		isin: 'IE00B4L5Y983',
		name: 'iShares Core MSCI World',
		currency: 'EUR',
		...over
	};
}

describe('reduceTransactionsToPositions', () => {
	it('aplica coste medio ponderado a dos compras', () => {
		const { positions } = reduceTransactionsToPositions([
			tx({ type: 'BUY', shares: 10, price: 100, date: new Date(2026, 0, 1) }),
			tx({ type: 'BUY', shares: 10, price: 120, date: new Date(2026, 1, 1) })
		]);

		expect(positions).toHaveLength(1);
		expect(positions[0].shares).toBe(20);
		expect(positions[0].avgCost).toBe(110);
	});

	it('una venta reduce títulos sin mover el coste medio', () => {
		const { positions, warnings } = reduceTransactionsToPositions([
			tx({ type: 'BUY', shares: 10, price: 100, date: new Date(2026, 0, 1) }),
			tx({ type: 'SELL', shares: 4, price: 150, date: new Date(2026, 1, 1) })
		]);

		expect(positions[0].shares).toBe(6);
		expect(positions[0].avgCost).toBe(100);
		expect(warnings).toEqual([]);
	});

	it('ordena cronológicamente aunque las transacciones lleguen desordenadas', () => {
		const { positions } = reduceTransactionsToPositions([
			tx({ type: 'SELL', shares: 4, price: 150, date: new Date(2026, 1, 1) }),
			tx({ type: 'BUY', shares: 10, price: 100, date: new Date(2026, 0, 1) })
		]);

		expect(positions[0].shares).toBe(6);
	});

	/**
	 * ⚠️ El caso normal, no el raro: quien descarga solo los últimos doce meses tiene en el
	 * fichero las ventas pero no las compras antiguas. Antes esto devolvía la cartera
	 * recortada con `warnings: []`, es decir, sin nada que le dijera al usuario que se han
	 * ignorado títulos que él sí vendió.
	 */
	it('avisa cuando una venta no tiene compra previa en el fichero', () => {
		const { positions, warnings } = reduceTransactionsToPositions([
			tx({ type: 'SELL', shares: 10, price: 150, name: 'Apple', date: new Date(2026, 0, 10) }),
			tx({ type: 'BUY', shares: 3, price: 100, name: 'Apple', date: new Date(2026, 1, 10) })
		]);

		expect(positions[0].shares).toBe(3);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('Apple');
		expect(warnings[0]).toContain('ninguna compra previa');
	});

	it('avisa cuando se venden más títulos de los comprados y deja la posición a cero', () => {
		const { positions, warnings } = reduceTransactionsToPositions([
			tx({ type: 'BUY', shares: 5, price: 100, date: new Date(2026, 0, 1) }),
			tx({ type: 'SELL', shares: 12, price: 150, date: new Date(2026, 1, 1) })
		]);

		// La posición desaparece del listado (queda a 0), que es justo por lo que hace falta
		// el aviso: sin él, el activo se esfuma de la previsualización sin explicación.
		expect(positions).toHaveLength(0);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('más títulos');
	});

	it('vender exactamente lo comprado no es una anomalía y no avisa', () => {
		const { positions, warnings } = reduceTransactionsToPositions([
			tx({ type: 'BUY', shares: 5, price: 100, date: new Date(2026, 0, 1) }),
			tx({ type: 'SELL', shares: 5, price: 150, date: new Date(2026, 1, 1) })
		]);

		expect(positions).toHaveLength(0);
		expect(warnings).toEqual([]);
	});
});
