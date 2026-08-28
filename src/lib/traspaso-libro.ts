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

/**
 * Cómo queda el fondo de destino, **tal como lo dice el banco**.
 *
 * ⚠️ **Esta es la forma de entrada que de verdad se puede rellenar, y sustituye a
 * pedir un «precio de entrada».** En un traspaso los dos valores liquidativos —el de
 * reembolso en el origen y el de suscripción en el destino— se fijan días después de
 * dar la orden, así que el usuario **no los sabe**, y pedírselos convertía dos cifras
 * que él conoce con certeza en dos que tiene que adivinar. Cualquier error ahí
 * descuadra las dos posiciones al céntimo y no hay forma de cerrarlo después.
 *
 * Lo que sí tiene delante en el extracto es el estado final: cuántas participaciones
 * hay en el fondo destino y a qué coste medio. De ahí sale todo:
 *
 *     participaciones que entran = participaciones − antes.participaciones
 *     coste que entra            = participaciones × costeMedio − antes.costeTotalBase
 *
 * Y **se cuadra por construcción**: declarando el estado final no queda residuo que
 * reconciliar, que es el problema que esto viene a resolver.
 */
export interface EstadoDestino {
	/** Participaciones **totales** en el destino después del traspaso. */
	participaciones: number;
	/** Coste medio **total** del destino después, en divisa del activo. */
	costeMedio: number;
}

/** Lo que el destino tenía antes, para poder restar y quedarse con lo que entra. */
export interface DestinoAntes {
	participaciones: number;
	/** Coste total acumulado, en divisa base. */
	costeTotalBase: number;
}

export interface PlanDeTraspaso {
	origen: Asset;
	destino: Asset;
	fecha: number;

	/** Importe movido, en divisa base. */
	importe: number;
	participacionesOrigen: number;
	participacionesDestino: number;

	/** Precio unitario del origen en divisa base: solo valora lo que sale. */
	precioOrigen: number;

	/**
	 * El estado final del destino **ya resuelto**: el que declaró el usuario, o el
	 * estimado si no declaró nada.
	 *
	 * Se devuelve para que el formulario precargue sus dos campos con esto en vez de
	 * volver a estimarlo por su cuenta — que era una dependencia circular y, peor, una
	 * segunda copia de la misma aritmética.
	 */
	destinoResultante: EstadoDestino;

	/** Qué es esto fiscalmente. `traspaso` es el único que difiere el impuesto. */
	trato: MoveKind;
	sinTributar: boolean;

