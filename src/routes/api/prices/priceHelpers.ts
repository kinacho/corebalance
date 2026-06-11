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

// Tickers que no existen en Yahoo Finance y se obtienen directamente de Financial Times
export const PURE_FT_TICKERS: Record<string, { name: string, currency: string }> = {
	'IE00B2NXKW18': { name: 'Seilern World Growth EUR U R', currency: 'EUR' }
};

/**
 * Fetches the current price and daily change from Financial Times markets pages.
 */
export async function fetchFTPrice(isin: string): Promise<{ price: number; change: number; ytd?: number } | null> {
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
 */
export function calculateHistoricalMetrics(
	validQuotes: HistoricalQuote[],
	currentPrice: number,
	defaultYtd: number | undefined
): { ytd: number | undefined; mtd: number | undefined; oneMonth: number | undefined } {
	let ytd: number | undefined = defaultYtd;
	let mtd: number | undefined = undefined;
	let oneMonth: number | undefined = undefined;

	if (validQuotes.length === 0) {
		return { ytd, mtd, oneMonth };
	}

	const currentYear = new Date().getFullYear();
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
	const startOfCurrentMonth = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
	const prevMonthQuotes = validQuotes.filter((q) => new Date(q.date) < startOfCurrentMonth);
	if (prevMonthQuotes.length > 0) {
		const lastMonthClose = prevMonthQuotes[prevMonthQuotes.length - 1].close as number;
		if (lastMonthClose > 0) mtd = ((currentPrice - lastMonthClose) / lastMonthClose) * 100;
	}

	// 3. 1M (Last 30 days)
	const oneMonthAgo = new Date();
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
