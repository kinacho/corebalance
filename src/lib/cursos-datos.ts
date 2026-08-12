import backtest from '$lib/data/backtest-8020.json';
import indices from '$lib/data/indices.json';
import ter from '$lib/data/ter-myinvestor.json';
import { SAVINGS_TAX_BRACKETS, SAVINGS_TAX_YEAR } from '$lib/fiscal';

/**
 * Las cifras que las lecciones citan, en un solo sitio y derivadas del dato.
 *
 * ⚠️ **Existe porque estaban tecleadas dentro del párrafo.** «45.991 € frente a 42.517 €»,
 * «el 93,6 % en renta variable», «el 72,5 % está en Estados Unidos» y los tramos del
 * ahorro estaban escritos a mano en el markdown, mientras los tres números vivían en
 * `backtest-8020.json`, `indices.json` y `SAVINGS_TAX_BRACKETS`. Regenerar el backtest
 * (`npm run backtest`) o subir el `asOf` de los índices dejaba la prosa mintiendo **sin
 * que nada se pusiera rojo**: es el mismo fallo que este repo documenta media docena de
 * veces, una verdad escrita dos veces y corregida en una copia.
 *
 * Dos usos:
 *
 * 1. Los componentes didácticos reciben estos objetos por props, así que un gráfico no
 *    puede pintar una cifra que no exista en el dato.
 * 2. Una lección que cite una cifra en su prosa o en su gancho la declara en el
 *    frontmatter (`datos: ['backtest.diferencia']`), y `lecciones.test.ts` comprueba que
 *    el texto contiene el valor **vigente**. Si el dato cambia, falla la lección concreta
 *    que lo cita, con su nombre.
 */

/**
 * Euros sin decimales, como se leen en prosa española.
 *
 * ⚠️ `useGrouping: 'always'` no es decoración. El español agrupa a partir de cinco cifras
 * —la convención de la RAE— así que `(3474).toLocaleString('es-ES')` devuelve `3474` y
 * `(45991)` devuelve `45.991`. Puestos uno al lado del otro en la misma tarjeta parecen
 * dos formatos distintos, y el texto de las lecciones ya escribía «3.474 €» a mano. Lo
 * cazó el test de cifras vigentes al no encontrar en la lección el valor que este módulo
 * generaba.
 */
export function eur(n: number): string {
	return Math.round(Math.abs(n)).toLocaleString('es-ES', { useGrouping: 'always' });
}

