import indicesData from './data/indices.json';
import { INDICES, indexKeyOf, findOverlaps, type OverlapFinding } from './lookthrough';
import { instrumentTypeOf } from './instrument-type';
import type { Asset, PortfolioPosition } from './types';

/**
 * Concentración real: cuánto dinero apunta a la misma empresa sumando lo que
 * llega dentro de los fondos y lo que se tiene en directo.
 *
 * Es la pregunta que el mapa del subyacente no contesta. `calculateLookThrough`
 * cruza **pares de fondos** y solo los que tienen índice asignado, así que una
 * acción suelta cae en `uncoveredValue` y desaparece: la cartera de ejemplo de
 * esta app tiene un MSCI World y, aparte, Apple, Microsoft, Amazon y Alphabet
 * —las cuatro mayores posiciones de ese índice— y el análisis no decía nada.
 *
 * Se calcula a nivel de **índice**, igual que el resto del módulo hermano: las
 * mayores posiciones de cada índice viven en `indices.json` y se leyeron de un
 * ETF de réplica física, cuyo ticker queda anotado en `holdingsSource` para que
 * la cifra se pueda volver a comprobar.
 *
 * ⚠️ **Toda cifra que sale de aquí es un MÍNIMO, y eso no es una reserva
 * retórica sino la propiedad que la hace defendible.** El dataset guarda un top
 * diez por índice, así que la cola no se ve: si el usuario tiene Apple dentro de
 * un World, este cálculo acierta esa parte, y si tuviera una empresa que no está
 * en ningún top diez, la contaría como cero en lugar de inventarla. El error
 * solo puede ir en una dirección. La interfaz lo dice con la palabra «al menos»
 * y enseña qué parte de cada índice está viendo.
 */

/** Una empresa del registro: cómo se llama y por qué códigos se la reconoce. */
export interface CompanyDefinition {
	name: string;
	/**
	 * Tickers de Yahoo por los que se la reconoce, incluidas las **clases de
	 * acción** (Alphabet A y C) y los ADR (`TM` es Toyota). Todos verificados
	 * contra Yahoo uno por uno: un alias equivocado no deja hueco, atribuye el
	 * dinero a la empresa que no es.
	 */
	tickers: string[];
	/**
	 * ISIN de cada clase de acción. Puede estar **vacío**: Roche y TSMC no se
	 * pudieron verificar por ida y vuelta, y se prefirió dejarlo sin ISIN antes
	 * que escribir uno sin comprobar.
	 */
	isins: string[];
}

const DATA = indicesData as unknown as {
	holdingsAsOf: string;
	companies: Record<string, CompanyDefinition>;
	indices: Record<string, { name: string; topHoldings?: Record<string, number>; holdingsSource?: string }>;
};

export const COMPANIES = DATA.companies;
export const HOLDINGS_AS_OF = DATA.holdingsAsOf;

/**
 * Prefijo de las claves sintéticas.
 *
 * Una acción en directo que no está en ningún top diez sigue siendo una empresa
 * de la que el usuario tiene dinero, así que entra en el ranking con su propio
 * nombre en lugar de caer en «fuera del análisis» —que se leería como «hemos
 * ignorado tus acciones»—. Lleva prefijo para no poder chocar nunca con una
 * clave del registro.
 */
const PREFIJO_SUELTA = 'ticker:';

/** Índices de búsqueda inversa, construidos una vez. */
const POR_ISIN = new Map<string, string>();
const POR_TICKER = new Map<string, string>();
for (const [clave, empresa] of Object.entries(COMPANIES)) {
	for (const isin of empresa.isins) POR_ISIN.set(isin.toUpperCase(), clave);
	for (const ticker of empresa.tickers) POR_TICKER.set(ticker.toUpperCase(), clave);
}

/**
 * La empresa a la que corresponde un activo, o `undefined`.
 *
 * Resuelve por **ISIN y por ticker exactos, nunca por nombre**. Emparejar
 * nombres es cómo «Apple Hospitality REIT» acaba contando como Apple, y aquí un
 * fallo no deja un hueco visible: mueve dinero de una empresa a otra en una
 * cifra que el usuario va a leer como suya. Mismo criterio conservador que
 * `resolveIndexKey`.
 *
 * El ISIN va primero porque identifica la clase de acción con independencia del
 * mercado: el Apple comprado en Fráncfort cotiza como `APC.DE` y sigue siendo
 * `US0378331005`. Se prueba también el ISIN en el campo `ticker`, porque los
 * importadores de CSV y los fondos que solo existen en FT usan el ISIN como
 * ticker interno de la app.
 */
export function empresaDe(asset: Asset): string | undefined {
	const isin = asset.isin?.toUpperCase().trim();
	if (isin && POR_ISIN.has(isin)) return POR_ISIN.get(isin);

	const ticker = asset.ticker?.toUpperCase().trim();
	if (!ticker) return undefined;
	return POR_TICKER.get(ticker) ?? POR_ISIN.get(ticker);
}

