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

const stub = vi.hoisted(() => {
	/**
	 * ⚠️ **El `setDoc` de mentira valida como el de verdad.** Firestore recorre el
	 * documento entero antes de mandarlo y lanza `Unsupported field value: undefined`
	 * por una sola clave sin valor, en cualquier nivel: no se guarda «casi todo», no se
	 * guarda **nada**. Un doble que aceptase cualquier cosa dejaría pasar el defecto que
	 * estos tests fijan, que es precisamente el que estuvo vivo en producción.
	 */
	const tieneIndefinido = (v: unknown): boolean => {
		if (v === undefined) return true;
		if (Array.isArray(v)) return v.some(tieneIndefinido);
		if (v !== null && typeof v === 'object') return Object.values(v).some(tieneIndefinido);
		return false;
	};
	return {
		getDocs: vi.fn(),
		getDoc: vi.fn(),
		batchSet: vi.fn(),
		setDoc: vi.fn(async (ref: { path: string }, datos: unknown) => {
			if (tieneIndefinido(datos)) {
				throw new Error(
					`Function setDoc() called with invalid data. Unsupported field value: undefined (found in document ${ref.path})`
				);
			}
		})
	};
});

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
	setDoc: stub.setDoc,
	updateDoc: vi.fn(async () => {}),
	deleteDoc: vi.fn(async () => {}),
	deleteField: () => ({}),
	writeBatch: () => ({ set: stub.batchSet, delete: vi.fn(), commit: vi.fn(async () => {}) })
}));

import { FirebaseStorage, sinIndefinidos } from './FirebaseStorage';

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

/**
 * El defecto que dejó la sincronización muerta sin que nada se pusiera rojo
 * (19-ago-2026).
 *
 * Medido en la cartera real del autor: tres activos sin `indexKey` —dos acciones
 * sueltas y un fondo que `resolveIndexKey()` no reconoce— hacían que
 * `normalizeAssets()` escribiera la clave con valor `undefined`, y Firestore rechazaba
 * **el documento entero**. Consecuencia: `user_data` dejó de recibir escrituras, el
 * escritorio seguía guardando en `localStorage` tan contento, y el móvil enseñaba una
 * cartera de hace semanas. En consola quedaba un `Firestore save error` que se tragaba
 * el `catch`; en pantalla, nada.
 */
describe('FirebaseStorage · un opcional sin valor no puede tumbar el guardado', () => {
	const storage = new FirebaseStorage();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('el doble de setDoc rechaza un undefined, como el de verdad', async () => {
		// Control: sin esto, los dos tests siguientes pasarían con el defecto puesto.
		await expect(
			stub.setDoc({ path: 'user_data/u1' }, { coreAssets: [{ ticker: 'ASTS', indexKey: undefined }] })
		).rejects.toThrow(/Unsupported field value: undefined/);
	});

	it('guarda la cartera aunque un activo no tenga índice, quitando la clave', async () => {
		await expect(
			storage.saveUserData('u1', {
				contribution: 500,
				coreAssets: [
					{ ticker: 'ASTS', name: 'AST', isin: '', targetWeight: 1, color: '#fff', icon: '📈', ter: 0, category: 'stocks', indexKey: undefined }
				]
			} as never)
		).resolves.toBeUndefined();

		const [, enviado] = stub.setDoc.mock.calls[0];
		expect(Object.keys((enviado as any).coreAssets[0])).not.toContain('indexKey');
		// Y lo que sí tiene valor viaja intacto: limpiar no es adelgazar el documento.
		expect((enviado as any).contribution).toBe(500);
	});

	it('el libro de movimientos también se limpia antes de subir', async () => {
		stub.getDocs.mockResolvedValue({ forEach: () => {} });

		await storage.saveTransactions('u1', [
			{ id: 't1', ticker: 'ASTS', type: 'buy', date: 1, shares: 1, price: 2, currency: 'EUR', fees: 0, fxRate: 1, notes: undefined }
		] as never);

		const [, enviado] = stub.batchSet.mock.calls[0];
		expect(Object.keys(enviado as object)).not.toContain('notes');
	});

	it('relanza el fallo en vez de tragárselo, que es lo que lo mantuvo invisible', async () => {
		// El store tiene el `catch` que avisa y reintenta; sin la excepción nunca se
		// enteraba de que la escritura no había ocurrido.
		stub.setDoc.mockRejectedValueOnce(denegado());

		await expect(storage.saveUserData('u1', { contribution: 1 })).rejects.toThrow(/permissions/);
	});

	it('no reconstruye lo que no es un objeto plano', async () => {
		// Un Timestamp, un Date o un centinela como deleteField() dejarían de serlo si
		// se copiaran clave a clave.
		const fecha = new Date('2026-08-19T00:00:00.000Z');
		expect(sinIndefinidos({ fecha }).fecha).toBe(fecha);
	});
});
