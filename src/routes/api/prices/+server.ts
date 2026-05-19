import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';
import type { PricesResponse, PriceData } from '$lib/types';
import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

const redis = (env.KV_REST_API_URL && env.KV_REST_API_TOKEN)
	? new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN })
	: null;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Fallback en memoria para desarrollo local si no hay KV configurado
const historyCache: Record<string, { timestamp: number, sparkline: number[], ytd?: number, mtd?: number, oneMonth?: number }> = {};
const CACHE_TTL_SECONDS = 60 * 60 * 4; // 4 horas
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

async function getCachedHistory(ticker: string) {
	try {
		return redis ? await redis.get(`price_history:${ticker}`) : historyCache[ticker];
	} catch (e) {
		return historyCache[ticker];
	}
}

async function setCachedHistory(ticker: string, data: any) {
	try {
		if (redis) {
			await redis.set(`price_history:${ticker}`, data, { ex: CACHE_TTL_SECONDS });
		} else {
			historyCache[ticker] = { ...data, timestamp: Date.now() };
		}
	} catch (e) {
		historyCache[ticker] = { ...data, timestamp: Date.now() };
	}
}

// Mapeo de tickers problemáticos en Yahoo a ISINs/Symbols de Financial Times para mayor fiabilidad
const RELIABLE_FT_MAPPINGS: Record<string, string> = {
	'0P0001XF40.F': 'IE000ZYRH0Q7', // BlackRock World
	'0P0001XF3Z.F': 'IE000QAZP7L2', // BlackRock EM
	'XS2940466316.SG': 'IB1T:FRA'   // BlackRock Bitcoin ETP (Frankfurt)
};

