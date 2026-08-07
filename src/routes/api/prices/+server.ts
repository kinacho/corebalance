import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { PricesResponse, PriceData } from '$lib/types';
import { redis } from '$lib/server/redis';
import { yahooFinance } from '$lib/server/yahoo';
import { checkRateLimit } from '$lib/server/rateLimit';

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

import {
	RELIABLE_FT_MAPPINGS,
	fetchFTPrice,
	correctSubunitCurrencies,
	calculateHistoricalMetrics
} from './priceHelpers';
import { FT_ONLY_ASSETS, isFtOnlyAsset } from '$lib/ft-assets';

// --- Rate Limiting ---
const RATE_LIMIT = 30;       // max requests
const RATE_WINDOW = 60;      // segundos (1 minuto)
const MAX_TICKERS = 50;
const TICKER_REGEX = /^[A-Za-z0-9._=\-]{1,25}$/;

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	// --- Protección: Rate Limit ---
	let clientIp = 'unknown';
	try {
		clientIp = getClientAddress();
	} catch (e) {
		// Fallback silencioso si el adaptador no puede determinar la IP (ej. en dev local)
		clientIp = '127.0.0.1';
	}
	
	const allowed = await checkRateLimit(clientIp, {
		limit: RATE_LIMIT,
		windowSeconds: RATE_WINDOW,
		prefix: 'prices'
	});
	if (!allowed) {
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

	// 1. Filtrar tickers manuales (CASH-*)
	const realTickers = tickers.filter(t => !t.startsWith('CASH-'));
	const cashTickers = tickers.filter(t => t.startsWith('CASH-'));
// Pre-llenar resultados para tickers manuales
for (const t of cashTickers) {
	prices[t] = {
		price: 1.0,
		currency: 'EUR',
		name: t,
		change: 0 as number,
		lastUpdate: Date.now()
	};
}

	if (realTickers.length === 0) {
		return json({ prices, timestamp: new Date().toISOString(), errors });
	}

	/**
	 * Fondos que **sólo existen en Financial Times**, con el ISIN haciendo de ticker.
	 *
	 * ⚠️ Este bloque faltaba, y su ausencia dejaba la función rota a medias de la peor
	 * manera: `/api/search` y `/api/resolve` ya sabían encontrar estos ISIN, así que el
	 * usuario podía buscarlos, resolverlos y meterlos en su cartera — y entonces el
	 * precio se le pedía a Yahoo, que no los tiene, y el activo se quedaba sin valorar.
	 * Poder añadir algo que la app no sabe valorar es peor que no poder añadirlo.
	 *
	 * Se resuelven **antes** del bulk y salen de esa lista: preguntarle a Yahoo por
	 * ellos sólo puede gastar una petición y devolver un error.
	 *
	 * ⚠️ Sin red de seguridad, y conviene saberlo: los de `RELIABLE_FT_MAPPINGS` caen a
	 * Yahoo si FT cambia su maquetación; éstos no tienen debajo a nadie. Si el scraper
	 * deja de casar, aquí sale un error visible en `errors` —que es lo que corresponde—
	 * en vez de un activo que desaparece en silencio.
	 */
	const ftOnlyTickers = realTickers.filter((t) => isFtOnlyAsset(t));
	if (ftOnlyTickers.length > 0) {
		const resultadosFt = await Promise.all(
			ftOnlyTickers.map(async (ticker) => ({
				ticker,
				datos: await fetchFTPrice(ticker.toUpperCase())
			}))
		);
		for (const { ticker, datos } of resultadosFt) {
			const entrada = FT_ONLY_ASSETS[ticker.toUpperCase()];
			if (!datos) {
				errors.push(
					`No se pudo obtener el precio de ${ticker} (${entrada.name}) en Financial Times.`
				);
				continue;
			}
			prices[ticker] = {
				price: datos.price,
				currency: entrada.currency,
				name: entrada.name,
				change: datos.change,
				lastUpdate: Date.now()
			};
		}
	}

	const tickersParaYahoo = realTickers.filter((t) => !isFtOnlyAsset(t));

	if (tickersParaYahoo.length === 0) {
		return json({ prices, timestamp: new Date().toISOString(), errors });
	}

	// 1. Obtener todas las cotizaciones de golpe (Bulk fetch) para mejorar rendimiento
	let quotesResult: any[] = [];
	try {
		quotesResult = await yahooFinance.quote(tickersParaYahoo);
	} catch (error: any) {
		console.error("Error en bulk quote:", error);
		errors.push("Error general obteniendo cotizaciones: " + error.message);
		return json({ prices, timestamp: new Date().toISOString(), errors }, { status: 500 });
	}

	// Crear un mapa de cotizaciones para acceso rápido
	const quoteMap = new Map(quotesResult.map((q: any) => [q.symbol, q]));

	// 2. Obtener los históricos (sparklines y YTD) usando caché individual
	const now = Date.now();
	const currentYear = new Date().getFullYear();
	const startOfCurrentYear = new Date(Date.UTC(currentYear, 0, 1));
	const dec20PrevYear = new Date(Date.UTC(currentYear - 1, 11, 20));

	// Pre-verificar caché en paralelo para todos los tickers
	const cacheCheckResults = await Promise.all(
		tickersParaYahoo.map(async (ticker) => {
			const cached = await getCachedHistory(ticker) as any;
			if (cached && (now - (cached.timestamp || 0) < CACHE_TTL_MS)) {
				return { ticker, cached, isMiss: false };
			}
			return { ticker, isMiss: true };
		})
	);

	const missTickers = cacheCheckResults.filter(r => r.isMiss).map(r => r.ticker);
	const hitResults = cacheCheckResults.filter(r => !r.isMiss).map(r => ({
		ticker: r.ticker,
		quote: quoteMap.get(r.ticker),
		sparkline: r.cached.sparkline,
		ytd: r.cached.ytd,
		mtd: r.cached.mtd,
		oneMonth: r.cached.oneMonth
	}));

	// Crear función auxiliar para procesar en lotes y evitar Rate Limits en Vercel
	const chunkArray = <T,>(arr: T[], size: number): T[][] => {
		return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
			arr.slice(i * size, i * size + size)
		);
	};

	const chunks = chunkArray(missTickers, 3);
	const results: PromiseSettledResult<{ ticker: string, quote: any, sparkline: number[], ytd: number | undefined, mtd: number | undefined, oneMonth: number | undefined }>[] = [];

	/**
	 * Añadir los hits de caché ya formateados como fulfilled.
	 *
	 * ⚠️ Un ticker sin cotización tiene que **fallar igual aquí que en el camino de
	 * caché fría**, y antes no lo hacía: este bucle era `if (hit.quote) push(...)`,
	 * sin `else`. Así que cuando Yahoo dejaba de devolver un símbolo, el usuario veía
	 * el error «No se encontró cotización» o **no veía absolutamente nada** —ni precio
	 * ni error, el activo desaparecía de la respuesta— según si la caché de históricos
	 * estaba caliente, que es un estado que él no controla ni puede observar. El mismo
	 * fallo contándose de dos maneras según el azar es peor que cualquiera de las dos.
	 */
	for (const hit of hitResults) {
		if (hit.quote) {
			results.push({ status: 'fulfilled', value: hit });
		} else {
			results.push({
				status: 'rejected',
				reason: new Error(`No se encontró cotización para ${hit.ticker}`)
			});
		}
	}

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

				try {
					// Pedir desde el 20 de Dic del año anterior para asegurar que cogemos el último cierre
					// Usamos period2: new Date() para forzar que la URL sea única y evitar que Vercel devuelva
					// una respuesta cacheada antigua (ej. cuando antes pedíamos solo 7 días)
					const queryOptions = { period1: dec20PrevYear, period2: new Date(), interval: '1d' as const };
					const chart = await yahooFinance.chart(ticker, queryOptions);
					
					const validQuotes = chart.quotes.filter(q => q.close !== null);
					sparkline = validQuotes.slice(-30).map(q => q.close) as number[];
					
					// Calcular métricas usando helper
					if (validQuotes.length > 0) {
						const currentPrice = quote.regularMarketPrice || (validQuotes[validQuotes.length - 1].close as number);
						const metrics = calculateHistoricalMetrics(validQuotes, currentPrice, quote.ytdReturn);
						ytd = metrics.ytd;
						mtd = metrics.mtd;
						oneMonth = metrics.oneMonth;
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

				return { ticker, quote, sparkline, ytd, mtd, oneMonth };
			})
		);
		
		results.push(...chunkResults);
		
		// Añadir un pequeño retraso entre lotes (excepto el último) para evitar rate limits
		if (i < chunks.length - 1) {
			await new Promise(resolve => setTimeout(resolve, 250));
		}
	}

	// Pre-fetch all Financial Times prices in parallel to avoid sequential fetch delays
	const ftTickersToFetch = results
		.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
		.map(r => r.value.ticker)
		.filter(ticker => RELIABLE_FT_MAPPINGS[ticker]);

	const ftFetchResultsArray = await Promise.all(
		ftTickersToFetch.map(async (ticker) => {
			const isin = RELIABLE_FT_MAPPINGS[ticker];
			const ftData = await fetchFTPrice(isin);
			return { ticker, ftData };
		})
	);
	const ftDataMap = new Map(ftFetchResultsArray.map(item => [item.ticker, item.ftData]));

	for (const result of results) {
		if (result.status === 'fulfilled') {
			const { ticker, quote, sparkline, ytd: yahooYtd, mtd, oneMonth } = result.value;
			let { price: p, sparkline: correctedSparkline, currency } = correctSubunitCurrencies(quote.regularMarketPrice, sparkline, quote.currency ?? 'EUR');
			let change = quote.regularMarketChangePercent;
			let ytd = yahooYtd;

			// Intentar obtener precio más actualizado de Financial Times para tickers problemáticos
			if (RELIABLE_FT_MAPPINGS[ticker]) {
				const ftData = ftDataMap.get(ticker);
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
				price: p,
				currency: currency,
				name: quote.shortName ?? quote.longName ?? ticker,
				change: change ?? 0,
				sparkline: correctedSparkline,
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
