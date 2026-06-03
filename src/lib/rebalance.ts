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
		const h = data.shares;
		const avg = data.avgCost;
		const pData = prices[asset.ticker];
		const p = pData?.price ?? 0;
		const fxRate = pData?.fxRate ?? 1;
		
		const totalValueBase = h * p * fxRate;
		const isManual = asset.manualInterestRate !== undefined;
		
		const changePercent = asset.manualInterestRate !== undefined ? (asset.manualInterestRate * 100 / 365) : (pData?.change ?? 0);
		const dailyChangeValue = totalValueBase * (changePercent / 100);
		const dailyChangePercent = changePercent / 100;

		const totalValue = isManual ? (totalValueBase + dailyChangeValue) : totalValueBase;
		const totalCost = isManual ? totalValue : h * (avg * fxRate);
		const profit = isManual ? 0 : totalValue - totalCost;
		const profitPercent = isManual ? 0 : (totalCost > 0 ? profit / totalCost : 0);
		
		return { 
			asset, 
			holdings: h, 
			avgCost: avg,
			totalCost,
			unitPrice: p, 
			totalValue,
			profit,
			profitPercent,
			dailyChangeValue,
			dailyChangePercent,
			marketState: pData?.marketState,
			lastUpdate: pData?.lastUpdate,
			ytdChangePercent: asset.manualInterestRate !== undefined ? (asset.manualInterestRate / 1) : (pData?.ytdChangePercent !== undefined ? (pData.ytdChangePercent / 100) : undefined),
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
		const targetHoldings = pos.unitPrice > 0 ? targetValue / pos.unitPrice : 0;
		
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
				dayValue += pos.holdings * price;
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

		allocations = deficits.map(({ position, deficit }) => {
			const amountToInvest = deficit * factor;
			const price = position.unitPrice;
			const fxRate = prices[position.asset.ticker]?.fxRate ?? 1;
			const sharesToBuy = (price > 0 && fxRate > 0) ? amountToInvest / (price * fxRate) : 0;
			const newValue = position.totalValue + amountToInvest;
			const resultingWeight = newTotalCapital > 0 ? newValue / newTotalCapital : 0;

			return {
				asset: position.asset,
				amountToInvest: Math.round(amountToInvest * 100) / 100,
				sharesToBuy: Math.round(sharesToBuy * 1000) / 1000, // 3 decimales para fondos
				resultingWeight
			};
		});
	} else {
		// Caso especial: no hay déficits
		// Distribuir según pesos objetivo, pero solo entre los que tienen precio > 0
		const validPositions = state.positions.filter(p => p.unitPrice > 0);
		const totalValidWeight = validPositions.reduce((sum, p) => sum + p.asset.targetWeight, 0);

		allocations = state.positions.map((pos) => {
			let amountToInvest = 0;
			if (pos.unitPrice > 0 && totalValidWeight > 0) {
				const normalizedWeight = pos.asset.targetWeight / totalValidWeight;
				amountToInvest = contribution * normalizedWeight;
			}
			
			const price = pos.unitPrice;
			const fxRate = prices[pos.asset.ticker]?.fxRate ?? 1;
			const sharesToBuy = (price > 0 && fxRate > 0) ? amountToInvest / (price * fxRate) : 0;
			const newValue = pos.totalValue + amountToInvest;
			const resultingWeight = newTotalCapital > 0 ? newValue / newTotalCapital : 0;

			return {
				asset: pos.asset,
				amountToInvest: Math.round(amountToInvest * 100) / 100,
				sharesToBuy: Math.round(sharesToBuy * 1000) / 1000,
				resultingWeight
			};
		});
	}

	return {
		allocations,
		totalContribution: contribution,
		newTotalCapital
	};
}
