import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { approximateTextWidth } from '$lib/treemap';
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
			// oscuros que no se distingan del hueco entre celdas.
			expect(fill, `«${fill}» es translúcido`).not.toMatch(/rgba|transparent/);
			expect(luminanceOf(fill), `«${fill}» es casi negro`).toBeGreaterThan(45);
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
