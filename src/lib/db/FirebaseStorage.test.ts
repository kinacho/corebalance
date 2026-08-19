import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Qué hace `FirebaseStorage` cuando Firestore dice que no.
 *
 * ⚠️ **La distinción que se fija aquí es `null` frente a `[]`, y no es semántica:
 * es la diferencia entre un respaldo que falla y un respaldo que miente.** Con el
 * `catch` devolviendo `[]`, `getAllData()` exportaba un JSON que afirmaba «no
 * tenías movimientos», y `importAllData()` escribe las cuatro tablas, así que
 * restaurar ese respaldo borra el libro de verdad. El fallo original —las reglas
 * sin cubrir `user_transactions/{uid}/items`— duró meses precisamente porque no se
 * parecía a un error en ningún sitio.
 *
 * Se mockea `firebase/firestore` en lugar de hablar con un emulador: lo que se
 * prueba es la decisión del `catch`, no Firestore.
 */

const stub = vi.hoisted(() => ({
	getDocs: vi.fn(),
	getDoc: vi.fn()
}));

vi.mock('$lib/firebase', () => ({
	auth: { currentUser: { uid: 'u1' } },
	db: {},
	googleProvider: null
}));

vi.mock('firebase/auth', () => ({
	onAuthStateChanged: vi.fn(),
	signInWithPopup: vi.fn(),
	signOut: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
	doc: (...segmentos: unknown[]) => ({ path: segmentos.slice(1).join('/') }),
	collection: (...segmentos: unknown[]) => ({ path: segmentos.slice(1).join('/') }),
	query: (ref: unknown) => ref,
	orderBy: () => ({}),
	getDocs: stub.getDocs,
	getDoc: stub.getDoc,
	setDoc: vi.fn(async () => {}),
	updateDoc: vi.fn(async () => {}),
	deleteDoc: vi.fn(async () => {}),
	deleteField: () => ({}),
	writeBatch: () => ({ set: vi.fn(), delete: vi.fn(), commit: vi.fn(async () => {}) })
}));

import { FirebaseStorage } from './FirebaseStorage';

/** Lo que lanza Firestore cuando la regla no cubre la ruta. */
function denegado(): Error {
	return Object.assign(new Error('Missing or insufficient permissions.'), {
		code: 'permission-denied'
	});
}

/** Un `QuerySnapshot` vacío, que es el «de verdad no hay nada». */
const vacio = { empty: true, forEach: () => {} };

describe('FirebaseStorage · lectura del libro de movimientos', () => {
	const storage = new FirebaseStorage();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('devuelve null cuando Firestore deniega el permiso', async () => {
		stub.getDocs.mockRejectedValue(denegado());

		expect(await storage.loadTransactions('u1')).toBeNull();
	});

	it('devuelve [] cuando la lectura funciona y no hay movimientos', async () => {
		// El otro caso, y el que hace que `null` signifique algo: un usuario nuevo
		// tiene el libro vacío de verdad, y eso no es un fallo del que avisar.
		stub.getDocs.mockResolvedValue(vacio);
		stub.getDoc.mockResolvedValue({ exists: () => false });

		expect(await storage.loadTransactions('u1')).toEqual([]);
	});
});

describe('FirebaseStorage · el respaldo no puede mentir', () => {
	const storage = new FirebaseStorage();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('getAllData falla si el libro no se pudo leer, en vez de exportarlo vacío', async () => {
		stub.getDocs.mockRejectedValue(denegado());
		stub.getDoc.mockResolvedValue({ exists: () => false });

		await expect(storage.getAllData()).rejects.toThrow(/libro de movimientos/);
	});

	it('getAllData exporta con normalidad cuando el libro se lee vacío', async () => {
		// Control: si esto también fallara, la exportación quedaría inservible para
		// cualquiera que no tenga movimientos todavía.
		stub.getDocs.mockResolvedValue(vacio);
		stub.getDoc.mockResolvedValue({ exists: () => false });

		const datos = await storage.getAllData();

		expect(datos.transactions).toEqual([]);
	});
});
