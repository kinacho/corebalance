import type { PageLoad } from './$types';

export const prerender = true;

/**
 * El selector de idioma compone `/en/...` cuando la página no declara alternativas, y
 * estas rutas existen **solo en español**: sin esto, pulsar EN lleva a un 404.
 *
 * ⚠️ Declarando las dos alternativas a `null`, el selector usa su respaldo documentado
 * —«nunca un enlace roto»— en vez de componer una URL que no existe. Es la misma
 * solución que ya usan los posts del blog, cuyo gemelo tampoco siempre existe.
 */
const ALTERNATIVAS = { es: '/herramientas/acumulacion-vs-distribucion', en: null } as const;

// La escala fiscal es espanola; esta pagina no tiene gemela en ingles.
export const load: PageLoad = () => ({ locale: 'es' as const, langAlternates: ALTERNATIVAS });
