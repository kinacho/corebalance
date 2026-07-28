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

export const handle: Handle = async ({ event, resolve }) => {
	const locale = getLocale(event);
	const dependsOnCookie = isLocaleCookieRoute(event.url.pathname);

	await loadLocaleAsync(locale);

	/**
	 * ⚠️ `setLocale` escribe un store global de módulo, compartido por todas las
	 * peticiones del proceso. Es necesario para que `$LL` funcione al renderizar
	 * en servidor, pero significa que dos peticiones concurrentes en idiomas
	 * distintos pueden entrelazarse en un `await` y una renderizar con el
	 * diccionario de la otra.
	 *
	 * Hoy el alcance es pequeño: todo lo público está prerenderizado, así que la
	 * única ruta que se renderiza en servidor es `/dashboard`, y allí el peor caso
	 * es un parpadeo hasta que hidrata. El arreglo definitivo es no usar el store
	 * global en SSR: pasar el objeto de traducciones por `data` con
	 * `i18nObject(locale)`, que es por petición. Toca todos los usos de `$LL`, así
	 * que se deja anotado en vez de hacerlo a medias.
	 */
	setLocale(locale);
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

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});

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
