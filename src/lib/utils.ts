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
