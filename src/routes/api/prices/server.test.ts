import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * ⚠️ Redis a null antes de nada, o estos tests hablan con Upstash de verdad: el
 * `.env` de desarrollo trae las claves KV, y entonces tanto el rate limit como la
 * caché de históricos usan contadores reales con TTL que **sobreviven entre
 * ejecuciones**. Está documentado en los Gotchas de `CLAUDE.md`; aquí además haría
 * que la caché de un test contaminara al siguiente.
 */
vi.mock('$lib/server/redis', () => ({ redis: null }));

const quote = vi.fn();
const chart = vi.fn();
vi.mock('$lib/server/yahoo', () => ({ yahooFinance: { quote: (...a: any[]) => quote(...a), chart: (...a: any[]) => chart(...a) } }));

const fetchFTPrice = vi.fn();
vi.mock('./priceHelpers', async (importOriginal) => ({
	...(await importOriginal<typeof import('./priceHelpers')>()),
	fetchFTPrice: (...a: any[]) => fetchFTPrice(...a)
}));

import { GET } from './+server';

/** Una cotización de Yahoo con lo mínimo que el endpoint lee. */
const cotizacion = (symbol: string, extra: Record<string, unknown> = {}) => ({
	symbol,
	regularMarketPrice: 100,
	regularMarketChangePercent: 1.5,
	regularMarketPreviousClose: 98.5,
	currency: 'EUR',
	shortName: `Nombre de ${symbol}`,
	marketState: 'REGULAR',
	...extra
});

/** Los siete pares de divisas que el endpoint añade siempre. */
const PARES = ['BTC-EUR', 'EURUSD=X', 'EURCAD=X', 'EURGBP=X', 'EURCHF=X', 'EURAUD=X', 'EURJPY=X'];

const historicoSano = { quotes: [{ date: '2026-08-01T00:00:00Z', close: 99 }] };

let n = 0;
/** IP distinta por test: el limitador son 30 por minuto y aquí se hacen muchas llamadas. */
const pedir = (tickers?: string) => {
	const url = new URL(`http://localhost/api/prices${tickers ? `?tickers=${tickers}` : ''}`);
	const ip = `10.9.0.${++n}`;
	return GET({ url, getClientAddress: () => ip } as any);
};

beforeEach(() => {
	quote.mockReset();
	chart.mockReset();
	fetchFTPrice.mockReset();
	chart.mockResolvedValue(historicoSano);
	fetchFTPrice.mockResolvedValue(null);
	quote.mockImplementation(async (tickers: string[]) => tickers.map((t) => cotizacion(t)));
});

