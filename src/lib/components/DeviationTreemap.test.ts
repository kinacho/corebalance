import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render } from '@testing-library/svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { approximateTextWidth } from '$lib/treemap';
import { BLOCK_HUES, CHART_NEUTRAL, DEVIATION_ON_TARGET } from '$lib/constants';
import type { PortfolioPosition } from '$lib/types';

loadLocale('es');
setLocale('es');

/**
 * Guardia contra el defecto que motivó todo esto: los rótulos del mapa se
 * pisaban entre celdas.
 *
 * `<text>` en SVG no se recorta solo, así que un nombre largo en una celda
 * estrecha se pintaba encima de la vecina. Hay dos defensas y aquí se comprueban
 * las dos: que ningún rótulo emitido supere el ancho de su celda según el
 * estimador, y que todo texto viva dentro de un grupo con `clip-path`, que es la
 * garantía dura por si el estimador se queda corto.
 *
 * Se comprueba sobre el SVG renderizado y no sobre una función pura porque la
 * decisión de qué dibujar vive en el componente.
 */

/**
 * El `letter-spacing` de `.block-label`, en em.
 *
 * Está escrito en tres sitios —el CSS del componente, su `BLOCK_LABEL_TRACKING` y
 * aquí— porque el valor calculado no se puede leer antes de dibujar. Que estén de
 * acuerdo es precisamente lo que comprueba el test de anchos de cabecera.
 */
const BLOCK_LABEL_TRACKING = 0.04;

function makePosition(
	ticker: string,
	name: string,
	value: number,
	targetWeight: number
): PortfolioPosition {
	return {
		asset: {
			ticker,
			name,
			isin: '',
			targetWeight,
			color: '#3b82f6',
			icon: '📈',
			ter: 0,
			category: 'core',
			instrumentType: 'fund'
		},
		holdings: value / 100,
		avgCost: 100,
		totalCost: value,
		unitPrice: 100,
		totalValue: value,
		currentWeight: 0,
		deviation: 0,
		targetValue: 0,
		targetHoldings: 0,
		profit: 0,
		profitPercent: 0,
		dailyChangeValue: 0,
		dailyChangePercent: 0
	};
}

/**
 * Una cartera con tickers largos en mayúsculas y posiciones muy desiguales: es
 * la combinación que produce celdas diminutas con rótulos anchos.
 */
const POSITIONS = [
	makePosition('VANGUARD-GLOBAL-STOCK', 'Vanguard Global Stock Index', 9000, 0.5),
	makePosition('CASH-DEPOSITO', 'Depósito remunerado', 800, 0.2),
	// Sin peso objetivo, como las acciones individuales de la demo: es el caso
	// que se pintaba invisible.
	makePosition('MSCI-EMERGING-IMI', 'iShares Emerging Markets IMI', 900, 0),
	makePosition('WWWWWWWW', 'Activo de nombre imposible', 400, 0),
	makePosition('AAAA.MC', 'Acción española', 200, 0),
	// Deliberadamente minúscula: es la que no debe llevar rótulo.
	makePosition('MIGAJA', 'Posición residual', 3, 0)
];

const store = {
	portfolioState: { positions: POSITIONS },
	satelliteState: { positions: [] as PortfolioPosition[] },
	stockState: { positions: [] as PortfolioPosition[] }
};

vi.mock('$lib/stores/portfolio.svelte', () => ({
	get portfolio() {
		return store;
	}
}));

/**
 * Luminancia media de un color, aceptando hex y `rgb()`.
 *
 * Los dos formatos conviven: los tonos fijos vienen de constantes en hex y la
 * rampa divergente se calcula y sale como `rgb()`. Sacar los dígitos con una
 * expresión regular genérica no vale: sobre `#3f3f52` devuelve «3», «3» y «52».
 */
function luminanceOf(color: string): number {
	if (color.startsWith('#')) {
		const hex = color.slice(1);
		const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
		return (r + g + b) / 3;
	}
	const parts = color.match(/rgba?\(([^)]+)\)/);
	if (!parts) return 255;
	const [r, g, b] = parts[1].split(',').map((n) => parseFloat(n));
	return (r + g + b) / 3;
}

/**
 * Los colores reales detrás de un `fill`, resolviendo el rayado.
 *
 * Las celdas sin objetivo se rellenan con `url(#dev-no-target)`, y sin esto la
 * comprobación de «ningún recuadro casi invisible» pasaría de vacío justo sobre
 * las celdas que motivaron esa comprobación: `luminanceOf` no sabe leer un `url()`
 * y devolvía su valor de reserva. Un test que deja de comprobar tiene el mismo
 * aspecto que un test que pasa.
 */
