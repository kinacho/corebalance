import { describe, it, expect, vi } from 'vitest';
import {
	parseFTPriceHtml,
	fetchFTPrice,
	correctSubunitCurrencies,
	calculateHistoricalMetrics,
	RELIABLE_FT_MAPPINGS,
	diasDeHistorialPedidos
} from './priceHelpers';

/**
 * Esta zona no tenía ni un test, y es donde un fallo silencioso sale más caro: un
 * precio malo no da error en ninguna parte, se convierte en una desviación mal
 * calculada y acaba siendo un consejo de rebalanceo equivocado. Nada más arriba en
 * la cadena puede detectarlo.
 *
 * Lo frágil del scraper de FT no es la red, son los regex: FT puede recolocar su
 * maquetación cualquier día y el scraper caería a Yahoo sin decir nada. Por eso el
 * parseo se prueba como función pura, con HTML.
 */

/**
 * Marcado **real** de la ficha de FT, recortado de
 * `markets.ft.com/data/funds/tearsheet/summary?s=IE000ZYRH0Q7:EUR`
 * el **7-ago-2026**. Se conserva literal —con sus tooltips y su `<i>` del icono en
 * medio— porque el valor del fixture está justo en lo que uno no inventaría: el
 * cambio no vive en un atributo limpio, sino como texto suelto «-0.02 / -0.16%»
 * dentro de dos spans anidados.
 *
 * Si algún día estos tests fallan de golpe, lo primero que hay que mirar es si FT
 * cambió la página; y entonces hay que volver a capturarlo y **fechar la captura**.
 */
const FICHA_FT_REAL =
	`<li><span class="mod-ui-data-list__label" data-toggle="tooltipster" title="Per Share, this price ` +
	`of an open ended fund is calculated at the end of the day.">Price (EUR)</span>` +
	`<span class="mod-ui-data-list__value">12.27</span></li>` +
	`<li><span class="mod-ui-data-list__label" data-toggle="tooltipster" title="Change in most recent ` +
	`price (or NAV) compared to the previous session value.">Today's Change</span>` +
	`<span class="mod-ui-data-list__value"><span class="mod-format--neg">` +
	`<i class="o-ft-icons-icon o-ft-icons-icon--arrow-downwards"></i>-0.02 / -0.16%</span></span></li>`;

describe('parseFTPriceHtml', () => {
	it('saca precio y variación de la ficha real de FT', () => {
		expect(parseFTPriceHtml(FICHA_FT_REAL)).toEqual({ price: 12.27, change: -0.16 });
	});

	it('entiende el separador de miles, que es lo que rompe un parseFloat ingenuo', () => {
		const html = FICHA_FT_REAL.replace('>12.27<', '>1,234.56<');
		expect(parseFTPriceHtml(html)?.price).toBe(1234.56);
	});

	it('conserva el signo de una subida', () => {
		const html = FICHA_FT_REAL.replace('-0.02 / -0.16%', '0.21 / 1.89%');
		expect(parseFTPriceHtml(html)?.change).toBe(1.89);
	});

	/**
	 * El caso que de verdad importa: FT cambia la maquetación y el scraper deja de
	 * reconocer nada. Tiene que devolver `null` —que es lo que hace al endpoint
	 * quedarse con Yahoo— y no un precio inventado ni un 0 que pareciera un precio.
	 */
	it('devuelve null cuando no reconoce el bloque de precio, en vez de inventarse uno', () => {
		expect(parseFTPriceHtml('<html><body>FT ha rehecho la página</body></html>')).toBeNull();
		expect(parseFTPriceHtml('')).toBeNull();
	});

	it('rechaza un precio de cero, que no es un precio', () => {
		expect(parseFTPriceHtml(FICHA_FT_REAL.replace('>12.27<', '>0.00<'))).toBeNull();
	});

	it('si reconoce el precio pero no la variación, la deja en 0 y no descarta el precio', () => {
		const html = FICHA_FT_REAL.replace(`<i class="o-ft-icons-icon o-ft-icons-icon--arrow-downwards"></i>-0.02 / -0.16%`, 'n/a');
		expect(parseFTPriceHtml(html)).toEqual({ price: 12.27, change: 0 });
	});

	/**
	 * Este test no comprueba código: comprueba el **motivo** por el que se borró la
	 * extracción de YTD. Buscaba «Year to date» en una página donde esa frase no
	 * existe —FT publica el rendimiento en `/tearsheet/performance`, y el scraper pide
	 * `/tearsheet/summary`—, así que devolvía `undefined` siempre y la rama del
	 * endpoint que lo consumía era código muerto. Si alguien vuelve a añadirla
	 * apuntando a esta misma página, esto le recuerda por qué no va a funcionar.
	 */
	it('la ficha de resumen de FT no contiene rendimiento anual: por eso no se extrae', () => {
		expect(FICHA_FT_REAL).not.toContain('Year to date');
		expect(FICHA_FT_REAL).not.toContain('YTD');
		expect(parseFTPriceHtml(FICHA_FT_REAL)).not.toHaveProperty('ytd');
	});
});

