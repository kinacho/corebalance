import type { Asset, PortfolioPosition, Transaction } from './types';
import type { InstrumentType } from './types';
import { instrumentTypeOf, canBeTransferred, isTaxableOnSale } from './instrument-type';
import {
	indexKeyOf,
	INDICES,
	INDICES_AS_OF,
	type OverlapFinding,
	type WeightConfidence
} from './lookthrough';
import { COMPANIES, HOLDINGS_AS_OF, type ResultadoConcentracion } from './concentracion';
import {
	buildFifoLots,
	simulateSale,
	calculateSavingsTax,
	checkAntiApplicationRule
} from './fiscal';

/**
 * Lo que la app **ya sabe** de una posición y no le contaba a nadie.
 *
 * Este módulo no calcula nada nuevo: reúne por activo lo que ya producen
 * `instrument-type`, `lookthrough`, `concentracion` y `fiscal`. Sale del
 * componente por el criterio de siempre en este repo —**decide cosas de dinero**,
 * así que necesita tests— y porque el modal donde se pinta ya son novecientas y
 * pico líneas.
 *
 * ⚠️ **Toda cifra fiscal de aquí es una estimación y depende del libro.** Sin
 * transacciones no hay lotes, y sin lotes no hay ni plusvalía ni factura: el
 * campo `estado` lo dice explícitamente en vez de devolver un cero. Un cero ahí
 * no sería «no debes nada», sería una cifra inventada — el defecto que este repo
 * lleva documentado desde el importador que metía activos a coste 0.
 */

export type EstadoFiscal =
	/** No hay libro para este activo: no se puede calcular, y se dice. */
	| 'sin-libro'
	/** Hay libro pero no cubre todas las participaciones: el resultado es parcial. */
	| 'parcial'
	/** El libro cubre la posición entera. */
	| 'completa';

export interface FichaRecompra {
	/** 2 meses para lo cotizado, 12 para las participaciones de fondo. */
	ventanaMeses: number;
	/** Cierto si hay compras dentro de la ventana. La pérdida se difiere, no se pierde. */
	bloqueada: boolean;
	/** Días que faltan para poder recomprar sin diferir la pérdida. */
	diasParaRecomprar: number | null;
}

export interface FichaFiscal {
	estado: EstadoFiscal;
	/** Positivo = ganancia latente. `null` si no se puede calcular. */
	plusvalia: number | null;
	/** Lo que pagarías por esa ganancia con la escala del ahorro. `null` si no se puede. */
	factura: number | null;
	/** Valor de adquisición de lo que tienes, en divisa base. */
	costeAdquisicion: number | null;
	/** Fecha de compra del lote vivo más antiguo. */
	fechaLoteMasAntiguo: number | null;
	/** Solo cuando la posición está en pérdidas: ahí es donde la regla muerde. */
	recompra: FichaRecompra | null;
}

export interface FichaPeso {
	clave: string;
	/**
	 * Cómo se llama de verdad.
	 *
	 * ⚠️ Para las mayores posiciones **no vale la clave**: en el dataset son
	 * identificadores en minúscula (`nvidia`, `alphabet`), y pintarlos tal cual deja
	 * una lista de empresas escritas en minúscula. Se resuelven contra el registro
	 * de `concentracion.ts`, que es donde vive el nombre correcto de cada una — el
	 * mismo que ya usa el panel de concentración. Para regiones y sectores la
	 * traducción la pone la interfaz, así que ahí queda igual a la clave.
	 */
	nombre: string;
	/** 0–100, como viene en el dataset. */
	peso: number;
}

export interface FichaIndice {
	clave: string;
	nombre: string;
	/** La frase en castellano que describe qué cubre el índice. */
	cobertura: string;
	regiones: FichaPeso[];
	sectores: FichaPeso[] | null;
	fiabilidadRegiones: WeightConfidence;
	fiabilidadSectores: WeightConfidence;
	/** Top diez, de mayor a menor. Vacío para los índices que no lo llevan. */
	mayoresPosiciones: FichaPeso[];
	/** El ETF del que se leyeron esas posiciones, para poder recomprobarlas. */
	leidoDe: string | null;
	fechaPesos: string;
	fechaPosiciones: string;
}

