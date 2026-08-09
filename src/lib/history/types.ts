import type { AssetCategory } from '$lib/types';

/**
 * Motivo por el que las participaciones de un activo han cambiado.
 *
 * La distinción entre flujo y corrección es la pieza central de todo el módulo:
 * un flujo mueve el patrimonio pero no la rentabilidad, y una corrección
 * reescribe el pasado sin mover ninguna de las dos.
 */
export type EditReason = 'sale' | 'purchase' | 'correction' | 'transfer' | 'unclassified';

/** Los motivos que representan dinero entrando o saliendo de la cartera medida. */
export const FLOW_REASONS = ['sale', 'purchase', 'transfer'] as const;

export function isFlowReason(reason: EditReason): reason is FlowKind {
	return reason === 'sale' || reason === 'purchase' || reason === 'transfer';
}

/**
 * Un cambio observado en las participaciones de un activo.
 *
 * Se registra en el `blur` del input, no en cada tecla: teclear "200" sobre
 * "500" produce los estados intermedios 2 y 20, y anotarlos generaría flujos
 * inventados.
 */
export interface HoldingEdit {
	id: string;
	ticker: string;
	/** Fecha a la que se atribuye el cambio (unix ms). Por defecto, hoy. */
	date: number;
	sharesBefore: number;
	sharesAfter: number;
	reason: EditReason;
	/** Precio unitario en divisa base con el que se valora el flujo. */
	priceBase?: number;
	/** De dónde vino el cambio. Útil para depurar sincronizaciones. */
	origin?: 'manual' | 'import' | 'sync';
	/** Momento real en que se registró (unix ms), independiente de `date`. */
	createdAt: number;
}

export type FlowKind = 'purchase' | 'sale' | 'transfer';

/** Dinero entrando (+) o saliendo (−) de la cartera medida, en divisa base. */
export interface Flow {
	date: number;
	ticker: string;
	/** Participaciones movidas, con signo. */
	shares: number;
	/** Importe con signo: positivo entra, negativo sale. */
	amount: number;
	kind: FlowKind;
}

/**
 * Un tramo de tiempo durante el cual las participaciones fueron constantes.
 *
 * Dentro de un tramo, `participaciones × precio(d)` no es una aproximación:
 * es el valor real de la posición ese día.
 */
export interface TimelineSegment {
	/** Unix ms inclusive. `null` = desde siempre. */
	from: number | null;
	/** Unix ms exclusive. `null` = hasta hoy. */
	to: number | null;
	shares: number;
	/**
	 * `seed` = participaciones que ya estaban ahí cuando la app empezó a mirar,
	 * así que no sabemos cuándo se compraron. Los días cubiertos por un tramo
	 * `seed` se marcan como estimados.
	 */
	source: 'seed' | 'edit' | 'ledger';
}

export interface PositionTimeline {
	ticker: string;
	/** Ordenados y sin solapamiento; siempre al menos uno. */
	segments: TimelineSegment[];
	flows: Flow[];
}

/** Un día de la serie reconstruida. */
export interface DailyPoint {
	/** YYYY-MM-DD */
	date: string;
	total: number;
	core: number;
	satellite: number;
	stocks: number;
	/** Flujo neto del día en divisa base, con signo. */
	netFlow: number;
	/** El día cae en un tramo `seed` o usa precios rellenados. */
	estimated: boolean;
	/** El punto viene de un snapshot observado, no de la reconstrucción. */
	observed?: boolean;
	/** `false` cuando no hay desglose fiable por categoría. */
	hasBreakdown: boolean;
	/**
	 * Valor de cada posición ese día, en divisa base.
	 *
	 * La reconstrucción ya lo calculaba activo por activo para sumarlo en
	 * `total` y en la categoría; simplemente lo tiraba. Sin esto no se puede
	 * dibujar la **deriva contra objetivo a lo largo del tiempo**, porque los
	 * objetivos viven por activo dentro de su bloque y el desglose por categoría
	 * no llega.
	 *
	 * Opcional a propósito: los puntos que vienen de un snapshot observado no
	 * tienen desglose por activo, y decirlo con una ausencia es más honesto que
	 * rellenar con ceros que se leerían como «ese día no tenías nada».
	 */
	byTicker?: Record<string, number>;
}

export interface PerformanceSeries {
	points: DailyPoint[];
	/** Índice time-weighted base 100. Misma longitud que `points`. */
	twr: number[];
	/** Capital neto aportado día a día. */
	invested: number[];
	/** `total − invested`. */
	gain: number[];
	/** Rentabilidad TWR del periodo (0.05 = 5 %). */
	twrPeriod: number;
	/** Rentabilidad ponderada por dinero del periodo. `null` si no converge. */
	mwrPeriod: number | null;
	/** `mwr − twr` en puntos porcentuales. Negativo = el timing costó. */
	timingCostPp: number | null;
	/** Índice del primer punto no estimado, o `-1` si todos lo son. */
	firstMeasuredIndex: number;
}

/** Entrada de la reconstrucción. Todo precalculado por el llamante. */
export interface ReconstructInput {
	timelines: PositionTimeline[];
	/**
	 * Por ticker, precios crudos diarios alineados al final de la ventana
	 * (el último elemento es hoy). Se usan como ratios, así que la divisa da
	 * igual mientras sea consistente dentro del array.
	 */
	priceSeries: Record<string, number[]>;
	/**
	 * Por ticker, valor actual en divisa base de una participación. Ancla la
	 * reconstrucción al valor que la app ya muestra, de modo que el último
	 * punto del gráfico coincide exactamente con el patrimonio de cabecera.
	 */
	perShareBase: Record<string, number>;
	/** Nº de días desde el que la serie de precios de un ticker está rellenada. */
	paddedBefore?: Record<string, number>;
	categoryOf: Record<string, AssetCategory>;
	days: number;
	/** Inyectable para los tests. */
	today?: Date;
}