describe('fetchFTPrice', () => {
	const respuesta = (body: string, ok = true) =>
		({ ok, text: async () => body }) as unknown as Response;

	it('delega el parseo en el HTML que le devuelven', async () => {
		const fake = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
			respuesta(FICHA_FT_REAL)
		);
		await expect(fetchFTPrice('IE000ZYRH0Q7', fake as unknown as typeof fetch)).resolves.toEqual({
			price: 12.27,
			change: -0.16
		});
		expect(fake.mock.calls[0][0]).toContain('IE000ZYRH0Q7:EUR');
	});

	it('devuelve null si FT responde con error, sin reventar la petición entera', async () => {
		const fake = vi.fn(async () => respuesta('', false));
		await expect(fetchFTPrice('X', fake as unknown as typeof fetch)).resolves.toBeNull();
	});

	/**
	 * Un timeout de FT no puede tumbar la respuesta de precios: el endpoint pide varios
	 * ISIN en paralelo y una excepción que se propague se llevaría por delante los
	 * precios de Yahoo que sí llegaron.
	 */
	it('se traga la excepción de red y devuelve null', async () => {
		const fake = vi.fn(async () => {
			throw new Error('AbortError: se agotó el tiempo');
		});
		await expect(fetchFTPrice('X', fake as unknown as typeof fetch)).resolves.toBeNull();
	});
});

describe('correctSubunitCurrencies', () => {
	it('convierte peniques a libras, en el precio y en toda la sparkline', () => {
		const r = correctSubunitCurrencies(12345, [12300, 12400], 'GBp');
		expect(r).toEqual({ price: 123.45, sparkline: [123, 124], currency: 'GBP' });
	});

	it.each([
		['ZAc', 'ZAR'],
		['USc', 'USD'],
		['EUc', 'EUR'],
		['IEp', 'EUR']
	])('reconoce %s como subunidad de %s', (subunidad, base) => {
		const r = correctSubunitCurrencies(200, [100], subunidad);
		expect(r.currency).toBe(base);
		expect(r.price).toBe(2);
	});

	/**
	 * El control negativo de la heurística: la regla mira una `p` **minúscula**, así
	 * que la divisa de verdad no puede caer en ella. Sin este caso, un cambio que
	 * pasara la comparación a insensible a mayúsculas dividiría entre 100 todas las
	 * carteras en libras y nadie se enteraría hasta ver los números.
	 */
	it('no toca GBP, que es la divisa de verdad y no la subunidad', () => {
		const r = correctSubunitCurrencies(150, [140, 160], 'GBP');
		expect(r).toEqual({ price: 150, sparkline: [140, 160], currency: 'GBP' });
	});

	it('deja intacta una divisa normal', () => {
		expect(correctSubunitCurrencies(10, [9, 11], 'EUR')).toEqual({
			price: 10,
			sparkline: [9, 11],
			currency: 'EUR'
		});
	});

	it('trata un precio ausente como 0 en vez de propagar undefined', () => {
		expect(correctSubunitCurrencies(undefined, [], 'EUR').price).toBe(0);
		expect(correctSubunitCurrencies(undefined, [], 'GBp').price).toBe(0);
	});

	it('no muta la sparkline que recibe', () => {
		const original = [100, 200];
		correctSubunitCurrencies(100, original, 'GBp');
		expect(original).toEqual([100, 200]);
	});
});