export interface FichaSolapamientoConFondo {
	ticker: string;
	nombre: string;
	/** Euros que, estimados, apuntan a las mismas empresas por los dos lados. */
	valorDuplicado: number;
	nota: string;
}

export interface FichaEmpresaCompartida {
	nombre: string;
	/** Euros que llegan a esa empresa **por esta posición**. */
	valorAqui: number;
	/** Las otras posiciones por las que también llega. */
	tambienPor: string[];
}

export interface FichaSolapamiento {
	fondos: FichaSolapamientoConFondo[];
	empresas: FichaEmpresaCompartida[];
}

export interface FichaActivo {
	tipo: InstrumentType;
	/** Solo un fondo puede traspasarse sin tributar (art. 94 LIRPF). */
	traspasable: boolean;
	tributaAlVender: boolean;
	/** 0–1, como lo guarda el activo. */
	ter: number;
	/** Lo que ese TER cuesta al año sobre esta posición. `null` sin posición. */
	terAnualEnEuros: number | null;
	indice: FichaIndice | null;
	fiscal: FichaFiscal;
	solapamiento: FichaSolapamiento;
}

export interface EntradaFicha {
	asset: Asset;
	posicion: PortfolioPosition | undefined;
	transacciones: Transaction[];
	/**
	 * Precio por participación **ya convertido a divisa base**.
	 *
	 * ⚠️ Se pide convertido, y no el precio más el cambio, por la misma razón que
	 * lo pide `simulateSale`: de aplicar el tipo de cambio dos veces salió un bug
	 * histórico. En el store esto es `perShareBase[ticker]`.
	 */
	precioBasePorParticipacion: number;
	/** Los hallazgos de `findOverlaps()` de toda la cartera; aquí se filtran. */
	solapamientos: OverlapFinding[];
	concentracion: ResultadoConcentracion | null;
	/** Fecha de referencia. Explícita para que los tests no dependan del día. */
	ahora: number;
}

/**
 * Ordena un mapa de pesos de mayor a menor y lo deja en forma de lista.
 *
 * `nombrar` traduce la clave a lo que se enseña. Por defecto la deja igual —para
 * regiones y sectores el rótulo lo pone la interfaz—, y las empresas pasan el
 * registro de `COMPANIES`.
 */
function porPeso(
	pesos: Record<string, number> | null | undefined,
	nombrar: (clave: string) => string = (clave) => clave
): FichaPeso[] {
	if (!pesos) return [];
	return Object.entries(pesos)
		.filter(([, peso]) => peso > 0)
		.map(([clave, peso]) => ({ clave, nombre: nombrar(clave), peso }))
		.sort((a, b) => b.peso - a.peso);
}

function fichaDelIndice(asset: Asset): FichaIndice | null {
	const clave = indexKeyOf(asset);
	if (!clave) return null;
	const definicion = INDICES[clave];
	if (!definicion) return null;

	return {
		clave,
		nombre: definicion.name,
		cobertura: definicion.coverage,
		regiones: porPeso(definicion.regions),
		sectores: definicion.sectors ? porPeso(definicion.sectors) : null,
		fiabilidadRegiones: definicion.regionsConfidence,
		fiabilidadSectores: definicion.sectorsConfidence,
		mayoresPosiciones: porPeso(definicion.topHoldings, (clave) => COMPANIES[clave]?.name ?? clave),
		leidoDe: definicion.holdingsSource ?? null,
		fechaPesos: INDICES_AS_OF,
		fechaPosiciones: HOLDINGS_AS_OF
	};
}

