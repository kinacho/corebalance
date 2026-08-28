import { describe, it, expect } from 'vitest';
import {
	hayDireccionSupuesta,
	sugerirTraspasos,
	aplicarDireccion,
	resolverCostesHeredados,
	claveDeGrupo,
	type ParejaSugerida
} from './direccion';
import { reduceTransactionsToPositions } from './aggregator';
import type { Transaction } from './types';

/**
 * El paso de dirección: qué hacer cuando el fichero **no dice** si cada orden entra o
 * sale.
 *
 * ⚠️ **Los números de aquí están inventados a propósito, y la forma del caso no.** Esto
 * salió de un export real de Órdenes de MyInvestor con un traspaso dentro, pero
 * `training/` está ignorado entero justamente porque un CSV de bróker lleva ISIN, saldos
 * y números de orden de una persona — y este repo es público. Así que se reproduce la
 * **estructura** del caso (varias compras, una salida, la pata de entrada en otro fondo
 * unos días después) con cifras que hacen la aritmética legible: el coste heredado sale
 * 10,00 € y el de suscripción 13,10 €, que no se pueden confundir en un `expect`.
 */

const DIA = 24 * 60 * 60 * 1000;
const ENERO_10 = new Date('2026-01-10T00:00:00Z');
const FEBRERO_10 = new Date('2026-02-10T00:00:00Z');
const MARZO_10 = new Date('2026-03-10T00:00:00Z');
const MARZO_13 = new Date('2026-03-13T00:00:00Z');

function op(over: Partial<Transaction> & Pick<Transaction, 'shares' | 'price'>): Transaction {
	return {
		date: ENERO_10,
		type: 'BUY',
		isin: 'IE00FONDOA',
		name: 'Fondo A',
		currency: 'EUR',
		directionAssumed: true,
		...over
	};
}

/** Dos compras en A, una salida en A, y la entrada en B tres días después. */
function ficheroConTraspaso(): Transaction[] {
	return [
		op({ date: ENERO_10, shares: 100, price: 10 }),
		op({ date: FEBRERO_10, shares: 100, price: 12 }),
		op({ date: MARZO_10, shares: 50, price: 13 }),
		op({ date: MARZO_13, shares: 50, price: 13.1, isin: 'IE00FONDOB', name: 'Fondo B' })
	];
}

/**
 * En la mayoría de casos los dos son fondos, así que la mayoría de pruebas lo dicen y se
 * concentran en fechas e importes. Los dos casos donde **no** lo son tienen su propio
 * bloque, porque ahí lo que se prueba es la regla fiscal.
 */
const FONDOS = { esTraspasable: () => true };

describe('claveDeGrupo', () => {
	it('prefiere el ISIN, y cae al ticker y al nombre', () => {
		expect(claveDeGrupo({ isin: 'IE00X', ticker: 'VWCE', name: 'n' })).toBe('IE00X');
		expect(claveDeGrupo({ isin: '', ticker: 'vwce', name: 'n' })).toBe('VWCE');
		expect(claveDeGrupo({ isin: '', ticker: '', name: 'Fondo A' })).toBe('FONDO A');
	});
});

describe('hayDireccionSupuesta', () => {
	it('es cierto cuando alguna operación viene sin dirección del fichero', () => {
		expect(hayDireccionSupuesta(ficheroConTraspaso())).toBe(true);
	});

	it('es falso cuando el fichero dice el tipo de todas', () => {
		const ops = ficheroConTraspaso().map((o) => ({ ...o, directionAssumed: undefined }));
		expect(hayDireccionSupuesta(ops)).toBe(false);
	});
});

