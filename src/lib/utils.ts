/** Formatea un número según la moneda especificada (2 decimales por defecto para totales) */
export function formatCurrency(value: number, currency: string = 'EUR', decimals = 2): string {
	const locale = currency === 'USD' ? 'en-US' : 'es-ES';
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: currency,
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

/** Formatea un precio de unidad con más precisión (3 decimales) */
export function formatPrice(value: number, currency: string = 'EUR'): string {
	return formatCurrency(value, currency, 3);
}

/** Formatea un número como moneda Euro */
export function formatEUR(value: number): string {
	return formatCurrency(value, 'EUR', 2);
}

/** Formatea un número como porcentaje */
export function formatPercent(value: number, decimals = 2): string {
	return (value * 100).toFixed(decimals) + '%';
}

/** Formatea un número de participaciones */
export function formatShares(value: number): string {
	if (value === 0) return '0';
	return value.toFixed(3).replace(/\.?0+$/, '');
}

/** Determina si el mercado para un activo está abierto actualmente */
export function isMarketOpen(ticker: string, marketState?: string): boolean {
	// 1. Prioridad absoluta: Estado oficial de la API
	if (marketState) {
		const openStates = ['REGULAR'];
		return openStates.includes(marketState.toUpperCase());
	}

	// 2. Criptoactivos (siempre abiertos)
	const cryptoKeywords = ['BTC', 'ETH', 'BNB', 'SOL', 'USDT', 'XS2940466316'];
	if (cryptoKeywords.some(k => ticker.toUpperCase().includes(k))) return true;

	const now = new Date();
	const day = now.getDay();
	if (day === 0 || day === 6) return false; // Fines de semana cerrado

	const hours = now.getHours();
	const minutes = now.getMinutes();
	const currentTime = hours * 60 + minutes; // Minutos totales desde las 00:00

	const t = ticker.toUpperCase();

	// 3. Europa (Xetra, Frankfurt, Madrid, Paris, Amsterdam, Milan, London)
	// Suffixes: .F (Frankfurt), .SG (Stuttgart), .MC (Madrid), .PA (Paris), .AS (Amsterdam), .MI (Milan), .L (London), .DE (Xetra)
	const isEuropean = t.endsWith('.F') || t.endsWith('.SG') || t.endsWith('.MC') || 
	                   t.endsWith('.PA') || t.endsWith('.AS') || t.endsWith('.MI') || 
	                   t.endsWith('.L') || t.endsWith('.DE') || t.startsWith('0P') ||
	                   t.startsWith('ES') || t.startsWith('IE') || t.startsWith('LU');

	if (isEuropean) {
		// Londres abre un poco antes/después pero 9:00-17:30 es una buena media para Europa
		return currentTime >= 540 && currentTime <= 1050; // 09:00 - 17:30
	}

	// 4. USA (NYSE, NASDAQ, AMEX)
	// ISINs que empiezan por US o tickers sin punto (NVDA, AAPL) o terminados en .US
	const isUSA = t.startsWith('US') || !t.includes('.') || t.endsWith('.US');
	
	if (isUSA) {
		// Mercado USA: 15:30 - 22:00 (Hora España CEST)
		return currentTime >= 930 && currentTime <= 1320; 
	}

	// 5. Fallback por defecto (USA)
	return currentTime >= 930 && currentTime <= 1320; 
}

/** Formatea una fecha como YYYY-MM-DD */
export function formatDate(date: Date = new Date()): string {
	return date.toISOString().split('T')[0];
}

/** Formatea una fecha y hora como DD/MM HH:mm */
export function formatDateTime(date: Date | number | string): string {
	const d = new Date(date);
	return d.toLocaleString('es-ES', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}
