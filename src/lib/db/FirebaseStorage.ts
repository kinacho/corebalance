import type { StorageProvider, UserData, HistoryPoint } from './types';
import type { Transaction } from '$lib/types';
import type { HoldingEdit } from '$lib/history/types';
import { mergeHoldingEdits } from '$lib/history/merge';
import { auth, db, googleProvider } from '$lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, query, orderBy, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';

/**
 * Quita del payload las claves cuyo valor es `undefined`, en profundidad.
 *
 * ⚠️ **Un solo `undefined` en cualquier rincón tumba la escritura entera.** Firestore
 * valida el documento completo antes de mandarlo y lanza `Unsupported field value:
 * undefined`, así que un campo opcional sin resolver no se guarda «a medias»: no se
 * guarda **nada**. Medido en producción el 19-ago-2026 con la cartera real del autor —
 * tres activos sin `indexKey` (dos acciones sueltas y un fondo que `resolveIndexKey()`
 * no reconoce) hacían que `normalizeAssets()` escribiera `indexKey: undefined`, y con
 * eso **`user_data` llevaba semanas sin recibir una sola escritura**: el móvil seguía
 * viendo la cartera vieja mientras el escritorio guardaba en `localStorage` tan
 * ricamente. El error salía por consola y se lo tragaba el `catch`.
 *
 * La limpieza vive **aquí y no en quien llama** por la misma razón que la guarda de
 * `importAllData`: el daño se hace en esta línea, y cualquier camino que traiga un
 * opcional sin rellenar —un `Transaction.notes`, un `HoldingEdit.priceBase`— repetiría
 * el fallo exacto. Que `normalizeAssets()` ya no genere la clave es la segunda defensa,
 * no la primera.
 *
 * Solo se descienden objetos planos y arrays: un `Timestamp`, un `Date` o un centinela
 * como `deleteField()` se copian tal cual, porque reconstruirlos clave a clave los
 * convertiría en un objeto cualquiera.
 */
export function sinIndefinidos<T>(valor: T): T {
	if (Array.isArray(valor)) {
		return valor.filter((v) => v !== undefined).map((v) => sinIndefinidos(v)) as unknown as T;
	}
	if (valor !== null && typeof valor === 'object') {
		const proto = Object.getPrototypeOf(valor);
		if (proto !== Object.prototype && proto !== null) return valor;
		const limpio: Record<string, unknown> = {};
		for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
			if (v === undefined) continue;
			limpio[clave] = sinIndefinidos(v);
		}
		return limpio as unknown as T;
	}
	return valor;
}

export class FirebaseStorage implements StorageProvider {
	isLocal = false;

	/**
	 * ⚠️ **Relanza el error en lugar de tragárselo.** Que un guardado fallido no se
	 * distinga de uno correcto es lo que dejó este defecto vivo: el store tiene el
	 * `catch` que enseña el aviso y reintenta, y sin la excepción nunca se enteraba.
	 * Estando fuera de línea el SDK no rechaza la promesa —encola la escritura—, así
	 * que un rechazo aquí es siempre un fallo de verdad, no una red mala.
	 */
	async saveUserData(userId: string, data: Partial<UserData>): Promise<void> {
		if (!db) return;
		try {
			await setDoc(doc(db, 'user_data', userId), sinIndefinidos(data), { merge: true });
		} catch (e) {
			console.error('Firestore save error:', e);
			throw e;
		}
	}

	async loadUserData(userId: string): Promise<UserData | null> {
		if (!db) return null;
		try {
			const docSnap = await getDoc(doc(db, 'user_data', userId));
			if (docSnap.exists()) {
				return docSnap.data() as UserData;
			}
			return null;
		} catch (e) {
			console.error('Firestore load error:', e);
			return null;
		}
	}

