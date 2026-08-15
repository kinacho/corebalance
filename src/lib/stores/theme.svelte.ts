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
 * ⚠️ **`resuelto` es `$state`, no un `$derived` del DOM**, porque el atributo no es
 * reactivo: nada avisa a Svelte de que ha cambiado. El store es la única fuente de
 * verdad una vez arrancado, y `aplicar()` mantiene el DOM en sincronía con él —
 * nunca al revés.
 */
class ThemeStore {
	/**
	 * Lo que el usuario ha elegido explícitamente, o `'system'` si no ha elegido.
	 * Se distingue de `resuelto` porque son preguntas distintas: quien está en
	 * `'system'` debe seguir al sistema cuando el sistema cambie, y quien eligió
	 * `'dark'` a mediodía no quiere que su tema cambie al anochecer.
	 */
	preferencia = $state<Tema | 'system'>('system');

	/** El tema que está pintado ahora mismo. Nunca `'system'`. */
	resuelto = $state<Tema>('dark');

	constructor() {
		if (typeof document === 'undefined') return;

		const guardado = this.#leerGuardado();
		this.preferencia = guardado ?? 'system';
		this.resuelto =
			guardado ?? (document.documentElement.getAttribute('data-theme') as Tema) ?? 'dark';

		// Quien no ha elegido sigue al sistema, también si el sistema cambia con la
		// pestaña abierta (es lo que pasa al anochecer con el tema automático de macOS
		// y Windows). Quien sí eligió no se ve afectado.
		window
			.matchMedia('(prefers-color-scheme: light)')
			.addEventListener('change', (e) => {
				if (this.preferencia !== 'system') return;
				this.resuelto = e.matches ? 'light' : 'dark';
				this.#aplicar();
			});
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

	/** Devuelve la decisión al sistema operativo. */
	seguirAlSistema() {
		this.preferencia = 'system';
		try {
			localStorage.removeItem(STORAGE_KEY_THEME);
		} catch {
			// Ídem.
		}
		if (typeof window === 'undefined') return;
		this.resuelto = window.matchMedia('(prefers-color-scheme: light)').matches
			? 'light'
			: 'dark';
		this.#aplicar();
	}

	alternar() {
		this.set(this.resuelto === 'dark' ? 'light' : 'dark');
	}
}

export const theme = new ThemeStore();
