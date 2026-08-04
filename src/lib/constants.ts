import type { Asset } from './types';

/**
 * Paleta categórica para los activos, en **orden fijo**.
 *
 * Estos seis tonos y este orden no son una elección estética: son el resultado
 * de pasar el validador de paleta de la guía de visualización contra la
 * superficie oscura de la app (`#0d0d12`). Las seis comprobaciones pasan, con el
 * peor par adyacente a ΔE 15,0 para visión con deficiencia de color.
 *
 * La paleta anterior tenía quince tonos y **fallaba**: `#d946ef` y `#0ea5e9`
 * eran consecutivos y para una persona con deuteranopia —en torno al 6 % de los
 * hombres— resultan indistinguibles (ΔE 1,8). Ocho de los quince estaban además
 * fuera de la banda de luminancia.
 *
 * ⚠️ **El orden importa y hay restricciones que no son evidentes:**
 *   - el verde no puede ir junto al rosa (ΔE 1,1 en deuteranopia),
 *   - ni junto al cian (ΔE 11,8 incluso con visión normal),
 *   - y el azul no puede ir junto al violeta (ΔE 0,4 en deuteranopia).
 *
 * Si se toca esta lista, hay que volver a pasar el validador. Y si hace falta un
 * séptimo tono, **no se inventa**: las posiciones que sobran se agrupan en
 * «Otros» a nivel de gráfico, con `CHART_NEUTRAL`.
 */
export const ASSET_COLORS = [
	'#d97706', // ámbar
	'#2563eb', // azul
	'#059669', // esmeralda
	'#7c3aed', // violeta
	'#0891b2', // cian
	'#e11d48' // rosa
];

/**
 * Los tres bloques de estrategia, también validados como trío independiente
 * (ΔE 32,3 en el peor par adyacente).
 *
 * Van aparte de `ASSET_COLORS` porque responden a otra pregunta: aquí el color
 * identifica una categoría, no un activo.
 */
export const CATEGORY_COLORS = {
	core: '#2563eb',
	stocks: '#d97706',
	satellite: '#7c3aed'
} as const;

/**
 * Gris neutro para lo que no es una serie: el resto agrupado en «Otros» y el
 * punto medio de las escalas divergentes.
 *
 * Tiene que ser **neutro de verdad**. Un tono en el centro de una escala
 * divergente es un anti-patrón: compite con los dos extremos y hace que «en
 * objetivo» parezca un estado tan señalado como «desviado», cuando es lo
 * contrario.
 */
export const CHART_NEUTRAL = '#6b7280';

/**
 * Extremos de la escala divergente de desviación respecto al objetivo.
 *
 * Azul por debajo, ámbar por encima, y el neutro de arriba en el centro.
 * Deliberadamente **no** verde en el centro: además del anti-patrón, el verde
 * choca con el donut de categorías, que está en el panel de al lado del mismo
 * carrusel y ahí el verde significaba otra cosa.
 */
export const DEVIATION_UNDER = '#2563eb';
export const DEVIATION_OVER = '#d97706';

/**
 * Relleno de «en objetivo», el punto medio de la escala de desviación.
 *
 * **Verde apagado, y el número que importa es el croma: 0,073.** Es decisión de
 * producto que «en objetivo» no se lea como ausencia de todo —era
 * `CHART_NEUTRAL`, y un gris no dice «esto está bien»— pero un tono saturado en
 * el punto medio de una escala divergente sí es un anti-patrón: compite con los
 * dos polos. Este verde resuelve las dos cosas porque sigue **por debajo del
 * suelo de croma categórico** del validador (o sea, el validador lo clasifica
 * como «reads gray») siendo 3,2 veces más cromático que el gris que sustituye
 * (0,023). Verde de verdad a la vista, casi-neutro para la escala.
 *
 * Medido con el validador de la habilidad `dataviz` sobre la superficie oscura
 * `#0d0d12`, contra los colores que el mapa pinta **de verdad** —los suelos de
 * rampa, no los polos puros—: banda de luminosidad ✓, contraste ≥ 3:1 ✓,
 * separación en visión normal 17,7 contra el suelo azul y 21,4 contra el ámbar
 * (mínimo 15), y en CVD 16,8 deutan / 7,0 tritan contra el azul y 11,8 protan /
 * 25,6 tritan contra el ámbar.
 *
 * ⚠️ **La rampa divergente sigue arrancando de `CHART_NEUTRAL`, no de este
 * verde.** Es la trampa de este cambio: la rampa *pasa por* su origen, y
 * `mix(verde, ámbar, 0.6)` da `#ac8136`, un oliva sucio. Con el origen en el
 * gris, el verde es solo el relleno plano de dentro de banda y no hay oliva. El
 * pequeño salto de color al salir de la banda no es un defecto: marca justo el
 * momento en que hay algo que mirar.
 */
