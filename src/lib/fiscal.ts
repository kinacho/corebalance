import {
	esEntradaDeTraspaso,
	esSalidaDeTraspaso,
	type InstrumentType,
	type Transaction
} from './types';

/**
 * Cálculo fiscal de una venta, para el IRPF español.
 *
 * ⚠️ Todo lo que sale de este módulo es una **estimación orientativa**, no una
 * liquidación. Falta por definición el contexto que la app no conoce: el resto
 * de la base del ahorro del contribuyente (dividendos, intereses, otras ventas
 * del mismo ejercicio), las pérdidas pendientes de compensar de los cuatro
 * ejercicios anteriores y cualquier particularidad autonómica o personal. La
 * interfaz tiene que decirlo, y lo dice.
 *
 * Fuentes: art. 33 a 37 LIRPF (ganancias patrimoniales y valor de adquisición),
 * art. 33.5.f (regla antiaplicación), art. 66 (tipos de la base del ahorro) y
 * art. 94 (diferimiento por traspaso entre IIC).
 */

/**
 * Tramos de la base liquidable del ahorro.
 *
 * **Fechado a propósito y en un solo sitio.** Estos tipos han cambiado tres
 * veces en la última década; tenerlos repartidos por la interfaz garantizaría
 * que un día unos se actualicen y otros no. Si cambian, se toca aquí y los
 * tests de este fichero dicen qué se movió.
 */
export const SAVINGS_TAX_YEAR = 2026;

export const SAVINGS_TAX_BRACKETS: { upTo: number; rate: number }[] = [
	{ upTo: 6000, rate: 0.19 },
	{ upTo: 50000, rate: 0.21 },
	{ upTo: 200000, rate: 0.23 },
	{ upTo: 300000, rate: 0.27 },
	{ upTo: Infinity, rate: 0.3 }
];

/**
 * Impuesto sobre una ganancia patrimonial, por tramos.
 *
 * `otherGains` permite meter la ganancia en su sitio de la escala cuando el
 * usuario ya ha realizado plusvalías este año: los tramos son progresivos, así
 * que los mismos 5.000 € de beneficio tributan al 19 % o al 21 % según lo que
 * lleve acumulado. Sin este parámetro la estimación siempre saldría por debajo.
 */
export function calculateSavingsTax(gain: number, otherGains = 0): number {
	if (gain <= 0) return 0;

	let tax = 0;
	let floor = Math.max(0, otherGains);
	let remaining = gain;
	let previousCeiling = 0;

	for (const bracket of SAVINGS_TAX_BRACKETS) {
		const bracketWidth = bracket.upTo - previousCeiling;
		previousCeiling = bracket.upTo;

		// Tramo ya consumido por las ganancias previas del ejercicio.
		if (floor >= bracketWidth) {
			floor -= bracketWidth;
			continue;
		}

		const availableInBracket = bracketWidth - floor;
		floor = 0;
		const taxableHere = Math.min(remaining, availableInBracket);
		tax += taxableHere * bracket.rate;
		remaining -= taxableHere;

		if (remaining <= 0) break;
	}

	return round2(tax);
}

/** El tipo marginal que se le aplicaría al siguiente euro de ganancia. */
export function marginalSavingsRate(accumulatedGain: number): number {
	let previousCeiling = 0;
	for (const bracket of SAVINGS_TAX_BRACKETS) {
		if (accumulatedGain < bracket.upTo) return bracket.rate;
		previousCeiling = bracket.upTo;
	}
	return SAVINGS_TAX_BRACKETS[SAVINGS_TAX_BRACKETS.length - 1].rate;
}

/**
 * De más antigua a más reciente, que es el orden que FIFO da por supuesto.
 *
 * ⚠️ Estaba escrito dos veces, y no es cosmético: un CSV de bróker llega en cualquier
 * orden —hay quien los exporta del más reciente al más antiguo— y si la ordenación falla,
 * FIFO consume el lote equivocado y el valor de adquisición sale mal sin que nada avise.
 * Con dos copias, el mutation testing encontraba el mismo mutante vivo en las dos, porque
 * cada test cubría solo una.
 */
