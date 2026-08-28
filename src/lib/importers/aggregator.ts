import { claveDeGrupo, type CosteHeredado } from './direccion';
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
 */
export function reduceTransactionsToPositions(
	transactions: Transaction[],
	/**
	 * El coste que viaja en cada traspaso confirmado, por `transferId`.
	 *
	 * ⚠️ **Sin esto la posición del destino sale con el coste de suscripción, y eso es
	 * precisamente la plusvalía latente desapareciendo.** En un traspaso el valor de
	 * adquisición viaja con el dinero (art. 94 LIRPF), así que la entrada no vale lo
	 * que costó suscribir sino lo que costó comprar en el origen. Es la misma regla
	 * que aplica `ledger.ts` con `carriedCostBase`; aquí se aplica a la instantánea
	 * para que la previsualización enseñe **el mismo número que se va a escribir**.
	 *
	 * Opcional: sin el mapa —o con un traspaso cuyo coste no se sabe— se cae al precio
	 * del fichero, que es el comportamiento de siempre.
	 */
	costesHeredados?: Map<string, CosteHeredado>
): {
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
			/*
			 * El coste heredado manda sobre el precio del fichero cuando lo hay: ver el
			 * parámetro `costesHeredados`. ⚠️ La comparación es contra `null` explícito y
			 * no un `||`: un coste heredado de **0 € es un valor legítimo** —un fondo
			 * regalado, o uno cuyo libro no tiene coste— y con `||` se caería al precio
			 * del día, que es justo la plusvalía latente desapareciendo. `null` significa
			 * «no se sabe», y solo eso cae al precio.
			 */
			const heredado =
				tx.type === 'TRANSFER_IN' && tx.transferId
					? (costesHeredados?.get(tx.transferId)?.coste ?? null)
					: null;
			const txCost = heredado !== null ? heredado : tx.shares * tx.price;
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