/** Porcentaje con los decimales que tenga, con coma decimal. */
export function pct(n: number): string {
	return n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

export interface Procedencia {
	/** Cómo se cita al pie de un objeto visual. */
	fuente: string;
	/** La fecha del dato, no la de hoy. */
	fecha: string;
}

// ── El backtest 80/20 ──────────────────────────────────────────────────────────

const nunca = backtest.scenarios.never;
const anual = backtest.scenarios.annual;

/**
 * ⚠️ El JSON tiene **los extremos y los agregados, no la serie de 199 meses**. Cualquier
 * gráfico de líneas del backtest tendría que inventarse el camino entre 2010 y 2026, que
 * es exactamente lo que este sitio no hace. Lo que sí se puede dibujar son los dos
 * extremos y la deriva, que además es donde está el argumento.
 */
export const BACKTEST = {
	desde: backtest.period.from,
	hasta: backtest.period.to,
	objetivoRV: backtest.targetAllocation.equity,
	inicial: backtest.initialCapital,
	sinRebalancear: {
		valorFinal: nunca.finalValue,
		pesoRVFinal: nunca.finalEquityWeight,
		caidaMaxima: nunca.maxDrawdown
	},
	rebalanceado: {
		valorFinal: anual.finalValue,
		pesoRVFinal: anual.finalEquityWeight,
		caidaMaxima: anual.maxDrawdown
	},
	/** Positivo: lo que ganó de más quien no rebalanceó nunca. */
	diferencia: Math.abs(backtest.difference.finalValue),
	derivaPuntos: backtest.difference.equityWeightDrift,
	supuestos: backtest.assumptions,
	procedencia: {
		fuente: backtest.source.es,
		fecha: backtest.generatedAt
	} satisfies Procedencia
};

// ── La escala del ahorro ───────────────────────────────────────────────────────

/**
 * Los cinco tramos, con el techo del último expresado como el infinito que es.
 * `upTo` es el techo del tramo, así que el suelo es el techo del anterior.
 */
export const TRAMOS_AHORRO = SAVINGS_TAX_BRACKETS.map((tramo, i) => ({
	desde: i === 0 ? 0 : SAVINGS_TAX_BRACKETS[i - 1].upTo,
	hasta: Number.isFinite(tramo.upTo) ? tramo.upTo : null,
	tipo: Math.round(tramo.rate * 100)
}));

export const ESCALA_AHORRO = {
	anio: SAVINGS_TAX_YEAR,
	tramos: TRAMOS_AHORRO,
	procedencia: {
		fuente: 'Ley 35/2006 del IRPF, escala del ahorro',
		fecha: `Ejercicio ${SAVINGS_TAX_YEAR}`
	} satisfies Procedencia
};

// ── Los índices ────────────────────────────────────────────────────────────────

type ClaveIndice = keyof typeof indices.indices;

function indice(clave: ClaveIndice) {
	return indices.indices[clave];
}

/** El peso de una región en un índice, leído del JSON y no de la memoria. */
export function pesoRegion(clave: ClaveIndice, region: string): number {
	return (indice(clave).regions as Record<string, number>)[region] ?? 0;
}

/** El peso de un sector en un índice. */
export function pesoSector(clave: ClaveIndice, sector: string): number {
	return (indice(clave).sectors as Record<string, number>)[sector] ?? 0;
}

/** Cuánto del índice `a` está también dentro del índice `b`. */
export function solapamiento(a: ClaveIndice, b: ClaveIndice) {
	const par = indices.overlaps.find((o) => o.a === a && o.b === b);
	if (!par) throw new Error(`No hay solapamiento declarado entre ${a} y ${b}`);
	return { deA: par.sharedWeightOfA, deB: par.sharedWeightOfB, nota: par.note };
}

export const INDICES = {
	asOf: indices.asOf,
	procedencia: {
		fuente: 'Fichas oficiales de MSCI, S&P Dow Jones y FTSE Russell',
		fecha: indices.asOf
	} satisfies Procedencia
};

// ── Los costes corrientes reales ───────────────────────────────────────────────

/**
 * El gasto corriente de los fondos indexados que se pueden contratar hoy desde España,
 * leído ficha a ficha del DFI.
 *
 * ⚠️ Se usa para no escribir «los indexados rondan el 0,20 %» de memoria: la banda sale
 * del dato, con su fecha. Las advertencias del propio conjunto —que el gasto corriente
 * cambia de una clase a otra del mismo fondo, y que no incluye ni los costes de
 * transacción del fondo ni las comisiones del bróker— son justo el contenido de la
 * lección de costes, así que viajan con él.
 */
const fondosIndexados = ter.funds.filter((f) => f.vehicle === 'fund');

export const TER_INDEXADOS = {
	minimo: Math.min(...fondosIndexados.map((f) => f.ongoingCharges)),
	maximo: Math.max(...fondosIndexados.map((f) => f.ongoingCharges)),
	cuantos: fondosIndexados.length,
	advertencias: ter.caveats.es,
	procedencia: {
		fuente: ter.source.es,
		fecha: ter.compiledAt
	} satisfies Procedencia
};

// ── El registro que vigila la deriva ───────────────────────────────────────────

/**
 * Las cifras que una lección puede citar en su texto, con el valor vigente.
 *
 * Una lección que escriba una de ellas la declara en su frontmatter `datos:`, y el test
 * comprueba que el fichero contiene **este** valor. Añadir una entrada aquí es lo que
 * convierte un número de la prosa en un número vigilado.
 */
export const CIFRAS_VIGILADAS: Record<string, string> = {
	'backtest.diferencia': eur(BACKTEST.diferencia),
	'backtest.sinRebalancear.valorFinal': eur(BACKTEST.sinRebalancear.valorFinal),
	'backtest.rebalanceado.valorFinal': eur(BACKTEST.rebalanceado.valorFinal),
	'backtest.sinRebalancear.pesoRVFinal': pct(BACKTEST.sinRebalancear.pesoRVFinal),
	'backtest.derivaPuntos': pct(BACKTEST.derivaPuntos),
	'indices.worldEnEEUU': pct(pesoRegion('msci-world', 'us')),
	'indices.worldEnTecnologia': pct(pesoSector('msci-world', 'tech')),
	'indices.allWorldEnEEUU': pct(pesoRegion('ftse-all-world', 'us')),
	'solape.worldSp500': pct(solapamiento('msci-world', 'sp500').deA),
	'solape.worldNasdaq': pct(solapamiento('msci-world', 'nasdaq-100').deA)
};
