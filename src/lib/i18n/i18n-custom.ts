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
		try {
			// Guardar preferencia en el servidor vía API
			await fetch('/api/lang', {
				method: 'POST',
				body: JSON.stringify({ locale: newLocale }),
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (e) {
			console.error('Error saving locale:', e);
			// Fallback a cookie manual si falla el fetch
			document.cookie = `lang=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
		}

		// Actualizar el atributo lang del HTML
		document.documentElement.lang = newLocale;
		// Notificar a SvelteKit para que re-ejecute los load functions
		await invalidateAll();
	}
}
