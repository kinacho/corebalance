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

/**
 * Tipo de operación de transacción.
 *
 * ⚠️ **Las dos patas de traspaso no son un lujo del modelo: sin ellas una «Traspaso
 * salida» se importaba como `SELL` y realizaba una plusvalía que no existe.** El
 * export de Movimientos de MyInvestor las distingue por su nombre desde siempre, y
 * el parser las aplastaba contra `BUY`/`SELL` — que es la misma familia de defectos
 * que el `transfer` único del store antes de la 1.22.0, una capa más afuera.
 */
export type TransactionType = 'BUY' | 'SELL' | 'TRANSFER_IN' | 'TRANSFER_OUT';

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

	/**
	 * ⚠️ **`true` cuando el fichero no dice la dirección y el parser la ha supuesto.**
	 *
	 * Hay exports —el de **Órdenes** de MyInvestor es el caso medido— cuyas columnas
	 * son `Fecha;ISIN;Importe;Participaciones;Estado` y nada más: **no existe columna
	 * de tipo y todas las cifras van en positivo**, así que un reembolso y una
	 * suscripción son literalmente la misma fila. El parser no puede hacer otra cosa
	 * que suponer compra, y hasta ahora lo hacía en silencio: una salida no solo no
	 * restaba, sumaba, y el error salía al **doble** de lo que se fue.
	 *
	 * Medido contra un fichero real de 14 órdenes con un traspaso dentro: el fondo
	 * quedaba con 1.141,23 participaciones en vez de 1.024,15 y 12.644,48 € en vez de
	 * 11.287,11 €, con `warnings: []` y `skippedRows: 0`. O sea, sin nada que mirar.
	 *
	 * Este campo es lo que convierte esa suposición en algo que la interfaz puede
	 * enseñar y el usuario puede corregir antes de importar. **No se adivina nada:**
	 * el valor por defecto sigue siendo compra, que es el comportamiento de siempre.
	 */
	directionAssumed?: boolean;

	/**
	 * Une las dos patas de un traspaso **dentro de esta importación**.
	 *
	 * Se llena en `direccion.ts` cuando el usuario confirma una pareja, y viaja hasta
	 * el `transferId` del libro. Sin él las dos patas serían dos apuntes sueltos y
	 * borrar uno dejaría la cartera descuadrada en silencio.
	 */
	transferId?: string;
}

