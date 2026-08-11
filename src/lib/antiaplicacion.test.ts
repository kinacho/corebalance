import { describe, it, expect } from 'vitest';
import { consultarAntiaplicacion } from './antiaplicacion';

describe('consultarAntiaplicacion', () => {
	/**
	 * ⚠️ El test que justifica la herramienta entera.
	 *
	 * Hay guías de divulgación que aplican **dos meses a los fondos**, y es el error
	 * cómodo: le difiere al lector una pérdida que creía compensada. Las participaciones
	 * de un fondo no cotizan, así que caen en el art. 33.5.g y la ventana es de **un año**.
	 * Si esta distinción se rompe, la herramienta pasa a dar el consejo equivocado con
	 * apariencia de exactitud, que es peor que no existir.
	 */
	it('un fondo son 12 meses y un ETF son 2', () => {
		expect(consultarAntiaplicacion({ tipo: 'fondo', fechaVenta: '2026-03-10' })?.ventanaMeses).toBe(
			12
		);
		expect(consultarAntiaplicacion({ tipo: 'etf', fechaVenta: '2026-03-10' })?.ventanaMeses).toBe(2);
	});

	it('la fecha segura del ETF cae a unos dos meses y la del fondo a un año', () => {
		const etf = consultarAntiaplicacion({ tipo: 'etf', fechaVenta: '2026-01-15' })!;
		const fondo = consultarAntiaplicacion({ tipo: 'fondo', fechaVenta: '2026-01-15' })!;
		expect(etf.diasDeEspera).toBeGreaterThan(55);
		expect(etf.diasDeEspera).toBeLessThan(70);
		expect(fondo.diasDeEspera).toBeGreaterThan(360);
		expect(fondo.diasDeEspera).toBeLessThan(375);
		expect(fondo.seguroDesde.slice(0, 4)).toBe('2027');
	});

	it('una recompra dentro de la ventana bloquea, y fuera no', () => {
		const dentro = consultarAntiaplicacion({
			tipo: 'etf',
			fechaVenta: '2026-01-15',
			fechaRecompra: '2026-02-20'
		})!;
		const fuera = consultarAntiaplicacion({
			tipo: 'etf',
			fechaVenta: '2026-01-15',
			fechaRecompra: '2026-06-01'
		})!;
		expect(dentro.bloqueada).toBe(true);
		expect(fuera.bloqueada).toBe(false);
	});

	/**
	 * ⚠️ La ventana mira **hacia los dos lados** de la venta: comprar *antes* de vender
	 * bloquea igual que comprar después. Es el caso que casi nadie contempla y el que se
	 * da de verdad al rebalancear, cuando compras y luego ajustas.
	 */
	it('comprar antes de vender bloquea igual', () => {
		const antes = consultarAntiaplicacion({
			tipo: 'etf',
			fechaVenta: '2026-03-10',
			fechaRecompra: '2026-02-01'
		})!;
		expect(antes.bloqueada).toBe(true);
	});

	it('sin fecha de recompra contesta la ventana pero no bloquea nada', () => {
		const r = consultarAntiaplicacion({ tipo: 'fondo', fechaVenta: '2026-03-10' })!;
		expect(r.conRecompra).toBe(false);
		expect(r.bloqueada).toBe(false);
		expect(r.seguroDesde).toBeTruthy();
	});

	it('⚠️ una fecha ilegible devuelve null en vez de inventarse hoy', () => {
		// Sustituir una fecha inválida por la de hoy cambiaría la respuesta sin avisar,
		// que es exactamente el defecto que este repo ya corrigió en `parseBrokerDate`.
		for (const mala of ['', 'ayer', '10/03/2026', '2026-3-1', '2026-13-45x', null]) {
			expect(
				consultarAntiaplicacion({ tipo: 'fondo', fechaVenta: mala as string }),
				JSON.stringify(mala)
			).toBeNull();
		}
	});

	it('una fecha de recompra ilegible no bloquea ni revienta', () => {
		const r = consultarAntiaplicacion({
			tipo: 'fondo',
			fechaVenta: '2026-03-10',
			fechaRecompra: 'el mes que viene'
		})!;
		expect(r).not.toBeNull();
		expect(r.conRecompra).toBe(false);
		expect(r.bloqueada).toBe(false);
	});
});