function resolveFill(container: HTMLElement, fill: string): string[] {
	const ref = fill.match(/^url\(#(.+)\)$/);
	if (!ref) return [fill];

	const pattern = container.querySelector(`#${ref[1]}`);
	expect(pattern, `el relleno apunta a «${ref[1]}», que no existe`).not.toBeNull();

	const colors = [...pattern!.querySelectorAll('rect')].map((r) => r.getAttribute('fill') ?? '');
	expect(colors.length, 'el patrón no pinta nada').toBeGreaterThan(0);
	return colors;
}

/**
 * El rectángulo de un `clipPath` por su id, buscando **dentro** de este SVG.
 *
 * ⚠️ No vale `svg.querySelector('#id rect')`: los ids del mapa son fijos por bloque,
 * así que un test que renderiza varias veces deja varios elementos con el mismo id
 * en el documento, y el selector por id resuelve contra el mapa de ids del
 * documento —o sea, contra el primer render— y luego devuelve `null` al comprobar
 * que no es descendiente de este SVG. Un `null` que se lee como «no hay recorte».
 */
function clipRectById(svg: Element, id: string): Element | null {
	if (!id) return null;
	const clip = [...svg.querySelectorAll('defs *')].find((el) => el.getAttribute('id') === id);
	return clip?.querySelector('rect') ?? null;
}

/** Los grupos de celda: un `<rect>` propio y sus textos ya recortados. */
function readCells(container: HTMLElement) {
	const svg = container.querySelector('svg.treemap');
	expect(svg, 'el treemap no se ha renderizado').not.toBeNull();

	return [...svg!.querySelectorAll('g')]
		.map((group) => {
			const rect = group.querySelector(':scope > rect');
			const clipped = group.querySelector(':scope > g[clip-path]');
			if (!rect) return null;
			return {
				width: parseFloat(rect.getAttribute('width') ?? '0'),
				height: parseFloat(rect.getAttribute('height') ?? '0'),
				clipped,
				texts: [...group.querySelectorAll('text')].map((text) => ({
					content: text.textContent?.trim() ?? '',
					fontSize: parseFloat(text.getAttribute('font-size') ?? '0')
				}))
			};
		})
		.filter((cell): cell is NonNullable<typeof cell> => cell !== null);
}

describe('DeviationTreemap.svelte', () => {
	it('dibuja una celda por posición con valor', async () => {
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);
		expect(readCells(container)).toHaveLength(POSITIONS.length);
	});

	it('ningún rótulo es más ancho que su celda', async () => {
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		for (const cell of readCells(container)) {
			for (const text of cell.texts) {
				const width = approximateTextWidth(text.content, text.fontSize);
				expect(
					width,
					`«${text.content}» mide ${width.toFixed(1)} en una celda de ${cell.width.toFixed(1)}`
				).toBeLessThanOrEqual(cell.width);
			}
		}
	});

	it('ningún rótulo sobresale por abajo de su celda', async () => {
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		const svg = container.querySelector('svg.treemap')!;
		for (const group of svg.querySelectorAll('g')) {
			const rect = group.querySelector(':scope > rect');
			if (!rect) continue;
			const top = parseFloat(rect.getAttribute('y') ?? '0');
			const height = parseFloat(rect.getAttribute('height') ?? '0');

			for (const text of group.querySelectorAll('text')) {
				const baseline = parseFloat(text.getAttribute('y') ?? '0');
				// La línea base más el descendente aproximado de la fuente.
				const bottom = baseline + parseFloat(text.getAttribute('font-size') ?? '0') * 0.25;
				expect(bottom, `«${text.textContent?.trim()}» se sale por abajo`).toBeLessThanOrEqual(
					top + height
				);
			}
		}
	});

	it('todo texto vive dentro de un grupo recortado', async () => {
		// La garantía dura: aunque el estimador de anchos falle algún día, el
		// `clipPath` impide que un rótulo invada la celda vecina.
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		const svg = container.querySelector('svg.treemap')!;
		for (const text of svg.querySelectorAll('text')) {
			expect(
				text.closest('g[clip-path]'),
				`«${text.textContent?.trim()}» está fuera de un clip-path`
			).not.toBeNull();
		}
	});

	it('una celda diminuta se queda sin rótulo en vez de con uno recortado a la mitad', async () => {
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		const cells = readCells(container);
		const tiny = cells.reduce((min, cell) =>
			cell.width * cell.height < min.width * min.height ? cell : min
		);
		expect(tiny.texts.length).toBe(0);
	});

	it('la celda mayor sí lleva su ticker y su peso', async () => {
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		const cells = readCells(container);
		const biggest = cells.reduce((max, cell) =>
			cell.width * cell.height > max.width * max.height ? cell : max
		);
		expect(biggest.texts.length).toBeGreaterThanOrEqual(2);
		// Y su rótulo cabe, aunque haya venido recortado.
		expect(biggest.texts[0].content.length).toBeGreaterThan(0);
	});

	it('ningún recuadro se pinta casi invisible', async () => {
		// El defecto que motivó esto: los activos sin peso objetivo se rellenaban
		// con blanco al 6 %, que sobre fondo oscuro es negro. En una cartera donde
		// solo el bloque principal tiene objetivos —la demo, y la mayoría de las
		// reales— eso dejaba seis de nueve recuadros invisibles.
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		const fills = [...container.querySelectorAll('svg.treemap > g > rect')].map(
			(rect) => rect.getAttribute('fill') ?? ''
		);
		expect(fills.length).toBe(POSITIONS.length);

		for (const fill of fills) {
			// Ni transparencias —sobre fondo oscuro se comen el tono— ni rellenos tan
			// oscuros que no se distingan del hueco entre celdas. Se comprueba color a
			// color: en las celdas rayadas, tanto la base como la raya.
			for (const color of resolveFill(container, fill)) {
				expect(color, `«${color}» es translúcido`).not.toMatch(/rgba|transparent/);
				expect(luminanceOf(color), `«${color}» es casi negro`).toBeGreaterThan(45);
			}
		}
	});

	it('un activo sin objetivo dentro de un bloque medido va rayado', async () => {
		// Este es el caso **anómalo**: un activo de la cartera principal al que no se
		// le ha puesto peso objetivo. Es lo único que queda rayado, y necesita la
		// textura precisamente porque es lo único que convive con celdas de la escala
		// dentro del mismo bloque, sin hueco ni cabecera que las separe.
		//
		// No confundir con un bloque entero sin objetivos —satélite, acciones—, que
		// lleva su tono plano y se comprueba en el bloque de abajo.
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		const cells = [...container.querySelectorAll('svg.treemap > g')];
		const untargeted = cells.filter((g) => g.textContent?.includes('Sin objetivo'));
		expect(untargeted.length, 'el fixture debería tener celdas sin objetivo').toBeGreaterThan(0);

		for (const group of untargeted) {
			const fill = group.querySelector(':scope > rect')?.getAttribute('fill') ?? '';
			expect(fill, 'una celda sin objetivo no va rayada').toMatch(/^url\(#/);

			// El rayado necesita dos tonos distintos, o no es un rayado.
			const colors = [...new Set(resolveFill(container, fill))];
			expect(colors.length, `el patrón solo pinta «${colors[0]}»`).toBeGreaterThan(1);

			// Y ninguno puede ser el neutro de «en objetivo», que es el estado del que
			// hay que diferenciarse.
			for (const color of colors) {
				expect(color.toLowerCase()).not.toBe(CHART_NEUTRAL.toLowerCase());
			}
		}
	});

	it('un activo sin objetivo no muestra una desviación inventada', async () => {
		// `deviation` es `peso − objetivo`; con objetivo 0 es el peso otra vez, y
		// pintarlo como «+28,0 %» sugiere un exceso contra un objetivo que nadie
		// ha fijado.
		withContainerWidth(1080);
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		// Ninguna de las posiciones de este fixture tiene objetivo salvo las dos
		// primeras, así que tiene que aparecer la etiqueta de estado.
		expect(container.textContent).toContain('Sin objetivo');
	});

	it('no revienta sin posiciones y muestra el mensaje de vacío', async () => {
		store.portfolioState = { positions: [] };
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		expect(container.querySelector('svg.treemap')).toBeNull();
		expect(container.textContent).toContain('Añade activos');
		store.portfolioState = { positions: POSITIONS };
	});
});

/**
 * El mapa seccionado por bloque de estrategia.
 *
 * **Los objetivos son cosa de la cartera principal**; satélite y acciones no los
 * tienen como tal. Estos casos son el camino normal de una cartera real y hasta
 * ahora ningún test los tocaba: el fixture de arriba solo tiene bloque principal,
 * así que todo el reparto en dos niveles y los tonos de bloque se estaban
 * ejercitando únicamente a mano en el navegador.
 */
describe('DeviationTreemap.svelte · bloques de estrategia', () => {
	const STOCKS = [
		makePosition('AMZN', 'Amazon.com Inc', 1200, 0),
		makePosition('GOOGL', 'Alphabet Inc', 1100, 0),
		makePosition('TSLA', 'Tesla Inc', 300, 0)
	];
	/**
	 * ⚠️ Se llamaba «Depósito remunerado», **igual que la posición de la cartera
	 * principal del fixture de arriba**, y desde que las celdas se rotulan con el
	 * nombre eso hace ambigua la búsqueda: el `find` cazaba la del otro bloque y el
	 * test comparaba el tono de una celda de la escala contra el tono de bloque.
	 */
	const SATELLITE = [makePosition('CASH-DEP', 'Cuenta remunerada', 500, 0)];
	/** Trozos de nombre suficientes para identificar las tres acciones. */
	const ACCIONES = ['Amazon', 'Alphabet', 'Tesla'];

	beforeAll(() => {
		store.stockState = { positions: STOCKS };
		store.satelliteState = { positions: SATELLITE };
	});
	afterAll(() => {
		store.stockState = { positions: [] };
		store.satelliteState = { positions: [] };
	});

	/** Las celdas con su relleno y sus textos, sin depender de la sección. */
	async function renderMap(width = 1080) {
		withContainerWidth(width);
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);
		const svg = container.querySelector('svg.treemap')!;
		const cells = [...svg.querySelectorAll(':scope > g')]
			.map((g) => {
				const rect = g.querySelector(':scope > rect');
				if (!rect) return null;
				return {
					fill: rect.getAttribute('fill') ?? '',
					x: parseFloat(rect.getAttribute('x') ?? '0'),
					y: parseFloat(rect.getAttribute('y') ?? '0'),
					w: parseFloat(rect.getAttribute('width') ?? '0'),
					h: parseFloat(rect.getAttribute('height') ?? '0'),
					text: g.textContent ?? '',
					/**
					 * ⚠️ El primer `<text>` de una celda era el **ticker** y ahora es el
					 * **nombre** del activo: para un fondo el ticker es su ISIN o su código
					 * `0P…`, que no dice nada. Por eso las celdas se buscan aquí por un
					 * trozo del nombre y no por una cadena exacta — cuánto nombre se dibuja
					 * depende de lo que quepa en la celda, que es justo lo que decide
					 * `assetLabelCandidates`.
					 */
					label: g.querySelector('text')?.textContent?.trim() ?? ''
				};
			})
			.filter((c): c is NonNullable<typeof c> => c !== null);
		return { container, svg, cells };
	}

	it('un bloque sin objetivos lleva su tono plano, sin escala y sin rayado', async () => {
		const { cells } = await renderMap();

		const stocks = cells.filter((c) => ACCIONES.some((n) => c.label.includes(n)));
		expect(stocks.length, 'no se han dibujado las acciones').toBe(3);
		for (const cell of stocks) {
			expect(cell.fill).toBe(BLOCK_HUES.stocks);
		}

		const satellite = cells.find((c) => c.label.includes('Cuenta'));
		expect(satellite?.fill).toBe(BLOCK_HUES.satellite);
	});

	/**
	 * El rótulo de la celda es el **nombre**, no el ticker, y para un fondo eso es
	 * la diferencia entre `IE00B4L5Y983` y «MSCI World». Se comprueba también que dos
	 * fondos de la misma gestora no acaben con el mismo rótulo, que es el defecto por
	 * el que no basta con truncar el nombre.
	 */
	it('una celda rotula el nombre del fondo y no su ISIN', async () => {
		const previas = store.portfolioState.positions;
		store.portfolioState = {
			positions: [
				makePosition('IE00B4L5Y983', 'iShares Core MSCI World UCITS ETF', 9000, 0.5),
				makePosition('IE00BKM4GZ66', 'iShares Core MSCI EM IMI UCITS ETF', 6000, 0.5)
			]
		};
		const { cells } = await renderMap(1080);
		store.portfolioState = { positions: previas };

		const rotulos = cells.map((c) => c.label).filter(Boolean);
		expect(rotulos.some((r) => r.includes('IE00'))).toBe(false);
		expect(rotulos.some((r) => r.includes('World'))).toBe(true);
		expect(rotulos.some((r) => r.includes('EM') || r.includes('IMI'))).toBe(true);
		// Dos fondos distintos, dos rótulos distintos.
		expect(new Set(rotulos).size).toBe(rotulos.length);
	});

	it('un bloque sin objetivos no rotula «sin objetivo» en cada celda', async () => {
		// Era el defecto de fondo: marcar como excepción a dos tercios de los activos
		// cuando ésos estructuralmente no pueden tener objetivo. Con la cabecera del
		// bloque encima, informar de la ausencia es ruido.
		const { cells } = await renderMap();

		for (const cell of cells.filter((c) => ACCIONES.some((n) => c.label.includes(n)))) {
			expect(cell.text, `«${cell.label}» sigue diciendo «sin objetivo»`).not.toContain(
				'Sin objetivo'
			);
		}
	});

	it('ninguna celda se pinta con el gris neutro', async () => {
		// Decisión de producto, y por eso está aquí y no solo en un comentario: el gris
		// dominaba el mapa y lo hacía parecer apagado. El neutro sobrevive únicamente
		// como origen de la mezcla de la rampa, nunca como relleno de una celda.
		const { cells } = await renderMap();
		// Sin esto la comprobación pasaría de vacío el día que el mapa deje de pintar.
		expect(cells.length).toBe(POSITIONS.length + 4);

		for (const cell of cells) {
			expect(cell.fill.toLowerCase(), `«${cell.label}» es gris neutro`).not.toBe(
				CHART_NEUTRAL.toLowerCase()
			);
		}
	});

	it('«en objetivo» usa el verde apagado, no el neutro', async () => {
		// `CASH-DEPOSITO` pesa 800 sobre 14.000 y su objetivo es 0,2, así que está muy
		// por debajo; el que cae dentro de banda es el que se construye aquí a medida.
		const onTarget = makePosition('EN-BANDA', 'Fondo en objetivo', 1000, 0);
		// 1000 sobre el total hace un 6,9 %; con objetivo al 7 % la desviación es
		// −0,1 puntos, dentro de la banda de 1 punto.
		onTarget.asset.targetWeight = 0.07;
		onTarget.deviation = -0.001;

		store.portfolioState = { positions: [...POSITIONS, onTarget] };
		const { cells } = await renderMap();
		store.portfolioState = { positions: POSITIONS };

		const cell = cells.find((c) => c.label.includes('objetivo'));
		expect(cell?.fill).toBe(DEVIATION_ON_TARGET);
	});

	it('cada bloque presente lleva su nombre escrito encima', async () => {
		const { svg } = await renderMap();
		const headers = [...svg.querySelectorAll('text.block-label')].map((t) =>
			t.textContent?.trim()
		);

		expect(headers).toContain('CARTERA PRINCIPAL');
		expect(headers).toContain('ACCIONES INDIVIDUALES');
		expect(headers).toContain('CARTERA CONSERVADORA');
	});

	it('la cabecera de un bloque no es más ancha que su propio bloque', async () => {
		// El mismo estimador que las celdas, y el mismo defecto: se medía la cadena en
		// minúsculas mientras el CSS la pasaba a mayúsculas con `text-transform`, que
		// son más anchas. El recorte hacía su trabajo y cortaba a media palabra:
		// «ACCIONES INDIVIDUALE». Ahora las mayúsculas las pone el guion antes de medir.
		//
		// ⚠️ **Y este test no podía fallar.** Comparaba contra la celda más ancha de
		// *todo* el mapa, así que solo cazaba un desbordamiento en el bloque mayor: una
		// cabecera podía salirse del bloque estrecho por el triple y pasar en verde.
		// Ahora cada cabecera se compara contra el ancho de su propio bloque, que es el
		// rectángulo de su `clipPath`. Y se mide **con `letter-spacing`**, que es el otro
		// defecto que este test tenía que cazar y no contaba.
		//
		// Y se barren varios anchos a propósito: el margen que se gana ignorando el
		// espaciado es de un 4 % por carácter, así que solo desborda en una franja
		// estrecha de anchos. Con un único ancho el test pasaba **también sin modelar el
		// espaciado**, que es la definición de comprobación decorativa.
		let comprobadas = 0;

		for (const width of [320, 340, 360, 380, 400, 420, 460, 520, 600, 700, 900, 1080]) {
			const { svg } = await renderMap(width);

			for (const label of svg.querySelectorAll('text.block-label')) {
				const text = label.textContent?.trim() ?? '';
				const fontSize = parseFloat(label.getAttribute('font-size') ?? '0');

				const reference = label.closest('g[clip-path]')?.getAttribute('clip-path') ?? '';
				const id = reference.match(/^url\(#(.+)\)$/)?.[1] ?? '';
				const clipRect = clipRectById(svg, id);
				expect(clipRect, `la cabecera «${text}» no está recortada por su bloque`).not.toBeNull();

				const blockX = parseFloat(clipRect!.getAttribute('x') ?? '0');
				const blockWidth = parseFloat(clipRect!.getAttribute('width') ?? '0');
				// El margen que el propio componente se ha dejado a la izquierda; se exige
				// también a la derecha, que es lo que promete `truncateToWidth`. Comparar
				// contra el ancho pelado del bloque no sirve: ese margen es mayor que el
				// espaciado entre letras, así que absorbía el error y el test pasaba igual
				// sin modelarlo.
				const inset = parseFloat(label.getAttribute('x') ?? '0') - blockX;
				const available = blockWidth - inset * 2;
				const measured = approximateTextWidth(text, fontSize, BLOCK_LABEL_TRACKING);
				expect(
					measured,
					`${width}px: «${text}» mide ${measured.toFixed(1)} y tiene ${available.toFixed(1)}`
				).toBeLessThanOrEqual(available);
				comprobadas++;
			}
		}

		expect(comprobadas, 'no se ha comprobado ninguna cabecera').toBeGreaterThan(0);
	});

	it('el alto de la cabecera se reserva también en los bloques que no la llevan', async () => {
		// ⚠️ El defecto: el alto de la cabecera se restaba **solo cuando se dibujaba**,
		// así que al ensanchar el panel un bloque podía cruzar el umbral de «aquí cabe
		// una cabecera», ganar la cabecera y **encogerse**, que es justo lo contrario de
		// lo esperable al agrandar el panel. Reservando siempre, cruzar el umbral solo
		// añade texto: la geometría no se mueve.
		//
		// Se comprueba en el bloque que *no* rotula: sus celdas tienen que empezar por
		// debajo del techo del bloque igual que las de los que sí rotulan. Antes
		// arrancaban exactamente en el techo.
		const { svg, cells } = await renderMap(340);

		const conservative = clipRectById(svg, 'dev-block-clip-satellite');
		expect(conservative, 'el bloque conservador no se ha dibujado').not.toBeNull();
		const blockTop = parseFloat(conservative!.getAttribute('y') ?? '0');

		const satelliteCells = cells.filter((c) => c.fill === BLOCK_HUES.satellite);
		expect(satelliteCells.length, 'el bloque conservador no tiene celdas').toBeGreaterThan(0);

		const firstCellTop = Math.min(...satelliteCells.map((c) => c.y));
		expect(
			firstCellTop - blockTop,
			'las celdas arrancan pegadas al techo del bloque: no se ha reservado la cabecera'
		).toBeGreaterThan(0);
	});

	it('un bloque diminuto se dibuja igual, no desaparece', async () => {
		// El hueco entre bloques se resta del rectángulo del bloque. Con un bloque muy
		// pequeño —una cuenta remunerada testimonial al lado de una cartera grande— el
		// reparto le daba una franja más estrecha que el propio hueco, y `max(0, …)` la
		// dejaba en cero: el bloque desaparecía del mapa por completo, con su valor
		// contando en el total y su nombre en la leyenda. Un activo pequeño debe salir
		// pequeño, nunca ausente.
		const previous = store.satelliteState;
		store.satelliteState = { positions: [makePosition('MIGA-CASH', 'Cuenta testimonial', 8, 0)] };

		const { cells } = await renderMap(340);
		store.satelliteState = previous;

		const tiny = cells.find((c) => c.label.includes('testimonial'));
		// Puede no llevar rótulo por estrecha, así que se busca por su relleno.
		const bySatelliteHue = cells.filter((c) => c.fill === BLOCK_HUES.satellite);
		expect(
			tiny !== undefined || bySatelliteHue.length > 0,
			'el bloque diminuto no se ha dibujado'
		).toBe(true);
		for (const cell of bySatelliteHue) {
			expect(cell.w, 'ancho cero').toBeGreaterThan(0);
			expect(cell.h, 'alto cero').toBeGreaterThan(0);
		}
	});

	it('las celdas de bloques distintos no se solapan', async () => {
		// La invariante del reparto en dos niveles: `squarify` coloca desde el origen y
		// este componente traslada cada rectángulo al hueco de su bloque. Un error de
		// signo o de origen ahí pinta un bloque encima de otro.
		const { cells } = await renderMap();
		expect(cells.length).toBe(POSITIONS.length + 4);

		for (let i = 0; i < cells.length; i++) {
			for (let j = i + 1; j < cells.length; j++) {
				const a = cells[i];
				const b = cells[j];
				const overlaps =
					a.x < b.x + b.w - 0.01 &&
					b.x < a.x + a.w - 0.01 &&
					a.y < b.y + b.h - 0.01 &&
					b.y < a.y + a.h - 0.01;
				expect(overlaps, `«${a.label}» se solapa con «${b.label}»`).toBe(false);
			}
		}
	});

	it('la leyenda nombra un bloque solo cuando su cabecera no ha cabido', async () => {
		// La regla: la leyenda dice lo que el mapa no ha podido decir en su sitio. En un
		// lienzo ancho caben las tres cabeceras, así que **ningún nombre de bloque**
		// aparece en la leyenda; se quedan solo las entradas de la escala y la del
		// activo anómalo, que este fixture tiene.
		const { container } = await renderMap(1080);
		const items = [...container.querySelectorAll('.legend .legend-item')].map(
			(i) => i.textContent?.trim() ?? ''
		);

		expect(items).toContain('Por debajo');
		expect(items).toContain('En objetivo');
		expect(items).toContain('Por encima');
		for (const name of ['Cartera Principal', 'Acciones Individuales', 'Cartera Conservadora']) {
			expect(items, `«${name}» se repite en la leyenda teniendo cabecera`).not.toContain(name);
		}
	});

	it('y sí lo nombra cuando el bloque es demasiado bajo para una cabecera', async () => {
		// La cartera conservadora es un 4 % del patrimonio: en el carril estrecho su
		// bloque no tiene alto para una cabecera y una celda a la vez, y sin esto
		// quedaba una celda violeta suelta sin nada que dijera de qué bloque era. En
		// móvil no hay tooltip que lo salve.
		const { container, svg } = await renderMap(340);
		const headers = [...svg.querySelectorAll('text.block-label')].map((t) => t.textContent?.trim());
		const items = [...container.querySelectorAll('.legend .legend-item')].map(
			(i) => i.textContent?.trim() ?? ''
		);

		// Una cabecera recortada —«ACCIONES IN…»— sigue nombrando su bloque, así que
		// vale como tal: lo que se comprueba es la regla, no un ancho concreto. Para
		// cada bloque sin escala, o tiene cabecera en el mapa, o tiene entrada en la
		// leyenda. Nunca ninguna de las dos, y nunca las dos a la vez.
		const namesBlock = (header: string | undefined, name: string) => {
			if (!header) return false;
			const shown = header.replace(/…$/, '');
			return shown.length >= 4 && name.toUpperCase().startsWith(shown);
		};

		for (const name of ['Acciones Individuales', 'Cartera Conservadora']) {
			const titled = headers.some((h) => namesBlock(h, name));
			const listed = items.includes(name);
			expect(titled || listed, `«${name}» no se nombra en ningún sitio`).toBe(true);
			expect(titled && listed, `«${name}» se nombra dos veces`).toBe(false);
		}
	});
});

/**
 * La cartera recién importada de un CSV, que es **el caso común y no el raro**:
 * todo activo nace con `targetWeight: 0`, así que ningún bloque se mide, no hay
 * escala en pantalla y el color solo dice de qué cartera es cada celda.
 *
 * Ningún test tocaba este estado —los fixtures de arriba siempre tienen algún
 * objetivo—, y ahí se escondían tres defectos que el navegador sí enseñaba: el
 * subtítulo seguía afirmando que el color era la distancia al objetivo, y el
 * tooltip seguía diciendo «sin objetivo fijado» en celdas donde nadie ha dejado de
 * fijar nada.
 */
describe('DeviationTreemap.svelte · cartera sin ningún objetivo', () => {
	const SIN_OBJETIVOS = [
		makePosition('VWCE', 'Vanguard FTSE All-World', 9000, 0),
		makePosition('SXR8', 'iShares Core S&P 500', 4000, 0),
		makePosition('CASH-DEP', 'Depósito remunerado', 800, 0)
	];

	beforeAll(() => {
		store.portfolioState = { positions: SIN_OBJETIVOS };
	});
	afterAll(() => {
		store.portfolioState = { positions: POSITIONS };
	});

	async function renderWide() {
		withContainerWidth(1080);
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		return render(DeviationTreemap);
	}

	it('el subtítulo no afirma que el color mida la distancia al objetivo', async () => {
		const { container } = await renderWide();
		expect(container.textContent).not.toContain('la distancia a tu objetivo');
		expect(container.textContent).toContain('a qué cartera pertenece');
	});

	it('la leyenda no muestra una escala que no se está usando', async () => {
		const { container } = await renderWide();
		const items = [...container.querySelectorAll('.legend .legend-item')].map(
			(i) => i.textContent?.trim() ?? ''
		);
		expect(items).not.toContain('Por debajo');
		expect(items).not.toContain('En objetivo');
		expect(items).not.toContain('Por encima');
	});

	it('ningún tooltip acusa de no haber fijado un objetivo', async () => {
		const { container } = await renderWide();
		const tooltips = [...container.querySelectorAll('svg.treemap title')].map(
			(t) => t.textContent?.trim() ?? ''
		);
		expect(tooltips.length, 'no hay tooltips que comprobar').toBe(SIN_OBJETIVOS.length);

		for (const tip of tooltips) {
			expect(tip, `«${tip}» sigue hablando de objetivos`).not.toMatch(/objetivo/i);
			expect(tip, `«${tip}» no dice el peso`).toMatch(/de tu cartera/);
		}
	});

	it('ninguna celda va rayada: el rayado es para la anomalía, no para lo normal', async () => {
		// Sin bloques medidos no hay anomalías posibles, así que el patrón no debería ni
		// declararse. Si aparece aquí, es que el mapa vuelve a tratar lo normal como
		// excepción, que es el defecto de fondo del que salió todo esto.
		const { container } = await renderWide();
		const fills = [...container.querySelectorAll('svg.treemap > g > rect')].map(
			(rect) => rect.getAttribute('fill') ?? ''
		);
		expect(fills.length).toBe(SIN_OBJETIVOS.length);
		for (const fill of fills) {
			expect(fill, 'una celda de un bloque sin escala va rayada').not.toMatch(/^url\(#/);
		}
	});
});

/**
 * Fija el ancho que `bind:clientWidth` va a leer.
 *
 * El tamaño de letra de los mapas se deriva del ancho **real del contenedor**, no
 * de una media query: en su carril del carrusel el mapa mide unos 340 px también
 * en escritorio, y ampliado pasa de mil. Así que la geometría que hay que probar
 * se selecciona por píxeles, no falseando `matchMedia`.
 */
function withContainerWidth(px: number) {
	Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
		configurable: true,
		get: () => px
	});
}

describe.each([
	{ name: 'carril estrecho del carrusel', width: 340 },
	{ name: 'panel ampliado', width: 1080 }
])('DeviationTreemap.svelte a $width px', ({ width }) => {
	it('ningún rótulo se sale de su celda', async () => {
		withContainerWidth(width);
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		const cells = readCells(container);
		expect(cells.length).toBe(POSITIONS.length);

		for (const cell of cells) {
			for (const text of cell.texts) {
				const estimated = approximateTextWidth(text.content, text.fontSize);
				expect(
					estimated,
					`${width}px: «${text.content}» mide ${estimated.toFixed(1)} en ${cell.width.toFixed(1)}`
				).toBeLessThanOrEqual(cell.width);
			}
		}
	});

	it('el rótulo renderiza a un tamaño legible en píxeles', async () => {
		withContainerWidth(width);
		const DeviationTreemap = (await import('./DeviationTreemap.svelte')).default;
		const { container } = render(DeviationTreemap);

		// Las unidades del viewBox se convierten a píxeles con el ancho real. Lo que
		// hay que garantizar es el resultado en píxeles, que es lo que se lee: con
		// el tamaño atado a una media query salían rótulos de 9 px en escritorio.
		const pxPerUnit = width / 100;
		const sizes = readCells(container)
			.flatMap((cell) => cell.texts.map((text) => text.fontSize * pxPerUnit))
			.filter((size) => size > 0);

		expect(sizes.length).toBeGreaterThan(0);
		for (const size of sizes) {
			expect(size, `${size.toFixed(1)}px es demasiado pequeño`).toBeGreaterThanOrEqual(9);
		}
	});
});
