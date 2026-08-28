import { describe, it, expect } from 'vitest';
import { planificarTraspaso, sugerirEstadoDestino, meritaApuntar } from './traspaso-libro';
import type { Asset, InstrumentType, Transaction } from './types';

/*
 * Fechas fijas, nunca `Date.now()`: aquí se hereda una fecha de adquisición y de
 * ella depende la ventana antiaplicación, o sea aritmética de fechas. Un test
 * sobre el reloj real pasa hoy y falla en tres meses.
 */
const DIA = 24 * 60 * 60 * 1000;
const HOY = Date.UTC(2026, 7, 27);
const HACE_TRES_ANOS = Date.UTC(2023, 2, 12);
const HACE_UN_ANO = Date.UTC(2025, 7, 27);

function activo(ticker: string, type: InstrumentType): Asset {
	return {
		ticker,
		name: ticker,
		isin: '',
		targetWeight: 0.5,
		color: '#000',
		icon: '📈',
		ter: 0,
		category: 'core',
		instrumentType: type
	};
}

function compra(ticker: string, fecha: number, shares: number, price: number): Transaction {
	return {
		id: `${ticker}-${fecha}-${shares}`,
		ticker,
		type: 'buy',
		date: fecha,
		shares,
		price,
		currency: 'EUR',
		fees: 0,
		fxRate: 1
	};
}

const FONDO_A = activo('0P0001AAAA.F', 'fund');
const FONDO_B = activo('0P0001BBBB.F', 'fund');
const UN_ETF = activo('IWDA.AS', 'etf');

