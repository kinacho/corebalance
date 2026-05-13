import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, isMarketOpen, validateImportData } from './utils';

describe('utils.ts', () => {
	describe('formatCurrency', () => {
		it('formats EUR correctly', () => {
			expect(formatCurrency(1234.56)).toMatch(/1\.?234,56\s*€/);
		});
		it('formats USD correctly', () => {
			expect(formatCurrency(1234.56, 'USD')).toMatch(/\$1,234\.56/);
		});
		it('handles zero correctly', () => {
			expect(formatCurrency(0)).toMatch(/0,00\s*€/);
		});
	});

	describe('formatPercent', () => {
		it('formats decimals into percentages', () => {
			expect(formatPercent(0.1234)).toBe('12.34%');
		});
		it('handles zero', () => {
			expect(formatPercent(0)).toBe('0.00%');
		});
	});

	describe('isMarketOpen', () => {
		it('returns true if marketState is REGULAR', () => {
			expect(isMarketOpen('AAPL', 'REGULAR')).toBe(true);
		});
		it('returns false if marketState is CLOSED', () => {
			expect(isMarketOpen('AAPL', 'CLOSED')).toBe(false);
		});
		it('always returns true for crypto', () => {
			expect(isMarketOpen('BTC-USD')).toBe(true);
		});
	});

	describe('validateImportData', () => {
		it('returns true for valid data', () => {
			expect(validateImportData({ userData: [{ id: '1' }] })).toBe(true);
			expect(validateImportData({ history: [] })).toBe(true);
		});
		it('returns false for invalid data', () => {
			expect(validateImportData(null)).toBe(false);
			expect(validateImportData({})).toBe(false);
			expect(validateImportData({ userData: [{ no_id: '1' }] })).toBe(false);
		});
	});
});
