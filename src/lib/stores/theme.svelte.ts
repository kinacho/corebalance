import { STORAGE_KEY_THEME } from '$lib/constants';

export type Tema = 'light' | 'dark';

/**
 * El tema de la interfaz.
 *
 * ⚠️ **Este store no decide el tema inicial, solo lo lee.** Quien lo decide es el
 * script en línea de `src/app.html`, que corre antes de que exista ninguna hoja de
 * estilos y escribe `data-theme` en `<html>`. Si la decisión viviera aquí, el
 * primer pintado usaría `:root` (oscuro) y el cambio llegaría un instante después:
 * un destello de negro en cada carga con tema claro.
 *
 * Así que el orden es: `app.html` pone el atributo → este store lo lee al
 * construirse → a partir de ahí manda el store.
 *
 * ⚠️ **El predeterminado es oscuro y NO sigue al sistema operativo.** Lo siguió
 * hasta el 15-ago-2026, y eso significaba que a media audiencia se le servía un
 * tema que no había pedido — distinto del de las capturas, las tarjetas sociales
 * y el icono. El claro es una opción que se elige; elegida, se guarda, y a partir
 * de ahí manda ella y no lo que haga el sistema al anochecer. De ahí que ya no
 * haya escucha de `prefers-color-scheme`: existía solo para el caso «no ha
 * elegido», que ahora tiene una respuesta fija.
 *
 * ⚠️ **`resuelto` es `$state`, no un `$derived` del DOM**, porque el atributo no es
 * reactivo: nada avisa a Svelte de que ha cambiado. El store es la única fuente de
 * verdad una vez arrancado, y `aplicar()` mantiene el DOM en sincronía con él —
 * nunca al revés.
 */
class ThemeStore {
	/**
	 * Lo que el usuario eligió explícitamente, o `null` si nunca ha elegido.
	 * Se distingue de `resuelto` porque responden a preguntas distintas: `null`
	 * con `resuelto === 'dark'` es «se le está sirviendo el predeterminado», que
	 * no es lo mismo que «pidió oscuro». Nada de la interfaz depende hoy de esa
	 * diferencia, pero sí `#aplicar()`, que solo escribe en `localStorage` cuando
	 * hay elección.
	 */
	preferencia = $state<Tema | null>(null);

	/** El tema que está pintado ahora mismo. */
	resuelto = $state<Tema>('dark');

	constructor() {
		if (typeof document === 'undefined') return;

		const guardado = this.#leerGuardado();
		this.preferencia = guardado;
		this.resuelto =
			guardado ?? (document.documentElement.getAttribute('data-theme') as Tema) ?? 'dark';
	}

	#leerGuardado(): Tema | null {
		try {
			const v = localStorage.getItem(STORAGE_KEY_THEME);
			return v === 'light' || v === 'dark' ? v : null;
		} catch {
			return null;
		}
	}

	#aplicar() {
		if (typeof document === 'undefined') return;
		document.documentElement.setAttribute('data-theme', this.resuelto);
		// La barra del navegador y la del sistema en móvil. `app.html` deja una
		// sola meta `theme-color` viva y sin `media`, así que aquí basta con
		// reescribir su contenido; si no existiera, tampoco pasa nada.
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute('content', this.resuelto === 'light' ? '#f4f4f9' : '#0a0a16');
		// Lo que va por CSS ya ha cambiado con el atributo. Esto es para lo que no:
		// los lienzos de Chart.js, que recibieron cadenas de color al construirse.
		// Va por evento y no por import para no arrastrar Chart.js a las páginas
		// públicas — ver `EVENTO_TEMA` en `chart-theme.ts`.
		window.dispatchEvent(new CustomEvent('corebalance:tema'));
	}

	/** Fija un tema explícito y lo recuerda. */
	set(tema: Tema) {
		this.preferencia = tema;
		this.resuelto = tema;
		this.#aplicar();
		try {
			localStorage.setItem(STORAGE_KEY_THEME, tema);
		} catch {
			// Modo privado de Safari y poco más. El tema vale para esta sesión.
		}
	}

	/**
	 * Olvida la elección y vuelve al predeterminado de la aplicación.
	 *
	 * ⚠️ Sustituye a `seguirAlSistema()`, que devolvía la decisión a
	 * `prefers-color-scheme`. Ya no hay a quién devolvérsela: el predeterminado es
	 * el oscuro, decidido aquí. Sigue sin tener interfaz, por la misma razón que
	 * la tenía la anterior — un tercer estado en un botón de dos posiciones —
	 * pero deja el `localStorage` limpio, que es lo que hace falta para probar el
	 * arranque sin elección previa.
	 */
	olvidar() {
		this.preferencia = null;
		try {
			localStorage.removeItem(STORAGE_KEY_THEME);
		} catch {
			// Ídem.
		}
		this.resuelto = 'dark';
		this.#aplicar();
	}

	alternar() {
		this.set(this.resuelto === 'dark' ? 'light' : 'dark');
	}
}

export const theme = new ThemeStore();
