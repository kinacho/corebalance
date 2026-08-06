import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Transaction } from '$lib/types';
import type { UserData } from '$lib/db/types';

/**
 * La resolución de conflictos entre el navegador y la nube.
 *
 * ⚠️ **Es el sitio del repo donde un error borra datos del usuario**, y no tenía ni un
 * test. `loadFromCloud()` decide, cada vez que alguien inicia sesión, si la copia de la
 * nube pisa la local o al contrario, con dos criterios distintos y ambos frágiles: los
 * datos de usuario van por marca de tiempo (last-write-wins) y las transacciones **por
 * número de items**, que es una heurística que la propia documentación llama frágil.
 *
 * Lo que se fija aquí no es que la heurística sea buena —no lo es— sino **cuál es**, para
 * que cambiarla sea una decisión y no un accidente. Y para que quede escrito el caso
 * peligroso: sin marca de tiempo local, la nube gana.
 *
 * Se prueba a través del store, disparando el callback de autenticación como lo haría
 * Firebase, porque el camino real incluye el orden de las cargas y los efectos sobre
 * `localStorage`.
 */

const almacen = vi.hoisted(() => ({
	callback: null as ((user: unknown) => void) | null,
	userData: null as UserData | null,
	transactions: [] as Transaction[],
	guardados: [] as { userId: string; data: Record<string, unknown> }[],
	transaccionesGuardadas: [] as Transaction[][]
}));

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/db', () => ({
	storageProvider: {
		isLocal: false,
		onAuthStateChanged: (cb: (user: unknown) => void) => {
			almacen.callback = cb;
			return () => {};
		},
		loadUserData: async () => almacen.userData,
		loadTransactions: async () => almacen.transactions,
		loadHistory: async () => [],
		loadHoldingEdits: async () => [],
		saveUserData: async (userId: string, data: Record<string, unknown>) => {
			almacen.guardados.push({ userId, data });
		},
		saveTransactions: async (_userId: string, tx: Transaction[]) => {
			almacen.transaccionesGuardadas.push(tx);
		},
		saveHistory: async () => {},
		saveHoldingEdits: async () => {}
	}
}));

import { PortfolioStore } from './portfolio.svelte';

const TICKER = 'VWCE';

/**
 * Datos de nube completos a partir de lo que interesa a cada caso.
 *
 * `UserData` exige seis campos, y escribirlos en cada test convierte la aserción en ruido.
 * Lo que **no** vale es un `as UserData` sobre un objeto incompleto: `svelte-check` lo
 * rechaza con razón, porque entonces el test estaría probando contra una forma que la nube
 * nunca envía.
 */
function nube(parcial: Partial<UserData>): UserData {
	return {
		holdings: {},
		contribution: 0,
		isPrivate: false,
		coreAssets: [],
		satelliteAssets: [],
		stockAssets: [],
		...parcial
	};
}

function tx(id: string, date: number): Transaction {
	return {
		id,
		ticker: TICKER,
		type: 'buy',
		shares: 1,
		price: 100,
		date,
		currency: 'EUR',
		fees: 0,
		fxRate: 1
	};
}

/** Construye el store y simula que Firebase acaba de reconocer al usuario. */
async function iniciarSesion(): Promise<PortfolioStore> {
	const store = new PortfolioStore();
	// El constructor arranca `initAuth`, que registra el callback de forma asíncrona.
	for (let i = 0; i < 50 && !almacen.callback; i++) await Promise.resolve();
	await almacen.callback!({ uid: 'u1', email: 'x@y.z' });
	return store;
}

