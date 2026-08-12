import { getCurso, getCursos, getLeccion, getLecciones, vecinas } from '$lib/cursos';
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

export const entries: EntryGenerator = () =>
	getCursos().flatMap((c) => getLecciones(c.slug).map((l) => ({ curso: c.slug, leccion: l.slug })));

export const load: PageLoad = ({ params }) => {
	const curso = getCurso(params.curso);
	const leccion = curso ? getLeccion(curso.slug, params.leccion) : undefined;
	if (!curso || !leccion) error(404, 'Leccion no encontrada');

	// Las vecinas viajan sin su componente compilado: solo se pintan sus rotulos.
	const { anterior, siguiente, indice, total } = vecinas(curso.slug, leccion.slug);
	const soloMeta = (l: ReturnType<typeof getLeccion>) =>
		l ? { slug: l.slug, titulo: l.titulo, orden: l.orden } : null;

	return {
		curso,
		leccion,
		anterior: soloMeta(anterior ?? undefined),
		siguiente: soloMeta(siguiente ?? undefined),
		indice,
		total,
		locale: 'es' as const,
		langAlternates: { es: `/cursos/${curso.slug}/${leccion.slug}`, en: null }
	};
};