describe('planificarTraspaso', () => {
	describe('los tres modos de «cuánto» cuadran el importe entre los dos lados', () => {
		it('«todo» saca la posición entera', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(plan.participacionesOrigen).toBe(100);
			expect(plan.importe).toBe(8000);
			// 8.000 € a 20 € la participación.
			expect(plan.participacionesDestino).toBe(400);
			expect(plan.vaciaElOrigen).toBe(true);
		});

		it('un importe en euros se reparte a los precios de cada lado', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'importe', importe: 5000 },
				fecha: HOY
			});

			expect(plan.participacionesOrigen).toBe(62.5);
			expect(plan.importe).toBe(5000);
			expect(plan.participacionesDestino).toBe(250);
			expect(plan.vaciaElOrigen).toBe(false);
		});

		it('unas participaciones dan el importe que valen', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'participaciones', participaciones: 25 },
				fecha: HOY
			});

			expect(plan.participacionesOrigen).toBe(25);
			expect(plan.importe).toBe(2000);
			expect(plan.participacionesDestino).toBe(100);
		});

	/**
		 * ⚠️ **Este caso comprobaba antes que el importe cuadraba dividiéndolo por el
		 * precio de destino, y ese precio ya no existe.** Se reescribe en vez de
		 * borrarse, porque es un cambio de contrato y tiene que verse en la prueba que
		 * lo guardaba: las participaciones que entran salen de una **resta** contra el
		 * estado final, no de dividir el importe por un valor liquidativo que en la
		 * fecha de la orden todavía no se conoce.
		 */
		it('lo que entra sale de una resta contra el estado final, no de dividir por un precio', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 137.42,
				// Un precio de destino absurdo a propósito: no debe influir en nada cuando
				// el usuario declara el estado final.
				precioDestinoHoy: 8.31,
				destinoAntes: { participaciones: 120, costeTotalBase: 1000 },
				destinoResultante: { participaciones: 700, costeMedio: 9 },
				cuanto: { modo: 'importe', importe: 5000 },
				fecha: HOY
			});

			// Lo que sale del origen sigue valiendo el importe pedido.
			expect(plan.participacionesOrigen * plan.precioOrigen).toBeCloseTo(plan.importe, 1);
			// Y lo que entra es 700 − 120, sin que el 8,31 aparezca por ninguna parte.
			expect(plan.participacionesDestino).toBe(580);
			// Coste suscrito que entra: 700 × 9 − 1.000 = 5.300.
			expect(plan.costeSuscripcion).toBe(5300);
		});
	});

	describe('el tope es lo que tienes, en los tres modos', () => {
		/*
		 * Sin el tope, el origen se queda en participaciones negativas y el destino
		 * recibe dinero que no existe — y ninguna de las dos cosas se ve como un error
		 * en pantalla, se ve como una cartera.
		 */
		it('pedir más euros de los que valen no saca más de lo que hay', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 50, 42)],
				participacionesOrigen: 50,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'importe', importe: 999_999 },
				fecha: HOY
			});

			expect(plan.participacionesOrigen).toBe(50);
			expect(plan.importe).toBe(4000);
			expect(plan.vaciaElOrigen).toBe(true);
		});

		it('pedir más participaciones de las que hay tampoco', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 50, 42)],
				participacionesOrigen: 50,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'participaciones', participaciones: 500 },
				fecha: HOY
			});

			expect(plan.participacionesOrigen).toBe(50);
			expect(plan.vaciaElOrigen).toBe(true);
		});
	});

	describe('el coste de adquisición viaja', () => {
		it('hereda el coste y la fecha del lote, no los de hoy', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(plan.estadoCoste).toBe('completo');
			expect(plan.costeHeredado).toBe(4200);
			expect(plan.fechaLoteHeredado).toBe(HACE_TRES_ANOS);
			// 8.000 de valor contra 4.200 de coste: la plusvalía latente viaja también.
			expect(plan.plusvaliaLatente).toBe(3800);
		});

		it('con varios lotes hereda la fecha del MÁS ANTIGUO consumido', () => {
			/*
			 * No es un detalle: la fecha heredada es lo que decide la ventana
			 * antiaplicación del destino. Quedarse con la más reciente la acortaría.
			 */
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [
					compra(FONDO_A.ticker, HACE_TRES_ANOS, 40, 40),
					compra(FONDO_A.ticker, HACE_UN_ANO, 60, 60)
				],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(plan.fechaLoteHeredado).toBe(HACE_TRES_ANOS);
			// 40 × 40 + 60 × 60 = 5.200
			expect(plan.costeHeredado).toBe(5200);
		});

		it('un traspaso parcial hereda solo el coste de lo que sale, por FIFO', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [
					compra(FONDO_A.ticker, HACE_TRES_ANOS, 40, 40),
					compra(FONDO_A.ticker, HACE_UN_ANO, 60, 60)
				],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'participaciones', participaciones: 40 },
				fecha: HOY
			});

			// FIFO: se va el lote viejo entero y ninguno del nuevo.
			expect(plan.costeHeredado).toBe(1600);
			expect(plan.fechaLoteHeredado).toBe(HACE_TRES_ANOS);
			expect(plan.estadoCoste).toBe('completo');
		});
	});

	describe('los tres estados se devuelven como estados y no como ceros', () => {
		/*
		 * Un 0 € de coste heredado se lee como «no arrastras nada» cuando lo que pasa
		 * es que no se sabe, y de ahí sale una plusvalía del 100 % inventada.
		 */
		it('«sin-libro»: el origen no tiene transacciones', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(plan.estadoCoste).toBe('sin-libro');
			expect(plan.costeHeredado).toBeNull();
			expect(plan.fechaLoteHeredado).toBeNull();
			expect(plan.plusvaliaLatente).toBeNull();
			// Y el traspaso en sí se puede apuntar igual: lo que falta es la historia.
			expect(plan.participacionesDestino).toBe(400);
		});

		it('«sin-libro» también cuando las transacciones son de otro activo', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_B.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(plan.estadoCoste).toBe('sin-libro');
			expect(plan.costeHeredado).toBeNull();
		});

		it('«parcial»: los lotes no cubren las participaciones que dice tener', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				// El libro solo conoce 30 de las 100 participaciones.
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 30, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(plan.estadoCoste).toBe('parcial');
			expect(plan.costeHeredado).toBe(1260);
		});
	});

	describe('el trato fiscal', () => {
		it('fondo → fondo es traspaso y no tributa', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(plan.trato).toBe('traspaso');
			expect(plan.sinTributar).toBe(true);
		});

		it('fondo → ETF es un reembolso y tributa, aunque el origen sea un fondo', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: UN_ETF,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(plan.trato).toBe('reembolso');
			expect(plan.sinTributar).toBe(false);
			// Y se planifica igual: se avisa, no se bloquea.
			expect(plan.participacionesDestino).toBe(400);
		});
	});

	describe('precios degenerados no producen basura', () => {
		it('un precio de destino a cero no da participaciones infinitas', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 0,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(plan.participacionesDestino).toBe(0);
			expect(Number.isFinite(plan.participacionesDestino)).toBe(true);
			expect(meritaApuntar(plan)).toBe(false);
		});

		it('un precio de origen a cero no permite pedir un importe', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 0,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'importe', importe: 5000 },
				fecha: HOY
			});

			expect(plan.participacionesOrigen).toBe(0);
			expect(meritaApuntar(plan)).toBe(false);
		});
	});

	describe('meritaApuntar', () => {
		it('un plan con las dos patas pobladas se puede apuntar', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(meritaApuntar(plan)).toBe(true);
		});

		it('un importe a cero es un formulario a medio rellenar, no un error', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'importe', importe: 0 },
				fecha: HOY
			});

			expect(meritaApuntar(plan)).toBe(false);
		});

		it('un origen vacío no se puede traspasar', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [],
				participacionesOrigen: 0,
				precioOrigen: 80,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				cuanto: { modo: 'todo' },
				fecha: HOY
			});

			expect(meritaApuntar(plan)).toBe(false);
		});
	});

	it('no lee el reloj: la fecha que devuelve es la que se le pasa', () => {
		const plan = planificarTraspaso({
			origen: FONDO_A,
			destino: FONDO_B,
			transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
			participacionesOrigen: 100,
			precioOrigen: 80,
			precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
			cuanto: { modo: 'todo' },
			fecha: HOY - 30 * DIA
		});

	expect(plan.fecha).toBe(HOY - 30 * DIA);
	});

	/**
	 * ⚠️ **Declarar cómo queda el destino, que es la forma de entrada que de verdad se
	 * puede rellenar.**
	 *
	 * En un traspaso los dos valores liquidativos —el de reembolso y el de
	 * suscripción— se fijan días después de dar la orden, así que el usuario no los
	 * sabe: pedírselos convertía dos cifras que tiene delante en el extracto en dos que
	 * tiene que adivinar, y cualquier error ahí descuadra las dos posiciones al céntimo
	 * sin forma de cerrarlo después. Lo que sí sabe es cuántas participaciones tiene en
	 * el fondo destino y a qué coste medio.
	 */
	describe('el estado final que declara el usuario', () => {
		const base = {
			origen: FONDO_A,
			destino: FONDO_B,
			transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
			participacionesOrigen: 100,
			precioOrigen: 80,
			precioDestinoHoy: 20,
			cuanto: { modo: 'todo' } as const,
			fecha: HOY
		};

		it('cuadra por construcción: lo que entra es la resta contra lo que había', () => {
			const plan = planificarTraspaso({
				...base,
				destinoAntes: { participaciones: 45, costeTotalBase: 540 },
				// «Mi banco dice que ahora tengo 445 participaciones a 12,54 € de media.»
				destinoResultante: { participaciones: 445, costeMedio: 12.54 }
			});

			expect(plan.participacionesDestino).toBe(400);
			// 445 × 12,54 = 5.580,30, menos los 540 € que ya había = 5.040,30.
			// Es `costeSuscripcion` y no `costeHeredado`: la resta contra el estado
			// declarado da lo que el banco dice que has metido, no el valor de
			// adquisición del art. 94, que sale de los lotes del origen.
			expect(plan.costeSuscripcion).toBe(5040.3);
			// Y el estado final resuelto se devuelve, que es lo que precarga el formulario.
			expect(plan.destinoResultante).toEqual({ participaciones: 445, costeMedio: 12.54 });
		});

		it('el valor liquidativo del destino NO influye cuando se declara el resultado', () => {
			/*
			 * Es el punto entero: el precio de hoy sirve para estimar y nada más. Con el
			 * estado declarado, cambiarlo no puede mover ni una participación.
			 */
			const conUnPrecio = planificarTraspaso({
				...base,
				precioDestinoHoy: 20,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				destinoResultante: { participaciones: 400, costeMedio: 10.5 }
			});
			const conOtro = planificarTraspaso({
				...base,
				precioDestinoHoy: 999,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				destinoResultante: { participaciones: 400, costeMedio: 10.5 }
			});

			expect(conOtro.participacionesDestino).toBe(conUnPrecio.participacionesDestino);
			expect(conOtro.costeHeredado).toBe(conUnPrecio.costeHeredado);
		});

		it('sin declarar nada, lo fiscal sale del libro y lo suscrito del importe movido', () => {
			const plan = planificarTraspaso({
				...base,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 }
			});

			expect(plan.costeHeredado).toBe(4200);
			// La estimación pone las 400 participaciones a los 4.200 € que viajan.
			expect(plan.destinoResultante.participaciones).toBe(400);
			expect(plan.destinoResultante.costeMedio).toBe(10.5);
		});

		/**
		 * ⚠️ **Este caso afirmaba que lo declarado MANDA sobre el libro, y en la 1.23.1 se
		 * invierte. Se reescribe en vez de borrarse porque un cambio de contrato tiene que
		 * verse en la prueba que lo guardaba.**
		 *
		 * El argumento de entonces era que la cifra del banco «es la que la gestora
		 * reportará a Hacienda». Es falso, y esa confusión es el defecto: lo que el usuario
		 * lee en su extracto es el **importe suscrito**, un flujo de caja, no el valor de
		 * adquisición del art. 94 — que la gestora arrastra por obligación y no enseña en
		 * esa pantalla. Ahora son dos campos: lo fiscal siempre del libro, lo suscrito de
		 * lo declarado.
		 */
		it('lo declarado alimenta el coste suscrito, y lo fiscal sigue saliendo del libro', () => {
			const plan = planificarTraspaso({
				...base,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				// El banco dice 4.900 € suscritos; el libro del origen dice que viajan 4.200 €.
				destinoResultante: { participaciones: 400, costeMedio: 12.25 }
			});

			expect(plan.costeSegunElLibro).toBe(4200);
			expect(plan.costeHeredado).toBe(4200);
			expect(plan.costeSuscripcion).toBe(4900);
		});

		/**
		 * ⚠️ **Y este decía que declarar el resultado da coste heredado aunque el origen no
		 * tenga libro — «capacidad nueva».** No lo era: lo declarado es el importe suscrito,
		 * así que sin libro en el origen el valor de adquisición sigue sin saberse y `null`
		 * es la única respuesta honesta. Afirmar un coste que nadie ha comprobado es el
		 * defecto del importador que metía activos a coste 0.
		 */
		it('con el origen sin libro no hay coste fiscal, se declare lo que se declare', () => {
			const declarado = planificarTraspaso({
				...base,
				transacciones: [],
				destinoAntes: { participaciones: 0, costeTotalBase: 0 },
				destinoResultante: { participaciones: 400, costeMedio: 10.5 }
			});
			expect(declarado.estadoCoste).toBe('sin-libro');
			expect(declarado.costeHeredado).toBeNull();
			// Pero lo suscrito sí se sabe: es lo que el banco dice que hay metido.
			expect(declarado.costeSuscripcion).toBe(4200);

			const estimado = planificarTraspaso({
				...base,
				transacciones: [],
				destinoAntes: { participaciones: 0, costeTotalBase: 0 }
			});
			expect(estimado.costeHeredado).toBeNull();
		});

		it('un estado final MENOR que el de antes no mete participaciones negativas', () => {
			/*
			 * `ledger.ts` y `fiscal.ts` filtran los dos por `shares > 0`, así que un
			 * movimiento negativo se apuntaría y no haría nada: silencio, que es peor que
			 * un error.
			 */
			const plan = planificarTraspaso({
				...base,
				destinoAntes: { participaciones: 500, costeTotalBase: 6000 },
				destinoResultante: { participaciones: 100, costeMedio: 12 }
			});

			expect(plan.participacionesDestino).toBe(0);
			expect(meritaApuntar(plan)).toBe(false);
		});
	});

	describe('sugerirEstadoDestino', () => {
		it('suma lo que entra a lo que había, y promedia los dos costes', () => {
			const s = sugerirEstadoDestino({
				importe: 8000,
				precioDestinoHoy: 20,
				costeQueViaja: 4200,
				destinoAntes: { participaciones: 100, costeTotalBase: 1000 }
			});

			// 100 + 8.000/20 = 500 participaciones.
			expect(s.participaciones).toBe(500);
			// (1.000 + 4.200) / 500 = 10,40 €.
			expect(s.costeMedio).toBe(10.4);
		});

		it('sin coste que viaje, estima el coste como lo que vale hoy', () => {
			// Es lo que la app hacía antes de que existiera el coste heredado, y aquí no se
			// puede hacer mejor: la interfaz lo dice en su tercera frase.
			const s = sugerirEstadoDestino({
				importe: 8000,
				precioDestinoHoy: 20,
				costeQueViaja: null,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 }
			});

			expect(s.participaciones).toBe(400);
			expect(s.costeMedio).toBe(20);
		});

		it('un precio de hoy a cero no da participaciones infinitas', () => {
			const s = sugerirEstadoDestino({
				importe: 8000,
				precioDestinoHoy: 0,
				costeQueViaja: 4200,
				destinoAntes: { participaciones: 0, costeTotalBase: 0 }
			});

			expect(s.participaciones).toBe(0);
			expect(s.costeMedio).toBe(0);
		});
	});
});
