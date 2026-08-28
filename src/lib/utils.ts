import { ui } from './stores/ui.svelte';
import { get } from 'svelte/store';
import { locale as localeStore } from './i18n/i18n-svelte';

/** Formatea un número según la moneda especificada (2 decimales por defecto para totales) */
export function formatCurrency(value: number, currency: string = 'EUR', decimals = 2): string {
	let formatLocale = 'es-ES';
	if (currency === 'USD') {
		formatLocale = 'en-US';
	} else if (currency === 'GBP') {
		formatLocale = 'en-GB';
	} else {
		try {
			const activeLoc = get(localeStore);
			if (activeLoc === 'en') {
				formatLocale = 'en-US';
			} else {
				formatLocale = 'es-ES';
			}
		} catch {
			formatLocale = 'es-ES';
		}
	}

	return new Intl.NumberFormat(formatLocale, {
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

/** Formatea un número como moneda Euro (o la divisa base configurada) */
export function formatEUR(value: number): string {
	return formatCurrency(value, ui.baseCurrency, 2);
}

/** Formatea un número como porcentaje */
export function formatPercent(value: number, decimals = 2): string {
	return (value * 100).toFixed(decimals) + '%';
}

/**
 * Formatea un número de participaciones.
 *
 * ⚠️ **Va por locale, y antes iba por `toFixed(3)`, que escribe punto decimal.** En
 * castellano el punto es el separador de **miles**, así que el panel fiscal proponía
 * mover «423.375 part.» de un fondo a otro: cuatrocientas veintitrés mil
 * participaciones donde había cuatrocientas veintitrés. Un factor mil en una cifra
 * que el usuario va a teclear en su banco.
 *
 * Es el mismo defecto que este repo ya tiene documentado para `formatPercent` («en
 * una app en castellano pinta 0.12%»), y se vio al meter fondos en la cartera de
 * ejemplo: con ETF y acciones las participaciones son números pequeños y el punto
 * nunca llegaba a parecer un separador de miles.
 *
 * `maximumFractionDigits: 3` recorta los ceros por sí solo, así que ya no hace falta
 * el `replace` que lo hacía a mano.
 */
export function formatShares(value: number): string {
	if (value === 0) return '0';
	let formatLocale = 'es-ES';
	try {
		if (get(localeStore) === 'en') formatLocale = 'en-US';
	} catch {
		formatLocale = 'es-ES';
	}
	return new Intl.NumberFormat(formatLocale, { maximumFractionDigits: 3 }).format(value);
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
	let formatLocale = 'es-ES';
	try {
		const activeLoc = get(localeStore);
		if (activeLoc === 'en') {
			formatLocale = 'en-US';
		}
	} catch {
		// fallback
	}
	return d.toLocaleString(formatLocale, {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/** Valida la estructura de datos importados antes de procesarlos */
export function validateImportData(data: any): boolean {
	if (!data || typeof data !== 'object') return false;
	
	// Debe tener al menos userData o history (o ambos)
	const hasUserData = Array.isArray(data.userData);
	const hasHistory = Array.isArray(data.history);
	
	if (!hasUserData && !hasHistory) return false;

	// Si tiene userData, cada registro debe tener al menos un id
	if (hasUserData) {
		for (const record of data.userData) {
			if (!record.id) return false;
		}
	}

	return true;
}

/** Resuelve el icono (emoji) apropiado para un activo según su ticker, nombre y tipo */
/** Escapa caracteres HTML para prevenir XSS */
export function escapeHtml(str: string): string {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Comprueba si el usuario tiene activos guardados en el almacenamiento local (manuales o por transacciones) */
export function hasLocalHoldingsData(): boolean {
	if (typeof localStorage === 'undefined') return false;
	try {
		// 1. Comprobar posiciones manuales o si usa Ledger
		const savedHoldings = localStorage.getItem('corebalance_holdings_v2');
		if (savedHoldings) {
			const parsed = JSON.parse(savedHoldings);
			const hasManualOrLedger = Object.values(parsed).some(
				(h: any) => h && (h.shares > 0 || h.useLedger === true)
			);
			if (hasManualOrLedger) return true;
		}

		// 2. Comprobar si hay transacciones guardadas
		const savedTransactions = localStorage.getItem('corebalance_transactions');
		if (savedTransactions) {
			const parsedTx = JSON.parse(savedTransactions);
			if (Array.isArray(parsedTx) && parsedTx.length > 0) return true;
		}

		return false;
	} catch {
		return false;
	}
}



