import type { PageLoad } from './$types';

export const prerender = true;

/**
 * Solo en espanol: la regla que aplica es del IRPF. Y con las alternativas declaradas,
 * el selector de idioma no compone una URL inexistente.
 */
const ALTERNATIVAS = { es: '/herramientas/cuando-puedo-recomprar', en: null } as const;

export const load: PageLoad = () => ({ locale: 'es' as const, langAlternates: ALTERNATIVAS });