export const DEVIATION_ON_TARGET = '#2f6b55';

/**
 * Tono de un bloque **que no se mide contra ningún objetivo**.
 *
 * Los objetivos son cosa de la cartera principal; satélite y acciones no los
 * tienen *como tal*. Antes el mapa metía las tres carteras en un lienzo y luego
 * marcaba como excepción («sin objetivo») a dos tercios de los activos, que es de
 * donde salían todos sus problemas visuales: primero seis de nueve celdas
 * invisibles, luego una plancha gris. Ahora el mapa se secciona por bloque y cada
 * bloque sin objetivos lleva **su propio tono, sin escala**.
 *
 * ⚠️ **No se usan `CATEGORY_COLORS` aquí, y es contraintuitivo.** Sería lo
 * coherente con el donut de categorías, pero `CATEGORY_COLORS.core` es
 * *exactamente* `DEVIATION_UNDER` y `CATEGORY_COLORS.stocks` es *exactamente*
 * `DEVIATION_OVER`: un bloque entero de ámbar que significa «estas son tus
 * acciones», al lado de un bloque donde el ámbar significa «por encima del
 * objetivo». Solo el violeta del satélite se puede reutilizar, y se reutiliza.
 *
 * El coste conocido, medido y aceptado: contra el suelo de la rampa azul, el cian
 * queda a ΔE 12,0 en visión normal y el violeta a 6,9 con deuteranopia, los dos
 * por debajo del umbral. Es un fallo **entre secciones distintas**, que es
 * exactamente el caso que el faceteado resuelve —hueco visible, cabecera con el
 * nombre del bloque y rótulo por celda— y el remedio que la propia habilidad
 * `dataviz` prescribe para los fallos de «todos contra todos». Entre sí, que es
 * el par que de verdad compite, cian y violeta están a ΔE 15,0 con deuteranopia.
 */
export const BLOCK_HUES = {
	// Solo se usa si algún día la cartera principal se queda sin objetivos; con
	// objetivos, este bloque lleva la escala divergente y no un tono plano.
	core: '#059669',
	stocks: '#0891b2',
	satellite: '#7c3aed'
} as const;

/**
 * Relleno de un activo sin objetivo **dentro de un bloque que sí se mide**.
 *
 * Este sí es una anomalía de verdad y merece verse apagado: un activo de la
 * cartera principal al que no se le ha puesto peso objetivo. Va en pizarra y
 * **rayado** con `UNTARGETED_STRIPE`, porque aquí la textura sí hace falta: es el
 * único caso en que una celda sin escala convive con celdas de la escala dentro
 * del mismo bloque, sin hueco ni cabecera que las separe.
 *
 * No confundir con `BLOCK_HUES`: eso es un bloque entero que no se mide, y es lo
 * normal. Esto es un hueco en los datos de un bloque que sí se mide, y es raro.
 */
export const UNTARGETED_FILL = '#3b4250';
export const UNTARGETED_STRIPE = '#5a6273';

/** Cuántas porciones se muestran antes de agrupar el resto en «Otros». */
export const MAX_CHART_SLICES = 6;

/** Iconos predefinidos para asignar a nuevos activos según tipo */
export const ASSET_ICONS: Record<string, string> = {
	'ETF': '📊',
	'Acción': '📈',
	'Fondo': '🛡️',
	'Crypto': '₿',
	'Futuro': '⚡',
	'Índice': '🌐',
	'Divisa': '💱',
	'Otro': '💎'
};

/** Los activos por defecto de la cartera Core */
export const DEFAULT_CORE_ASSETS: Asset[] = [];

/** Activos por defecto de la cartera satélite */
export const DEFAULT_SATELLITE_ASSETS: Asset[] = [];

/** Acciones individuales por defecto */
export const DEFAULT_STOCK_ASSETS: Asset[] = [];



/** Claves de localStorage */
export const STORAGE_KEY_HOLDINGS = 'corebalance_holdings_v2';
export const STORAGE_KEY_CONTRIBUTION = 'corebalance_contribution';
export const STORAGE_KEY_ASSETS = 'corebalance_user_assets';
export const STORAGE_KEY_PRICES = 'corebalance_prices_cache';
export const STORAGE_KEY_EDITS = 'corebalance_holding_edits';



/** Tabs del dashboard */
export const DASHBOARD_TABS = [
	{ id: 'assets', label: 'Activos', icon: '📊' },
	{ id: 'rebalance', label: 'Estrategia', icon: '🎯' },
	{ id: 'charts', label: 'Gráficos', icon: '🍩' }
] as const;

export type TabId = 'assets' | 'rebalance' | 'charts';


