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
