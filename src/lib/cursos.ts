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

/**
 * Qué clase de lección es. Decide el orden de los tiempos, no el tema.
 *
 * ⚠️ **Se declara para poder comprobar la variedad, que es un problema real y no una
 * coquetería.** Las 34 lecciones compartían un único esqueleto —entrada, tres o cinco
 * encabezados de prosa, aviso, resumen— y a la segunda el lector ya sabía qué venía y en
 * qué orden; la predictibilidad estructural apaga la atención antes que la prosa. Con un
 * kit de cinco componentes el riesgo vuelve por otra vía: que las 34 abran igual. El test
 * exige que dos lecciones consecutivas de un curso no compartan arquetipo.
 *
 * - `desmontar` — una intuición falsa. La comprobación va **antes** de la explicación.
 * - `procedimiento` — una secuencia. La comprobación va **después**, sobre el paso que se
 *   salta todo el mundo.
 * - `dato` — leer una cifra. El objeto visual manda y va a ancho completo.
 * - `decidir` — A o B. Termina en una regla de decisión de una frase, nunca en «depende».
 * - `calcular` — el lector saca su número y lo apunta.
 */
export type Arquetipo = 'desmontar' | 'procedimiento' | 'dato' | 'decidir' | 'calcular';

/**
 * Cómo se llama cada arquetipo en pantalla.
 *
 * ⚠️ **El arquetipo era el único dato del curso que no se veía en ningún sitio**, y es
 * justo el que hace que las 34 lecciones no se lean igual: decide el orden de los
 * tiempos. Enseñarlo en la portada le da a cada lección un carácter propio sin gastar
 * color — que es lo que se buscaba y no cabía, porque los cinco tonos de identidad no
 * pasan el validador junto al ámbar, el verde y el azul que la lección ya pinta.
 *
 * Las etiquetas dicen **qué va a hacer el lector**, no cómo se llama la categoría por
 * dentro: «Dato» o «Procedimiento» son jerga del autor y no informan a nadie.
 */
export const ARQUETIPO_ETIQUETA: Record<Arquetipo, string> = {
	desmontar: 'Desmonta una idea',
	procedimiento: 'Paso a paso',
	dato: 'Léelo en los números',
	decidir: 'Para decidir',
	calcular: 'Saca tu número'
};

export interface LeccionMetadata {
	titulo: string;
	descripcion: string;
	/** Posición dentro del curso, empezando en 1. */
	orden: number;
	/** La promesa de la lección, en una línea. Se pinta bajo el título. */
	gancho: string;
	minutos: number;
	arquetipo: Arquetipo;
	/**
	 * Las cifras de `cursos-datos.ts` que el texto de esta lección cita literalmente.
	 *
	 * ⚠️ No es documentación: `lecciones.test.ts` comprueba que el fichero contiene el
	 * valor **vigente** de cada clave declarada. Regenerar el backtest o subir el `asOf`
	 * de los índices dejaba antes la prosa mintiendo sin que nada se pusiera rojo.
	 */
	datos?: string[];
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
	/**
	 * Preguntas y respuestas extraídas del propio cuerpo por `remarkFaq`.
	 *
	 * ⚠️ No se escribe a mano: el plugin recoge **todo encabezado que acabe en `?`** junto
	 * con el texto que le sigue. Ya se aplicaba a estos markdown desde el principio —es un
	 * plugin global de mdsvex— pero salía siempre vacío porque ningún encabezado preguntaba
	 * nada. Con el formato nuevo la lección abre con una pregunta y varias secciones son
	 * preguntas, así que alimenta un `FAQPage` sin duplicar contenido: lo que se marca es
	 * exactamente lo que el lector ve.
	 */
	faq?: { question: string; answer: string }[];
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
	},
	{
		slug: 'mueve-tu-dinero-sin-pagar-de-mas',
		titulo: 'Mueve tu dinero sin pagar de más',
		gancho:
			'Ocho lecciones sobre la fiscalidad que decide cuánto te queda. La que ninguna herramienta internacional modela, porque es española.',
		descripcion:
			'Curso gratuito de fiscalidad para el inversor indexado español: base del ahorro, FIFO, traspasos, la regla de antiaplicación y qué cuesta vender para rebalancear.',
		nivel: 'Ya tienes cartera',
		paraQuien: 'Para quien ya invierte y quiere dejar de pagar impuestos que se podían diferir.',
		teLlevas: [
			'La factura exacta de tu próximo movimiento, calculada con tus operaciones.',
			'La fecha a partir de la cual puedes recomprar sin bloquear una pérdida.',
			'Un criterio para decidir entre traspasar y vender, sin adivinar.'
		]
	},
	{
		slug: 'rebalancear-no-te-hara-ganar-mas',
		titulo: 'Rebalancear no te hará ganar más',
		gancho:
			'Seis lecciones, y el gancho es que no te vendo lo que no es. Deberías rebalancear igualmente, y aquí está el porqué con los datos delante.',
		descripcion:
			'Curso gratuito de rebalanceo: qué arregla de verdad, bandas o calendario, cómo hacerlo con aportaciones sin tributar y qué hacer cuando el mercado cae un 30 %.',
		nivel: 'Con la cartera montada',
		paraQuien: 'Para quien ya tiene cartera y no sabe cuándo ni cómo tocarla.',
		teLlevas: [
			'Un criterio escrito de cuándo actuar, y cuándo no hacer nada.',
			'Tu próximo movimiento calculado con aportaciones, sin vender.',
			'Un plan para el día que caiga un 30 %, decidido hoy.'
		]
	},
	{
		slug: 'tu-cartera-no-es-la-que-crees',
		titulo: 'Tu cartera no es la que crees',
		gancho:
			'Seis lecciones para mirar dentro de lo que ya tienes. El curso que menos se busca y el que más se comparte.',
		descripcion:
			'Curso gratuito avanzado: solapamiento entre fondos, exposición real por región y sector, riesgo de divisa, y la diferencia entre lo que rindió tu cartera y lo que rendiste tú.',
		nivel: 'Avanzado',
		paraQuien: 'Para quien lleva años invirtiendo y nunca ha mirado qué hay dentro.',
		teLlevas: [
			'El mapa de lo que hay realmente dentro de tus fondos.',
			'Tu exposición por región, sector y divisa, medida y no estimada.',
			'La diferencia entre lo que rindió tu cartera y lo que rendiste tú.'
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
