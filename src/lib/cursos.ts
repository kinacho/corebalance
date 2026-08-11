import type { ComponentType } from 'svelte';

/**
 * Los cursos: contenido en markdown, misma tubería que el blog.
 *
 * ⚠️ **Solo en español, y es una decisión medida, no una limitación.** El 11-ago-2026,
 * las diez páginas del sitio que traen clics son todas en español; el inglés da
 * impresiones y **cero** clics (`iwda-vs-vwce-comparison`: posición 8,7, 337 impresiones,
 * 0 clics). Traducir un curso entero antes de saber si el formato funciona en el idioma
 * que sí convierte sería repetir esa apuesta a mayor escala. Por eso las rutas viven
 * fuera de `(public)/[[lang=locale]]/` — igual que los posts del blog — y no entran en
 * `BILINGUAL_ROUTES` ni declaran `hreflang`.
 *
 * Por qué una sección propia y no una serie de posts: un curso necesita **orden,
 * progreso y destino**. Un post se lee y se cierra; una lección tiene una anterior, una
 * siguiente y un ejercicio que deja algo hecho en la app.
 */

export interface AccionLeccion {
	/** Qué va a hacer, en una frase. */
	texto: string;
	/** El texto del botón. */
	cta: string;
	/** A dónde. Rutas internas de la propia app. */
	href: string;
}

export interface LeccionMetadata {
	titulo: string;
	descripcion: string;
	/** Posición dentro del curso, empezando en 1. */
	orden: number;
	/** La promesa de la lección, en una línea. Se pinta bajo el título. */
	gancho: string;
	minutos: number;
	/** El ejercicio. Es lo que distingue esto de un artículo. */
	accion: AccionLeccion;
	/**
	 * Artículos del blog que profundizan en la lección.
	 *
	 * ⚠️ No es relleno de enlazado interno: son las 21 piezas en español que ya existen y
	 * que, medido el 11-ago-2026, traen 33 visitantes semanales entre todas. El curso les
	 * da el contexto que nunca tuvieron —un orden y un motivo para leerlas— y ellas le
	 * dan al curso la profundidad que no cabe en una lección.
	 */
	lecturas?: { texto: string; href: string }[];
	/** Fuentes primarias, cuando la lección afirma algo comprobable. */
	fuentes?: { texto: string; url: string }[];
}

export interface Leccion extends LeccionMetadata {
	curso: string;
	slug: string;
	content: ComponentType;
}

export interface Curso {
	slug: string;
	titulo: string;
	/** El gancho. Es lo que se lee antes que nada. */
	gancho: string;
	descripcion: string;
	nivel: string;
	paraQuien: string;
	/** Qué se lleva al terminar. En imperativo de resultado, no de temario. */
	teLlevas: string[];
}

/**
 * ⚠️ La promesa de gratuidad es literal y comprobable, y por eso está aquí en un solo
 * sitio en vez de repetida por las plantillas.
 *
 * En el mercado español de infoproductos financieros «gratis» no distingue nada: todos
 * lo dicen y luego piden el correo, venden el siguiente o meten enlaces de afiliado. Lo
 * que distingue es **por qué** puede ser gratis, y aquí se puede enseñar: no hay nada
 * que vender después, la herramienta también es gratis y el código está publicado.
 *
 * Si algún día hay un correo, un curso de pago o un enlace de afiliado, **este bloque
 * hay que quitarlo el mismo día**. Una promesa así solo vale mientras es verdad.
 */
export const PROMESA_GRATIS = {
	titulo: 'Gratis de verdad',
	puntos: [
		'Sin registro y sin pedirte el correo.',
		'Sin curso de pago detrás, porque no hay ninguno.',
		'Sin enlaces de afiliado a brókeres: no cobramos por dónde abras tu cuenta.'
	],
	pie: 'La herramienta también es gratis y el código es público. Puedes comprobarlo.'
};

export const CURSOS: Curso[] = [
	{
		slug: 'de-cero-a-tu-primera-aportacion',
		titulo: 'De cero a tu primera aportación',
		gancho: 'Siete lecciones para montar tu primera cartera indexada. Al final tienes una cartera, no apuntes.',
		descripcion:
			'Curso gratuito de inversión indexada desde cero: fondo o ETF, lo que de verdad pagas y cómo hacer tu primera aportación. Sin registro y sin nada que venderte.',
		nivel: 'Desde cero',
		paraQuien: 'Para quien no ha invertido nunca y no quiere empezar con el pie cambiado.',
		teLlevas: [
			'Tu asignación escrita, con sus porcentajes objetivo.',
			'Los costes reales de lo que vas a contratar, calculados con tus cifras.',
			'La primera orden clara: qué, dónde y cuánto.'
		]
	},
	{
		slug: 'el-80-por-ciento-se-decide-aqui',
		titulo: 'El 80 % de tu resultado se decide aquí',
		gancho:
			'Siete lecciones sobre el reparto de tu cartera, que pesa más que cualquier fondo que elijas. Con datos reales de dieciséis años, incluido el que incomoda.',
		descripcion:
			'Curso gratuito de asset allocation: el 80/20, la renta fija, cuántos fondos sobran y qué banda usar. Con un backtest real de 2010 a 2026.',
		nivel: 'Ya sabes qué es un indexado',
		paraQuien: 'Para quien ya tiene claro qué comprar y no sabe en qué proporción.',
		teLlevas: [
			'Tus pesos objetivo y tus bandas puestos en la herramienta.',
			'Una respuesta razonada a «¿cuántos fondos necesito?».',
			'Tu política de inversión escrita, que es lo que se lee el día que caiga un 30 %.'
		]
	}
];

const modules = import.meta.glob<{ metadata: LeccionMetadata; default: ComponentType }>(
	'/src/content/cursos/**/*.md',
	{ eager: true }
);

const lecciones: Leccion[] = Object.entries(modules)
	.map(([path, module]) => {
		const partes = path.split('/');
		return {
			...module.metadata,
			curso: partes[partes.length - 2],
			// El número del fichero (`01-…`) ordena en disco; fuera de ahí estorba.
			slug: partes[partes.length - 1].replace(/\.md$/, '').replace(/^\d+-/, ''),
			content: module.default
		};
	})
	.sort((a, b) => a.orden - b.orden);

export function getCursos(): Curso[] {
	return CURSOS;
}

export function getCurso(slug: string): Curso | undefined {
	return CURSOS.find((c) => c.slug === slug);
}

export function getLecciones(cursoSlug: string): Leccion[] {
	return lecciones.filter((l) => l.curso === cursoSlug);
}

export function getLeccion(cursoSlug: string, leccionSlug: string): Leccion | undefined {
	return lecciones.find((l) => l.curso === cursoSlug && l.slug === leccionSlug);
}

/**
 * La anterior y la siguiente, para navegar sin volver al índice.
 *
 * ⚠️ Se calcula sobre las lecciones **ya ordenadas por `orden`**, no por nombre de
 * fichero: si alguien renumera un markdown y se olvida del frontmatter, el orden del
 * curso lo manda el frontmatter, que es el que ve el lector.
 */
export function vecinas(cursoSlug: string, leccionSlug: string) {
	const lista = getLecciones(cursoSlug);
	const i = lista.findIndex((l) => l.slug === leccionSlug);
	return {
		anterior: i > 0 ? lista[i - 1] : null,
		siguiente: i >= 0 && i < lista.length - 1 ? lista[i + 1] : null,
		indice: i,
		total: lista.length
	};
}
