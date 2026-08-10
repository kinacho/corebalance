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
import { FT_ONLY_ASSETS } from '$lib/ft-assets';

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
const pedir = (tickers?: string, extra = '') => {
	const url = new URL(`http://localhost/api/prices${tickers ? `?tickers=${tickers}` : ''}${extra}`);
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

	/**
	 * Desde cuándo se le piden cierres a Yahoo, que es **lo que de verdad limita el histórico
	 * del patrimonio**.
	 *
	 * ⚠️ Estaba anclado al 20 de diciembre del año anterior, y eso tenía dos efectos. El que
	 * se vio: pedir `historyDays=400` devolvía **149 puntos** en producción, porque el recorte
	 * de salida no puede inventar días que nunca se pidieron. Y el grave, que sólo se nota en
	 * una fecha concreta: **cada 1 de enero el histórico de todo el mundo se encogía a dos
	 * semanas**, porque el ancla se movía al 20 de diciembre recién pasado.
	 */
	describe('rango que se le pide a Yahoo', () => {
		const period1De = (llamada = 0) => chart.mock.calls[llamada][1].period1 as Date;
		const diasAtras = (fecha: Date) => Math.round((Date.now() - fecha.getTime()) / 86400000);

		it('sin historyDays llega al menos al 20 de diciembre del año anterior', async () => {
			await pedir('RANGOA.DE');

			const dic20 = new Date(Date.UTC(new Date().getUTCFullYear() - 1, 11, 20));
			expect(period1De().getTime()).toBeLessThanOrEqual(dic20.getTime());
		});

		it('con historyDays pide tantos días hacia atrás como se le piden', async () => {
			await pedir('RANGOB.DE', '&historyDays=500');

			// Con margen de un día por el redondeo de husos.
			expect(diasAtras(period1De())).toBeGreaterThanOrEqual(499);
		});

		/**
		 * El caso de enero, escrito como una relación entre las dos fechas para que no dependa
		 * de cuándo se ejecute la suite: pedir año y medio tiene que ir **más atrás** que el
		 * ancla del YTD, y no quedarse en ella.
		 */
		it('un año y medio de libro no se queda en el ancla del YTD', async () => {
			await pedir('RANGOC.DE', '&historyDays=550');

			const dic20 = new Date(Date.UTC(new Date().getUTCFullYear() - 1, 11, 20));
			expect(period1De().getTime()).toBeLessThan(dic20.getTime());
		});

		it('el techo se respeta también en el rango, no sólo en el recorte', async () => {
			await pedir('RANGOD.DE', '&historyDays=99999');

			// 550 días es el máximo que sirve `diasDeHistorialPedidos`.
			expect(diasAtras(period1De())).toBeLessThanOrEqual(551);
		});

		/**
		 * ⚠️ **Una entrada de caché que no cubre lo pedido tiene que contar como fallo**, o el
		 * arreglo del rango no sirve de nada. Medido en producción: con la caché caliente,
		 * `historyDays=550` devolvía 149 puntos de un ticker y 383 de otro, y la única
		 * diferencia era quién la había llenado antes.
		 *
		 * No es un borde: el sondeo pide el rango corto **cada 30 segundos** y la petición larga
		 * se hace una vez al cargar, así que la entrada corta es la norma.
		 */
		it('una caché corta no sirve una petición larga: se vuelve a preguntar', async () => {
			// Primera vuelta con el rango por defecto: deja la entrada corta.
			await pedir('CACHE1.DE');
			expect(chart).toHaveBeenCalledTimes(1);

			// Ahora se pide año y medio: no vale lo que hay guardado.
			await pedir('CACHE1.DE', '&historyDays=550');
			expect(chart).toHaveBeenCalledTimes(2);
			expect(diasAtras(period1De(1))).toBeGreaterThanOrEqual(549);
		});

		/**
		 * Y el simétrico, que es lo que evita una llamada a Yahoo cada treinta segundos: una
		 * entrada pedida a lo grande vale para cualquier petición más corta. Se compara contra
		 * los días **pedidos**, no contra la longitud de la serie — si a Yahoo se le piden 550
		 * días de un fondo con 229 cierres, la serie nunca alcanzará 550.
		 */
		it('una caché larga sí sirve una petición corta, sin volver a preguntar', async () => {
			await pedir('CACHE2.DE', '&historyDays=550');
			expect(chart).toHaveBeenCalledTimes(1);

			await pedir('CACHE2.DE');
			expect(chart).toHaveBeenCalledTimes(1);
		});
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

	/**
	 * Fondos que sólo existen en Financial Times, con el ISIN haciendo de ticker.
	 *
	 * ⚠️ Este bloque no existía y su ausencia dejaba la función rota a medias, de la
	 * peor manera posible: `/api/search` y `/api/resolve` ya sabían encontrar estos
	 * ISIN, así que se podían buscar, resolver y meter en la cartera — y entonces el
	 * precio se le pedía a Yahoo, que no los tiene. Poder añadir algo que la app no
	 * sabe valorar es peor que no poder añadirlo.
	 */
	describe('fondos que sólo existen en Financial Times', () => {
		const ISIN = Object.keys(FT_ONLY_ASSETS)[0];

		it('coge el precio de FT y no se lo pide a Yahoo', async () => {
			fetchFTPrice.mockResolvedValue({ price: 463.15, change: -0.18 });
			const { prices, errors } = await (await pedir(ISIN)).json();

			expect(prices[ISIN]).toMatchObject({
				price: 463.15,
				change: -0.18,
				currency: FT_ONLY_ASSETS[ISIN].currency,
				name: FT_ONLY_ASSETS[ISIN].name
			});
			expect(errors).toEqual([]);
			// Preguntarle a Yahoo por este ISIN sólo puede devolver un error.
			expect(quote.mock.calls[0][0]).not.toContain(ISIN);
		});

		/**
		 * Sin red de seguridad: los de `RELIABLE_FT_MAPPINGS` caen a Yahoo si FT cambia
		 * su maquetación, éstos no tienen debajo a nadie. Lo que no puede pasar es que
		 * el activo desaparezca en silencio, que era el defecto de esta misma mañana.
		 */
		it('si FT no da precio, lo dice en errores en vez de callarse', async () => {
			fetchFTPrice.mockResolvedValue(null);
			const { prices, errors } = await (await pedir(ISIN)).json();

			expect(prices[ISIN]).toBeUndefined();
			expect(errors.join(' ')).toContain(ISIN);
			expect(errors.join(' ')).toContain(FT_ONLY_ASSETS[ISIN].name);
		});

		it('no estorba a los tickers normales de la misma petición', async () => {
			fetchFTPrice.mockResolvedValue({ price: 463.15, change: -0.18 });
			const { prices, errors } = await (await pedir(`${ISIN},VWCE.DE`)).json();

			expect(prices[ISIN].price).toBe(463.15);
			expect(prices['VWCE.DE'].price).toBe(100);
			expect(errors).toEqual([]);
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
