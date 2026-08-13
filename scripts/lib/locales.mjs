/**
 * Los idiomas del sitio, para los scripts de `prebuild`.
 *
 * Vive aparte porque lo comparten `og-pages.mjs` (para el valor por defecto de `langs`) y
 * `generate-og.mjs` (para recorrerlos), y meterlo en el primero haría que el generador
 * importase datos de páginas solo para saber los idiomas.
 *
 * El español es el idioma base y vive en la raíz; el inglés lleva prefijo `/en`. La fuente
 * de verdad para la app es `src/lib/i18n/bilingual-routes.js`, que estos scripts no pueden
 * importar por ser Node fuera de Vite.
 */
export const LOCALES = ['es', 'en'];
