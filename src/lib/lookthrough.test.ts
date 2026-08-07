import { describe, it, expect } from 'vitest';
import {
	resolveIndexKey,
	indexKeyOf,
	calculateLookThrough,
	INDICES,
	REGION_KEYS,
	SECTOR_KEYS,
	INDICES_AS_OF
} from './lookthrough';
import type { Asset, PortfolioPosition } from './types';

function makePosition(ticker: string, name: string, value: number, indexKey?: string): PortfolioPosition {
	const asset: Asset = {
		ticker,
		name,
		isin: '',
		targetWeight: 0,
		color: '#000',
		icon: '📈',
		ter: 0,
		category: 'core',
		indexKey
	};
	return {
		asset,
		holdings: value / 100,
		avgCost: 100,
		totalCost: value,
		unitPrice: 100,
		totalValue: value,
		currentWeight: 0,
		deviation: 0,
		targetValue: 0,
		targetHoldings: 0,
		profit: 0,
		profitPercent: 0,
		dailyChangeValue: 0,
		dailyChangePercent: 0
	};
}

describe('integridad del dataset de índices', () => {
	it('los pesos por región suman 100 en todos los índices', () => {
		for (const [key, index] of Object.entries(INDICES)) {
			const sum = Object.values(index.regions).reduce((a, b) => a + b, 0);
			expect(sum, `regiones de ${key}`).toBeCloseTo(100, 6);
		}
	});

	it('los pesos por sector suman 100 donde existen', () => {
		for (const [key, index] of Object.entries(INDICES)) {
			if (!index.sectors) continue;
			const sum = Object.values(index.sectors).reduce((a, b) => a + b, 0);
			expect(sum, `sectores de ${key}`).toBeCloseTo(100, 6);
		}
	});

	it('solo la renta fija puede no tener desglose sectorial', () => {
		for (const [key, index] of Object.entries(INDICES)) {
			if (index.sectors === null) {
				expect(index.assetClass, `${key} sin sectores`).toBe('bond');
			}
		}
	});

	it('no hay claves de región o sector fuera de las declaradas', () => {
		// Una clave nueva sin traducción saldría en la interfaz como texto crudo.
		for (const [key, index] of Object.entries(INDICES)) {
			for (const region of Object.keys(index.regions)) {
				expect(REGION_KEYS, `región de ${key}`).toContain(region);
			}
			for (const sector of Object.keys(index.sectors ?? {})) {
				expect(SECTOR_KEYS, `sector de ${key}`).toContain(sector);
			}
		}
	});

	it('está fechado, porque son cifras que caducan', () => {
		expect(INDICES_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('cada índice declara de dónde sale su cifra', () => {
		// Sin esto se podría colar un bloque nuevo sin decir si está verificado, y
		// la interfaz lo presentaría con la misma seguridad que los contrastados.
		const valid = ['factsheet', 'derived', 'estimate'];
		for (const [key, index] of Object.entries(INDICES)) {
			expect(valid, `regiones de ${key}`).toContain(index.regionsConfidence);
			expect(valid, `sectores de ${key}`).toContain(index.sectorsConfidence);
		}
	});

	it('los índices que más se usan en España están contrastados con ficha', () => {
		// Si alguno de estos pierde el respaldo, hay que enterarse: son los que
		// aparecen en la mayoría de las carteras indexadas.
		expect(INDICES['msci-world'].regionsConfidence).toBe('factsheet');
		expect(INDICES['msci-world'].sectorsConfidence).toBe('factsheet');
		expect(INDICES['sp500'].regionsConfidence).toBe('factsheet');
		expect(INDICES['sp500'].sectorsConfidence).toBe('factsheet');
	});
});

describe('resolveIndexKey', () => {
	it('reconoce los fondos indexados habituales en España', () => {
		expect(resolveIndexKey('0P1', 'Vanguard Global Stock Index Fund EUR Acc')).toBe('msci-world');
		expect(resolveIndexKey('0P2', 'iShares Developed World Index Fund')).toBe('msci-world');
		expect(resolveIndexKey('0P3', 'Vanguard Emerging Markets Stock Index Fund')).toBe('msci-emerging');
		expect(resolveIndexKey('0P4', 'Fidelity S&P 500 Index Fund')).toBe('sp500');
	});

	it('distingue All-World de World, que es el error que más distorsiona', () => {
		// El All-World lleva emergentes dentro; el World, no.
		expect(resolveIndexKey('VWCE', 'Vanguard FTSE All-World UCITS ETF')).toBe('ftse-all-world');
		expect(resolveIndexKey('IWDA', 'iShares Core MSCI World UCITS ETF')).toBe('msci-world');
		expect(resolveIndexKey('0P5', 'MSCI ACWI Index Fund')).toBe('ftse-all-world');
	});

	it('coge small caps antes que el índice grande del que cuelga', () => {
		expect(resolveIndexKey('0P6', 'Vanguard Global Small-Cap Index Fund')).toBe('msci-world-small');
	});

	it('no confunde renta fija global con renta variable global', () => {
		expect(resolveIndexKey('0P7', 'Vanguard Global Bond Index Fund')).toBe('global-agg-bond');
		expect(resolveIndexKey('0P8', 'Vanguard Euro Government Bond Index Fund')).toBe('euro-govt-bond');
	});

	it('devuelve undefined antes que adivinar', () => {
		// Una acción suelta no replica ningún índice.
		expect(resolveIndexKey('AAPL', 'Apple Inc')).toBeUndefined();
		expect(resolveIndexKey('CASH-EUR', 'Efectivo')).toBeUndefined();
		expect(resolveIndexKey('???', 'Fondo Raro de Autor')).toBeUndefined();
	});

	it('respeta la corrección manual del usuario', () => {
		const asset = { ticker: 'AAPL', name: 'Apple Inc', indexKey: 'sp500' } as Asset;
		expect(indexKeyOf(asset)).toBe('sp500');
	});
});

describe('calculateLookThrough', () => {
	it('revela la concentración en EEUU de una cartera «global»', () => {
		const result = calculateLookThrough([
			makePosition('IWDA', 'iShares Core MSCI World UCITS ETF', 9000),
			makePosition('EIMI', 'iShares MSCI Emerging Markets', 1000)
		]);

		const us = result.regions.find((r) => r.key === 'us');
		// 90 % en un World que es 72,5 % EEUU = ~65 % del total.
		expect(us!.weight).toBeGreaterThan(0.6);
		expect(us!.weight).toBeLessThan(0.7);
		// Y la primera región es EEUU con diferencia.
		expect(result.regions[0].key).toBe('us');
	});

	it('los pesos se calculan sobre lo cubierto, no sobre el total', () => {
		// La mitad de la cartera es una acción suelta sin índice.
		const result = calculateLookThrough([
			makePosition('SP500', 'Fidelity S&P 500 Index Fund', 5000),
			makePosition('AAPL', 'Apple Inc', 5000)
		]);

		expect(result.coveredValue).toBe(5000);
		expect(result.uncoveredValue).toBe(5000);
		expect(result.uncoveredTickers).toEqual(['AAPL']);
		// Sobre lo cubierto, el S&P 500 es 100 % EEUU. Decir «50 % EEUU» sería
		// mezclar lo que sabemos con lo que no.
		expect(result.regions.find((r) => r.key === 'us')!.weight).toBeCloseTo(1, 6);
	});

	it('excluye la renta fija del reparto sectorial en lugar de inventarle sectores', () => {
		const result = calculateLookThrough([
			makePosition('SP500', 'Fidelity S&P 500 Index Fund', 5000),
			makePosition('BONDS', 'Vanguard Global Bond Index Fund', 5000)
		]);

		expect(result.noSectorValue).toBe(5000);
		// Los sectores se reparten solo sobre los 5.000 de renta variable.
		const sectorTotal = result.sectors.reduce((sum, s) => sum + s.value, 0);
		expect(sectorTotal).toBeCloseTo(5000, 6);
		expect(result.sectors.reduce((sum, s) => sum + s.weight, 0)).toBeCloseTo(1, 6);
		// Pero la renta fija sí cuenta para las regiones.
		expect(result.coveredValue).toBe(10000);
	});

	it('no revienta con una cartera vacía', () => {
		const result = calculateLookThrough([]);
		expect(result.regions).toEqual([]);
		expect(result.sectors).toEqual([]);
		expect(result.overlaps).toEqual([]);
		expect(result.coveredValue).toBe(0);
		expect(result.estimatedIndices).toEqual([]);
	});

	it('solo avisa de estimaciones que afectan a esta cartera', () => {
		// Con World y S&P 500, los dos contrastados, no hay nada que advertir.
		const verified = calculateLookThrough([
			makePosition('IWDA', 'iShares Core MSCI World UCITS ETF', 5000),
			makePosition('CSPX', 'iShares Core S&P 500 UCITS ETF', 5000)
		]);
		expect(verified.estimatedIndices).toEqual([]);

		// Al meter un índice sin ficha contrastada, sí se avisa, y por su nombre.
		const withEstimate = calculateLookThrough([
			makePosition('IWDA', 'iShares Core MSCI World UCITS ETF', 5000),
			makePosition('IESE', 'iShares MSCI Europe', 5000)
		]);
		expect(withEstimate.estimatedIndices).toContain('MSCI Europe');
		expect(withEstimate.estimatedIndices).not.toContain('MSCI World');
	});

	it('la exposición a EEUU del MSCI World cuadra con su ficha', () => {
		// 72,5 % a 30-jun-2026. Es la cifra más citada del dataset y la que más
		// sorprende al usuario, así que se fija aquí.
		const result = calculateLookThrough([
			makePosition('IWDA', 'iShares Core MSCI World UCITS ETF', 10000)
		]);
		expect(result.regions.find((r) => r.key === 'us')!.weight).toBeCloseTo(0.725, 3);
	});

	it('el peso de tecnología del S&P 500 cuadra con su ficha', () => {
		const result = calculateLookThrough([
			makePosition('CSPX', 'iShares Core S&P 500 UCITS ETF', 10000)
		]);
		expect(result.sectors.find((s) => s.key === 'tech')!.weight).toBeCloseTo(0.38, 3);
	});

	it('ignora las posiciones sin valor', () => {
		const result = calculateLookThrough([makePosition('IWDA', 'MSCI World', 0)]);
		expect(result.coveredValue).toBe(0);
		expect(result.uncoveredTickers).toEqual([]);
	});
});

describe('detección de solapamiento', () => {
	it('caza el clásico World + S&P 500', () => {
		const result = calculateLookThrough([
			makePosition('IWDA', 'iShares Core MSCI World UCITS ETF', 8000),
			makePosition('CSPX', 'iShares Core S&P 500 UCITS ETF', 2000)
		]);

		expect(result.overlaps).toHaveLength(1);
		const overlap = result.overlaps[0];
		// El lado pequeño limita: 2.000 × 97 % = 1.940.
		expect(overlap.duplicatedValue).toBeCloseTo(1940, 0);
		expect(overlap.duplicatedWeight).toBeCloseTo(0.194, 3);
		expect(overlap.note).toContain('S&P 500');
	});

	it('dos posiciones sobre el mismo índice son duplicación completa', () => {
		const result = calculateLookThrough([
			makePosition('A', 'Vanguard Global Stock Index Fund', 5000),
			makePosition('B', 'iShares Developed World Index Fund', 3000)
		]);

		expect(result.overlaps).toHaveLength(1);
		// Duplicado = el menor de los dos, entero.
		expect(result.overlaps[0].duplicatedValue).toBe(3000);
		expect(result.overlaps[0].note).toBe('same-index');
	});

	it('avisa de que un All-World ya lleva los emergentes dentro', () => {
		const result = calculateLookThrough([
			makePosition('VWCE', 'Vanguard FTSE All-World UCITS ETF', 9000),
			makePosition('EIMI', 'iShares MSCI Emerging Markets', 1000)
		]);

		expect(result.overlaps).toHaveLength(1);
		expect(result.overlaps[0].note).toContain('emergentes');
	});

	it('no inventa solapamiento entre índices que no se pisan', () => {
		const result = calculateLookThrough([
			makePosition('SP500', 'Fidelity S&P 500 Index Fund', 5000),
			makePosition('JP', 'iShares MSCI Japan', 5000)
		]);
		expect(result.overlaps).toEqual([]);
	});

	it('ordena los solapamientos por importe duplicado', () => {
		const result = calculateLookThrough([
			makePosition('VWCE', 'Vanguard FTSE All-World UCITS ETF', 10000),
			makePosition('CSPX', 'iShares Core S&P 500 UCITS ETF', 4000),
			makePosition('EIMI', 'iShares MSCI Emerging Markets', 1000)
		]);

		expect(result.overlaps.length).toBeGreaterThan(1);
		for (let i = 1; i < result.overlaps.length; i++) {
			expect(result.overlaps[i - 1].duplicatedValue).toBeGreaterThanOrEqual(
				result.overlaps[i].duplicatedValue
			);
		}
	});
});

/**
 * Casos escritos leyendo el informe de mutación (7-ago-2026, 79,66 % en este
 * fichero). Son las señales que se probaban en bloque: la detección de solapamiento
 * se comprobaba con casos completos y correctos, así que las guardas intermedias
 * podían caerse de una en una sin que nada fallara.
 *
 * ⚠️ Un grupo de supervivientes se deja vivo a propósito y conviene saber por qué:
 * los de la lista `estimatedIndices` son **inalcanzables con los datos actuales**,
 * porque hoy ningún índice de `indices.json` está marcado como `estimate` ni tiene
 * los sectores a nulo. Cubrirlos exigiría falsear el JSON de índices, y entonces el
 * test afirmaría sobre datos inventados en vez de sobre los que la app usa. Es la
 * misma lección de `csv-utils`: código inalcanzable no siempre es un bug esperando.
 */
describe('las guardas de la detección de solapamiento', () => {
	/**
	 * Una posición sin índice reconocido no comparte nada con nadie, y tiene que
	 * salirse del emparejamiento por los dos lados. Sin un caso por lado, la mitad de
	 * la condición puede desaparecer sin que ningún test se entere.
	 */
	it('una posición sin índice reconocido no genera solapamiento, esté a la izquierda o a la derecha', () => {
		const conocida = makePosition('IWDA', 'iShares Core MSCI World UCITS ETF', 5000);
		const desconocida = makePosition('RARO', 'Fondo Artesanal Sin Índice', 5000);

		expect(calculateLookThrough([desconocida, conocida]).overlaps).toEqual([]);
		expect(calculateLookThrough([conocida, desconocida]).overlaps).toEqual([]);
	});

	/**
	 * El valor duplicado es el **mínimo** de lo que aporta cada lado, no el de uno
	 * cualquiera ni la suma: lo que se solapa no puede ser más de lo que tiene la
	 * posición más pequeña. Con dos posiciones del mismo tamaño el mínimo no se nota,
	 * que es justo por lo que sobrevivía el mutante.
	 */
	it('el valor duplicado lo manda la posición más pequeña', () => {
		const grande = calculateLookThrough([
			makePosition('A', 'Vanguard Global Stock Index Fund', 10000),
			makePosition('B', 'iShares Developed World Index Fund', 1000)
		]);
		expect(grande.overlaps[0].duplicatedValue).toBe(1000);

		// Y al revés, para que no pueda estar cogiendo siempre el segundo.
		const alReves = calculateLookThrough([
			makePosition('A', 'Vanguard Global Stock Index Fund', 1000),
			makePosition('B', 'iShares Developed World Index Fund', 10000)
		]);
		expect(alReves.overlaps[0].duplicatedValue).toBe(1000);
	});

	it('el peso duplicado se mide sobre el total de la cartera', () => {
		const r = calculateLookThrough([
			makePosition('A', 'Vanguard Global Stock Index Fund', 2500),
			makePosition('B', 'iShares Developed World Index Fund', 2500)
		]);
		expect(r.overlaps[0].duplicatedWeight).toBeCloseTo(0.5, 6);
	});

	/**
	 * El orden no es decorativo: la interfaz enseña los primeros, así que un
	 * solapamiento pequeño por delante de uno grande esconde justo lo que hay que ver.
	 */
	it('los solapamientos salen del mayor al menor', () => {
		const r = calculateLookThrough([
			makePosition('A', 'Vanguard Global Stock Index Fund', 10000),
			makePosition('B', 'iShares Developed World Index Fund', 6000),
			makePosition('C', 'iShares Core S&P 500 UCITS ETF', 1000)
		]);

		expect(r.overlaps.length).toBeGreaterThan(1);
		const valores = r.overlaps.map((o) => o.duplicatedValue);
		expect([...valores].sort((a, b) => b - a)).toEqual(valores);
	});

	/**
	 * ⚠️ Ya había un test del orden y **no mataba a sus mutantes**: sus posiciones daban
	 * un orden natural que ya era descendente, así que quitar el `sort` no cambiaba nada.
	 * Mismo error que un fixture anterior — un test que no puede distinguir el arreglo de
	 * su ausencia no defiende nada.
	 *
	 * Esta forma sí: los pares se generan con i<j, así que con dos posiciones minúsculas
	 * delante y dos enormes detrás, el **último** par es el mayor y el orden natural es
	 * ascendente. Es la única disposición en la que ordenar cambia el resultado.
	 */
	it('ordena de mayor a menor aunque el par grande se genere el último', () => {
		const r = calculateLookThrough([
			makePosition('P1', 'Vanguard Global Stock Index Fund', 10),
			makePosition('P2', 'iShares Developed World Index Fund', 10),
			makePosition('G1', 'Amundi Index MSCI World', 50000),
			makePosition('G2', 'Fidelity MSCI World Index Fund', 50000)
		]);

		expect(r.overlaps.length).toBeGreaterThan(1);
		expect(r.overlaps[0].duplicatedValue).toBe(50000);

		const valores = r.overlaps.map((o) => o.duplicatedValue);
		expect([...valores].sort((a, b) => b - a)).toEqual(valores);
	});

	it('una sola posición no se solapa consigo misma', () => {
		const r = calculateLookThrough([
			makePosition('A', 'Vanguard Global Stock Index Fund', 5000)
		]);
		expect(r.overlaps).toEqual([]);
	});
});