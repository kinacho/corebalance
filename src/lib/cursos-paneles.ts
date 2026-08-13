/**
 * Qué lección explica cada panel del dashboard.
 *
 * ⚠️ **Cadenas literales, y no se puede importar `$lib/cursos` aquí.** Ese módulo tiene un
 * `import.meta.glob` **eager** sobre `src/content/cursos/**\/*.md` en el cuerpo del módulo, y
 * `CURSOS` vive en el mismo fichero, así que importarlo aunque sea solo para leer un título
 * arrastraría al bundle **de cliente** —el dashboard es `ssr = false`— los 34 markdown
 * compilados a componentes Svelte (187 KiB de fuente, más al compilar) **y el kit didáctico
 * entero**: `Cifras`, `Barras`, `Comprueba`, `Pasos`, `Mando`, `CalculadoraAccDist`,
 * `CalculadoraRecompra` y `cursos-datos.ts` con sus tres JSON.
 *
 * El repo ya documenta ese patrón dos veces (`blog-locales.ts`, `related-reading.server.ts`),
 * pero ninguna de sus dos salidas sirve aquí: no hay load de servidor donde resolver el glob.
 * Así que el precio de tener el enlace es duplicar el título, y quien paga la deuda es
 * `cursos-paneles.test.ts`, que compara cada entrada contra la lección de verdad.
 *
 * ⚠️ **Los enlaces son `target="_blank"`, y el motivo no es la cortesía.**
 * `dashboard/+page.svelte` tiene un `beforeNavigate` que llama a `portfolio.exitDemo()` en
 * cuanto se navega fuera, así que **cualquier enlace saliente en la misma pestaña destruye
 * la sesión demo**: quien entró por «Ver la cartera de ejemplo», pulsa el enlace y vuelve
 * atrás, se encuentra un dashboard vacío. Y como es una SPA, al volver se remonta todo el
 * estado local (pestaña activa, mapas plegados o ampliados, rango del histórico).
 *
 * **Siete de los once paneles.** Los cuatro que quedan fuera, con su motivo:
 *
 * - `CompositionBars`, `DonutChart` y `Projections` no tienen lección que los explique.
 * - ⚠️ **`HistoryChart` la tiene y se queda fuera igual.** Su pareja sería `twr-vs-mwr`, que
 *   es la lección *anterior* a `el-coste-del-timing` en el mismo curso y sobre el mismo
 *   asunto —la diferencia entre lo que rindió tu cartera y lo que rendiste tú—, y
 *   `HistoryChart` comparte tarjeta con `TimingCost`. Serían dos enlaces a dos lecciones
 *   consecutivas del mismo curso a doscientos píxeles uno de otro: el enlace dejaría de leerse
 *   como «esto lo explica una lección» y pasaría a leerse como ruido.
 */

export interface LeccionDePanel {
	/** Ruta de la lección. Los cursos son solo españoles y no llevan prefijo de idioma. */
	ruta: string;
	/** Título de la lección, duplicado a la fuerza. Ver el aviso de arriba. */
	titulo: string;
}

/** Los paneles que enlazan a su lección. */
export type PanelConLeccion =
	| 'timing'
	| 'drift'
	| 'lookthrough'
	| 'deviation'
	| 'rebalance'
	| 'tax'
	| 'crisis';

const LECCIONES: Record<PanelConLeccion, LeccionDePanel> = {
	timing: {
		ruta: '/cursos/tu-cartera-no-es-la-que-crees/el-coste-del-timing',
		titulo: 'Lo que te ha costado el timing'
	},
	drift: {
		ruta: '/cursos/rebalancear-no-te-hara-ganar-mas/cuanto-llevas-descuadrado',
		titulo: 'Cuánto tiempo llevas descuadrado'
	},
	lookthrough: {
		ruta: '/cursos/tu-cartera-no-es-la-que-crees/exposicion-real',
		titulo: 'Tu exposición real por región y por sector'
	},
	deviation: {
		ruta: '/cursos/el-80-por-ciento-se-decide-aqui/tus-bandas',
		titulo: 'Tus bandas: el número que decide cuándo actuar'
	},
	rebalance: {
		ruta: '/cursos/rebalancear-no-te-hara-ganar-mas/rebalancear-aportando',
		titulo: 'Rebalancear aportando, sin vender ni tributar'
	},
	tax: {
		ruta: '/cursos/mueve-tu-dinero-sin-pagar-de-mas/la-factura-exacta',
		titulo: 'Vender para rebalancear: la factura exacta'
	},
	crisis: {
		ruta: '/cursos/rebalancear-no-te-hara-ganar-mas/cuando-cae-un-30',
		titulo: 'Cuando el mercado cae un 30 %'
	}
};

/** La lección que explica un panel. */
export function leccionDePanel(panel: PanelConLeccion): LeccionDePanel {
	return LECCIONES[panel];
}

/** Todas las parejas, para que el test las recorra sin conocer las claves. */
export function todasLasLecciones(): [PanelConLeccion, LeccionDePanel][] {
	return Object.entries(LECCIONES) as [PanelConLeccion, LeccionDePanel][];
}
