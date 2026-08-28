import type { Asset, HoldingsMap, Transaction } from '$lib/types';
import type { HoldingEdit } from '$lib/history/types';

export interface UserData {
	holdings: HoldingsMap;
	contribution: number;
	isPrivate: boolean;
	coreAssets: Asset[];
	satelliteAssets: Asset[];
	stockAssets: Asset[];
	updatedAt?: string;
	/**
	 * Contador de revisión del documento, que sube de uno en uno con cada escritura.
	 *
	 * ⚠️ **Existe porque comparar `updatedAt` es comparar los relojes de dos móviles
	 * distintos.** Cada dispositivo escribía esa marca con su propia hora, así que uno
	 * adelantado un minuto ganaba el desempate llevando datos viejos. Un contador no
	 * tiene ese problema: no mide tiempo, mide **cuántas escrituras ha visto el
	 * documento**, y de eso solo hay una versión — la del servidor.
	 *
	 * Se usa como *compare-and-set*: quien escribe dice qué revisión creía tener y la
	 * escritura se rechaza si entretanto ha cambiado. Ausente en los documentos
	 * guardados antes de la 1.23.2, y entonces la guarda no aplica: la primera
	 * escritura lo estrena.
	 */
	rev?: number;
	transactions?: Transaction[]; // Opcional para backward compatibility
}

/**
 * La escritura se rechazó porque la nube había cambiado desde la última lectura.
 *
 * ⚠️ **No es un error de red ni algo que reintentar a ciegas: reintentar es
 * exactamente lo que causó la pérdida de datos.** Significa que otro dispositivo
 * escribió en medio, así que quien la reciba tiene que **releer y reconciliar**, no
 * volver a mandar lo suyo.
 */
export class ConflictoDeSincronizacion extends Error {
	/** La revisión que hay ahora mismo en la nube. */
	readonly revActual: number | null;
	constructor(revActual: number | null) {
		super(`La nube cambió desde la última lectura (rev ${revActual}).`);
		this.name = 'ConflictoDeSincronizacion';
		this.revActual = revActual;
	}
}

export interface HistoryPoint {
	date: string;
	/**
	 * Patrimonio total del día. Conserva el nombre `value` por compatibilidad con
	 * los puntos que ya están guardados.
	 */
	value: number;
	/**
	 * Desglose por categoría y flujo neto del día. Ausentes en los puntos que
	 * guardaron versiones anteriores: sin ellos el gráfico corta las líneas por
	 * categoría en vez de inventárselas.
	 */
	core?: number;
	satellite?: number;
	stocks?: number;
	netFlow?: number;
}

export interface StorageProvider {
	isLocal: boolean;
	
	// Data
	/**
	 * Escribe el documento del usuario y devuelve la revisión resultante.
	 *
	 * ⚠️ Con `revEsperada` la escritura es **condicional**: se rechaza con
	 * `ConflictoDeSincronizacion` si la nube ya no está en esa revisión. Sin ella
	 * pisa, que es el comportamiento de siempre y el que sigue necesitando la
	 * exportación/importación. Ver `rev` en `UserData`.
	 */
	saveUserData(
		userId: string,
		data: Partial<UserData>,
		opciones?: { revEsperada?: number | null }
	): Promise<number | null>;
	loadUserData(userId: string): Promise<UserData | null>;
	/**
	 * Escucha el documento del usuario y avisa de **los cambios que vienen de fuera**.
	 *
	 * ⚠️ **Es la mitad que faltaba y sin ella la otra no basta.** `loadFromCloud()` solo
	 * se llamaba al resolver la sesión, así que una pestaña ya abierta **no volvía a leer
	 * la nube nunca**: enseñaba lo de hace horas y, en cuanto guardaba cualquier cosa,
	 * subía ese estado viejo encima del bueno. La guarda de revisión evita que lo pise;
	 * esto es lo que hace que además se entere.
	 *
	 * El eco de las escrituras propias no se notifica — sin eso, cada guardado se
	 * reaplicaría a sí mismo.
	 */
	subscribeUserData?(userId: string, alCambiar: (data: UserData) => void): () => void;
	
	// Transactions (Ledger)
	saveTransactions?(userId: string, transactions: Transaction[]): Promise<void>;
	/**
	 * El libro de movimientos, o `null` si **no se ha podido saber**.
	 *
	 * ⚠️ **`null` y `[]` son dos respuestas distintas y confundirlas cuesta dinero.**
	 * `[]` es «este usuario no tiene movimientos»; `null` es «la lectura falló» —una
	 * denegación de reglas, la red caída— y el que llama debe entonces **conservar la
	 * copia local y decirlo**, en lugar de tomarla por vacía. Devolver `[]` en el
	 * `catch` es lo que hacía que un `Missing or insufficient permissions` de Firestore
	 * se leyera como un libro vacío: en un navegador sin copia local, el coste medio,
	 * el TWR y el panel fiscal se calculaban sobre nada sin un solo error a la vista, y
	 * un respaldo exportado en ese estado afirmaba que no había movimientos.
	 */
	loadTransactions?(userId: string): Promise<Transaction[] | null>;
	
	// History
	saveHistory(userId: string, points: HistoryPoint[]): Promise<void>;
	loadHistory(userId: string): Promise<HistoryPoint[]>;

	// Log de ediciones manuales de participaciones
	saveHoldingEdits?(userId: string, edits: HoldingEdit[]): Promise<void>;
	loadHoldingEdits?(userId: string): Promise<HoldingEdit[]>;
	
	// Auth (optional for Local)
	login?(): Promise<any>;
	logout?(): Promise<void>;
	onAuthStateChanged?(callback: (user: any | null) => void): (() => void) | void;
	
	// Export/Import (Local DB mostly)
	getAllData?(): Promise<any>;
	importAllData?(data: any): Promise<void>;
	
	// Delete Account
	deleteAccount?(): Promise<void>;
}
