import { describe, it, expect } from 'vitest';
import { buildComposition, compositionScaleMax, TOLERANCE_BAND_PP } from './composition';
import type { Asset, PortfolioPosition, PortfolioState } from './types';

/** Posición mínima: solo lo que `buildComposition` mira de verdad. */
function pos(
	ticker: string,
	totalValue: number,
	currentWeight: number,
	targetWeight = 0,
	extra: Partial<Asset> = {}
): PortfolioPosition {
	const asset = {
		ticker,
		name: `Fondo ${ticker}`,
		isin: '',
		targetWeight,
		category: 'core',
		color: '#d97706',
		ter: 0,
		icon: '',
		...extra
	} as Asset;

	return {
		asset,
		holdings: 1,
		avgCost: 1,
		totalCost: totalValue,
		unitPrice: totalValue,
		totalValue,
		currentWeight,
		deviation: currentWeight - targetWeight,
		targetValue: 0,
		targetHoldings: 0,
		profit: 0,
		profitPercent: 0,
		dailyChangeValue: 0,
		dailyChangePercent: 0
	};
}

function state(positions: PortfolioPosition[]): PortfolioState {
	const totalCapital = positions.reduce((s, p) => s + p.totalValue, 0);
	return {
		positions,
		totalCapital,
		totalInvested: totalCapital,
		totalProfit: 0,
		totalProfitPercent: 0,
		totalAnnualCost: 0,
		weightedAverageTer: 0,
		dailyChangeValue: 0,
		dailyChangePercent: 0
	};
}

const vacio = state([]);

/** La cartera de la demo: 80/10/10 en el core, acciones sueltas y algo de caja. */
function demo() {
	return {
		core: state([
			pos('IWDA.AS', 57930, 0.76, 0.8),
			pos('ZPRV.DE', 9925, 0.1302, 0.1),
			pos('EMIM.AS', 8368, 0.1098, 0.1)
		]),
		stocks: state([
			pos('AMZN', 9490, 0.2728, 0, { category: 'stocks' }),
			pos('GOOGL', 9188, 0.2641, 0, { category: 'stocks' })
		]),
		satellite: state([pos('CASH', 5000, 1, 0, { category: 'satellite' })])
	};
}