describe('sugerirTraspasos', () => {
	it('empareja la salida con la entrada de otro fondo pocos días después', () => {
		const parejas = sugerirTraspasos(ficheroConTraspaso(), FONDOS);

		expect(parejas).toHaveLength(1);
		expect(parejas[0].salida).toBe(2);
		expect(parejas[0].entrada).toBe(3);
		expect(parejas[0].dias).toBe(3);
		// 50 × 13,10 − 50 × 13 = 5 €, lo que se movió el valor liquidativo entremedias.
		expect(parejas[0].diferencia).toBeCloseTo(5, 6);
	});

	/**
	 * ⚠️ La pata que sale es la **más antigua**: se ordena en el origen y el destino
	 * suscribe después. Con el orden invertido la pareja tiene que salir igual, porque
	 * lo que decide es la fecha y no la posición en el array.
	 */
	it('la salida es la más antigua, venga en el orden que venga en el fichero', () => {
		const ops = ficheroConTraspaso();
		const alReves = [ops[3], ops[2], ops[1], ops[0]];
		const parejas = sugerirTraspasos(alReves, FONDOS);

		expect(parejas).toHaveLength(1);
		expect(alReves[parejas[0].salida].date).toEqual(MARZO_10);
		expect(alReves[parejas[0].entrada].date).toEqual(MARZO_13);
	});

	it('no empareja dos operaciones del mismo fondo', () => {
		const ops = ficheroConTraspaso();
		ops[3] = { ...ops[3], isin: 'IE00FONDOA', name: 'Fondo A' };
		expect(sugerirTraspasos(ops, FONDOS)).toEqual([]);
	});

	it('no empareja fuera de la ventana de días', () => {
		const ops = ficheroConTraspaso();
		ops[3] = { ...ops[3], date: new Date(MARZO_10.getTime() + 40 * DIA) };
		expect(sugerirTraspasos(ops, FONDOS)).toEqual([]);
	});

	it('no empareja importes que se separan más de la tolerancia', () => {
		const ops = ficheroConTraspaso();
		// 50 × 20 = 1.000 contra los 650 que salieron: un 35 % de diferencia.
		ops[3] = { ...ops[3], price: 20 };
		expect(sugerirTraspasos(ops, FONDOS)).toEqual([]);
	});

	/**
	 * ⚠️ **Con las dos patas el mismo día no hay nada que desempate cuál es cuál**, y
	 * adivinarlo es exactamente lo que este módulo no hace. El usuario puede marcarlas a
	 * mano; la app no se lo inventa.
	 */
	it('no propone nada cuando las dos son del mismo día', () => {
		const ops = ficheroConTraspaso();
		ops[3] = { ...ops[3], date: MARZO_10 };
		expect(sugerirTraspasos(ops, FONDOS)).toEqual([]);
	});

	it('no toca las operaciones cuya dirección sí venía en el fichero', () => {
		const ops = ficheroConTraspaso().map((o) => ({ ...o, directionAssumed: undefined }));
		expect(sugerirTraspasos(ops, FONDOS)).toEqual([]);
	});

	/**
	 * La guarda que evita una posición negativa: proponer como salida una orden que se
	 * lleva más participaciones de las que hay es proponer una cartera imposible, y eso
	 * no se ve en pantalla como un error.
	 */
	it('no propone una salida que el origen no puede pagar', () => {
		const ops = [
			op({ date: ENERO_10, shares: 10, price: 10 }),
			op({ date: MARZO_10, shares: 500, price: 13 }),
			op({ date: MARZO_13, shares: 500, price: 13.1, isin: 'IE00FONDOB', name: 'Fondo B' })
		];
		expect(sugerirTraspasos(ops, FONDOS)).toEqual([]);
	});

	/**
	 * Con dos candidatas para la misma entrada gana la de importe más parecido, y la
	 * perdedora no se recicla: una operación no puede salir dos veces.
	 */
	it('elige la pareja de importe más parecido y no reutiliza operaciones', () => {
		const ops = [
			op({ date: ENERO_10, shares: 200, price: 10 }),
			// Dos salidas candidatas el mismo día en fondos distintos, una clavada y otra al 4 %.
			op({ date: MARZO_10, shares: 50, price: 13 }),
			op({ date: MARZO_10, shares: 50, price: 13.5, isin: 'IE00FONDOC', name: 'Fondo C' }),
			op({ date: MARZO_13, shares: 50, price: 13, isin: 'IE00FONDOB', name: 'Fondo B' })
		];

		const parejas = sugerirTraspasos(ops, FONDOS);

		expect(parejas).toHaveLength(1);
		expect(parejas[0].salida).toBe(1);
		expect(parejas[0].entrada).toBe(3);
	});

	/**
	 * ⚠️ **Solo fondo → fondo difiere el impuesto (art. 94).** Un fondo que se reembolsa
	 * para comprar un ETF es un reembolso y **tributa**, aunque el origen sea un fondo, y
	 * proponer ahí un traspaso sería proponer un diferimiento que no existe: se escribiría
	 * `carriedCostBase`, la plusvalía realizada desaparecería del panel de IRPF y el
	 * usuario declararía de menos.
	 *
	 * No es hipotético: el arnés de navegador propuso exactamente eso —con un ETF de
	 * destino— antes de que esta condición existiera.
	 */
	it('no propone traspasar a algo que no es un fondo', () => {
		const ops = ficheroConTraspaso();
		const parejas = sugerirTraspasos(ops, {
			esTraspasable: (o) => o.isin !== 'IE00FONDOB'
		});
		expect(parejas).toEqual([]);
	});

	it('tampoco propone traspasar DESDE algo que no es un fondo', () => {
		const ops = ficheroConTraspaso();
		const parejas = sugerirTraspasos(ops, {
			esTraspasable: (o) => o.isin !== 'IE00FONDOA'
		});
		expect(parejas).toEqual([]);
	});
});