describe('calculateHistoricalMetrics', () => {
	/**
	 * Fecha fija, y no por gusto: los tres cortes son aritmética de fechas —inicio de
	 * año, inicio de mes y hace 30 días— y un test contra el reloj real pasa hoy y
	 * falla en enero, que es justo cuando el YTD importa. Mediodía UTC para que el
	 * `getMonth()` local del código no cambie de mes según la zona horaria del que
	 * ejecute los tests.
	 */
	const AHORA = new Date('2026-08-07T12:00:00Z');

	/**
	 * Serie construida para que **cada métrica tenga que elegir un cierre distinto**:
	 * si alguien intercambia la lógica de MTD y la de 1M, los números no cuadran. Con
	 * una serie plana los tres saldrían iguales y el test no distinguiría nada.
	 */
	const SERIE = [
		{ date: '2025-12-30T00:00:00Z', close: 100 }, // último cierre del año anterior
		{ date: '2026-01-02T00:00:00Z', close: 105 },
		{ date: '2026-07-05T00:00:00Z', close: 110 }, // último anterior a «hace 30 días»
		{ date: '2026-07-31T00:00:00Z', close: 115 }, // último cierre del mes anterior
		{ date: '2026-08-03T00:00:00Z', close: 118 }
	];

	it('calcula las tres métricas desde el cierre que le toca a cada una', () => {
		const r = calculateHistoricalMetrics(SERIE, 120, undefined, AHORA);
		expect(r.ytd).toBeCloseTo(20, 6); // contra 100, cierre de 2025
		expect(r.mtd).toBeCloseTo(4.3478, 3); // contra 115, cierre de julio
		expect(r.oneMonth).toBeCloseTo(9.0909, 3); // contra 110, hace más de 30 días
	});

	it('sin cierres del año anterior, mide el YTD contra el primero que hay', () => {
		const soloEsteAno = SERIE.filter((q) => q.date >= '2026-01-01');
		const r = calculateHistoricalMetrics(soloEsteAno, 126, undefined, AHORA);
		expect(r.ytd).toBeCloseTo(20, 6); // contra 105, el primero de 2026
	});

	it('sin ningún cierre, devuelve el YTD que traía Yahoo y no inventa los demás', () => {
		expect(calculateHistoricalMetrics([], 120, 7.5, AHORA)).toEqual({
			ytd: 7.5,
			mtd: undefined,
			oneMonth: undefined
		});
	});

	/**
	 * Un cierre a 0 haría una división por cero y devolvería `Infinity`, que viaja
	 * hasta la interfaz como un porcentaje absurdo. El código se protege, y esto lo
	 * fija: prefiere quedarse sin dato a dar uno imposible.
	 */
	it('no divide por un cierre de cero: deja el dato sin calcular', () => {
		const conCero = [{ date: '2025-12-30T00:00:00Z', close: 0 }];
		const r = calculateHistoricalMetrics(conCero, 120, undefined, AHORA);
		expect(r.ytd).toBeUndefined();
		expect(Number.isFinite(r.mtd ?? 0)).toBe(true);
	});

	it('el YTD de Yahoo se descarta si hay histórico para calcularlo mejor', () => {
		const r = calculateHistoricalMetrics(SERIE, 120, 999, AHORA);
		expect(r.ytd).toBeCloseTo(20, 6);
	});

	it('una caída se expresa en negativo', () => {
		const r = calculateHistoricalMetrics(SERIE, 80, undefined, AHORA);
		expect(r.ytd).toBeCloseTo(-20, 6);
	});
});

describe('RELIABLE_FT_MAPPINGS', () => {
	/**
	 * No comprueba lógica, comprueba que la tabla sigue teniendo la forma que el
	 * endpoint da por supuesta: la clave es el ticker de Yahoo y el valor lo que se le
	 * pega a la URL de FT. Una entrada con la pareja al revés no da error en ninguna
	 * parte, simplemente devuelve null para siempre y el fondo se queda con el precio
	 * malo de Yahoo, que es el problema que estos mapeos existen para resolver.
	 */
	it('mapea tickers de Yahoo a identificadores de FT, no al revés', () => {
		for (const [tickerYahoo, idFt] of Object.entries(RELIABLE_FT_MAPPINGS)) {
			expect(tickerYahoo).toMatch(/^[A-Z0-9]+\.[A-Z]{1,2}$/);
			expect(idFt).toMatch(/^[A-Z]{2}[A-Z0-9]{9,10}$|^[A-Z0-9]+:[A-Z]{3}$/);
		}
	});
});

/**
 * ⚠️ **Este parámetro es lo que limitaba el histórico del patrimonio, no Yahoo.** El endpoint
 * ya pedía desde el 20 de diciembre del año anterior —lo necesita `calculateHistoricalMetrics`
 * para el YTD— y llegaban entre 160 y 250 cierres, que se tiraban con un `slice(-30)`. La
 * constante del store decía «limitado por lo que da el sparkline de Yahoo» y describía ese
 * recorte.
 *
 * Sigue habiendo motivo para no servir la serie larga siempre: viaja en la respuesta de
 * precios, que el cliente pide cada 30 segundos. De ahí que haya que pedirla explícitamente.
 */
describe('diasDeHistorialPedidos', () => {
	it('sin parámetro sirve los 30 días de siempre', () => {
		expect(diasDeHistorialPedidos(null)).toBe(30);
	});

	it('respeta lo que se le pide', () => {
		expect(diasDeHistorialPedidos('250')).toBe(250);
	});

	/** El mínimo protege a las tarjetas de activo, que dibujan su sparkline con 30 puntos. */
	it('nunca baja de 30, aunque se pida menos', () => {
		expect(diasDeHistorialPedidos('5')).toBe(30);
		expect(diasDeHistorialPedidos('1')).toBe(30);
	});

	it('acota por arriba para que un parámetro absurdo no dispare nada', () => {
		expect(diasDeHistorialPedidos('99999')).toBe(400);
	});

	/**
	 * Viene de la URL, así que puede ser cualquier cosa. Sin la guarda, un `NaN` acabaría en
	 * `slice(-NaN)`, que devuelve el array **entero**: justo la respuesta gorda que el
	 * parámetro existe para evitar.
	 */
	it('la basura cae al valor por defecto', () => {
		for (const entrada of ['', 'abc', '-1', '0', 'NaN', 'Infinity', '1e999']) {
			expect(diasDeHistorialPedidos(entrada)).toBe(30);
		}
	});

	it('un decimal se trunca en vez de propagarse', () => {
		expect(diasDeHistorialPedidos('120.9')).toBe(120);
	});
});
