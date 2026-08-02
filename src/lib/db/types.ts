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
	loadTransactions?(userId: string): Promise<Transaction[]>;
	
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
