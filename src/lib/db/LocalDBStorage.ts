import Dexie, { type Table } from 'dexie';
import type { StorageProvider, UserData, HistoryPoint } from './types';
import type { Transaction } from '$lib/types';
import type { HoldingEdit } from '$lib/history/types';
import { browser } from '$app/environment';

export class CoreBalanceDB extends Dexie {
	userData!: Table<UserData & { id: string }>;
	history!: Table<{ id: string; points: HistoryPoint[] }>;
	transactions!: Table<{ userId: string; items: Transaction[] }>;
	holdingEdits!: Table<{ userId: string; items: HoldingEdit[] }>;

	constructor() {
		super('CoreBalanceDB');
		this.version(1).stores({
			userData: 'id',
			history: 'id'
		});
		this.version(2).stores({
			transactions: 'userId'
		});
		// El log de ediciones sigue el mismo patrón que `transactions`: un
		// documento por usuario con el array completo. Es append-only y se mezcla
		// por id en código, no por número de elementos.
		this.version(3).stores({
			holdingEdits: 'userId'
		});
	}
}

export const localDB = browser ? new CoreBalanceDB() : null;

export class LocalDBStorage implements StorageProvider {
	isLocal = true;

	/**
	 * ⚠️ Ignora `revEsperada` **a propósito**: IndexedDB es de un solo dispositivo, así
	 * que aquí no hay dos escritores y no hay conflicto que detectar. Devuelve `null`
	 * para decir «no llevo contador», que es lo que el store lee como «no hay guarda
	 * que aplicar».
	 */
	async saveUserData(userId: string, data: Partial<UserData>): Promise<number | null> {
		if (!localDB) return null;
		const existing = await localDB.userData.get(userId);

		/**
		 * El orden de este merge es el contrato de la clase: `defaults → existing → data`.
		 * El store autoguarda **parcialmente** (manda sólo lo que ha cambiado), así que con
		 * `...data` antes de `...existing` cada guardado revertiría los campos que no
		 * menciona —la aportación a 0, la cartera a `{}`— sin error en ninguna parte. Los
		 * defaults van delante porque el store itera esas tres listas sin comprobarlas.
		 * El merge es **superficial** a propósito: `holdings` llega entero en cada guardado.
		 */
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
		return null;
	}

	async loadUserData(userId: string): Promise<UserData | null> {
		if (!localDB) return null;
		const data = await localDB.userData.get(userId);
		return data || null;
	}

	async saveTransactions(userId: string, items: Transaction[]): Promise<void> {
		if (!localDB) return;
		await localDB.transactions.put({ userId, items });
	}

	async loadTransactions(userId: string): Promise<Transaction[]> {
		if (!localDB) return [];
		const data = await localDB.transactions.get(userId);
		return data?.items || [];
	}

	async saveHoldingEdits(userId: string, items: HoldingEdit[]): Promise<void> {
		if (!localDB) return;
		await localDB.holdingEdits.put({ userId, items });
	}

	async loadHoldingEdits(userId: string): Promise<HoldingEdit[]> {
		if (!localDB) return [];
		const data = await localDB.holdingEdits.get(userId);
		return data?.items || [];
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
		const transactions = await localDB.transactions.toArray();
		const holdingEdits = await localDB.holdingEdits.toArray();
		return { userData, history, transactions, holdingEdits };
	}

	/**
	 * ⚠️ La guarda era `if (!localDB || !data) return`, así que un objeto **sin nada que
	 * restaurar** vaciaba las cuatro tablas y no ponía nada en su lugar: la restauración de
	 * un respaldo se convertía en el borrado de la cartera, y `SyncModal` recarga la página
	 * 1,5 s después, con lo que el usuario no llega a ver qué ha pasado. No basta con que el
	 * llamante valide —`validateImportData()` da por bueno `{ history: [] }`, y así está
	 * fijado en `utils.test.ts`—: la comprobación tiene que estar donde se hace el daño, que
	 * es aquí. Vaciar no es un caso de uso de esta función; para eso está `deleteAccount()`.
	 */
	async importAllData(data: any): Promise<void> {
		if (!localDB || !data) return;

		const trae = (c: unknown) => Array.isArray(c) && c.length > 0;
		if (!trae(data.userData) && !trae(data.history) && !trae(data.transactions) && !trae(data.holdingEdits)) {
			return;
		}

		await localDB.transaction('rw', localDB.userData, localDB.history, localDB.transactions, localDB.holdingEdits, async () => {
			await localDB.userData.clear();
			await localDB.history.clear();
			await localDB.transactions.clear();
			await localDB.holdingEdits.clear();
			if (data.userData?.length) await localDB.userData.bulkPut(data.userData);
			if (data.history?.length) await localDB.history.bulkPut(data.history);
			if (data.transactions?.length) await localDB.transactions.bulkPut(data.transactions);
			if (data.holdingEdits?.length) await localDB.holdingEdits.bulkPut(data.holdingEdits);
		});
	}

	async deleteAccount(): Promise<void> {
		if (!localDB) return;
		await localDB.transaction('rw', localDB.userData, localDB.history, localDB.transactions, localDB.holdingEdits, async () => {
			await localDB.userData.clear();
			await localDB.history.clear();
			await localDB.transactions.clear();
			await localDB.holdingEdits.clear();
		});
		localStorage.clear();
	}
}
