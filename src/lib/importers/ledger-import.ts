import type { Transaction as OperacionCSV, ParsedPosition } from './types';
import type { Transaction as TransaccionCartera, TransactionType } from '$lib/types';
import type { CosteHeredado } from './direccion';

/**
 * Decide qué activos de una importación pueden entrar con **libro de operaciones** y cuáles
 * tienen que quedarse como instantánea.
 *
 * Vive fuera del componente por la razón de siempre aquí: decide algo, y lo que decide es
 * si la cartera muestra el número correcto de participaciones.
 *
 * ## Por qué activar el libro
 *
 * Un CSV con fechas trae todo lo que hace falta para reconstruir la historia, y tirarlo sale
 * caro por dos lados: `fiscal.ts` necesita operaciones para aplicar FIFO —sin ellas el panel
 * de IRPF de una cartera importada está apagado— y la reconstrucción del patrimonio necesita
 * saber cuántas participaciones había en cada fecha, porque sin eso `sharesAt()` asume las de
 * hoy y marca todo el pasado como estimado.
 *
 * ## Por qué no siempre
 *
 * ⚠️ `effectiveHoldings` da **prioridad al libro** sobre las participaciones manuales. Si el
 * libro está incompleto, la cartera muestra menos de lo que hay: se pasaría de *correcto sin
 * historia* a *con historia e incorrecto*, que es peor. De ahí las tres condiciones de abajo.
 */

/** Tolerancia en participaciones: `sanitizeHoldings` redondea a tres decimales. */
const TOLERANCIA_PARTICIPACIONES = 0.005;

export type MotivoSinLibro = 'sin-operaciones' | 'historial-incompleto' | 'divisa-no-base' | 'descuadre';

export interface PlanDeActivo {
	ticker: string;
	/** Participaciones y coste que van a la instantánea, vengan o no acompañadas de libro. */
	shares: number;
	avgCost: number;
	/** Operaciones a escribir, ya en el formato de la cartera. Vacío si no procede. */
	operaciones: TransaccionCartera[];
	/** `true` si el activo debe quedar con `useLedger`. */
	conLibro: boolean;
	/** Por qué no, cuando no. */
	motivo?: MotivoSinLibro;
	/** Fecha de la primera operación, para poder decírselo al usuario. */
	desde?: number;
}

/**
 * ¿Alguna venta se come más participaciones de las que constan compradas hasta ese momento?
 *
 * Es **la señal de que el fichero no trae el histórico completo**, y es la que de verdad
 * importa: comparar el neto contra la posición no sirve de nada cuando la posición se ha
 * calculado a partir de esas mismas operaciones —cuadra por construcción—. Lo que no cuadra
 * es una venta que aparece sin su compra, y eso pasa siempre que alguien descarga sólo los
 * últimos doce meses. `reduceTransactionsToPositions()` ya lo avisa en prosa; aquí se
 * recalcula para no tener que interpretar un texto.
 */
function faltaHistorial(operaciones: OperacionCSV[]): boolean {
	const enOrden = [...operaciones].sort((a, b) => a.date.getTime() - b.date.getTime());
	let acumuladas = 0;
	for (const op of enOrden) {
		if (esSalida(op)) {
			if (op.shares > acumuladas + TOLERANCIA_PARTICIPACIONES) return true;
			acumuladas -= op.shares;
		} else {
			acumuladas += op.shares;
		}
	}
	return false;
}

/**
 * ⚠️ **Una salida de traspaso resta igual que una venta, y olvidarlo aquí es peor que
 * en cualquier otro sitio de este fichero.** Estas dos cuentas —`faltaHistorial` y el
 * neto contra la posición— son las que deciden si el activo entra **con libro**, y
 * `effectiveHoldings` prefiere el libro a las participaciones manuales. Contar una
 * salida como suma haría que el neto no cuadrase con la posición, así que el activo
 * caería a `descuadre` y perdería el libro sin decir por qué; o peor, si cuadrase por
 * casualidad, escribiría un libro con la posición inflada al doble de lo que salió.
 */
const esSalida = (op: OperacionCSV) => op.type === 'SELL' || op.type === 'TRANSFER_OUT';

