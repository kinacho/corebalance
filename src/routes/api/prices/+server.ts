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
	const currentYear = new Date().getFullYear();
	const startOfCurrentYear = new Date(Date.UTC(currentYear, 0, 1));
	const dec20PrevYear = new Date(Date.UTC(currentYear - 1, 11, 20));

	// Crear función auxiliar para procesar en lotes y evitar Rate Limits en Vercel
	const chunkArray = <T,>(arr: T[], size: number): T[][] => {
		return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
			arr.slice(i * size, i * size + size)
		);
	};

	const chunks = chunkArray(tickers, 3);
	const results: PromiseSettledResult<{ ticker: string, quote: any, sparkline: number[], ytd: number | undefined }>[] = [];

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		const chunkResults = await Promise.allSettled(
			chunk.map(async (ticker) => {
				const quote = quoteMap.get(ticker);
				if (!quote) throw new Error(`No se encontró cotización para ${ticker}`);

				let sparkline: number[] = [];
				let ytd: number | undefined = quote.ytdReturn;

				if (historyCache[ticker] && (now - historyCache[ticker].timestamp < CACHE_TTL)) {
					sparkline = historyCache[ticker].sparkline;
					if (historyCache[ticker].ytd !== undefined) {
						ytd = historyCache[ticker].ytd;
					} else if (ytd === undefined) {
						ytd = historyCache[ticker].ytd; // fallback
					}
				} else {
					try {
						// Pedir desde el 20 de Dic del año anterior para asegurar que cogemos el último cierre
						// Usamos period2: new Date() para forzar que la URL sea única y evitar que Vercel devuelva
						// una respuesta cacheada antigua (ej. cuando antes pedíamos solo 7 días)
						const queryOptions = { period1: dec20PrevYear, period2: new Date(), interval: '1d' as const };
						const chart = await yahooFinance.chart(ticker, queryOptions);
						
						const validQuotes = chart.quotes.filter(q => q.close !== null);
						sparkline = validQuotes.slice(-7).map(q => q.close) as number[];
						
						// Calcular YTD encontrando el último cierre del año anterior
						if (validQuotes.length > 0) {
							const prevYearQuotes = validQuotes.filter(q => new Date(q.date) < startOfCurrentYear);
							const currentPrice = quote.regularMarketPrice || (validQuotes[validQuotes.length - 1].close as number);
							
							if (prevYearQuotes.length > 0) {
								const lastYearClose = prevYearQuotes[prevYearQuotes.length - 1].close as number;
								if (lastYearClose > 0) {
									ytd = ((currentPrice - lastYearClose) / lastYearClose) * 100;
								}
							} else {
								// Si es un activo nuevo este año, usar el primer precio disponible
								const firstThisYear = validQuotes[0].close as number;
								if (firstThisYear > 0) {
									ytd = ((currentPrice - firstThisYear) / firstThisYear) * 100;
								}
							}
						}

						// Fallback especial para Bitcoin ETPs que no tienen histórico en Yahoo
						if (ytd === undefined && (ticker.includes('XS2940466316') || ticker.includes('BTC'))) {
							try {
								const btcChart = await yahooFinance.chart('BTC-EUR', { period1: dec20PrevYear, period2: new Date(), interval: '1d' });
								const btcQuotes = btcChart.quotes.filter(q => q.close !== null);
								const btcPrevYearQuotes = btcQuotes.filter(q => new Date(q.date) < startOfCurrentYear);
								if (btcPrevYearQuotes.length > 0) {
									const lastYearClose = btcPrevYearQuotes[btcPrevYearQuotes.length - 1].close as number;
									const currentPrice = btcQuotes[btcQuotes.length - 1].close as number;
									if (lastYearClose > 0) {
										ytd = ((currentPrice - lastYearClose) / lastYearClose) * 100;
									}
								}
							} catch (btcError) {
								console.error("Error fetching BTC fallback YTD:", btcError);
							}
						}
						
						historyCache[ticker] = { timestamp: now, sparkline, ytd };
					} catch (e) {
						console.error(`Error fetching history for ${ticker}:`, e);
						sparkline = historyCache[ticker]?.sparkline || [];
						ytd = historyCache[ticker]?.ytd ?? ytd;
					}
				}

				return { ticker, quote, sparkline, ytd };
			})
		);
		
		results.push(...chunkResults);
		
		// Añadir un pequeño retraso entre lotes (excepto el último) para evitar rate limits
		if (i < chunks.length - 1) {
			await new Promise(resolve => setTimeout(resolve, 250));
		}
	}

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
