import type { Asset } from './types';

/** Paleta de colores predefinida para asignar a nuevos activos */
export const ASSET_COLORS = [
	'#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
	'#6366f1', '#14b8a6', '#f97316', '#06b6d4', '#ef4444',
	'#84cc16', '#a855f7', '#0ea5e9', '#d946ef', '#22c55e'
];

/** Iconos predefinidos para asignar a nuevos activos según tipo */
export const ASSET_ICONS: Record<string, string> = {
	'ETF': '📊',
	'Acción': '📈',
	'Fondo': '🛡️',
	'Crypto': '₿',
	'Futuro': '⚡',
	'Índice': '🌐',
	'Divisa': '💱',
	'Otro': '💎'
};

/** Los tres activos por defecto de la cartera Core (plantilla para nuevos usuarios) */
export const DEFAULT_CORE_ASSETS: Asset[] = [
	{
		ticker: 'VHVG.L',
		name: 'Vanguard FTSE Dev World',
		isin: 'IE00BK5BQV03',
		targetWeight: 0.80,
		color: '#3b82f6',
		icon: '🌍',
		ter: 0.0012,
		category: 'core'
	},
	{
		ticker: 'VFEG.L',
		name: 'Vanguard FTSE Emerging',
		isin: 'IE00BK5BR733',
		targetWeight: 0.15,
		color: '#10b981',
		icon: '🌱',
		ter: 0.0022,
		category: 'core'
	},
	{
		ticker: 'VUSA.L',
		name: 'Vanguard S&P 500',
		isin: 'IE00B3XXRP09',
		targetWeight: 0.05,
		color: '#f59e0b',
		icon: '🇺🇸',
		ter: 0.0007,
		category: 'core'
	}
];

/** Activos por defecto de la cartera satélite (Renta Fija y Mixta) */
export const DEFAULT_SATELLITE_ASSETS: Asset[] = [
	{
		ticker: 'VAGF.DE',
		name: 'Vanguard Global Bond',
		isin: 'IE00BG47KH54',
		targetWeight: 0,
		color: '#64748b',
		icon: '🛡️',
		ter: 0.0010,
		category: 'satellite'
	}
];

/** Acciones individuales por defecto */
export const DEFAULT_STOCK_ASSETS: Asset[] = [
	{
		ticker: 'NVDA',
		name: 'NVIDIA Corporation',
		isin: 'US67066G1040',
		targetWeight: 0,
		color: '#76b900',
		icon: '🤖',
		ter: 0,
		category: 'stocks'
	},
	{
		ticker: 'AAPL',
		name: 'Apple Inc.',
		isin: 'US0378331005',
		targetWeight: 0,
		color: '#a2aaad',
		icon: '🍎',
		ter: 0,
		category: 'stocks'
	},
	{
		ticker: 'GOOGL',
		name: 'Alphabet Inc.',
		isin: 'US02079K3059',
		targetWeight: 0,
		color: '#4285f4',
		icon: '🔍',
		ter: 0,
		category: 'stocks'
	},
	{
		ticker: 'TSLA',
		name: 'Tesla, Inc.',
		isin: 'US88160R1014',
		targetWeight: 0,
		color: '#cc0000',
		icon: '⚡',
		ter: 0,
		category: 'stocks'
	}
];



/** Claves de localStorage */
export const STORAGE_KEY_HOLDINGS = 'corebalance_holdings_v2';
export const STORAGE_KEY_CONTRIBUTION = 'corebalance_contribution';
export const STORAGE_KEY_ASSETS = 'corebalance_user_assets';


/** Tabs del dashboard */
export const DASHBOARD_TABS = [
	{ id: 'assets', label: 'Activos', icon: '📊' },
	{ id: 'rebalance', label: 'Rebalanceo', icon: '💰' },
	{ id: 'charts', label: 'Gráficos', icon: '🍩' }
] as const;

export type TabId = (typeof DASHBOARD_TABS)[number]['id'];
