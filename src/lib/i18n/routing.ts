import type { Locales } from './i18n-types';
import {
	BILINGUAL_ROUTES as ROUTES,
	NOINDEX_ROUTES as NOINDEX,
	DEFAULT_LOCALE as DEFAULT,
	PREFIXED_LOCALES as PREFIXED
} from './bilingual-routes.js';

export const SITE_URL = 'https://corebalance.app';

/** Idioma servido en la raíz del sitio, sin prefijo en la URL. */
export const DEFAULT_LOCALE = DEFAULT as Locales;

/** Idiomas que sí llevan prefijo (`/en/...`). */
export const PREFIXED_LOCALES = PREFIXED as Locales[];

/** Rutas públicas con variante por idioma en la URL. Ver `bilingual-routes.js`. */
export const BILINGUAL_ROUTES: readonly string[] = ROUTES;

/** Rutas bilingües que se declaran `noindex` y por tanto no van al sitemap. */
export const NOINDEX_ROUTES: readonly string[] = NOINDEX;

/** ¿Esta ruta se declara `noindex`? */
export function isNoindexRoute(pathname: string): boolean {
	return NOINDEX_ROUTES.includes(stripLocale(pathname));
}

const PREFIX_RE = new RegExp(`^/(${PREFIXED_LOCALES.join('|')})(?=/|$)`);

/** Quita el prefijo de idioma de un pathname: `/en/blog` → `/blog`. */
export function stripLocale(pathname: string): string {
	const stripped = pathname.replace(PREFIX_RE, '');
	return stripped === '' ? '/' : stripped;
}

/** Deduce el idioma a partir del pathname. */
export function localeFromPath(pathname: string): Locales {
	const match = pathname.match(PREFIX_RE);
	return (match?.[1] as Locales) ?? DEFAULT_LOCALE;
}

/** Traduce un pathname al idioma indicado: (`/blog`, 'en') → `/en/blog`. */
export function localizePath(pathname: string, lang: Locales): string {
	const base = stripLocale(pathname);
	if (lang === DEFAULT_LOCALE) return base;
	return base === '/' ? `/${lang}` : `/${lang}${base}`;
}

/** Convierte un pathname en URL absoluta, sin barra final salvo en la raíz. */
export function absoluteUrl(pathname: string): string {
	const path = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
	return `${SITE_URL}${path}`;
}

export interface Alternates {
	canonical: string;
	es: string;
	en: string;
	xDefault: string;
}

/**
 * URLs alternativas reales de una ruta bilingüe.
 * `x-default` apunta al español porque es el idioma de la raíz.
 */
export function alternates(pathname: string, lang: Locales): Alternates {
	const base = stripLocale(pathname);
	const es = absoluteUrl(base);
	const en = absoluteUrl(localizePath(base, 'en'));
	return {
		canonical: lang === DEFAULT_LOCALE ? es : en,
		es,
		en,
		xDefault: es
	};
}

/** ¿Esta ruta tiene variante por idioma en la URL? */
export function isBilingualRoute(pathname: string): boolean {
	return BILINGUAL_ROUTES.includes(stripLocale(pathname));
}

/**
 * Traduce un enlace interno al idioma actual, dejando intacto lo que no tiene
 * variante de idioma en la URL: `/dashboard`, `/blog/<slug>` (cada post ya
 * tiene su slug traducido) y cualquier destino externo.
 *
 * Conserva hash y query: (`/#features`, 'en') → `/en#features`.
 */
export function localeLink(href: string, lang: Locales): string {
	if (!href.startsWith('/')) return href;

	const cut = href.search(/[#?]/);
	const pathname = cut === -1 ? href : href.slice(0, cut);
	const suffix = cut === -1 ? '' : href.slice(cut);

	if (!isBilingualRoute(pathname)) return href;

	return localizePath(pathname, lang) + suffix;
}

/** Rutas que sirven contenido según cookie y por tanto no se pueden cachear en CDN. */
export function isLocaleCookieRoute(pathname: string): boolean {
	return pathname.startsWith('/dashboard') || pathname.startsWith('/api');
}
