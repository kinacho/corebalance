import { buildFifoLots, simulateSale } from '$lib/fiscal';
import type { Transaction as TransaccionCartera } from '$lib/types';
import type { Transaction as OperacionCSV } from './types';

/**
 * Qué hacer cuando el fichero **no dice** si cada orden entra o sale.
 *
 * ## El problema, medido
 *
 * El export de **Órdenes** de MyInvestor tiene exactamente estas columnas:
 *
 *     Fecha de la orden;ISIN;Importe estimado;Nº de participaciones;Estado
 *
 * No hay columna de tipo y todas las cifras van en positivo, así que **un reembolso
 * y una suscripción son la misma fila**. El parser no puede hacer más que suponer
 * compra — y lo hacía en silencio, con `warnings: []` y `skippedRows: 0`.
 *
 * El daño no es «falta una resta», es el doble: una salida de 58,54 participaciones
 * apuntada como compra deja **117,08 de más**. Medido contra un fichero real de 14
 * órdenes con un traspaso dentro, el fondo quedaba en 1.141,23 participaciones y
 * 12.644,48 € cuando el banco decía 1.024,15 y 11.287,11 €.
 *
 * ## Por qué esto no adivina nada por su cuenta
 *
 * ⚠️ **Nada de lo que hay aquí se aplica solo.** `sugerirTraspasos()` propone y
 * devuelve parejas; quien las confirma es el usuario en la interfaz. La razón está
 * escrita en `CLAUDE.md` y es la que gobierna todo este subsistema: *un importador
 * que se equivoca en una cantidad, una fecha o un signo no levanta ningún error* —
 * se convierte en una plusvalía inventada vía `ledger.ts` y `fiscal.ts`. Una pareja
 * falsa (dos aportaciones a dos fondos la misma semana por importes parecidos) es
 * justo esa forma de fallo, así que el valor por defecto sigue siendo el de siempre,
 * compra, y lo que cambia es que ahora **se ve**.
 *
 * ## Por qué vive fuera del componente
 *
 * El criterio de siempre aquí: decide cifras de dinero. Es el mismo motivo por el
 * que salieron `weights.ts` del panel de gestión, `ledger.ts` del store y
 * `traspaso-libro.ts` del modal del libro. No toca el store ni lee el reloj.
 */

/**
 * Cuántos días puede haber entre las dos patas de un traspaso.
 *
 * No es un número redondo por gusto: en un traspaso español el reembolso en origen y
 * la suscripción en destino los fija la gestora **días después** de la orden, y entre
 * gestoras distintas la liquidación se va a una semana larga. Diez días cubre el caso
 * normal sin llegar a emparejar dos aportaciones mensuales seguidas.
 */
export const VENTANA_TRASPASO_DIAS = 10;

/**
 * Cuánto pueden separarse los dos importes, en tanto por uno.
 *
 * Lo que sale y lo que entra **no coinciden**: entre las dos fechas se mueve el valor
 * liquidativo. En el fichero real medido la diferencia era del 0,8 % (715,07 € salen,
 * 709,38 € entran) sobre cinco días. Un 5 % deja sitio a un mercado movido sin
 * emparejar dos importes que no tienen nada que ver.
 */
export const TOLERANCIA_IMPORTE = 0.05;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Cómo se agrupan las operaciones de un mismo activo.
 *
 * ⚠️ Escrita una vez y exportada porque `aggregator.ts` agrupaba con esta misma
 * expresión copiada a mano. Dos criterios de agrupación que se separen no dan un
 * error: dan dos posiciones donde había una.
 */
export function claveDeGrupo(op: Pick<OperacionCSV, 'isin' | 'ticker' | 'name'>): string {
	return (op.isin || op.ticker || op.name).toUpperCase();
}

/** ¿Queda alguna operación cuya dirección haya tenido que suponer el parser? */
export function hayDireccionSupuesta(ops: OperacionCSV[]): boolean {
	return ops.some((op) => op.directionAssumed);
}

