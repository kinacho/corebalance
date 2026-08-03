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
		// 90 % en un World que es 72 % EEUU = ~65 % del total.
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
