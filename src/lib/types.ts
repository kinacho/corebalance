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

/**
 * Lo que cambia una vez al trimestre, no cada 30 segundos.
 *
 * ⚠️ Vive en su propia respuesta y **no dentro de `PriceData`** a propósito: esa
 * viaja en el sondeo cada medio minuto, y meter aquí datos trimestrales es el
 * error que `priceHelpers.ts` documenta haber corregido con el sparkline. Ver
 * `/api/fundamentals`.
 */
export interface FundamentalData {
	/** Falso cuando la fuente no cubre el activo — los fondos solo de FT, por ejemplo. */
	disponible: boolean;
	/** Milisegundos. `null` para fondos y ETF: no presentan resultados. */
	proximosResultados?: number | null;
	/** Yahoo declara ±2 días de error en esa fecha. */
	resultadosEsAproximado?: boolean;
	/** Dividendo anual por participación, en la divisa del activo. */
	dividendoAnual?: number | null;
	/** Fracción 0–1, normalizada: la fuente lo da unas veces en % y otras en tanto por uno. */
	rentabilidadPorDividendo?: number | null;
	/** Milisegundos del último pago conocido. */
	ultimoDividendo?: number | null;
	/** Rentabilidad a tres meses, tal cual la publica la fuente. */
	rentabilidadTresMeses?: number | null;
}

export interface FundamentalsResponse {
	fundamentals: Record<string, FundamentalData>;
	error?: string;
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
	/**
	 * Tienes participaciones y **no hay cotización con la que valorarlas**.
	 *
	 * ⚠️ No es lo mismo que valer cero: es no saber cuánto vale. La diferencia importa
	 * porque `totalValue` sí es 0 —no se puede inventar un precio— y con eso
	 * `totalValue − totalCost` da exactamente **menos todo lo aportado**, o sea una
	 * pérdida del 100 % fabricada por la resta. Marcarlo es lo que permite dejar la
	 * posición fuera de los agregados en vez de contaminarlos.
	 */
	priceMissing?: boolean;
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
	/**
	 * Lo que ha quedado **fuera** de las cifras de arriba por no tener cotización, y
	 * el coste que representa. Ausente cuando no hay nada fuera.
	 *
	 * Mismo criterio que `uncoveredValue` en el análisis de subyacentes: las cifras
	 * hablan de lo que se ha podido medir y lo que no cabe se declara, en vez de
	 * colarse dentro con un cero que se lee como un dato.
	 */
	unpriced?: { count: number; cost: number };
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

/**
 * ⚠️ **`'transfer'` es un alias retrocompatible de `'transfer_in'`, no un tipo
 * que se pueda elegir: conserva la semántica que ya tenía.**
 *
 * Hasta la 1.21.0 el único tipo de traspaso era `'transfer'` y en `ledger.ts` y
 * `fiscal.ts` se comportaba **exactamente como una compra**, así que solo podía
 * registrar la pata de entrada — y quien elegía «Traspaso» en el fondo de
 * *origen*, que es lo que dice el rótulo, **aumentaba** su posición. No había
 * forma de apuntar la salida.
 *
 * Se parte en dos porque un traspaso son dos hechos con dos efectos contrarios.
 * El alias se queda porque hay carteras guardadas que lo usan y las
 * transacciones entran al store por **tres** caminos distintos —
 * `loadFromStorage()`, la rama de Firestore y el QR de `applyIncomingSync` —: un
 * normalizador tendría que entrar en los tres o dejaría fuera precisamente a
 * quien viene de la nube, que es la trampa que ya obligó a llamar a
 * `normalizeAssets()` en dos sitios. El alias no necesita migración ninguna.
 *
 * ⚠️ **Y se lee siempre por `esEntradaDeTraspaso` / `esSalidaDeTraspaso`, nunca
 * comparando la cadena a mano.** Cuatro sitios distintos deciden sobre esto
 * (`ledger.ts`, dos veces en `fiscal.ts`, el modal), que es exactamente el
 * reparto con el que `ft-assets.ts` acabó implementado cuatro veces y roto en la
 * copia que importaba.
 */
export type TransactionType =
	| 'buy'
	| 'sell'
	| 'dividend'
	| 'transfer_in'
	| 'transfer_out'
	/** @deprecated Alias de `transfer_in` para las carteras guardadas antes de la 1.22.0. */
	| 'transfer'
	| 'initial_balance';

/** Una entrada de traspaso: suma participaciones, y puede traer coste heredado. */
export function esEntradaDeTraspaso(type: TransactionType): boolean {
	return type === 'transfer_in' || type === 'transfer';
}

/** Una salida de traspaso: resta participaciones sin realizar plusvalía. */
export function esSalidaDeTraspaso(type: TransactionType): boolean {
	return type === 'transfer_out';
}

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

	/**
	 * Une las dos patas de un mismo traspaso. Sin esto, borrar una deja la cartera
	 * descuadrada en silencio: desaparecen las participaciones de un lado y se
	 * quedan las del otro, sin que nada lo diga.
	 */
	transferId?: string;

	/**
	 * ⚠️ **El coste de adquisición que **viaja** en un traspaso, en divisa base, y
	 * es la razón de ser de todo esto.**
	 *
	 * En un traspaso entre fondos el valor **y la fecha** de adquisición de las
	 * participaciones originales pasan al fondo nuevo (art. 94 LIRPF): el
	 * diferimiento no es que no pagues, es que pagas *después* sobre la ganancia
	 * de siempre. Sin este campo la pata de entrada crea un lote FIFO al precio
	 * del día y la plusvalía latente **desaparece del libro**, lo que hacía que la
	 * ficha del fondo destino declarase «plusvalía 0 € · impuesto 0 €» justo
	 * después de un traspaso — un número falso, no una ausencia de número.
	 *
	 * Solo en la pata de entrada. Ausente en las filas anteriores a la 1.22.0, y
	 * entonces se mantiene el comportamiento viejo: es lo que hace seguro el alias.
	 */
	carriedCostBase?: number;

	/** La fecha de adquisición heredada: sin ella la ventana antiaplicación se reinicia. */
	carriedLotDate?: number;
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
