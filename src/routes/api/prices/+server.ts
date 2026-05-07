import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';
import { PORTFOLIO_ASSETS, SATELLITE_ASSETS, STOCK_ASSETS } from '$lib/constants';
import type { PricesResponse, PriceData } from '$lib/types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const historyCache: Record<string, { timestamp: number, sparkline: number[], ytd?: number }> = {};
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

	// 1. Obtener todas las cotizaciones de golpe (Bulk fetch) para mejorar rendimiento
	let quotesResult: any[] = [];
	try {
		quotesResult = await yahooFinance.quote(tickers);
	} catch (error: any) {
		console.error("Error en bulk quote:", error);
		errors.push("Error general obteniendo cotizaciones: " + error.message);
		return json({ prices, timestamp: new Date().toISOString(), errors }, { status: 500 });
	}

	// Crear un mapa de cotizaciones para acceso rápido
	const quoteMap = new Map(quotesResult.map(q => [q.symbol, q]));

	// 2. Obtener los históricos (sparklines y YTD) usando caché individual
	const now = Date.now();
	const startOfYear = new Date(new Date().getFullYear(), 0, 1);

	const results = await Promise.allSettled(
		tickers.map(async (ticker) => {
			const quote = quoteMap.get(ticker);
			if (!quote) throw new Error(`No se encontró cotización para ${ticker}`);

			let sparkline: number[] = [];
			let ytd: number | undefined = quote.ytdReturn;

			if (historyCache[ticker] && (now - historyCache[ticker].timestamp < CACHE_TTL)) {
				sparkline = historyCache[ticker].sparkline;
				if (ytd === undefined) ytd = historyCache[ticker].ytd;
			} else {
				try {
					// Pedir desde el inicio del año para calcular YTD
					const queryOptions = { period1: startOfYear, interval: '1d' as const };
					const chart = await yahooFinance.chart(ticker, queryOptions);
					
					const validQuotes = chart.quotes.filter(q => q.close !== null);
					sparkline = validQuotes.slice(-7).map(q => q.close) as number[];
					
					// Calcular YTD si Yahoo no lo da (común en acciones)
					if (ytd === undefined && validQuotes.length > 0) {
						const firstPrice = validQuotes[0].close as number;
						const lastPrice = quote.regularMarketPrice || (validQuotes[validQuotes.length - 1].close as number);
						if (firstPrice > 0) {
							ytd = ((lastPrice - firstPrice) / firstPrice) * 100;
						}
					}

					// Fallback especial para Bitcoin ETPs que no tienen histórico en Yahoo
					if (ytd === undefined && (ticker.includes('XS2940466316') || ticker.includes('BTC'))) {
						try {
							const btcChart = await yahooFinance.chart('BTC-EUR', { period1: startOfYear, interval: '1d' });
							const btcQuotes = btcChart.quotes.filter(q => q.close !== null);
							if (btcQuotes.length > 0) {
								const first = btcQuotes[0].close as number;
								const last = btcQuotes[btcQuotes.length - 1].close as number;
								ytd = ((last - first) / first) * 100;
							}
						} catch (btcError) {
							console.error("Error fetching BTC fallback YTD:", btcError);
						}
					}
					
					historyCache[ticker] = { timestamp: now, sparkline, ytd };
				} catch (e) {
					console.error(`Error fetching history for ${ticker}:`, e);
					sparkline = historyCache[ticker]?.sparkline || [];
					ytd = ytd ?? historyCache[ticker]?.ytd;
				}
			}

			return { ticker, quote, sparkline, ytd };
		})
	);

	for (const result of results) {
		if (result.status === 'fulfilled') {
			const { ticker, quote, sparkline, ytd } = result.value;
			// Calcular cambio diario: usar el proporcionado por Yahoo o calcularlo manualmente si falta
			let change = quote.regularMarketChangePercent;
			const p = quote.regularMarketPrice;
			const pc = quote.regularMarketPreviousClose;

			// Si Yahoo dice 0 o no lo da, pero tenemos precio actual y anterior, lo calculamos nosotros
			if ((change === undefined || Math.abs(change) < 0.0001) && p && pc && Math.abs(p - pc) > 0.000001) {
				change = ((p - pc) / pc) * 100;
			}

			prices[ticker] = {
				price: p ?? 0,
				currency: quote.currency ?? 'EUR',
				name: quote.shortName ?? quote.longName ?? ticker,
				change: change ?? 0,
				sparkline,
				marketState: quote.marketState,
				lastUpdate: quote.regularMarketTime ? new Date(quote.regularMarketTime).getTime() : undefined,
				ytdChangePercent: ytd
			};
		} else {
			errors.push(result.reason?.message ?? 'Error desconocido');
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
