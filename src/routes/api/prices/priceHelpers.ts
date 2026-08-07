/**
 * Pure helper functions for the /api/prices endpoint.
 * These are stateless functions that can be tested independently.
 */

// Mapeo de tickers problemáticos en Yahoo a ISINs/Symbols de Financial Times para mayor fiabilidad
export const RELIABLE_FT_MAPPINGS: Record<string, string> = {
	'0P0001XF40.F': 'IE000ZYRH0Q7', // BlackRock World
	'0P0001XF3Z.F': 'IE000QAZP7L2', // BlackRock EM
	'XS2940466316.SG': 'IB1T:FRA'   // BlackRock Bitcoin ETP (Frankfurt)
};

/**
 * ⚠️ Aquí vivía `PURE_FT_TICKERS`, «tickers que no existen en Yahoo y se obtienen
 * directamente de Financial Times». Estaba importado en `+server.ts` y **no se leía
 * en ninguna línea**: el endpoint mandaba esos ISIN a Yahoo como cualquier otro, no
 * los encontraba, y el usuario recibía «No se encontró cotización». Duplicaba además
 * la única entrada de `FT_ONLY_ASSETS` en `src/lib/ft-assets.ts`, que tampoco usa
 * nadie. Borrado en vez de rescatado: dos registros muertos que se contradicen son
 * peor que ninguno, y la decisión de si ese camino debe existir es de producto.
 */

/**
 * Extrae precio, variación diaria y YTD del HTML de una ficha de Financial Times.
 *
 * Está separada de `fetchFTPrice` a propósito: **lo frágil de esto no es la red,
 * son los regex**. FT puede cambiar su maquetación cualquier día y el scraper caería
 * en silencio a Yahoo, que es justo el fallo que no se ve desde fuera. Como función
 * pura se le pueden dar HTML de mentira y exigir que reconozca lo que debe y —más
 * importante— que **no invente** cuando no reconoce nada.
 *
 * Devuelve `null` cuando no hay un precio positivo reconocible, que es la señal que
 * hace al endpoint quedarse con lo que diga Yahoo.
 *
 * ⚠️ **Aquí había una tercera extracción, el YTD, y no podía funcionar.** Buscaba
 * `/Year to date.*?([\d,.-]+)%/s`, y esa frase **no aparece en la ficha**: FT publica
 * el rendimiento en otra URL (`/tearsheet/performance`), mientras el scraper pide
 * `/tearsheet/summary`. Comprobado el 7-ago-2026 sobre las tres fichas reales que la
 * app consulta: ni «Year to date» ni «YTD» aparecen en ninguna, y «Performance» solo
 * sale como texto de una pestaña. Así que `ytd` era siempre `undefined` y la rama de
 * `+server.ts` que decía «si FT tiene YTD y Yahoo no, lo usamos» era código muerto.
 * Se ha borrado en vez de arreglarlo: el YTD ya se calcula con el histórico de Yahoo
 * en `calculateHistoricalMetrics`, y rescatarlo costaría una petición HTTP más por
 * ticker para un dato que ya se tiene.
 */
