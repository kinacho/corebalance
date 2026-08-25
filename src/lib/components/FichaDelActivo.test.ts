import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';
import type { Asset, PortfolioPosition, Transaction } from '$lib/types';

loadLocale('es');
setLocale('es');

/**
 * `ficha-activo.test.ts` ya fija la aritmética. Esto cubre el tramo que ninguna
 * prueba de módulo puede ver: **qué se dibuja y qué no**. En particular las dos
 * ausencias que importan, porque las dos serían mentiras si se dibujaran:
 *
 *  - Sin libro no puede salir una cifra de plusvalía. Un 0 ahí se lee como «no
 *    debes nada», y lo que pasa es que no se sabe.
 *  - Un fondo no presenta resultados trimestrales. Enseñar la casilla vacía
 *    inventaría una carencia donde solo hay una pregunta que no aplica.
 */

const AHORA = new Date(2026, 7, 25).getTime();
const DIA = 86400000;

const FONDO: Asset = {
	ticker: '0P0001XF40.F',
	name: 'Fidelity MSCI World Index Fund',
	isin: 'IE00BYX5NX33',
	targetWeight: 0.6,
	color: '#3b82f6',
	icon: '🌐',
	ter: 0.0012,
	category: 'core',
	indexKey: 'msci-world'
};

const ACCION: Asset = {
	...FONDO,
	ticker: 'AAPL',
	name: 'Apple Inc',
	isin: 'US0378331005',
	indexKey: undefined,
	category: 'stocks'
};

const posicionDe = (asset: Asset): PortfolioPosition =>
	({
		asset,
		holdings: 100,
		avgCost: 100,
		totalCost: 10000,
		unitPrice: 120,
		totalValue: 12000,
		currentWeight: 1,
		deviation: 0,
		targetValue: 12000,
		targetHoldings: 100,
		profit: 2000,
		profitPercent: 0.2,
		dailyChangeValue: 0,
		dailyChangePercent: 0
	}) as PortfolioPosition;

const COMPRA: Transaction = {
	id: 't1',
	ticker: '0P0001XF40.F',
	type: 'buy',
	date: AHORA - 400 * DIA,
	shares: 100,
	price: 100,
	currency: 'EUR',
	fees: 0,
	fxRate: 1
};

const store = {
	transactions: [] as Transaction[],
	prices: { '0P0001XF40.F': { currency: 'EUR' }, AAPL: { currency: 'USD' } } as Record<string, unknown>,
	perShareBase: { '0P0001XF40.F': 120, AAPL: 120 } as Record<string, number>,
	lookThrough: null as unknown,
	concentracion: null as unknown,
	fundamentals: {} as Record<string, unknown>,
	posicionDe: (ticker: string) => (ticker === 'AAPL' ? posicionDe(ACCION) : posicionDe(FONDO)),
	asegurarFundamentales: vi.fn()
};

vi.mock('$lib/stores/portfolio.svelte', () => ({
	get portfolio() {
		return store;
	}
}));

const pintar = async (asset: Asset) => {
	const FichaDelActivo = (await import('./FichaDelActivo.svelte')).default;
	return render(FichaDelActivo, { props: { asset, onVerLibro: () => {} } }).container;
};