describe('buildComposition', () => {
	it('agrupa en bloques y ordena cada uno de mayor a menor peso', () => {
		const bloques = buildComposition(demo());
		expect(bloques.map((b) => b.key)).toEqual(['core', 'stocks', 'satellite']);
		expect(bloques[0].rows.map((r) => r.ticker)).toEqual(['IWDA.AS', 'ZPRV.DE', 'EMIM.AS']);
	});

	it('el peso sobre el total suma 1 entre todas las filas', () => {
		const bloques = buildComposition(demo());
		const suma = bloques.flatMap((b) => b.rows).reduce((s, r) => s + r.weightOfTotal, 0);
		expect(suma).toBeCloseTo(1, 10);
	});

	it('conserva el peso dentro del bloque, que es donde viven los objetivos', () => {
		const core = buildComposition(demo())[0];
		expect(core.rows[0].weightOfBlock).toBeCloseTo(0.76, 6);
		expect(core.rows[0].weightOfTotal).toBeLessThan(0.76);
	});

	it('calcula la desviación en puntos porcentuales sobre el bloque', () => {
		const core = buildComposition(demo())[0];
		expect(core.rows[0].deviationPp).toBeCloseTo(-4, 6);
		expect(core.rows[1].deviationPp).toBeCloseTo(3.02, 6);
	});

	/**
	 * La regla que este panel comparte con el mapa de desviación: medido se
	 * decide por los datos, nunca por el nombre del bloque. Así, ponerle
	 * objetivos a los satélites enciende sus barras sin tocar código.
	 */
	it('un bloque se mide si algún activo suyo tiene objetivo, sea cual sea el bloque', () => {
		const bloques = buildComposition(demo());
		expect(bloques.find((b) => b.key === 'core')!.measured).toBe(true);
		expect(bloques.find((b) => b.key === 'stocks')!.measured).toBe(false);

		const conObjetivo = demo();
		conObjetivo.satellite = state([pos('CASH', 5000, 1, 0.5, { category: 'satellite' })]);
		const otra = buildComposition(conObjetivo);
		expect(otra.find((b) => b.key === 'satellite')!.measured).toBe(true);
	});

	it('sin objetivo no hay ni desviación ni banda, en vez de un cero engañoso', () => {
		const acciones = buildComposition(demo()).find((b) => b.key === 'stocks')!;
		for (const row of acciones.rows) {
			expect(row.target).toBeNull();
			expect(row.deviationPp).toBeNull();
			expect(row.inBand).toBeNull();
		}
	});

	/**
	 * Un activo sin objetivo **dentro** de un bloque que sí se mide es la anomalía
	 * que el mapa raya. Aquí se queda sin marca: darle desviación sería repetir su
	 * propio peso disfrazado de distancia a cero.
	 */
	it('un activo a cero dentro de un bloque medido se queda sin objetivo', () => {
		const entrada = demo();
		entrada.core = state([
			pos('IWDA.AS', 57930, 0.76, 0.8),
			pos('HUECO', 9925, 0.24, 0)
		]);
		const core = buildComposition(entrada)[0];
		const hueco = core.rows.find((r) => r.ticker === 'HUECO')!;
		expect(core.measured).toBe(true);
		expect(hueco.deviationPp).toBeNull();
		expect(hueco.inBand).toBeNull();
	});

	it('marca dentro y fuera de banda según el ancho que se le pase', () => {
		const anchaBanda = buildComposition(demo(), 5)[0];
		expect(anchaBanda.rows.map((r) => r.inBand)).toEqual([true, true, true]);

		// Con la banda estrecha, −4,0 pp y +3,02 pp se salen y +0,98 no.
		const estrecha = buildComposition(demo(), 2.5)[0];
		expect(estrecha.rows.map((r) => r.inBand)).toEqual([false, false, true]);
	});

	it('el borde exacto de la banda cuenta como dentro', () => {
		const entrada = demo();
		entrada.core = state([pos('BORDE', 1000, 0.85, 0.8)]);
		expect(buildComposition(entrada, 5)[0].rows[0].inBand).toBe(true);
		expect(buildComposition(entrada, 4.99)[0].rows[0].inBand).toBe(false);
	});

	it('descarta posiciones sin valor y bloques que se quedan vacíos', () => {
		const entrada = { core: state([pos('IWDA.AS', 1000, 1, 1)]), stocks: vacio, satellite: vacio };
		entrada.core.positions.push(pos('CERO', 0, 0, 0));
		const bloques = buildComposition(entrada);
		expect(bloques).toHaveLength(1);
		expect(bloques[0].rows.map((r) => r.ticker)).toEqual(['IWDA.AS']);
	});

	it('no divide por cero con la cartera entera vacía', () => {
		expect(buildComposition({ core: vacio, stocks: vacio, satellite: vacio })).toEqual([]);
	});

	it('la banda por defecto son 5 puntos porcentuales', () => {
		expect(TOLERANCE_BAND_PP).toBe(5);
		expect(buildComposition(demo())).toEqual(buildComposition(demo(), 5));
	});
});

describe('compositionScaleMax', () => {
	/**
	 * ⚠️ **Este test empezó siendo decorativo y el control negativo lo cazó.**
	 * Estaba escrito sobre la cartera demo, donde el objetivo del World equivale
	 * al 52,6 % del total contra una barra del 49,9 %: sí queda por delante, pero
	 * el 8 % de aire de la escala ya lo cubría, así que quitando la línea que
	 * mira los objetivos **el test seguía pasando**.
	 *
	 * Hace falta una cartera donde el objetivo se salga de verdad: un activo al
	 * 40 % con objetivo del 80 % en un bloque que es toda la cartera. Ahí el tope
	 * sin objetivos sería 0,6 × 1,08 = 0,648 y la marca cae en 0,80.
	 */
	it('llega más allá de la marca del objetivo aunque ninguna barra llegue', () => {
		const bloques = buildComposition({
			core: state([pos('INFRA', 400, 0.4, 0.8), pos('SOBRE', 600, 0.6, 0.2)]),
			stocks: vacio,
			satellite: vacio
		});
		const core = bloques[0];
		const marcaInfra = core.rows.find((r) => r.ticker === 'INFRA')!.target! * core.weightOfTotal;
		const barraMasLarga = Math.max(...core.rows.map((r) => r.weightOfTotal));

		expect(marcaInfra).toBeGreaterThan(barraMasLarga * 1.08);
		expect(compositionScaleMax(bloques)).toBeGreaterThan(marcaInfra);
	});

	it('deja aire por encima del máximo en vez de pegarlo al borde', () => {
		const bloques = buildComposition({
			core: state([pos('A', 100, 1, 0)]),
			stocks: vacio,
			satellite: vacio
		});
		expect(compositionScaleMax(bloques)).toBeCloseTo(1.08, 6);
	});

	it('devuelve una escala dibujable sin datos', () => {
		expect(compositionScaleMax([])).toBe(1);
	});
});
