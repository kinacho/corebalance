import type { Handle, RequestEvent } from '@sveltejs/kit';
import { locales, detectLocale } from '$lib/i18n/i18n-util';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
import { setLocale } from '$lib/i18n/i18n-svelte';
import {
	initAcceptLanguageHeaderDetector,
} from 'typesafe-i18n/detectors';
import type { Locales } from '$lib/i18n/i18n-types';

const getLocale = (event: RequestEvent): Locales => {
	// 1. Prioridad: Cookie guardada
	const langCookie = event.cookies.get('lang');
	if (langCookie && locales.includes(langCookie as Locales)) {
		return langCookie as Locales;
	}

	// 2. Detector de Accept-Language header (usa 'es' como baseLocale fallback)
	const headerDetector = initAcceptLanguageHeaderDetector(event.request);
	return detectLocale(headerDetector);
};

export const handle: Handle = async ({ event, resolve }) => {
	const locale = getLocale(event);

	await loadLocaleAsync(locale);
	setLocale(locale);
	event.locals.locale = locale;

	// Si no hay cookie, la fijamos para futuras peticiones (persistencia por defecto)
	if (!event.cookies.get('lang')) {
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

	response.headers.set('Vary', 'Cookie');

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