describe('FichaDelActivo.svelte', () => {
	it('dice qué índice replica y lo que cuesta', async () => {
		store.transactions = [];
		const container = await pintar(FONDO);

		expect(container.textContent).toContain('World');
		// El TER en euros sobre lo que tiene: 12.000 € al 0,12 %.
		expect(container.textContent).toMatch(/14,4/);
	});

	/**
	 * ⚠️ **El caso que más importa.** Sin libro no hay lotes y no hay plusvalía que
	 * calcular: la ficha tiene que decirlo y ofrecer ir al libro, nunca pintar un
	 * cero. Es el mismo defecto que el importador que metía activos a coste 0 y
	 * fabricaba una ganancia del 100 %.
	 */
	it('sin libro avisa en vez de enseñar una cifra', async () => {
		store.transactions = [];
		const container = await pintar(FONDO);

		expect(container.textContent).toContain('libro de operaciones');
		expect(container.querySelector('.enlace-interno')).not.toBeNull();
		// Ni una caja de cifras fiscales: no hay nada que enseñar.
		expect(container.textContent).not.toContain('Plusvalía latente');
	});

	it('con libro enseña la plusvalía latente y la factura', async () => {
		store.transactions = [COMPRA];
		const container = await pintar(FONDO);

		expect(container.textContent).toContain('Plusvalía latente');
		/*
		 * 2.000 € de ganancia y 380 € de factura al 19 %.
		 *
		 * ⚠️ El punto de los millares es opcional en el patrón a propósito: `Intl`
		 * en `es-ES` **no agrupa los números de cuatro dígitos**, así que esto se
		 * pinta «2000,00 €» y no «2.000,00 €». Dar por hecho el separador es una
		 * forma fácil de escribir una prueba que falla por el formato y no por lo
		 * que quiere medir.
		 */
		expect(container.textContent).toMatch(/2\.?000/);
		expect(container.textContent).toMatch(/380/);
		expect(container.querySelector('.enlace-interno')).toBeNull();
	});

	it('un fondo dice que se puede traspasar sin tributar', async () => {
		store.transactions = [];
		const container = await pintar(FONDO);
		expect(container.querySelector('.traspaso.si')).not.toBeNull();
	});

	/**
	 * ⚠️ **Lo que este caso decide, y lo que NO.** Que un fondo no traiga fecha de
	 * resultados lo decide el endpoint, y lo fija su propia prueba —ahí se le manda
	 * una fecha a propósito y tiene que devolver `null`—. Aquí eso sería casi una
	 * tautología: comprobar que un `{#if}` con `null` no pinta.
	 *
	 * Lo que sí decide este caso es que **la ausencia de resultados no vacía la
	 * sección entera**: el dividendo sigue enseñándose. Es el fallo que tendría un
	 * `{#if}` puesto un nivel más arriba de la cuenta, y le pasa al 90 % de una
	 * cartera indexada.
	 */
	it('un fondo sin resultados sigue enseñando su dividendo', async () => {
		store.transactions = [];
		store.fundamentals = {
			'0P0001XF40.F': { disponible: true, proximosResultados: null, rentabilidadPorDividendo: 0.014 }
		};
		const container = await pintar(FONDO);

		expect(container.textContent).toContain('Rentabilidad por dividendo');
		expect(container.textContent).toContain('1,4');
		expect(container.textContent).not.toContain('Próximos resultados');
	});

	it('una acción con fecha de resultados la enseña y la marca como aproximada', async () => {
		store.transactions = [];
		store.fundamentals = {
			AAPL: {
				disponible: true,
				proximosResultados: new Date(2026, 9, 28).getTime(),
				resultadosEsAproximado: true
			}
		};
		const container = await pintar(ACCION);

		expect(container.textContent).toContain('Próximos resultados');
		expect(container.textContent).toContain('aproximada');
	});

	/**
	 * Los activos que solo existen en FT no están en la fuente de fundamentales.
	 * Tienen que degradar diciéndolo, no quedarse en «Buscando…» para siempre.
	 */
	it('un activo sin datos disponibles lo dice', async () => {
		store.transactions = [];
		store.fundamentals = { '0P0001XF40.F': { disponible: false } };
		const container = await pintar(FONDO);

		expect(container.textContent).toContain('No tenemos estos datos');
	});

	it('pide los fundamentales al abrirse', async () => {
		store.asegurarFundamentales.mockClear();
		store.transactions = [];
		await pintar(FONDO);
		expect(store.asegurarFundamentales).toHaveBeenCalledTimes(1);
	});
});
