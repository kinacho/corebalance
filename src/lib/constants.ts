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

/** Los activos por defecto de la cartera Core */
export const DEFAULT_CORE_ASSETS: Asset[] = [];

/** Activos por defecto de la cartera satélite */
export const DEFAULT_SATELLITE_ASSETS: Asset[] = [];

/** Acciones individuales por defecto */
export const DEFAULT_STOCK_ASSETS: Asset[] = [];



/** Claves de localStorage */
export const STORAGE_KEY_HOLDINGS = 'corebalance_holdings_v2';
export const STORAGE_KEY_CONTRIBUTION = 'corebalance_contribution';
export const STORAGE_KEY_ASSETS = 'corebalance_user_assets';
export const STORAGE_KEY_PRICES = 'corebalance_prices_cache';



/** Tabs del dashboard */
export const DASHBOARD_TABS = [
	{ id: 'assets', label: 'Activos', icon: '📊' },
	{ id: 'rebalance', label: 'Rebalanceo', icon: '💰' },
	{ id: 'charts', label: 'Gráficos', icon: '🍩' }
] as const;

export type TabId = 'assets' | 'rebalance' | 'charts';


