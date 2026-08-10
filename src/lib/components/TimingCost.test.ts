import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { buildPerformanceSeries } from '$lib/history/performance';
import type { DailyPoint } from '$lib/history/types';

loadLocale('es');
setLocale('es');

/**
 * Mismo motivo que `TaxAwareRebalance.test.ts`, que es el precedente: **en un navegador
 * este panel nunca se ve poblado**. La cartera de la demo no tiene aportaciones ni ventas,
 * así que siempre muestra «hace falta al menos una aportación o una venta para poder
 * comparar» — verificado en `vite preview` el 10-ago-2026 — y el camino con cifras no se
 * ejercitaba en ninguna parte.
 *
 * Lo que se prueba aquí es justo lo que el navegador no puede enseñar: que el pie declara
 * el periodo del que hablan las cifras, y que un flujo caído en los días estimados no
 * habilita una comparación que ya no lo incluye.
 */

const point = (date: string, total: number, netFlow = 0, estimated = false): DailyPoint => ({
	date,
	total,
	core: total,
	satellite: 0,
	stocks: 0,
	netFlow,
	estimated,
	hasBreakdown: true
});

/** Dos días estimados y tres reales, con la aportación dentro del tramo real. */
const CON_FLUJO_MEDIDO = [
	point('2026-01-01', 9000, 0, true),
	point('2026-01-02', 9500, 0, true),
	point('2026-01-03', 10000),
	point('2026-01-04', 11000, 800),
	point('2026-01-05', 11200)
];

/** La aportación cae en el tramo estimado, que ya no entra en el cálculo. */
const CON_FLUJO_SOLO_ESTIMADO = [
	point('2026-01-01', 9000, 800, true),
	point('2026-01-02', 9500, 0, true),
	point('2026-01-03', 10000),
	point('2026-01-04', 10200)
];

const store = {
	isPrivate: false,
	performanceSeries: buildPerformanceSeries(CON_FLUJO_MEDIDO, 9800)
};

vi.mock('$lib/stores/portfolio.svelte', () => ({
	get portfolio() {
		return store;
	}
}));

async function renderPanel() {
	const TimingCost = (await import('./TimingCost.svelte')).default;
	return render(TimingCost);
}

describe('TimingCost.svelte', () => {
	it('declara sobre cuántos días reales están medidas las cifras', async () => {
		store.performanceSeries = buildPerformanceSeries(CON_FLUJO_MEDIDO, 9800);
		const { container } = await renderPanel();

		// Tres puntos no estimados de los cinco.
		expect(container.querySelector('.footnote')?.textContent).toContain('3');
		// Y no la afirmación vieja, que hablaba del periodo que mostrase el gráfico.
		expect(container.textContent).not.toContain('periodo mostrado');
	});

	/**
	 * ⚠️ El caso que obligó a cambiar `hasFlows` en el componente: mientras las
	 * rentabilidades se medían sobre toda la ventana, un flujo cualquiera bastaba para
	 * habilitar el panel. Ahora se miden desde el primer día real, así que un flujo que
	 * cae en los días estimados **no participa en ninguna de las dos cifras** y encender
	 * el panel con él sería comparar dos números que no lo han visto.
	 */
	it('no compara cuando el único flujo cae en los días estimados', async () => {
		store.performanceSeries = buildPerformanceSeries(CON_FLUJO_SOLO_ESTIMADO, 9800);
		const { container } = await renderPanel();

		expect(container.textContent).toContain('Hace falta al menos una aportación');
		expect(container.querySelector('.figures')).toBeNull();
	});

	it('con cifras medidas enseña las tres casillas y la diferencia', async () => {
		store.performanceSeries = buildPerformanceSeries(CON_FLUJO_MEDIDO, 9800);
		const { container } = await renderPanel();

		expect(container.querySelectorAll('.figure')).toHaveLength(3);
		expect(container.textContent).toContain('Tus activos');
		expect(container.textContent).toContain('pp');
	});
});
