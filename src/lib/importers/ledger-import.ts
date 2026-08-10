import type { Transaction as OperacionCSV, ParsedPosition } from './types';
import type { Transaction as TransaccionCartera } from '$lib/types';

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
		if (op.type === 'SELL') {
			if (op.shares > acumuladas + TOLERANCIA_PARTICIPACIONES) return true;
			acumuladas -= op.shares;
		} else {
			acumuladas += op.shares;
		}
	}
	return false;
}

export function planificarImportacion(opciones: {
	/** Posiciones ya consolidadas y con su ticker resuelto. */
	posiciones: { ticker: string; posicion: ParsedPosition; shares: number; avgCost: number }[];
	/** Todas las operaciones del fichero. */
	operaciones: OperacionCSV[];
	/** Resuelve el ticker de una operación (por ISIN o por su propio ticker). */
	tickerDe: (op: OperacionCSV) => string | null;
	/** Divisa base de la cartera. */
	divisaBase?: string;
	/** Generador de identificadores, inyectable para poder probar. */
	nuevoId?: () => string;
}): PlanDeActivo[] {
	const { posiciones, operaciones, tickerDe, divisaBase = 'EUR' } = opciones;
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

		const neto = suyas.reduce((total, op) => total + (op.type === 'SELL' ? -op.shares : op.shares), 0);
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
			operaciones: enOrden.map((op) => ({
				id: nuevoId(),
				ticker,
				type: op.type === 'SELL' ? 'sell' : 'buy',
				date: op.date.getTime(),
				shares: op.shares,
				price: op.price,
				currency: op.currency || divisaBase,
				// El CSV no desglosa comisiones por operación ni el cambio del día.
				fees: 0,
				fxRate: 1
			}))
		};
	});
}
