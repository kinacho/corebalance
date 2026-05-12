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
			await signInWithPopup(auth, googleProvider);
		} catch (e) {
			console.error('Login error:', e);
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
}
