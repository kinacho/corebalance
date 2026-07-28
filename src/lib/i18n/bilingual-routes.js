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