describe('aplicarDireccion', () => {
	const id = () => 'tid-fijo';

	it('marca como venta lo que el usuario ha señalado', () => {
		const ops = ficheroConTraspaso();
		const salida = aplicarDireccion(ops, { salidas: new Set([2]) }, id);

		expect(salida[2].type).toBe('SELL');
		expect(salida[0].type).toBe('BUY');
	});

	it('marca las dos patas de un traspaso y las une con el mismo identificador', () => {
		const ops = ficheroConTraspaso();
		const pareja: ParejaSugerida = { salida: 2, entrada: 3, dias: 3, diferencia: 5 };
		const salida = aplicarDireccion(ops, { traspasos: [pareja] }, id);

		expect(salida[2].type).toBe('TRANSFER_OUT');
		expect(salida[3].type).toBe('TRANSFER_IN');
		expect(salida[2].transferId).toBe('tid-fijo');
		expect(salida[3].transferId).toBe('tid-fijo');
	});

	/**
	 * Marcar una salida dice «esto se fue»; la pareja dice además a dónde, que es
	 * estrictamente más información. Así que manda el traspaso.
	 */
	it('el traspaso manda sobre una salida suelta en el mismo índice', () => {
		const ops = ficheroConTraspaso();
		const salida = aplicarDireccion(
			ops,
			{ salidas: new Set([2]), traspasos: [{ salida: 2, entrada: 3, dias: 3, diferencia: 5 }] },
			id
		);

		expect(salida[2].type).toBe('TRANSFER_OUT');
	});

	it('no muta las operaciones que recibe', () => {
		const ops = ficheroConTraspaso();
		aplicarDireccion(ops, { salidas: new Set([2]) }, id);
		expect(ops[2].type).toBe('BUY');
	});
});

