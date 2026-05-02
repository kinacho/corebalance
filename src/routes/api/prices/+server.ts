import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';
import { PORTFOLIO_ASSETS, SATELLITE_ASSETS, STOCK_ASSETS } from '$lib/constants';
import type { PricesResponse, PriceData } from '$lib/types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
			return { ticker, quote };
		})
	);

	for (const result of results) {
		if (result.status === 'fulfilled') {
			const { ticker, quote } = result.value;
			prices[ticker] = {
				price: quote.regularMarketPrice ?? 0,
				currency: quote.currency ?? 'EUR',
				name: quote.shortName ?? quote.longName ?? ticker,
				change: quote.regularMarketChangePercent ?? 0
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
