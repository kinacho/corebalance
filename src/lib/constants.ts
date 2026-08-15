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
	/**
	 * ⚠️ **Era `#7c3aed` (violeta) y a ΔE 0,4 de `core` bajo deuteranopia.** Este mismo
	 * fichero declara esa pareja prohibida para `ASSET_COLORS` —azul no puede ir junto a
	 * violeta— y aquí estaba, con las dos dibujándose como **líneas simultáneas** en el
	 * histórico. En el donut se salvaba por el orden (el ámbar se cuela entre ellas y la
	 * adyacencia se respeta); en un gráfico de líneas no hay adyacencia: las series se cruzan
	 * y comparten espacio, así que el par hay que medirlo all-pairs, y ahí era fallo duro con
	 * 12,4 en visión normal, por debajo del suelo de 15.
	 *
	 * El magenta arregla las dos cifras —**9,7 deutan y 22,6 normal**— y mantiene la familia
	 * púrpura, así que el satélite sigue reconociéndose. Medido junto a los otros dos colores
	 * de categoría y también junto al verde y el rojo de la línea del patrimonio, que son las
	 * cinco series que pueden coincidir en ese lienzo.
	 *
	 * ⚠️ `BLOCK_HUES.satellite` **no cambia**, y no es un descuido: ese trío es un sistema
	 * aparte, elegido por cómo convive con la rampa divergente del mapa, y ya no coincide con
	 * éste en ninguna de sus otras dos entradas (cyan contra azul, lima contra ámbar). Medido:
	 * contra el suelo azul de la rampa el magenta mejora la visión normal (14,0 → 19,9) pero
	 * empeora el deutan (6,9 → 3,2), así que allí sería un intercambio y no una mejora. Aquí
	 * es mejora en las dos.
	 */
	satellite: '#a21caf'
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
 * ⚠️ **El trío nunca se había validado como trío, y fallaba.** Era esmeralda
 * (`#059669`) + cian + violeta, o sea justo la adyacencia que la nota de
 * `ASSET_COLORS` de arriba declara prohibida: **ΔE 11,8 en visión normal** —por
 * debajo del suelo de 15, que es un fallo duro— y 2,8 con tritanopia. Y no era un
 * caso raro: en una cartera recién importada de un CSV, todos los activos nacen
 * con `targetWeight: 0`, así que **ningún bloque se mide** y los tres tonos planos
 * salen juntos en el mismo lienzo. Trío actual medido con el validador de la
 * habilidad `dataviz` contra `#0d0d12`, todos los pares: las seis
 * comprobaciones pasan, peor par cian↔violeta ΔE 15,0 con deuteranopia y
 * cian↔lima 21,1 en visión normal.
 *
 * **Qué bloque lleva qué tono también está medido**, porque no es indiferente: el
 * caso frecuente es cartera principal *con* objetivos —así que en pantalla hay
 * escala azul/ámbar— y satélite y acciones planos. Los tonos que más conviven con
 * los suelos de rampa son por tanto los de esos dos bloques, y ahí el lima es el
 * mejor de los tres con diferencia: ΔE 31,2 en visión normal y 29,5 con
 * protanopia contra el suelo azul, donde el cian que estaba en su sitio se
 * quedaba en 12,0 (fallo). El cian se va a la cartera principal, que es la que
 * casi nunca sale plana.
 *
 * El coste conocido, medido y aceptado: contra el suelo de la rampa azul el
 * violeta queda a ΔE 14,0 en visión normal y 6,9 con deuteranopia, y el lima
 * contra el suelo ámbar a 4,3 con deuteranopia (16,8 en visión normal, que sí
 * pasa). El otro coste es el contraste del rótulo blanco de la celda: 3,09:1 sobre
 * el lima, contra 3,64 del cian y 5,77 del violeta —del mismo orden que el cian
 * que ocupaba antes el bloque de acciones, así que no empeora nada de lo que ya
 * había—. ⚠️ Y por eso **no** se usa un lima más oscuro, que arreglaría ese
 * contraste: `#4d7c0f` sube a 4,99:1 pero cae a ΔE 10,5 en visión normal contra
 * `DEVIATION_ON_TARGET`, y ése sí es un par que convive en el caso corriente —un
 * core medido con activos en banda al lado del bloque de acciones—; confundir «en
 * objetivo» con «éstas son tus acciones» es peor que un rótulo con menos
 * contraste. Es un fallo **entre secciones distintas**, que es exactamente el caso
 * que el faceteado resuelve —hueco visible, cabecera con el nombre del bloque y
 * rótulo por celda— y el remedio que la propia habilidad `dataviz` prescribe para
 * los fallos de «todos contra todos». Dentro de una misma sección no hay ningún
 * par por debajo del umbral, que es lo que antes no se cumplía.
 */
