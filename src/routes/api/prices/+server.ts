import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';
import type { PricesResponse, PriceData } from '$lib/types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const historyCache: Record<string, { timestamp: number, sparkline: number[], ytd?: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 horas

// Mapeo de tickers problemáticos en Yahoo a ISINs/Symbols de Financial Times para mayor fiabilidad
const RELIABLE_FT_MAPPINGS: Record<string, string> = {
	'0P0001XF40.F': 'IE000ZYRH0Q7', // BlackRock World
	'0P0001XF3Z.F': 'IE000QAZP7L2', // BlackRock EM
	'XS2940466316.SG': 'IB1T:FRA'   // BlackRock Bitcoin ETP (Frankfurt)
};

async function fetchFTPrice(isin: string): Promise<{ price: number, change: number } | null> {
	try {
		const url = `https://markets.ft.com/data/funds/tearsheet/summary?s=${isin}:EUR`;
		const res = await fetch(url, { cache: 'no-store' });
		if (!res.ok) return null;
		const html = await res.text();
		
		// Búsqueda del precio: aparece después de "Price (EUR)"
		const priceMatch = html.match(/Price \(EUR\).*?mod-ui-data-list__value">[\d,.]+/s);
		// Búsqueda del cambio porcentual: aparece después de la barra "/"
		const changeMatch = html.match(/\/ ([\d,.-]+)%/);
		
		if (priceMatch) {
			const valueMatch = priceMatch[0].match(/([\d,.]+)$/);
			const price = valueMatch ? parseFloat(valueMatch[1].replace(/,/g, '')) : 0;
			const change = changeMatch ? parseFloat(changeMatch[1]) : 0;
			if (price > 0) return { price, change };
		}
	} catch (e) {
		console.error(`Error fetching FT price for ${isin}:`, e);
	}
	return null;
}

export const GET: RequestHandler = async ({ url }) => {
	// Aceptar tickers dinámicos del usuario, o usar los de pares de divisas como mínimo
	const tickersParam = url.searchParams.get('tickers');
	
	// Siempre incluir pares de divisas para conversión
	const currencyPairs = ['BTC-EUR', 'EURUSD=X', 'EURCAD=X'];
	
	let userTickers: string[] = [];
	if (tickersParam) {
		userTickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);
	}
	
	// Combinar tickers del usuario con pares de divisas (sin duplicados)
	const tickers = [...new Set([...userTickers, ...currencyPairs])];
	
	if (tickers.length === 0) {
		return json({ prices: {}, timestamp: new Date().toISOString(), errors: [] });
	}

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
						sparkline = validQuotes.slice(-30).map(q => q.close) as number[];
						
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

						// Fallback especial para Cripto ETPs que suelen no tener histórico en Yahoo
						if (ytd === undefined && (ticker.includes('BTC') || ticker.includes('ETH'))) {
							try {
								const baseSymbol = ticker.includes('ETH') ? 'ETH-EUR' : 'BTC-EUR';
								const cryptoChart = await yahooFinance.chart(baseSymbol, { period1: dec20PrevYear, period2: new Date(), interval: '1d' });
								const cryptoQuotes = cryptoChart.quotes.filter(q => q.close !== null);
								const cryptoPrevYearQuotes = cryptoQuotes.filter(q => new Date(q.date) < startOfCurrentYear);
								
								if (cryptoPrevYearQuotes.length > 0) {
									const lastYearClose = cryptoPrevYearQuotes[cryptoPrevYearQuotes.length - 1].close as number;
									const currentPrice = cryptoQuotes[cryptoQuotes.length - 1].close as number;
									if (lastYearClose > 0) {
										ytd = ((currentPrice - lastYearClose) / lastYearClose) * 100;
									}
								}
							} catch (cryptoError) {
								console.error(`Error fetching crypto fallback YTD for ${ticker}:`, cryptoError);
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
			let p = quote.regularMarketPrice;
			let change = quote.regularMarketChangePercent;

			// Intentar obtener precio más actualizado de Financial Times para tickers problemáticos
			if (RELIABLE_FT_MAPPINGS[ticker]) {
				const ftData = await fetchFTPrice(RELIABLE_FT_MAPPINGS[ticker]);
				if (ftData) {
					p = ftData.price;
					change = ftData.change;
				}
			}

			const pc = quote.regularMarketPreviousClose;

			// Si Yahoo dice 0 o no lo da (y no lo hemos obtenido de FT), pero tenemos precio actual y anterior, lo calculamos nosotros
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
			'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		}
	});
};