function porFechaAscendente(a: { date: number }, b: { date: number }): number {
	return a.date - b.date;
}

/** Un paquete de participaciones compradas a la vez, para consumir por FIFO. */
export interface FifoLot {
	date: number;
	shares: number;
	/** Coste unitario en divisa base, con comisiones repartidas. */
	unitCostBase: number;
}

/**
 * Reconstruye los lotes vivos de un activo por FIFO.
 *
 * FIFO no es una elección: para valores homogéneos el IRPF **obliga** a
 * considerar transmitidas las participaciones más antiguas (art. 37.2 LIRPF).
 * Por eso este módulo no comparte el coste medio ponderado que usa el resto de
 * la app: sirven para cosas distintas y dan cifras distintas a propósito.
 *
 * ⚠️ Divergencia deliberada con `ledgerHoldings`: aquí los **dividendos no
 * reducen el valor de adquisición**. En el ledger sí lo hacen, que es una
 * decisión de presentación razonable (bajan tu coste efectivo), pero
 * fiscalmente un dividendo es rendimiento del capital mobiliario del año en que
 * se cobra y no toca el valor de adquisición de nada. Aplicar el criterio del
 * ledger aquí inflaría la plusvalía y con ella el impuesto estimado.
 *
 * ⚠️ **Las dos patas de un traspaso son el caso interesante de esta función, y
 * la que decide si la app dice la verdad sobre el fondo destino.**
 *
 * Una **salida** consume lotes exactamente como una venta —las participaciones
 * se han ido— pero eso es todo lo que hace: la plusvalía no se realiza, porque
 * el art. 94 la difiere. Aquí no hay nada que declarar, y por eso no aparece en
 * ningún sitio de este módulo salvo consumiendo lotes.
 *
 * Una **entrada** empuja un lote con la fecha y el coste **heredados**, no con
 * los del día. Es la mitad que faltaba: sin ella el lote nacía al precio de hoy,
 * la plusvalía latente desaparecía del libro y la ficha del destino declaraba
 * «plusvalía 0 € · impuesto 0 €» justo después de un traspaso — un número falso,
 * que es peor que la ausencia de número. Y la fecha importa por separado del
 * coste: sin heredarla, la ventana antiaplicación de doce meses se reiniciaba.
 */
