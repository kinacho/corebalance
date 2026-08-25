import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Polyfill window.scrollTo
window.scrollTo = vi.fn();

/**
 * Y de `scrollBy`, que jsdom tampoco trae. Lo usa la cabecera para asomar el cajón
 * cuando en móvil se abriría por debajo de la ventana; siendo un espía, un test puede
 * comprobar **si** se desplaza y cuánto, que es justo lo que no se ve en una captura.
 */
window.scrollBy = vi.fn();

/**
 * Polyfill de `Element.animate`.
 *
 * jsdom no trae la Web Animations API, y las transiciones de Svelte 5
 * (`transition:fade`, `slide`, `fly`) se apoyan en ella: cualquier componente que
 * declare una revienta al renderizar con `element.animate is not a function`.
 * Eso dejaba fuera de las pruebas de render precisamente a los modales, que son
 * los que más transiciones llevan.
 *
 * Devuelve una animación ya terminada en vez de simularla. Lo que estas pruebas
 * comprueban es qué hay en el DOM y qué se llamó, no la interpolación —y una
 * animación que nunca acaba dejaría los nodos de salida colgando, que es peor
 * que no animar.
 */
Element.prototype.animate = vi.fn().mockImplementation(() => {
	const animacion = {
		cancel: vi.fn(),
		finish: vi.fn(),
		pause: vi.fn(),
		play: vi.fn(),
		reverse: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		currentTime: 0,
		playState: 'finished',
		startTime: 0,
		effect: { getComputedTiming: () => ({ duration: 0 }) },
		finished: Promise.resolve(),
		onfinish: null as null | (() => void)
	};
	/*
	 * ⚠️ Hay que **avisar de que terminó**, no solo decir que está terminada.
	 * Svelte engancha su limpieza a `onfinish`, así que un doble que nunca lo
	 * llama deja los nodos de salida colgando en el DOM: un `{#if}` que ya es
	 * falso sigue teniendo su elemento, y una prueba que compruebe ausencia falla
	 * sobre código correcto. Se llama en un `setTimeout` y no en un microtask
	 * porque Svelte asigna `onfinish` después de crear la animación.
	 */
	setTimeout(() => animacion.onfinish?.(), 0);
	return animacion;
}) as unknown as Element['animate'];

/**
 * Polyfill de ResizeObserver.
 *
 * jsdom no lo trae, y `bind:clientWidth` de Svelte 5 lo usa por debajo, así que
 * sin esto cualquier componente que mida su contenedor revienta al renderizar en
 * un test. Los mapas lo necesitan: derivan el tamaño de letra del ancho real.
 *
 * Invoca la devolución de llamada al observar, para que el valor inicial llegue
 * en lugar de quedarse en cero para siempre. El ancho que se reporta es el
 * `clientWidth` del elemento, que un test puede fijar sobre el prototipo.
 */
class ResizeObserverStub {
	private callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
	}

	observe(target: Element) {
		const width = target.clientWidth;
		const height = target.clientHeight;
		const rect = { width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0 };
		this.callback(
			[
				{
					target,
					contentRect: rect as DOMRectReadOnly,
					borderBoxSize: [{ inlineSize: width, blockSize: height }],
					contentBoxSize: [{ inlineSize: width, blockSize: height }],
					devicePixelContentBoxSize: [{ inlineSize: width, blockSize: height }]
				} as unknown as ResizeObserverEntry
			],
			this as unknown as ResizeObserver
		);
	}

	unobserve() {}
	disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
