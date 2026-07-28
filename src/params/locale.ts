import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Sólo 'en' es un prefijo de idioma válido en la URL.
 *
 * El español es el idioma por defecto y vive en la raíz (`/`, `/blog`, …), así
 * que no lleva prefijo. Restringir el matcher a 'en' es lo que evita que
 * `[[lang=locale]]` capture rutas como `/dashboard` o `/comparativas`.
 */
export const match: ParamMatcher = (param) => param === 'en';
