import type { Asset, HoldingsMap } from '$lib/types';

export interface UserData {
	holdings: HoldingsMap;
	contribution: number;
	isPrivate: boolean;
	coreAssets: Asset[];
	satelliteAssets: Asset[];
	stockAssets: Asset[];
	updatedAt?: string;
}

export interface HistoryPoint {
	date: string;
	value: number;
}

export interface StorageProvider {
	isLocal: boolean;
	
	// Data
	saveUserData(userId: string, data: Partial<UserData>): Promise<void>;
	loadUserData(userId: string): Promise<UserData | null>;
	
	// History
	saveHistory(userId: string, points: HistoryPoint[]): Promise<void>;
	loadHistory(userId: string): Promise<HistoryPoint[]>;
	
	// Auth (optional for Local)
	login?(): Promise<any>;
	logout?(): Promise<void>;
	onAuthStateChanged?(callback: (user: any | null) => void): (() => void) | void;
	
	// Export/Import (Local DB mostly)
	getAllData?(): Promise<any>;
	importAllData?(data: any): Promise<void>;
}