export function buildFifoLots(transactions: Transaction[], ticker: string): FifoLot[] {
	const relevant = transactions
		.filter((t) => t.ticker === ticker)
		.sort(porFechaAscendente);

	const lots: FifoLot[] = [];

	const consumirFifo = (shares: number) => {
		let toConsume = shares;
		while (toConsume > 0 && lots.length > 0) {
			const lot = lots[0];
			const taken = Math.min(lot.shares, toConsume);
			lot.shares -= taken;
			toConsume -= taken;
			if (lot.shares <= 1e-9) lots.shift();
		}
	};

	/**
	 * Mete el lote **en su sitio por fecha**, no al final.
	 *
	 * ⚠️ **Sin esto el array deja de estar ordenado por antigüedad y FIFO consume el
	 * lote equivocado.** Las transacciones se recorren por su propia fecha, así que
	 * hasta la 1.22.0 un `push` al final bastaba: la fecha del lote *era* la de la
	 * transacción. Con el coste heredado ya no: una entrada de traspaso apuntada hoy
	 * lleva un lote de hace tres años, y detrás de un saldo inicial de hoy quedaría
	 * segundo en la cola. Entonces `simulateSale` consume primero el lote **nuevo**
	 * —que es lo contrario de lo que el art. 37.2 obliga— y devuelve como
	 * `oldestLotDate` una fecha que no es la más antigua, con lo que la ventana
	 * antiaplicación se mide desde el día equivocado.
	 *
	 * ⚠️ Y no se puede arreglar ordenando al final: una **venta** solo puede consumir
	 * los lotes que existían cuando ocurrió, así que el orden tiene que estar bien
	 * *durante* el recorrido y no solo al terminar.
	 *
	 * Lo encontró `e2e/libro-de-operaciones.spec.ts` recorriendo el ciclo completo: el
	 * destino declaraba «tu participación más antigua es de hoy» teniendo dentro un
	 * lote heredado de febrero.
	 */
	const insertarPorFecha = (lot: FifoLot) => {
		let i = lots.length;
		while (i > 0 && lots[i - 1].date > lot.date) i--;
		lots.splice(i, 0, lot);
	};

	for (const t of relevant) {
		if (t.type === 'buy' || t.type === 'initial_balance' || esEntradaDeTraspaso(t.type)) {
			if (t.shares <= 0) continue;
			const fx = t.fxRate || 1;
			const heredado = t.carriedCostBase !== undefined && t.carriedCostBase >= 0;
			// Las comisiones de compra aumentan el valor de adquisición. El coste heredado
			// ya viene en divisa base, así que no se le aplica `fx`: sería convertir dos veces.
			const costBase = heredado
				? (t.carriedCostBase as number)
				: t.shares * t.price * fx + (t.fees || 0) * fx;
			insertarPorFecha({
				date: t.carriedLotDate ?? t.date,
				shares: t.shares,
				unitCostBase: costBase / t.shares
			});
		} else if (t.type === 'sell' || esSalidaDeTraspaso(t.type)) {
			consumirFifo(t.shares);
		}
		// Los dividendos no crean ni consumen lotes. Ver la nota de arriba.
	}

	return lots.filter((lot) => lot.shares > 1e-9);
}

export interface SaleSimulation {
	sharesSold: number;
	/** Importe bruto recibido, en divisa base. */
	proceeds: number;
	/** Valor de adquisición de lo vendido, en divisa base. */
	acquisitionCost: number;
	/** Positivo = ganancia, negativo = pérdida. */
	gain: number;
	/** Fecha de compra del lote más antiguo consumido, para la regla de dos meses. */
	oldestLotDate: number | null;
	/** True si no había lotes suficientes: el resultado es parcial. */
	incomplete: boolean;
}

/**
 * Qué plusvalía realiza vender `sharesToSell` participaciones al precio actual.
 *
 * `unitPriceBase` es el precio unitario ya convertido a divisa base. Se pide
 * convertido en lugar de recibir precio y cambio por separado para no repetir
 * aquí la conversión que el resto de la app ya hace, que es de donde salió el
 * bug histórico de aplicar el tipo de cambio dos veces.
 */
export function simulateSale(
	lots: FifoLot[],
	sharesToSell: number,
	unitPriceBase: number
): SaleSimulation {
	let remaining = sharesToSell;
	let acquisitionCost = 0;
	let consumed = 0;
	let oldestLotDate: number | null = null;

	for (const lot of lots) {
		if (remaining <= 1e-9) break;
		const taken = Math.min(lot.shares, remaining);
		if (oldestLotDate === null) oldestLotDate = lot.date;
		acquisitionCost += taken * lot.unitCostBase;
		consumed += taken;
		remaining -= taken;
	}

	const proceeds = consumed * unitPriceBase;

	return {
		sharesSold: round4(consumed),
		proceeds: round2(proceeds),
		acquisitionCost: round2(acquisitionCost),
		gain: round2(proceeds - acquisitionCost),
		oldestLotDate,
		incomplete: remaining > 1e-6
	};
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ventana de la regla antiaplicación, en meses.
 *
 * Son **dos meses** para valores admitidos a negociación en un mercado
 * secundario oficial —acciones y ETF, art. 33.5.f— y **un año** para los no
 * admitidos, art. 33.5.g, categoría en la que entran las participaciones de
 * fondos de inversión: no cotizan, se suscriben y reembolsan con la gestora.
 *
 * La diferencia es enorme y va en la dirección incómoda, así que conviene tener
 * claro por qué es esta y no la otra: hay guías de divulgación que aplican los
 * dos meses a los fondos, pero el manual práctico de Renta de la AEAT remite
 * expresamente a la letra g) para reembolsos de participaciones de IIC no
 * admitidas a negociación. Aplicar dos meses a todo sería el error cómodo y le
 * diferiría al usuario una pérdida que creía compensada.
 */
