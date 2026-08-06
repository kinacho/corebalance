import type { Asset, AssetCategory, PortfolioPosition, Transaction } from './types';
import { instrumentTypeOf } from './instrument-type';
import {
	buildFifoLots,
	simulateSale,
	calculateSavingsTax,
	checkAntiApplicationRule,
	type AntiApplicationCheck
} from './fiscal';

/**
 * Rebalanceo consciente del impuesto.
 *
 * El motor de `rebalance.ts` solo compra, para no realizar plusvalías. Es
 * prudente, pero para el usuario español al que está dirigida la app resulta
 * innecesariamente prudente en un caso muy concreto y muy frecuente: **entre
 * fondos de inversión, mover dinero no tributa** (art. 94 LIRPF, diferimiento
 * por traspaso). Ahí no hay razón para corregir la desviación a lo largo de
 * meses de aportaciones cuando se puede corregir hoy y exacta, sin coste.
 *
 * Este módulo calcula las dos vías y las pone una al lado de la otra:
 *   - lo que se puede mover **gratis** (fondo → fondo, o desde efectivo),
 *   - lo que solo se puede mover **vendiendo**, con su plusvalía por FIFO, su
 *     impuesto estimado y el aviso de la regla antiaplicación,
 *   - cuántos meses tardaría la vía de solo aportar en llegar a lo mismo.
 *
 * Nunca decide por el usuario: devuelve las dos columnas y él elige.
 *
 * El rebalanceo se calcula **dentro de cada categoría**, porque es donde los
 * pesos objetivo están definidos. Mover dinero de «acciones» a «core» no es un
 * rebalanceo, es un cambio de estrategia, y la app no tiene un objetivo
 * declarado entre categorías con el que medirlo.
 */

/** Por debajo de esto no merece la pena proponer un movimiento (en divisa base). */
const MIN_MOVE_AMOUNT = 10;

/**
 * Si un importe da para proponer un movimiento.
 *
 * ⚠️ Esta comparación estaba escrita **cinco veces** —dos filtros y tres guardas del
 * emparejamiento— y el mutation testing lo delataba: doce de los mutantes supervivientes
 * eran el *mismo* cambio de `>` a `>=` repetido en cinco sitios, porque un test que pasa
 * por el umbral en un sitio deja los otros cuatro sin comprobar. Con un solo predicado, el
 * caso «desviación de 10 € justos» cubre las cinco.
 *
 * Es estrictamente mayor: 10 € justos no se mueven.
 */
function meritaMover(amount: number): boolean {
	return amount > MIN_MOVE_AMOUNT;
}

/** De mayor a menor importe pendiente: se atiende primero la desviación más grande. */
function porRestanteDescendente(
	a: { remaining: number },
	b: { remaining: number }
): number {
	return b.remaining - a.remaining;
}

/** Banda de tolerancia: una desviación menor que esto se considera «en objetivo». */
export const DEVIATION_BAND = 0.01;

/** Tope de la simulación de convergencia por aportaciones, en meses. */
const MAX_CONVERGENCE_MONTHS = 240;

export type MoveKind = 'traspaso' | 'reembolso' | 'venta' | 'efectivo';

export interface TransferMove {
	from: Asset;
	to: Asset;
	/** Importe en divisa base. */
	amount: number;
	sharesToSell: number;
	sharesToBuy: number;
	kind: MoveKind;
	taxFree: boolean;
	/** Plusvalía realizada por este movimiento. Negativa si es pérdida. */
	realizedGain: number;
	/**
	 * Impuesto atribuible a este movimiento, repartido de forma progresiva: cada
	 * movimiento paga lo que añade a la escala una vez colocados los anteriores.
	 * La suma de todos coincide con `totalEstimatedTax`.
	 */
	estimatedTax: number;
	/** Presente solo si el movimiento realiza pérdidas y hay recompras en ventana. */
	lossBlocked: AntiApplicationCheck | null;
	/** True si el ledger no tiene lotes suficientes y la plusvalía es parcial. */
	gainIsPartial: boolean;
}

export interface CategoryPlan {
	category: AssetCategory;
	moves: TransferMove[];
	totalMoved: number;
	taxFreeAmount: number;
	taxableAmount: number;
	/** Suma de plusvalías y pérdidas deducibles: la base del cálculo. */
	netRealizedGain: number;
	totalEstimatedTax: number;
	/** Pérdidas que la regla antiaplicación deja sin compensar. */
	blockedLosses: number;
	/** Activos que no se han tocado porque no sabemos su trato fiscal. */
	excludedTickers: string[];
	maxDeviationBefore: number;
	maxDeviationAfter: number;
}

