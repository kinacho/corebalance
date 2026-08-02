import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { handle } from './hooks.server';
import { locale } from '$lib/i18n/i18n-svelte';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';

/**
 * El idioma en SSR vive en un store global de módulo, compartido por todas las
 * peticiones del proceso. Estas pruebas fijan lo único que impide que dos
 * peticiones concurrentes se pisen: que el hook serialice el tramo que va de
 * fijar el idioma a devolver la respuesta.
 *
 * Son pruebas de calendario, no de contenido: lo que se comprueba es *cuándo*
 * puede cambiar el store, porque el fallo no era un texto mal traducido sino un
 * render leyendo el diccionario de otro visitante.
 */

/** Cede el control varias veces, que es donde el bug se colaba. */
async function yieldRepeatedly(times = 3) {
	for (let i = 0; i < times; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
}

function fakeEvent(pathname: string, cookies: Record<string, string> = {}) {
	const store = { ...cookies };
	return {
		url: new URL(`https://corebalance.app${pathname}`),
		request: new Request(`https://corebalance.app${pathname}`),
		locals: {},
		cookies: {
			get: (name: string) => store[name],
			set: (name: string, value: string) => {
				store[name] = value;
			}
		}
	} as unknown as RequestEvent;
}

/**
 * Llama al hook y devuelve el idioma que el store tenía **dentro** de `resolve`,
 * después de ceder el control. Ese es el momento en el que Svelte renderiza y
 * lee `$LL`, así que es el único que importa.
 */
async function localeSeenWhileRendering(pathname: string, cookies?: Record<string, string>) {
	let seen: string | undefined;

	await (handle as Handle)({
		event: fakeEvent(pathname, cookies),
		resolve: async () => {
			await yieldRepeatedly();
			seen = get(locale);
			return new Response('<html>%lang%</html>', {
				headers: { 'Content-Type': 'text/html' }
			});
		}
	} as Parameters<Handle>[0]);

	return seen;
}

describe('hooks.server: aislamiento del idioma entre peticiones', () => {
	beforeEach(async () => {
		await loadLocaleAsync('es');
	});

	it('dos peticiones concurrentes en idiomas distintos no se pisan el store', async () => {
		// `/` es español y `/en` inglés por prefijo de URL, sin cookie de por medio.
		const [es, en] = await Promise.all([
			localeSeenWhileRendering('/'),
			localeSeenWhileRendering('/en')
		]);

		// Sin la cola, la segunda llamada hacía `setLocale('en')` mientras la
		// primera estaba dormida en un `await`, y la primera despertaba en inglés.
		expect(es).toBe('es');
		expect(en).toBe('en');
	});

	it('aguanta con muchas peticiones alternando idioma', async () => {
		const paths = ['/', '/en', '/', '/en', '/', '/en', '/blog', '/en/herramientas'];
		const expected = ['es', 'en', 'es', 'en', 'es', 'en', 'es', 'en'];

		const seen = await Promise.all(paths.map((path) => localeSeenWhileRendering(path)));

		expect(seen).toEqual(expected);
	});

	it('una petición que falla no deja la cola atascada', async () => {
		const boom = (handle as Handle)({
			event: fakeEvent('/en'),
			resolve: async () => {
				await yieldRepeatedly();
				throw new Error('render reventado');
			}
		} as Parameters<Handle>[0]);

		await expect(boom).rejects.toThrow('render reventado');

		// Si la cola se hubiera encadenado a la promesa rechazada, esto no
		// resolvería nunca y la prueba moriría por timeout.
		await expect(localeSeenWhileRendering('/')).resolves.toBe('es');
	});

	it('las llamadas a /api no tocan el idioma de una página que se está renderizando', async () => {
		let duringRender: string | undefined;

		const page = (handle as Handle)({
			event: fakeEvent('/'),
			resolve: async () => {
				// Mientras esta página duerme, entra una llamada de precios en inglés.
				await (handle as Handle)({
					event: fakeEvent('/api/prices', { lang: 'en' }),
					resolve: async () => new Response('{}')
				} as Parameters<Handle>[0]);

				duringRender = get(locale);
				return new Response('<html>%lang%</html>');
			}
		} as Parameters<Handle>[0]);

		await page;

		// `/api` queda fuera de la cola a propósito, así que la única garantía es
		// que no escriba el store. Si algún día un endpoint necesita traducir,
		// tendrá que usar `i18nObject(locale)` y no `setLocale`.
		expect(duringRender).toBe('es');
	});
});