describe('resolverCostesHeredados', () => {
	function conTraspasoAplicado(): Transaction[] {
		return aplicarDireccion(
			ficheroConTraspaso(),
			{ traspasos: [{ salida: 2, entrada: 3, dias: 3, diferencia: 5 }] },
			() => 'tid'
		);
	}

	/**
	 * FIFO, no coste medio: salen las 50 más antiguas, que son las de 10 €. El coste
	 * medio ponderado habría dicho 11 € × 50 = 550, y sería la cifra equivocada — el
	 * art. 37.2 obliga a consumir las más antiguas para valores homogéneos.
	 */
	it('el coste que viaja sale por FIFO de los lotes del origen', () => {
		const costes = resolverCostesHeredados(conTraspasoAplicado());
		const heredado = costes.get('tid');

		expect(heredado?.estado).toBe('completo');
		expect(heredado?.coste).toBe(500);
	});

	/**
	 * ⚠️ Sin la fecha heredada la ventana antiaplicación de doce meses se reinicia el día
	 * del traspaso, que es el segundo daño silencioso del traspaso apuntado a mano.
	 */
	it('hereda la fecha del lote más antiguo consumido, no la del traspaso', () => {
		const costes = resolverCostesHeredados(conTraspasoAplicado());
		expect(costes.get('tid')?.fechaLote).toBe(ENERO_10.getTime());
	});

	it('sin compras previas en el origen no hay nada que heredar', () => {
		const ops = aplicarDireccion(
			[
				op({ date: MARZO_10, shares: 50, price: 13 }),
				op({ date: MARZO_13, shares: 50, price: 13.1, isin: 'IE00FONDOB', name: 'Fondo B' })
			],
			{ traspasos: [{ salida: 0, entrada: 1, dias: 3, diferencia: 5 }] },
			() => 'tid'
		);

		const heredado = resolverCostesHeredados(ops).get('tid');
		expect(heredado?.estado).toBe('sin-libro');
		expect(heredado?.coste).toBeNull();
	});

	/**
	 * ⚠️ **Un coste parcial no se escribe.** Calculado sobre lotes que no llegan es un
	 * coste demasiado bajo, y un coste demasiado bajo no se lee como incompleto: se lee
	 * como una plusvalía futura mayor de la que hay. Se guarda aparte para poder
	 * enseñarlo, no para escribirlo.
	 */
	it('un historial que no llega deja el coste en null pero guarda lo que sí sabe', () => {
		const ops = aplicarDireccion(
			[
				op({ date: ENERO_10, shares: 30, price: 10 }),
				op({ date: MARZO_10, shares: 50, price: 13 }),
				op({ date: MARZO_13, shares: 50, price: 13.1, isin: 'IE00FONDOB', name: 'Fondo B' })
			],
			{ traspasos: [{ salida: 1, entrada: 2, dias: 3, diferencia: 5 }] },
			() => 'tid'
		);

		const heredado = resolverCostesHeredados(ops).get('tid');
		expect(heredado?.estado).toBe('parcial');
		expect(heredado?.coste).toBeNull();
		expect(heredado?.costeParcial).toBe(300);
	});

	/**
	 * Solo se pueden consumir los lotes que ya existían: una compra posterior al
	 * traspaso no puede pagar lo que se fue antes.
	 */
	it('no consume lotes comprados después del traspaso', () => {
		const ops = aplicarDireccion(
			[
				op({ date: ENERO_10, shares: 30, price: 10 }),
				op({ date: MARZO_10, shares: 50, price: 13 }),
				op({ date: MARZO_13, shares: 50, price: 13.1, isin: 'IE00FONDOB', name: 'Fondo B' }),
				// Una compra en A posterior al traspaso: no puede entrar en el coste heredado.
				op({ date: new Date('2026-04-10T00:00:00Z'), shares: 100, price: 20 })
			],
			{ traspasos: [{ salida: 1, entrada: 2, dias: 3, diferencia: 5 }] },
			() => 'tid'
		);

		expect(resolverCostesHeredados(ops).get('tid')?.costeParcial).toBe(300);
	});
});

/**
 * El paso completo, que es lo que de verdad importa: lo que la previsualización enseña
 * tiene que ser lo que se escribe.
 */
