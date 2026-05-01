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

/** Claves de localStorage */
export const STORAGE_KEY_HOLDINGS = 'balanceador_holdings_v2';
export const STORAGE_KEY_CONTRIBUTION = 'balanceador_contribution';

/** Distribución objetivo como texto legible */
export const TARGET_LABEL = '90 / 5 / 5';
