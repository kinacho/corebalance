import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Rate limiting
const resolveLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000;

function checkResolveRateLimit(ip: string): boolean {
	const now = Date.now();
	const requests = resolveLimitMap.get(ip) || [];
	const recent = requests.filter(t => now - t < RATE_WINDOW);
	if (recent.length >= RATE_LIMIT) return false;
	recent.push(now);
	resolveLimitMap.set(ip, recent);
	if (resolveLimitMap.size > 500) {
		for (const [key, times] of resolveLimitMap) {
			if (times.every(t => now - t > RATE_WINDOW)) resolveLimitMap.delete(key);
		}
	}
	return true;
}

interface ResolveRequest {
	/** ISINs a resolver */
	isins?: string[];
	/** Tickers a validar (para IB que no da ISINs) */
	tickers?: string[];
}

interface ResolvedAsset {
	/** Identificador enviado (ISIN o ticker) */
	query: string;
	/** Ticker de Yahoo Finance encontrado */
	ticker: string | null;
	/** Nombre del activo */
	name: string | null;
	/** Tipo de activo */
	type: string | null;
	/** Exchange */
	exchange: string | null;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let clientIp = 'unknown';
	try { clientIp = getClientAddress(); } catch { clientIp = '127.0.0.1'; }
	
	if (!checkResolveRateLimit(clientIp)) {
		return json({ error: 'Demasiadas peticiones. Inténtalo en un minuto.' }, { status: 429 });
	}
	
	let body: ResolveRequest;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
	}
	
	const isins = (body.isins || []).slice(0, 30); // Máximo 30 ISINs por petición
	const tickers = (body.tickers || []).slice(0, 30);
	
	if (isins.length === 0 && tickers.length === 0) {
		return json({ resolved: [] });
	}
	
	const results: ResolvedAsset[] = [];
	
	// Resolver ISINs buscándolos en Yahoo Finance
	for (const isin of isins) {
		try {
			const searchResults = await yahooFinance.search(isin.trim(), {
				quotesCount: 5,
				newsCount: 0
			});
			
			const quotes = searchResults.quotes || [];
			
			// Priorizar resultados: preferir mercados europeos (Frankfurt .F/.DE, Amsterdam .AS, etc.)
			// si el ISIN empieza con IE, LU, DE, FR, etc.
			const isEuropean = /^(IE|LU|DE|FR|NL|ES|IT|AT|BE|FI|PT)/.test(isin);
			
			let best = quotes[0];
			if (isEuropean && quotes.length > 1) {
				const europeanExchanges = ['.DE', '.F', '.AS', '.PA', '.MI', '.MC', '.L', '.SG'];
				const europeanResult = quotes.find((q: any) =>
					q.symbol && europeanExchanges.some(ext => q.symbol.endsWith(ext))
				);
				if (europeanResult) best = europeanResult;
			}
			
			results.push({
				query: isin,
				ticker: (best as any)?.symbol || null,
				name: (best as any)?.shortname || (best as any)?.longname || null,
				type: (best as any)?.quoteType || (best as any)?.typeDisp || null,
				exchange: (best as any)?.exchDisp || (best as any)?.exchange || null,
			});
		} catch (e) {
			console.error(`Error resolving ISIN ${isin}:`, e);
			results.push({ query: isin, ticker: null, name: null, type: null, exchange: null });
		}
		
		// Pequeña pausa entre búsquedas para evitar rate limit de Yahoo
		if (isins.indexOf(isin) < isins.length - 1) {
			await new Promise(r => setTimeout(r, 200));
		}
	}
	
	// Validar tickers (para IB que ya tiene tickers pero no ISINs)
	for (const ticker of tickers) {
		try {
			const searchResults = await yahooFinance.search(ticker.trim(), {
				quotesCount: 3,
				newsCount: 0
			});
			
			const quotes = searchResults.quotes || [];
			const exact = quotes.find((q: any) => q.symbol === ticker) || quotes[0];
			
			results.push({
				query: ticker,
				ticker: (exact as any)?.symbol || ticker,
				name: (exact as any)?.shortname || (exact as any)?.longname || null,
				type: (exact as any)?.quoteType || null,
				exchange: (exact as any)?.exchDisp || null,
			});
		} catch {
			results.push({ query: ticker, ticker, name: null, type: null, exchange: null });
		}
		
		if (tickers.indexOf(ticker) < tickers.length - 1) {
			await new Promise(r => setTimeout(r, 200));
		}
	}
	
	return json({ resolved: results }, {
		headers: { 'Cache-Control': 'public, max-age=3600' }
	});
};
