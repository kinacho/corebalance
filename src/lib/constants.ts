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


