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
 * **Es un piloto de tres paneles.** Hay pareja clara para cinco más y se decidirán viéndolos
 * en pantalla: `HistoryChart` → `twr-vs-mwr`, `DeviationTreemap` → `tus-bandas`,
 * `RebalancePanel` → `rebalancear-aportando`, `TaxAwareRebalance` → `la-factura-exacta`,
 * `CrisisSimulator` → `cuando-cae-un-30`. Se dejan fuera del mapa a propósito y no
 * comentadas dentro: una entrada que nadie usa es la clase de huérfano que nadie caza.
 * Sin pareja: `CompositionBars`, `DonutChart`, `Projections`.
 */

export interface LeccionDePanel {
	/** Ruta de la lección. Los cursos son solo españoles y no llevan prefijo de idioma. */
	ruta: string;
	/** Título de la lección, duplicado a la fuerza. Ver el aviso de arriba. */
	titulo: string;
}

/** Los paneles que hoy enlazan a su lección. */
export type PanelConLeccion = 'timing' | 'drift' | 'lookthrough';

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
