import { describe, it, expect } from 'vitest';
import { planificarImportacion } from './ledger-import';
import type { Transaction as OperacionCSV, ParsedPosition } from './types';

/**
 * La decisión de si un activo importado entra con libro de operaciones.
 *
 * Lo que está en juego: `effectiveHoldings` da **prioridad al libro** sobre las
 * participaciones manuales, así que un libro incompleto hace que la cartera muestre menos
 * de lo que hay. Se pasaría de *correcto sin historia* a *con historia e incorrecto*, y lo
 * segundo es peor porque el usuario no tiene forma de notarlo.
 */

const op = (
	fecha: string,
	tipo: 'BUY' | 'SELL',
	shares: number,
	price: number,
	currency = 'EUR'
): OperacionCSV => ({
	date: new Date(fecha),
	type: tipo,
	isin: 'IE00TEST0001',
	name: 'Acme World',
	shares,
	price,
	currency
});

const posicion = (shares: number, avgCost: number) => ({
	ticker: 'ACME.F',
	posicion: { isin: 'IE00TEST0001', name: 'Acme World', shares, avgCost, currency: 'EUR' } as ParsedPosition,
	shares,
	avgCost
});

/** Ids deterministas, que es la razón de que `nuevoId` sea inyectable. */
const idsFijos = () => {
	let n = 0;
	return () => `tx-${++n}`;
};

const plan = (operaciones: OperacionCSV[], shares: number, avgCost = 10) =>
	planificarImportacion({
		posiciones: [posicion(shares, avgCost)],
		operaciones,
		tickerDe: () => 'ACME.F',
		nuevoId: idsFijos()
	})[0];