/** Dos operaciones que parecen las dos patas de un mismo traspaso. */
export interface ParejaSugerida {
	/** Índice en el array de operaciones de la pata que sale. */
	salida: number;
	/** Índice de la pata que entra. */
	entrada: number;
	/** Días entre las dos. */
	dias: number;
	/** Importe que entra menos importe que sale, en divisa del fichero. */
	diferencia: number;
}

/** Lo que el usuario ha decidido en el paso de dirección. */
export interface DecisionDeDireccion {
	/** Índices que el usuario ha marcado como salida (reembolso o venta). */
	salidas?: Set<number>;
	/** Parejas de traspaso confirmadas. */
	traspasos?: ParejaSugerida[];
}

const importeDe = (op: OperacionCSV) => op.shares * op.price;

/**
 * Cuántas participaciones tiene el grupo de `op` justo **antes** de ella.
 *
 * Sirve de guarda: proponer como salida una orden que se lleva más de lo que hay es
 * proponer una posición negativa, y eso no se ve en pantalla como un error — se ve
 * como una cartera.
 */
function participacionesAntesDe(ops: OperacionCSV[], indice: number): number {
	const clave = claveDeGrupo(ops[indice]);
	const cuando = ops[indice].date.getTime();
	let acumuladas = 0;
	for (const [i, op] of ops.entries()) {
		if (i === indice || claveDeGrupo(op) !== clave) continue;
		if (op.date.getTime() > cuando) continue;
		acumuladas += op.type === 'SELL' || op.type === 'TRANSFER_OUT' ? -op.shares : op.shares;
	}
	return acumuladas;
}

/**
 * Parejas de operaciones que parecen un traspaso, ordenadas de más a menos plausible.
 *
 * Solo mira operaciones cuya dirección se ha **supuesto**: si el fichero dice
 * «Reembolso», se le cree y no hay nada que proponer. Y solo propone — ver la nota de
 * cabecera del módulo.
 *
 * ⚠️ **La pata que sale es siempre la más antigua, y las de la misma fecha no se
 * proponen.** En un traspaso se ordena en el origen y el destino suscribe después, así
 * que la fecha desempata. Con las dos en el mismo día no hay nada que desempate —ni la
 * fecha ni el importe dicen cuál es cuál— y adivinar ahí es exactamente lo que este
 * módulo no hace. El usuario siempre puede marcarlas a mano.
 */