export interface TaxAwareRebalanceResult {
	plans: CategoryPlan[];
	totalMoved: number;
	taxFreeAmount: number;
	taxableAmount: number;
	netRealizedGain: number;
	totalEstimatedTax: number;
	blockedLosses: number;
	hasAnythingToDo: boolean;
	/**
	 * Meses que tardaría la vía de solo aportar en meter todas las desviaciones
	 * en la banda, con la aportación actual y a precios de hoy. `null` si no hay
	 * aportación configurada o si no converge dentro del tope.
	 */
	monthsToConvergeByContribution: number | null;
	contributionUsed: number;
}

interface CategoryInput {
	category: AssetCategory;
	positions: PortfolioPosition[];
}

/**
 * Precio unitario en divisa base.
 *
 * Se deriva de `totalValue / holdings` en lugar de multiplicar `unitPrice` por
 * el tipo de cambio, para que las participaciones que salgan de aquí sean
 * coherentes con el valor que la app ya muestra. Es el mismo criterio que usa el
 * store para el histórico, y existe porque aplicar la conversión dos veces ya
 * produjo un bug real de beneficios.
 */
function unitPriceBaseOf(position: PortfolioPosition): number {
	if (position.holdings > 0 && position.totalValue > 0) {
		return position.totalValue / position.holdings;
	}
	return position.unitPrice;
}

/**
 * Si mover dinero de un activo a otro está libre de impuestos.
 *
 * Dos condiciones, y las dos importan:
 *   - **fondo → fondo** es traspaso con diferimiento. Un fondo que se reembolsa
 *     para comprar un ETF **no** lo es, aunque el origen sea un fondo: el
 *     destino tiene que ser también una IIC traspasable.
 *   - **desde efectivo** no hay transmisión de nada, así que no hay ganancia
 *     patrimonial que declarar.
 */
function classifyMove(from: Asset, to: Asset): { kind: MoveKind; taxFree: boolean } {
	const fromType = instrumentTypeOf(from);
	const toType = instrumentTypeOf(to);

	if (fromType === 'cash') return { kind: 'efectivo', taxFree: true };
	if (fromType === 'fund' && toType === 'fund') return { kind: 'traspaso', taxFree: true };
	if (fromType === 'fund') return { kind: 'reembolso', taxFree: false };
	return { kind: 'venta', taxFree: false };
}

/** Un activo cuyo trato fiscal no conocemos no se toca. */
function isMovable(asset: Asset): boolean {
	return instrumentTypeOf(asset) !== 'other';
}

/**
 * Empareja excedentes con déficits maximizando el importe libre de impuestos.
 *
 * El orden no es cosmético: si se emparejase en el orden en que están los
 * activos, un fondo con excedente podría acabar financiando un ETF (reembolso,
 * tributa) mientras otro fondo con déficit se queda esperando la aportación del
 * mes que viene. Haciendo primero todas las parejas fondo→fondo se aprovecha
 * todo el margen gratuito que la cartera permite, y solo lo que sobra pasa por
 * caja.
 */
function pairSourcesToTargets(
	sources: { position: PortfolioPosition; remaining: number }[],
	targets: { position: PortfolioPosition; remaining: number }[]
): { from: PortfolioPosition; to: PortfolioPosition; amount: number }[] {
	const pairs: { from: PortfolioPosition; to: PortfolioPosition; amount: number }[] = [];

	// Dos pasadas: primero solo las parejas sin coste fiscal, luego el resto.
	for (const freeOnly of [true, false]) {
		for (const source of sources) {
			if (!meritaMover(source.remaining)) continue;
			for (const target of targets) {
				if (!meritaMover(target.remaining)) continue;

				const { taxFree } = classifyMove(source.position.asset, target.position.asset);
				if (freeOnly && !taxFree) continue;

				const amount = Math.min(source.remaining, target.remaining);
				if (!meritaMover(amount)) continue;

				pairs.push({ from: source.position, to: target.position, amount });
				source.remaining -= amount;
				target.remaining -= amount;

				// Agotado el excedente, no hay nada más que repartir desde aquí.
				if (!meritaMover(source.remaining)) break;
			}
		}
	}

	return pairs;
}

/**
 * Calcula el plan de rebalanceo con su coste fiscal.
 *
 * `otherGainsThisYear` es lo que el usuario ya haya realizado en el ejercicio
 * por su cuenta: sin ese dato la escala arranca en cero y el impuesto estimado
 * sale sistemáticamente por debajo del real.
 */
