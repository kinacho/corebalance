import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

/**
 * El `noindex` del dashboard, que tiene que viajar en la **cabecera HTTP**.
 *
 * ⚠️ El `<meta name="robots">` de `dashboard/+page.svelte` no sirve para esto: esa página
 * es `ssr = false`, así que el HTML servido es la cáscara de `app.html` y el `<meta>` sólo
 * existe después de hidratar. Medido en producción el 10-ago-2026: `/dashboard` respondía
 * 200 con 6.490 bytes, sin `noindex` en el HTML y sin `X-Robots-Tag`, y Search Console lo
 * reportaba como «soft 404» — que es literalmente lo que ve quien no ejecuta JavaScript.
 */
async function cabecerasDe(pathname: string) {
	const response = await (handle as Handle)({
		event: fakeEvent(pathname),
		resolve: async () => new Response('<html>%lang%</html>', { headers: { 'Content-Type': 'text/html' } })
	} as Parameters<Handle>[0]);
	return response.headers;
}

describe('hooks.server: noindex del área privada', () => {
	it('el dashboard se sirve con X-Robots-Tag noindex', async () => {
		expect((await cabecerasDe('/dashboard')).get('X-Robots-Tag')).toBe('noindex, nofollow');
	});

	it('también sus subrutas', async () => {
		expect((await cabecerasDe('/dashboard/algo')).get('X-Robots-Tag')).toBe('noindex, nofollow');
	});

	/**
	 * `/sync` es el receptor del traspaso por QR: `ssr = false` —obligado, porque la
	 * cartera viaja en el fragmento y el fragmento no llega al servidor—, así que un
	 * rastreador ve otra cáscara vacía. Y no es una página que tenga sentido en un
	 * índice: es el otro extremo de un código escaneado con la cámara.
	 */
	it('el receptor del traspaso por QR tampoco se indexa', async () => {
		expect((await cabecerasDe('/sync')).get('X-Robots-Tag')).toBe('noindex, nofollow');
	});

	/** Y como `/dashboard`, sirve según cookie: sin esto el CDN mezcla idiomas. */
	it('el receptor del traspaso varía por cookie', async () => {
		expect((await cabecerasDe('/sync')).get('Vary')).toBe('Cookie');
	});

	/**
	 * Y el contrapeso, que es lo que hace útil al test anterior: el contenido público —que
	 * es justo lo que sí queremos indexado— no puede llevar la cabecera. Un `noindex`
	 * escapado a las 70 URLs del sitemap sería mucho peor que el soft 404 que se venía a
	 * arreglar.
	 */
	it('las páginas públicas no la llevan', async () => {
		for (const ruta of ['/', '/en', '/herramientas', '/en/herramientas', '/blog']) {
			expect((await cabecerasDe(ruta)).get('X-Robots-Tag')).toBeNull();
		}
	});
});

/**
 * ⚠️ La coherencia entre `robots.txt` y esa cabecera, que es la parte que se olvida.
 *
 * `/dashboard` estuvo en `Disallow` y ahí está la trampa: una URL bloqueada no se rastrea,
 * luego el buscador **nunca ve el `noindex`** y su estado en el informe no cambia nunca.
 * Bloquear ahorra rastreo; no desindexa. Si alguien devuelve ese `Disallow`, la cabecera de
 * arriba deja de servir para nada y el «soft 404» vuelve a quedarse congelado — sin que
 * ningún otro test se entere, porque la cabecera seguiría estando ahí.
 */
describe('robots.txt', () => {
	// `import.meta.url` no es un `file://` bajo el plugin de SvelteKit, así que se lee
	// relativo al cwd, como ya hace `parsers.test.ts` con sus fixtures.
	const robots = readFileSync(join(process.cwd(), 'static', 'robots.txt'), 'utf8');

	it('no bloquea /dashboard, o el noindex de la cabecera no se leería nunca', () => {
		const reglas = robots
			.split('\n')
			.filter((l) => /^\s*Disallow:/i.test(l))
			.map((l) => l.split(':')[1].trim());

		expect(reglas).not.toContain('/dashboard');
		expect(reglas.some((r) => r !== '/' && '/dashboard'.startsWith(r))).toBe(false);
	});

	it('sigue bloqueando /api, que no tiene nada que indexar', () => {
		expect(robots).toMatch(/^\s*Disallow:\s*\/api\s*$/m);
	});

	it('declara el sitemap', () => {
		expect(robots).toMatch(/^Sitemap:\s*https:\/\/corebalance\.app\/sitemap\.xml\s*$/m);
	});
});
