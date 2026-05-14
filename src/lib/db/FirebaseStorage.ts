import type { StorageProvider, UserData, HistoryPoint } from './types';
import { auth, db, googleProvider } from '$lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export class FirebaseStorage implements StorageProvider {
	isLocal = false;

	async saveUserData(userId: string, data: Partial<UserData>): Promise<void> {
		if (!db) return;
		try {
			await setDoc(doc(db, 'user_data', userId), data, { merge: true });
		} catch (e) {
			console.error('Firestore save error:', e);
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

	async saveHistory(userId: string, points: HistoryPoint[]): Promise<void> {
		if (!db) return;
		try {
			await setDoc(doc(db, 'user_history', userId), { points }, { merge: true });
		} catch (e) {
			console.error('Firestore history save error:', e);
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

	async login(): Promise<void> {
		if (!auth) return;
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
				alert(`Error al iniciar sesión: ${e.message}`);
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
		return { 
			userData: userData ? [{ ...userData, id: userId }] : [], 
			history: history.length ? [{ id: userId, points: history }] : [] 
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
	}

	async deleteAccount(): Promise<void> {
		if (!auth?.currentUser || !db) return;
		const user = auth.currentUser;
		const userId = user.uid;
		
		try {
			// 1. Borrar datos de Firestore
			const { deleteDoc, doc } = await import('firebase/firestore');
			await deleteDoc(doc(db, 'user_data', userId));
			await deleteDoc(doc(db, 'user_history', userId));
			
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
