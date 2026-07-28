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

/** Idioma servido en la raíz del sitio, sin prefijo en la URL. */
export const DEFAULT_LOCALE = 'es';

/** Idiomas que sí llevan prefijo en la URL. */
export const PREFIXED_LOCALES = ['en'];
