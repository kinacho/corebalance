import { buildFifoLots, simulateSale } from './fiscal';
import { classifyMove, type MoveKind } from './instrument-type';
import type { Asset, Transaction } from './types';

/**
 * Qué apuntar en el libro cuando traspasas de un fondo a otro.
 *
 * Es el paso que faltaba entre `traspaso.ts`, que **planifica** («mueve 5.000 €
 * de aquí a allá»), y el libro, que **registra**. Hasta la 1.22.0 no existía: el
 * usuario tenía que abrir dos modales y apuntar dos movimientos a mano, con dos
 * cifras de participaciones que él mismo tenía que sacar dividiendo por dos NAV.
 *
 * ⚠️ **Vive fuera del componente porque decide cosas de dinero**, que es el
 * criterio de siempre aquí: es el mismo motivo por el que salieron `weights.ts`
 * del panel de gestión y `ledger.ts` del store. Y porque `LedgerModal.svelte` ya
 * pasaba de las mil líneas antes de empezar.
 *
 * No toca el store ni lee el reloj: recibe la fecha y devuelve el plan. El
 * componente lo aplica.
 */

/** Cuánto se traspasa, dicho como lo dice el usuario y no como lo necesita el libro. */
export type CuantoTraspasar =
	| { modo: 'todo' }
	/** En divisa base: es como lo da el bróker («traspasé 5.000 €»). */
	| { modo: 'importe'; importe: number }
	| { modo: 'participaciones'; participaciones: number };

/**
 * En qué estado está el coste que se hereda.
 *
 * ⚠️ **Son estados y no un número con ceros, y la diferencia es todo.** Un 0 € de
 * coste heredado se lee como «no arrastras nada», cuando lo que pasa es que no se
 * sabe — y de ahí sale una plusvalía del 100 % inventada, que es exactamente el
 * defecto que este repo arrastra documentado desde el importador que metía activos
 * a coste 0. Quien pinte esto tiene que ramificar por el estado, no comparar contra
 * cero.
 */
export type EstadoCoste =
	/** Hay lotes suficientes: el coste heredado es el bueno. */
	| 'completo'
	/** El libro no cubre todas las participaciones: el coste es parcial. */
	| 'parcial'
	/** El origen no tiene transacciones, así que no hay nada que heredar. */
	| 'sin-libro';

export interface PlanDeTraspaso {
	origen: Asset;
	destino: Asset;
	fecha: number;

	/** Importe movido, en divisa base. */
	importe: number;
	participacionesOrigen: number;
	participacionesDestino: number;

	/** Precios unitarios en divisa base, tal como se han usado para el reparto. */
	precioOrigen: number;
	precioDestino: number;

	/** Qué es esto fiscalmente. `traspaso` es el único que difiere el impuesto. */
	trato: MoveKind;
	sinTributar: boolean;

	estadoCoste: EstadoCoste;
	/** Coste de adquisición que viaja, en divisa base. `null` si no hay libro. */
	costeHeredado: number | null;
	/** Fecha de adquisición que viaja. `null` si no hay libro. */
	fechaLoteHeredado: number | null;
	/** Plusvalía latente que se lleva consigo. `null` si no hay libro. */
	plusvaliaLatente: number | null;

	/** Si tras el traspaso no queda nada en el origen. */
	vaciaElOrigen: boolean;
}

/** Igual que el resto de la app: tres decimales para participaciones. */
function redondear3(valor: number): number {
	return Math.round(valor * 1000) / 1000;
}

function redondear2(valor: number): number {
	return Math.round(valor * 100) / 100;
}

/**
 * Cuántas participaciones del origen salen, según lo que haya pedido el usuario.
 *
 * ⚠️ **El tope es siempre lo que tiene**, en los tres modos. Sin él, pedir 6.000 €
 * de un fondo que vale 5.000 dejaría participaciones negativas en el origen y
 * metería en el destino dinero que no existe — y ninguna de las dos cosas se ve
 * en pantalla como un error, se ven como una cartera.
 */