export function sugerirTraspasos(
	ops: OperacionCSV[],
	opciones: {
		/**
		 * ⚠️ **Si el activo es un fondo traspasable, y no es opcional a propósito.**
		 *
		 * Solo **fondo → fondo** difiere el impuesto (art. 94). Un fondo que se reembolsa
		 * para comprar un ETF es un reembolso y **tributa**, aunque el origen sea un
		 * fondo — es la regla que `classifyMove()` lleva escrita y que este repo ya
		 * documenta. Proponer ahí un traspaso sería proponer un diferimiento que no
		 * existe: se escribiría `carriedCostBase`, la plusvalía realizada desaparecería
		 * del panel de IRPF y el usuario declararía de menos.
		 *
		 * Lo comprobó el arnés de navegador antes de que esto existiera: con dos ISIN
		 * cualesquiera el par propuesto tenía un **ETF** de destino y la pantalla ofrecía
		 * traspasarlo igual.
		 *
		 * Es obligatorio y no tiene valor por defecto porque el defecto seguro sería
		 * «todo es un fondo», que es justo el agujero silencioso. Quien no sepa el tipo
		 * debe devolver `false` y no proponer nada.
		 */
		esTraspasable: (op: OperacionCSV) => boolean;
		ventanaDias?: number;
		tolerancia?: number;
	}
): ParejaSugerida[] {
	const { esTraspasable } = opciones;
	const ventana = opciones.ventanaDias ?? VENTANA_TRASPASO_DIAS;
	const tolerancia = opciones.tolerancia ?? TOLERANCIA_IMPORTE;

	const candidatas: (ParejaSugerida & { desviacion: number })[] = [];

	for (const [i, a] of ops.entries()) {
		if (!a.directionAssumed || !esTraspasable(a)) continue;
		for (const [j, b] of ops.entries()) {
			if (j <= i || !b.directionAssumed || !esTraspasable(b)) continue;
			if (claveDeGrupo(a) === claveDeGrupo(b)) continue;

			const ta = a.date.getTime();
			const tb = b.date.getTime();
			if (ta === tb) continue;

			const dias = Math.abs(tb - ta) / MS_POR_DIA;
			if (dias > ventana) continue;

			const importeA = importeDe(a);
			const importeB = importeDe(b);
			const mayor = Math.max(importeA, importeB);
			if (!(mayor > 0)) continue;

			const desviacion = Math.abs(importeB - importeA) / mayor;
			if (desviacion > tolerancia) continue;

			const salida = ta < tb ? i : j;
			const entrada = ta < tb ? j : i;

			// La guarda: el origen tiene que tener de dónde sacarlas.
			if (participacionesAntesDe(ops, salida) + 1e-9 < ops[salida].shares) continue;

			candidatas.push({
				salida,
				entrada,
				dias: Math.round(dias),
				diferencia: importeDe(ops[entrada]) - importeDe(ops[salida]),
				desviacion
			});
		}
	}

	/*
	 * Codicioso sobre la mejor puntuación: primero la pareja cuyos importes más se
	 * parecen, y a igualdad la más junta en el tiempo. Una operación no puede estar en
	 * dos parejas, porque no puede salir e irse dos veces.
	 */
	candidatas.sort((x, y) => x.desviacion - y.desviacion || x.dias - y.dias);

	const usadas = new Set<number>();
	const parejas: ParejaSugerida[] = [];
	for (const c of candidatas) {
		if (usadas.has(c.salida) || usadas.has(c.entrada)) continue;
		usadas.add(c.salida);
		usadas.add(c.entrada);
		parejas.push({ salida: c.salida, entrada: c.entrada, dias: c.dias, diferencia: c.diferencia });
	}

	return parejas;
}

/**
 * Aplica lo que el usuario ha decidido y devuelve las operaciones con su dirección
 * final. No muta la entrada.
 *
 * Los traspasos mandan sobre las salidas sueltas: si un índice está en una pareja
 * confirmada **y** marcado como salida, es traspaso. Marcar una salida es decir «esto
 * se fue»; la pareja dice además a dónde, que es estrictamente más información.
 */
export function aplicarDireccion(
	ops: OperacionCSV[],
	decision: DecisionDeDireccion,
	nuevoId: () => string = () => crypto.randomUUID()
): OperacionCSV[] {
	const salidas = decision.salidas ?? new Set<number>();
	const traspasos = decision.traspasos ?? [];

	const resultado = ops.map((op) => ({ ...op }));

	for (const idx of salidas) {
		if (resultado[idx]) resultado[idx].type = 'SELL';
	}

	for (const pareja of traspasos) {
		const salida = resultado[pareja.salida];
		const entrada = resultado[pareja.entrada];
		if (!salida || !entrada) continue;
		const transferId = nuevoId();
		salida.type = 'TRANSFER_OUT';
		salida.transferId = transferId;
		entrada.type = 'TRANSFER_IN';
		entrada.transferId = transferId;
	}

	return resultado;
}

/** En qué estado está el coste que viaja en un traspaso. Ver `traspaso-libro.ts`. */
export type EstadoCosteHeredado = 'completo' | 'parcial' | 'sin-libro';