export function calculateTaxAwareRebalance(
	categories: CategoryInput[],
	transactions: Transaction[],
	options: { contribution?: number; otherGainsThisYear?: number; now?: number } = {}
): TaxAwareRebalanceResult {
	const now = options.now ?? Date.now();
	const contribution = options.contribution ?? 0;

	/**
	 * La escala del ahorro es progresiva y única para todo el ejercicio, así que
	 * el impuesto no se puede calcular movimiento a movimiento por separado: se
	 * acumula aquí y cada movimiento paga lo que añade al total.
	 */
	let runningGain = Math.max(0, options.otherGainsThisYear ?? 0);
	const gainFloor = runningGain;

	const plans: CategoryPlan[] = [];

	for (const { category, positions } of categories) {
		const movable = positions.filter((p) => isMovable(p.asset));
		const excludedTickers = positions
			.filter((p) => !isMovable(p.asset) && p.totalValue > 0)
			.map((p) => p.asset.ticker);

		const maxDeviationBefore = positions.reduce(
			(max, p) => Math.max(max, Math.abs(p.deviation)),
			0
		);

		// Excedente y déficit en divisa base. `targetValue` ya viene calculado
		// sobre el capital de la categoría, así que los dos lados cuadran.
		const sources = movable
			.filter((p) => meritaMover(p.totalValue - p.targetValue))
			.map((p) => ({ position: p, remaining: p.totalValue - p.targetValue }))
			.sort(porRestanteDescendente);

		// El destino necesita precio: sin él no se puede convertir el importe en
		// participaciones, y proponer una compra a ciegas es peor que no proponerla.
		const targets = movable
			.filter((p) => meritaMover(p.targetValue - p.totalValue) && p.unitPrice > 0)
			.map((p) => ({ position: p, remaining: p.targetValue - p.totalValue }))
			.sort(porRestanteDescendente);

		const pairs = pairSourcesToTargets(sources, targets);
		const moves: TransferMove[] = [];

		for (const pair of pairs) {
			const { kind, taxFree } = classifyMove(pair.from.asset, pair.to.asset);
			const fromUnitPrice = unitPriceBaseOf(pair.from);
			const toUnitPrice = unitPriceBaseOf(pair.to);

			const sharesToSell = fromUnitPrice > 0 ? pair.amount / fromUnitPrice : 0;
			const sharesToBuy = toUnitPrice > 0 ? pair.amount / toUnitPrice : 0;

			let realizedGain = 0;
			let estimatedTax = 0;
			let lossBlocked: AntiApplicationCheck | null = null;
			let gainIsPartial = false;

			if (!taxFree) {
				const lots = buildFifoLots(transactions, pair.from.asset.ticker);
				const sale = simulateSale(lots, sharesToSell, fromUnitPrice);
				realizedGain = sale.gain;
				// Sin ledger no hay lotes, y sin lotes no hay valor de adquisición
				// fiable: se marca en lugar de inventar una plusvalía de cero.
				gainIsPartial = sale.incomplete || lots.length === 0;

				if (realizedGain < 0) {
					const check = checkAntiApplicationRule(
						transactions,
						pair.from.asset.ticker,
						instrumentTypeOf(pair.from.asset),
						now
					);
					if (check.blocked) lossBlocked = check;
				}

				// Una pérdida bloqueada por la regla antiaplicación no compensa
				// ganancias, así que no entra en la base.
				const countsTowardsBase = realizedGain > 0 || lossBlocked === null;
				if (countsTowardsBase) {
					const before = calculateSavingsTax(Math.max(0, runningGain - gainFloor), gainFloor);
					runningGain += realizedGain;
					const after = calculateSavingsTax(Math.max(0, runningGain - gainFloor), gainFloor);
					estimatedTax = Math.round((after - before) * 100) / 100;
				}
			}

			moves.push({
				from: pair.from.asset,
				to: pair.to.asset,
				amount: Math.round(pair.amount * 100) / 100,
				sharesToSell: Math.round(sharesToSell * 10000) / 10000,
				sharesToBuy: Math.round(sharesToBuy * 10000) / 10000,
				kind,
				taxFree,
				realizedGain,
				estimatedTax,
				lossBlocked,
				gainIsPartial
			});
		}

		const taxFreeAmount = sum(moves.filter((m) => m.taxFree).map((m) => m.amount));
		const taxableAmount = sum(moves.filter((m) => !m.taxFree).map((m) => m.amount));
		const blockedLosses = sum(
			moves.filter((m) => m.lossBlocked !== null).map((m) => Math.abs(m.realizedGain))
		);
		const netRealizedGain = sum(
			moves.filter((m) => m.lossBlocked === null).map((m) => m.realizedGain)
		);

		plans.push({
			category,
			moves,
			totalMoved: round2(taxFreeAmount + taxableAmount),
			taxFreeAmount: round2(taxFreeAmount),
			taxableAmount: round2(taxableAmount),
			netRealizedGain: round2(netRealizedGain),
			totalEstimatedTax: round2(sum(moves.map((m) => m.estimatedTax))),
			blockedLosses: round2(blockedLosses),
			excludedTickers,
			maxDeviationBefore,
			// Tras aplicar el plan, lo que queda desviado es lo que no se ha podido
			// emparejar: excedentes sin destino o déficits sin origen.
			maxDeviationAfter: residualDeviation(movable, moves)
		});
	}

	const allMoves = plans.flatMap((p) => p.moves);

	return {
		plans,
		totalMoved: round2(sum(plans.map((p) => p.totalMoved))),
		taxFreeAmount: round2(sum(plans.map((p) => p.taxFreeAmount))),
		taxableAmount: round2(sum(plans.map((p) => p.taxableAmount))),
		netRealizedGain: round2(sum(plans.map((p) => p.netRealizedGain))),
		totalEstimatedTax: round2(sum(plans.map((p) => p.totalEstimatedTax))),
		blockedLosses: round2(sum(plans.map((p) => p.blockedLosses))),
		hasAnythingToDo: allMoves.length > 0,
		monthsToConvergeByContribution: monthsToConverge(categories, contribution),
		contributionUsed: contribution
	};
}

