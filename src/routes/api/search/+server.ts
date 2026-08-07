import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { yahooFinance } from '$lib/server/yahoo';
import { checkRateLimit } from '$lib/server/rateLimit';
import { searchFtAssets } from '$lib/ft-assets';

// --- Rate Limiting ---
const SEARCH_RATE_LIMIT = 20;   // max requests
const SEARCH_RATE_WINDOW_SECS = 60; // por minuto
const MAX_QUERY_LENGTH = 100;

export interface SearchResult {
	ticker: string;
	name: string;
	type: string; // 'ETF', 'EQUITY', 'MUTUALFUND', 'CRYPTOCURRENCY', etc.
	exchange: string;
	currency?: string;
}

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	// --- Protección: Rate Limit ---
	let clientIp = 'unknown';
	try {
		clientIp = getClientAddress();
	} catch (e) {
		clientIp = '127.0.0.1';
	}
	const allowed = await checkRateLimit(clientIp, {
		limit: SEARCH_RATE_LIMIT,
		windowSeconds: SEARCH_RATE_WINDOW_SECS,
		prefix: 'search'
	});
	if (!allowed) {
		return json({ results: [], error: 'Demasiadas búsquedas. Inténtalo en un minuto.' }, { status: 429 });
	}

	const query = url.searchParams.get('q');
	if (!query || query.trim().length < 2) {
		return json({ results: [] });
	}

	// --- Protección: Limitar longitud de la query ---
	if (query.length > MAX_QUERY_LENGTH) {
		return json({ results: [], error: 'Búsqueda demasiado larga.' }, { status: 400 });
	}

	try {
		const searchResults = await yahooFinance.search(query.trim(), {
			quotesCount: 12,
			newsCount: 0
		});

		const results: SearchResult[] = (searchResults.quotes || [])
			.filter((q: any) => {
				// Solo activos cotizados, no índices sin ticker
				return q.symbol && q.isYahooFinance !== false;
			})
			.map((q: any) => ({
				ticker: q.symbol,
				name: q.longname || q.shortname || q.symbol,
				type: mapQuoteType(q.quoteType || q.typeDisp || ''),
				exchange: q.exchDisp || q.exchange || '',
				currency: q.currency || undefined
			}));

		/**
		 * Inyectar los activos que sólo existen en Financial Times.
		 *
		 * ⚠️ Esto llevaba el ISIN y el nombre del fondo **escritos a mano aquí**, y era
		 * una de cuatro copias del mismo dato: `src/lib/ft-assets.ts` es el registro que
		 * debía gobernarlo, `/api/resolve` tenía la suya, y `priceHelpers.ts` llevaba
		 * una cuarta en un `PURE_FT_TICKERS` que no leía nadie. Cuatro sitios para un
		 * fondo, y aun así el precio no funcionaba, porque el único que de verdad
		 * importaba —`/api/prices`— era justo el que no tenía copia. Ahora todos leen el
		 * registro, y añadir un fondo vuelve a ser lo que su documentación prometía:
		 * una entrada, en un solo sitio.
		 */
		const consulta = query.trim().toUpperCase();
		for (const activo of searchFtAssets(query)) {
			if (results.some((r) => r.ticker === activo.isin)) continue;
			const entrada: SearchResult = {
				ticker: activo.isin,
				name: activo.name,
				type: activo.type,
				exchange: 'Financial Times',
				currency: activo.currency
			};
			/**
			 * Sólo encabeza la lista quien busca el ISIN, que es una señal inequívoca.
			 * Por nombre va al final: es un fondo boutique y quien escribe «world» busca
			 * casi siempre un indexado global. Encabezar por coincidencia de nombre lo
			 * pondría por delante de doce resultados más probables.
			 */
			if (activo.isin === consulta) results.unshift(entrada);
			else results.push(entrada);
		}

		return json({ results }, {
			headers: { 'Cache-Control': 'public, max-age=300' }
		});
	} catch (error: any) {
		console.error('Yahoo search error:', error);
		return json(
			{ results: [], error: error.message || 'Error de búsqueda' },
			{ status: 500 }
		);
	}
};

function mapQuoteType(raw: string): string {
	const upper = raw.toUpperCase();
	if (upper.includes('ETF')) return 'ETF';
	if (upper.includes('EQUITY') || upper.includes('STOCK')) return 'Acción';
	if (upper.includes('MUTUALFUND') || upper.includes('FUND')) return 'Fondo';
	if (upper.includes('CRYPT')) return 'Crypto';
	if (upper.includes('FUTURE')) return 'Futuro';
	if (upper.includes('INDEX')) return 'Índice';
	if (upper.includes('CURRENCY')) return 'Divisa';
	return raw || 'Otro';
}
