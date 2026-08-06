import type {
	Asset,
	PriceData,
	PortfolioState,
	PortfolioPosition,
	RebalanceResult,
	RebalanceAllocation,
	HoldingsMap
} from './types';

/**
 * Calcula el estado actual de la cartera:
 * valor por activo, capital total, pesos actuales y beneficios.
 */
export function calculatePortfolioState(
	assets: Asset[],
	holdings: HoldingsMap,
	prices: Record<string, PriceData>
): PortfolioState {
	// Calcular valor total de cada posición
	const rawPositions = assets.map((asset) => {
		const data = holdings[asset.ticker] ?? { shares: 0, avgCost: 0 };
		const shareCount = data.shares;
		const averageCost = data.avgCost;
		const pData = prices[asset.ticker];
		const currentPrice = pData?.price ?? 0;
		const fxRate = pData?.fxRate ?? 1;
		
		const totalValueBase = shareCount * currentPrice * fxRate;
		const isManual = asset.manualInterestRate !== undefined;
		
		const changePercent = asset.manualInterestRate !== undefined ? (asset.manualInterestRate * 100 / 365) : (pData?.change ?? 0);
		const dailyChangeValue = totalValueBase * (changePercent / 100);
		const dailyChangePercent = changePercent / 100;

		let totalValue = totalValueBase;
		let totalCost = data.totalCostBase !== undefined ? data.totalCostBase : shareCount * (averageCost * fxRate);
		let profit = 0;
		let profitPercent = 0;

		if (isManual) {
			if (data.accruedInterest !== undefined) {
				totalValue = totalValueBase + data.accruedInterest;
				profit = data.accruedInterest;
				profitPercent = totalCost > 0 ? profit / totalCost : 0;
			} else {
				// Fallback para cuando no se usa Ledger
				totalValue = totalValueBase + dailyChangeValue;
				totalCost = totalValue;
				profit = 0;
				profitPercent = 0;
			}
		} else {
			profit = totalValue - totalCost;
			profitPercent = totalCost > 0 ? profit / totalCost : 0;
		}
		
		return { 
			asset, 
			holdings: shareCount, 
			avgCost: averageCost,
			totalCost,
			unitPrice: currentPrice, 
			totalValue,
			profit,
			profitPercent,
			dailyChangeValue,
			dailyChangePercent,
			marketState: pData?.marketState,
			lastUpdate: pData?.lastUpdate,
			// Un tipo manual ya viene en tanto por uno (0,0365 = 3,65 %) y **no** se
			// reescala; los porcentajes de Yahoo llegan como 3,65 y sí. Aquí había un
			// `/ 1` que documentaba eso dividiendo por uno: además de ruido, era un mutante
			// imposible de matar, porque `* 1` y `/ 1` son lo mismo.
			ytdChangePercent: asset.manualInterestRate !== undefined ? asset.manualInterestRate : (pData?.ytdChangePercent !== undefined ? (pData.ytdChangePercent / 100) : undefined),
			mtdChangePercent: pData?.mtdChangePercent !== undefined ? (pData.mtdChangePercent / 100) : undefined,
			oneMonthChangePercent: pData?.oneMonthChangePercent !== undefined ? (pData.oneMonthChangePercent / 100) : undefined,
			sparkline: pData?.sparkline
		};
	});

	const totalCapital = rawPositions.reduce((sum, pos) => sum + pos.totalValue, 0);
	const totalInvested = rawPositions.reduce((sum, pos) => sum + pos.totalCost, 0);
	const totalProfit = totalCapital - totalInvested;
	const totalProfitPercent = totalInvested > 0 ? totalProfit / totalInvested : 0;

	// Calcular costes anuales
	const totalAnnualCost = rawPositions.reduce((sum, pos) => {
		return sum + (pos.totalValue * pos.asset.ter);
	}, 0);

	const weightedAverageTer = totalCapital > 0 ? totalAnnualCost / totalCapital : 0;

	// Calcular pesos actuales, desviación y objetivos
	const positions: PortfolioPosition[] = rawPositions.map((pos) => {
		const currentWeight = totalCapital > 0 ? pos.totalValue / totalCapital : 0;
		const deviation = currentWeight - pos.asset.targetWeight;
		const targetValue = totalCapital * pos.asset.targetWeight;
		// `targetValue` está en divisa base y `unitPrice` en la del activo, así que
		// el tipo de cambio tiene que entrar aquí para que salgan participaciones.
		const posFxRate = prices[pos.asset.ticker]?.fxRate ?? 1;
		const priceInBase = pos.unitPrice * posFxRate;
		const targetHoldings = priceInBase > 0 ? targetValue / priceInBase : 0;
		
		return {
			...pos,
			currentWeight,
			deviation,
			targetValue,
			targetHoldings
		};
	});

	// Calcular cambios diarios agregados
	const dailyChangeValue = rawPositions.reduce((sum, pos) => sum + pos.dailyChangeValue, 0);

	const dailyChangePercent = totalCapital > 0 ? (dailyChangeValue / totalCapital) : 0;

	// Calcular sparkline de la sección
	const MAX_DAYS = 7;
	const sectionSparkline: number[] = Array(MAX_DAYS).fill(0);
	let sparklineValid = false;

	for (let i = 0; i < MAX_DAYS; i++) {
		let dayValue = 0;
		let hasData = false;
		rawPositions.forEach(pos => {
			const sp = prices[pos.asset.ticker]?.sparkline;
			if (sp && sp.length > 0) {
				const index = sp.length - MAX_DAYS + i;
				const price = index >= 0 ? sp[index] : sp[0];
				// El sparkline viene en la divisa del activo: sin el cambio, una
				// sección con activos en varias divisas sumaría peras con manzanas.
				dayValue += pos.holdings * price * (prices[pos.asset.ticker]?.fxRate ?? 1);
				hasData = true;
			}
		});
		if (hasData) {
			sectionSparkline[i] = dayValue;
			sparklineValid = true;
		}
	}
	const sparkline = sparklineValid ? sectionSparkline.filter(v => v > 0) : undefined;

	return { 
		positions, 
		totalCapital, 
		totalInvested, 
		totalProfit, 
		totalProfitPercent,
		totalAnnualCost,
		weightedAverageTer,
		dailyChangeValue,
		dailyChangePercent,
		sparkline
	};
}

