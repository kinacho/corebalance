import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Transaction } from '$lib/types';
import type { UserData } from '$lib/db/types';
import { ConflictoDeSincronizacion } from '$lib/db/types';

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
	/** `null` es «la lectura falló», no «no hay movimientos». Ver el bloque de tests. */
	transactions: [] as Transaction[] | null,
	guardados: [] as { userId: string; data: Record<string, unknown> }[],
	transaccionesGuardadas: [] as Transaction[][],
	/** La revisión que tiene la nube ahora mismo. Ver `rev` en `db/types.ts`. */
	revNube: null as number | null,
	/** Lo que cada guardado dijo creer tener, para poder afirmar sobre la guarda. */
	revsEsperadas: [] as (number | null | undefined)[],
	/** El callback de la escucha en tiempo real, para simular el otro dispositivo. */
	alCambiar: null as ((data: UserData) => void) | null,
	bajas: 0
}));

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

/*
 * ⚠️ Estas dos son imprescindibles y no son adorno: **esta es la única suite del
 * repo que entra en la rama de nube**. Las otras tres que construyen un
 * `PortfolioStore` declaran `isLocal: true` y un `onAuthStateChanged` de pega,
 * así que nunca disparan el callback; aquí sí, y eso destapa dos importaciones
 * dinámicas que el mock del barril `$lib/db` no cubre porque apuntan a otro sitio.
 *
 * - `$lib/firebase` lo importa `initAuth()` cuando el proveedor no es local, y
 *   arrastra el SDK entero (`firebase/app`, `auth`, `firestore`) por el pipeline
 *   de vite, además de llamar a `initializeApp` con las variables de entorno que
 *   haya en la máquina. Medido: el primer test pasa de **244 ms a 60 ms** al
 *   mockearlo, y los otros nueve estaban ya en 2–4 ms.
 * - `$lib/db/LocalDBStorage` lo importa `loadHistory()` como respaldo cuando la
 *   nube no trae historial —que es el caso de todos estos tests—, y va a Dexie de
 *   verdad. En jsdom no hay IndexedDB, así que **cada test escupía un
 *   `DatabaseClosedError`** por stderr que nadie leía. `localDB` a `null` es
 *   además el estado que el propio código ya contempla y guarda.
 *
 * Mismo patrón que el `vi.mock('$lib/server/redis')` de los tests de rate limit:
 * una suite unitaria que habla con una dependencia real no prueba lo que dice
 * probar, y falla por motivos que no controla.
 */
vi.mock('$lib/firebase', () => ({ auth: null, db: null, googleProvider: null }));
vi.mock('$lib/db/LocalDBStorage', () => ({ localDB: null }));
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
		/*
		 * ⚠️ Este doble **aplica la guarda de revisión de verdad**, porque es justo lo que
		 * estos tests deciden. Un doble que siempre acepta dejaría pasar exactamente el
		 * defecto que se está arreglando.
		 */
		saveUserData: async (
			userId: string,
			data: Record<string, unknown>,
			opciones?: { revEsperada?: number | null }
		) => {
			almacen.revsEsperadas.push(opciones?.revEsperada);
			if (opciones && opciones.revEsperada !== undefined) {
				if (almacen.revNube !== null && almacen.revNube !== opciones.revEsperada) {
					throw new ConflictoDeSincronizacion(almacen.revNube);
				}
				almacen.revNube = (almacen.revNube ?? 0) + 1;
			}
			almacen.guardados.push({ userId, data });
			return almacen.revNube;
		},
		subscribeUserData: (_userId: string, alCambiar: (data: UserData) => void) => {
			almacen.alCambiar = alCambiar;
			return () => {
				almacen.bajas++;
				almacen.alCambiar = null;
			};
		},
		saveTransactions: async (_userId: string, tx: Transaction[]) => {
			almacen.transaccionesGuardadas.push(tx);
		},
		saveHistory: async () => {},
		saveHoldingEdits: async () => {}
	}
}));

import { PortfolioStore } from './portfolio.svelte';
import { ui } from './ui.svelte';

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

/**
 * Deja correr el debounce de 300 ms de `scheduleCloudSave` y las promesas que encadena.
 * Sin esto, el guardado que estos tests miden todavía no ha ocurrido.
 */
