import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';
import { PORTFOLIO_ASSETS, SATELLITE_ASSETS, STOCK_ASSETS } from '$lib/constants';
import type { PricesResponse, PriceData } from '$lib/types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const historyCache: Record<string, { timestamp: number, data: number[] }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 horas

export const GET: RequestHandler = async () => {
	const tickers = [
		...PORTFOLIO_ASSETS.map((a) => a.ticker), 
		...SATELLITE_ASSETS.map((a) => a.ticker), 
		...STOCK_ASSETS.map((a) => a.ticker),
		'BTC-EUR',
		'EURUSD=X',
		'EURCAD=X'
	];
	const errors: string[] = [];
	const prices: Record<string, PriceData> = {};

	const results = await Promise.allSettled(
		tickers.map(async (ticker) => {
			const quote = await yahooFinance.quote(ticker);
			
			// Cache de 4 horas para el histórico
			let sparkline: number[] = [];
			const now = Date.now();
			if (historyCache[ticker] && (now - historyCache[ticker].timestamp < CACHE_TTL)) {
				sparkline = historyCache[ticker].data;
			} else {
				try {
					const queryOptions = { period1: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), interval: '1d' as const };
					const chart = await yahooFinance.chart(ticker, queryOptions);
					// Coger los últimos 7 días de mercado
					sparkline = chart.quotes.slice(-7).map(q => q.close).filter(v => v !== null) as number[];
					historyCache[ticker] = { timestamp: now, data: sparkline };
				} catch (e) {
					console.error(`Error fetching history for ${ticker}:`, e);
					sparkline = historyCache[ticker]?.data || [];
				}
			}

			return { ticker, quote, sparkline };
		})
	);

	for (const result of results) {
		if (result.status === 'fulfilled') {
			const { ticker, quote, sparkline } = result.value;
			prices[ticker] = {
				price: quote.regularMarketPrice ?? 0,
				currency: quote.currency ?? 'EUR',
				name: quote.shortName ?? quote.longName ?? ticker,
				change: quote.regularMarketChangePercent ?? 0,
				sparkline
			};
		} else {
			const errorMsg = result.reason?.message ?? 'Error desconocido';
			errors.push(errorMsg);
		}
	}

	const response: PricesResponse = {
		prices,
		timestamp: new Date().toISOString(),
		errors
	};

	return json(response, {
		headers: {
			'Cache-Control': 'public, max-age=60'
		}
	});
};
