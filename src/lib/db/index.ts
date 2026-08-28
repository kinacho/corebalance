import { PUBLIC_USE_FIREBASE } from '$env/static/public';
import type { StorageProvider, UserData, HistoryPoint } from './types';
import type { Transaction } from '$lib/types';
import type { HoldingEdit } from '$lib/history/types';

class LazyStorageProvider implements StorageProvider {
	/**
	 * Una sola memorización, y antes había dos.
	 *
	 * ⚠️ Había también un campo `provider` con su propia guarda de salida temprana, y las
	 * dos se solapaban: cada una bastaba por sí sola, así que **romper cualquiera de ellas
	 * no cambiaba el comportamiento** y ningún test podía notarlo. Con una, «el backend se
	 * construye una sola vez» vuelve a ser una afirmación comprobable.
	 *
	 * Memorizar la promesa y no la instancia tiene además la propiedad que hace falta: dos
	 * llamadas concurrentes antes de que resuelva el `import()` comparten la misma carga en
	 * vez de construir dos backends.
	 */
	private providerPromise: Promise<StorageProvider> | null = null;

	get isLocal(): boolean {
		return PUBLIC_USE_FIREBASE !== 'true';
	}

	private getProvider(): Promise<StorageProvider> {
		if (!this.providerPromise) {
			this.providerPromise = (async () => {
				if (PUBLIC_USE_FIREBASE === 'true') {
					const { FirebaseStorage } = await import('./FirebaseStorage');
					return new FirebaseStorage();
				}
				const { LocalDBStorage } = await import('./LocalDBStorage');
				return new LocalDBStorage();
			})();
		}
		return this.providerPromise;
	}

	async saveUserData(
		userId: string,
		data: Partial<UserData>,
		opciones?: { revEsperada?: number | null }
	): Promise<number | null> {
		const p = await this.getProvider();
		return p.saveUserData(userId, data, opciones);
	}

	/**
	 * ⚠️ Devuelve la baja **de forma síncrona** aunque el proveedor se resuelva después:
	 * quien se suscribe necesita poder cancelar sin esperar, y una promesa aquí obligaría
	 * a todos los que llaman a guardar un `await` que en un `onDestroy` no existe. Si la
	 * baja llega antes que el proveedor, se anota y la suscripción se cierra en cuanto se
	 * abre — sin eso quedaría una escucha viva sobre un usuario que ya cerró sesión.
	 */
	subscribeUserData(userId: string, alCambiar: (data: UserData) => void): () => void {
		let bajaReal: (() => void) | null = null;
		let cancelado = false;
		this.getProvider().then((p) => {
			if (cancelado || !p.subscribeUserData) return;
			bajaReal = p.subscribeUserData(userId, alCambiar);
			if (cancelado) bajaReal();
		});
		return () => {
			cancelado = true;
			if (bajaReal) bajaReal();
		};
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

	/** `null` propagado tal cual: es «no se pudo leer», no «no hay nada». */
	async loadTransactions(userId: string): Promise<Transaction[] | null> {
		const p = await this.getProvider();
		if (p.loadTransactions) {
			return p.loadTransactions(userId);
		}
		// Un backend sin libro de movimientos no es un fallo de lectura.
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