async function esperarGuardado() {
	// Reloj real y no `vi.useFakeTimers()`: esta suite no los usa, y activarlos aquí
	// congelaría también el sondeo de precios que el store arranca en el constructor.
	await new Promise((r) => setTimeout(r, 400));
	for (let i = 0; i < 20; i++) await Promise.resolve();
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
		almacen.revNube = null;
		almacen.revsEsperadas = [];
		almacen.alCambiar = null;
		almacen.bajas = 0;
		// El store de UI es un singleton de módulo: sin vaciarlo, el aviso de un test
		// se cuenta como el del siguiente.
		ui.toasts = [];
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

	/**
	 * ⚠️ **El caso que estuvo roto en producción durante meses**: las reglas de
	 * Firestore no cubrían `user_transactions/{uid}/items`, así que cada lectura del
	 * libro respondía `Missing or insufficient permissions` y `FirebaseStorage` lo
	 * convertía en `[]`. En un navegador nuevo —donde tampoco hay copia local— eso
	 * dejaba la sesión con el libro a cero y **sin decirlo**: la cartera se veía
	 * correcta y el coste medio, el TWR y el panel fiscal salían de un libro vacío.
	 *
	 * ⚠️ **Y aquí conviene ser exacto sobre lo que este arreglo hace y lo que no**,
	 * porque el control negativo lo corrigió: el `[]` **no** borraba un libro local
	 * que tuviera datos, porque el desempate por número de items ya lo protegía
	 * (`0 >= 2` es falso). Lo que hacía era **callarse**. Así que lo que se fija
	 * abajo es la señal, no una recuperación de datos: dos tests que escribí antes de
	 * medir —«conserva las locales» y «no pisa localStorage»— pasaban igual con el
	 * defecto puesto y están fuera. Lo que sí se comprueba en otro sitio, porque ahí
	 * el daño es real, es la exportación: ver `FirebaseStorage.test.ts`.
	 */
	describe('una lectura fallida del libro no es un libro vacío', () => {
		it('avisa al usuario, porque el fallo le cambia cifras que va a leer como suyas', async () => {
			localStorage.setItem('corebalance_transactions', JSON.stringify([tx('local-1', 1)]));
			almacen.userData = nube({ updatedAt: '2026-06-01T00:00:00.000Z' });
			almacen.transactions = null;

			await iniciarSesion();

			expect(ui.toasts.some((t) => t.type === 'error')).toBe(true);
		});

		it('una nube vacía de verdad sigue vaciando el libro: es el otro caso', async () => {
			// Control: con `[]` el comportamiento anterior se mantiene intacto. Si este
			// test se pusiera verde con `null` también, el arreglo no distinguiría nada.
			localStorage.setItem('corebalance_transactions', JSON.stringify([]));
			almacen.userData = nube({ updatedAt: '2026-06-01T00:00:00.000Z' });
			almacen.transactions = [];

			const store = await iniciarSesion();

			expect(store.transactions).toEqual([]);
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

	/**
	 * ⚠️ **El defecto reportado el 28-ago-2026, y es pérdida de datos silenciosa.**
	 *
	 * Tal y como lo contó el usuario: dos sesiones abiertas con la misma cuenta de Google,
	 * un cambio hecho en el PC, y al ir al móvil «salía el dato antiguo — pero no solo eso,
	 * sino que ese dato antiguo ha machacado al nuevo, y luego en el pc me salía el dato
	 * que tenía en el móvil».
	 *
	 * La causa eran dos agujeros que se sumaban. `loadFromCloud()` se llamaba **desde un
	 * único sitio**, el callback de la sesión, así que una pestaña ya abierta no volvía a
	 * leer la nube nunca; y cualquier guardado suyo subía el documento **entero** desde un
	 * estado de hace horas, sin comprobar si entretanto había cambiado.
	 */
	describe('dos dispositivos a la vez', () => {
		it('una sesión con el estado viejo NO puede pisar lo que escribió la otra', async () => {
			almacen.userData = nube({ contribution: 100, rev: 4 });
			const store = await iniciarSesion();
			expect(store.contribution).toBe(100);

			// El PC escribe mientras este móvil sigue abierto: la nube avanza sola.
			almacen.revNube = 9;
			const guardadosAntes = almacen.guardados.length;

			store.updateContribution(555);
			await esperarGuardado();

			// Lo que NO puede pasar: que el 555 de esta sesión llegue a la nube.
			expect(almacen.guardados.length).toBe(guardadosAntes);
			expect(almacen.revNube).toBe(9);
		});

		it('y en vez de callarse, recarga y lo dice', async () => {
			const avisos = vi.spyOn(ui, 'addToast');
			almacen.userData = nube({ contribution: 100, rev: 4 });
			const store = await iniciarSesion();

			// El otro dispositivo dejó la nube en la revisión 9 con otra aportación.
			almacen.revNube = 9;
			almacen.userData = nube({ contribution: 777, rev: 9 });

			store.updateContribution(555);
			await esperarGuardado();

			expect(store.contribution).toBe(777);
			/*
			 * Se comprueba el tipo del aviso y no su texto: en esta suite i18n no está
			 * arrancado y `LL` devuelve cadena vacía, así que afirmar sobre el texto sería
			 * una aserción que no puede fallar por el motivo que dice. Que el aviso exista
			 * es lo que decide si el usuario se entera, y eso sí se puede medir aquí.
			 */
			expect(avisos).toHaveBeenCalledWith(expect.anything(), 'info');
		});

		/**
		 * La otra mitad: sin esto la guarda solo convierte la pérdida en un aviso, y el
		 * usuario seguiría mirando datos viejos hasta recargar a mano.
		 */
		it('un cambio del otro dispositivo llega solo, sin recargar la página', async () => {
			almacen.userData = nube({ contribution: 100, rev: 4 });
			const store = await iniciarSesion();

			expect(almacen.alCambiar).not.toBeNull();
			almacen.alCambiar!(nube({ contribution: 777, rev: 5 }));

			expect(store.contribution).toBe(777);
		});

		/**
		 * ⚠️ Firestore reenvía instantáneas, y reaplicar una que no trae nada nuevo pisaría
		 * lo que el usuario esté escribiendo en ese instante con un estado idéntico pero
		 * llegado tarde.
		 */
		it('una instantánea que no avanza la revisión se ignora', async () => {
			almacen.userData = nube({ contribution: 100, rev: 4 });
			const store = await iniciarSesion();

			almacen.alCambiar!(nube({ contribution: 777, rev: 4 }));

			expect(store.contribution).toBe(100);
		});

		it('la escritura declara la revisión que se leyó al entrar', async () => {
			almacen.userData = nube({ contribution: 100, rev: 4 });
			almacen.revNube = 4;
			const store = await iniciarSesion();

			store.updateContribution(555);
			await esperarGuardado();

			expect(almacen.revsEsperadas).toContain(4);
			expect(almacen.revNube).toBe(5);
		});
	});
});
