import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';

/**
 * ⚠️ Sin este mock, los tests de rate limit hablan con **Upstash de verdad**.
 *
 * `src/lib/server/redis.ts` construye el cliente si hay `KV_REST_API_URL` y
 * `KV_REST_API_TOKEN`, y esas variables están en el `.env` de quien desarrolla. Así
 * que `checkRateLimit` no usaba su fallback en memoria —el que estos tests dan por
 * supuesto— sino contadores reales con TTL de 60 s que **sobreviven entre
 * ejecuciones**. Consecuencias medidas el 7-ago-2026 al repetir la suite:
 *
 *  - Las tres primeras vueltas pasan; a partir de la cuarta empiezan a caer tests
 *    en cadena, porque las claves de la vuelta anterior siguen vivas.
 *  - Los fallos van en las dos direcciones: «espera 429, llega 200» cuando la clave
 *    expira a mitad de las veinte peticiones, y «espera 200, llega 429» cuando el
 *    contador viene cargado de antes.
 *
 * En CI no pasaba y por eso nadie lo veía: `ci.yml` copia `.env.example`, donde esas
 * claves van vacías, así que allí el fallback en memoria sí se usa y todo es
 * determinista. Un test que sólo miente en la máquina del autor es exactamente la
 * clase de señal falsa que este repo lleva persiguiendo.
 *
 * Nota de alcance: con esto la rama de Redis de `checkRateLimit` no se ejercita en
 * ningún sitio — tampoco se ejercitaba en CI. Cubrirla pide inyectar el cliente en
 * vez de importarlo, y `rateLimit.ts` está en la lista de zonas pendientes.
 */
vi.mock('$lib/server/redis', () => ({ redis: null }));

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
				// Escenario para el caso «Yahoo ya lo devuelve»: no debe duplicarse.
				if (query.toLowerCase().includes('growth')) {
					return {
						quotes: [
							{ symbol: 'IE00B2NXKW18', shortname: 'Seilern desde Yahoo', quoteType: 'MUTUALFUND' }
						]
					};
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

	it('returns empty results for missing query param', async () => {
		const url = new URL('http://localhost/api/search');
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

	it('includes exchange and currency in results', async () => {
		const url = new URL('http://localhost/api/search?q=Apple');
		const response = await GET({ url, getClientAddress: mockGetClientAddress } as any);
		const data = await response.json();
		expect(data.results[0].exchange).toBe('NASDAQ');
		expect(data.results[0].currency).toBe('USD');
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

	it('returns 429 when rate limit is exceeded', async () => {
		// Use a unique IP to avoid interference from other tests
		const uniqueIp = () => '10.0.0.99';
		const url = new URL('http://localhost/api/search?q=Apple');
		
		// Send 20 requests (the limit)
		for (let i = 0; i < 20; i++) {
			await GET({ url, getClientAddress: uniqueIp } as any);
		}
		
		// The 21st should be rate limited
		const response = await GET({ url, getClientAddress: uniqueIp } as any);
		expect(response.status).toBe(429);
		const data = await response.json();
		expect(data.error).toMatch(/Demasiadas/);
	});

	it('does not rate limit different IPs', async () => {
		const url = new URL('http://localhost/api/search?q=Apple');
		
		// Use a fresh IP
		const freshIp = () => '192.168.50.1';
		const response = await GET({ url, getClientAddress: freshIp } as any);
		expect(response.status).toBe(200);
	});

	/**
	 * Los fondos que sólo existen en Financial Times se inyectan aquí, y desde ahora
	 * se leen del registro `src/lib/ft-assets.ts` en vez de estar escritos a mano en
	 * este endpoint. Eran cuatro copias del mismo fondo repartidas por el repo —aquí,
	 * en `/api/resolve`, en el propio registro y en un `PURE_FT_TICKERS` que no leía
	 * nadie— y aun así el precio no funcionaba, porque el único sitio que importaba,
	 * `/api/prices`, era justo el que no tenía copia.
	 */
	describe('activos que sólo existen en Financial Times', () => {
		const ISIN = 'IE00B2NXKW18';
		const buscar = async (q: string) => {
			const url = new URL(`http://localhost/api/search?q=${encodeURIComponent(q)}`);
			const r = await GET({ url, getClientAddress: () => '10.7.0.1' } as any);
			return (await r.json()).results as Array<{ ticker: string; name: string }>;
		};

		it('encabeza la lista cuando se busca el ISIN, que es una señal inequívoca', async () => {
			const results = await buscar(ISIN);
			expect(results[0].ticker).toBe(ISIN);
			expect(results[0].name).toContain('Seilern');
		});

		/**
		 * Por nombre va al final a propósito: es un fondo boutique, y quien escribe
		 * «seilern» puede estar buscándolo, pero encabezar la lista por coincidencia de
		 * nombre lo pondría por delante de doce resultados más probables.
		 */
		it('aparece —pero no encabeza— cuando se busca por nombre', async () => {
			const results = await buscar('seilern');
			expect(results.map((r) => r.ticker)).toContain(ISIN);
			expect(results[0].ticker).not.toBe(ISIN);
		});

		it('no se duplica si Yahoo ya lo devuelve', async () => {
			const results = await buscar('growth');
			expect(results.filter((r) => r.ticker === ISIN)).toHaveLength(1);
		});

		it('no se cuela en una búsqueda que no tiene nada que ver', async () => {
			const results = await buscar('Apple');
			expect(results.map((r) => r.ticker)).not.toContain(ISIN);
		});
	});

	it('handles getClientAddress failure gracefully', async () => {
		const url = new URL('http://localhost/api/search?q=Apple');
		const failingGetClientAddress = () => { throw new Error('No IP'); };
		const response = await GET({ url, getClientAddress: failingGetClientAddress } as any);
		// Should not crash — falls back to 127.0.0.1
		expect(response.status).toBe(200);
	});
});