describe('planificarImportacion', () => {
	it('activa el libro cuando las operaciones cuadran con la posición', () => {
		const resultado = plan(
			[op('2025-02-10', 'BUY', 100, 10), op('2025-04-30', 'BUY', 45, 11.1111)],
			145
		);

		expect(resultado.conLibro).toBe(true);
		expect(resultado.operaciones).toHaveLength(2);
		expect(resultado.motivo).toBeUndefined();
	});

	it('ordena las operaciones por fecha y expone la primera', () => {
		const resultado = plan(
			[op('2025-07-02', 'BUY', 21, 11.9), op('2025-02-10', 'BUY', 100, 10)],
			121
		);

		expect(resultado.operaciones[0].date).toBe(new Date('2025-02-10').getTime());
		expect(resultado.desde).toBe(new Date('2025-02-10').getTime());
	});

	it('convierte al formato de la cartera, con comisión y cambio neutros', () => {
		const [tx] = plan([op('2025-02-10', 'BUY', 100, 10)], 100).operaciones;

		expect(tx).toEqual({
			id: 'tx-1',
			ticker: 'ACME.F',
			type: 'buy',
			date: new Date('2025-02-10').getTime(),
			shares: 100,
			price: 10,
			currency: 'EUR',
			// El CSV no desglosa ni comisiones por operación ni el cambio del día.
			fees: 0,
			fxRate: 1
		});
	});

	it('traduce una venta al tipo que entiende el libro', () => {
		const resultado = plan(
			[op('2025-02-10', 'BUY', 100, 10), op('2025-06-01', 'SELL', 30, 12)],
			70
		);

		expect(resultado.conLibro).toBe(true);
		expect(resultado.operaciones.map((t) => t.type)).toEqual(['buy', 'sell']);
	});

	/**
	 * ⚠️ **La salvaguarda que de verdad importa, y no es la que parece.** Comparar el neto
	 * con la posición no sirve para detectar un fichero incompleto: la posición se ha
	 * calculado *a partir de esas mismas operaciones*, así que cuadra por construcción. Lo
	 * que delata que falta histórico es **una venta que aparece sin su compra**, y eso pasa
	 * siempre que alguien descarga sólo los últimos doce meses de su bróker.
	 *
	 * Con el libro activado en ese caso, la cartera mostraría las participaciones que el
	 * fichero sabe explicar en vez de las que el usuario tiene.
	 */
	it('no activa el libro si una venta no tiene compras suficientes detrás', () => {
		const resultado = plan(
			[op('2025-02-10', 'BUY', 10, 10), op('2025-06-01', 'SELL', 500, 12)],
			0
		);

		expect(resultado.conLibro).toBe(false);
		expect(resultado.motivo).toBe('historial-incompleto');
		expect(resultado.operaciones).toHaveLength(0);
		// Y la instantánea sigue entrando: mejor sin historia que con una inventada.
		expect(resultado.shares).toBe(0);
	});

	/**
	 * ⚠️ El libro guarda un `fxRate` por operación y con él calcula el coste en euros. El
	 * CSV no trae el cambio **del día de cada compra**, así que un `fxRate: 1` en un activo
	 * en dólares no deja el coste aproximado: lo deja mal por lo que se haya movido el par.
	 */
	it('no activa el libro si las operaciones no están en la divisa base', () => {
		const resultado = plan(
			[op('2025-02-10', 'BUY', 100, 10, 'USD'), op('2025-04-30', 'BUY', 45, 11, 'USD')],
			145
		);

		expect(resultado.conLibro).toBe(false);
		expect(resultado.motivo).toBe('divisa-no-base');
	});

	it('no activa el libro si el neto no cuadra con la posición', () => {
		// La posición dice 200 y las operaciones sólo explican 145.
		const resultado = plan(
			[op('2025-02-10', 'BUY', 100, 10), op('2025-04-30', 'BUY', 45, 11)],
			200
		);

		expect(resultado.conLibro).toBe(false);
		expect(resultado.motivo).toBe('descuadre');
	});

	it('tolera el redondeo a tres decimales que aplica la cartera', () => {
		const resultado = plan([op('2025-02-10', 'BUY', 166.5998, 10)], 166.6);

		expect(resultado.conLibro).toBe(true);
	});

	it('un CSV de instantánea, sin operaciones, sigue entrando sin libro', () => {
		const resultado = plan([], 145);

		expect(resultado.conLibro).toBe(false);
		expect(resultado.motivo).toBe('sin-operaciones');
		expect(resultado.shares).toBe(145);
		expect(resultado.avgCost).toBe(10);
	});

	it('reparte las operaciones entre varios activos por su ticker', () => {
		const world = { ...op('2025-02-10', 'BUY', 100, 10), isin: 'IE00TEST0001' };
		const em = { ...op('2026-04-15', 'BUY', 25, 12), isin: 'IE00TEST0002' };

		const resultado = planificarImportacion({
			posiciones: [
				{ ...posicion(100, 10), ticker: 'WORLD.F' },
				{ ...posicion(25, 12), ticker: 'EM.F' }
			],
			operaciones: [world, em],
			tickerDe: (o) => (o.isin === 'IE00TEST0001' ? 'WORLD.F' : 'EM.F'),
			nuevoId: idsFijos()
		});

		expect(resultado.map((p) => [p.ticker, p.conLibro, p.operaciones.length])).toEqual([
			['WORLD.F', true, 1],
			['EM.F', true, 1]
		]);
	});

	it('una operación cuyo ticker no se resuelve no bloquea al resto', () => {
		const resultado = planificarImportacion({
			posiciones: [posicion(100, 10)],
			operaciones: [op('2025-02-10', 'BUY', 100, 10), op('2025-03-01', 'BUY', 999, 1)],
			// La segunda no resuelve: se descarta antes de agrupar.
			tickerDe: (o) => (o.shares === 999 ? null : 'ACME.F'),
			nuevoId: idsFijos()
		})[0];

		expect(resultado.conLibro).toBe(true);
		expect(resultado.operaciones).toHaveLength(1);
	});
});