export function antiApplicationWindowMonths(type: InstrumentType): number {
	return type === 'etf' || type === 'equity' ? 2 : 12;
}

export interface AntiApplicationCheck {
	/**
	 * True si hay recompras en la ventana. La pérdida sigue existiendo y se
	 * declara, pero no se integra en la base de este ejercicio.
	 */
	blocked: boolean;
	windowMonths: number;
	/** Compras dentro de la ventana, ordenadas por fecha. */
	blockingPurchases: { date: number; shares: number }[];
	/** Días que faltan para poder recomprar sin perder la deducción. */
	daysUntilSafeRepurchase: number | null;
}

/**
 * Comprueba la regla antiaplicación (art. 33.5.f y 33.5.g LIRPF) para una venta
 * con pérdidas.
 *
 * Es la mina más silenciosa del rebalanceo: vendes un fondo que va en pérdidas
 * para corregir pesos, recompras algo homogéneo dentro de la ventana y esa
 * pérdida no te la puedes compensar en el ejercicio. Nadie te avisa, y una app
 * que propone ventas es exactamente donde hay que avisar.
 *
 * ⚠️ **La pérdida no se pierde: se difiere.** Se declara igual en el ejercicio
 * en que se generó, no se integra a efectos de liquidación, y se integra cuando
 * se transmitan definitivamente las participaciones recompradas. Decirle al
 * usuario que «no la puede deducir» a secas sería asustarle de más.
 *
 * La ventana mira **hacia los dos lados** de la venta: recomprar antes de
 * vender bloquea igual que recomprar después.
 */
export function checkAntiApplicationRule(
	transactions: Transaction[],
	ticker: string,
	type: InstrumentType,
	saleDate: number
): AntiApplicationCheck {
	const windowMonths = antiApplicationWindowMonths(type);
	const windowMs = windowMonths * 30.44 * DAY_MS;

	/*
	 * ⚠️ Una **entrada** de traspaso sí bloquea: es una adquisición de valores
	 * homogéneos, que es lo que la regla mira. Una **salida** no, y no es un olvido:
	 * es una transmisión, y contarla como recompra bloquearía la pérdida de la
	 * propia operación contra sí misma.
	 */
	const blockingPurchases = transactions
		.filter(
			(t) =>
				t.ticker === ticker &&
				(t.type === 'buy' || esEntradaDeTraspaso(t.type)) &&
				t.shares > 0 &&
				Math.abs(t.date - saleDate) <= windowMs
		)
		.map((t) => ({ date: t.date, shares: t.shares }))
		.sort(porFechaAscendente);

	// La espera se cuenta desde la compra más reciente dentro de la ventana:
	// hasta que esa compra salga de la ventana, la pérdida sigue bloqueada.
	let daysUntilSafeRepurchase: number | null = null;
	if (blockingPurchases.length > 0) {
		const latest = blockingPurchases[blockingPurchases.length - 1].date;
		const safeFrom = latest + windowMs;
		daysUntilSafeRepurchase = Math.max(0, Math.ceil((safeFrom - saleDate) / DAY_MS));
	}

	return {
		blocked: blockingPurchases.length > 0,
		windowMonths,
		blockingPurchases,
		daysUntilSafeRepurchase
	};
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

function round4(value: number): number {
	return Math.round(value * 10000) / 10000;
}
