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

/** Configuración de mapeo manual de columnas para CSVs genéricos */
export interface MappingConfig {
	isin?: number;
	ticker?: number;
	name?: number;
	shares: number;
	avgCost?: number;
	currency?: number;
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
	/** Cabeceras crudas del CSV para previsualización */
	rawHeaders?: string[];
	/** Primeras filas del CSV para previsualización */
	rawRows?: string[][];
	/** Delimitador detectado */
	delimiter?: string;
}
