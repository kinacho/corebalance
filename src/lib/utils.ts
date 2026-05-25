import { ui } from './stores/ui.svelte';

/** Formatea un número según la moneda especificada (2 decimales por defecto para totales) */
export function formatCurrency(value: number, currency: string = 'EUR', decimals = 2): string {
	let locale = 'es-ES';
	if (currency === 'USD') locale = 'en-US';
	if (currency === 'GBP') locale = 'en-GB';

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

/** Formatea un número como moneda Euro (o la divisa base configurada) */
export function formatEUR(value: number): string {
	return formatCurrency(value, ui.baseCurrency, 2);
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
export function resolveAssetIcon(ticker: string, name: string = '', type: string = ''): string {
	const t = ticker.toUpperCase();
	const n = name.toUpperCase();
	const ty = type.toUpperCase();

	// 1. Criptoactivos
	if (t.includes('BTC') || t.includes('BITCOIN') || n.includes('BITCOIN') || n.includes('BTC')) return '₿';
	if (t.includes('ETH') || t.includes('ETHEREUM') || n.includes('ETHEREUM') || n.includes('ETH')) return 'Ξ';
	if (t.includes('SOL') || t.includes('SOLANA') || n.includes('SOLANA')) return '☀️';
	if (t.includes('USDT') || t.includes('TETHER') || n.includes('TETHER')) return '💵';
	if (t.includes('-USD') || t.includes('-EUR') && (ty.includes('CRYPT') || n.includes('CRIPTO'))) return '🪙';

	// 2. Efectivo / Cuentas Remuneradas / Cash
	if (t.startsWith('CASH-') || t === 'CASH' || n.includes('CASH') || n.includes('REMUNERADA') || n.includes('EFECTIVO') || n.includes('MONETARIO') || ty === 'CASH') return '🏦';

	// 3. Fondos de Renta Fija / Bonos / Government Bonds / Treasury
	if (n.includes('BOND') || n.includes('BONOS') || n.includes('TREASURY') || n.includes('RENTA FIJA') || n.includes('GOVERNMENT') || n.includes('GILT') || n.includes('OBLIGACIONES')) return '🧾';

	// 4. ETFs / Fondos de acciones geográficas / Temáticos
	// S&P 500, USA, Estados Unidos
	if (n.includes('S&P 500') || n.includes('S&P500') || n.includes('SP500') || t.includes('SPY') || t.includes('VOO')) return '🇺🇸';
	// MSCI World, MSCI ACWI, Global, Todo el mundo
	if (n.includes('WORLD') || n.includes('GLOBAL') || n.includes('ACWI') || n.includes('MUNDO') || n.includes('ALL WORLD') || t.includes('IWDA') || t.includes('VWRA')) return '🌐';
	// Europa / Stoxx / Eurostoxx
	if (n.includes('EUROPE') || n.includes('EUROPA') || n.includes('STOXX') || n.includes('DAX') || n.includes('CAC') || n.includes('FTSE 100')) return '🇪🇺';
	// Emergentes / Emerging Markets
	if (n.includes('EMERGING') || n.includes('EMERGENTES') || n.includes('EMIM') || t.includes('EIMI')) return '🌏';
	// España / IBEX 35
	if (n.includes('IBEX') || n.includes('ESPAÑA') || n.includes('SPAIN')) return '🇪🇸';
	// Japón / Nikkei
	if (n.includes('JAPAN') || n.includes('JAPÓN') || n.includes('NIKKEI')) return '🇯🇵';
	// Pacífico / Asia / China / India
	if (n.includes('CHINA') || n.includes('ASIA') || n.includes('PACIFIC') || n.includes('INDIA')) return '🇨🇳';
	// Tecnología / NASDAQ / Tech
	if (n.includes('NASDAQ') || n.includes('TECH') || n.includes('TECNOLOGÍA') || n.includes('INFORMATION TECHNOLOGY') || t.includes('QQQ')) return '💻';
	// Oro / Metales / Materias primas / Commodities
	if (n.includes('GOLD') || n.includes('ORO') || n.includes('PHYSICAL GOLD') || t.includes('GLD') || t.includes('IAU')) return '👑';
	if (n.includes('COMMODIT') || n.includes('MATERIAS PRIMAS') || n.includes('SILVER') || n.includes('PLATA')) return '⛏️';
	// Agua / Clean Energy / Sectoriales
	if (n.includes('WATER') || n.includes('AGUA')) return '💧';
	if (n.includes('ENERGY') || n.includes('ENERGÍA') || n.includes('CLEAN ENERGY')) return '⚡';
	// Inmobiliario / Real Estate / REITS
	if (n.includes('REAL ESTATE') || n.includes('INMOBILIARIO') || n.includes('REIT') || n.includes('PROPERTY')) return '🏢';

	// 5. Por Tipo (Yahoo o detector)
	if (ty.includes('ETF') || n.includes('ETF')) return '📊';
	if (ty.includes('MUTUAL') || ty.includes('FUND') || n.includes('FONDO')) return '🛡️';
	if (ty.includes('EQUITY') || ty.includes('STOCK')) {
		// Acciones conocidas
		if (t === 'AAPL' || n.includes('APPLE')) return '🍎';
		if (t === 'MSFT' || n.includes('MICROSOFT')) return '💻';
		if (t === 'GOOG' || t === 'GOOGL' || n.includes('ALPHABET') || n.includes('GOOGLE')) return '🔍';
		if (t === 'AMZN' || n.includes('AMAZON')) return '📦';
		if (t === 'TSLA' || n.includes('TESLA')) return '⚡';
		if (t === 'NVDA' || n.includes('NVIDIA')) return '🎮';
		if (t === 'META' || n.includes('FACEBOOK')) return '👥';
		if (t === 'NFLX' || n.includes('NETFLIX')) return '🎬';
		return '📈'; // Acción genérica
	}

	// 6. Por Ticker o ISIN directo (para fondos muy comunes en España)
	if (t.includes('IE00') || t.includes('LU0')) return '📊'; // ETF/Fondo Irlandés/Luxemburgués estándar

	// 7. Genérico por defecto
	return '💎';
}
