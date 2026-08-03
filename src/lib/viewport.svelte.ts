import { browser } from '$app/environment';

/**
 * Un `matchMedia` reactivo, para los casos en los que el CSS no llega.
 *
 * Existe por los mapas: el `viewBox` y el tamaño de letra de un SVG son
 * atributos, no propiedades CSS, así que no se pueden cambiar con una
 * *media query*. Todo lo demás debe seguir resolviéndose en CSS; esto es para
 * geometría que el navegador no sabe adaptar solo.
 *
 * Devuelve un objeto con `matches` reactivo en lugar de un booleano, porque un
 * booleano suelto se copiaría por valor y dejaría de actualizarse.
 */
export function mediaQuery(query: string): { readonly matches: boolean } {
	// En SSR se asume la vista ancha: el dashboard es `ssr = false`, pero estos
	// componentes podrían acabar importados desde algún sitio que sí renderice, y
	// suponer «móvil» ahí provocaría un salto de layout al hidratar.
	let matches = $state(false);

	if (browser) {
		const mql = window.matchMedia(query);
		matches = mql.matches;
		const onChange = (event: MediaQueryListEvent) => {
			matches = event.matches;
		};
		mql.addEventListener('change', onChange);
		// No se desuscribe a propósito: estos componentes viven mientras vive el
		// dashboard, y una lista de un listener por consulta no crece.
	}

	return {
		get matches() {
			return matches;
		}
	};
}

/** El corte de móvil que usan los mapas, alineado con su `@media` de CSS. */
export function isNarrowViewport() {
	return mediaQuery('(max-width: 640px)');
}
