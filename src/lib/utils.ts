/** Formatea un número según la moneda especificada */
export function formatCurrency(value: number, currency: string = 'EUR'): string {
	const locale = currency === 'USD' ? 'en-US' : 'es-ES';
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value);
}

/** Formatea un número como moneda Euro */
export function formatEUR(value: number): string {
	return formatCurrency(value, 'EUR');
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

/** Determina si el mercado para un ticker está abierto actualmente */
export function isMarketOpen(ticker: string): boolean {
	// Cripto siempre abierto
	if (ticker.includes('BTC') || ticker.includes('ETH')) return true;

	const now = new Date();
	const day = now.getDay();
	const hours = now.getHours();
	const minutes = now.getMinutes();
	const currentTime = hours * 60 + minutes;

	// Fines de semana cerrado (Sáb=6, Dom=0)
	if (day === 0 || day === 6) return false;

	// Horarios aproximados (España/CET)
	// Europa (XETRA, Frankfurt, etc): 09:00 - 17:30 (aprox hasta 20:00-22:00 en algunos)
	if (ticker.endsWith('.F') || ticker.endsWith('.SG') || ticker.startsWith('0P')) {
		return currentTime >= 540 && currentTime <= 1050; // 09:00 - 17:30
	}

	// USA (NASDAQ, NYSE): 15:30 - 22:00
	return currentTime >= 930 && currentTime <= 1320; // 15:30 - 22:00
}