	async saveTransactions(userId: string, items: Transaction[]): Promise<void> {
		if (!db) return;
		try {
			items = sinIndefinidos(items);
			const subcollRef = collection(db, 'user_transactions', userId, 'items');
			const snap = await getDocs(subcollRef);
			const existingDocs = new Map<string, any>();
			snap.forEach(d => {
				existingDocs.set(d.id, d.data());
			});

			const newIds = new Set(items.map(item => item.id));
			const ops: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

			// 1. Delete documents that are no longer in items
			for (const id of existingDocs.keys()) {
				if (!newIds.has(id)) {
					ops.push({ type: 'delete', ref: doc(db, 'user_transactions', userId, 'items', id) });
				}
			}

			// 2. Add or update documents
			for (const item of items) {
				const existing = existingDocs.get(item.id);
				if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
					ops.push({ type: 'set', ref: doc(db, 'user_transactions', userId, 'items', item.id), data: item });
				}
			}

			// Execute in batches of 500
			for (let i = 0; i < ops.length; i += 500) {
				const chunk = ops.slice(i, i + 500);
				const batch = writeBatch(db);
				for (const op of chunk) {
					if (op.type === 'delete') {
						batch.delete(op.ref);
					} else {
						batch.set(op.ref, op.data);
					}
				}
				await batch.commit();
			}
		} catch (e) {
			console.error('Firestore transactions save error:', e);
			throw e;
		}
	}

	/**
	 * ⚠️ Devuelve `null` cuando la lectura falla, nunca `[]`. Ver el contrato en
	 * `StorageProvider.loadTransactions`: aquí es donde una denegación de reglas se
	 * convertía en «no tienes movimientos». `db` ausente sí es `[]`: no hay nube
	 * configurada, así que no hay nada que perder ni ninguna copia que proteger.
	 */
	async loadTransactions(userId: string): Promise<Transaction[] | null> {
		if (!db) return [];
		try {
			const subcollRef = collection(db, 'user_transactions', userId, 'items');
			const q = query(subcollRef, orderBy('date', 'asc'));
			const snap = await getDocs(q);

			if (!snap.empty) {
				const items: Transaction[] = [];
				snap.forEach(d => {
					items.push(d.data() as Transaction);
				});
				return items;
			}

			// Si la subcolección está vacía, comprobar si hay datos en el documento padre (migración)
			const parentSnap = await getDoc(doc(db, 'user_transactions', userId));
			if (parentSnap.exists()) {
				const parentData = parentSnap.data();
				const oldItems = parentData.items || [];
				if (oldItems.length > 0) {
					await this.saveTransactions(userId, oldItems);
					await updateDoc(doc(db, 'user_transactions', userId), { items: deleteField() });
					return oldItems;
				}
			}
			return [];
		} catch (e) {
			console.error('Firestore transactions load error:', e);
			return null;
		}
	}

	async saveHistory(userId: string, points: HistoryPoint[]): Promise<void> {
		if (!db) return;
		try {
			await setDoc(doc(db, 'user_history', userId), { points: sinIndefinidos(points) }, { merge: true });
		} catch (e) {
			console.error('Firestore history save error:', e);
			throw e;
		}
	}

	async loadHistory(userId: string): Promise<HistoryPoint[]> {
		if (!db) return [];
		try {
			const snap = await getDoc(doc(db, 'user_history', userId));
			if (snap.exists()) {
				const data = snap.data();
				return data.points || [];
			}
			return [];
		} catch (e) {
			console.error('Firestore history load error:', e);
			return [];
		}
	}

	/**
	 * Guarda el log de ediciones uniéndolo con lo que haya en la nube.
	 *
	 * A diferencia del resto de la sincronización, aquí no vale last-write-wins:
	 * perder la edición de otro dispositivo (o quedarse con una versión sin
	 * clasificar) se traduce directamente en un escalón falso en el gráfico.
	 */
	async saveHoldingEdits(userId: string, items: HoldingEdit[]): Promise<void> {
		if (!db) return;
		try {
			const remote = await this.loadHoldingEdits(userId);
			const merged = mergeHoldingEdits(items, remote);
			await setDoc(
				doc(db, 'user_holding_edits', userId),
				{ items: sinIndefinidos(merged) },
				{ merge: true }
			);
		} catch (e) {
			console.error('Firestore holding edits save error:', e);
			throw e;
		}
	}

	async loadHoldingEdits(userId: string): Promise<HoldingEdit[]> {
		if (!db) return [];
		try {
			const snap = await getDoc(doc(db, 'user_holding_edits', userId));
			if (snap.exists()) return snap.data().items || [];
			return [];
		} catch (e) {
			console.error('Firestore holding edits load error:', e);
			return [];
		}
	}

	async login(): Promise<void> {
		if (!auth || !googleProvider) return;
		try {
			// Intentar con Popup primero (mejor UX)
			await signInWithPopup(auth, googleProvider);
		} catch (e: any) {
			console.error('Login error:', e);
			
			// Si el navegador bloqueó el popup o hubo un error similar, intentar con Redirect
			if (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request') {
				const { signInWithRedirect } = await import('firebase/auth');
				await signInWithRedirect(auth, googleProvider);
			} else {
				// FIX 5: Reemplazar alert() por throw Error
				throw new Error(e.message);
			}
		}
	}

	async logout(): Promise<void> {
		if (!auth) return;
		try {
			await signOut(auth);
		} catch (e) {
			console.error('Logout error:', e);
		}
	}

	onAuthStateChanged(callback: (user: User | null) => void): (() => void) | void {
		if (!auth) {
			callback(null);
			return () => {};
		}
		return onAuthStateChanged(auth, callback);
	}

	async getAllData(): Promise<any> {
		if (!auth?.currentUser) throw new Error('Debes iniciar sesión para exportar datos.');
		const userId = auth.currentUser.uid;
		const userData = await this.loadUserData(userId);
		const history = await this.loadHistory(userId);
		const transactions = await this.loadTransactions(userId);
		/**
		 * ⚠️ **Un respaldo que miente es peor que un respaldo que falla.** Si el libro
		 * no se ha podido leer, exportar `[]` produce un JSON que dice «no tenías
		 * movimientos» y que, restaurado, borra el libro de verdad — con `importAllData`
		 * escribiendo las cuatro tablas. Mejor que la exportación se caiga: `handleExport`
		 * en `SyncModal.svelte` ya enseña el mensaje del error.
		 */
		if (transactions === null) {
			throw new Error('No se pudo leer tu libro de movimientos, así que el respaldo estaría incompleto. Vuelve a intentarlo.');
		}
		const holdingEdits = await this.loadHoldingEdits(userId);
		return {
			userData: userData ? [{ ...userData, id: userId }] : [],
			history: history.length ? [{ id: userId, points: history }] : [],
			transactions: transactions.length ? [{ userId, items: transactions }] : [],
			holdingEdits: holdingEdits.length ? [{ userId, items: holdingEdits }] : []
		};
	}

	async importAllData(data: any): Promise<void> {
		if (!auth?.currentUser) throw new Error('Debes iniciar sesión para importar datos.');
		const userId = auth.currentUser.uid;
		
		if (data.userData?.[0]) {
			const newUserData = { ...data.userData[0] };
			delete newUserData.id; // Prevent overwriting id
			await this.saveUserData(userId, newUserData);
		}
		if (data.history?.[0]?.points) {
			await this.saveHistory(userId, data.history[0].points);
		}
		if (data.transactions?.[0]?.items) {
			await this.saveTransactions(userId, data.transactions[0].items);
		}
		if (data.holdingEdits?.[0]?.items) {
			await this.saveHoldingEdits(userId, data.holdingEdits[0].items);
		}
	}

	async deleteAccount(): Promise<void> {
		if (!auth?.currentUser || !db) return;
		const user = auth.currentUser;
		const userId = user.uid;
		
		try {
			// 1. Borrar datos de Firestore
			await deleteDoc(doc(db, 'user_data', userId));
			await deleteDoc(doc(db, 'user_history', userId));
			await deleteDoc(doc(db, 'user_holding_edits', userId));

			// Borrar todos los documentos de la subcolección de transacciones
			const subcollRef = collection(db, 'user_transactions', userId, 'items');
			const subcollSnap = await getDocs(subcollRef);
			const deletePromises: Promise<void>[] = [];
			subcollSnap.forEach(d => {
				deletePromises.push(deleteDoc(d.ref));
			});
			await Promise.all(deletePromises);
			
			await deleteDoc(doc(db, 'user_transactions', userId));
			
			// 2. Borrar el usuario de Firebase Auth
			const { deleteUser } = await import('firebase/auth');
			await deleteUser(user);
		} catch (e: any) {
			console.error('Error al eliminar cuenta:', e);
			if (e.code === 'auth/requires-recent-login') {
				throw new Error('Por seguridad, debes haber iniciado sesión recientemente para eliminar tu cuenta. Por favor, cierra sesión y vuelve a entrar.');
			}
			throw e;
		}
	}
}
