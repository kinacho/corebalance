import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { calculateTaxAwareRebalance } from '$lib/traspaso';
import type { InstrumentType, PortfolioPosition } from '$lib/types';

loadLocale('es');
setLocale('es');

/**
 * Los motores de `traspaso.ts` y `fiscal.ts` ya tienen sus propias pruebas. Esto
 * cubre el tramo que falta y que no cubre ninguna otra: que el plan calculado
 * llegue a la pantalla. La cartera de la demo viene justo en objetivo, así que
 * en el navegador este componente siempre dice «nada que mover» y el camino con
 * movimientos no se ejercitaba en ningún sitio.
 */

function makePositions(
	specs: { ticker: string; name: string; type: InstrumentType; value: number; target: number }[]
): PortfolioPosition[] {
	const total = specs.reduce((sum, s) => sum + s.value, 0);
	return specs.map((spec) => ({
		asset: {
			ticker: spec.ticker,
			name: spec.name,
			isin: '',
			targetWeight: spec.target,
			color: '#3b82f6',
			icon: '🛡️',
			ter: 0,
			category: 'core' as const,
			instrumentType: spec.type
		},
		holdings: spec.value / 100,
		avgCost: 100,
		totalCost: spec.value,
		unitPrice: 100,
		totalValue: spec.value,
		currentWeight: spec.value / total,
		deviation: spec.value / total - spec.target,
		targetValue: total * spec.target,
		targetHoldings: (total * spec.target) / 100,
		profit: 0,
		profitPercent: 0,
		dailyChangeValue: 0,
		dailyChangePercent: 0
	}));
}

const EMPTY_STATE = { positions: [] as PortfolioPosition[] };

/** Cartera 60/40 que se ha ido a 70/30, los dos fondos: traspaso gratis. */
const DEVIATED = makePositions([
	{ ticker: 'WORLD', name: 'Vanguard Global Stock Index', type: 'fund', value: 7000, target: 0.6 },
	{ ticker: 'BONDS', name: 'Vanguard Global Bond Index', type: 'fund', value: 3000, target: 0.4 }
]);

const store = {
	prices: { WORLD: { price: 100, currency: 'EUR', name: 'World', change: 0 } } as Record<
		string,
		unknown
	>,
	transactions: [] as unknown[],
	contribution: 0,
	taxAwareRebalance: calculateTaxAwareRebalance(
		[{ category: 'core', positions: DEVIATED }],
		[],
		{}
	),
	portfolioState: { positions: DEVIATED },
	satelliteState: EMPTY_STATE,
	stockState: EMPTY_STATE
};

vi.mock('$lib/stores/portfolio.svelte', () => ({
	get portfolio() {
		return store;
	}
}));

describe('TaxAwareRebalance.svelte', () => {
	it('muestra el traspaso y lo marca como exento', async () => {
		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance);

		// Los dos extremos del movimiento y el importe exacto que hay que mover.
		expect(container.textContent).toContain('Vanguard Global Stock Index');
		expect(container.textContent).toContain('Vanguard Global Bond Index');
		expect(container.textContent).toMatch(/1\.?000/);
		expect(container.textContent).toContain('Sin coste fiscal');
		expect(container.textContent).toContain('Traspaso');

		// Y la insignia de la cabecera dice que cuesta cero.
		const badge = container.querySelector('.badge');
		expect(badge).not.toBeNull();
		expect(badge?.classList.contains('free')).toBe(true);
	});

	it('no ofrece la sección de ventas cuando todo es traspasable', async () => {
		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance);
		expect(container.textContent).not.toContain('Obliga a vender');
	});

	it('pide una aportación para poder comparar las dos vías', async () => {
		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance);
		// Sin aportación configurada no se puede decir «tardarías N meses».
		expect(container.textContent).toContain('Configura tu aportación mensual');
	});

	it('con aportación, compara contra los meses que tardaría aportando', async () => {
		store.contribution = 200;
		store.taxAwareRebalance = calculateTaxAwareRebalance(
			[{ category: 'core', positions: DEVIATED }],
			[],
			{ contribution: 200 }
		);

		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance);

		expect(container.textContent).toContain('meses en llegar a lo mismo');
		// El veredicto de que esperar no ahorra impuestos, porque el plan es gratis.
		expect(container.textContent).toContain('esperar no te ahorra impuestos');
	});

	it('con un ETF en pérdidas y recompra reciente, saca el aviso de la regla', async () => {
		const DAY = 24 * 60 * 60 * 1000;
		const now = Date.now();
		const withEtf = makePositions([
			{ ticker: 'ETF', name: 'iShares Core MSCI World', type: 'etf', value: 7000, target: 0.6 },
			{ ticker: 'FUND', name: 'Vanguard Global Bond Index', type: 'fund', value: 3000, target: 0.4 }
		]);
		const transactions = [
			{
				id: '1',
				ticker: 'ETF',
				type: 'buy' as const,
				date: now - 300 * DAY,
				shares: 70,
				price: 200,
				currency: 'EUR',
				fees: 0,
				fxRate: 1
			},
			{
				id: '2',
				ticker: 'ETF',
				type: 'buy' as const,
				date: now - 10 * DAY,
				shares: 1,
				price: 100,
				currency: 'EUR',
				fees: 0,
				fxRate: 1
			}
		];

		store.contribution = 0;
		store.portfolioState = { positions: withEtf };
		store.taxAwareRebalance = calculateTaxAwareRebalance(
			[{ category: 'core', positions: withEtf }],
			transactions,
			{ now }
		);

		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance);

		expect(container.textContent).toContain('Obliga a vender');
		expect(container.textContent).toContain('Esta pérdida no te la podrías deducir');
		expect(container.textContent).toContain('regla antiaplicación');
	});

	it('dice que no hay nada que hacer cuando la cartera está en objetivo', async () => {
		const balanced = makePositions([
			{ ticker: 'A', name: 'Fondo A', type: 'fund', value: 6000, target: 0.6 },
			{ ticker: 'B', name: 'Fondo B', type: 'fund', value: 4000, target: 0.4 }
		]);
		store.portfolioState = { positions: balanced };
		store.taxAwareRebalance = calculateTaxAwareRebalance(
			[{ category: 'core', positions: balanced }],
			[],
			{}
		);

		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance);

		expect(container.textContent).toContain('ya está en su objetivo');
		expect(container.querySelector('.badge')).toBeNull();
	});

	it('avisa si todavía no hay precios, en vez de dar un plan sobre ceros', async () => {
		store.prices = {};
		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance);
		expect(container.textContent).toContain('Esperando precios');
		store.prices = { WORLD: { price: 100, currency: 'EUR', name: 'World', change: 0 } };
	});
});
