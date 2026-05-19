/** Categoría de un activo dentro de la cartera del usuario */
export type AssetCategory = 'core' | 'satellite' | 'stocks';

/** Definición de un activo de la cartera */
export interface Asset {
	ticker: string;
	name: string;
	isin: string;
	targetWeight: number; // 0.90, 0.05, 0.05
	color: string; // Color para gráficos
	icon: string; // Emoji del activo
	ter: number; // Total Expense Ratio (0.01 = 1%)
	category: AssetCategory; // Categoría a la que pertenece
}


/** Datos de precio obtenidos de la API */
export interface PriceData {
	price: number;
	currency: string;
	name: string;
	change: number;      // Cambio porcentual diario
	sparkline?: number[]; // Precios de los últimos 7 días
	marketState?: string; // REGULAR, CLOSED, PRE, POST, etc.
	lastUpdate?: number;  // Unix timestamp de la última cotización
	ytdChangePercent?: number; // Cambio Year-To-Date
	mtdChangePercent?: number; // Cambio Month-To-Date
	oneMonthChangePercent?: number; // Cambio últimos 30 días
	ter?: number;        // Total Expense Ratio (0.01 = 1%)
}

/** Respuesta del endpoint /api/prices */
export interface PricesResponse {
	prices: Record<string, PriceData>;
	timestamp: string;
	errors: string[];
}

/** Posición individual en la cartera */
export interface PortfolioPosition {
	asset: Asset;
	holdings: number;       // Participaciones poseídas
	avgCost: number;        // Precio medio de compra
	totalCost: number;      // holdings * avgCost
	unitPrice: number;      // Precio unitario actual
	totalValue: number;     // holdings * unitPrice
	currentWeight: number;  // totalValue / capitalTotal
	deviation: number;      // currentWeight - targetWeight
	targetValue: number;    // capitalTotal * targetWeight
	targetHoldings: number; // targetValue / unitPrice
	profit: number;         // totalValue - totalCost
	profitPercent: number;  // profit / totalCost
	dailyChangeValue: number; // Cambio diario en valor absoluto
	dailyChangePercent: number; // Cambio diario porcentual
	marketState?: string;
	lastUpdate?: number;
	ytdChangePercent?: number;
	mtdChangePercent?: number;
	oneMonthChangePercent?: number;
	sparkline?: number[];
}

/** Estado completo de la cartera */
export interface PortfolioState {
	positions: PortfolioPosition[];
	totalCapital: number;
	totalInvested: number;
	totalProfit: number;
	totalProfitPercent: number;
	totalAnnualCost: number;
	weightedAverageTer: number;
	dailyChangeValue: number;
	dailyChangePercent: number;
	sparkline?: number[];
}

/** Resultado del cálculo de rebalanceo */
export interface RebalanceAllocation {
	asset: Asset;
	amountToInvest: number;    // EUR a invertir
	sharesToBuy: number;       // Participaciones a comprar
	resultingWeight: number;   // Peso resultante tras aportación
}

export interface RebalanceResult {
	allocations: RebalanceAllocation[];
	totalContribution: number;
	newTotalCapital: number;
}

/** Datos de un activo guardados en localStorage */
export interface HoldingData {
	shares: number;
	avgCost: number;
}

/** Holdings almacenados en localStorage */
export type HoldingsMap = Record<string, HoldingData>;

/** Resultado de búsqueda de Yahoo Finance */
export interface SearchResult {
	ticker: string;
	name: string;
	type: string;
	exchange: string;
	currency?: string;
}