function participacionesASacar(
	cuanto: CuantoTraspasar,
	participacionesOrigen: number,
	precioOrigen: number
): number {
	if (cuanto.modo === 'todo') return participacionesOrigen;

	const pedidas =
		cuanto.modo === 'participaciones'
			? cuanto.participaciones
			: precioOrigen > 0
				? cuanto.importe / precioOrigen
				: 0;

	if (!(pedidas > 0)) return 0;
	return Math.min(pedidas, participacionesOrigen);
}

/**
 * Qué apuntar para traspasar de un fondo a otro.
 *
 * `precioOrigen` y `precioDestino` llegan **ya convertidos a divisa base**, igual
 * que los pide `simulateSale`, y por el mismo motivo: recibirlos sin convertir
 * invita a aplicar el tipo de cambio dos veces, que es de donde salió un bug real
 * de beneficios.
 */
export function planificarTraspaso(entrada: {
	origen: Asset;
	destino: Asset;
	transacciones: Transaction[];
	participacionesOrigen: number;
	precioOrigen: number;
	precioDestino: number;
	cuanto: CuantoTraspasar;
	fecha: number;
}): PlanDeTraspaso {
	const {
		origen,
		destino,
		transacciones,
		participacionesOrigen,
		precioOrigen,
		precioDestino,
		cuanto,
		fecha
	} = entrada;

	const { kind, taxFree } = classifyMove(origen, destino);

	const sacadas = participacionesASacar(cuanto, participacionesOrigen, precioOrigen);
	const importe = redondear2(sacadas * precioOrigen);
	const compradas = precioDestino > 0 ? redondear3(importe / precioDestino) : 0;

	/*
	 * El coste heredado sale de los lotes FIFO del origen, con `simulateSale` —
	 * reusando `fiscal.ts` y sin reimplementar FIFO aquí. Fiscalmente eso es lo
	 * mismo que se calcularía para una venta: el valor de adquisición de lo que
	 * sale. La diferencia es qué se hace con él: en una venta se resta del importe
	 * para dar la plusvalía a declarar, y aquí **viaja** al destino.
	 */
	const lotes = buildFifoLots(transacciones, origen.ticker);

	let estadoCoste: EstadoCoste = 'sin-libro';
	let costeHeredado: number | null = null;
	let fechaLoteHeredado: number | null = null;
	let plusvaliaLatente: number | null = null;

	if (lotes.length > 0 && sacadas > 0) {
		const salida = simulateSale(lotes, sacadas, precioOrigen);
		estadoCoste = salida.incomplete ? 'parcial' : 'completo';
		costeHeredado = salida.acquisitionCost;
		/*
		 * ⚠️ La fecha heredada es la del lote **más antiguo consumido**, no la de hoy
		 * ni la del más reciente. Es lo que decide la ventana antiaplicación del
		 * destino: heredar la de hoy la reiniciaba, que era el segundo daño silencioso
		 * del traspaso a mano. Con `todo` se consumen varios lotes y la app se queda
		 * con el más antiguo, que es el criterio conservador y el que FIFO impone.
		 */
		fechaLoteHeredado = salida.oldestLotDate;
		plusvaliaLatente = salida.gain;
	}

	return {
		origen,
		destino,
		fecha,
		importe,
		participacionesOrigen: redondear3(sacadas),
		participacionesDestino: compradas,
		precioOrigen,
		precioDestino,
		trato: kind,
		sinTributar: taxFree,
		estadoCoste,
		costeHeredado,
		fechaLoteHeredado,
		plusvaliaLatente,
		// Con tolerancia, porque `sacadas` viene de una división en el modo importe.
		vaciaElOrigen: participacionesOrigen - sacadas <= 1e-6
	};
}

/**
 * Si el plan tiene algo que apuntar.
 *
 * Escrito una vez porque lo preguntan el botón de confirmar y quien escribe en el
 * libro, y son la misma pregunta: un plan de cero participaciones no es un error
 * que avisar, es un formulario a medio rellenar.
 */
export function meritaApuntar(plan: PlanDeTraspaso): boolean {
	return plan.participacionesOrigen > 0 && plan.participacionesDestino > 0;
}
