import { getCurso, getCursos, getLecciones } from '$lib/cursos';
import { error } from '@sveltejs/kit';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

/**
 * El selector de idioma compone `/en/...` cuando la página no declara alternativas, y
 * estas rutas existen **solo en español**: sin esto, pulsar EN lleva a un 404.
 *
 * ⚠️ Declarando las dos alternativas a `null`, el selector usa su respaldo documentado
 * —«nunca un enlace roto»— en vez de componer una URL que no existe. Es la misma
 * solución que ya usan los posts del blog, cuyo gemelo tampoco siempre existe.
 */
const ALTERNATIVAS = { es: null, en: null } as const;

export const entries: EntryGenerator = () => getCursos().map((c) => ({ curso: c.slug }));

export const load: PageLoad = ({ params }) => {
	const curso = getCurso(params.curso);
	if (!curso) error(404, 'Curso no encontrado');

	const lecciones = getLecciones(curso.slug).map(({ content, ...meta }) => {
		void content;
		return meta;
	});
	return { curso, lecciones, locale: 'es' as const, langAlternates: { es: `/cursos/${curso.slug}`, en: null } };
};
