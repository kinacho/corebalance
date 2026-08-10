import { describe, it, expect } from 'vitest';
import {
	MAX_SYNC_URL_LENGTH,
	SYNC_PAYLOAD_VERSION,
	decodeSyncPayload,
	describeSyncPayload,
	encodeSyncPayload,
	isSyncPayload,
	syncUrl,
	type SyncPayload
} from './sync-payload';

const activo = (i: number) =>
	({
		ticker: `0P0001XF${i}0.F`,
		name: `iShares Core MSCI World UCITS ETF Class ${i} Acc EUR`,
		isin: `IE00B4L5Y98${i}`,
		targetWeight: 0.1,
		color: '#3b82f6',
		icon: '📈',
		ter: 0.002,
		category: 'core',
		instrumentType: 'fund',
		indexKey: 'msci-world'
	}) as never;

/** Un traspaso como el que produce `snapshotForTransfer()` en una cartera real. */
function traspasoRealista(): SyncPayload {
	const activos = Array.from({ length: 9 }, (_, i) => activo(i)) as never[];
	const holdings: Record<string, unknown> = {};
	for (let i = 0; i < 9; i++) {
		holdings[`0P0001XF${i}0.F`] = { shares: 1041.729, avgCost: 10.47, useLedger: true };
	}
	const transactions = Array.from({ length: 25 }, (_, i) => ({
		id: `11111111-2222-3333-4444-55555555555${i % 10}`,
		ticker: `0P0001XF${i % 9}0.F`,
		type: 'buy',
		date: 1739145600000 + i * 2592000000,
		shares: 52,
		price: 10.35,
		currency: 'EUR',
		fees: 0,
		fxRate: 1
	})) as never[];

	return {
		v: SYNC_PAYLOAD_VERSION,
		assets: {
			coreAssets: activos.slice(0, 4),
			satelliteAssets: activos.slice(4, 6),
			stockAssets: activos.slice(6)
		},
		holdings: holdings as never,
		contribution: 1000,
		transactions,
		holdingEdits: []
	};
}

const minimo: SyncPayload = {
	v: SYNC_PAYLOAD_VERSION,
	assets: { coreAssets: [], satelliteAssets: [], stockAssets: [] },
	holdings: {},
	contribution: 0
};

describe('sync-payload', () => {
	it('ida y vuelta conserva los datos', async () => {
		const payload = traspasoRealista();
		expect(await decodeSyncPayload(await encodeSyncPayload(payload))).toEqual(payload);
	});

	it('acepta el fragmento con su almohadilla', async () => {
		const codificado = await encodeSyncPayload(minimo);
		expect(await decodeSyncPayload('#' + codificado)).toEqual(minimo);
	});

	it('el codificado es base64url: ni +, ni /, ni relleno', async () => {
		const codificado = await encodeSyncPayload(traspasoRealista());
		expect(codificado).not.toMatch(/[+/=]/);
	});

	/**
	 * La medida que decide el diseño del formato. Nueve activos con veinticinco
	 * operaciones caben; **el respaldo completo, con sus 400 días de snapshots, no** — y
	 * eso es lo que llevaba dentro el QR antes, o sea que no podía funcionar.
	 */
	it('una cartera de nueve activos con su libro cabe en el QR', async () => {
		const url = syncUrl('https://corebalance.app', await encodeSyncPayload(traspasoRealista()));
		expect(url.length).toBeLessThan(MAX_SYNC_URL_LENGTH);
	});

	it('el historial de snapshots no cabría, y por eso no viaja', async () => {
		const conHistorial = {
			...traspasoRealista(),
			history: Array.from({ length: 400 }, (_, i) => ({
				date: new Date(1739145600000 + i * 86400000).toISOString().slice(0, 10),
				value: 116052.36 + i,
				core: 76288.4 + i,
				satellite: 5000.41,
				stocks: 34889.47,
				netFlow: i % 30 === 0 ? 1000 : 0
			}))
		};
		const url = syncUrl('https://corebalance.app', await encodeSyncPayload(conHistorial as never));
		expect(url.length).toBeGreaterThan(MAX_SYNC_URL_LENGTH);
	});

	/**
	 * Lo que llega viene de una URL que cualquiera puede haber tocado, y de aquí sale un
	 * objeto que se escribe **encima** de la cartera. Tiene que fallar, no devolver algo
	 * a medias.
	 */
	it('un fragmento que no es un traspaso lanza', async () => {
		await expect(decodeSyncPayload('')).rejects.toThrow();
		await expect(decodeSyncPayload('#')).rejects.toThrow();
		await expect(decodeSyncPayload('esto-no-es-deflate')).rejects.toThrow();
		// Base64 válido pero sin comprimir.
		await expect(decodeSyncPayload(btoa('{"v":1}'))).rejects.toThrow();
	});

	it('un payload comprimido pero con otra forma lanza', async () => {
		for (const basura of [[1, 2, 3], { userData: [] }, { v: 99, assets: {} }, 'texto']) {
			const codificado = await encodeSyncPayload(basura as never);
			await expect(decodeSyncPayload(codificado)).rejects.toThrow();
		}
	});

	describe('isSyncPayload', () => {
		it('acepta el mínimo', () => {
			expect(isSyncPayload(minimo)).toBe(true);
		});

		it('rechaza lo que no lo es', () => {
			expect(isSyncPayload(null)).toBe(false);
			expect(isSyncPayload([])).toBe(false);
			expect(isSyncPayload({})).toBe(false);
			// La versión importa: es lo que permitirá rechazar un formato viejo.
			expect(isSyncPayload({ ...minimo, v: 2 })).toBe(false);
			// Y cada pieza por separado, para que no baste con una.
			expect(isSyncPayload({ ...minimo, contribution: '0' })).toBe(false);
			expect(isSyncPayload({ ...minimo, holdings: null })).toBe(false);
			expect(isSyncPayload({ ...minimo, assets: undefined })).toBe(false);
			expect(
				isSyncPayload({ ...minimo, assets: { coreAssets: [], satelliteAssets: [] } })
			).toBe(false);
		});
	});

	it('`describeSyncPayload` cuenta los activos de las tres carteras', () => {
		expect(describeSyncPayload(traspasoRealista())).toEqual({
			assets: 9,
			transactions: 25,
			edits: 0
		});
	});

	it('`describeSyncPayload` no revienta con un traspaso vacío', () => {
		expect(describeSyncPayload(minimo)).toEqual({ assets: 0, transactions: 0, edits: 0 });
	});

	it('`syncUrl` usa el fragmento y no la query', () => {
		// Es lo que impide que la cartera llegue a los registros del servidor.
		expect(syncUrl('https://corebalance.app', 'abc')).toBe('https://corebalance.app/sync#abc');
	});
});
