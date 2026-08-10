/**
 * El almacenamiento local, contra un IndexedDB de verdad.
 *
 * ⚠️ Este fichero es **donde escribe cada usuario en cada cambio** y no tenía suite.
 * `db/index.test.ts` lo `vi.doMock`ea, así que prueba el selector de backend y no el
 * almacenamiento: la diferencia entre «se eligió LocalDBStorage» y «los datos siguen ahí».
 *
 * Casi todos sus métodos son envoltorios de una línea sobre Dexie y no se prueban aquí por
 * separado —probarían a Dexie—. Lo que se fija es lo que **decide** algo: el orden del merge
 * de `saveUserData`, que los `load*` devuelvan el vacío con el que el store sabe operar en
 * vez de `undefined`, el aislamiento entre usuarios, y las dos operaciones destructivas.
 *
 * `fake-indexeddb` es necesario porque jsdom no trae IndexedDB: sin él la suite de nube
 * llenaba stderr de `DatabaseClosedError` que nadie leía (ver la nota de `cloudSync.test.ts`
 * en CLAUDE.md). Se importa antes que el módulo, porque `localDB` se instancia al importarlo.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Transaction } from '$lib/types';
import type { HoldingEdit } from '$lib/history/types';

// `localDB` es `browser ? new CoreBalanceDB() : null`, y en vitest `browser` es falso.
vi.mock('$app/environment', () => ({ browser: true }));

const { LocalDBStorage, localDB } = await import('./LocalDBStorage');

const almacen = new LocalDBStorage();

const CARTERA = {
	holdings: { 'IWDA.AS': { shares: 100, avgCost: 72.4, useLedger: false } },
	contribution: 500,
	isPrivate: false,
	coreAssets: [{ ticker: 'IWDA.AS', name: 'World', targetWeight: 1, category: 'core' }]
};

beforeEach(async () => {
	await localDB!.userData.clear();
	await localDB!.history.clear();
	await localDB!.transactions.clear();
	await localDB!.holdingEdits.clear();
});

describe('LocalDBStorage', () => {
	it('guarda y recupera los datos de usuario', async () => {
		await almacen.saveUserData('u1', CARTERA as never);
		const leido = await almacen.loadUserData('u1');

		expect(leido?.holdings['IWDA.AS'].shares).toBe(100);
		expect(leido?.contribution).toBe(500);
	});

	it('rellena con vacíos los campos que el llamante no manda', async () => {
		await almacen.saveUserData('u1', { contribution: 300 } as never);
		const leido = await almacen.loadUserData('u1');

		// El store itera estas listas sin comprobarlas, así que faltar no es una opción.
		expect(leido?.holdings).toEqual({});
		expect(leido?.coreAssets).toEqual([]);
		expect(leido?.satelliteAssets).toEqual([]);
		expect(leido?.stockAssets).toEqual([]);
	});

	/**
	 * El contrato de verdad de esta clase, y lo que decide es el **orden** del merge
	 * (`defaults → existing → data`). Con `...data` antes de `...existing`, cada guardado
	 * parcial revertiría los campos que no menciona: la aportación volvería a 0 y la cartera
	 * a `{}` en el siguiente autoguardado, sin error en ninguna parte.
	 */
	it('un guardado parcial no borra lo que ya estaba', async () => {
		await almacen.saveUserData('u1', CARTERA as never);
		await almacen.saveUserData('u1', { isPrivate: true } as never);

		const leido = await almacen.loadUserData('u1');
		expect(leido?.isPrivate).toBe(true);
		expect(leido?.holdings['IWDA.AS'].shares).toBe(100);
		expect(leido?.contribution).toBe(500);
		expect(leido?.coreAssets).toHaveLength(1);
	});

	it('el merge es superficial: al guardar `holdings` sustituye el objeto entero', async () => {
		await almacen.saveUserData('u1', CARTERA as never);
		await almacen.saveUserData('u1', { holdings: { 'VWCE.DE': { shares: 5, avgCost: 100, useLedger: false } } } as never);

		const leido = await almacen.loadUserData('u1');
		// Es lo que el store espera: manda su mapa completo en cada guardado.
		expect(Object.keys(leido!.holdings)).toEqual(['VWCE.DE']);
	});

	it('devuelve null para un usuario que no existe, no undefined', async () => {
		expect(await almacen.loadUserData('nadie')).toBeNull();
	});

	it('no mezcla los datos de dos usuarios', async () => {
		await almacen.saveUserData('u1', { contribution: 100 } as never);
		await almacen.saveUserData('u2', { contribution: 999 } as never);

		expect((await almacen.loadUserData('u1'))?.contribution).toBe(100);
		expect((await almacen.loadUserData('u2'))?.contribution).toBe(999);
	});

	describe('transacciones, historial y ediciones', () => {
		const tx: Transaction[] = [
			{ id: 't1', ticker: 'IWDA.AS', type: 'buy', shares: 10, price: 70, date: 1704067200000 } as Transaction
		];
		const edits: HoldingEdit[] = [
			{ id: 'e1', ticker: 'IWDA.AS', sharesBefore: 0, sharesAfter: 10, date: 1704067200000 } as HoldingEdit
		];

		it('guarda y recupera cada colección por usuario', async () => {
			await almacen.saveTransactions('u1', tx);
			await almacen.saveHistory('u1', [{ date: 1704067200000, value: 7240 }] as never);
			await almacen.saveHoldingEdits('u1', edits);

			expect(await almacen.loadTransactions('u1')).toHaveLength(1);
			expect(await almacen.loadHistory('u1')).toHaveLength(1);
			expect(await almacen.loadHoldingEdits('u1')).toHaveLength(1);
			// Y no se filtran al usuario de al lado.
			expect(await almacen.loadTransactions('u2')).toEqual([]);
		});

		/**
		 * El store hace `.length` y `.map` sobre lo que devuelven estos tres métodos sin
		 * comprobarlo, así que un `undefined` aquí es un `TypeError` en el arranque del
		 * dashboard —que es `ssr = false`, o sea una página en blanco.
		 */
		it('devuelve listas vacías cuando el usuario no tiene registro', async () => {
			expect(await almacen.loadTransactions('nadie')).toEqual([]);
			expect(await almacen.loadHistory('nadie')).toEqual([]);
			expect(await almacen.loadHoldingEdits('nadie')).toEqual([]);
		});

		it('sustituye la colección completa en cada guardado', async () => {
			await almacen.saveTransactions('u1', tx);
			await almacen.saveTransactions('u1', []);
			expect(await almacen.loadTransactions('u1')).toEqual([]);
		});
	});

	describe('exportar y restaurar', () => {
		it('un respaldo completo sobrevive a la ida y vuelta', async () => {
			await almacen.saveUserData('u1', CARTERA as never);
			await almacen.saveHistory('u1', [{ date: 1704067200000, value: 7240 }] as never);
			const respaldo = await almacen.getAllData();

			await almacen.deleteAccount();
			expect(await almacen.loadUserData('u1')).toBeNull();

			await almacen.importAllData(respaldo);
			const leido = await almacen.loadUserData('u1');
			expect(leido?.holdings['IWDA.AS'].shares).toBe(100);
			expect(await almacen.loadHistory('u1')).toHaveLength(1);
		});

		/**
		 * ⚠️ El defecto: la guarda sólo miraba `!data`, así que un objeto sin nada que
		 * restaurar vaciaba las cuatro tablas y no ponía nada. No es un caso inventado —
		 * `validateImportData()` da por bueno `{ history: [] }`, y `SyncModal` recarga la
		 * página 1,5 s después de «importar», así que el usuario ni ve el borrado.
		 */
		it('un respaldo sin contenido no borra la cartera que ya hay', async () => {
			await almacen.saveUserData('u1', CARTERA as never);

			await almacen.importAllData({ history: [] });

			const leido = await almacen.loadUserData('u1');
			expect(leido?.holdings['IWDA.AS'].shares).toBe(100);
		});

		it('tampoco la borra un objeto vacío ni uno con las claves a null', async () => {
			await almacen.saveUserData('u1', CARTERA as never);

			await almacen.importAllData({});
			await almacen.importAllData({ userData: null, history: undefined });

			expect(await almacen.loadUserData('u1')).not.toBeNull();
		});

		it('`deleteAccount` vacía las cuatro tablas', async () => {
			await almacen.saveUserData('u1', CARTERA as never);
			await almacen.saveTransactions('u1', []);
			await almacen.saveHistory('u1', [{ date: 1, value: 1 }] as never);
			await almacen.saveHoldingEdits('u1', []);

			await almacen.deleteAccount();

			const restos = await almacen.getAllData();
			expect(restos.userData).toEqual([]);
			expect(restos.history).toEqual([]);
			expect(restos.transactions).toEqual([]);
			expect(restos.holdingEdits).toEqual([]);
		});
	});

	/**
	 * En modo local no hay autenticación de verdad, pero el callback **no** se invoca de forma
	 * síncrona: el store monta su reacción después de llamar a `initAuth()`, y las tres suites
	 * que construyen un `PortfolioStore` dependen de ese aplazamiento.
	 */
	it('avisa del usuario local de forma asíncrona', async () => {
		const visto: unknown[] = [];
		almacen.onAuthStateChanged(u => visto.push(u));

		expect(visto).toHaveLength(0);
		await new Promise(r => setTimeout(r, 0));

		expect(visto).toHaveLength(1);
		expect((visto[0] as { uid: string }).uid).toBe('local_user');
	});
});
