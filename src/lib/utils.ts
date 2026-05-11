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
	if (marketState) {
		const openStates = ['REGULAR', 'PRE', 'POST', 'PREPRE', 'POSTPOST'];
		return openStates.includes(marketState);
	}

	if (ticker.includes('BTC') || ticker.includes('ETH')) return true;

	const now = new Date();
	const day = now.getDay();
	const hours = now.getHours();
	const minutes = now.getMinutes();
	const currentTime = hours * 60 + minutes;

	if (day === 0 || day === 6) return false;

	if (ticker.endsWith('.F') || ticker.endsWith('.SG') || ticker.startsWith('0P')) {
		return currentTime >= 540 && currentTime <= 1050; // 09:00 - 17:30
	}

	return currentTime >= 930 && currentTime <= 1320; 
}

/** Formatea una fecha como YYYY-MM-DD */
export function formatDate(date: Date = new Date()): string {
	return date.toISOString().split('T')[0];
}
