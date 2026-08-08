import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HeroSummary from './HeroSummary.svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';

loadLocale('es');
setLocale('es');

// Mock the global portfolio store to avoid Firebase and environment variable issues
vi.mock('$lib/stores/portfolio.svelte', () => {
	return {
		portfolio: {
			globalCapital: 10000,
			globalProfit: 500,
			globalProfitPercent: 0.05,
			globalInvested: 9500,
			globalDailyChangeValue: 100,
			globalDailyChangePercent: 0.01,
			globalAnnualCost: 50,
			globalWeightedAverageTer: 0.005,
			loading: false,
			isPrivate: false,
			targetLabel: 'Objetivo',
			hasAnyHoldings: true,
			portfolioState: { totalCapital: 7000, positions: [] },
			stockState: { totalCapital: 2000 },
			satelliteState: { totalCapital: 1000 },
			/**
			 * Las cajas de «Invertido» y «Rentabilidad» dibujan una sparkline con
			 * estas series. El mock no las traía y el componente reventaba al
			 * añadirlas — que es justo lo que tiene que pasar: si el store deja de
			 * publicar `performanceSeries`, esto se entera.
			 */
			performanceSeries: {
				invested: [9000, 9200, 9350, 9500],
				gain: [100, 260, 380, 500]
			},
			prices: { 'AAPL': {} } // Just to pass the `Object.keys(portfolio.prices).length > 0` condition
		}
	};
});

describe('HeroSummary.svelte', () => {
	it('renders total capital formatted', async () => {
	        const { container } = render(HeroSummary);
	        // The formatted currency uses the local format.
	        expect(container.textContent).toMatch(/10\.?000/);
	});

	it('does not render main section when loading and no prices', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = true;
	        portfolio.prices = {};
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.hero-summary')).toBeNull();
	});

	it('shows negative class when globalProfit < 0', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = false;
	        portfolio.globalProfit = -100;
	        portfolio.prices = { 'AAPL': { price: 150, currency: 'USD', name: 'Apple Inc', change: 1.5 } };
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.negative')).not.toBeNull();
	});

	it('shows positive class when globalProfit > 0', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = false;
	        portfolio.globalProfit = 100;
	        portfolio.prices = { 'AAPL': { price: 150, currency: 'USD', name: 'Apple Inc', change: 1.5 } };
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.positive')).not.toBeNull();
	});

	it('shows breakdown when satellite or stocks have capital', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.satelliteState.totalCapital = 500;
	        portfolio.stockState.totalCapital = 500;
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.capital-breakdown')).not.toBeNull();
	});

	it('hides breakdown when satellite and stocks are zero', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.satelliteState.totalCapital = 0;
	        portfolio.stockState.totalCapital = 0;
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.capital-breakdown')).toBeNull();
	});

	it('dibuja una sparkline en las dos cajas que tienen serie, y solo en ésas', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = false;
	        portfolio.prices = { 'AAPL': { price: 150, currency: 'USD', name: 'Apple Inc', change: 1.5 } };
	        const { container } = render(HeroSummary);
	        // Cuatro cajas, dos líneas: «Cambio hoy» y el TER son cifras de un
	        // instante y no tienen historia que dibujar.
	        expect(container.querySelectorAll('.metric-card').length).toBe(4);
	        expect(container.querySelectorAll('.metric-spark svg').length).toBe(2);
	});

	it('no dibuja la sparkline cuando la serie es plana', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = false;
	        portfolio.prices = { 'AAPL': { price: 150, currency: 'USD', name: 'Apple Inc', change: 1.5 } };
	        portfolio.performanceSeries = {
	                ...portfolio.performanceSeries,
	                invested: [9500, 9500, 9500, 9500],
	                gain: [500, 500, 500, 500]
	        };
	        const { container } = render(HeroSummary);
	        expect(container.querySelectorAll('.metric-spark svg').length).toBe(0);
	});	});
