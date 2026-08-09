import type { Page } from '@playwright/test';

/**
 * Sembrar una cartera en el navegador sin pasar por la interfaz.
 *
 * El dashboard carga de `localStorage` en `loadFromStorage()`, así que se puede dejar
 * una cartera puesta antes de que arranque la app. Es lo que permite probar estados
 * concretos —una cartera recién importada sin objetivos, dos fondos desviados— que por
 * la interfaz costarían veinte clics y un CSV.
 *
 * ⚠️ Y hay que **interceptar `/api/prices`**. Sin eso el store pisa los precios
 * sembrados con lo que devuelva Yahoo: tickers de fixture como `VWCE` no resuelven,
 * se quedan a 0 y las posiciones desaparecen del mapa por el filtro de valor. Lo vi
 * gastando media hora en creer que el mapa estaba roto. Se responde con los mismos
 * precios sembrados y el contrato real del endpoint (`{prices, timestamp, errors}`).
 */

export interface Activo {
	ticker: string;
	name: string;
	isin: string;
	targetWeight: number;
	color: string;
	icon: string;
	ter: number;
	category: 'core' | 'satellite' | 'stocks';
}

export interface Semilla {
	assets: {
		coreAssets: Activo[];
		satelliteAssets: Activo[];
		stockAssets: Activo[];
	};
	holdings: Record<string, { shares: number; avgCost: number; useLedger: boolean }>;
	prices: Record<string, unknown>;
}

const activo = (
	ticker: string,
	name: string,
	category: Activo['category'],
	targetWeight = 0
): Activo => ({
	ticker,
	name,
	isin: '',
	targetWeight,
	color: '#3b82f6',
	icon: '📈',
	ter: 0.002,
	category
});

const precio = (name: string, price: number) => ({
	price,
	currency: 'EUR',
	name,
	change: 0.3,
	fxRate: 1,
	marketState: 'CLOSED',
	// Fijo a propósito: `Date.now()` en un fixture hace que el test dependa del día.
	lastUpdate: 1785000000000
});

/**
 * La cartera recién importada de un CSV: **todo activo nace con `targetWeight: 0`**.
 * Es el primer mapa que ve casi cualquiera, y el estado que ningún test tocaba.
 */
export const SIN_OBJETIVOS: Semilla = {
	assets: {
		coreAssets: [
			activo('VWCE', 'Vanguard FTSE All-World UCITS ETF', 'core'),
			activo('SXR8', 'iShares Core S&P 500 UCITS ETF', 'core')
		],
		stockAssets: [activo('AAPL', 'Apple Inc', 'stocks'), activo('MSFT', 'Microsoft Corp', 'stocks')],
		satelliteAssets: [activo('CASH-DEP', 'Depósito remunerado', 'satellite')]
	},
	holdings: {
		VWCE: { shares: 80, avgCost: 100, useLedger: false },
		SXR8: { shares: 20, avgCost: 400, useLedger: false },
		AAPL: { shares: 12, avgCost: 150, useLedger: false },
		MSFT: { shares: 8, avgCost: 300, useLedger: false },
		'CASH-DEP': { shares: 900, avgCost: 1, useLedger: false }
	},
	prices: {
		VWCE: precio('Vanguard FTSE All-World UCITS ETF', 118),
		SXR8: precio('iShares Core S&P 500 UCITS ETF', 520),
		AAPL: precio('Apple Inc', 190),
		MSFT: precio('Microsoft Corp', 420),
		'CASH-DEP': precio('Depósito remunerado', 1)
	}
};

/** La misma cartera con objetivos en el core: el caso «medido», con escala divergente. */
export const CON_OBJETIVOS: Semilla = (() => {
	const copia = structuredClone(SIN_OBJETIVOS);
	copia.assets.coreAssets[0].targetWeight = 0.6;
	copia.assets.coreAssets[1].targetWeight = 0.2;
	return copia;
})();

/**
 * Dos **fondos** del core, uno muy por encima de su objetivo y otro por debajo.
 *
 * Tickers `0P…` a propósito: es como Yahoo identifica los fondos no cotizados y lo que
 * `resolveInstrumentType()` usa para clasificarlos como `fund`. Y solo un fondo puede
 * traspasarse sin tributar, así que sin esto el panel fiscal no propone ningún
 * traspaso y el spec no comprobaría nada.
 */
