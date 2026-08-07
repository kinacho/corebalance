import { describe, it, expect } from 'vitest';
import { FT_ONLY_ASSETS, isFtOnlyAsset, searchFtAssets } from './ft-assets';

/**
 * Este registro llevaba meses sin que lo importara nadie: la función que declara
 * —fondos que Yahoo no tiene— estaba implementada tres veces con el ISIN escrito a
 * mano en `/api/search`, en `/api/resolve` y en un `PURE_FT_TICKERS` que no leía
 * nadie, y aun así **el precio no funcionaba**, porque el único sitio que importaba
 * no tenía copia. Ahora los tres leen de aquí, así que este fichero es el que
 * sostiene que añadir un fondo sea de verdad una entrada en un solo sitio.
 */
describe('isFtOnlyAsset', () => {
	it('reconoce los ISIN del registro sin importar mayúsculas', () => {
		const [isin] = Object.keys(FT_ONLY_ASSETS);
		expect(isFtOnlyAsset(isin)).toBe(true);
		expect(isFtOnlyAsset(isin.toLowerCase())).toBe(true);
	});

	it('no reconoce un ticker cualquiera de Yahoo', () => {
		expect(isFtOnlyAsset('VWCE.DE')).toBe(false);
		expect(isFtOnlyAsset('')).toBe(false);
	});
});

describe('searchFtAssets', () => {
	const [ISIN] = Object.keys(FT_ONLY_ASSETS);

	it('encuentra por ISIN completo y por prefijo, que es como se pega de un extracto', () => {
		expect(searchFtAssets(ISIN).map((a) => a.isin)).toEqual([ISIN]);
		expect(searchFtAssets(ISIN.slice(0, 6)).map((a) => a.isin)).toEqual([ISIN]);
		expect(searchFtAssets(ISIN.toLowerCase()).map((a) => a.isin)).toEqual([ISIN]);
	});

	it('encuentra por el nombre de la gestora', () => {
		expect(searchFtAssets('seilern')).toHaveLength(1);
		expect(searchFtAssets('Seil')).toHaveLength(1);
	});

	/**
	 * ⚠️ El control que da sentido a este cambio. La comparación va en el sentido
	 * contrario al que uno espera —no es que la consulta contenga el nombre del fondo,
	 * es que el nombre lo contenga a él—, así que con `includes()` buscar `ow` casaba
	 * con «Growth» y colaba un fondo boutique en una búsqueda que no tenía nada que
	 * ver. Con principio de palabra, no.
	 */
	it('no casa con un trozo suelto en mitad de una palabra', () => {
		expect(searchFtAssets('ow')).toEqual([]);
		expect(searchFtAssets('eiler')).toEqual([]);
		expect(searchFtAssets('rowth')).toEqual([]);
	});

	it('acepta una consulta de varias palabras, como el alias declarado', () => {
		expect(searchFtAssets('world growth')).toHaveLength(1);
		expect(searchFtAssets('seilern world')).toHaveLength(1);
	});

	/**
	 * Todos los términos tienen que encajar. Si bastara con uno, «seilern» seguido de
	 * cualquier cosa seguiría casando y el buscador colaría el fondo en consultas que
	 * ya no lo buscan.
	 */
	it('exige que encajen todos los términos, no solo uno', () => {
		expect(searchFtAssets('seilern vanguard')).toEqual([]);
		expect(searchFtAssets('world amundi')).toEqual([]);
	});

	it('no devuelve nada para una búsqueda ajena, ni para la vacía', () => {
		expect(searchFtAssets('vanguard')).toEqual([]);
		expect(searchFtAssets('   ')).toEqual([]);
		expect(searchFtAssets('')).toEqual([]);
	});

	it('devuelve la entrada entera, que es lo que el endpoint necesita para pintarla', () => {
		const [a] = searchFtAssets('seilern');
		expect(a).toMatchObject({
			isin: ISIN,
			name: expect.any(String),
			currency: expect.any(String),
			type: expect.any(String)
		});
		expect(a.name.length).toBeGreaterThan(3);
	});
});

describe('la forma del registro', () => {
	/**
	 * No comprueba lógica: comprueba que una entrada nueva no puede colarse a medias.
	 * Cada campo lo consume un sitio distinto —`currency` y `name` los usa el endpoint
	 * de precios para construir la cotización, `searchAliases` el buscador—, así que
	 * una entrada sin divisa daría un precio sin divisa y nadie se enteraría hasta
	 * verlo en la cartera.
	 */
	it('cada activo declara ISIN válido, nombre, divisa, tipo y algún alias', () => {
		for (const [isin, entry] of Object.entries(FT_ONLY_ASSETS)) {
			expect(isin).toMatch(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/);
			expect(entry.name.trim().length).toBeGreaterThan(3);
			expect(entry.currency).toMatch(/^[A-Z]{3}$/);
			expect(entry.type.trim().length).toBeGreaterThan(0);
			expect(entry.searchAliases.length).toBeGreaterThan(0);
			for (const alias of entry.searchAliases) {
				expect(alias).toBe(alias.toLowerCase());
			}
		}
	});
});
