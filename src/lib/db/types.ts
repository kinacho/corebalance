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
	transactions?: Transaction[]; // Opcional para backward compatibility
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
	saveUserData(userId: string, data: Partial<UserData>): Promise<void>;
	loadUserData(userId: string): Promise<UserData | null>;
	
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
