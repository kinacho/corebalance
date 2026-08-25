import indicesData from './data/indices.json';
import type { Asset, PortfolioPosition } from './types';

/**
 * Transparencia del subyacente: a qué está expuesta de verdad una cartera
 * indexada.
 *
 * El inversor indexado sabe que tiene «un MSCI World y un poco de emergentes» y
 * no sabe que eso son tres cuartas partes en EEUU, ni que su World y su S&P 500
 * apuntan a las mismas empresas. Esto lo calcula a nivel de **índice**, nunca de
 * posición individual: la composición exacta de un fondo se mueve a diario y no
 * hay forma de tenerla al día sin una fuente de pago, mientras que los pesos por
 * región y sector de un índice se mueven despacio y se pueden mantener a mano.
 *
 * Todo lo que sale de aquí es una **estimación redondeada** y está etiquetado
 * como tal en la interfaz. Ver la nota del propio `indices.json`.
 */

/**
 * De dónde sale cada cifra del dataset.
 *
 * Existe porque no todos los índices se pudieron contrastar contra su ficha
 * oficial, y un mapa que mezcla números leídos con números estimados sin
 * distinguirlos es peor que uno que admite lo que no sabe. La interfaz avisa
 * cuando la cartera del usuario depende de un bloque `estimate`.
 */
export type WeightConfidence = 'factsheet' | 'derived' | 'estimate';

export interface IndexDefinition {
	name: string;
	assetClass: 'equity' | 'bond';
	coverage: string;
	regionsConfidence: WeightConfidence;
	sectorsConfidence: WeightConfidence;
	regions: Record<string, number>;
	sectors: Record<string, number> | null;
	/**
	 * El top diez del índice, con su peso. **Opcional a propósito**: los dos de
	 * renta fija y el de small caps no lo llevan, y esa ausencia es una decisión
	 * fijada por un test —un bono del Estado no es exposición a una empresa, y en
	 * un índice de pequeñas la mayor posición pesa 1,65 %, así que su top diez no
	 * dice nada sobre concentración—.
	 *
	 * Ya estaba en el JSON y lo leía `concentracion.ts` con su propia conversión de
	 * tipo; se declara aquí para que haya **un** tipo del índice y no dos vistas
	 * parciales del mismo dato.
	 */
	topHoldings?: Record<string, number>;
	/** El ETF de réplica física del que se leyó `topHoldings`, para poder recomprobarlo. */
	holdingsSource?: string;
}

export interface OverlapRule {
	a: string;
	b: string;
	sharedWeightOfA: number;
	sharedWeightOfB: number;
	note: string;
}

const DATA = indicesData as unknown as {
	asOf: string;
	note: string;
	regionLabels: string[];
	sectorLabels: string[];
	indices: Record<string, IndexDefinition>;
	overlaps: OverlapRule[];
};

export const INDICES = DATA.indices;
export const REGION_KEYS = DATA.regionLabels;
export const SECTOR_KEYS = DATA.sectorLabels;
export const INDICES_AS_OF = DATA.asOf;

/**
 * Adivina qué índice replica un activo a partir de su nombre.
 *
 * Deliberadamente conservador: devuelve `null` en cuanto hay ambigüedad, porque
 * un índice mal asignado no produce un hueco en el mapa sino un mapa que miente
 * con aplomo. El usuario puede corregirlo a mano desde la gestión de activos.
 *
 * El orden importa: lo más específico primero. «MSCI World Small Cap» tiene que
 * cazar antes que «MSCI World», y «All-World» antes que «World».
 */
export function resolveIndexKey(ticker: string = '', name: string = ''): string | undefined {
	const n = `${name} ${ticker}`.toUpperCase();

	const has = (...needles: string[]) => needles.some((needle) => n.includes(needle));

	// Renta fija primero: un fondo de bonos global también dice «GLOBAL».
	if (has('AGGREGATE', 'GLOBAL BOND', 'RENTA FIJA GLOBAL')) return 'global-agg-bond';
	if (has('EURO GOVERNMENT', 'DEUDA PÚBLICA', 'GOBIERNOS EURO', 'EURO GOVT', 'EUROZONE GOVERNMENT')) {
		return 'euro-govt-bond';
	}

	// Small caps antes que el índice grande del que cuelgan. Las tres grafías
	// conviven en los nombres reales de los fondos: «Small Cap», «Small-Cap» y
	// «SmallCap».
	if (has('SMALL CAP', 'SMALL-CAP', 'SMALLCAP', 'PEQUEÑA CAPITALIZACIÓN')) {
		return 'msci-world-small';
	}

	if (has('NASDAQ', 'NDX')) return 'nasdaq-100';
	if (has('S&P 500', 'S&P500', 'SP500', 'SPY', 'VOO', 'CSPX')) return 'sp500';
	if (has('IBEX')) return 'ibex-35';

	// «All-World» y «ACWI» incluyen emergentes; «World» a secas, no. Confundirlos
	// es el error que más distorsiona el mapa, así que van antes.
	if (has('ALL-WORLD', 'ALL WORLD', 'ACWI', 'GLOBAL ALL CAP')) return 'ftse-all-world';
	if (has('EMERGING', 'EMERGENTES', 'EMIM', 'EIMI')) return 'msci-emerging';
	if (has('JAPAN', 'JAPÓN', 'NIKKEI', 'TOPIX')) return 'msci-japan';
	if (has('EUROPE', 'EUROPA', 'STOXX EUROPE')) return 'msci-europe';
	if (has('WORLD', 'MUNDIAL', 'GLOBAL STOCK', 'MSCI WORLD')) return 'msci-world';

	return undefined;
}

