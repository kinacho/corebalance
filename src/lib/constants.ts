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
		ticker: '0P0001XF40.F',
		name: 'iShares Dev World',
		isin: 'IE000ZYRH0Q7',
		targetWeight: 0.90,
		color: '#3b82f6',
		icon: '🌍',
		ter: 0.0006, // 0.06%
		category: 'core'
	},
	{
		ticker: '0P0001XF3Z.F',
		name: 'iShares Emerging',
		isin: 'IE000QAZP7L2',
		targetWeight: 0.05,
		color: '#10b981',
		icon: '🌱',
		ter: 0.0016, // 0.16%
		category: 'core'
	},
	{
		ticker: 'XS2940466316.SG',
		name: 'iShares Bitcoin',
		isin: 'XS2940466316',
		targetWeight: 0.05,
		color: '#f59e0b',
		icon: '₿',
		ter: 0.0015, // 0.15%
		category: 'core'
	}
];

/** Activos por defecto de la cartera satélite (Renta Fija y Mixta) */
export const DEFAULT_SATELLITE_ASSETS: Asset[] = [
	{
		ticker: '0P0001QKUD.F',
		name: 'Groupama Trésorerie',
		isin: 'FR001400CFA4',
		targetWeight: 0,
		color: '#64748b',
		icon: '🛡️',
		ter: 0.0009,
		category: 'satellite'
	},
	{
		ticker: '0P0001MYMU.F',
		name: 'Avantage Fund B FI',
		isin: 'ES0112231016',
		targetWeight: 0,
		color: '#8b5cf6',
		icon: '⚖️',
		ter: 0.0075,
		category: 'satellite'
	}
];

/** Acciones individuales por defecto */
export const DEFAULT_STOCK_ASSETS: Asset[] = [
	{
		ticker: 'ATCH',
		name: 'AtlasClear Holdings',
		isin: 'US1287452056',
		targetWeight: 0,
		color: '#6366f1',
		icon: '📈',
		ter: 0,
		category: 'stocks'
	},
	{
		ticker: '34Q0.SG',
		name: 'Quantum eMotion',
		isin: 'CA74767K1030',
		targetWeight: 0,
		color: '#ec4899',
		icon: '⚛️',
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
