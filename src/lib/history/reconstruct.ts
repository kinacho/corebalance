import type { DailyPoint, ReconstructInput } from './types';
import { isEstimatedAt, sharesAt } from './timeline';

export const DAY_MS = 86400000;

/** YYYY-MM-DD en UTC, igual que `formatDate` de `$lib/utils`. */
function toISODate(ms: number): string {
	return new Date(ms).toISOString().split('T')[0];
}

/** Medianoche UTC del día que contiene `date`. */
export function startOfUTCDay(date: Date): number {
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Estira un sparkline a exactamente `days` puntos, alineado al final.
 *
 * Si faltan días por la izquierda se rellenan con el primer precio conocido, no
 * con el de hoy: rellenar con el precio actual es lo que hacía que el pasado
 * lejano apareciera plano al nivel de hoy. `paddedBefore` dice cuántos días
 * iniciales son relleno, para poder marcarlos como estimados.
 */
export function alignPriceSeries(
	sparkline: number[] | undefined,
	days: number
): { series: number[]; paddedBefore: number } {
	const clean = (sparkline ?? []).filter((p) => typeof p === 'number' && isFinite(p) && p > 0);
	if (clean.length === 0) {
		return { series: new Array(days).fill(0), paddedBefore: days };
	}
	if (clean.length >= days) {
		return { series: clean.slice(clean.length - days), paddedBefore: 0 };
	}
	const padding = days - clean.length;
	return { series: [...new Array(padding).fill(clean[0]), ...clean], paddedBefore: padding };
}

/**
 * Reconstruye la serie diaria de la cartera tramo a tramo.
 *
 * El valor de una posición un día dado es
 * `participaciones_del_tramo × valor_base_por_participación × (precio_d / precio_hoy)`.
 *
 * Trabajar con el ratio de precios y no con precios absolutos tiene dos ventajas:
 * el último punto coincide por construcción con el patrimonio que muestra la
 * cabecera, y cualquier factor de conversión de divisa se cancela, así que la
 * serie no depende de cómo la app convierta precios.
 *
 * Las participaciones se leen al **cierre** del día, de modo que una venta ya
 * está descontada del valor de ese día y el flujo negativo la compensa: es la
 * convención que necesita el cálculo time-weighted.
 */
export function reconstructDailySeries(input: ReconstructInput): DailyPoint[] {
	const { timelines, priceSeries, perShareBase, categoryOf, days } = input;
	const paddedBefore = input.paddedBefore ?? {};
	const todayStart = startOfUTCDay(input.today ?? new Date());

	const points: DailyPoint[] = [];

	for (let i = 0; i < days; i++) {
		const dayStart = todayStart - (days - 1 - i) * DAY_MS;
		const dayEnd = dayStart + DAY_MS - 1;

		const point: DailyPoint = {
			date: toISODate(dayStart),
			total: 0,
			core: 0,
			satellite: 0,
			stocks: 0,
			netFlow: 0,
			estimated: false,
			hasBreakdown: true,
			byTicker: {}
		};

		for (const timeline of timelines) {
			const shares = sharesAt(timeline, dayEnd);
			const unitValue = perShareBase[timeline.ticker] ?? 0;

			if (shares > 0 && unitValue > 0) {
				const series = priceSeries[timeline.ticker];
				const todayPrice = series?.[days - 1] ?? 0;
				const dayPrice = series?.[i] ?? 0;
				const ratio = todayPrice > 0 && dayPrice > 0 ? dayPrice / todayPrice : 1;

				const value = shares * unitValue * ratio;
				point.total += value;
				point.byTicker![timeline.ticker] = value;
				const category = categoryOf[timeline.ticker];
				if (category) point[category] += value;

				if (isEstimatedAt(timeline, dayEnd) || i < (paddedBefore[timeline.ticker] ?? 0)) {
					point.estimated = true;
				}
			}

			for (const flow of timeline.flows) {
				if (flow.date >= dayStart && flow.date <= dayEnd) point.netFlow += flow.amount;
			}
		}

		points.push(point);
	}

	return points;
}

/**
 * Rellena con snapshots observados los días que la reconstrucción no puede ver.
 *
 * Deliberadamente conservador: solo entra donde la reconstrucción da cero, es
 * decir donde el activo ya no está en la cartera y por tanto no tiene tramos.
 * Mezclar snapshots con reconstrucción allí donde ambas tienen datos es
 * exactamente lo que producía el escalón falso al vender.
 */
export function overlaySnapshots(
	points: DailyPoint[],
	snapshots: { date: string; total: number; core?: number; satellite?: number; stocks?: number }[]
): DailyPoint[] {
	if (snapshots.length === 0) return points;
	const byDate = new Map(snapshots.map((s) => [s.date, s]));

	return points.map((point) => {
		if (point.total > 0) return point;
		const snapshot = byDate.get(point.date);
		if (!snapshot || !(snapshot.total > 0)) return point;

		const hasBreakdown =
			snapshot.core !== undefined ||
			snapshot.satellite !== undefined ||
			snapshot.stocks !== undefined;

		return {
			...point,
			total: snapshot.total,
			core: snapshot.core ?? 0,
			satellite: snapshot.satellite ?? 0,
			stocks: snapshot.stocks ?? 0,
			observed: true,
			hasBreakdown
		};
	});
}
