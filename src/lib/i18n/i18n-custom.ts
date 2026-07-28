import { setLocale } from './i18n-svelte';
import { loadLocaleAsync } from './i18n-util.async';
import type { Locales } from './i18n-types';
import { browser } from '$app/environment';

/**
 * Cambia el idioma **en sitio**, sin navegar.
 *
 * Se usa sólo en el área autenticada (el selector del dashboard), donde no hay
 * URL por idioma y todo el texto sale de `$LL`: no existe contenido en el otro
 * idioma con el que quedar descompasado, así que una actualización atómica del
 * store es correcta y es lo más rápido posible.
 *
 * En las páginas públicas **no se usa**: allí cada idioma tiene su URL y el
 * selector es un enlace con `data-sveltekit-reload`, que carga el documento ya
 * renderizado en el idioma correcto.
 *
 * Lo que se ha quitado y por qué:
 *
 * - `invalidate()` + `invalidateAll()`: forzaban re-ejecutar todos los `load`,
 *   incluido el `+layout.server.ts`, o sea un viaje al servidor para un cambio
 *   que es puramente de cliente. Era el motivo de la lentitud, y además volvía a
 *   ejecutar loads que fijan el locale, que podían pisar el idioma recién elegido.
 * - `POST /api/lang`: redundante, la cookie ya se escribe aquí mismo.
 * - `localStorage`: era una cuarta fuente de verdad capaz de contradecir a la
 *   URL. La cookie basta, y es la única que el servidor puede leer.
 */
export async function switchLocale(newLocale: Locales) {
	await loadLocaleAsync(newLocale);
	setLocale(newLocale);

	if (!browser) return;

	// La cookie es la preferencia persistente: la lee `hooks.server.ts` para
	// resolver el idioma del área autenticada en la siguiente petición.
	document.cookie = `lang=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

	// El `lang` del <html> lo escribe el servidor al renderizar; al cambiar en
	// sitio hay que actualizarlo a mano o los lectores de pantalla se quedan con
	// el idioma anterior.
	document.documentElement.lang = newLocale;
}
