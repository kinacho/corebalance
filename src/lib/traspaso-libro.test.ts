import { describe, it, expect } from 'vitest';
import { planificarTraspaso, meritaApuntar } from './traspaso-libro';
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
				cuanto: { modo: 'participaciones', participaciones: 25 },
				fecha: HOY
			});

			expect(plan.participacionesOrigen).toBe(25);
			expect(plan.importe).toBe(2000);
			expect(plan.participacionesDestino).toBe(100);
		});

		it('el importe de los dos lados es el mismo dinero, no dos cifras sueltas', () => {
			const plan = planificarTraspaso({
				origen: FONDO_A,
				destino: FONDO_B,
				transacciones: [compra(FONDO_A.ticker, HACE_TRES_ANOS, 100, 42)],
				participacionesOrigen: 100,
				precioOrigen: 137.42,
				precioDestino: 8.31,
				cuanto: { modo: 'importe', importe: 5000 },
				fecha: HOY
			});

			// Lo que sale del origen y lo que entra en el destino valen lo mismo.
			expect(plan.participacionesOrigen * plan.precioOrigen).toBeCloseTo(plan.importe, 1);
			expect(plan.participacionesDestino * plan.precioDestino).toBeCloseTo(plan.importe, 1);
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 0,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
				precioDestino: 20,
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
			precioDestino: 20,
			cuanto: { modo: 'todo' },
			fecha: HOY - 30 * DIA
		});

		expect(plan.fecha).toBe(HOY - 30 * DIA);
	});
});
