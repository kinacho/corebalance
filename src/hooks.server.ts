import type { Handle, RequestEvent } from '@sveltejs/kit';
import { detectLocale } from '$lib/i18n/i18n-util';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
import { setLocale } from '$lib/i18n/i18n-svelte';
import {
	initAcceptLanguageHeaderDetector,
	initRequestCookiesDetector,
} from 'typesafe-i18n/detectors';
import type { Locales } from '$lib/i18n/i18n-types';

const getLocale = (event: RequestEvent): Locales => {
	// 1. Mirar cookie guardada por el usuario
	const langCookie = event.cookies.get('lang');
	if (langCookie) {
		// Pasamos la cookie formateada como cadena 'key=value' que espera el detector de cookies de typesafe-i18n
		const fromCookie = detectLocale(initRequestCookiesDetector({ cookies: `lang=${langCookie}` }));
		if (fromCookie) return fromCookie as Locales;
	}

	// 2. Mirar Accept-Language del navegador
	const fromHeader = detectLocale(initAcceptLanguageHeaderDetector(event.request));
	if (fromHeader) return fromHeader as Locales;

	// 3. Fallback
	return 'es';
};

export const handle: Handle = async ({ event, resolve }) => {
	const locale = getLocale(event);

	await loadLocaleAsync(locale);
	setLocale(locale);
	event.locals.locale = locale;

	const response = await resolve(event);

	// --- Cabeceras de Seguridad ---
	// SAMEORIGIN es necesario para que los iframes de Firebase Auth se comuniquen correctamente
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
			"https://va.vercel-scripts.com" // Añadido para Vercel Analytics / Speed Insights
		],
		'script-src-elem': [
			"'self'", 
			"'unsafe-inline'", 
			"https://apis.google.com", 
			"https://www.gstatic.com", 
			"https://*.googleapis.com", 
			"https://*.firebaseapp.com",
			"https://va.vercel-scripts.com" // Añadido para Vercel Analytics / Speed Insights
		],
		'connect-src': [
			"'self'", 
			"*.firebaseio.com", 
			"*.googleapis.com", 
			"*.google.com", 
			"https://*.firebaseapp.com",
			"https://securetoken.googleapis.com",
			"https://identitytoolkit.googleapis.com",
			"https://*.vercel-analytics.com" // Añadido para las métricas de Vercel
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