export const FONDOS_DESVIADOS: Semilla = {
	assets: {
		coreAssets: [
			activo('0P0001ABCD', 'Vanguard Global Stock Index Fund', 'core', 0.5),
			activo('0P0001EFGH', 'Vanguard Emerging Markets Index Fund', 'core', 0.5)
		],
		stockAssets: [],
		satelliteAssets: []
	},
	holdings: {
		'0P0001ABCD': { shares: 500, avgCost: 150, useLedger: false },
		'0P0001EFGH': { shares: 100, avgCost: 100, useLedger: false }
	},
	prices: {
		'0P0001ABCD': precio('Vanguard Global Stock Index Fund', 200),
		'0P0001EFGH': precio('Vanguard Emerging Markets Index Fund', 100)
	}
};

/** Deja la cartera puesta y los precios interceptados. Llamar **antes** de navegar. */
export async function sembrarCartera(page: Page, semilla: Semilla) {
	await page.route('**/api/prices**', (route) =>
		route.fulfill({
			json: { prices: semilla.prices, timestamp: '2026-08-06T00:00:00.000Z', errors: [] }
		})
	);

	await page.addInitScript((datos: Semilla) => {
		// El tour monta un overlay que intercepta todos los clics.
		localStorage.setItem('corebalance_tour_seen', 'true');
		localStorage.setItem('corebalance_user_assets', JSON.stringify(datos.assets));
		localStorage.setItem('corebalance_holdings_v2', JSON.stringify(datos.holdings));
		localStorage.setItem('corebalance_prices_cache', JSON.stringify(datos.prices));
		// Sin esto, la landing redirige y el splash se queda por medio.
		sessionStorage.setItem('bypassLanding', 'true');
	}, semilla);
}

/**
 * Errores de consola, filtrando el ruido conocido de `vite preview`.
 *
 * Los scripts de Vercel Analytics y Speed Insights no existen fuera de Vercel y
 * devuelven 404 con un MIME que el navegador rechaza. Es ruido del entorno, no de la
 * app; todo lo demás **sí** cuenta.
 */
export function recogerErrores(page: Page): string[] {
	const RUIDO = [/_vercel\/(insights|speed-insights)/, /404 \(Not Found\)/];
	const errores: string[] = [];
	page.on('console', (mensaje) => {
		if (mensaje.type() === 'error' && !RUIDO.some((r) => r.test(mensaje.text()))) {
			errores.push(mensaje.text());
		}
	});
	page.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`));
	return errores;
}

/**
 * Abre el dashboard y espera a que la app haya pintado datos.
 *
 * ⚠️ No se usa `page.waitForURL()` en ningún sitio de estos specs: espera un evento
 * `load` que una navegación de cliente de SvelteKit no dispara nunca, así que da
 * timeout aunque la URL haya cambiado. Se sondea el DOM, que es lo que importa.
 */
export async function abrirDashboard(page: Page) {
	await page.goto('/dashboard', { waitUntil: 'load' });
	await page.locator('.metric-card').first().waitFor({ state: 'visible' });
}

/**
 * Los dos paneles de mapa, **por estructura y no por su título**.
 *
 * Localizarlos por el texto del título los ataba al idioma con el que arrancara el
 * navegador, y cuando no casaba el error era un timeout de `toContainText` que apuntaba
 * a la aserción en vez de al localizador vacío. La clase `is-lookthrough` distingue los
 * dos carriles sin depender de una traducción.
 */
export const mapaDesviacion = (page: Page) => page.locator('.map-box:not(.is-lookthrough)').first();
export const mapaSubyacente = (page: Page) => page.locator('.map-box.is-lookthrough').first();

/**
 * Despliega los mapas del detalle.
 *
 * En escritorio nacen **plegados** detrás de una sola línea, y `display: none`
 * deja los dos paneles en el DOM pero sin caja: `toBeVisible()` y
 * `boundingBox()` fallan sobre ellos aunque el mapa esté perfectamente
 * construido. En móvil el plegado no existe —los mapas son carriles del
 * carrusel—, la cabecera no se dibuja y esto no hace nada.
 */
export async function abrirMapas(page: Page) {
	const cabecera = page.locator('.maps-fold-head');
	if (!(await cabecera.isVisible().catch(() => false))) return;
	if ((await page.locator('.maps-fold.is-open').count()) === 0) {
		await cabecera.click();
	}
	await page.locator('.maps-row').waitFor({ state: 'visible' });
}
