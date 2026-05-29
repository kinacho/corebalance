import type { Transaction, ParsedPosition } from './types';

/**
 * Reduce una lista de transacciones a una lista de posiciones consolidadas,
 * ordenándolas cronológicamente y aplicando el método contable del coste medio ponderado.
 */
export function reduceTransactionsToPositions(transactions: Transaction[]): ParsedPosition[] {
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
		const key = (tx.isin || tx.ticker || tx.name).toUpperCase();
		const existing = positions.get(key);

		if (tx.type === 'BUY') {
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
		} else if (tx.type === 'SELL') {
			if (existing) {
				const prevShares = existing.shares;
				const prevAvgCost = prevShares > 0 ? (existing.totalCost / prevShares) : 0;

				existing.shares -= tx.shares;

				if (existing.shares > 0) {
					// Reducción proporcional del coste total según el coste medio previo.
					// Las ventas NO cambian el coste medio unitario de las acciones restantes.
					existing.totalCost = existing.shares * prevAvgCost;
				} else {
					existing.shares = 0;
					existing.totalCost = 0;
				}
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

	return consolidated;
}