/**
 * Desviación máxima que quedaría después de aplicar los movimientos.
 *
 * No vuelve a llamar al motor de cartera: aplica los importes sobre los valores
 * actuales y recalcula pesos. El capital total de la categoría no cambia con un
 * rebalanceo interno, lo que hace que la cuenta sea exacta y no una estimación.
 */
function residualDeviation(positions: PortfolioPosition[], moves: TransferMove[]): number {
	const valueByTicker = new Map<string, number>();
	for (const position of positions) valueByTicker.set(position.asset.ticker, position.totalValue);

	for (const move of moves) {
		valueByTicker.set(move.from.ticker, (valueByTicker.get(move.from.ticker) ?? 0) - move.amount);
		valueByTicker.set(move.to.ticker, (valueByTicker.get(move.to.ticker) ?? 0) + move.amount);
	}

	const total = [...valueByTicker.values()].reduce((a, b) => a + b, 0);
	if (total <= 0) return 0;

	let max = 0;
	for (const position of positions) {
		const value = valueByTicker.get(position.asset.ticker) ?? 0;
		max = Math.max(max, Math.abs(value / total - position.asset.targetWeight));
	}
	return max;
}

/**
 * Cuántos meses de aportaciones harían falta para meter todas las desviaciones
 * en la banda, sin vender nada.
 *
 * Es la cifra que da sentido a la comparación: el usuario no está eligiendo
 * entre «pagar impuestos» y «no pagarlos», está eligiendo entre corregir hoy y
 * corregir en N meses. Asume **precios constantes** y que la aportación se
 * reparte como lo hace el motor de aportaciones (proporcional al déficit). No
 * pretende predecir el futuro: pretende dimensionar la espera.
 */
function monthsToConverge(categories: CategoryInput[], contribution: number): number | null {
	if (contribution <= 0) return null;

	// Se reparte la aportación entre categorías en proporción a su capital, que es
	// lo que mantiene la proporción entre categorías que el usuario ya tiene.
	const capitals = categories.map((c) => sum(c.positions.map((p) => p.totalValue)));
	const totalCapital = sum(capitals);
	if (totalCapital <= 0) return null;

	const state = categories.map((c, i) => ({
		values: c.positions.map((p) => p.totalValue),
		weights: c.positions.map((p) => p.asset.targetWeight),
		buyable: c.positions.map((p) => p.unitPrice > 0 && isMovable(p.asset)),
		share: capitals[i] / totalCapital
	}));

	const withinBand = () =>
		state.every((category) => {
			const total = sum(category.values);
			if (total <= 0) return true;
			return category.values.every(
				(value, i) => Math.abs(value / total - category.weights[i]) <= DEVIATION_BAND
			);
		});

	if (withinBand()) return 0;

	for (let month = 1; month <= MAX_CONVERGENCE_MONTHS; month++) {
		for (const category of state) {
			const budget = contribution * category.share;
			if (budget <= 0) continue;

			const futureTotal = sum(category.values) + budget;
			const deficits = category.values.map((value, i) =>
				category.buyable[i] ? Math.max(0, futureTotal * category.weights[i] - value) : 0
			);
			const totalDeficit = sum(deficits);
			if (totalDeficit <= 0) continue;

			const factor = totalDeficit > budget ? budget / totalDeficit : 1;
			for (let i = 0; i < category.values.length; i++) {
				category.values[i] += deficits[i] * factor;
			}
		}

		if (withinBand()) return month;
	}

	return null;
}

function sum(values: number[]): number {
	return values.reduce((a, b) => a + b, 0);
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
