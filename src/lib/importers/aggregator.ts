import { claveDeGrupo } from './direccion';
import type { Transaction, ParsedPosition } from './types';

/**
 * Reduce una lista de transacciones a una lista de posiciones consolidadas,
 * ordenándolas cronológicamente y aplicando el método contable del coste medio ponderado.
 *
 * ⚠️ Devuelve también `warnings`, y ese cambio de forma es el arreglo. Antes devolvía solo
 * las posiciones, y era el **único punto del subsistema capaz de perder transacciones sin
 * dejar rastro**: una venta cuya posición no existe todavía se descartaba con un `if
 * (existing)` sin `else`, y una sobreventa se recortaba a cero en silencio. Ni `skipRow`,
 * ni aviso, ni cuenta.
 *
 * No es un caso raro: es lo que pasa siempre que alguien descarga solo los últimos doce
 * meses y las compras antiguas quedan fuera de la ventana. El usuario veía menos títulos
 * de los que tiene —o ninguno, si el recorte llega a cero y la posición desaparece del
 * listado— con `skippedRows: 0` y `warnings: []`, es decir, sin nada que mirar.
 *
 * ⚠️ **Tenía un segundo parámetro con el coste heredado de cada traspaso y se ha
 * quitado en la 1.23.1.** Aplicaba a la instantánea el valor de adquisición del art. 94
 * en vez del importe suscrito, con el argumento de que si no «la plusvalía latente
 * desaparece». El argumento vale para `fiscal.ts` y no para aquí: esta cifra es la que
 * el usuario coteja contra su extracto, y **la fuente de la verdad de «cuánto llevo
 * metido» es la gestora**. Con el coste heredado la previsualización enseñaba un coste
 * medio que no aparece en ningún papel que el usuario tenga.
 *
 * El coste heredado no se pierde: `ledger-import.ts` lo sigue escribiendo como
 * `carriedCostBase` en la pata de entrada, y de ahí lo lee `fiscal.ts`.
 */
export function reduceTransactionsToPositions(transactions: Transaction[]): {
	positions: ParsedPosition[];
	warnings: string[];
} {
	const warnings: string[] = [];
	// 1. Ordenar cronológicamente (de más antigua a más reciente)
	const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

	const positions = new Map<string, {
		isin: string;
		ticker?: string;
		name: string;
		shares: number;
		totalCost: number; // Coste total acumulado en la divisa original
		currency: string;
	}>();

	for (const tx of sorted) {
		const key = claveDeGrupo(tx);
		const existing = positions.get(key);

		const entra = tx.type === 'BUY' || tx.type === 'TRANSFER_IN';
		const sale = tx.type === 'SELL' || tx.type === 'TRANSFER_OUT';

		if (entra) {
			// Una entrada de traspaso cuesta lo suscrito, igual que una compra. Ver arriba.
			const txCost = tx.shares * tx.price;
			if (existing) {
				existing.shares += tx.shares;
				existing.totalCost += txCost;
				// Mantener el nombre más largo/descriptivo
				if (tx.name.length > existing.name.length) {
					existing.name = tx.name;
				}
				if (!existing.isin && tx.isin) existing.isin = tx.isin;
				if (!existing.ticker && tx.ticker) existing.ticker = tx.ticker;
			} else {
				positions.set(key, {
					isin: tx.isin || '',
					ticker: tx.ticker,
					name: tx.name,
					shares: tx.shares,
					totalCost: txCost,
					currency: tx.currency
				});
			}
		} else if (sale) {
			/*
			 * Una salida de traspaso reduce la posición **igual que una venta**: para la
			 * instantánea las participaciones se han ido de la misma manera, y el coste
			 * total baja en proporción sin mover el coste medio. Donde las dos se separan
			 * es en `fiscal.ts`, que realiza plusvalía en la venta y la difiere en el
			 * traspaso — y eso no se decide aquí.
			 */
			const verbo = tx.type === 'TRANSFER_OUT' ? 'traspasaron' : 'vendieron';
			const sustantivo = tx.type === 'TRANSFER_OUT' ? 'salida de traspaso' : 'venta';
			if (existing) {
				const prevShares = existing.shares;
				const prevAvgCost = prevShares > 0 ? (existing.totalCost / prevShares) : 0;

				existing.shares -= tx.shares;

				if (existing.shares > 0) {
					// Reducción proporcional del coste total según el coste medio previo.
					// Las ventas NO cambian el coste medio unitario de las acciones restantes.
					existing.totalCost = existing.shares * prevAvgCost;
				} else {
					if (existing.shares < -0.0001) {
						warnings.push(
							`Se ${verbo} más títulos de ${existing.name} de los que constan comprados en el archivo ` +
							`(faltan ${Math.abs(existing.shares).toLocaleString('es-ES')}). La posición queda a 0; ` +
							`probablemente el histórico no incluye las compras más antiguas.`
						);
					}
					existing.shares = 0;
					existing.totalCost = 0;
				}
			} else {
				warnings.push(
					`Se ha ignorado una ${sustantivo} de ${tx.shares.toLocaleString('es-ES')} de ${tx.name} porque en el ` +
					`archivo no consta ninguna compra previa. Si descargaste solo un periodo reciente, ` +
					`las compras anteriores no están en el fichero.`
				);
			}
		}
	}

	const consolidated: ParsedPosition[] = [];
	for (const [_, data] of positions) {
		if (data.shares > 0.0001) {
			consolidated.push({
				isin: data.isin,
				ticker: data.ticker,
				name: data.name,
				shares: data.shares,
				avgCost: data.totalCost / data.shares,
				currency: data.currency
			});
		}
	}

	return { positions: consolidated, warnings };
}
