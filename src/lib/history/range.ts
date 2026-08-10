/**
 * El rango visible del gráfico de patrimonio y el aviso que le corresponde.
 *
 * Vive fuera del componente por la razón de siempre en este repo: **decide algo**. La
 * decisión anterior estaba escrita dentro de `HistoryChart.svelte` como
 * `days !== null && points.length < days`, y ese predicado dejaba fuera precisamente los
 * dos rangos que más falta hacía cubrir —`YTD` y `ALL` valen `days: null`—, con lo que
 * **«Todo», que es el rango por defecto, enseñaba treinta días llamándolos todo el
 * historial y sin decir nada**. Un predicado dentro de un componente de 700 líneas no lo
 * mira nadie; aquí tiene tests.
 *
 * Las fechas son cadenas `YYYY-MM-DD` (lo que devuelve `formatDate()`), así que se
 * comparan lexicográficamente sin construir `Date`.
 */

export type RangeId = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

/** Días que abarca cada rango, o `null` si se resuelve por fecha. */
export const RANGE_DAYS: Record<RangeId, number | null> = {
	'1M': 30,
	'3M': 90,
	YTD: null,
	'1Y': 365,
	ALL: null
};

/**
 * Primer día que el rango pide ver, o `null` para «todo».
 *
 * `YTD` se resuelve por fecha y no por número de días, que es lo que la distingue de
 * «12 meses»: en marzo son 90 días y en diciembre 365.
 */
export function rangeStartDate(range: RangeId, today: Date): string | null {
	if (range === 'ALL') return null;
	if (range === 'YTD') return `${today.getUTCFullYear()}-01-01`;

	/**
	 * ⚠️ `days - 1`, no `days`: un rango de N días cubre **hoy y los N−1 anteriores**, que
	 * es exactamente lo que el gráfico dibuja al quedarse con los últimos N puntos. Con
	 * `- days` la fecha pedida cae un día por detrás del primer punto de una ventana
	 * completa y «1M» emitiría su aviso **siempre**, que es la clase de advertencia
	 * permanente que se acaba dejando de leer. Lo cazó el test de «el rango cabe entero».
	 */
	const days = RANGE_DAYS[range] ?? 0;
	const start = new Date(today.getTime());
	start.setUTCDate(start.getUTCDate() - (days - 1));
	return start.toISOString().slice(0, 10);
}

/**
 * Qué hay que advertir cuando el gráfico no puede mostrar lo que el rango promete.
 *
 * Son **dos situaciones distintas y se dicen distinto**, y confundirlas era la mitad del
 * defecto original:
 *
 * - `short` — «todavía no llevas tanto tiempo». No falta información: es todo lo que hay.
 * - `capped` — hay historial guardado **anterior** al primer día del gráfico, y la
 *   reconstrucción no llega porque vive del sparkline de Yahoo (`HISTORY_DAYS`, 30 días).
 *   Aquí sí falta información, así que el texto de `short` —que afirma que no hay más
 *   datos— sería mentira.
 *
 * `null` cuando el rango cabe entero y no hay nada que avisar.
 */
export function clipNoticeFor(opciones: {
	range: RangeId;
	/** Fecha del primer punto que el gráfico dibuja, o `null` si no hay puntos. */
	firstShownDate: string | null;
	/** Fecha del snapshot guardado más antiguo, aunque caiga fuera de la ventana. */
	oldestKnownDate: string | null;
	today: Date;
}): 'short' | 'capped' | null {
	const { range, firstShownDate, oldestKnownDate, today } = opciones;
	if (!firstShownDate) return null;

	const hayAnterior = oldestKnownDate !== null && oldestKnownDate < firstShownDate;

	// «Todo» no promete un número de días: promete todo. Sólo miente si hay algo detrás.
	if (range === 'ALL') return hayAnterior ? 'capped' : null;

	const deseado = rangeStartDate(range, today);
	if (deseado === null || deseado >= firstShownDate) return null;

	return hayAnterior ? 'capped' : 'short';
}
