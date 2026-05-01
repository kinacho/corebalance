/** Formatea un número como moneda Euro */
export function formatEUR(value: number): string {
	return new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value);
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
