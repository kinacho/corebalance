import { PUBLIC_USE_FIREBASE } from '$env/static/public';
import type { StorageProvider, UserData, HistoryPoint } from './types';
import type { Transaction } from '$lib/types';
import type { HoldingEdit } from '$lib/history/types';

class LazyStorageProvider implements StorageProvider {
	private providerPromise: Promise<StorageProvider> | null = null;
	private provider: StorageProvider | null = null;

	get isLocal(): boolean {
		return PUBLIC_USE_FIREBASE !== 'true';
	}

	private async getProvider(): Promise<StorageProvider> {
		if (this.provider) return this.provider;
		if (!this.providerPromise) {
			this.providerPromise = (async () => {
				if (PUBLIC_USE_FIREBASE === 'true') {
					const { FirebaseStorage } = await import('./FirebaseStorage');
					this.provider = new FirebaseStorage();
				} else {
					const { LocalDBStorage } = await import('./LocalDBStorage');
					this.provider = new LocalDBStorage();
				}
				return this.provider;
			})();
		}
		return this.providerPromise;
	}

	async saveUserData(userId: string, data: Partial<UserData>): Promise<void> {
		const p = await this.getProvider();
		return p.saveUserData(userId, data);
	}

	async loadUserData(userId: string): Promise<UserData | null> {
		const p = await this.getProvider();
		return p.loadUserData(userId);
	}

	async saveTransactions(userId: string, transactions: Transaction[]): Promise<void> {
		const p = await this.getProvider();
		if (p.saveTransactions) {
			return p.saveTransactions(userId, transactions);
		}
	}

	async loadTransactions(userId: string): Promise<Transaction[]> {
		const p = await this.getProvider();
		if (p.loadTransactions) {
			return p.loadTransactions(userId);
		}
		return [];
	}

	async saveHistory(userId: string, points: HistoryPoint[]): Promise<void> {
		const p = await this.getProvider();
		return p.saveHistory(userId, points);
	}

	async loadHistory(userId: string): Promise<HistoryPoint[]> {
		const p = await this.getProvider();
		return p.loadHistory(userId);
	}

	async saveHoldingEdits(userId: string, edits: HoldingEdit[]): Promise<void> {
		const p = await this.getProvider();
		if (p.saveHoldingEdits) return p.saveHoldingEdits(userId, edits);
	}

	async loadHoldingEdits(userId: string): Promise<HoldingEdit[]> {
		const p = await this.getProvider();
		if (p.loadHoldingEdits) return p.loadHoldingEdits(userId);
		return [];
	}

	async login(): Promise<any> {
		const p = await this.getProvider();
		if (p.login) return p.login();
	}

	async logout(): Promise<void> {
		const p = await this.getProvider();
		if (p.logout) return p.logout();
	}

	onAuthStateChanged(callback: (user: any | null) => void): (() => void) | void {
		let unsubscribe: (() => void) | void = undefined;
		let cancelled = false;

		this.getProvider().then(p => {
			if (cancelled) return;
			if (p.onAuthStateChanged) {
				unsubscribe = p.onAuthStateChanged(callback);
			} else {
				// Simulate auth for local DB if not defined
				callback(null);
			}
		});

		return () => {
			cancelled = true;
			if (unsubscribe) unsubscribe();
		};
	}

	async getAllData(): Promise<any> {
		const p = await this.getProvider();
		if (p.getAllData) return p.getAllData();
		return null;
	}

	async importAllData(data: any): Promise<void> {
		const p = await this.getProvider();
		if (p.importAllData) return p.importAllData(data);
	}

	async deleteAccount(): Promise<void> {
		const p = await this.getProvider();
		if (p.deleteAccount) return p.deleteAccount();
	}
}

export const storageProvider: StorageProvider = new LazyStorageProvider();
