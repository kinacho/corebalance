import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * ⚠️ Redis a null, o estos tests hablan con Upstash de verdad y el rate limit
 * arrastra contadores entre ejecuciones. Documentado en los Gotchas de `CLAUDE.md`.
 */
vi.mock('$lib/server/redis', () => ({ redis: null }));

const search = vi.fn();
vi.mock('$lib/server/yahoo', () => ({
	yahooFinance: { search: (...a: any[]) => search(...a) }
}));

import { POST } from './+server';
import { FT_ONLY_ASSETS } from '$lib/ft-assets';

/**
 * Este endpoint es el que convierte los ISIN de un extracto de bróker en tickers al
 * importar un CSV, así que es la puerta por la que entra media cartera. No tenía
 * ningún test, y la rama de los fondos que sólo existen en Financial Times llevaba
 * el ISIN escrito a mano — una de las cuatro copias que había repartidas del mismo
 * fondo. Ahora lee el registro.
 */
let n = 0;
const resolver = (body: unknown) =>
	POST({
		request: new Request('http://localhost/api/resolve', {
			method: 'POST',
			body: JSON.stringify(body)
		}),
		getClientAddress: () => `10.6.0.${++n}`
	} as any);

beforeEach(() => {
	search.mockReset();
	search.mockResolvedValue({ quotes: [] });
});

describe('POST /api/resolve', () => {
	const ISIN = Object.keys(FT_ONLY_ASSETS)[0];

	it('resuelve un fondo solo-FT a sí mismo, sin preguntarle a Yahoo', async () => {
		const { resolved } = await (await resolver({ isins: [ISIN] })).json();

		expect(resolved).toHaveLength(1);
		expect(resolved[0]).toMatchObject({
			query: ISIN,
			ticker: ISIN,
			name: FT_ONLY_ASSETS[ISIN].name,
			exchange: 'Financial Times'
		});
		// Yahoo no tiene ese ISIN: preguntarle sólo puede gastar una petición y fallar.
		expect(search).not.toHaveBeenCalled();
	});

	it('lo reconoce aunque venga en minúsculas o con espacios, como sale de un CSV', async () => {
		const { resolved } = await (await resolver({ isins: [`  ${ISIN.toLowerCase()} `] })).json();
		expect(resolved[0].ticker).toBe(ISIN);
		expect(search).not.toHaveBeenCalled();
	});

	it('un ISIN normal sí va a Yahoo', async () => {
		search.mockResolvedValue({
			quotes: [{ symbol: 'VWCE.DE', longname: 'Vanguard FTSE All-World', quoteType: 'ETF' }]
		});
		const { resolved } = await (await resolver({ isins: ['IE00BK5BQT80'] })).json();

		expect(search).toHaveBeenCalled();
		expect(resolved[0].ticker).toBe('VWCE.DE');
	});

	it('devuelve una lista vacía si no le mandan nada', async () => {
		const { resolved } = await (await resolver({})).json();
		expect(resolved).toEqual([]);
	});

	it('rechaza un cuerpo que no es JSON', async () => {
		const r = await POST({
			request: new Request('http://localhost/api/resolve', { method: 'POST', body: 'no soy json' }),
			getClientAddress: () => '10.6.9.9'
		} as any);
		expect(r.status).toBe(400);
	});
});