/** El índice de un activo, respetando la corrección manual si existe. */
export function indexKeyOf(asset: Asset): string | undefined {
	if (asset.indexKey) return asset.indexKey;
	return resolveIndexKey(asset.ticker, asset.name);
}

/**
 * El ETF que sirve de **referencia de precio** para el índice de un activo, si lo hay.
 *
 * Se usa para reconstruir el patrimonio de los días en que no existe valor liquidativo del
 * fondo del usuario —Yahoo no cubre todas las clases desde siempre— arrastrando el hueco con
 * la forma del índice en lugar de con una recta. Ver `alignPriceSeriesWithProxy`.
 *
 * ⚠️ Devuelve un **ETF cotizado en euros**, no el índice: los índices se publican en dólares y
 * arrastrar un fondo en euros con una serie en dólares mete el movimiento del par del periodo,
 * que es más error del que se venía a corregir. El razonamiento completo y los datos de
 * verificación están en `priceProxyNote` dentro de `indices.json`.
 *
 * Sólo cinco índices lo tienen (World, All-World, S&P 500, Emerging y World Small Cap). Los
 * demás devuelven `undefined` a propósito: sin proxy no se rellena, y el gráfico arranca donde
 * hay dato real.
 */
export function priceProxyOf(asset: Asset): string | undefined {
	const key = indexKeyOf(asset);
	if (!key) return undefined;
	const index = (indicesData.indices as Record<string, { priceProxy?: { ticker: string } }>)[key];
	return index?.priceProxy?.ticker;
}

export interface ExposureSlice {
	key: string;
	/** Fracción del patrimonio cubierto, 0–1. */
	weight: number;
	value: number;
}

export interface OverlapFinding {
	tickerA: string;
	tickerB: string;
	nameA: string;
	nameB: string;
	indexA: string;
	indexB: string;
	/** Euros que, estimados, apuntan a las mismas empresas por los dos lados. */
	duplicatedValue: number;
	/** Fracción del patrimonio cubierto que está duplicada, 0–1. */
	duplicatedWeight: number;
	note: string;
}

export interface LookThroughResult {
	regions: ExposureSlice[];
	sectors: ExposureSlice[];
	overlaps: OverlapFinding[];
	/** Valor de las posiciones a las que se ha podido asignar un índice. */
	coveredValue: number;
	/** Valor sin índice conocido: acciones sueltas, efectivo, cripto. */
	uncoveredValue: number;
	/** Tickers sin índice asignado, para poder decirle al usuario qué falta. */
	uncoveredTickers: string[];
	/** Cubierto sin desglose sectorial: la renta fija no tiene sectores. */
	noSectorValue: number;
	/**
	 * Nombres de los índices cuyos pesos son estimación sin ficha contrastada y
	 * que **de hecho** pesan en esta cartera. Vacío si todo lo que el usuario
	 * tiene está verificado, que es el caso de una cartera indexada corriente.
	 */
	estimatedIndices: string[];
	asOf: string;
}

/**
 * Reparte el valor de cada posición entre regiones y sectores según el índice
 * que replica, y detecta solapamientos entre posiciones.
 *
 * Los pesos que devuelve son **sobre el valor cubierto**, no sobre el
 * patrimonio total. Si un 20 % de la cartera son acciones sueltas sin índice
 * asignado, decir «62 % EEUU» sobre el total sería falso; sobre lo cubierto es
 * exacto, y `uncoveredValue` deja ver cuánto se ha quedado fuera.
 */
