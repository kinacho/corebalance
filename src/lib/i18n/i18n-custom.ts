import { invalidateAll } from '$app/navigation';
import { setLocale } from './i18n-svelte';
import { loadLocaleAsync } from './i18n-util.async';
import type { Locales } from './i18n-types';
import { browser } from '$app/environment';

/**
 * Cambia el idioma de la aplicación de forma consistente
 * @param newLocale El nuevo idioma a establecer
 */
export async function switchLocale(newLocale: Locales) {
	await loadLocaleAsync(newLocale);
	setLocale(newLocale);
	
	if (browser) {
		// Guardar preferencia en cookie (1 año)
		document.cookie = `lang=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
		// Actualizar el atributo lang del HTML
		document.documentElement.lang = newLocale;
		// Notificar a SvelteKit para que re-ejecute los load functions
		await invalidateAll();
	}
}
