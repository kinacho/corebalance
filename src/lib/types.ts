/** Categoría de un activo dentro de la cartera del usuario */
export type AssetCategory = 'core' | 'satellite' | 'stocks';

/**
 * Tipo de instrumento. Es distinto de `AssetCategory`: la categoría es la
 * *estrategia* del usuario (core/satélite/acciones) y esto es *qué es* el activo,
 * que en España decide el trato fiscal.
 *
 * La distinción que importa es `fund` vs el resto: solo los fondos de inversión
 * admiten traspaso con diferimiento fiscal (art. 94 LIRPF). Los ETF, aunque
 * inviertan en lo mismo, están fuera de ese régimen y tributan al vender.
 */
export type InstrumentType = 'fund' | 'etf' | 'equity' | 'cash' | 'other';

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
	manualInterestRate?: number; // Rentabilidad anual manual (ej: 0.03 para 3%) para activos tipo "Cash"
	/**
	 * Opcional porque las carteras guardadas antes de que esto existiera no lo
	 * traen. `resolveInstrumentType()` lo deduce, y la migración de
	 * `loadFromStorage` lo rellena. Nunca leerlo directamente sin pasar por
	 * `instrumentTypeOf()`.
	 */
	instrumentType?: InstrumentType;
	/**
	 * Clave del índice que replica, para el mapa del subyacente. La resuelve
	 * `resolveIndexKey()`; el usuario puede corregirla a mano.
	 */
	indexKey?: string;
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
	fxRate?: number;     // Multiplicador para convertir de divisa del activo a divisa base (baseCurrency)
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
	avgCost: number;        // Precio medio de compra, en la divisa del activo
	totalCost: number;      // holdings * avgCost * fxRate, en divisa base
	unitPrice: number;      // Precio unitario actual, en la divisa del activo
	totalValue: number;     // holdings * unitPrice * fxRate, en divisa base
	currentWeight: number;  // totalValue / capitalTotal
	deviation: number;      // currentWeight - targetWeight
	targetValue: number;    // capitalTotal * targetWeight, en divisa base
	targetHoldings: number; // targetValue / (unitPrice * fxRate)
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

export type TransactionType = 'buy' | 'sell' | 'dividend' | 'transfer' | 'initial_balance';

export interface Transaction {
	id: string;
	ticker: string;
	type: TransactionType;
	date: number; // Unix timestamp
	shares: number;
	price: number; // Unit price in transaction currency
	currency: string;
	fees: number;
	fxRate: number; // Rate to base currency at time of transaction
	notes?: string;
}

/** Datos de un activo guardados en localStorage */
export interface HoldingData {
	shares: number;
	avgCost: number;
	totalCostBase?: number; // Coste total exacto en la divisa base (EUR) precalculado desde el Ledger
	useLedger?: boolean; // Si es true, ignora estos campos y usa el historial de transacciones
	accruedInterest?: number; // Intereses acumulados desde las transacciones del Ledger
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
