import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
import { DEFAULT_LOCALE } from '$lib/i18n/routing';
import type { Locales } from '$lib/i18n/i18n-types';

/**
 * Único punto que fija el idioma en el cliente.
 *
 * Antes había cinco: el hook, este layout, el layout del grupo público, el load
 * de los posts y `switchLocale()`. Como el idioma vive en un store global
 * mutable, en cuanto dos de ellos discrepaban se veía media página traducida.
 *
 * Ahora la derivación ocurre en un solo sitio —`hooks.server.ts`, que decide por
 * URL en las rutas públicas, por el slug en los posts y por cookie en el área
 * autenticada— y aquí sólo se aplica lo que ya viene resuelto en `data.locale`.
 *
 * Ya no se lee `localStorage`: era una cuarta fuente de verdad que podía
 * contradecir a la URL (un usuario con preferencia EN abriendo `/blog` veía la
 * interfaz en inglés sobre contenido español). La cookie sigue guardando la
 * preferencia, porque es la que el servidor puede leer.
 */
export const load: LayoutLoad = async ({ data }) => {
	const locale = (data?.locale ?? DEFAULT_LOCALE) as Locales;

	await loadLocaleAsync(locale);
	setLocale(locale);

	// Si alguien llega a `/en/...` desde Google, esa visita fija su preferencia
	// para el área autenticada, que no tiene URL por idioma. Es el único sitio
	// donde se escribe la cookie de idioma en navegación normal.
	if (browser && !document.cookie.includes(`lang=${locale}`)) {
		document.cookie = `lang=${locale}; path=/; max-age=31536000; SameSite=Lax`;
	}

	return { ...data, locale };
};
