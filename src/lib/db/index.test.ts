import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { StorageProvider } from './types';

/**
 * `LazyStorageProvider`: quién guarda los datos y qué pasa cuando el backend elegido no
 * sabe hacer algo.
 *
 * Es un envoltorio de 125 líneas sin ninguna prueba, y tiene dos responsabilidades con
 * consecuencias visibles: **elegir backend a partir de una variable de entorno de build**
 * —local o Firestore— y **degradar sin romper** cuando el backend no implementa un método
 * opcional. Si `loadTransactions()` lanzara en vez de devolver una lista vacía, el
 * dashboard de quien usa el modo local se quedaría en blanco al arrancar.
 *
 * Cada caso reimporta el módulo: la elección de backend se memoriza en la instancia, que
 * es justo lo que hay que comprobar, así que no vale reutilizarla entre tests.
 */

/** Un backend mínimo, con solo lo obligatorio del contrato. */
function backendPelado() {
	return {
		saveUserData: vi.fn(async () => {}),
		loadUserData: vi.fn(async () => null),
		saveHistory: vi.fn(async () => {}),
		loadHistory: vi.fn(async () => [])
	} as unknown as StorageProvider;
}

async function cargarProvider(usarFirebase: string, backend: StorageProvider, contador?: { veces: number }) {
	vi.resetModules();
	vi.doMock('$env/static/public', () => ({ PUBLIC_USE_FIREBASE: usarFirebase }));
	vi.doMock('./LocalDBStorage', () => ({
		LocalDBStorage: class {
			constructor() {
				if (contador) contador.veces++;
				Object.assign(this, backend);
			}
		}
	}));
	vi.doMock('./FirebaseStorage', () => ({
		FirebaseStorage: class {
			constructor() {
				if (contador) contador.veces++;
				Object.assign(this, backend);
			}
		}
	}));
	const { storageProvider } = await import('./index');
	return storageProvider;
}

describe('LazyStorageProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('elección de backend', () => {
		it('sin `PUBLIC_USE_FIREBASE === "true"` usa el almacenamiento local', async () => {
			const provider = await cargarProvider('false', backendPelado());
			expect(provider.isLocal).toBe(true);
		});

		it('la cadena vacía también es local: solo el "true" exacto activa Firebase', async () => {
			// Es una variable de build que llega como texto; cualquier otro valor —vacío, "1",
			// "TRUE"— tiene que caer del lado seguro, que es el que no manda datos fuera.
			for (const valor of ['', '1', 'TRUE', 'yes']) {
				const provider = await cargarProvider(valor, backendPelado());
				expect(provider.isLocal, `con «${valor}» debería ser local`).toBe(true);
			}
		});

		it('con "true" exacto usa Firebase', async () => {
			const provider = await cargarProvider('true', backendPelado());
			expect(provider.isLocal).toBe(false);
		});

		it('el backend se construye una sola vez, por muchas llamadas que haya', async () => {
			// Memorizar importa: cada construcción de `FirebaseStorage` abre su propia
			// conexión, y el módulo se importa de forma diferida a propósito para no cargar
			// Firebase en quien no lo usa.
			const contador = { veces: 0 };
			const provider = await cargarProvider('false', backendPelado(), contador);

			await provider.loadUserData('u1');
			await provider.loadUserData('u1');
			await provider.loadHistory('u1');

			expect(contador.veces).toBe(1);
		});

		it('no construye nada hasta la primera operación', async () => {
			// `isLocal` se resuelve con la variable de entorno, sin tocar el backend: leerlo
			// no debe arrastrar el chunk de Firebase.
			const contador = { veces: 0 };
			const provider = await cargarProvider('true', backendPelado(), contador);

			expect(provider.isLocal).toBe(false);
			expect(contador.veces).toBe(0);
		});
	});

	describe('degradación cuando el backend no implementa algo', () => {
		it('`loadTransactions` devuelve lista vacía en vez de lanzar', async () => {
			// El caso que dejaría el dashboard en blanco al arrancar.
			const provider = await cargarProvider('false', backendPelado());
			await expect(provider.loadTransactions!('u1')).resolves.toEqual([]);
		});

		it('`loadHoldingEdits` también', async () => {
			const provider = await cargarProvider('false', backendPelado());
			await expect(provider.loadHoldingEdits!('u1')).resolves.toEqual([]);
		});

		it('los guardados opcionales no revientan: se ignoran en silencio', async () => {
			// Silencio deliberado: un backend que no guarda transacciones no es un error, es
			// un backend más simple. Lo que no puede es tumbar la operación de guardado.
			const provider = await cargarProvider('false', backendPelado());
			await expect(provider.saveTransactions!('u1', [])).resolves.toBeUndefined();
			await expect(provider.saveHoldingEdits!('u1', [])).resolves.toBeUndefined();
		});

		it('`getAllData` devuelve null y `deleteAccount` no lanza', async () => {
			const provider = await cargarProvider('false', backendPelado());
			await expect(provider.getAllData!()).resolves.toBeNull();
			await expect(provider.deleteAccount!()).resolves.toBeUndefined();
		});
	});

	describe('autenticación', () => {
		it('un backend sin auth avisa con `null`, que es «no hay sesión»', async () => {
			// El modo local no tiene usuarios. La app espera igualmente una respuesta: sin
			// ella, `isInitialized` no se pondría nunca a true y quedaría el splash colgado.
			const provider = await cargarProvider('false', backendPelado());
			const visto: unknown[] = [];

			provider.onAuthStateChanged!((user) => visto.push(user));
			for (let i = 0; i < 50 && visto.length === 0; i++) await Promise.resolve();

			expect(visto).toEqual([null]);
		});

		it('darse de baja antes de que el backend resuelva cancela la suscripción', async () => {
			// La carrera real: el usuario navega fuera mientras el chunk de Firebase todavía
			// está cargando. Sin la bandera de cancelado, el callback dispararía sobre un
			// componente ya desmontado.
			const provider = await cargarProvider('false', backendPelado());
			const visto: unknown[] = [];

			const cancelar = provider.onAuthStateChanged!((user) => visto.push(user)) as () => void;
			cancelar();
			for (let i = 0; i < 50; i++) await Promise.resolve();

			expect(visto).toEqual([]);
		});

		it('con un backend que sí tiene auth, delega en él y devuelve su cancelador', async () => {
			const cancelador = vi.fn();
			const backend = {
				...backendPelado(),
				onAuthStateChanged: vi.fn((cb: (u: unknown) => void) => {
					cb({ uid: 'u1' });
					return cancelador;
				})
			} as unknown as StorageProvider;

			const provider = await cargarProvider('true', backend);
			const visto: unknown[] = [];
			const cancelar = provider.onAuthStateChanged!((user) => visto.push(user)) as () => void;
			for (let i = 0; i < 50 && visto.length === 0; i++) await Promise.resolve();

			expect(visto).toEqual([{ uid: 'u1' }]);
			cancelar();
			expect(cancelador).toHaveBeenCalled();
		});
	});
});
