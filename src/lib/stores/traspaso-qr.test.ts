import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioStore } from './portfolio.svelte';
import { decodeSyncPayload, encodeSyncPayload, isSyncPayload } from '$lib/sync-payload';
import type { Asset } from '$lib/types';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$lib/db', () => ({
	storageProvider: { isLocal: true, onAuthStateChanged: vi.fn(), saveHoldingEdits: vi.fn() }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

/**
 * Los dos extremos del traspaso por QR, **a través del store**.
 *
 * ⚠️ Se prueba aquí y no contra `storageProvider` porque ahí estaba el defecto: el
 * emisor pedía la cartera a `getAllData()`, que con `PUBLIC_USE_FIREBASE=true` —el
 * entorno que se publica— exige sesión y lanza. Medido en el navegador: sin iniciar
 * sesión, la pestaña del QR decía «Debes iniciar sesión para exportar datos» y no
 * dibujaba nada. El store tiene la cartera siempre, con sesión y sin ella.
 */
const activo = (ticker: string, name: string, category: Asset['category']): Asset => ({
	ticker,
	name,
	isin: '',
	targetWeight: category === 'core' ? 0.5 : 0,
	color: '#3b82f6',
	icon: '📈',
	ter: 0.002,
	category
});

describe('PortfolioStore · traspaso por QR', () => {
	let store: PortfolioStore;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		store = new PortfolioStore();
		store.coreAssets = [activo('VWCE', 'Vanguard FTSE All-World', 'core'), activo('SXR8', 'iShares Core S&P 500', 'core')];
		store.satelliteAssets = [activo('CASH-DEP', 'Cuenta remunerada', 'satellite')];
		store.stockAssets = [];
		store.holdings = {
			VWCE: { shares: 80, avgCost: 100, useLedger: false },
			SXR8: { shares: 20, avgCost: 400, useLedger: false },
			'CASH-DEP': { shares: 900, avgCost: 1, useLedger: false }
		};
		store.contribution = 500;
		store.transactions = [];
		store.holdingEdits = [];
		store.history = [];
	});

	it('el snapshot que sale es un traspaso válido', () => {
		expect(isSyncPayload(store.snapshotForTransfer())).toBe(true);
	});

	it('lleva la cartera, las participaciones y la aportación', () => {
		const payload = store.snapshotForTransfer();
		expect(payload.assets.coreAssets).toHaveLength(2);
		expect(payload.assets.satelliteAssets).toHaveLength(1);
		expect(payload.holdings.VWCE.shares).toBe(80);
		expect(payload.contribution).toBe(500);
	});

	/**
	 * El historial de snapshots **no viaja**, y es lo que hace que el QR quepa: con él
	 * dentro, una cartera real daba 6.423 caracteres de URL contra un límite de 2.000.
	 */
	it('no lleva el historial de snapshots ni la caché de precios', () => {
		store.history = [{ date: '2026-08-01', value: 12345 }];
		store.prices = { VWCE: { name: 'x', price: 118, currency: 'EUR', change: 0 } };
		const payload = store.snapshotForTransfer() as unknown as Record<string, unknown>;
		expect(payload.history).toBeUndefined();
		expect(payload.prices).toBeUndefined();
	});

	it('ida y vuelta por la URL reconstruye la misma cartera', async () => {
		const original = store.snapshotForTransfer();
		const recibido = await decodeSyncPayload(await encodeSyncPayload(original));

		const otro = new PortfolioStore();
		otro.applyTransfer(recibido);

		expect(otro.coreAssets.map((a) => a.ticker)).toEqual(['VWCE', 'SXR8']);
		expect(otro.satelliteAssets.map((a) => a.ticker)).toEqual(['CASH-DEP']);
		expect(otro.holdings.VWCE.shares).toBe(80);
		expect(otro.contribution).toBe(500);
	});

	it('aplicar un traspaso reemplaza la cartera que hubiera, no la suma', () => {
		const payload = store.snapshotForTransfer();

		const otro = new PortfolioStore();
		otro.coreAssets = [activo('OTRO', 'Fondo de antes', 'core')];
		otro.holdings = { OTRO: { shares: 5, avgCost: 10, useLedger: false } };
		otro.applyTransfer(payload);

		expect(otro.coreAssets.map((a) => a.ticker)).toEqual(['VWCE', 'SXR8']);
		expect(otro.holdings.OTRO).toBeUndefined();
	});

	/**
	 * El historial del dispositivo que recibe deja de corresponder a esta cartera, así
	 * que se descarta: mezclarlo pintaría el patrimonio de otra cartera como si fuera
	 * el de ésta.
	 */
	it('descarta el historial del dispositivo que recibe', () => {
		const otro = new PortfolioStore();
		otro.history = [{ date: '2026-01-01', value: 999 }];
		otro.applyTransfer(store.snapshotForTransfer());
		expect(otro.history).toEqual([]);
	});

	it('sale del modo demo al aplicar un traspaso', () => {
		const otro = new PortfolioStore();
		otro.isDemo = true;
		otro.applyTransfer(store.snapshotForTransfer());
		// Si no, `saveToStorage()` no escribe nada (vuelve pronto en demo) y la cartera
		// recibida se perdería en la siguiente recarga.
		expect(otro.isDemo).toBe(false);
	});

	it('deja la cartera guardada en este navegador', () => {
		const otro = new PortfolioStore();
		otro.applyTransfer(store.snapshotForTransfer());

		const guardadas = JSON.parse(localStorage.getItem('corebalance_holdings_v2') ?? '{}');
		expect(guardadas.VWCE.shares).toBe(80);
		const guardados = JSON.parse(localStorage.getItem('corebalance_user_assets') ?? '{}');
		expect(guardados.coreAssets).toHaveLength(2);
	});

	it('un traspaso vacío no revienta', () => {
		const otro = new PortfolioStore();
		otro.applyTransfer({
			v: 1,
			assets: { coreAssets: [], satelliteAssets: [], stockAssets: [] },
			holdings: {},
			contribution: 0
		});
		expect(otro.coreAssets).toEqual([]);
		expect(otro.holdings).toEqual({});
	});
});
