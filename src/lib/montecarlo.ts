/**
 * El **cono de escenarios** de la proyección: en vez de una línea, un abanico.
 *
 * ⚠️ **Una sola línea determinista es la mentira más educada del panel.** Decía
 * «en veinte años tendrás 702.854,19 €» cuando lo que quiere decir es «si
 * aciertas el 7 % todos y cada uno de los 240 meses, saldría esto». Ningún año
 * rinde su media. Enseñar el rango no es un adorno: es la diferencia entre una
 * estimación y una promesa, y esta app se define por no hacer promesas.
 *
 * ⚠️ **`annualReturn` es la MEDIANA, no la media aritmética.** Es la lectura que
 * el deslizador ya sugiere —«mi 7 %»— y la que hace que la línea central del
 * abanico crezca exactamente a ese ritmo: con log-rendimientos normales de media
 * `ln(1+r)/12` al mes, la mediana del capital compone justo a `(1+r)^años`. Con
 * la media aritmética la línea central quedaría por debajo del 7 % y nadie
 * entendería por qué.
 *
 * **Determinista a propósito.** Toma una semilla y usa un generador propio en
 * lugar de `Math.random()`, por la misma razón que `calculateTaxAwareRebalance()`
 * recibe `now`: sin eso no hay test posible, y un gráfico que cambia de forma
 * cada vez que mueves un deslizador que no le afecta parece roto.
 */

/**
 * Generador congruencial rápido (mulberry32). No es criptográfico y no
 * pretende serlo: hace falta que sea reproducible y que reparta bien, no que
 * sea impredecible.
 */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return function () {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Normal estándar por Box-Muller.
 *
 * Se descarta el segundo valor del par a propósito: guardarlo acopla llamadas
 * consecutivas y hace que el resultado dependa de cuántas veces se llamó antes,
 * que es justo lo que rompe la reproducibilidad al cambiar el número de meses.
 */
function normal(rand: () => number): number {
	let u = 0;
	while (u === 0) u = rand(); // `ln(0)` es −∞
	const v = rand();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface SimulationInput {
	initial: number;
	monthlyContribution: number;
	years: number;
	/** Rendimiento anual **mediano**, en tanto por uno (0.07 = 7 %). */
	annualReturn: number;
	/** Volatilidad anual, en tanto por uno (0.15 = 15 %). */
	annualVolatility: number;
	/** Caminos simulados. Más caminos, percentiles más estables y más coste. */
	paths?: number;
	seed?: number;
}

export interface ScenarioBand {
	/** Año desde el inicio, de 0 a `years`. */
	year: number;
	/** Capital aportado acumulado: no es una estimación, es aritmética. */
	contributed: number;
	p10: number;
	p25: number;
	p50: number;
	p75: number;
	p90: number;
}

/** Percentil por interpolación lineal sobre una muestra **ya ordenada**. */
export function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0;
	if (sorted.length === 1) return sorted[0];
	const pos = (sorted.length - 1) * p;
	const lo = Math.floor(pos);
	const hi = Math.ceil(pos);
	if (lo === hi) return sorted[lo];
	return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Simula la evolución del capital y devuelve una banda de percentiles por año.
 *
 * Con volatilidad cero devuelve el caso determinista de siempre —los cinco
 * percentiles coinciden—, así que el gráfico degenera limpiamente en la línea
 * única en lugar de romperse.
 */
export function simulateScenarios(input: SimulationInput): ScenarioBand[] {
	const {
		initial,
		monthlyContribution,
		years,
		annualReturn,
		annualVolatility,
		paths = 600,
		seed = 0x5eed
	} = input;

	const months = Math.max(0, Math.round(years * 12));
	if (months === 0) {
		return [{ year: 0, contributed: initial, p10: initial, p25: initial, p50: initial, p75: initial, p90: initial }];
	}

	// Mediana anual `r` ⇒ deriva mensual del log-rendimiento `ln(1+r)/12`.
	const monthlyDrift = Math.log(1 + annualReturn) / 12;
	const monthlySigma = annualVolatility / Math.sqrt(12);

	const rand = mulberry32(seed);

	/** `valuesByYear[y]` = capital de cada camino al final del año `y`. */
	const valuesByYear: number[][] = Array.from({ length: years + 1 }, () => []);

	for (let path = 0; path < paths; path++) {
		let value = initial;
		valuesByYear[0].push(value);

		for (let m = 1; m <= months; m++) {
			const shock = monthlySigma === 0 ? 0 : monthlySigma * normal(rand);
			value = value * Math.exp(monthlyDrift + shock) + monthlyContribution;

			if (m % 12 === 0) {
				const year = m / 12;
				if (year <= years) valuesByYear[year].push(value);
			}
		}
	}

	return valuesByYear.map((values, year) => {
		const sorted = [...values].sort((a, b) => a - b);
		return {
			year,
			contributed: initial + monthlyContribution * year * 12,
			p10: percentile(sorted, 0.1),
			p25: percentile(sorted, 0.25),
			p50: percentile(sorted, 0.5),
			p75: percentile(sorted, 0.75),
			p90: percentile(sorted, 0.9)
		};
	});
}
