import Dexie, { type Table } from 'dexie';
import type { StorageProvider, UserData, HistoryPoint } from './types';
import { browser } from '$app/environment';

export class BalanceadorDB extends Dexie {
	userData!: Table<UserData & { id: string }>;
	history!: Table<{ id: string; points: HistoryPoint[] }>;

	constructor() {
		super('BalanceadorDB');
		this.version(1).stores({
			userData: 'id', // Primary key and indexed props
			history: 'id'
		});
	}
}

export const localDB = browser ? new BalanceadorDB() : null;

export class LocalDBStorage implements StorageProvider {
	isLocal = true;

	async saveUserData(userId: string, data: Partial<UserData>): Promise<void> {
		if (!localDB) return;
		const existing = await localDB.userData.get(userId);
		
		// Fill in missing fields with empty defaults if 'existing' is undefined
		const merged = {
			id: userId,
			holdings: {},
			contribution: 0,
			isPrivate: false,
			coreAssets: [],
			satelliteAssets: [],
			stockAssets: [],
			...existing,
			...data
		};
		
		await localDB.userData.put(merged as UserData & { id: string });
	}

	async loadUserData(userId: string): Promise<UserData | null> {
		if (!localDB) return null;
		const data = await localDB.userData.get(userId);
		return data || null;
	}

	async saveHistory(userId: string, points: HistoryPoint[]): Promise<void> {
		if (!localDB) return;
		await localDB.history.put({ id: userId, points });
	}

	async loadHistory(userId: string): Promise<HistoryPoint[]> {
		if (!localDB) return [];
		const data = await localDB.history.get(userId);
		return data?.points || [];
	}

	// For local mode, we don't need real auth. We can simulate a logged-in "local" user.
	async login(): Promise<void> {
		// No-op for local DB
	}

	async logout(): Promise<void> {
		// No-op for local DB
	}

	onAuthStateChanged(callback: (user: any | null) => void): void {
		// Simulate immediate login with a dummy user if in local mode
		if (browser) {
			setTimeout(() => {
				callback({ uid: 'local_user', displayName: 'Local User' });
			}, 0);
		}
	}

	async getAllData(): Promise<any> {
		if (!localDB) return null;
		const userData = await localDB.userData.toArray();
		const history = await localDB.history.toArray();
		return { userData, history };
	}

	async importAllData(data: any): Promise<void> {
		if (!localDB || !data) return;
		await localDB.transaction('rw', localDB.userData, localDB.history, async () => {
			await localDB.userData.clear();
			await localDB.history.clear();
			if (data.userData?.length) await localDB.userData.bulkPut(data.userData);
			if (data.history?.length) await localDB.history.bulkPut(data.history);
		});
	}
}
