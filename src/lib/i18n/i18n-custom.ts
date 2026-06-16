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
		// 1. Guardar en localStorage (persistencia fuerte en el cliente)
		localStorage.setItem('lang', newLocale);
		
		// 2. Actualizar la cookie inmediatamente para que las peticiones de SvelteKit la lleven
		document.cookie = `lang=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

		try {
			// 3. Guardar preferencia en el servidor vía API (opcional pero recomendado)
			fetch('/api/lang', {
				method: 'POST',
				body: JSON.stringify({ locale: newLocale }),
				headers: { 'Content-Type': 'application/json' }
			}).catch(e => console.error('Error saving locale via API:', e));
		} catch (e) {
			// Ignorar errores del fetch ya que la cookie ya está puesta
		}

		// Actualizar el atributo lang del HTML
		document.documentElement.lang = newLocale;
		// Notificar a SvelteKit para que re-ejecute los load functions
		await invalidateAll();
	}
}
