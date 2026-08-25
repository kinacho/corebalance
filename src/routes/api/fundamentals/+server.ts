import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redis } from '$lib/server/redis';
import { yahooFinance } from '$lib/server/yahoo';
import { checkRateLimit } from '$lib/server/rateLimit';
import { isFtOnlyAsset } from '$lib/ft-assets';
import type { FundamentalsResponse, FundamentalData } from '$lib/types';

/**
 * Dividendos y próxima fecha de resultados.
 *
 * ⚠️ **Todo esto ya llegaba y se tiraba.** `/api/prices` se queda con nueve campos
 * de la respuesta de `quote()` y descarta el resto, entre ellos
 * `earningsTimestamp`, `dividendYield` y `dividendDate`. Así que esto no añade ni
 * una petición a Yahoo por dato nuevo: es la misma llamada en bloque, con los
 * mismos tickers, conservando lo que antes se perdía.
 *
 * ⚠️ **Y por eso mismo NO va dentro de `/api/prices`, que sería lo cómodo.** Esa
 * respuesta se pide **cada 30 segundos**; esto cambia una vez al trimestre. Meterlo
 * ahí repite exactamente el error que `priceHelpers.ts` documenta haber corregido
 * con el sparkline —«megabytes por hora de un dato que no se mueve durante la
 * sesión»—. De ahí que sea un endpoint propio, con su **bucket de rate limit
 * independiente** (no compite con los 30/min de precios) y una caché de **24 h**
 * en vez de las 4 del histórico.
 */

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 horas
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;
const RATE_LIMIT = 10;
const RATE_WINDOW = 60;
const MAX_TICKERS = 50;
const TICKER_REGEX = /^[A-Za-z0-9._=\-]{1,25}$/;

/** Igual que en precios: sin Upstash esto es una caché de proceso, o sea ninguna en serverless. */
const memoria: Record<string, { timestamp: number; data: FundamentalData }> = {};

async function leerCache(ticker: string): Promise<FundamentalData | null> {
	try {
		if (redis) return ((await redis.get(`fundamentals_v1:${ticker}`)) as FundamentalData) ?? null;
	} catch (e) {
		/* Se cae al fallback de memoria. */
	}
	const local = memoria[ticker];
	if (local && Date.now() - local.timestamp < CACHE_TTL_MS) return local.data;
	return null;
}

async function escribirCache(ticker: string, data: FundamentalData) {
	memoria[ticker] = { timestamp: Date.now(), data };
	try {
		if (redis) await redis.set(`fundamentals_v1:${ticker}`, data, { ex: CACHE_TTL_SECONDS });
	} catch (e) {
		/* La copia en memoria ya está escrita. */
	}
}

/**
 * Convierte un instante de Yahoo a milisegundos.
 *
 * ⚠️ La librería tipa estos campos como `Date`, pero según el símbolo y el módulo
 * llegan como segundos Unix. Se acepta cualquiera de las dos formas en vez de
 * confiar en el tipo: equivocarse aquí no da un error, da una fecha de 1970 en
 * pantalla.
 */
function aMilisegundos(valor: unknown): number | null {
	if (valor instanceof Date) {
		const ms = valor.getTime();
		return Number.isFinite(ms) ? ms : null;
	}
	if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) {
		// Por debajo de ~2001 en milisegundos es, con seguridad, segundos.
		return valor < 1e11 ? valor * 1000 : valor;
	}
	return null;
}

/** `dividendYield` llega a veces en tanto por ciento y a veces en tanto por uno. */
function aFraccion(valor: unknown): number | null {
	if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return null;
	return valor > 1 ? valor / 100 : valor;
}

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	let clientIp = 'unknown';
	try {
		clientIp = getClientAddress();
	} catch (e) {
		clientIp = '127.0.0.1';
	}
	const allowed = await checkRateLimit(clientIp, {
		limit: RATE_LIMIT,
		windowSeconds: RATE_WINDOW,
		prefix: 'fundamentals'
	});
	if (!allowed) {
		return json({ fundamentals: {}, error: 'Demasiadas peticiones.' }, { status: 429 });
	}

	const crudos = (url.searchParams.get('tickers') || '')
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);

	const tickers = [...new Set(crudos)].filter((t) => TICKER_REGEX.test(t)).slice(0, MAX_TICKERS);
	if (tickers.length === 0) return json({ fundamentals: {} } satisfies FundamentalsResponse);

	const fundamentals: Record<string, FundamentalData> = {};
	const pendientes: string[] = [];

	for (const ticker of tickers) {
		/*
		 * ⚠️ Los activos que solo existen en FT no están en Yahoo, así que aquí no
		 * hay nada que pedir. Degradan a «no disponible» a propósito: montarles un
		 * scraper nuevo sería añadir modos de fallo al único camino que valora esas
		 * posiciones, que además no tiene ningún fallback por debajo.
		 */
		if (isFtOnlyAsset(ticker)) {
			fundamentals[ticker] = { disponible: false };
			continue;
		}
		const cacheado = await leerCache(ticker);
		if (cacheado) fundamentals[ticker] = cacheado;
		else pendientes.push(ticker);
	}

	if (pendientes.length > 0) {
		try {
			// Una sola petición para todos: `quote()` es en bloque.
			const respuesta = await yahooFinance.quote(pendientes);
			const lista = Array.isArray(respuesta) ? respuesta : [respuesta];

			for (const q of lista as any[]) {
				if (!q?.symbol) continue;
				const esAccion = q.quoteType === 'EQUITY';
				const dato: FundamentalData = {
					disponible: true,
					/*
					 * ⚠️ Solo las acciones presentan resultados. Un fondo o un ETF no
					 * tienen, así que el campo se queda a `null` y la interfaz no dibuja
					 * esa sección — no es un dato que falte, es una pregunta que no
					 * aplica.
					 */
					proximosResultados: esAccion ? aMilisegundos(q.earningsTimestampStart ?? q.earningsTimestamp) : null,
					/** Yahoo declara ±2 días de error en esa fecha; la interfaz lo rotula. */
					resultadosEsAproximado: esAccion ? q.isEarningsDateEstimate !== false : false,
					dividendoAnual: typeof q.dividendRate === 'number' ? q.dividendRate : (typeof q.trailingAnnualDividendRate === 'number' ? q.trailingAnnualDividendRate : null),
					rentabilidadPorDividendo: aFraccion(q.dividendYield ?? q.trailingAnnualDividendYield),
					ultimoDividendo: aMilisegundos(q.dividendDate),
					rentabilidadTresMeses:
						typeof q.trailingThreeMonthReturns === 'number' ? q.trailingThreeMonthReturns : null
				};
				fundamentals[q.symbol] = dato;
				await escribirCache(q.symbol, dato);
			}
		} catch (e) {
			console.error('Fundamentals fetch error:', e);
		}

		// Lo que Yahoo no devolvió queda explícitamente como no disponible.
		for (const ticker of pendientes) {
			if (!fundamentals[ticker]) fundamentals[ticker] = { disponible: false };
		}
	}

	return json({ fundamentals } satisfies FundamentalsResponse);
};