export const BLOCK_HUES = {
	// Solo se usa si algún día la cartera principal se queda sin objetivos —o si
	// aún no se le han puesto, que es el caso de una cartera recién importada. Con
	// objetivos, este bloque lleva la escala divergente y no un tono plano.
	core: '#0891b2',
	stocks: '#65a30d',
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

/**
 * El par de **estado**: sube / baja. Reservado, y nunca una serie.
 *
 * Es una capa distinta de `ASSET_COLORS` y `CATEGORY_COLORS`: aquellas
 * identifican *qué* es algo, ésta dice *cómo va*. Mezclarlas era el defecto de
 * fondo del tablero — el verde llegó a significar seis cosas a la vez (acciones,
 * dinero que entra, beneficio, rentabilidad positiva, «en objetivo» y «con
 * DCA»), y un color que significa seis cosas no significa ninguna.
 *
 * **No son tonos nuevos: son dos de los que ya estaban, y sobran tres.** Antes
 * convivían `#34d399`, `#10b981` y `var(--accent-green)` para lo positivo y
 * `#f87171`, `#f43f5e`, `#fca5a5` y `#ef4444` para lo negativo, repartidos por
 * componente según quién lo escribiera. El peor par de los que coincidían en
 * pantalla quedaba a **ΔE 6,5 con deuteranopia**; éste está a **12,0**, medido
 * con el validador de la habilidad `dataviz` contra `#0d0d12` (visión normal
 * 36,0, contraste ≥ 3:1 los dos). O sea: la mejora salió de *quitar*, no de
 * añadir.
 *
 * ⚠️ **Coste conocido y medido: `STATE_NEGATIVE` está a ΔE 6,0 en visión normal
 * de `ASSET_COLORS[5]`** (el rosa `#e11d48`), que es un fallo duro si los dos
 * fueran marcas del mismo gráfico. No lo son, y ésa es toda la defensa: el color
 * de estado sale en *texto y distintivos* (una cifra, un badge), nunca como
 * relleno de una celda o de un arco, y **siempre acompañado del signo** `+`/`−`,
 * que es la codificación secundaria que la guía exige para los colores de
 * estado. No hay rojo que pase a la vez contra el verde, contra ese rosa y
 * contra el ámbar de `DEVIATION_OVER` —se probaron seis— porque la paleta
 * categórica ya ocupa la rueda entera; el único que lo lograba era un fucsia,
 * y un fucsia no dice «pérdida». Si algún día una celda de gráfico necesita
 * pintarse de estado, este par hay que rehacerlo.
 */
export const STATE_POSITIVE = '#34d399';
export const STATE_NEGATIVE = '#f43f5e';

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

/**
 * ⚠️ Esta clave está escrita **dos veces**: aquí y a mano en el script en línea de
 * `src/app.html`, que resuelve el tema antes de que exista ninguna hoja de estilos
 * y por tanto no puede importar nada. Es la misma duplicación que ya arrastra
 * `STORAGE_KEY_HOLDINGS`. Renombrarla obliga a tocar los dos sitios, y
 * `constants.test.ts` es lo que lo comprueba.
 */
export const STORAGE_KEY_THEME = 'corebalance_theme';



/** Tabs del dashboard */
export const DASHBOARD_TABS = [
	{ id: 'assets', label: 'Activos', icon: '📊' },
	{ id: 'rebalance', label: 'Estrategia', icon: '🎯' },
	{ id: 'charts', label: 'Gráficos', icon: '🍩' }
] as const;

export type TabId = 'assets' | 'rebalance' | 'charts';


