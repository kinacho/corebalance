import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * ⚠️ **Sin este mock los tests hablan con Upstash de verdad.**
 *
 * `src/lib/server/redis.ts` construye el cliente si hay `KV_REST_API_URL` y
 * `KV_REST_API_TOKEN`, que están en el `.env` de quien desarrolla. Con él, ni el
 * rate limit usa su fallback en memoria ni la caché es la de proceso: son
 * contadores y claves reales que **sobreviven entre ejecuciones**, así que la
 * suite empieza a caer en cascada a partir de la tercera vuelta y los fallos van
 * en las dos direcciones. En CI no se ve, porque `ci.yml` copia `.env.example`
 * con esas claves vacías. Está documentado en Gotchas y aplica a cualquier test
 * que toque un endpoint con rate limit.
 */
vi.mock('$lib/server/redis', () => ({ redis: null }));

const quote = vi.fn();
vi.mock('$lib/server/yahoo', () => ({ yahooFinance: { quote: (...args: unknown[]) => quote(...args) } }));

const { GET } = await import('./+server');

const pedir = async (tickers: string, ip = '127.0.0.1') => {
	const url = new URL(`http://localhost/api/fundamentals?tickers=${tickers}`);
	const res = await GET({ url, getClientAddress: () => ip } as never);
	return res.json();
};

const ACCION = {
	symbol: 'AAPL',
	quoteType: 'EQUITY',
	earningsTimestampStart: 1793000000,
	isEarningsDateEstimate: true,
	dividendRate: 1.04,
	dividendYield: 0.55,
	dividendDate: 1785000000
};

const ETF = {
	symbol: 'IWDA.AS',
	quoteType: 'ETF',
	dividendYield: 1.4,
	trailingThreeMonthReturns: 3.2
};

describe('API de fundamentales', () => {
	beforeEach(() => {
		quote.mockReset();
		quote.mockResolvedValue([ACCION, ETF]);
	});

	it('sin tickers no llama a la fuente', async () => {
		const datos = await pedir('');
		expect(datos.fundamentals).toEqual({});
		expect(quote).not.toHaveBeenCalled();
	});

	/**
	 * Lo que hace barato todo esto: **una sola petición para toda la cartera**.
	 * `quote()` es en bloque, y perder esa propiedad —pidiendo símbolo a símbolo—
	 * multiplicaría por N las llamadas a Yahoo desde una función serverless.
	 */
	it('pide todos los tickers en una única llamada', async () => {
		await pedir('AAPL,IWDA.AS');
		expect(quote).toHaveBeenCalledTimes(1);
		expect(quote.mock.calls[0][0]).toEqual(['AAPL', 'IWDA.AS']);
	});

	it('trae la fecha de resultados de una acción y la marca como aproximada', async () => {
		const datos = await pedir('AAPL,IWDA.AS');
		const accion = datos.fundamentals['AAPL'];

		expect(accion.disponible).toBe(true);
		// Segundos Unix convertidos a milisegundos, no una fecha de 1970.
		expect(accion.proximosResultados).toBe(1793000000 * 1000);
		expect(accion.resultadosEsAproximado).toBe(true);
		expect(new Date(accion.proximosResultados).getFullYear()).toBeGreaterThan(2020);
	});

	/**
	 * ⚠️ Un fondo o un ETF **no presentan resultados**: no es un dato que falte, es
	 * una pregunta que no aplica. Si esto devolviera una fecha, la interfaz
	 * dibujaría una sección entera de algo que no existe.
	 */
	it('un ETF no trae fecha de resultados aunque la fuente mandara una', async () => {
		quote.mockResolvedValue([{ ...ETF, earningsTimestampStart: 1793000000 }]);
		const datos = await pedir('IWDA.AS');

		expect(datos.fundamentals['IWDA.AS'].disponible).toBe(true);
		expect(datos.fundamentals['IWDA.AS'].proximosResultados).toBeNull();
	});

	/**
	 * ⚠️ `dividendYield` llega unas veces en tanto por ciento (1,4) y otras en
	 * tanto por uno (0,014). Sin normalizar, la misma cartera enseña «1,4 %» o
	 * «140 %» según el activo, y ninguna de las dos avisa de nada.
	 */
	it('normaliza la rentabilidad por dividendo a fracción, venga como venga', async () => {
		quote.mockResolvedValue([
			{ symbol: 'A', quoteType: 'ETF', dividendYield: 1.4 },
			{ symbol: 'B', quoteType: 'ETF', dividendYield: 0.014 }
		]);
		const datos = await pedir('A,B');

		expect(datos.fundamentals['A'].rentabilidadPorDividendo).toBeCloseTo(0.014, 6);
		expect(datos.fundamentals['B'].rentabilidadPorDividendo).toBeCloseTo(0.014, 6);
	});

	/**
	 * Los activos de `ft-assets.ts` no están en Yahoo. Tienen que degradar limpio y
	 * **no llegar siquiera a la llamada**: son el único camino que valora esas
	 * posiciones y no tienen ningún fallback por debajo.
	 */
	it('un activo solo de FT degrada a no disponible sin preguntar a la fuente', async () => {
		const datos = await pedir('IE00B2NXKW18');

		expect(datos.fundamentals['IE00B2NXKW18']).toEqual({ disponible: false });
		expect(quote).not.toHaveBeenCalled();
	});

	it('un ticker que la fuente no devuelve queda como no disponible, no ausente', async () => {
		quote.mockResolvedValue([ACCION]);
		const datos = await pedir('AAPL,NOEXISTE');

		expect(datos.fundamentals['NOEXISTE']).toEqual({ disponible: false });
	});

	/**
	 * ⚠️ **Cada caso usa su propio ticker a partir de aquí, y no es manía.** La
	 * caché de proceso vive en el módulo y no se reinicia entre pruebas, así que
	 * reutilizar `AAPL` hacía que estos dos casos leyeran lo que dejó ahí un caso
	 * anterior: el del fallo de la fuente pasaba sin llegar a la fuente, y el de la
	 * caché contaba cero llamadas porque ya estaba cacheado. Dependían del orden.
	 */
	it('si la fuente falla responde sin datos en vez de romper', async () => {
		quote.mockRejectedValue(new Error('Yahoo caído'));
		const datos = await pedir('FALLA1');

		expect(datos.fundamentals['FALLA1']).toEqual({ disponible: false });
	});

	it('corta a los 429 cuando se pasa del límite', async () => {
		const ip = '10.0.0.99';
		let ultima;
		for (let i = 0; i < 12; i++) ultima = await pedir('LIMITE1', ip);
		expect(ultima.error).toBeTruthy();
	});

	/**
	 * La caché es lo que hace que un TTL de 24 h tenga sentido: la segunda petición
	 * del mismo ticker no vuelve a preguntar. Dos IP distintas para que lo que se
	 * mida sea la caché y no el rate limit.
	 */
	it('la segunda petición del mismo ticker sale de la caché', async () => {
		quote.mockResolvedValue([{ symbol: 'CACHE1', quoteType: 'ETF', dividendYield: 1.1 }]);
		await pedir('CACHE1', '10.0.0.1');
		await pedir('CACHE1', '10.0.0.2');
		expect(quote).toHaveBeenCalledTimes(1);
	});
});
