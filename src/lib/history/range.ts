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

/**
 * Un rango es **redundante** cuando enseñaría exactamente lo mismo que «Todo».
 *
 * ⚠️ **Esto existe porque «no pasa nada al pulsar» es un fallo de interfaz aunque
 * el cálculo sea correcto**, y era la queja: *«le doy a 1M, 3M, YTD y a veces no
 * hay reacción»*. Medido con historial parcial, la cola de rangos colapsa siempre
 * en la misma vista — con 45 días de historial, `YTD`, `1A` y `ALL` dibujan un
 * lienzo idéntico, o sea tres botones de cinco que no pueden hacer nada. Y el
 * aviso no tapaba el agujero, porque **`ALL` no avisa nunca por diseño** (no
 * promete un número de días, así que no miente): la secuencia real era pulsar
 * `1A` y leer «todavía no hay tanto historial», pulsar `Todo`, ver el mismo
 * gráfico **y que además desapareciera la explicación**.
 *
 * La condición es justo la de `short`: el rango empieza antes del primer día que
 * hay y **no** existe histórico anterior que rescatar. `capped` se queda fuera a
 * propósito —ahí sí hay datos más viejos que la reconstrucción no alcanza, y es
 * un mensaje distinto que apagar el botón escondería.
 *
 * `ALL` nunca es redundante: es el rango que sí enseña todo lo que hay, y tiene
 * que quedar uno pulsable.
 *
 * ⚠️ **NO es `clipNoticeFor(...) === 'short'`, aunque lo parezca, y la primera
 * versión lo era.** Las dos preguntas se separan justo en el borde: un rango que
 * cubre la serie **exactamente** no tiene nada que advertir —no falta ningún
 * día— pero enseña lo mismo que «Todo» igualmente. Es el caso corriente, no un
 * caso raro: sin libro de operaciones la ventana son 30 días clavados y `1M`
 * pide 30, así que `1M` y «Todo» dibujan el mismo lienzo. Lo cazó el e2e, que
 * comparó los píxeles en vez de fiarse de la función. Por eso aquí la
 * comparación es `<=` y en `clipNoticeFor` es `<`, y ninguna de las dos puede
 * copiar a la otra.
 */
export function isRangeRedundant(opciones: {
	range: RangeId;
	firstShownDate: string | null;
	oldestKnownDate: string | null;
	today: Date;
}): boolean {
	const { range, firstShownDate, oldestKnownDate, today } = opciones;
	if (range === 'ALL' || !firstShownDate) return false;

	// `capped`: hay historial más viejo que la reconstrucción no alcanza. El botón no
	// sobra, no llega — y apagarlo escondería un mensaje distinto.
	if (oldestKnownDate !== null && oldestKnownDate < firstShownDate) return false;

	const deseado = rangeStartDate(range, today);
	return deseado !== null && deseado <= firstShownDate;
}
