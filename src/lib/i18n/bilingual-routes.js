/**
 * Rutas públicas que existen en las dos variantes de URL (`/x` y `/en/x`).
 *
 * Fuente de verdad única: la consumen `routing.ts` (hreflang, sitemap, enlaces)
 * y `svelte.config.js` (entries de prerender). Está en JS plano justamente para
 * que la config de Svelte pueda importarla sin pasar por TypeScript.
 *
 * Los posts del blog NO están aquí: cada uno tiene su propio slug traducido
 * (`/blog/rebalanceo-degiro-etfs` vs `/blog/degiro-etf-rebalancing`), esas URLs
 * ya están indexadas y moverlas a `/en/blog/...` sólo añadiría redirecciones.
 *
 * @type {readonly string[]}
 */
export const BILINGUAL_ROUTES = [
	'/',
	'/blog',
	'/comparativas/corebalance-vs-portfolio-performance',
	'/comparativas/corebalance-vs-excel',
	'/comparativas/corebalance-vs-indexa-capital',
	'/herramientas/calculadora-ter',
	'/herramientas/checklist-rebalanceo',
	'/autor/kinacho',
	'/privacy',
	'/terms',
	'/cookies'
];

/**
 * Rutas bilingües que llevan `<meta name="robots" content="noindex">`.
 *
 * Existen en los dos idiomas y se enlazan desde el footer, así que tienen que
 * estar en BILINGUAL_ROUTES para que el prerender y los enlaces funcionen — pero
 * NO deben aparecer en el sitemap: pedir en el sitemap que se indexe una página
 * que se declara noindex es una contradicción, y Search Console la reporta como
 * "URL enviada marcada como noindex".
 *
 * @type {readonly string[]}
 */
export const NOINDEX_ROUTES = ['/privacy', '/terms', '/cookies'];

/** Idioma servido en la raíz del sitio, sin prefijo en la URL. */
export const DEFAULT_LOCALE = 'es';

/** Idiomas que sí llevan prefijo en la URL. */
export const PREFIXED_LOCALES = ['en'];

const PREFIX_RE = new RegExp(`^/(${PREFIXED_LOCALES.join('|')})(?=/|$)`);

/**
 * Implementación única de la localización de rutas. Vive aquí, en JS plano, para
 * que la compartan los tres consumidores sin duplicar la regla:
 *
 * - `routing.ts` → enlaces de los componentes (`$link`) y hreflang.
 * - `svelte.config.js` → el plugin remark que localiza los enlaces del markdown.
 * - la config de prerender → las entradas `/en/...`.
 *
 * @param {string} pathname
 * @returns {string}
 */
export function stripLocalePrefix(pathname) {
	const stripped = pathname.replace(PREFIX_RE, '');
	return stripped === '' ? '/' : stripped;
}

/**
 * @param {string} pathname
 * @param {string} lang
 * @returns {string}
 */
export function localizeRoute(pathname, lang) {
	const base = stripLocalePrefix(pathname);
	if (lang === DEFAULT_LOCALE) return base;
	return base === '/' ? `/${lang}` : `/${lang}${base}`;
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isBilingualRoute(pathname) {
	return BILINGUAL_ROUTES.includes(stripLocalePrefix(pathname));
}

/**
 * Traduce un enlace interno al idioma indicado, conservando hash y query.
 *
 * Deja intacto lo que no tiene variante de idioma en la URL:
 * - `/blog/<slug>`, porque cada post ya tiene su propio slug traducido;
 * - `/dashboard` y `/api/...`, que no existen bajo `/en/`;
 * - cualquier destino externo o ancla.
 *
 * @param {string} href
 * @param {string} lang
 * @returns {string}
 */
export function localizeInternalLink(href, lang) {
	if (typeof href !== 'string' || !href.startsWith('/')) return href;

	const cut = href.search(/[#?]/);
	const pathname = cut === -1 ? href : href.slice(0, cut);
	const suffix = cut === -1 ? '' : href.slice(cut);

	if (!isBilingualRoute(pathname)) return href;

	return localizeRoute(pathname, lang) + suffix;
}