function fichaFiscal(entrada: EntradaFicha, tipo: InstrumentType): FichaFiscal {
	const vacia: FichaFiscal = {
		estado: 'sin-libro',
		plusvalia: null,
		factura: null,
		costeAdquisicion: null,
		fechaLoteMasAntiguo: null,
		recompra: null
	};

	const participaciones = entrada.posicion?.holdings ?? 0;
	if (participaciones <= 0 || !(entrada.precioBasePorParticipacion > 0)) return vacia;

	const lotes = buildFifoLots(entrada.transacciones, entrada.asset.ticker);
	if (lotes.length === 0) return vacia;

	const venta = simulateSale(lotes, participaciones, entrada.precioBasePorParticipacion);

	/*
	 * Solo hay factura si hay ganancia. Con pérdida el impuesto no es negativo —
	 * compensar contra otras ganancias es una decisión del ejercicio entero, no de
	 * esta posición— así que se deja en cero y lo que se enseña es la regla de
	 * recompra, que es lo accionable.
	 */
	const factura = venta.gain > 0 ? calculateSavingsTax(venta.gain) : 0;

	const recompra =
		venta.gain < 0
			? (() => {
					const regla = checkAntiApplicationRule(
						entrada.transacciones,
						entrada.asset.ticker,
						tipo,
						entrada.ahora
					);
					return {
						ventanaMeses: regla.windowMonths,
						bloqueada: regla.blocked,
						diasParaRecomprar: regla.daysUntilSafeRepurchase
					};
				})()
			: null;

	return {
		estado: venta.incomplete ? 'parcial' : 'completa',
		plusvalia: venta.gain,
		factura,
		costeAdquisicion: venta.acquisitionCost,
		fechaLoteMasAntiguo: venta.oldestLotDate,
		recompra
	};
}

/**
 * El solapamiento **visto desde esta posición**.
 *
 * Los dos datos existen ya, pero indexados al revés: `findOverlaps()` da pares y
 * `calcularConcentracion()` da empresas con sus fuentes. Darles la vuelta por
 * ticker es lo único que hace falta para contestar «¿con qué se pisa lo que
 * tengo aquí?», que es la pregunta que se hace mirando una posición.
 */
function fichaSolapamiento(entrada: EntradaFicha): FichaSolapamiento {
	const ticker = entrada.asset.ticker;

	const fondos = entrada.solapamientos
		.filter((f) => f.tickerA === ticker || f.tickerB === ticker)
		.map((f) => {
			const esA = f.tickerA === ticker;
			return {
				ticker: esA ? f.tickerB : f.tickerA,
				nombre: esA ? f.nameB : f.nameA,
				valorDuplicado: f.duplicatedValue,
				nota: f.note
			};
		})
		.sort((a, b) => b.valorDuplicado - a.valorDuplicado);

	const empresas = (entrada.concentracion?.empresas ?? [])
		.filter((e) => e.solapada && e.fuentes.some((f) => f.ticker === ticker))
		.map((e) => ({
			nombre: e.nombre,
			valorAqui: e.fuentes.find((f) => f.ticker === ticker)?.valor ?? 0,
			tambienPor: e.fuentes.filter((f) => f.ticker !== ticker).map((f) => f.nombre)
		}))
		.sort((a, b) => b.valorAqui - a.valorAqui);

	return { fondos, empresas };
}

export function construirFicha(entrada: EntradaFicha): FichaActivo {
	const tipo = instrumentTypeOf(entrada.asset);

	return {
		tipo,
		traspasable: canBeTransferred(entrada.asset),
		tributaAlVender: isTaxableOnSale(entrada.asset),
		ter: entrada.asset.ter,
		terAnualEnEuros: entrada.posicion ? entrada.posicion.totalValue * entrada.asset.ter : null,
		indice: fichaDelIndice(entrada.asset),
		fiscal: fichaFiscal(entrada, tipo),
		solapamiento: fichaSolapamiento(entrada)
	};
}
