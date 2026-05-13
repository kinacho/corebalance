import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';

// Mock YahooFinance
vi.mock('yahoo-finance2', () => {
	return {
		default: class {
			async search(query: string) {
				if (query === 'ERROR') {
					throw new Error('Mocked error');
				}
				if (query === 'EMPTY') {
					return { quotes: [] };
				}
				return {
					quotes: [
						{ symbol: 'AAPL', shortname: 'Apple Inc.', quoteType: 'EQUITY', exchDisp: 'NASDAQ', currency: 'USD' },
						{ symbol: 'BTC-USD', shortname: 'Bitcoin', quoteType: 'CRYPTOCURRENCY', exchange: 'CCC' }
					]
				};
			}
		}
	};
});

describe('Search API', () => {
	const mockGetClientAddress = () => '127.0.0.1';

	it('returns empty results for short queries', async () => {
		const url = new URL('http://localhost/api/search?q=A');
		const response = await GET({ url, getClientAddress: mockGetClientAddress } as any);
		const data = await response.json();
		expect(data.results).toEqual([]);
	});

	it('returns mapped results for valid queries', async () => {
		const url = new URL('http://localhost/api/search?q=Apple');
		const response = await GET({ url, getClientAddress: mockGetClientAddress } as any);
		const data = await response.json();
		expect(data.results).toHaveLength(2);
		expect(data.results[0].ticker).toBe('AAPL');
		expect(data.results[0].type).toBe('Acción');
		expect(data.results[1].type).toBe('Crypto');
	});

	it('handles errors from YahooFinance', async () => {
		const url = new URL('http://localhost/api/search?q=ERROR');
		const response = await GET({ url, getClientAddress: mockGetClientAddress } as any);
		expect(response.status).toBe(500);
		const data = await response.json();
		expect(data.error).toBe('Mocked error');
	});

	it('returns 400 for very long queries', async () => {
		const longQuery = 'A'.repeat(101);
		const url = new URL(`http://localhost/api/search?q=${longQuery}`);
		const response = await GET({ url, getClientAddress: mockGetClientAddress } as any);
		expect(response.status).toBe(400);
	});
});