export function calculateLookThrough(positions: PortfolioPosition[]): LookThroughResult {
	const regionTotals: Record<string, number> = {};
	const sectorTotals: Record<string, number> = {};
	for (const key of REGION_KEYS) regionTotals[key] = 0;
	for (const key of SECTOR_KEYS) sectorTotals[key] = 0;

	let coveredValue = 0;
	let uncoveredValue = 0;
	let noSectorValue = 0;
	const uncoveredTickers: string[] = [];

	/** Posiciones con índice, para el cruce de solapamientos. */
	const mapped: { position: PortfolioPosition; indexKey: string }[] = [];

	for (const position of positions) {
		if (position.totalValue <= 0) continue;

		const key = indexKeyOf(position.asset);
		const index = key ? INDICES[key] : undefined;

		if (!key || !index) {
			uncoveredValue += position.totalValue;
			uncoveredTickers.push(position.asset.ticker);
			continue;
		}

		coveredValue += position.totalValue;
		mapped.push({ position, indexKey: key });

		const regionSum = Object.values(index.regions).reduce((a, b) => a + b, 0);
		for (const [region, weight] of Object.entries(index.regions)) {
			if (weight <= 0) continue;
			regionTotals[region] = (regionTotals[region] ?? 0) + position.totalValue * (weight / regionSum);
		}

		if (!index.sectors) {
			noSectorValue += position.totalValue;
			continue;
		}
		const sectorSum = Object.values(index.sectors).reduce((a, b) => a + b, 0);
		for (const [sector, weight] of Object.entries(index.sectors)) {
			if (weight <= 0) continue;
			sectorTotals[sector] = (sectorTotals[sector] ?? 0) + position.totalValue * (weight / sectorSum);
		}
	}

	const sectorBase = coveredValue - noSectorValue;

	const toSlices = (totals: Record<string, number>, base: number): ExposureSlice[] =>
		Object.entries(totals)
			.filter(([, value]) => value > 0)
			.map(([key, value]) => ({ key, value, weight: base > 0 ? value / base : 0 }))
			.sort((a, b) => b.value - a.value);

	// Solo se avisa de las estimaciones que afectan a esta cartera: listar las
	// del dataset entero sería ruido sobre índices que el usuario no tiene.
	const estimatedIndices = [
		...new Set(
			mapped
				.filter(({ indexKey }) => {
					const index = INDICES[indexKey];
					return (
						index.regionsConfidence === 'estimate' ||
						(index.sectors !== null && index.sectorsConfidence === 'estimate')
					);
				})
				.map(({ indexKey }) => INDICES[indexKey].name)
		)
	];

	return {
		regions: toSlices(regionTotals, coveredValue),
		sectors: toSlices(sectorTotals, sectorBase),
		overlaps: findOverlaps(mapped),
		coveredValue,
		uncoveredValue,
		uncoveredTickers,
		noSectorValue,
		estimatedIndices,
		asOf: DATA.asOf
	};
}

/**
 * Cruza cada par de posiciones y estima cuánto dinero apunta dos veces a las
 * mismas empresas.
 *
 * Exportada porque `concentracion.ts` la reutiliza para la capa de fondos de su
 * panel: es la misma pregunta y tiene guardas escritas a partir de un informe
 * de mutación, así que reescribirla allí sería perderlas.
 *
 * La cifra es `min(valorA × compartidoA, valorB × compartidoB)`: el solape no
 * puede ser mayor que lo que aporta el lado más pequeño. Dos posiciones sobre el
 * mismo índice son duplicación completa del menor de los dos.
 */
export function findOverlaps(mapped: { position: PortfolioPosition; indexKey: string }[]): OverlapFinding[] {
	const findings: OverlapFinding[] = [];

	for (let i = 0; i < mapped.length; i++) {
		for (let j = i + 1; j < mapped.length; j++) {
			const a = mapped[i];
			const b = mapped[j];

			let sharedA: number | null = null;
			let sharedB: number | null = null;
			let note = '';

			if (a.indexKey === b.indexKey) {
				sharedA = 100;
				sharedB = 100;
				note = 'same-index';
			} else {
				const rule = DATA.overlaps.find(
					(r) =>
						(r.a === a.indexKey && r.b === b.indexKey) || (r.a === b.indexKey && r.b === a.indexKey)
				);
				if (rule) {
					const straight = rule.a === a.indexKey;
					sharedA = straight ? rule.sharedWeightOfA : rule.sharedWeightOfB;
					sharedB = straight ? rule.sharedWeightOfB : rule.sharedWeightOfA;
					note = rule.note;
				}
			}

			if (sharedA === null || sharedB === null) continue;

			const duplicatedValue = Math.min(
				a.position.totalValue * (sharedA / 100),
				b.position.totalValue * (sharedB / 100)
			);
			if (duplicatedValue <= 0) continue;

			findings.push({
				tickerA: a.position.asset.ticker,
				tickerB: b.position.asset.ticker,
				nameA: a.position.asset.name,
				nameB: b.position.asset.name,
				indexA: a.indexKey,
				indexB: b.indexKey,
				duplicatedValue,
				duplicatedWeight: 0, // se rellena abajo, cuando se conoce el total
				note
			});
		}
	}

	const total = mapped.reduce((sum, m) => sum + m.position.totalValue, 0);
	for (const finding of findings) {
		finding.duplicatedWeight = total > 0 ? finding.duplicatedValue / total : 0;
	}

	return findings.sort((a, b) => b.duplicatedValue - a.duplicatedValue);
}
