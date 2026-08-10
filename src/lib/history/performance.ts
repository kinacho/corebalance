import type { DailyPoint, PerformanceSeries } from './types';

/**
 * Índice time-weighted base 100.
 *
 * Usa la convención de Portfolio Performance: las entradas de dinero cuentan al
 * inicio del día y las salidas al cierre, de modo que
 *
 *     1 + r = (valor_final + salidas) / (valor_inicial + entradas)
 *
 * El efecto práctico: vender no mueve la curva. Con 40.000 € el día anterior y
 * una venta de 24.000 € sin movimiento de precio, el valor final es 16.000 y
 * r = (16.000 + 24.000) / 40.000 − 1 = 0. Es justo el escalón falso que este
 * módulo existe para eliminar.
 */
export function twrIndex(points: DailyPoint[]): number[] {
	const index: number[] = [];
	let current = 100;

	for (let i = 0; i < points.length; i++) {
		if (i === 0) {
			index.push(current);
			continue;
		}
		const begin = points[i - 1].total;
		const inflow = Math.max(0, points[i].netFlow);
		const outflow = Math.max(0, -points[i].netFlow);
		const base = begin + inflow;

		if (base > 0) {
			const growth = (points[i].total + outflow) / base;
			if (isFinite(growth) && growth > 0) current *= growth;
		}
		index.push(current);
	}

	return index;
}

/**
 * Capital neto aportado día a día.
 *
 * Se ancla en el invertido actual y camina hacia atrás restando los flujos, en
 * lugar de acumular hacia delante desde un origen desconocido. Así la escalera
 * termina exactamente en la cifra que muestra la cabecera y las dos no se
 * contradicen.
 */
export function investedSeries(points: DailyPoint[], currentInvested: number): number[] {
	const invested = new Array(points.length).fill(0);
	if (points.length === 0) return invested;

	invested[points.length - 1] = currentInvested;
	for (let i = points.length - 1; i > 0; i--) {
		invested[i - 1] = Math.max(0, invested[i] - points[i].netFlow);
	}
	return invested;
}

interface PeriodFlow {
	/** Fracción del periodo, 0 = inicio, 1 = final. */
	t: number;
	/** Signo desde el punto de vista del inversor: negativo = pone dinero. */
	amount: number;
}

/**
 * Instante en que un flujo del día `i` entra a rendir, en fracción de periodo.
 *
 * ⚠️ **Tiene que ser la misma convención que usa `twrIndex()`, y no lo era.** Allí una
 * entrada cuenta *al inicio* del día (`base = begin + inflow`), así que el flujo del día
 * `i` sí participa del retorno de ese día. Aquí se colocaba en `i / span` —el cierre del
 * día `i`, un día más tarde—, de modo que las dos métricas medían exposiciones distintas
 * y su resta, que es lo que la interfaz llama «el coste de tu timing», incluía un residuo
 * que no era timing sino desalineación.
 *
 * No era despreciable: con `[1000, 2000 (+1000), 1800]` —aportar y comer entera la
 * caída siguiente, sin ninguna decisión de calendario que juzgar— el desfase producía un
 * MWR peor que el TWR, o sea un castigo inventado. Alineadas, ambas dan −10 %, que es lo
 * que de verdad le pasó a ese dinero. El fenómeno real sigue midiéndose: cuando el
 * dinero entra tras un tramo bueno y antes de uno malo, el MWR sigue cayendo por debajo.
 */
function flowTime(dayIndex: number, span: number): number {
	return (dayIndex - 1) / span;
}

function npv(rate: number, flows: PeriodFlow[]): number {
	let sum = 0;
	for (const flow of flows) sum += flow.amount * Math.pow(1 + rate, 1 - flow.t);
	return sum;
}

/**
 * Rentabilidad ponderada por dinero **del periodo** (no anualizada).
 *
 * Con ventanas de 30 días anualizar produce cifras absurdas (un −2 % mensual se
 * convierte en un −22 % anual que el usuario no reconoce), así que se devuelve la
 * tasa del periodo y la interfaz la etiqueta como tal.
 *
 * Se resuelve por bisección en lugar de Newton-Raphson: es más lento y da igual
 * a esta escala, pero no se va a infinito con flujos patológicos.
 */
