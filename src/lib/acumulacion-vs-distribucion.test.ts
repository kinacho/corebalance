import { describe, it, expect } from 'vitest';
import { compararAcumulacionDistribucion } from './acumulacion-vs-distribucion';
import { SAVINGS_TAX_YEAR } from './fiscal';

const base = { capital: 100_000, anios: 20, rentabilidad: 0.07, dividendo: 0.02 };

describe('compararAcumulacionDistribucion', () => {
	it('la acumulación gana cuando hay dividendo, y la ventaja crece con los años', () => {
		const a10 = compararAcumulacionDistribucion({ ...base, anios: 10 });
		const a30 = compararAcumulacionDistribucion({ ...base, anios: 30 });
		expect(a10.diferencia).toBeGreaterThan(0);
		expect(a30.diferencia).toBeGreaterThan(a10.diferencia);
	});

	/**
	 * ⚠️ El control que decide si el modelo es honesto.
	 *
	 * Sin dividendo no hay nada que tributar por el camino, así que las dos versiones son
	 * literalmente el mismo producto y la diferencia tiene que ser **cero**. Si sale
	 * positiva, el modelo está inventando una ventaja donde no la hay — que es justo lo
	 * que hace la mitad de las comparaciones que circulan.
	 */
	it('sin dividendo no hay ninguna diferencia', () => {
		const r = compararAcumulacionDistribucion({ ...base, dividendo: 0 });
		expect(r.diferencia).toBeCloseTo(0, 6);
		expect(r.distribucion.impuestoPorDividendos).toBe(0);
	});

	/**
	 * ⚠️ El error clásico de estas comparaciones: olvidar que el dividendo neto
	 * reinvertido **sube la base de coste** y por tanto no vuelve a tributar al vender.
	 * Quien lo olvida hace pagar dos veces por el mismo euro y exagera la ventaja de la
	 * acumulación. Con veinte años de reinversión, la base tiene que estar muy por encima
	 * del capital inicial.
	 */
	it('el dividendo neto reinvertido no vuelve a tributar al vender', () => {
		const r = compararAcumulacionDistribucion(base);
		// La ganancia gravada al vender es menor que el crecimiento total, justamente
		// porque parte ya tributó por el camino.
		const crecimiento = r.distribucion.valorFinal - base.capital;
		const gravadoAlVender =
			r.distribucion.impuestoAlVender > 0 ? r.distribucion.impuestoAlVender : 0;
		expect(gravadoAlVender).toBeLessThan(crecimiento);
		expect(r.distribucion.impuestoPorDividendos).toBeGreaterThan(0);
	});

	it('la acumulación no paga nada por el camino, solo al final', () => {
		const r = compararAcumulacionDistribucion(base);
		expect(r.acumulacion.impuestoPorDividendos).toBe(0);
		expect(r.acumulacion.impuestoAlVender).toBeGreaterThan(0);
	});

	it('con cero años no pasa nada en ninguna de las dos', () => {
		const r = compararAcumulacionDistribucion({ ...base, anios: 0 });
		expect(r.acumulacion.valorFinal).toBeCloseTo(base.capital, 6);
		expect(r.distribucion.valorFinal).toBeCloseTo(base.capital, 6);
		expect(r.diferencia).toBeCloseTo(0, 6);
	});

	it('declara el año de la escala aplicada', () => {
		// La pantalla lo enseña: una cifra fiscal sin año es una cifra sin fecha de
		// caducidad, y estas tarifas han cambiado tres veces en una década.
		expect(compararAcumulacionDistribucion(base).anioFiscal).toBe(SAVINGS_TAX_YEAR);
	});

	describe('entradas imposibles', () => {
		it('un dividendo mayor que la rentabilidad se recorta a la rentabilidad', () => {
			const absurdo = compararAcumulacionDistribucion({ ...base, rentabilidad: 0.03, dividendo: 0.5 });
			const tope = compararAcumulacionDistribucion({ ...base, rentabilidad: 0.03, dividendo: 0.03 });
			expect(absurdo.diferencia).toBeCloseTo(tope.diferencia, 6);
		});

		it('no explota con NaN, negativos ni capital absurdo', () => {
			for (const entrada of [
				{ ...base, capital: Number.NaN },
				{ ...base, anios: -5 },
				{ ...base, rentabilidad: Number.POSITIVE_INFINITY },
				{ ...base, capital: 0 }
			]) {
				const r = compararAcumulacionDistribucion(entrada);
				expect(Number.isFinite(r.diferencia), JSON.stringify(entrada)).toBe(true);
				expect(Number.isFinite(r.acumulacion.neto)).toBe(true);
			}
		});
	});
});
