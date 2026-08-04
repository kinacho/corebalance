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
	const SATELLITE = [makePosition('CASH-DEP', 'Depósito remunerado', 500, 0)];

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
					ticker: g.querySelector('text')?.textContent?.trim() ?? ''
				};
			})
			.filter((c): c is NonNullable<typeof c> => c !== null);
		return { container, svg, cells };
	}

	it('un bloque sin objetivos lleva su tono plano, sin escala y sin rayado', async () => {
		const { cells } = await renderMap();

		const stocks = cells.filter((c) => ['AMZN', 'GOOGL', 'TSLA'].includes(c.ticker));
		expect(stocks.length, 'no se han dibujado las acciones').toBe(3);
		for (const cell of stocks) {
			expect(cell.fill).toBe(BLOCK_HUES.stocks);
		}

		const satellite = cells.find((c) => c.ticker === 'CASH-DEP');
		expect(satellite?.fill).toBe(BLOCK_HUES.satellite);
	});

	it('un bloque sin objetivos no rotula «sin objetivo» en cada celda', async () => {
		// Era el defecto de fondo: marcar como excepción a dos tercios de los activos
		// cuando ésos estructuralmente no pueden tener objetivo. Con la cabecera del
		// bloque encima, informar de la ausencia es ruido.
		const { cells } = await renderMap();

		for (const cell of cells.filter((c) => ['AMZN', 'GOOGL', 'TSLA'].includes(c.ticker))) {
			expect(cell.text, `«${cell.ticker}» sigue diciendo «sin objetivo»`).not.toContain(
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
			expect(cell.fill.toLowerCase(), `«${cell.ticker}» es gris neutro`).not.toBe(
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

		const cell = cells.find((c) => c.ticker === 'EN-BANDA');
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

	it('la cabecera de un bloque no es más ancha que su bloque', async () => {
		// El mismo estimador que las celdas, y el mismo defecto: se medía la cadena en
		// minúsculas mientras el CSS la pasaba a mayúsculas con `text-transform`, que
		// son más anchas. El recorte hacía su trabajo y cortaba a media palabra:
		// «ACCIONES INDIVIDUALE». Ahora las mayúsculas las pone el guion antes de medir.
		const { svg, cells } = await renderMap(420);

		for (const label of svg.querySelectorAll('text.block-label')) {
			const text = label.textContent?.trim() ?? '';
			const fontSize = parseFloat(label.getAttribute('font-size') ?? '0');
			const width = approximateTextWidth(text, fontSize);
			// El bloque más estrecho que puede contenerla: se compara contra el ancho
			// del bloque, que es al menos el de la celda más ancha que hay debajo.
			const widest = Math.max(...cells.map((c) => c.w));
			expect(width, `«${text}» mide ${width.toFixed(1)}`).toBeLessThanOrEqual(widest);
		}
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

		const tiny = cells.find((c) => c.ticker === 'MIGA-CASH');
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
				expect(overlaps, `«${a.ticker}» se solapa con «${b.ticker}»`).toBe(false);
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
