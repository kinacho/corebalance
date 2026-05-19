import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// --- Rate Limiting ---
const searchRateLimitMap = new Map<string, number[]>();
const SEARCH_RATE_LIMIT = 20;   // max requests
const SEARCH_RATE_WINDOW = 60_000; // por minuto
const MAX_QUERY_LENGTH = 100;

function checkSearchRateLimit(ip: string): boolean {
	const now = Date.now();
	const requests = searchRateLimitMap.get(ip) || [];
	const recent = requests.filter(t => now - t < SEARCH_RATE_WINDOW);
	if (recent.length >= SEARCH_RATE_LIMIT) return false;
	recent.push(now);
	searchRateLimitMap.set(ip, recent);
	if (searchRateLimitMap.size > 1000) {
		for (const [key, times] of searchRateLimitMap) {
			if (times.every(t => now - t > SEARCH_RATE_WINDOW)) searchRateLimitMap.delete(key);
		}
	}
	return true;
}

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
	if (!checkSearchRateLimit(clientIp)) {
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