/** De dónde llega el dinero que está expuesto a una empresa. */
export interface FuenteExposicion {
	/** La posición del usuario por la que llega. */
	ticker: string;
	nombre: string;
	/** Índice a través del que llega, o `null` si es tenencia directa. */
	indexKey: string | null;
	valor: number;
}

export interface EmpresaExpuesta {
	clave: string;
	nombre: string;
	/** Euros en divisa base, sumando todas las fuentes. */
	valor: number;
	/** Fracción del patrimonio total, 0–1. */
	peso: number;
	/** Ordenadas de mayor a menor. */
	fuentes: FuenteExposicion[];
	/** Cierto si llega por dos o más posiciones: eso es el solapamiento. */
	solapada: boolean;
	/** Cierto si se tiene suelta **y** dentro de algún fondo. */
	directaYPorFondo: boolean;
}

/** Cuánto de un índice se está viendo de verdad. */
export interface CoberturaIndice {
	indexKey: string;
	nombre: string;
	/** Suma de los pesos del top guardado, 0–100. Lo que el análisis alcanza. */
	pctVisible: number;
	/** Valor de las posiciones del usuario sobre ese índice. */
	valor: number;
}

export interface ResultadoConcentracion {
	empresas: EmpresaExpuesta[];
	/**
	 * Euros que llegan a una empresa por un **segundo camino o más**: para cada
	 * empresa solapada, lo que suman sus fuentes menos la mayor de ellas.
	 *
	 * Es la lectura literal de «solapamiento» y la única que no infla: si tienes
	 * 6.000 € de Apple en directo y 2.470 € más dentro de tu World, lo que se
	 * pisa son 2.470 €, no 8.470 €.
	 */
	valorSolapado: number;
	pesoSolapado: number;
	/** Los pares de fondos que replican índices anidados. */
	solapamientosDeFondos: SolapamientoDeFondos[];
	coberturaPorIndice: CoberturaIndice[];
	/** Índices sin datos de empresa: pequeña capitalización y renta fija. */
	valorSinDatosDeEmpresa: number;
	tickersSinDatosDeEmpresa: string[];
	/** Ni empresa ni índice con datos: efectivo, cripto, fondos no reconocidos. */
	valorFueraDelAnalisis: number;
	tickersFueraDelAnalisis: string[];
	patrimonioTotal: number;
	asOf: string;
}

/**
 * Un par de fondos que se pisan, con el peso recalculado sobre el patrimonio.
 *
 * ⚠️ `duplicatedWeight` de `OverlapFinding` está calculado **sobre el valor
 * cubierto** por el mapa del subyacente. Este panel mide todo sobre el
 * patrimonio total, así que pintar aquel campo tal cual pondría dos porcentajes
 * contiguos midiendo cosas distintas.
 */
export interface SolapamientoDeFondos extends OverlapFinding {
	pesoSobrePatrimonio: number;
	/**
	 * Cierto cuando los dos índices son de renta fija.
	 *
	 * ⚠️ **Existe porque la frase no vale para los dos casos.** «Apuntan a las
	 * mismas empresas» es exacta para dos fondos de bolsa y falsa para el par de
	 * renta fija: la deuda pública de la zona euro dentro de un agregado global se
	 * pisa en **emisiones de deuda**, no en compañías. Nada más añadir esa regla al
	 * dataset, el panel empezó a decirle al usuario que dos fondos de bonos
	 * soberanos comparten empresas. La interfaz tiene una plantilla por caso, que es
	 * lo que este repo ya aprendió con «objetivo sin objetivo».
	 */
	esRentaFija: boolean;
}

