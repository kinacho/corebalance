import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { yahooFinance } from '$lib/server/yahoo';
import { checkRateLimit } from '$lib/server/rateLimit';
import { FT_ONLY_ASSETS, isFtOnlyAsset } from '$lib/ft-assets';

// Rate limiting
const RATE_LIMIT = 5;
const RATE_WINDOW_SECS = 60;

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
	
	const allowed = await checkRateLimit(clientIp, {
		limit: RATE_LIMIT,
		windowSeconds: RATE_WINDOW_SECS,
		prefix: 'resolve'
	});
	if (!allowed) {
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
		const cleanIsin = isin.trim().toUpperCase();
		// Los activos que sólo existen en FT se resuelven a sí mismos: su ISIN *es* el
		// ticker interno. Se lee del registro, no de una copia escrita aquí.
		if (isFtOnlyAsset(cleanIsin)) {
			results.push({
				query: isin,
				ticker: cleanIsin,
				name: FT_ONLY_ASSETS[cleanIsin].name,
				type: 'MUTUALFUND',
				exchange: 'Financial Times'
			});
			continue;
		}
		try {
			const searchResults = await yahooFinance.search(cleanIsin, {
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
				name: (best as any)?.longname || (best as any)?.shortname || null,
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
				name: (exact as any)?.longname || (exact as any)?.shortname || null,
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