describe('sincronización con la nube · qué copia gana', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		almacen.callback = null;
		almacen.userData = null;
		almacen.transactions = [];
		almacen.guardados = [];
		almacen.transaccionesGuardadas = [];
		localStorage.clear();
		// `fetchPrices` sale a la red al final de la carga; sin esto ensucia la consola.
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ prices: {} }) })));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('datos de usuario: last-write-wins por marca de tiempo', () => {
		it('la nube gana cuando es más reciente que la copia local', async () => {
			localStorage.setItem('corebalance_updatedAt', '2026-01-01T00:00:00.000Z');
			localStorage.setItem('corebalance_holdings_v2', JSON.stringify({ [TICKER]: { shares: 1, avgCost: 10 } }));
			almacen.userData = nube({
				updatedAt: '2026-06-01T00:00:00.000Z',
				holdings: { [TICKER]: { shares: 99, avgCost: 200 } },
				contribution: 500
			});

			const store = await iniciarSesion();

			expect(store.holdings[TICKER].shares).toBe(99);
			expect(store.contribution).toBe(500);
			// Y la copia local queda sincronizada con lo que ha ganado.
			expect(JSON.parse(localStorage.getItem('corebalance_holdings_v2')!)[TICKER].shares).toBe(99);
		});

		it('la copia local gana cuando es más reciente, y se sube en vez de perderse', async () => {
			// El caso que esta rama existe para cubrir: un guardado que no llegó a
			// completarse antes de cerrar la pestaña. Sin esto, entrar desde otro sitio
			// borraría lo último que hizo el usuario.
			localStorage.setItem('corebalance_updatedAt', '2026-06-01T00:00:00.000Z');
			localStorage.setItem('corebalance_holdings_v2', JSON.stringify({ [TICKER]: { shares: 7, avgCost: 10 } }));
			almacen.userData = nube({
				updatedAt: '2026-01-01T00:00:00.000Z',
				holdings: { [TICKER]: { shares: 99, avgCost: 200 } }
			});

			const store = await iniciarSesion();

			expect(store.holdings[TICKER].shares).toBe(7);
			expect(almacen.guardados.length).toBeGreaterThan(0);
			const subido = almacen.guardados.at(-1)!.data.holdings as Record<string, { shares: number }>;
			expect(subido[TICKER].shares).toBe(7);
		});

		it('⚠️ sin marca de tiempo local, la nube gana: es la asimetría peligrosa', async () => {
			// `localIsNewer` solo es verdad si **existen las dos** marcas. Si la local falta
			// —storage limpiado, primera sesión en ese navegador, o un guardado que nunca
			// escribió la marca— la nube sobreescribe sin comparar nada. Queda fijado porque
			// es el escenario en el que se pierde trabajo, y porque cambiarlo debe ser una
			// decisión consciente.
			localStorage.setItem('corebalance_holdings_v2', JSON.stringify({ [TICKER]: { shares: 7, avgCost: 10 } }));
			almacen.userData = nube({
				updatedAt: '2026-01-01T00:00:00.000Z',
				holdings: { [TICKER]: { shares: 99, avgCost: 200 } }
			});

			const store = await iniciarSesion();

			expect(store.holdings[TICKER].shares).toBe(99);
		});

		it('sin datos en la nube, los locales se suben y no se tocan', async () => {
			localStorage.setItem('corebalance_holdings_v2', JSON.stringify({ [TICKER]: { shares: 3, avgCost: 10 } }));
			almacen.userData = null;

			const store = await iniciarSesion();

			expect(store.holdings[TICKER].shares).toBe(3);
			expect(almacen.guardados.length).toBeGreaterThan(0);
		});
	});

	describe('transacciones: desempate por número de items', () => {
		it('la nube gana si trae al menos tantas transacciones como haya en local', async () => {
			localStorage.setItem('corebalance_transactions', JSON.stringify([tx('local-1', 1)]));
			almacen.userData = nube({ updatedAt: '2026-06-01T00:00:00.000Z' });
			almacen.transactions = [tx('nube-1', 1), tx('nube-2', 2)];

			const store = await iniciarSesion();

			expect(store.transactions.map((t) => t.id)).toEqual(['nube-1', 'nube-2']);
			// Y la copia local se alinea con la nube.
			const enLocal = JSON.parse(localStorage.getItem('corebalance_transactions')!) as Transaction[];
			expect(enLocal.map((t) => t.id)).toEqual(['nube-1', 'nube-2']);
		});

		it('empatadas a número, gana la nube: el criterio es «al menos tantas»', async () => {
			localStorage.setItem('corebalance_transactions', JSON.stringify([tx('local-1', 1)]));
			almacen.userData = nube({ updatedAt: '2026-06-01T00:00:00.000Z' });
			almacen.transactions = [tx('nube-1', 1)];

			const store = await iniciarSesion();

			expect(store.transactions.map((t) => t.id)).toEqual(['nube-1']);
		});

		it('⚠️ con menos transacciones en la nube, se conservan las locales y se suben', async () => {
			// Aquí está la fragilidad que la documentación admite: **el número de items no
			// dice quién tiene razón**. Dos dispositivos que borran transacciones distintas
			// acaban con la unión, no con la última verdad. Lo que sí garantiza este criterio
			// es que **nunca se pierden** transacciones por sincronizar, que es el error que
			// más duele en un libro contable.
			localStorage.setItem(
				'corebalance_transactions',
				JSON.stringify([tx('local-1', 1), tx('local-2', 2), tx('local-3', 3)])
			);
			almacen.userData = nube({ updatedAt: '2026-06-01T00:00:00.000Z' });
			almacen.transactions = [tx('nube-1', 1)];

			const store = await iniciarSesion();

			// Las locales, que las cargó `loadFromStorage`, sobreviven.
			expect(store.transactions.map((t) => t.id)).toEqual(['local-1', 'local-2', 'local-3']);
		});

		it('sin transacciones locales, cualquier cosa que traiga la nube entra', async () => {
			almacen.userData = nube({ updatedAt: '2026-06-01T00:00:00.000Z' });
			almacen.transactions = [tx('nube-1', 1)];

			const store = await iniciarSesion();

			expect(store.transactions.map((t) => t.id)).toEqual(['nube-1']);
		});
	});

	describe('lo que la carga desde la nube no debe olvidar', () => {
		it('normaliza los activos que llegan de la nube', async () => {
			// ⚠️ Los activos guardados antes de que existieran `instrumentType` e `indexKey`
			// no los traen, y una cartera que llega de la nube **no pasa por la ruta local**.
			// Si aquí no se normaliza, el panel fiscal se queda mudo justo para los usuarios
			// con sesión, que son los que sincronizan.
			almacen.userData = nube({
				updatedAt: '2026-06-01T00:00:00.000Z',
				holdings: {},
				coreAssets: [
					{
						ticker: '0P0001ABCD',
						name: 'Vanguard Global Stock Index Fund',
						isin: '',
						targetWeight: 1,
						color: '#000',
						icon: '📈',
						ter: 0,
						category: 'core'
					}
				]
			});

			const store = await iniciarSesion();

			expect(store.coreAssets[0].instrumentType).toBe('fund');
		});

		it('sanea las posiciones que llegan de la nube', async () => {
			// Redondeo a tres decimales y valores por defecto: es la misma limpieza que se
			// aplica a lo que viene de `localStorage`, y sin ella un dato corrupto de la nube
			// entra tal cual.
			almacen.userData = nube({
				updatedAt: '2026-06-01T00:00:00.000Z',
				holdings: { [TICKER]: { shares: 1.23456789, avgCost: 9.87654321 } }
			});

			const store = await iniciarSesion();

			expect(store.holdings[TICKER].shares).toBe(1.235);
			expect(store.holdings[TICKER].avgCost).toBe(9.877);
			expect(store.holdings[TICKER].useLedger).toBe(false);
		});
	});
});
