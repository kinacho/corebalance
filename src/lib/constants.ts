import type { Asset } from './types';

/** Los tres activos de la cartera con sus pesos objetivo */
export const PORTFOLIO_ASSETS: Asset[] = [
	{
		ticker: '0P0001XF40.F',
		name: 'iShares Dev World',
		isin: 'IE000ZYRH0Q7',
		targetWeight: 0.90,
		color: '#3b82f6',
		icon: '🌍',
		ter: 0.0006 // 0.06%
	},
	{
		ticker: '0P0001XF3Z.F',
		name: 'iShares Emerging',
		isin: 'IE000QAZP7L2',
		targetWeight: 0.05,
		color: '#10b981',
		icon: '🌱',
		ter: 0.0016 // 0.16%
	},
	{
		ticker: 'XS2940466316.SG',
		name: 'iShares Bitcoin',
		isin: 'XS2940466316',
		targetWeight: 0.05,
		color: '#f59e0b',
		icon: '₿',
		ter: 0.0015 // 0.15%
	}
];

/** Activos de la cartera satélite (Renta Fija y Mixta) */
export const SATELLITE_ASSETS: Asset[] = [
	{
		ticker: '0P0001QKUD.F',
		name: 'Groupama Trésorerie',
		isin: 'FR001400CFA4',
		targetWeight: 0, // No participan en rebalanceo
		color: '#64748b',
		icon: '🛡️',
		ter: 0.0009 // Estimado, se puede ajustar
	},
	{
		ticker: '0P0001MYMU.F',
		name: 'Avantage Fund B FI',
		isin: 'ES0112231016',
		targetWeight: 0,
		color: '#8b5cf6',
		icon: '⚖️',
		ter: 0.0075 // Estimado, se puede ajustar
	}
];

/** Acciones individuales */
export const STOCK_ASSETS: Asset[] = [
	{
		ticker: 'ATCH',
		name: 'AtlasClear Holdings',
		isin: 'US1287452056',
		targetWeight: 0,
		color: '#6366f1',
		icon: '📈',
		ter: 0
	},
	{
		ticker: '34Q0.F',
		name: 'Quantum eMotion',
		isin: 'CA74767K1030',
		targetWeight: 0,
		color: '#ec4899',
		icon: '⚛️',
		ter: 0
	}
];

/** Claves de localStorage */
export const STORAGE_KEY_HOLDINGS = 'balanceador_holdings_v2';
export const STORAGE_KEY_CONTRIBUTION = 'balanceador_contribution';

/** Distribución objetivo como texto legible */
export const TARGET_LABEL = '90 / 5 / 5';
