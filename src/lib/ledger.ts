import { esEntradaDeTraspaso, esSalidaDeTraspaso, type Asset, type Transaction } from './types';

/**
 * Contabilidad del libro de transacciones: coste medio ponderado, coste en divisa base
 * e intereses devengados.
 *
 * ⚠️ **Divergencia deliberada con `fiscal.ts`, y las dos son correctas.** Aquí un
 * dividendo **reduce el coste** de la posición, que es una decisión de presentación
 * razonable —baja tu coste efectivo— y es lo que la app muestra. Fiscalmente no: un
 * dividendo es rendimiento del capital mobiliario del año en que se cobra y no toca el
 * valor de adquisición de nada, así que `fiscal.ts` los ignora y usa FIFO en vez de coste
 * medio. Sirven para preguntas distintas y dan cifras distintas a propósito.
 *
 * Vivía dentro del `$derived.by()` del store, con dos consecuencias: usaba `Date.now()`
 * por dentro —así que no se podía fijar la fecha, y el devengo de intereses es aritmética
 * de fechas— y tenía dos predicados escritos dos veces. El mutation testing lo delató:
 * 26 de sus 43 mutantes supervivientes eran el *mismo* mutante en las dos copias.
 */

/** Lo que el ledger sabe de una posición tras recorrer sus transacciones. */
export interface LedgerPosition {
	shares: number;
	/** Coste medio **en divisa del activo**: se compara con el precio de cotización. */
	avgCost: number;
	/** Coste acumulado en divisa del activo, antes de redondear. */
	totalCostRaw: number;
	/** Coste total **en divisa base**: es lo que alimenta el patrimonio en euros. */
	totalCostBase: number;
	accruedInterest: number;
	lastTxDate: number | null;
}

export type LedgerHoldings = Record<string, LedgerPosition>;

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Devenga el interés de un periodo **sobre el saldo que había en ese periodo**.
 *
 * No sobre el saldo final: quien mete 1.000 € y diez días después otros 1.000 no ha
 * tenido 2.000 € rindiendo veinte días. Se llama una vez por transacción —para cerrar el
 * tramo anterior— y una última vez hasta hoy.
 */
function devengar(pos: LedgerPosition, hasta: number, tipoAnual: number): void {
	if (pos.lastTxDate === null || pos.shares <= 0 || tipoAnual <= 0) return;
	const dias = Math.max(0, hasta - pos.lastTxDate) / MS_POR_DIA;
	pos.accruedInterest += pos.shares * (tipoAnual / 365) * dias;
}

function posicionVacia(): LedgerPosition {
	return {
		shares: 0,
		avgCost: 0,
		totalCostRaw: 0,
		totalCostBase: 0,
		accruedInterest: 0,
		lastTxDate: null
	};
}

function redondear3(valor: number): number {
	return Math.round(valor * 1000) / 1000;
}

/**
 * Reconstruye las posiciones a partir del libro de transacciones.
 *
 * `assets` solo se usa para leer `manualInterestRate`; da igual de qué bloque venga cada
 * activo. `now` se pide en lugar de leer el reloj para que el devengo sea reproducible:
 * un test que dependa de `Date.now()` pasa hoy y falla en tres meses.
 */
export function calculateLedgerHoldings(
	transactions: Transaction[],
	assets: Asset[],
	now: number
): LedgerHoldings {
	const tipoDe = (ticker: string) =>
		assets.find((a) => a.ticker === ticker)?.manualInterestRate || 0;

	const result: LedgerHoldings = {};
	const ordenadas = [...transactions].sort((a, b) => a.date - b.date);

	for (const t of ordenadas) {
		if (!result[t.ticker]) result[t.ticker] = posicionVacia();
		const pos = result[t.ticker];

		// Cierra el tramo anterior antes de que la transacción cambie el saldo.
		devengar(pos, t.date, tipoDe(t.ticker));
		pos.lastTxDate = t.date;

		if (t.type === 'buy' || t.type === 'initial_balance' || esEntradaDeTraspaso(t.type)) {
			if (t.shares > 0) {
				/*
				 * ⚠️ **Con coste heredado el coste NO es `shares × price`, y ahí está toda
				 * la diferencia entre un traspaso y una compra.**
				 *
				 * En un traspaso entre fondos el valor de adquisición viaja con el dinero
				 * (art. 94 LIRPF), así que apuntar el precio del día convertiría una
				 * plusvalía latente en coste y la haría desaparecer del libro. La entrada
				 * llega ya en divisa base, que es como la calcula `traspaso-libro.ts`
				 * leyendo los lotes del origen, así que **no** se le aplica `fxRate`: sería
				 * la conversión dos veces, que es el bug histórico de `simulateSale`.
				 *
				 * Sin el campo —filas anteriores a la 1.22.0, o el alias `'transfer'`— se
				 * mantiene el comportamiento de siempre. Es lo que hace seguro el alias.
				 */
				const heredado = t.carriedCostBase !== undefined && t.carriedCostBase >= 0;
				const txCostRaw = heredado
					? (t.carriedCostBase as number) / (t.fxRate || 1)
					: t.shares * t.price + (t.fees || 0);
				const txCostBase = heredado ? (t.carriedCostBase as number) : txCostRaw * (t.fxRate || 1);
				const newShares = pos.shares + t.shares;
				pos.totalCostRaw += txCostRaw;
				pos.totalCostBase += txCostBase;
				pos.avgCost = newShares > 0 ? pos.totalCostRaw / newShares : 0;
				pos.shares = newShares;
			}
		} else if (t.type === 'sell' || esSalidaDeTraspaso(t.type)) {
			if (pos.shares > 0) {
				/*
				 * Una venta reduce el coste total **en proporción** y deja intacto el coste
				 * medio: vender no cambia a qué precio compraste lo que sigue en cartera.
				 *
				 * Una salida de traspaso hace lo mismo **aquí**, porque para el libro las
				 * participaciones se han ido igual. Donde las dos se separan es en
				 * `fiscal.ts`: la venta realiza plusvalía y la salida no.
				 */
				const ratio = Math.min(1, t.shares / pos.shares);
				pos.totalCostRaw -= pos.totalCostRaw * ratio;
				pos.totalCostBase -= pos.totalCostBase * ratio;
				pos.shares = Math.max(0, pos.shares - t.shares);
			}
		} else if (t.type === 'dividend') {
			// Y aquí las comisiones **restan**: de un dividendo de 20 € con 2 € de gastos
			// llegan 18, y son 18 los que bajan el coste.
			const divAmountRaw = t.shares * t.price - (t.fees || 0);
			pos.totalCostRaw -= divAmountRaw;
			pos.totalCostBase -= divAmountRaw * (t.fxRate || 1);
			pos.avgCost = pos.shares > 0 ? pos.totalCostRaw / pos.shares : 0;
		}
	}

	for (const ticker in result) {
		const pos = result[ticker];
		// El último tramo, desde la transacción más reciente hasta hoy.
		devengar(pos, now, tipoDe(ticker));

		pos.shares = redondear3(pos.shares);
		pos.avgCost = redondear3(pos.avgCost);
		pos.totalCostBase = redondear3(pos.totalCostBase);
		pos.accruedInterest = redondear3(pos.accruedInterest);
	}

	return result;
}