export interface CosteHeredado {
	/**
	 * El valor de adquisición que se escribe como `carriedCostBase`, en divisa base.
	 *
	 * ⚠️ **`null` cuando no se sabe, y `parcial` cuenta como no saberlo.** Un coste
	 * calculado sobre lotes que no llegan es un coste *demasiado bajo*, y un coste
	 * demasiado bajo no se lee como incompleto: se lee como una plusvalía futura mayor
	 * de la que hay. Con `null` la entrada se comporta como antes de la 1.22.0, que es
	 * el fallback documentado y seguro.
	 *
	 * Aquí diverge a propósito de `traspaso-libro.ts`, que sí devuelve el coste parcial:
	 * allí el usuario está mirando un fondo cuyo libro conoce y puede completar, y
	 * aquí se están escribiendo carteras enteras de golpe desde un fichero cuyo alcance
	 * nadie ha comprobado. `costeParcial` guarda la cifra para poder enseñarla.
	 */
	coste: number | null;
	/** Fecha del lote más antiguo consumido: sin ella la ventana de recompra se reinicia. */
	fechaLote: number | null;
	estado: EstadoCosteHeredado;
	/** Lo que dicen los lotes que hay, aunque no basten. Para poder decirlo, no para escribirlo. */
	costeParcial: number | null;
}

/** Convierte una operación del importador al `Transaction` del libro, para poder usar FIFO. */
function comoTransaccionDeCartera(op: OperacionCSV, ticker: string, id: string): TransaccionCartera {
	const tipo =
		op.type === 'SELL'
			? 'sell'
			: op.type === 'TRANSFER_OUT'
				? 'transfer_out'
				: op.type === 'TRANSFER_IN'
					? 'transfer_in'
					: 'buy';
	return {
		id,
		ticker,
		type: tipo,
		date: op.date.getTime(),
		shares: op.shares,
		price: op.price,
		currency: op.currency,
		fees: 0,
		/*
		 * El CSV no trae el cambio del día de cada operación. `ledger-import.ts` ya se
		 * niega a montar libro con divisa distinta de la base por ese motivo, así que
		 * aquí un 1 es correcto en todos los casos que llegan a escribirse.
		 */
		fxRate: 1
	};
}

/**
 * El coste de adquisición y la fecha que viajan en cada traspaso confirmado.
 *
 * ⚠️ **Reusa `buildFifoLots` y `simulateSale` de `fiscal.ts` en vez de reimplementar
 * FIFO.** El art. 37.2 obliga a consumir las participaciones más antiguas, y una regla
 * fiscal escrita dos veces diverge en algo peor que un color. Es la misma reutilización
 * que hace `traspaso-libro.ts`.
 *
 * Se calcula sobre las operaciones **anteriores a la salida**, no sobre el fichero
 * entero: los lotes que existen en ese momento son los únicos que se pueden consumir.
 * Y se agrupa por ISIN, no por ticker, para no depender de que la resolución contra
 * Yahoo haya funcionado.
 */
export function resolverCostesHeredados(ops: OperacionCSV[]): Map<string, CosteHeredado> {
	const resultado = new Map<string, CosteHeredado>();

	// Estable: a igualdad de fecha manda el orden del fichero.
	const enOrden = [...ops].sort((a, b) => a.date.getTime() - b.date.getTime());

	for (const [posicion, op] of enOrden.entries()) {
		if (op.type !== 'TRANSFER_OUT' || !op.transferId) continue;

		const clave = claveDeGrupo(op);
		const previas = enOrden
			.slice(0, posicion)
			.filter((o) => claveDeGrupo(o) === clave)
			.map((o, i) => comoTransaccionDeCartera(o, clave, `prev-${i}`));

		const lotes = buildFifoLots(previas, clave);

		if (lotes.length === 0) {
			resultado.set(op.transferId, {
				coste: null,
				fechaLote: null,
				estado: 'sin-libro',
				costeParcial: null
			});
			continue;
		}

		const salida = simulateSale(lotes, op.shares, op.price);
		const parcial = salida.incomplete;

		resultado.set(op.transferId, {
			coste: parcial ? null : salida.acquisitionCost,
			fechaLote: salida.oldestLotDate,
			estado: parcial ? 'parcial' : 'completo',
			costeParcial: salida.acquisitionCost
		});
	}

	return resultado;
}
