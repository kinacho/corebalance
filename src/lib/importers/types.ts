/** Brókeres soportados para importación automática */
export type BrokerId = 'degiro' | 'trading212' | 'interactive_brokers' | 'myinvestor' | 'generic';

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
}