export function moneyWeightedReturn(points: DailyPoint[]): number | null {
	if (points.length < 2) return null;

	const span = points.length - 1;
	const flows: PeriodFlow[] = [{ t: 0, amount: -points[0].total }];

	for (let i = 1; i < points.length; i++) {
		if (Math.abs(points[i].netFlow) > 0.01) {
			flows.push({ t: flowTime(i, span), amount: -points[i].netFlow });
		}
	}
	flows.push({ t: 1, amount: points[points.length - 1].total });

	const hasInflow = flows.some((f) => f.amount < 0);
	const hasOutflow = flows.some((f) => f.amount > 0);
	if (!hasInflow || !hasOutflow) return null;

	let lo = -0.999999;
	let hi = 10;
	let npvLo = npv(lo, flows);
	let npvHi = npv(hi, flows);
	if (!isFinite(npvLo) || !isFinite(npvHi) || npvLo * npvHi > 0) return null;

	for (let iteration = 0; iteration < 200; iteration++) {
		const mid = (lo + hi) / 2;
		const npvMid = npv(mid, flows);
		if (!isFinite(npvMid)) return null;
		if (Math.abs(npvMid) < 1e-9) return mid;
		if (npvLo * npvMid <= 0) {
			hi = mid;
			npvHi = npvMid;
		} else {
			lo = mid;
			npvLo = npvMid;
		}
	}

	return (lo + hi) / 2;
}

/** Rentabilidad del periodo a partir del índice base 100. */
export function periodReturn(index: number[]): number {
	if (index.length < 2 || !(index[0] > 0)) return 0;
	return index[index.length - 1] / index[0] - 1;
}

/**
 * Empaqueta las tres series y las dos rentabilidades.
 *
 * `timingCostPp` es `mwr − twr`: si es negativo, la forma de aportar del usuario
 * rindió menos que sus propios activos, y esa diferencia es el coste de su
 * timing, no del mercado.
 *
 * ⚠️ **Las dos rentabilidades se miden desde `firstMeasuredIndex`, no desde el día 0.**
 * La reconstrucción marca `estimated` los días que no puede ver de verdad y los rellena
 * con una estimación; el gráfico lo respeta —los dibuja distinto y lo advierte— pero
 * estas dos cifras los metían en la aritmética sin decirlo. Medido: con dos días
 * estimados al principio, el TWR del periodo pasaba de un **2,00 %** real a un
 * **13,33 %**, y ese número es el que la interfaz presenta como el rendimiento de los
 * activos del usuario. `firstMeasuredIndex` ya existía y ya tenía tests: lo que faltaba
 * era que alguien lo leyera.
 *
 * Si la ventana entera es estimada (`-1`) no hay nada que medir: `twrPeriod` es 0 y
 * `mwrPeriod` es `null`, con lo que el panel se apaga en vez de inventar una cifra.
 */
export function buildPerformanceSeries(
	points: DailyPoint[],
	currentInvested: number,
	oldestKnownDate: string | null = null,
	reconstructedWithIndexDays = 0
): PerformanceSeries {
	const twr = twrIndex(points);
	const invested = investedSeries(points, currentInvested);
	const gain = points.map((point, i) => point.total - invested[i]);
	const firstMeasuredIndex = points.findIndex((point) => !point.estimated);

	const medido = firstMeasuredIndex >= 0;
	const twrPeriod = medido ? periodReturn(twr.slice(firstMeasuredIndex)) : 0;
	const mwrPeriod = medido ? moneyWeightedReturn(points.slice(firstMeasuredIndex)) : null;

	return {
		points,
		twr,
		invested,
		gain,
		twrPeriod,
		mwrPeriod,
		timingCostPp: mwrPeriod === null ? null : (mwrPeriod - twrPeriod) * 100,
		firstMeasuredIndex,
		measuredDays: medido ? points.length - firstMeasuredIndex : 0,
		oldestKnownDate,
		reconstructedWithIndexDays
	};
}
