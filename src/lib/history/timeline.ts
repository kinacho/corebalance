import type { Transaction } from '$lib/types';
import type { Flow, HoldingEdit, PositionTimeline, TimelineSegment } from './types';
import { isFlowReason } from './types';

const EPS = 1e-6;

/** Ordena ediciones por fecha atribuida y, a igualdad, por orden de registro. */
function byEditOrder(a: HoldingEdit, b: HoldingEdit): number {
	return a.date - b.date || a.createdAt - b.createdAt;
}

/**
 * Construye la línea temporal de un activo a partir del log de ediciones.
 *
 * Dos semánticas distintas:
 *
 * - **Flujo** (`sale` / `purchase` / `transfer`): cierra el tramo vigente y abre
 *   uno nuevo. El pasado no se toca y se registra un movimiento de dinero.
 * - **Corrección** (`correction`, y `unclassified` por defecto): el dato que
 *   había registrado era erróneo, así que desplaza *todos* los tramos anteriores
 *   por el mismo delta. Eso preserva los flujos legítimos que hubiera en medio y
 *   no genera ningún movimiento de dinero.
 *
 * Ejemplo del segundo caso: semilla 500 → compra de 100 (tramo 600) → el usuario
 * corrige 600 a 300. El delta −300 se propaga hacia atrás: la semilla pasa a 200
 * y el tramo posterior a 300, conservando la compra de +100.
 *
 * `currentShares` manda sobre el último tramo: si alguien cambió las
 * participaciones por una vía que no dejó registro, la línea temporal se
 * autocorrige en lugar de arrastrar el desajuste.
 */
export function buildTimelineFromEdits(
	ticker: string,
	currentShares: number,
	edits: HoldingEdit[]
): PositionTimeline {
	const sorted = edits.filter((e) => e.ticker === ticker).sort(byEditOrder);

	const initialShares = sorted.length > 0 ? sorted[0].sharesBefore : currentShares;
	const segments: TimelineSegment[] = [
		{ from: null, to: null, shares: initialShares, source: 'seed' }
	];
	const flows: Flow[] = [];

	for (const edit of sorted) {
		const delta = edit.sharesAfter - edit.sharesBefore;
		if (Math.abs(delta) < EPS) continue;

		if (!isFlowReason(edit.reason)) {
			// Restatement: reescribe el pasado, no mueve dinero.
			for (const segment of segments) {
				segment.shares = Math.max(0, segment.shares + delta);
			}
			continue;
		}

		const open = segments[segments.length - 1];
		if (open.from !== null && open.from >= edit.date) {
			// Dos flujos el mismo instante: fusiona en lugar de crear un tramo vacío.
			open.shares = edit.sharesAfter;
		} else {
			open.to = edit.date;
			segments.push({ from: edit.date, to: null, shares: edit.sharesAfter, source: 'edit' });
		}

		const price = edit.priceBase ?? 0;
		flows.push({
			date: edit.date,
			ticker,
			shares: delta,
			amount: delta * price,
			kind: edit.reason
		});
	}

	const last = segments[segments.length - 1];
	if (Math.abs(last.shares - currentShares) > EPS) last.shares = currentShares;

	return { ticker, segments, flows };
}

/**
 * Construye la línea temporal de un activo a partir del libro de transacciones.
 *
 * Es la misma estructura que produce `buildTimelineFromEdits`, solo con más
 * resolución: el resto del módulo no distingue de dónde vino.
 *
 * Los dividendos no cambian las participaciones pero sí sacan dinero de la
 * cartera medida (la app no lleva cuenta de efectivo), así que se registran como
 * flujo de salida. Eso devuelve a la rentabilidad la caída de precio del día
 * ex-dividendo; el desfase entre fecha ex y fecha de pago introduce un error de
 * unos días que el gráfico no distingue.
 */
export function buildTimelineFromLedger(
	ticker: string,
	transactions: Transaction[]
): PositionTimeline {
	const sorted = transactions
		.filter((t) => t.ticker === ticker)
		.sort((a, b) => a.date - b.date);

	if (sorted.length === 0) {
		return {
			ticker,
			segments: [{ from: null, to: null, shares: 0, source: 'ledger' }],
			flows: []
		};
	}

	const segments: TimelineSegment[] = [
		{ from: null, to: sorted[0].date, shares: 0, source: 'ledger' }
	];
	const flows: Flow[] = [];
	let running = 0;

	for (const tx of sorted) {
		const fx = tx.fxRate || 1;

		if (tx.type === 'dividend') {
			const amount = (tx.shares * tx.price - (tx.fees || 0)) * fx;
			if (amount > 0) {
				flows.push({ date: tx.date, ticker, shares: 0, amount: -amount, kind: 'sale' });
			}
			continue;
		}

		let delta = 0;
		if (tx.type === 'sell') {
			delta = -Math.min(tx.shares, running);
		} else {
			delta = tx.shares;
		}
		if (Math.abs(delta) < EPS) continue;

		running = Math.max(0, running + delta);

		const open = segments[segments.length - 1];
		if (open.from !== null && open.from >= tx.date) {
			open.shares = running;
		} else {
			open.to = tx.date;
			segments.push({ from: tx.date, to: null, shares: running, source: 'ledger' });
		}

		const amount = (delta * tx.price + (delta > 0 ? tx.fees || 0 : 0)) * fx;
		flows.push({
			date: tx.date,
			ticker,
			shares: delta,
			amount,
			kind: delta > 0 ? 'purchase' : 'sale'
		});
	}

	return { ticker, segments, flows };
}

/** Participaciones vigentes en un instante dado. */
export function sharesAt(timeline: PositionTimeline, at: number): number {
	for (const segment of timeline.segments) {
		const startsBefore = segment.from === null || at >= segment.from;
		const endsAfter = segment.to === null || at < segment.to;
		if (startsBefore && endsAfter) return segment.shares;
	}
	return 0;
}

/**
 * `true` si el instante cae en un tramo cuyas participaciones no fueron
 * observadas por la app, solo asumidas. Esos días se pintan como estimados.
 */
export function isEstimatedAt(timeline: PositionTimeline, at: number): boolean {
	for (const segment of timeline.segments) {
		const startsBefore = segment.from === null || at >= segment.from;
		const endsAfter = segment.to === null || at < segment.to;
		if (startsBefore && endsAfter) return segment.source === 'seed';
	}
	return false;
}
