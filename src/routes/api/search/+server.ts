import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export interface SearchResult {
	ticker: string;
	name: string;
	type: string; // 'ETF', 'EQUITY', 'MUTUALFUND', 'CRYPTOCURRENCY', etc.
	exchange: string;
	currency?: string;
}

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	if (!query || query.trim().length < 2) {
		return json({ results: [] });
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
				name: q.shortname || q.longname || q.symbol,
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