export function planificarImportacion(opciones: {
	/** Posiciones ya consolidadas y con su ticker resuelto. */
	posiciones: { ticker: string; posicion: ParsedPosition; shares: number; avgCost: number }[];
	/** Todas las operaciones del fichero. */
	operaciones: OperacionCSV[];
	/** Resuelve el ticker de una operación (por ISIN o por su propio ticker). */
	tickerDe: (op: OperacionCSV) => string | null;
	/** Divisa base de la cartera. */
	divisaBase?: string;
	/**
	 * El coste que viaja en cada traspaso confirmado, por `transferId`. Lo calcula
	 * `resolverCostesHeredados()` en `direccion.ts`; sin él las entradas de traspaso
	 * se escriben sin `carriedCostBase`, que es el comportamiento anterior a la 1.22.0.
	 */
	costesHeredados?: Map<string, CosteHeredado>;
	/** Generador de identificadores, inyectable para poder probar. */
	nuevoId?: () => string;
}): PlanDeActivo[] {
	const { posiciones, operaciones, tickerDe, divisaBase = 'EUR', costesHeredados } = opciones;
	const nuevoId = opciones.nuevoId ?? (() => crypto.randomUUID());

	const porTicker = new Map<string, OperacionCSV[]>();
	for (const op of operaciones) {
		const ticker = tickerDe(op);
		if (!ticker) continue;
		const lista = porTicker.get(ticker) ?? [];
		lista.push(op);
		porTicker.set(ticker, lista);
	}

	return posiciones.map(({ ticker, shares, avgCost }): PlanDeActivo => {
		const base = { ticker, shares, avgCost, operaciones: [], conLibro: false } as const;
		const suyas = porTicker.get(ticker) ?? [];

		if (suyas.length === 0) return { ...base, operaciones: [], motivo: 'sin-operaciones' };

		/**
		 * ⚠️ Sólo la divisa base, y no es una limitación cosmética: el libro guarda un
		 * `fxRate` por operación y lo usa para el coste en euros. El CSV no trae el cambio
		 * **del día de cada compra**, así que escribir `fxRate: 1` en un activo en dólares
		 * no deja el coste «aproximado»: lo deja mal por lo que se haya movido el par desde
		 * entonces. Mejor instantánea correcta que libro inventado.
		 */
		if (suyas.some((op) => (op.currency || divisaBase) !== divisaBase)) {
			return { ...base, operaciones: [], motivo: 'divisa-no-base' };
		}

		if (faltaHistorial(suyas)) {
			return { ...base, operaciones: [], motivo: 'historial-incompleto' };
		}

		const neto = suyas.reduce((total, op) => total + (esSalida(op) ? -op.shares : op.shares), 0);
		if (Math.abs(neto - shares) > TOLERANCIA_PARTICIPACIONES) {
			return { ...base, operaciones: [], motivo: 'descuadre' };
		}

		const enOrden = [...suyas].sort((a, b) => a.date.getTime() - b.date.getTime());
		return {
			ticker,
			shares,
			avgCost,
			conLibro: true,
			desde: enOrden[0].date.getTime(),
			operaciones: enOrden.map((op) => {
				const tipo: TransactionType =
					op.type === 'SELL'
						? 'sell'
						: op.type === 'TRANSFER_OUT'
							? 'transfer_out'
							: op.type === 'TRANSFER_IN'
								? 'transfer_in'
								: 'buy';

				const transaccion: TransaccionCartera = {
					id: nuevoId(),
					ticker,
					type: tipo,
					date: op.date.getTime(),
					shares: op.shares,
					price: op.price,
					currency: op.currency || divisaBase,
					// El CSV no desglosa comisiones por operación ni el cambio del día.
					fees: 0,
					fxRate: 1
				};

				if (op.transferId) transaccion.transferId = op.transferId;

				/*
				 * ⚠️ **El coste heredado solo se escribe en la pata de ENTRADA, y solo
				 * cuando se sabe.** Es lo que hace que el diferimiento signifique «pagas
				 * después sobre la misma ganancia» en vez de «la ganancia desaparece»: sin
				 * `carriedCostBase` la entrada crea un lote FIFO al precio del día y la
				 * ficha del destino declara «plusvalía 0 € · impuesto 0 €», que es un número
				 * falso y no una ausencia de número.
				 *
				 * Un `coste` a `null` —origen sin libro, o con historial que no llega— deja
				 * el campo fuera a propósito, que reproduce el comportamiento anterior a la
				 * 1.22.0. Afirmar un coste que nadie ha comprobado es el defecto del
				 * importador que metía activos a coste 0: el problema no era el cero, era
				 * afirmarlo.
				 */
				if (op.type === 'TRANSFER_IN' && op.transferId) {
					const heredado = costesHeredados?.get(op.transferId);
					if (heredado?.coste !== null && heredado?.coste !== undefined) {
						transaccion.carriedCostBase = heredado.coste;
						if (heredado.fechaLote !== null) transaccion.carriedLotDate = heredado.fechaLote;
					}
				}

				return transaccion;
			})
		};
	});
}