describe('el fichero sin dirección, de punta a punta', () => {
	it('suponerlo todo compra infla el origen al DOBLE de lo que salió', () => {
		const { positions } = reduceTransactionsToPositions(ficheroConTraspaso());
		const a = positions.find((p) => p.isin === 'IE00FONDOA');

		// 100 + 100 + 50 = 250, cuando en el banco hay 150. Sobran 100, que son 2 × 50.
		expect(a?.shares).toBe(250);
	});

	/**
	 * ⚠️ **Este caso esperaba que el destino saliera a 10 € —el coste heredado— y desde la
	 * 1.23.1 espera 13,10 €, lo suscrito. Se reescribe en vez de borrarse porque un cambio
	 * de contrato tiene que verse en la prueba que lo guardaba.**
	 *
	 * El razonamiento de entonces («el valor de adquisición viaja, así que la entrada no
	 * vale lo que costó suscribir») es correcto **para `fiscal.ts`** y equivocado para lo
	 * que se pinta: esta cifra es la que el usuario coteja contra su extracto, y la fuente
	 * de la verdad de «cuánto llevo metido» es la gestora. Con el criterio viejo la app
	 * enseñaba un coste medio que no aparece en ningún papel suyo.
	 */
	it('confirmado el traspaso, el origen cuadra y el destino entra por lo suscrito', () => {
		const ops = aplicarDireccion(
			ficheroConTraspaso(),
			{ traspasos: [{ salida: 2, entrada: 3, dias: 3, diferencia: 5 }] },
			() => 'tid'
		);
		const { positions } = reduceTransactionsToPositions(ops);

		const a = positions.find((p) => p.isin === 'IE00FONDOA');
		const b = positions.find((p) => p.isin === 'IE00FONDOB');

		// El origen: 200 − 50 = 150, y la salida no mueve el coste medio.
		expect(a?.shares).toBe(150);
		expect(a?.avgCost).toBeCloseTo(11, 6);

		expect(b?.shares).toBe(50);
		expect(b?.avgCost).toBeCloseTo(13.1, 6);

		/*
		 * Y la otra mitad del reparto, aquí al lado a propósito: el valor de adquisición
		 * del art. 94 sigue calculándose y sigue siendo 500 € —no los 655 € suscritos—,
		 * para que `ledger-import.ts` lo escriba y `fiscal.ts` lo lea. Que la instantánea
		 * ya no lo use no significa que se haya perdido.
		 */
		expect(resolverCostesHeredados(ops).get('tid')?.coste).toBe(500);
	});

	it('marcada solo como venta, el origen cuadra igual y el destino no hereda nada', () => {
		const ops = aplicarDireccion(ficheroConTraspaso(), { salidas: new Set([2]) });
		const { positions } = reduceTransactionsToPositions(ops);

		expect(positions.find((p) => p.isin === 'IE00FONDOA')?.shares).toBe(150);
		expect(positions.find((p) => p.isin === 'IE00FONDOB')?.avgCost).toBeCloseTo(13.1, 6);
	});
});

/**
 * El caso que destapó el defecto de la 1.23.0, con su forma y no con sus cifras — el
 * fichero real lleva ISIN y saldos de una persona y este repo es público.
 *
 * ⚠️ **La invariante que fija es la que se rompió: el coste medio de la app tiene que ser
 * el mismo que el usuario lee en su banco.** Un número correcto que no aparece en ningún
 * extracto suyo no se puede verificar, y ahí es donde la app dijo 12,58 € contra los
 * 13,41 € del banco. La comprobación se hace sobre las **tres** filas del destino a la
 * vez, porque el defecto solo aparece cuando una de ellas es una entrada de traspaso.
 */
describe('el coste medio que enseña la app es el del extracto', () => {
	const dia = (d: string) => new Date(`${d}T00:00:00Z`);

	it('un destino con dos compras y una entrada de traspaso cuadra con el banco', () => {
		const ops: Transaction[] = [
			op({ date: dia('2026-04-13'), shares: 1.61, price: 12.578, isin: 'IE00DEST', name: 'Destino' }),
			op({ date: dia('2026-04-27'), shares: 43.43, price: 12.894, isin: 'IE00DEST', name: 'Destino' }),
			{
				date: dia('2026-08-24'),
				type: 'TRANSFER_IN',
				isin: 'IE00DEST',
				name: 'Destino',
				shares: 51.13,
				price: 13.874,
				currency: 'EUR',
				transferId: 'tid'
			}
		];

		const destino = reduceTransactionsToPositions(ops).positions[0];

		expect(destino.shares).toBeCloseTo(96.17, 6);
		/*
		 * 20,25 + 560,00 + 709,38 = 1.289,63 € invertidos, y 1.289,63 / 96,17 = 13,41 €.
		 * Con el criterio de la 1.23.0 —la entrada valorada a su coste heredado— salía
		 * 12,58 €, que es la cifra que el usuario no podía cuadrar contra nada.
		 */
		// Un decimal y no dos: los precios unitarios de arriba vienen de dividir importes
		// del extracto entre participaciones, así que arrastran ~1,5 céntimos de redondeo.
		// Lo que se fija es el coste medio, que es la cifra que el usuario compara.
		expect(destino.shares * destino.avgCost).toBeCloseTo(1289.63, 1);
		expect(destino.avgCost).toBeCloseTo(13.41, 2);
	});
});