	estadoCoste: EstadoCoste;
	/**
	 * Valor de adquisición que viaja al destino, en divisa base — el que se escribe
	 * como `carriedCostBase` y que **solo lee `fiscal.ts`**.
	 *
	 * ⚠️ **Sale de los lotes FIFO del origen, no del estado final que declara el
	 * usuario, y hasta la 1.23.1 era al revés.** El argumento de entonces era que «la
	 * cifra del banco es la que la gestora reportará a Hacienda»; es falso, y la
	 * confusión entre esas dos cosas es justo el defecto que se corrigió. Lo que el
	 * usuario lee en su extracto es el **importe suscrito** —un flujo de caja—, no el
	 * valor de adquisición: la gestora arrastra el segundo por obligación del art. 94 y
	 * no lo enseña en esa pantalla. Los dos números son legítimos y se separan aquí:
	 * este para Hacienda, `costeSuscripcion` para lo que se pinta.
	 *
	 * `null` cuando el origen no tiene libro: entonces no se sabe, y afirmar un coste
	 * que nadie ha comprobado es el defecto del importador que metía activos a coste 0.
	 */
	costeHeredado: number | null;
	/**
	 * Lo que **entra de verdad** en el destino según su extracto, en divisa base: el
	 * importe suscrito. Es lo que alimenta el precio de la fila y, por tanto, el coste
	 * medio que la app enseña.
	 *
	 * ⚠️ Va separado de `costeHeredado` porque **la fuente de la verdad de «cuánto me
	 * costó» es la gestora**: un coste medio que no aparece en ningún extracto del
	 * usuario no se puede verificar, y la 1.23.0 llegó a enseñar 12,58 € donde el banco
	 * decía 13,41 €.
	 */
	costeSuscripcion: number | null;
	/**
	 * Lo que los lotes FIFO del origen dicen que sale. Es el mismo número que
	 * `costeHeredado`; se mantiene con su nombre porque la interfaz lo cita al explicar
	 * de dónde viene la cifra fiscal.
	 */
	costeSegunElLibro: number | null;
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
 * `precioOrigen` llega **ya convertido a divisa base**, igual que lo pide
 * `simulateSale`, y por el mismo motivo: recibirlo sin convertir invita a aplicar el
 * tipo de cambio dos veces, que es de donde salió un bug real de beneficios.
 *
 * ⚠️ **Y no hay `precioDestino`, a propósito.** Lo que entra en el destino se deduce
 * del estado final que declara el usuario (ver `EstadoDestino`), no de un valor
 * liquidativo que en la fecha de la orden todavía no existe.
 */
export function planificarTraspaso(entrada: {
	origen: Asset;
	destino: Asset;
	transacciones: Transaction[];
	participacionesOrigen: number;
	precioOrigen: number;
	/** Valor liquidativo de hoy del destino, en divisa base. Solo para la estimación. */
	precioDestinoHoy: number;
	cuanto: CuantoTraspasar;
	/**
	 * Cómo queda el destino según el banco. **Omitirlo es lo normal**: entonces se
	 * estima, y es lo que precarga los campos del formulario. Ver `EstadoDestino`.
	 */
	destinoResultante?: EstadoDestino;
	destinoAntes: DestinoAntes;
	fecha: number;
}): PlanDeTraspaso {
	const {
		origen,
		destino,
		transacciones,
		participacionesOrigen,
		precioOrigen,
		precioDestinoHoy,
		cuanto,
		destinoAntes,
		fecha
	} = entrada;

	const { kind, taxFree } = classifyMove(origen, destino);

	const sacadas = participacionesASacar(cuanto, participacionesOrigen, precioOrigen);
	const importe = redondear2(sacadas * precioOrigen);

	/*
	 * El coste según el libro sale de los lotes FIFO del origen, con `simulateSale` —
	 * reusando `fiscal.ts` y sin reimplementar FIFO aquí. Fiscalmente eso es lo
	 * mismo que se calcularía para una venta: el valor de adquisición de lo que
	 * sale. La diferencia es qué se hace con él: en una venta se resta del importe
	 * para dar la plusvalía a declarar, y aquí **viaja** al destino.
	 *
	 * Va antes de resolver el estado final porque la estimación lo necesita.
	 */
	const lotes = buildFifoLots(transacciones, origen.ticker);

	let estadoCoste: EstadoCoste = 'sin-libro';
	let costeSegunElLibro: number | null = null;
	let fechaLoteHeredado: number | null = null;
	let plusvaliaLatente: number | null = null;

	if (lotes.length > 0 && sacadas > 0) {
		const salida = simulateSale(lotes, sacadas, precioOrigen);
		estadoCoste = salida.incomplete ? 'parcial' : 'completo';
		costeSegunElLibro = salida.acquisitionCost;
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

	/*
	 * Sin estado declarado se estima, aquí dentro y no en el componente: así los dos
	 * consumidores —el formulario del libro y el panel de Hacienda— llaman una sola vez
	 * y la estimación tiene un único sitio donde estar probada.
	 */
	const declarado = entrada.destinoResultante !== undefined;
	const destinoResultante =
		entrada.destinoResultante ??
		sugerirEstadoDestino({
			importe,
			precioDestinoHoy,
			costeQueViaja: costeSegunElLibro,
			destinoAntes
		});

	/*
	 * Lo que entra es la diferencia entre cómo queda el destino y cómo estaba. Es una
	 * resta, no una división por un precio: por eso no hace falta el valor liquidativo
	 * de suscripción, que es el dato que el usuario no tiene.
	 *
	 * El `max(0, …)` no es cosmético: un estado final **menor** que el de antes no es
	 * un traspaso de entrada, es que el usuario ha escrito otra cosa. Sin el tope
	 * entrarían participaciones negativas, que `ledger.ts` y `fiscal.ts` ignoran en
	 * silencio (los dos filtran `shares > 0`), o sea que se apuntaría un movimiento
	 * que no hace nada.
	 */
	const compradas = redondear3(
		Math.max(0, destinoResultante.participaciones - destinoAntes.participaciones)
	);
	const costeDeclarado =
		compradas > 0
			? redondear2(
					Math.max(
						0,
						destinoResultante.participaciones * destinoResultante.costeMedio -
							destinoAntes.costeTotalBase
					)
				)
			: null;

	/*
	 * ⚠️ **Las dos cifras se separan aquí, y esa separación es el arreglo de la 1.23.1.**
	 *
	 * Lo fiscal sale **siempre de los lotes del origen**: es el valor de adquisición que
	 * el art. 94 hace viajar. Sin libro en el origen no se sabe, y ahí `null` es la
	 * respuesta correcta — la estimación vale «lo que cuesta hoy», que es una valoración
	 * y no un valor de adquisición, y devolverla haría que el destino naciera afirmando
	 * un coste que nadie ha comprobado (el defecto del importador que metía activos a
	 * coste 0: el problema no era el cero, era afirmarlo).
	 *
	 * ⚠️ Hasta la 1.23.1 el estado declarado mandaba sobre el libro, «porque lo dice su
	 * banco». Eso confundía dos cosas distintas: lo que el banco enseña en esa casilla es
	 * el **importe suscrito**, no el valor de adquisición. De ahí sale `costeSuscripcion`,
	 * que es lo que se pinta, mientras que lo fiscal sigue saliendo del libro.
	 */
	const costeHeredado = costeSegunElLibro;
	/*
	 * Y lo que se pinta: lo declarado si lo hay, y si no el importe movido —que es lo
	 * que el destino habrá suscrito, valorado a día de hoy—. Nunca `null` cuando entran
	 * participaciones, porque «cuánto he metido» siempre tiene respuesta aunque no se
	 * sepa a cuánto se compró en su día.
	 */
	const costeSuscripcion = compradas > 0 ? (costeDeclarado ?? importe) : null;

	return {
		origen,
		destino,
		fecha,
		importe,
		participacionesOrigen: redondear3(sacadas),
		participacionesDestino: compradas,
		precioOrigen,
		destinoResultante,
		trato: kind,
		sinTributar: taxFree,
		estadoCoste,
		costeHeredado,
		costeSuscripcion,
		costeSegunElLibro,
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

/**
 * La estimación con la que se precargan los dos campos del destino.
 *
 * ⚠️ **Es una estimación y el usuario la sobrescribe, no al revés — y ese reparto es
 * el punto.** La app puede calcular a qué participaciones equivaldría el importe al
 * valor liquidativo **de hoy**, pero un traspaso no se ejecuta al de hoy: el reembolso
 * y la suscripción se valoran días después. Así que esto sirve para no dejar dos
 * campos vacíos en el caso fácil, y lo que manda es lo que ponga el extracto.
 *
 * Vive aquí y no en el componente por el criterio de siempre: decide cifras de dinero,
 * y una estimación sin test es una estimación que nadie ha comprobado.
 */
export function sugerirEstadoDestino(entrada: {
	importe: number;
	/** Valor liquidativo de hoy del destino, en divisa base. */
	precioDestinoHoy: number;
	/** El coste que viajaría según el libro del origen; `null` si no hay libro. */
	costeQueViaja: number | null;
	destinoAntes: DestinoAntes;
}): EstadoDestino {
	const { importe, precioDestinoHoy, costeQueViaja, destinoAntes } = entrada;

	const entran = precioDestinoHoy > 0 ? importe / precioDestinoHoy : 0;
	const participaciones = redondear3(destinoAntes.participaciones + entran);

	/*
	 * Sin libro en el origen no hay coste que heredar, así que la mejor estimación del
	 * coste de lo que entra es lo que vale hoy — que es exactamente lo que la app hacía
	 * antes de que existiera el coste heredado. La interfaz lo dice en su tercera
	 * frase; aquí no se puede hacer mejor.
	 */
	const costeQueEntra = costeQueViaja ?? importe;
	const costeTotal = destinoAntes.costeTotalBase + costeQueEntra;

	return {
		participaciones,
		costeMedio: participaciones > 0 ? redondear2(costeTotal / participaciones) : 0
	};
}