export function calcularConcentracion(
	positions: PortfolioPosition[],
	opciones: { patrimonioTotal: number }
): ResultadoConcentracion {
	const { patrimonioTotal } = opciones;

	const acumulado = new Map<string, { nombre: string; fuentes: FuenteExposicion[] }>();
	const valorPorIndice = new Map<string, number>();
	const mapeadas: { position: PortfolioPosition; indexKey: string }[] = [];

	let valorSinDatosDeEmpresa = 0;
	let valorFueraDelAnalisis = 0;
	const tickersSinDatosDeEmpresa: string[] = [];
	const tickersFueraDelAnalisis: string[] = [];

	const anotar = (clave: string, nombre: string, fuente: FuenteExposicion) => {
		const entrada = acumulado.get(clave) ?? { nombre, fuentes: [] };
		entrada.fuentes.push(fuente);
		acumulado.set(clave, entrada);
	};

	for (const position of positions) {
		if (position.totalValue <= 0) continue;
		const asset = position.asset;

		const tipo = instrumentTypeOf(asset);
		const key = indexKeyOf(asset);
		const index = key ? DATA.indices[key] : undefined;

		/**
		 * ⚠️ **Las dos señales se pisan en los dos sentidos, y por eso el orden no
		 * puede ser «primero una y luego la otra».** `resolveIndexKey` empareja por
		 * nombre, así que una acción llamada «World Fuel Services» le casa el
		 * `WORLD` y su dinero se repartiría entre las mayores del MSCI World. Pero
		 * al revés falla igual: `resolveInstrumentType` devuelve `equity` para un
		 * ticker con sufijo de mercado y sin ISIN colectivo, así que un fondo como
		 * `ZPRV.DE` al que le falte el ISIN se leería como una acción.
		 *
		 * Lo que decide es si el activo **está declarado** como fondo: un `indexKey`
		 * puesto a mano o por `normalizeAssets`, o un tipo que ya dice qué es. Solo
		 * cuando no hay declaración se cae en la heurística, y ahí manda `equity`,
		 * que es la señal más fiable de las dos (un ISIN no colectivo no admite
		 * discusión; un nombre sí).
		 */
		const declaradoFondo = asset.indexKey !== undefined || tipo === 'fund' || tipo === 'etf';
		const tratarComoFondo = !!index && (declaradoFondo || tipo !== 'equity');

		if (!tratarComoFondo) {
			if (tipo === 'equity') {
				const clave = empresaDe(asset);
				const nombre = clave ? COMPANIES[clave].name : asset.name;
				anotar(clave ?? PREFIJO_SUELTA + asset.ticker, nombre, {
					ticker: asset.ticker,
					nombre: asset.name,
					indexKey: null,
					valor: position.totalValue
				});
			} else {
				valorFueraDelAnalisis += position.totalValue;
				tickersFueraDelAnalisis.push(asset.ticker);
			}
			continue;
		}

		mapeadas.push({ position, indexKey: key as string });

		if (!index!.topHoldings) {
			valorSinDatosDeEmpresa += position.totalValue;
			tickersSinDatosDeEmpresa.push(asset.ticker);
			continue;
		}

		valorPorIndice.set(key as string, (valorPorIndice.get(key as string) ?? 0) + position.totalValue);

		for (const [clave, peso] of Object.entries(index!.topHoldings)) {
			if (peso <= 0) continue;
			const empresa = COMPANIES[clave];
			if (!empresa) continue;
			anotar(clave, empresa.name, {
				ticker: asset.ticker,
				nombre: asset.name,
				indexKey: key as string,
				valor: position.totalValue * (peso / 100)
			});
		}
	}

	const empresas: EmpresaExpuesta[] = [];
	let valorSolapado = 0;

	for (const [clave, { nombre, fuentes }] of acumulado) {
		fuentes.sort((a, b) => b.valor - a.valor);
		const valor = fuentes.reduce((suma, f) => suma + f.valor, 0);
		if (valor <= 0) continue;

		const solapada = fuentes.length >= 2;
		if (solapada) valorSolapado += valor - fuentes[0].valor;

		empresas.push({
			clave,
			nombre,
			valor,
			peso: patrimonioTotal > 0 ? valor / patrimonioTotal : 0,
			fuentes,
			solapada,
			directaYPorFondo: fuentes.some((f) => f.indexKey === null) && fuentes.some((f) => f.indexKey !== null)
		});
	}

	empresas.sort((a, b) => b.valor - a.valor);

	const coberturaPorIndice: CoberturaIndice[] = [...valorPorIndice.entries()]
		.map(([indexKey, valor]) => {
			const top = DATA.indices[indexKey].topHoldings ?? {};
			return {
				indexKey,
				nombre: INDICES[indexKey]?.name ?? indexKey,
				pctVisible: Object.values(top).reduce((a, b) => a + b, 0),
				valor
			};
		})
		.sort((a, b) => b.valor - a.valor);

	const esBono = (indexKey: string) => INDICES[indexKey]?.assetClass === 'bond';

	const solapamientosDeFondos: SolapamientoDeFondos[] = findOverlaps(mapeadas).map((f) => ({
		...f,
		pesoSobrePatrimonio: patrimonioTotal > 0 ? f.duplicatedValue / patrimonioTotal : 0,
		esRentaFija: esBono(f.indexA) && esBono(f.indexB)
	}));

	return {
		empresas,
		valorSolapado,
		pesoSolapado: patrimonioTotal > 0 ? valorSolapado / patrimonioTotal : 0,
		solapamientosDeFondos,
		coberturaPorIndice,
		valorSinDatosDeEmpresa,
		tickersSinDatosDeEmpresa,
		valorFueraDelAnalisis,
		tickersFueraDelAnalisis,
		patrimonioTotal,
		asOf: DATA.holdingsAsOf
	};
}
