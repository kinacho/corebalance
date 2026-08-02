import type { Handle, RequestEvent } from '@sveltejs/kit';
import { building } from '$app/environment';
import { locales, detectLocale } from '$lib/i18n/i18n-util';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
import { setLocale } from '$lib/i18n/i18n-svelte';
import {
	initAcceptLanguageHeaderDetector,
} from 'typesafe-i18n/detectors';
import type { Locales } from '$lib/i18n/i18n-types';
import { isBilingualRoute, isLocaleCookieRoute, localeFromPath } from '$lib/i18n/routing';
import { postLocale } from '$lib/blog-locales';

/**
 * Resuelve el idioma dando prioridad a la URL sobre la cookie.
 *
 * Es lo que permite que Googlebot —sin cookies y a menudo sin Accept-Language—
 * reciba `/` en español y `/en/...` en inglés de forma determinista, en vez de
 * caer siempre en el fallback y dejar el contenido inglés sin indexar.
 */
const getLocale = (event: RequestEvent): Locales => {
	const path = event.url.pathname;

	// 1. Rutas bilingües: manda el prefijo de la URL.
	if (isBilingualRoute(path)) {
		return localeFromPath(path);
	}

	// 2. Un post del blog está escrito en un solo idioma: ese es el idioma de la página.
	const blogMatch = path.match(/^\/blog\/([^/]+)\/?$/);
	if (blogMatch) {
		const lang = postLocale(decodeURIComponent(blogMatch[1]));
		if (lang) return lang;
	}

	// 3. Resto (dashboard, api): cookie guardada.
	const langCookie = event.cookies.get('lang');
	if (langCookie && locales.includes(langCookie as Locales)) {
		return langCookie as Locales;
	}

	// 4. Detector de Accept-Language header (usa 'es' como baseLocale fallback)
	const headerDetector = initAcceptLanguageHeaderDetector(event.request);
	return detectLocale(headerDetector);
};

/**
 * Cola de un solo carril para todo lo que renderiza Svelte en servidor.
 *
 * `setLocale` escribe un store global de módulo, compartido por todas las
 * peticiones del proceso. Es lo que hace funcionar `$LL` al renderizar en
 * servidor, y también lo que permitía que dos peticiones en idiomas distintos se
 * entrelazasen en cualquier `await` entre el `setLocale` y el render, dejando a
 * una renderizando con el diccionario de la otra.
 *
 * Aquí se cierra por el lado del calendario en vez de por el del store: entre
 * fijar el idioma y devolver la respuesta no corre ninguna otra petición que
 * pueda tocarlo. Se eligió esto frente a pasar `i18nObject(locale)` por `data`
 * porque arregla la clase de fallo y no un caso: hoy el único árbol que se
 * renderiza en tiempo de petición es el de error, pero el día que una ruta deje
 * de estar prerenderizada el arreglo sigue en pie sin tocar ningún `$LL`.
 *
 * El coste de serializar es asumible **porque el conjunto es diminuto**: las 76
 * páginas públicas son ficheros estáticos que ni pasan por aquí, y `/dashboard`
 * es `ssr = false`, o sea una cáscara sin componentes. En la práctica la cola
 * sólo ve páginas de error. `/api/*` queda fuera a propósito: es la superficie
 * con tráfico real (el sondeo de precios cada 30 s) y no renderiza nada.
 */
let renderQueue: Promise<unknown> = Promise.resolve();

function inRenderQueue<T>(run: () => Promise<T>): Promise<T> {
	const result = renderQueue.then(run, run);
	// La cola nunca debe quedarse rota: si un render revienta, el siguiente entra
	// igual. De ahí que se encadene una promesa ya neutralizada y no `result`.
	renderQueue = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}

export const handle: Handle = async ({ event, resolve }) => {
	const locale = getLocale(event);
	const dependsOnCookie = isLocaleCookieRoute(event.url.pathname);

	/**
	 * `/api/*` no renderiza componentes, así que ni necesita el store ni debe
	 * escribirlo: si lo hiciera, una petición de precios podría cambiarle el
	 * idioma a una página que está a mitad de render, y la cola no la protegería
	 * porque los endpoints no pasan por ella.
	 */
	const rendersComponents = !event.url.pathname.startsWith('/api');

	const respond = async () => {
		if (rendersComponents) {
			await loadLocaleAsync(locale);
			setLocale(locale);
		}
		event.locals.locale = locale;

		// La cookie de idioma se fija sólo donde de verdad decide el contenido: el
		// área autenticada. Fijarla en las páginas públicas obligaba a mandar
		// `Vary: Cookie` + `Set-Cookie` en la primera visita y anulaba la caché de
		// la CDN, penalizando el TTFB de usuarios y crawlers.
		if (!building && dependsOnCookie && !event.cookies.get('lang')) {
			event.cookies.set('lang', locale, {
				path: '/',
				maxAge: 60 * 60 * 24 * 365,
				sameSite: 'lax',
				httpOnly: false,
				secure: true
			});
		}

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', locale)
		});
	};

	const response = rendersComponents ? await inRenderQueue(respond) : await respond();

	if (dependsOnCookie) {
		response.headers.set('Vary', 'Cookie');
	}

	// --- Cabeceras de Seguridad ---
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	
	// --- Configuración de Content Security Policy (CSP) ---
	const cspDirectives = {
		'default-src': ["'self'"],
		'script-src': [
			"'self'", 
			"'unsafe-inline'", 
			"https://apis.google.com", 
			"https://www.gstatic.com", 
			"https://*.googleapis.com", 
			"https://*.firebaseapp.com",
			"https://va.vercel-scripts.com"
		],
		'script-src-elem': [
			"'self'", 
			"'unsafe-inline'", 
			"https://apis.google.com", 
			"https://www.gstatic.com", 
			"https://*.googleapis.com", 
			"https://*.firebaseapp.com",
			"https://va.vercel-scripts.com"
		],
		'connect-src': [
			"'self'", 
			"*.firebaseio.com", 
			"*.googleapis.com", 
			"*.google.com", 
			"https://*.firebaseapp.com",
			"https://securetoken.googleapis.com",
			"https://identitytoolkit.googleapis.com",
			"https://*.vercel-analytics.com"
		],
		'img-src': ["'self'", "data:", "https:"],
		'font-src': ["'self'", "https://fonts.gstatic.com"],
		'frame-src': [
			"'self'", 
			"https://*.firebaseapp.com", 
			"https://*.google.com",
			"https://content.googleapis.com"
		],
		'frame-ancestors': ["'self'"],
		'style-src': ["'self'", "'unsafe-inline'"]
	};

	const cspString = Object.entries(cspDirectives)
		.map(([key, values]) => `${key} ${values.join(' ')}`)
		.join('; ');
	
	response.headers.set('Content-Security-Policy', cspString);

	return response;
};