export function parseFTPriceHtml(html: string): { price: number; change: number } | null {
	// Búsqueda del precio: aparece después de "Price (EUR)"
	const priceMatch = html.match(/Price \(EUR\).*?mod-ui-data-list__value">([\d,.]+)/s);
	// Búsqueda del cambio porcentual: aparece después de la barra "/"
	const changeMatch = html.match(/\/ ([\d,.-]+)%/);

	if (priceMatch) {
		const price = parseFloat(priceMatch[1].replace(/,/g, ''));
		const change = changeMatch ? parseFloat(changeMatch[1]) : 0;
		if (price > 0) return { price, change };
	}
	return null;
}

/**
 * Fetches the current price and daily change from Financial Times markets pages.
 *
 * `fetchImpl` se inyecta para poder probar el envoltorio de red —timeout, respuesta
 * no-OK, excepción— sin salir a internet. El parseo vive en `parseFTPriceHtml`.
 */
export async function fetchFTPrice(
	isin: string,
	fetchImpl: typeof fetch = fetch
): Promise<{ price: number; change: number } | null> {
	try {
		const url = `https://markets.ft.com/data/funds/tearsheet/summary?s=${isin}:EUR`;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		const res = await fetchImpl(url, { cache: 'no-store', signal: controller.signal });
		clearTimeout(timeout);
		if (!res.ok) return null;
		return parseFTPriceHtml(await res.text());
	} catch (e) {
		console.error(`Error fetching FT price for ${isin}:`, e);
	}
	return null;
}

/**
 * Corrects fractional subunit currencies (e.g. GBp (pence) to GBP, ZAc to ZAR, USc to USD).
 */
export function correctSubunitCurrencies(
	price: number | undefined,
	sparkline: number[],
	currency: string
): { price: number; sparkline: number[]; currency: string } {
	const SUBUNIT_DIVISOR = 100;
	const KNOWN_SUBUNITS: Record<string, string> = {
		'GBp': 'GBP',
		'ZAc': 'ZAR',
		'IEp': 'EUR',
		'EUc': 'EUR',
		'USc': 'USD'
	};

	let finalPrice = price ?? 0;
	let finalSparkline = [...sparkline];
	let finalCurrency = currency;

	if (KNOWN_SUBUNITS[currency] || (currency.length === 3 && currency.endsWith('p'))) {
		const baseCurrency = KNOWN_SUBUNITS[currency] || (currency.substring(0, 2) + 'P');
		finalPrice = finalPrice / SUBUNIT_DIVISOR;
		finalSparkline = finalSparkline.map((s) => s / SUBUNIT_DIVISOR);
		finalCurrency = baseCurrency;
	}

	return { price: finalPrice, sparkline: finalSparkline, currency: finalCurrency };
}

interface HistoricalQuote {
	date: Date | string;
	close: number | null;
}

/**
 * Calculates YTD, MTD, and 1M change percentages from historical quotes list.
 *
 * ⚠️ `now` es un parámetro y no una llamada a `new Date()` por dentro, por la misma
 * razón que `calculateTaxAwareRebalance` lo lleva: esto es **aritmética de fechas**,
 * y un test escrito contra el reloj real pasa hoy y falla en enero — que es
 * precisamente cuando el YTD importa. Con el reloj dentro, los tres cortes (inicio
 * de año, inicio de mes, hace 30 días) no se pueden ejercitar a voluntad.
 */
export function calculateHistoricalMetrics(
	validQuotes: HistoricalQuote[],
	currentPrice: number,
	defaultYtd: number | undefined,
	now: Date = new Date()
): { ytd: number | undefined; mtd: number | undefined; oneMonth: number | undefined } {
	let ytd: number | undefined = defaultYtd;
	let mtd: number | undefined = undefined;
	let oneMonth: number | undefined = undefined;

	if (validQuotes.length === 0) {
		return { ytd, mtd, oneMonth };
	}

	const currentYear = now.getFullYear();
	const startOfCurrentYear = new Date(Date.UTC(currentYear, 0, 1));

	// 1. YTD (Year To Date)
	const prevYearQuotes = validQuotes.filter((q) => new Date(q.date) < startOfCurrentYear);
	if (prevYearQuotes.length > 0) {
		const lastYearClose = prevYearQuotes[prevYearQuotes.length - 1].close as number;
		if (lastYearClose > 0) ytd = ((currentPrice - lastYearClose) / lastYearClose) * 100;
	} else {
		const firstThisYear = validQuotes[0].close as number;
		if (firstThisYear > 0) ytd = ((currentPrice - firstThisYear) / firstThisYear) * 100;
	}

	// 2. MTD (Month To Date)
	const startOfCurrentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
	const prevMonthQuotes = validQuotes.filter((q) => new Date(q.date) < startOfCurrentMonth);
	if (prevMonthQuotes.length > 0) {
		const lastMonthClose = prevMonthQuotes[prevMonthQuotes.length - 1].close as number;
		if (lastMonthClose > 0) mtd = ((currentPrice - lastMonthClose) / lastMonthClose) * 100;
	}

	// 3. 1M (Last 30 days)
	const oneMonthAgo = new Date(now.getTime());
	oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
	const oneMonthQuotes = validQuotes.filter((q) => new Date(q.date) < oneMonthAgo);
	if (oneMonthQuotes.length > 0) {
		const oneMonthClose = oneMonthQuotes[oneMonthQuotes.length - 1].close as number;
		if (oneMonthClose > 0) oneMonth = ((currentPrice - oneMonthClose) / oneMonthClose) * 100;
	} else {
		// Fallback: use first available close
		const firstClose = validQuotes[0].close as number;
		if (firstClose > 0) oneMonth = ((currentPrice - firstClose) / firstClose) * 100;
	}

	return { ytd, mtd, oneMonth };
}
