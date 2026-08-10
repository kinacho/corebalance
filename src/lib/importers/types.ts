/** Brókeres soportados para importación automática */
export type BrokerId = 'degiro' | 'trading212' | 'interactive_brokers' | 'myinvestor' | 'generic';

/** Roles posibles para una columna de CSV */
export type ColumnRole =
	| 'isin'
	| 'ticker'
	| 'name'
	| 'quantity'
	| 'price'
	| 'currency'
	| 'date'
	| 'type'
	| 'ignored';

/** Análisis detallado de una columna */
export interface ColumnAnalysis {
	index: number;
	header: string;
	normalizedHeader: string;
	sampleValues: string[];
	roleScores: Record<ColumnRole, number>;
}

/** Información del bróker detectado */
export interface BrokerInfo {
	id: BrokerId;
	name: string;
	icon: string;
	confidence: number; // 0-1, confianza en la detección
}

/** Una posición parseada de un CSV de bróker */
export interface ParsedPosition {
	/** ISIN del activo (ej: IE00B4L5Y983) */
	isin: string;
	/** Ticker/Símbolo si el bróker lo incluye (ej: VWCE.DE) */
	ticker?: string;
	/** Nombre del activo tal como aparece en el bróker */
	name: string;
	/** Número de participaciones/acciones */
	shares: number;
	/** Precio medio de compra por unidad (en la divisa original) */
	avgCost: number;
	/** Divisa original del activo (ej: EUR, USD, GBP) */
	currency: string;
}

/** Detalle de una fila omitida durante el parseo */
export interface SkippedDetail {
	/** Número de fila (basado en 1, sin contar cabecera) */
	rowNumber: number;
	/** Dato principal de la fila (nombre del activo o primeros valores) */
	preview: string;
	/** Motivo por el que se omitió la fila */
	reason: string;
}

/** Configuración de mapeo manual de columnas para CSVs genéricos */
export interface MappingConfig {
	isin?: number;
	ticker?: number;
	name?: number;
	shares: number;
	avgCost?: number;
	currency?: number;
	date?: number;
	type?: number;
}

export interface CSVBlock {
	name: string;
	headers: string[];
	rows: string[][];
}

/** Resultado completo de un parseo de importación */
export interface ImportResult {
	/** Bróker detectado */
	broker: BrokerInfo;
	/** Posiciones parseadas correctamente */
	positions: ParsedPosition[];
	/** Avisos y problemas no críticos encontrados */
	warnings: string[];
	/** Número de filas que no se pudieron parsear */
	skippedRows: number;
	/** Detalle de las filas omitidas (motivo por fila) */
	skippedDetails?: SkippedDetail[];
	/** Cabeceras crudas del CSV para previsualización */
	rawHeaders?: string[];
	/** Primeras filas del CSV para previsualización */
	rawRows?: string[][];
	/** Delimitador detectado */
	delimiter?: string;
	/** Bloques detectados (para formatos multi-tabla) */
	blocks?: CSVBlock[];
	/**
	 * Las operaciones tal y como venían en el fichero, cuando el CSV es transaccional.
	 *
	 * ⚠️ **Los parsers ya las construían y las tiraban.** Todos los formatos con fechas
	 * levantan este array para pasarlo por `reduceTransactionsToPositions()` y quedarse
	 * sólo con el resultado consolidado; de `importFromCSV` salían las posiciones y las
	 * fechas se perdían ahí mismo. Y sin fechas no hay libro de operaciones: la cartera
	 * importada nace en modo manual, `fiscal.ts` no puede aplicar FIFO —el panel de IRPF
	 * queda apagado— y la reconstrucción del patrimonio no puede ir hacia atrás, porque
	 * `sharesAt()` no sabe cuántas participaciones había en cada fecha y asume las de hoy.
	 *
	 * Está aquí en el formato del importador (`date` como `Date`, `BUY`/`SELL`); quien las
	 * escriba tiene que convertirlas al `Transaction` de `$lib/types`, que es otro tipo.
	 */
	transactions?: Transaction[];
}

/** Tipo de operación de transacción */
export type TransactionType = 'BUY' | 'SELL';

/** Una transacción individual extraída de un historial de bróker */
export interface Transaction {
	date: Date;
	type: TransactionType;
	isin?: string;
	ticker?: string;
	name: string;
	shares: number;
	price: number;
	currency: string;
}

