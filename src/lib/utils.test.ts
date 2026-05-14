import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, formatShares, formatDate, formatDateTime, isMarketOpen, validateImportData } from './utils';

describe('utils.ts', () => {

	describe('formatCurrency', () => {
		it('formats EUR correctly', () => {
			expect(formatCurrency(1234.56)).toMatch(/1\.?234,56\s*€/);
		});
		it('formats USD correctly', () => {
			expect(formatCurrency(1234.56, 'USD')).toMatch(/\$1,234\.56/);
		});
		it('formats GBP correctly', () => {
			expect(formatCurrency(1234.56, 'GBP')).toMatch(/£1,234\.56/);
		});
		it('handles zero correctly', () => {
			expect(formatCurrency(0)).toMatch(/0,00\s*€/);
		});
		it('handles negative values', () => {
			const result = formatCurrency(-500.50);
			expect(result).toMatch(/500,50/);
			expect(result).toMatch(/-/);
		});
		it('handles very large numbers', () => {
			const result = formatCurrency(1234567.89);
			expect(result).toMatch(/1\.?234\.?567,89/);
		});
		it('respects custom decimal places', () => {
			const result = formatCurrency(123.456, 'EUR', 3);
			expect(result).toMatch(/123,456/);
		});
	});

	describe('formatPercent', () => {
		it('formats decimals into percentages', () => {
			expect(formatPercent(0.1234)).toBe('12.34%');
		});
		it('handles zero', () => {
			expect(formatPercent(0)).toBe('0.00%');
		});
		it('handles negative values', () => {
			expect(formatPercent(-0.05)).toBe('-5.00%');
		});
		it('respects custom decimal places', () => {
			expect(formatPercent(0.12345, 3)).toBe('12.345%');
		});
		it('handles values greater than 1 (100%+)', () => {
			expect(formatPercent(1.5)).toBe('150.00%');
		});
	});

	describe('formatShares', () => {
		it('formats zero as "0"', () => {
			expect(formatShares(0)).toBe('0');
		});
		it('removes trailing zeros', () => {
			expect(formatShares(10.100)).toBe('10.1');
		});
		it('formats whole numbers without decimals', () => {
			expect(formatShares(5)).toBe('5');
		});
		it('keeps up to 3 decimal places', () => {
			expect(formatShares(1.234)).toBe('1.234');
		});
	});

	describe('formatDate', () => {
		it('formats as YYYY-MM-DD', () => {
			const date = new Date('2024-03-15T12:00:00Z');
			expect(formatDate(date)).toBe('2024-03-15');
		});
		it('returns today when no arg', () => {
			const result = formatDate();
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});
	});

	describe('formatDateTime', () => {
		it('formats as DD/MM HH:mm', () => {
			const result = formatDateTime('2024-03-15T14:30:00');
			expect(result).toMatch(/15\/?0?3/);
			expect(result).toMatch(/14:30/);
		});
		it('accepts Date objects', () => {
			const result = formatDateTime(new Date('2024-12-25T09:15:00'));
			expect(result).toMatch(/25\/?12/);
		});
		it('accepts timestamps', () => {
			const ts = new Date('2024-06-01T10:00:00').getTime();
			const result = formatDateTime(ts);
			expect(result).toMatch(/0?1\/?0?6/);
		});
	});

	describe('isMarketOpen', () => {
		it('returns true if marketState is REGULAR', () => {
			expect(isMarketOpen('AAPL', 'REGULAR')).toBe(true);
		});
		it('returns false if marketState is CLOSED', () => {
			expect(isMarketOpen('AAPL', 'CLOSED')).toBe(false);
		});
		it('returns false if marketState is POST', () => {
			expect(isMarketOpen('AAPL', 'POST')).toBe(false);
		});
		it('returns false if marketState is PRE', () => {
			expect(isMarketOpen('AAPL', 'PRE')).toBe(false);
		});
		it('always returns true for crypto tickers', () => {
			expect(isMarketOpen('BTC-USD')).toBe(true);
			expect(isMarketOpen('ETH-EUR')).toBe(true);
			expect(isMarketOpen('SOL-USD')).toBe(true);
		});
		it('identifies European market tickers', () => {
			// With a known state, these should respect the state
			expect(isMarketOpen('IWDA.AS', 'REGULAR')).toBe(true);
			expect(isMarketOpen('0P0001XF40.F', 'CLOSED')).toBe(false);
		});
	});

	describe('validateImportData', () => {
		it('returns true for valid data with userData', () => {
			expect(validateImportData({ userData: [{ id: '1' }] })).toBe(true);
		});
		it('returns true for valid data with history', () => {
			expect(validateImportData({ history: [] })).toBe(true);
		});
		it('returns true for valid data with both', () => {
			expect(validateImportData({ userData: [{ id: '1' }], history: [{ id: '1', points: [] }] })).toBe(true);
		});
		it('returns false for null', () => {
			expect(validateImportData(null)).toBe(false);
		});
		it('returns false for undefined', () => {
			expect(validateImportData(undefined)).toBe(false);
		});
		it('returns false for empty object', () => {
			expect(validateImportData({})).toBe(false);
		});
		it('returns false for non-object', () => {
			expect(validateImportData('string')).toBe(false);
			expect(validateImportData(42)).toBe(false);
		});
		it('returns false for userData records missing id', () => {
			expect(validateImportData({ userData: [{ no_id: '1' }] })).toBe(false);
		});
		it('returns false for userData that is not an array', () => {
			expect(validateImportData({ userData: 'not_array' })).toBe(false);
		});
	});
});
