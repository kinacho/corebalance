import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
import { setLocale } from '$lib/i18n/i18n-svelte';
import type { Locales } from '$lib/i18n/i18n-types';
import { DEFAULT_LOCALE } from '$lib/i18n/routing';

/**
 * Todo lo público es contenido estático: se prerenderiza una copia por idioma
 * (`/` en español, `/en` en inglés) para que Googlebot —que rastrea sin cookies
 * y normalmente sin Accept-Language— vea HTML servido en el idioma de la URL.
 */
export const prerender = true;

/**
 * Aquí el idioma lo manda la URL, no la cookie. Es la diferencia clave con el
 * área autenticada: dos URLs distintas e indexables en lugar de una que cambia
 * de contenido según quién la pida.
 */
export const load: LayoutLoad = async ({ params }) => {
	const locale = ((params as { lang?: string }).lang as Locales | undefined) ?? DEFAULT_LOCALE;

	await loadLocaleAsync(locale);
	setLocale(locale);

	// El idioma de la URL pasa a ser la preferencia del usuario, para que el
	// área autenticada (que sí va por cookie) no le cambie el idioma después.
	if (browser) {
		localStorage.setItem('lang', locale);
		document.documentElement.lang = locale;
		if (!document.cookie.includes(`lang=${locale}`)) {
			document.cookie = `lang=${locale}; path=/; max-age=31536000; SameSite=Lax`;
		}
	}

	return { locale };
};
