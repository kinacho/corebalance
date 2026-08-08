/**
 * La **deriva contra objetivo a lo largo del tiempo**: cuánto se ha ido
 * separando cada activo de su peso objetivo, día a día.
 *
 * Es el gráfico que le faltaba a la app y que ningún competidor tiene, por una
 * razón sencilla: ninguno se define como herramienta de rebalanceo. Ghostfolio,
 * Portfolio Performance, Indexa y justETF enseñan *cuánto tienes* y *cuánto ha
 * rendido*; ninguno enseña **cuánto tiempo llevas fuera de banda**, que es la
 * pregunta que decide si hay que hacer algo. El mapa de desviación contesta esa
 * pregunta para hoy; esto la contesta para los últimos meses, y de paso deja ver
 * si los rebalanceos que hiciste sirvieron de algo.
 *
 * Puro y sin store, como `composition.ts` y `weights.ts`.
 *
 * ⚠️ **La deriva se mide dentro del bloque, no sobre el patrimonio.** Los
 * objetivos son pesos dentro de la cartera principal: que las acciones
 * individuales suban no descuadra el 80/10/10 del core, solo cambia el peso del
 * core sobre el total. Medirlo sobre el total inventaría desviaciones cada vez
 * que se mueve un bloque que no tiene objetivos.
 */

import type { DailyPoint } from './history/types';
import { isWithinBand } from './composition';

export interface DriftAsset {
	ticker: string;
	name: string;
	color: string;
	/** Objetivo dentro de su bloque, en tanto por uno. */
	target: number;
	/** Los tickers que forman el bloque, incluido él mismo. */
	block: string[];
}

export interface DriftSeries {
	ticker: string;
	name: string;
	color: string;
	target: number;
	/**
	 * Desviación en **puntos porcentuales** sobre el bloque, un valor por día.
	 * `null` en los días sin desglose por activo o con el bloque a cero: un
	 * hueco es honesto, un cero diría «ese día estabas en objetivo».
	 */
	values: (number | null)[];
}

export interface DriftResult {
	dates: string[];
	series: DriftSeries[];
	/** El |máximo| de todas las desviaciones, para escalar el eje. */
	maxAbsPp: number;
	/** Días en los que algún activo estuvo fuera de banda. */
	daysOutOfBand: number;
	/**
	 * Días consecutivos fuera de banda contando desde el final. Cero si hoy está
	 * todo dentro. Es la cifra que contesta «¿cuánto llevo así?».
	 */
	currentStreakOutOfBand: number;
}

/**
 * Construye una serie de deriva por activo con objetivo.
 *
 * @param points  La serie diaria reconstruida, con `byTicker`.
 * @param assets  Solo los activos que tienen objetivo, con su bloque.
 * @param bandPp  Ancho de la banda de tolerancia en puntos porcentuales.
 */
export function buildDriftSeries(
	points: DailyPoint[],
	assets: DriftAsset[],
	bandPp: number
): DriftResult {
	const dates = points.map((p) => p.date);

	const series: DriftSeries[] = assets.map((asset) => {
		const values = points.map((point) => {
			const byTicker = point.byTicker;
			// Sin desglose por activo no hay nada que medir. Ver `DailyPoint`.
			if (!byTicker) return null;

			const blockTotal = asset.block.reduce((sum, t) => sum + (byTicker[t] ?? 0), 0);
			if (blockTotal <= 0) return null;

			const own = byTicker[asset.ticker];
			// El activo aún no estaba (o ya no está) en la cartera ese día.
			if (own === undefined) return null;

			return (own / blockTotal - asset.target) * 100;
		});

		return {
			ticker: asset.ticker,
			name: asset.name,
			color: asset.color,
			target: asset.target,
			values
		};
	});

	let maxAbsPp = 0;
	for (const s of series) {
		for (const v of s.values) {
			if (v !== null) maxAbsPp = Math.max(maxAbsPp, Math.abs(v));
		}
	}

	/**
	 * Un día está fuera si **algún** activo con dato ese día se salió de banda.
	 * La comparación va por `isWithinBand`, que perdona la basura de coma
	 * flotante del borde exacto — ver el docblock en `composition.ts`.
	 */
	const outByDay = points.map((_, i) =>
		series.some((s) => {
			const v = s.values[i];
			return v !== null && !isWithinBand(v, bandPp);
		})
	);

	let currentStreakOutOfBand = 0;
	for (let i = outByDay.length - 1; i >= 0; i--) {
		if (!outByDay[i]) break;
		currentStreakOutOfBand++;
	}

	return {
		dates,
		series,
		maxAbsPp,
		daysOutOfBand: outByDay.filter(Boolean).length,
		currentStreakOutOfBand
	};
}

/**
 * El tope del eje en puntos porcentuales.
 *
 * ⚠️ **Nunca por debajo de la banda.** Con una cartera perfectamente en
 * objetivo, escalar al máximo de los datos daría un eje de ±0,2 pp y la banda
 * de tolerancia se saldría del lienzo por arriba y por abajo — o sea que el
 * gráfico más tranquilizador posible se dibujaría como el más alarmante. Se
 * toma el mayor de los dos y se deja un 15 % de aire.
 */
export function driftAxisMax(maxAbsPp: number, bandPp: number): number {
	const base = Math.max(maxAbsPp, bandPp);
	return Math.max(1, base * 1.15);
}