describe('GET /api/prices', () => {
	it('siempre pide los pares de divisas, aunque el usuario no pida nada', async () => {
		await pedir();
		expect(quote).toHaveBeenCalledTimes(1);
		expect(quote.mock.calls[0][0]).toEqual(expect.arrayContaining(PARES));
	});

	it('resuelve los tickers de efectivo sin preguntarle a Yahoo por ellos', async () => {
		const r = await pedir('CASH-DEP,VWCE.DE');
		const { prices } = await r.json();

		expect(prices['CASH-DEP']).toMatchObject({ price: 1.0, currency: 'EUR', change: 0 });
		expect(quote.mock.calls[0][0]).not.toContain('CASH-DEP');
	});

	it('rechaza una petición con más tickers de los permitidos', async () => {
		const muchos = Array.from({ length: 51 }, (_, i) => `T${i}.DE`).join(',');
		const r = await pedir(muchos);
		expect(r.status).toBe(400);
		expect((await r.json()).error).toMatch(/Máximo 50/);
	});

	/**
	 * Los tickers con formato inválido se descartan **en silencio**. Queda fijado
	 * porque es una decisión con consecuencia visible: quien tenga un ticker con un
	 * carácter raro no verá ni su precio ni un error que lo explique. Cambiarlo a
	 * error es defendible; lo que no vale es cambiarlo sin darse cuenta.
	 */
	it('descarta en silencio los tickers con formato inválido', async () => {
		await pedir('VWCE.DE,esto es inválido,<script>');
		const pedidos = quote.mock.calls[0][0];
		expect(pedidos).toContain('VWCE.DE');
		expect(pedidos.some((t: string) => t.includes('<'))).toBe(false);
	});

	it('propaga un fallo general de Yahoo como 500 y no como una respuesta vacía', async () => {
		quote.mockRejectedValue(new Error('Yahoo caído'));
		const r = await pedir('VWCE.DE');
		expect(r.status).toBe(500);
		expect((await r.json()).errors.join(' ')).toContain('Yahoo caído');
	});

	it('aplica la corrección de subunidades de punta a punta', async () => {
		quote.mockImplementation(async (tickers: string[]) =>
			tickers.map((t) =>
				t === 'VOD.L' ? cotizacion(t, { regularMarketPrice: 12345, currency: 'GBp' }) : cotizacion(t)
			)
		);
		const { prices } = await (await pedir('VOD.L')).json();

		expect(prices['VOD.L'].price).toBeCloseTo(123.45, 6);
		expect(prices['VOD.L'].currency).toBe('GBP');
	});

	it('el precio de Financial Times manda sobre el de Yahoo cuando hay mapeo', async () => {
		fetchFTPrice.mockResolvedValue({ price: 12.27, change: -0.16 });
		const { prices } = await (await pedir('0P0001XF40.F')).json();

		expect(prices['0P0001XF40.F'].price).toBe(12.27);
		expect(prices['0P0001XF40.F'].change).toBe(-0.16);
		expect(fetchFTPrice).toHaveBeenCalledWith('IE000ZYRH0Q7');
	});

	it('si Financial Times no responde, se queda con Yahoo en vez de quedarse sin precio', async () => {
		fetchFTPrice.mockResolvedValue(null);
		const { prices } = await (await pedir('0P0001XF3Z.F')).json();
		expect(prices['0P0001XF3Z.F'].price).toBe(100);
	});

	/**
	 * Yahoo devuelve 0 en la variación de muchos fondos no cotizados. El endpoint la
	 * reconstruye con el cierre anterior, que es la diferencia entre enseñar «0,00 %»
	 * todos los días y enseñar el dato real.
	 */
	it('reconstruye la variación diaria cuando Yahoo la da a cero', async () => {
		quote.mockImplementation(async (tickers: string[]) =>
			tickers.map((t) =>
				t === 'FONDO.F'
					? cotizacion(t, {
							regularMarketChangePercent: 0,
							regularMarketPrice: 110,
							regularMarketPreviousClose: 100
						})
					: cotizacion(t)
			)
		);
		const { prices } = await (await pedir('FONDO.F')).json();
		expect(prices['FONDO.F'].change).toBeCloseTo(10, 6);
	});

	it('convierte el TER de Yahoo de porcentaje a fracción', async () => {
		quote.mockImplementation(async (tickers: string[]) =>
			tickers.map((t) => (t === 'VWCE.DE' ? cotizacion(t, { netExpenseRatio: 0.22 }) : cotizacion(t)))
		);
		const { prices } = await (await pedir('VWCE.DE')).json();
		expect(prices['VWCE.DE'].ter).toBeCloseTo(0.0022, 8);
	});

	describe('un ticker sin cotización', () => {
		/** Yahoo responde, pero se deja fuera el símbolo pedido. */
		const sinEseSimbolo = (ausente: string) =>
			quote.mockImplementation(async (tickers: string[]) =>
				tickers.filter((t) => t !== ausente).map((t) => cotizacion(t))
			);

		it('se reporta como error con la caché fría', async () => {
			sinEseSimbolo('FANTASMA.DE');
			const { prices, errors } = await (await pedir('FANTASMA.DE')).json();

			expect(prices['FANTASMA.DE']).toBeUndefined();
			expect(errors.join(' ')).toContain('FANTASMA.DE');
		});

		/**
		 * ⚠️ El defecto que motivó este fichero. Con la caché de históricos caliente,
		 * el mismo fallo **desaparecía**: ni precio ni error, el activo se esfumaba de
		 * la respuesta. Y si la caché estaba fría, sí salía el error. El usuario no
		 * controla ni puede observar ese estado, así que el mismo problema se contaba
		 * de dos maneras según el azar.
		 *
		 * El test hace dos peticiones: la primera va bien y deja el histórico en caché;
		 * en la segunda Yahoo ya no devuelve el símbolo.
		 */
		it('se reporta igual con la caché caliente, que antes lo silenciaba', async () => {
			const r1 = await pedir('CALIENTE.DE');
			expect((await r1.json()).prices['CALIENTE.DE']).toBeDefined();

			sinEseSimbolo('CALIENTE.DE');
			const { prices, errors } = await (await pedir('CALIENTE.DE')).json();

			expect(prices['CALIENTE.DE']).toBeUndefined();
			expect(errors.join(' ')).toContain('CALIENTE.DE');
		});
	});

	it('corta con 429 al superar el límite por minuto', async () => {
		const url = new URL('http://localhost/api/prices?tickers=VWCE.DE');
		const ip = () => '10.9.9.99';
		for (let i = 0; i < 30; i++) await GET({ url, getClientAddress: ip } as any);

		const r = await GET({ url, getClientAddress: ip } as any);
		expect(r.status).toBe(429);
		expect((await r.json()).error).toMatch(/Demasiadas/);
	});
});
