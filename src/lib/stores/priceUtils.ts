/**
 * Pure utility functions for price-related logic, extracted from PortfolioStore.
 * These functions are stateless and safe to import/test independently.
 */

import type { Asset, PriceData } from '$lib/types';

/**
 * Returns true if any sparkline data has changed between the old and new
 * price snapshots. Uses length + last-value comparison instead of full
 * JSON.stringify to avoid O(n) cost per poll cycle.
 */
export function detectSparklineChange(
	oldPrices: Record<string, PriceData>,
	newPrices: Record<string, PriceData>
): boolean {
	for (const ticker in newPrices) {
		const newSpark = newPrices[ticker]?.sparkline;
		const oldSpark = oldPrices[ticker]?.sparkline;
		if (!newSpark) continue;
		if (!oldSpark) return true;
		if (newSpark.length !== oldSpark.length) return true;
		if (newSpark.length > 0 && newSpark[newSpark.length - 1] !== oldSpark[oldSpark.length - 1]) {
			return true;
		}
	}
	return false;
}

/**
 * Applies TER (Total Expense Ratio) updates from API price data to asset lists.
 * Only updates assets where the API provides a non-zero TER and the current asset
 * has TER = 0 (i.e., we don't overwrite user-set values).
 *
 * @returns A new asset array and a boolean indicating whether any update was made.
 */
export function applyTerUpdates(
	assets: Asset[],
	prices: Record<string, PriceData>
): { assets: Asset[]; updated: boolean } {
	let updated = false;
	const result = assets.map((asset) => {
		const priceInfo = prices[asset.ticker];
		if (priceInfo && priceInfo.ter !== undefined && priceInfo.ter > 0 && asset.ter === 0) {
			updated = true;
			return { ...asset, ter: priceInfo.ter };
		}
		return asset;
	});
	return { assets: result, updated };
}
