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
 * Igual que `alignPriceSeries`, pero rellenando el hueco inicial con **la forma del índice
 * que el activo replica** en vez de con una recta al primer precio conocido.
 *
 * El problema que resuelve: cuando el libro de operaciones llega más atrás que la serie de
 * precios del activo —un fondo que Yahoo sólo cubre desde hace un año contra aportaciones de
 * hace año y medio—, el relleno plano afirma **0 % de variación** en todo ese tramo. Sobre el
 * caso real que lo motivó, el mercado se movió en torno a un 10 % ahí, así que el error del
 * relleno plano es de ese orden. Con el proxy, el error es el tracking difference y el TER:
 * 0,12 % anual, o sea 0,06 % en seis meses.
 *
 * La fórmula es un arrastre por ratio y no una sustitución:
 *
 *     precio(d) = primer_precio_real × (proxy(d) / proxy(día_del_primer_precio_real))
 *
 * Así el punto de empalme coincide **exactamente** con el primer precio real —no hay escalón
 * en la unión— y sólo se toma del proxy la *forma*, nunca su nivel. Que el ETF proxy cotice a
 * 95 € y el fondo a 12 € da igual: sólo se usa su variación relativa.
 *
 * ⚠️ **`paddedBefore` no baja, y eso es deliberado.** Es lo que marca el tramo como estimado —
 * trazo discontinuo y aviso—, y un tramo reconstruido con un proxy **sigue siendo una
 * estimación**: no es el valor liquidativo del fondo, es lo que hizo su índice. Mejorar el
 * número no lo convierte en dato observado, y presentarlo como tal sería justo el tipo de
 * precisión inventada que este proyecto quita en otros sitios.
 *
 * `estimadoConProxy` cuenta cuántos de esos días llevan la forma del índice en lugar de la
 * recta, para que la interfaz pueda decir con qué se ha reconstruido.
 */
export function alignPriceSeriesWithProxy(
	sparkline: number[] | undefined,
	days: number,
	proxy: number[] | undefined
): { series: number[]; paddedBefore: number; estimadoConProxy: number } {
	const base = alignPriceSeries(sparkline, days);
	if (base.paddedBefore === 0 || base.paddedBefore >= days) {
		// Nada que rellenar, o no hay ni un precio real del que colgar el arrastre.
		return { ...base, estimadoConProxy: 0 };
	}

	const proxyAlineado = alignPriceSeries(proxy, days);

	/**
	 * Aquí había una guarda para el caso «el proxy no cubre más atrás que el activo», y el
	 * control negativo demostró que **no decidía nada**: el bucle de abajo arranca en el
	 * `paddedBefore` del proxy y termina en el del activo, así que si el proxy es igual de
	 * corto o más, el rango está vacío y no se toca ni un día. Se quitó en vez de dejarla
	 * como red: una rama que no puede cambiar el resultado es una rama que hay que leer, y
	 * hace creer que protege de algo.
	 */
	const ancla = base.paddedBefore;
	const precioAncla = base.series[ancla];
	const proxyAncla = proxyAlineado.series[ancla];
	if (!(precioAncla > 0) || !(proxyAncla > 0)) {
		return { ...base, estimadoConProxy: 0 };
	}

	const series = [...base.series];
	let reconstruidos = 0;
	for (let i = proxyAlineado.paddedBefore; i < ancla; i++) {
		const p = proxyAlineado.series[i];
		if (p > 0) {
			series[i] = precioAncla * (p / proxyAncla);
			reconstruidos++;
		}
	}

	return { series, paddedBefore: base.paddedBefore, estimadoConProxy: reconstruidos };
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