async function fetchFTPrice(isin: string): Promise<{ price: number, change: number, ytd?: number } | null> {
	try {
		const url = `https://markets.ft.com/data/funds/tearsheet/summary?s=${isin}:EUR`;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
		clearTimeout(timeout);
		if (!res.ok) return null;
		const html = await res.text();
		
		// Búsqueda del precio: aparece después de "Price (EUR)"
		const priceMatch = html.match(/Price \(EUR\).*?mod-ui-data-list__value">([\d,.]+)/s);
		// Búsqueda del cambio porcentual: aparece después de la barra "/"
		const changeMatch = html.match(/\/ ([\d,.-]+)%/);
		// Búsqueda del YTD: aparece en "Year to date"
		const ytdMatch = html.match(/Year to date.*?([\d,.-]+)%/s);
		
		if (priceMatch) {
			const price = parseFloat(priceMatch[1].replace(/,/g, ''));
			const change = changeMatch ? parseFloat(changeMatch[1]) : 0;
			const ytd = ytdMatch ? parseFloat(ytdMatch[1]) : undefined;
			if (price > 0) return { price, change, ytd };
		}
	} catch (e) {
		console.error(`Error fetching FT price for ${isin}:`, e);
	}
	return null;
}

// --- Rate Limiting ---
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 30;       // max requests
const RATE_WINDOW = 60_000;  // por minuto
const MAX_TICKERS = 50;
const TICKER_REGEX = /^[A-Za-z0-9._=\-]{1,25}$/;

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const requests = rateLimitMap.get(ip) || [];
	const recent = requests.filter(t => now - t < RATE_WINDOW);
	if (recent.length >= RATE_LIMIT) return false;
	recent.push(now);
	rateLimitMap.set(ip, recent);
	// Limpieza periódica para evitar memory leak
	if (rateLimitMap.size > 1000) {
		for (const [key, times] of rateLimitMap) {
			if (times.every(t => now - t > RATE_WINDOW)) rateLimitMap.delete(key);
		}
	}
	return true;
}

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	// --- Protección: Rate Limit ---
	let clientIp = 'unknown';
	try {
		clientIp = getClientAddress();
	} catch (e) {
		// Fallback silencioso si el adaptador no puede determinar la IP (ej. en dev local)
		clientIp = '127.0.0.1';
	}
	
	if (!checkRateLimit(clientIp)) {
		return json({ error: 'Demasiadas peticiones. Inténtalo en un minuto.' }, { status: 429 });
	}

	// Aceptar tickers dinámicos del usuario, o usar los de pares de divisas como mínimo
	const tickersParam = url.searchParams.get('tickers');
	
	// Siempre incluir pares de divisas para conversión
	const currencyPairs = ['BTC-EUR', 'EURUSD=X', 'EURCAD=X', 'EURGBP=X', 'EURCHF=X', 'EURAUD=X', 'EURJPY=X'];
	
	let userTickers: string[] = [];
	if (tickersParam) {
		userTickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);
	}

	// --- Protección: Limitar número de tickers ---
	if (userTickers.length > MAX_TICKERS) {
		return json({ error: `Máximo ${MAX_TICKERS} tickers por petición.` }, { status: 400 });
	}

	// --- Protección: Validar formato de tickers ---
	userTickers = userTickers.filter(t => TICKER_REGEX.test(t));
	
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
	const results: PromiseSettledResult<{ ticker: string, quote: any, sparkline: number[], ytd: number | undefined, mtd: number | undefined, oneMonth: number | undefined }>[] = [];

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		const chunkResults = await Promise.allSettled(
			chunk.map(async (ticker) => {
				const quote = quoteMap.get(ticker);
				if (!quote) throw new Error(`No se encontró cotización para ${ticker}`);

				let sparkline: number[] = [];
				let ytd: number | undefined = quote.ytdReturn;
				let mtd: number | undefined = undefined;
				let oneMonth: number | undefined = undefined;

				const cached = await getCachedHistory(ticker) as any;

				if (cached && (now - (cached.timestamp || 0) < CACHE_TTL_MS)) {
					sparkline = cached.sparkline;
					if (cached.ytd !== undefined) ytd = cached.ytd;
					mtd = cached.mtd;
					oneMonth = cached.oneMonth;
				} else {
					try {
						// Pedir desde el 20 de Dic del año anterior para asegurar que cogemos el último cierre
						// Usamos period2: new Date() para forzar que la URL sea única y evitar que Vercel devuelva
						// una respuesta cacheada antigua (ej. cuando antes pedíamos solo 7 días)
						const queryOptions = { period1: dec20PrevYear, period2: new Date(), interval: '1d' as const };
						const chart = await yahooFinance.chart(ticker, queryOptions);
						
						const validQuotes = chart.quotes.filter(q => q.close !== null);
						sparkline = validQuotes.slice(-30).map(q => q.close) as number[];
						
						// Calcular métricas
						if (validQuotes.length > 0) {
							const currentPrice = quote.regularMarketPrice || (validQuotes[validQuotes.length - 1].close as number);
							
							// 1. YTD
							const prevYearQuotes = validQuotes.filter(q => new Date(q.date) < startOfCurrentYear);
							if (prevYearQuotes.length > 0) {
								const lastYearClose = prevYearQuotes[prevYearQuotes.length - 1].close as number;
								if (lastYearClose > 0) ytd = ((currentPrice - lastYearClose) / lastYearClose) * 100;
							} else {
								const firstThisYear = validQuotes[0].close as number;
								if (firstThisYear > 0) ytd = ((currentPrice - firstThisYear) / firstThisYear) * 100;
							}

							// 2. MTD (Month To Date)
							const startOfCurrentMonth = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
							const prevMonthQuotes = validQuotes.filter(q => new Date(q.date) < startOfCurrentMonth);
							if (prevMonthQuotes.length > 0) {
								const lastMonthClose = prevMonthQuotes[prevMonthQuotes.length - 1].close as number;
								if (lastMonthClose > 0) mtd = ((currentPrice - lastMonthClose) / lastMonthClose) * 100;
							}

							// 3. 1M (Últimos 30 días naturales)
							const oneMonthAgo = new Date();
							oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
							const oneMonthQuotes = validQuotes.filter(q => new Date(q.date) < oneMonthAgo);
							if (oneMonthQuotes.length > 0) {
								const oneMonthClose = oneMonthQuotes[oneMonthQuotes.length - 1].close as number;
								if (oneMonthClose > 0) oneMonth = ((currentPrice - oneMonthClose) / oneMonthClose) * 100;
							} else if (validQuotes.length > 0) {
								// Fallback si no hay 30 días: usar el primer dato disponible
								const firstClose = validQuotes[0].close as number;
								if (firstClose > 0) oneMonth = ((currentPrice - firstClose) / firstClose) * 100;
							}
						}

						// Fallback especial para Cripto ETPs que suelen no tener histórico en Yahoo
						const isCryptoETP = ticker.includes('BTC') || ticker.includes('ETH') || ticker.includes('XS2940466316');
						if (ytd === undefined && isCryptoETP) {
							try {
								const baseSymbol = (ticker.includes('ETH')) ? 'ETH-EUR' : 'BTC-EUR';
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
						
						await setCachedHistory(ticker, { timestamp: now, sparkline, ytd, mtd, oneMonth });
					} catch (e) {
						console.error(`Error fetching history for ${ticker}:`, e);
						const fallback = await getCachedHistory(ticker) as any;
						sparkline = fallback?.sparkline || [];
						ytd = fallback?.ytd ?? ytd;
						mtd = fallback?.mtd;
						oneMonth = fallback?.oneMonth;
					}
				}

				return { ticker, quote, sparkline, ytd, mtd, oneMonth };
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
			let { ticker, quote, sparkline, ytd: yahooYtd, mtd, oneMonth } = result.value;
			let p = quote.regularMarketPrice;
			let change = quote.regularMarketChangePercent;
			let ytd = yahooYtd;
			let currency = quote.currency ?? 'EUR';

			// Corrección generalizada de divisas fraccionarias (ej: GBp = peniques, ZAc = centavos)
			const SUBUNIT_DIVISOR = 100;
			const KNOWN_SUBUNITS: Record<string, string> = {
				'GBp': 'GBP',
				'ZAc': 'ZAR',
				'IEp': 'EUR',
				'EUc': 'EUR',
				'USc': 'USD'
			};

			if (KNOWN_SUBUNITS[currency] || (currency.length === 3 && currency.endsWith('p'))) {
				const baseCurrency = KNOWN_SUBUNITS[currency] || (currency.substring(0, 2) + 'P');
				p = (p ?? 0) / SUBUNIT_DIVISOR;
				sparkline = sparkline.map(s => s / SUBUNIT_DIVISOR);
				currency = baseCurrency;
			}

			// Intentar obtener precio más actualizado de Financial Times para tickers problemáticos
			if (RELIABLE_FT_MAPPINGS[ticker]) {
				const ftData = await fetchFTPrice(RELIABLE_FT_MAPPINGS[ticker]);
				if (ftData) {
					p = ftData.price;
					change = ftData.change;
					// Si FT tiene YTD y Yahoo no, lo usamos
					if (ftData.ytd !== undefined && (ytd === undefined || isNaN(ytd))) {
						ytd = ftData.ytd;
					}
				}
			}

			const pc = quote.regularMarketPreviousClose;

			// Si Yahoo dice 0 o no lo da (y no lo hemos obtenido de FT), pero tenemos precio actual y anterior, lo calculamos nosotros
			if ((change === undefined || Math.abs(change) < 0.0001) && p && pc && Math.abs(p - pc) > 0.000001) {
				change = ((p - pc) / pc) * 100;
			}

			prices[ticker] = {
				price: p ?? 0,
				currency: currency,
				name: quote.shortName ?? quote.longName ?? ticker,
				change: change ?? 0,
				sparkline,
				marketState: quote.marketState,
				lastUpdate: quote.regularMarketTime ? new Date(quote.regularMarketTime).getTime() : undefined,
				ytdChangePercent: ytd,
				mtdChangePercent: mtd,
				oneMonthChangePercent: oneMonth,
				ter: quote.netExpenseRatio !== undefined ? (quote.netExpenseRatio / 100) : undefined
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