/**
 * De importe a asignación: los tres pasos que hacen falta para convertir euros en una
 * orden de compra, en un solo sitio.
 *
 * ⚠️ Estaban escritos **dos veces** —una en la rama con déficit y otra en la de reparto
 * por pesos— y esa duplicación tenía una consecuencia medible: el mutation testing
 * encontraba los *mismos* mutantes vivos en las dos copias (18 de 47 supervivientes),
 * porque cada test que probaba un camino dejaba el otro sin comprobar. Con una sola
 * versión, los casos de divisa y de redondeo cubren los dos.
 *
 * El tipo de cambio entra aquí porque `unitPrice` está en la divisa del activo y el
 * importe en la divisa base: dividir por el precio sin convertir compra un 8 % más de
 * títulos de los que caben en el dinero aportado, con EURUSD a 1,08.
 */
function asignacionDe(
	position: PortfolioPosition,
	amountToInvest: number,
	newTotalCapital: number,
	prices: Record<string, PriceData>
): RebalanceAllocation {
	const price = position.unitPrice;
	const fxRate = prices[position.asset.ticker]?.fxRate ?? 1;
	const sharesToBuy = price > 0 && fxRate > 0 ? amountToInvest / (price * fxRate) : 0;
	const newValue = position.totalValue + amountToInvest;

	return {
		asset: position.asset,
		amountToInvest: Math.round(amountToInvest * 100) / 100,
		sharesToBuy: Math.round(sharesToBuy * 1000) / 1000, // 3 decimales para fondos
		resultingWeight: newTotalCapital > 0 ? newValue / newTotalCapital : 0
	};
}

/**
 * Calcula cómo distribuir una nueva aportación entre los activos
 * para acercarse lo máximo posible a la distribución objetivo.
 *
 * Algoritmo de flujos de caja:
 * 1. Calcular capital total futuro = actual + aportación
 * 2. Para cada activo: valor objetivo = capital futuro × peso objetivo
 * 3. Déficit = max(0, valor objetivo − valor actual)
 * 4. Distribuir proporcionalmente a los déficits
 * 5. Convertir EUR → participaciones
 */
export function calculateRebalance(
	assets: Asset[],
	holdings: HoldingsMap,
	prices: Record<string, PriceData>,
	contribution: number
): RebalanceResult {
	if (contribution <= 0) {
		return {
			allocations: assets.map((asset) => ({
				asset,
				amountToInvest: 0,
				sharesToBuy: 0,
				resultingWeight: 0
			})),
			totalContribution: 0,
			newTotalCapital: 0
		};
	}

	// Estado actual
	const state = calculatePortfolioState(assets, holdings, prices);
	const newTotalCapital = state.totalCapital + contribution;

	// Calcular déficit de cada activo respecto al objetivo
	const deficits = state.positions.map((pos) => {
		// Si el precio es 0, no podemos comprar, así que el déficit es 0
		if (pos.unitPrice <= 0) return { position: pos, deficit: 0 };
		
		const targetValue = newTotalCapital * pos.asset.targetWeight;
		const deficit = Math.max(0, targetValue - pos.totalValue);
		return { position: pos, deficit };
	});

	const totalDeficit = deficits.reduce((sum, d) => sum + d.deficit, 0);

	// Distribuir la aportación proporcionalmente a los déficits
	let allocations: RebalanceAllocation[];

	if (totalDeficit > 0) {
		// Caso normal: hay déficits
		// Si el déficit total es menor que la aportación, no normalizamos (respetamos el tope de targetWeights)
		// Si el déficit total es mayor, prorrateamos la aportación
		const factor = totalDeficit > contribution ? (contribution / totalDeficit) : 1;

		allocations = deficits.map(({ position, deficit }) =>
			asignacionDe(position, deficit * factor, newTotalCapital, prices)
		);
	} else {
		// Caso especial: no hay déficits
		// Distribuir según pesos objetivo, pero solo entre los que tienen precio > 0
		const validPositions = state.positions.filter(p => p.unitPrice > 0);
		const totalValidWeight = validPositions.reduce((sum, p) => sum + p.asset.targetWeight, 0);

		allocations = state.positions.map((pos) => {
			const amountToInvest =
				pos.unitPrice > 0 && totalValidWeight > 0
					? contribution * (pos.asset.targetWeight / totalValidWeight)
					: 0;

			return asignacionDe(pos, amountToInvest, newTotalCapital, prices);
		});
	}

	return {
		allocations,
		totalContribution: contribution,
		newTotalCapital
	};
}
