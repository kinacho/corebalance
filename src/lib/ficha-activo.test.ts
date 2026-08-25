import { describe, it, expect } from 'vitest';
import { construirFicha, type EntradaFicha } from './ficha-activo';
import type { Asset, PortfolioPosition, Transaction } from './types';

/**
 * ⚠️ **Fechas fijas en todo el fichero, nunca `Date.now()`.** La mitad fiscal de
 * la ficha es aritmética de fechas —la ventana de antiaplicación son 2 o 12
 * meses—, así que una prueba sobre el reloj real pasa hoy y falla en tres meses.
 * Por eso `construirFicha` recibe `ahora` en vez de leerlo.
 */
const AHORA = new Date(2026, 7, 25).getTime(); // 25-ago-2026
const DIA = 86400000;

const activo = (extra: Partial<Asset> = {}): Asset => ({
	ticker: 'IE00B4L5Y983',
	name: 'iShares Core MSCI World UCITS ETF',
	isin: 'IE00B4L5Y983',
	targetWeight: 0.6,
	color: '#3b82f6',
	icon: '🌐',
	ter: 0.002,
	category: 'core',
	...extra
});

const posicion = (asset: Asset, holdings: number, totalValue: number): PortfolioPosition =>
	({
		asset,
		holdings,
		avgCost: 0,
		totalCost: 0,
		unitPrice: totalValue / holdings,
		totalValue,
		currentWeight: 1,
		deviation: 0,
		targetValue: totalValue,
		targetHoldings: holdings,
		profit: 0,
		profitPercent: 0,
		dailyChangeValue: 0,
		dailyChangePercent: 0
	}) as PortfolioPosition;

const compra = (
	id: string,
	diasAtras: number,
	shares: number,
	price: number,
	ticker = 'IE00B4L5Y983'
): Transaction => ({
	id,
	ticker,
	type: 'buy',
	date: AHORA - diasAtras * DIA,
	shares,
	price,
	currency: 'EUR',
	fees: 0,
	fxRate: 1
});

const base = (extra: Partial<EntradaFicha> = {}): EntradaFicha => {
	const asset = extra.asset ?? activo();
	return {
		asset,
		posicion: posicion(asset, 100, 12000),
		transacciones: [],
		precioBasePorParticipacion: 120,
		solapamientos: [],
		concentracion: null,
		ahora: AHORA,
		...extra
	};
};

describe('construirFicha — qué es el activo', () => {
	/**
	 * Es la pregunta que la app sabía contestar y no contestaba:
	 * `canBeTransferred()` estaba escrita, documentada y probada, y sin un solo
	 * consumidor fuera de sus propios tests.
	 */
	it('un fondo es traspasable sin tributar y un ETF del mismo índice no', () => {
		const fondo = activo({ ticker: '0P0001XF40.F', name: 'Fidelity MSCI World Index Fund' });
		const etf = activo({ ticker: 'IWDA.AS', name: 'iShares Core MSCI World UCITS ETF' });

		expect(construirFicha(base({ asset: fondo })).traspasable).toBe(true);
		expect(construirFicha(base({ asset: etf })).traspasable).toBe(false);
		// Y el ETF sí tributa al vender, que es la otra cara de lo mismo.
		expect(construirFicha(base({ asset: etf })).tributaAlVender).toBe(true);
	});

	it('dice qué índice replica, con su cobertura y sus mayores posiciones', () => {
		const ficha = construirFicha(base({ asset: activo({ indexKey: 'msci-world' }) }));

		expect(ficha.indice?.nombre).toContain('World');
		expect(ficha.indice?.cobertura.length).toBeGreaterThan(10);
		expect(ficha.indice?.mayoresPosiciones.length).toBeGreaterThan(0);
		// Ordenadas de mayor a menor: es lo que hace legible la lista.
		const pesos = ficha.indice!.mayoresPosiciones.map((p) => p.peso);
		expect([...pesos].sort((a, b) => b - a)).toEqual(pesos);
		// Y de dónde salió, que es lo que permite recomprobarlo.
		expect(ficha.indice?.leidoDe).toBeTruthy();
	});

	/**
	 * ⚠️ **Este caso lo pidió una captura, no un razonamiento.** Las claves del
	 * dataset son identificadores en minúscula (`nvidia`, `alphabet`), así que la
	 * primera versión pintaba la lista de mayores posiciones escrita en minúscula.
	 * Ninguna prueba lo veía: todas miraban pesos y orden, que estaban bien.
	 */
	it('las mayores posiciones salen con el nombre de la empresa, no con su clave', () => {
		const ficha = construirFicha(base({ asset: activo({ indexKey: 'msci-world' }) }));
		const nombres = ficha.indice!.mayoresPosiciones.map((p) => p.nombre);

		expect(nombres.length).toBeGreaterThan(0);
		// Ninguno puede ser la clave cruda en minúscula.
		for (const par of ficha.indice!.mayoresPosiciones) {
			expect(par.nombre).not.toBe(par.clave);
		}
		expect(nombres.some((n) => /[A-Z]/.test(n))).toBe(true);
	});

	/**
	 * ⚠️ Los dos índices de renta fija y el de pequeñas **no llevan top diez a
	 * propósito**, y hay un test en `concentracion.test.ts` que lo fija. La ficha
	 * tiene que sobrevivir a esa ausencia sin romper y sin inventar una lista.
	 */
	it('un índice sin top diez da una lista vacía, no un error', () => {
		const bonos = activo({ ticker: 'AGGH.MI', name: 'iShares Global Aggregate Bond', indexKey: 'global-agg-bond' });
		const ficha = construirFicha(base({ asset: bonos }));

		expect(ficha.indice).not.toBeNull();
		expect(ficha.indice?.mayoresPosiciones).toEqual([]);
	});

	it('un activo sin índice reconocible no inventa uno', () => {
		const suelta = activo({ ticker: 'AAPL', name: 'Apple Inc', indexKey: undefined });
		expect(construirFicha(base({ asset: suelta })).indice).toBeNull();
	});

	it('el TER en euros es sobre el valor de la posición', () => {
		const ficha = construirFicha(base());
		// 12.000 € al 0,2 %.
		expect(ficha.terAnualEnEuros).toBeCloseTo(24, 6);
	});
});

describe('construirFicha — la mitad fiscal', () => {
	/**
	 * ⚠️ **El caso que más importa de todo el fichero.** Sin libro no hay lotes, y
	 * sin lotes no hay plusvalía que calcular. Devolver 0 sería una cifra
	 * inventada presentada como un hecho — el defecto que este repo lleva
	 * documentado desde el importador que metía activos a coste 0 y fabricaba una
	 * ganancia del 100 %.
	 */
	it('sin libro dice que no se puede calcular, y no devuelve cero', () => {
		const ficha = construirFicha(base({ transacciones: [] }));

		expect(ficha.fiscal.estado).toBe('sin-libro');
		expect(ficha.fiscal.plusvalia).toBeNull();
		expect(ficha.fiscal.factura).toBeNull();
		expect(ficha.fiscal.costeAdquisicion).toBeNull();
	});

	it('con el libro completo da la plusvalía latente y su factura', () => {
		const asset = activo();
		const ficha = construirFicha(
			base({
				asset,
				// 100 participaciones a 100 €: 10.000 € de coste.
				transacciones: [compra('t1', 400, 100, 100)],
				posicion: posicion(asset, 100, 12000),
				precioBasePorParticipacion: 120
			})
		);

		expect(ficha.fiscal.estado).toBe('completa');
		expect(ficha.fiscal.costeAdquisicion).toBeCloseTo(10000, 6);
		expect(ficha.fiscal.plusvalia).toBeCloseTo(2000, 6);
		// 2.000 € caen enteros en el primer tramo del ahorro, al 19 %.
		expect(ficha.fiscal.factura).toBeCloseTo(380, 6);
		expect(ficha.fiscal.fechaLoteMasAntiguo).toBe(AHORA - 400 * DIA);
	});

	/**
	 * El caso del que importa solo los últimos doce meses: el libro no llega a
	 * cubrir lo que tiene, así que la cifra es un mínimo y hay que decirlo.
	 */
	it('con el libro incompleto marca el resultado como parcial', () => {
		const asset = activo();
		const ficha = construirFicha(
			base({
				asset,
				transacciones: [compra('t1', 100, 40, 100)],
				posicion: posicion(asset, 100, 12000)
			})
		);

		expect(ficha.fiscal.estado).toBe('parcial');
		expect(ficha.fiscal.plusvalia).not.toBeNull();
	});

	it('en pérdidas no hay factura y sí la regla de recompra', () => {
		const asset = activo();
		const ficha = construirFicha(
			base({
				asset,
				transacciones: [compra('t1', 400, 100, 150)], // comprado a 150, vale 120
				posicion: posicion(asset, 100, 12000),
				precioBasePorParticipacion: 120
			})
		);

		expect(ficha.fiscal.plusvalia).toBeCloseTo(-3000, 6);
		expect(ficha.fiscal.factura).toBe(0);
		expect(ficha.fiscal.recompra).not.toBeNull();
	});

	/**
	 * ⚠️ La ventana **no es la misma para todo**: dos meses para lo cotizado y
	 * doce para las participaciones de fondo (art. 33.5 f y g). Es la diferencia
	 * que más dinero mueve de esta sección, así que se fija con los dos tipos.
	 */
	it('la ventana de recompra es de 12 meses en un fondo y de 2 en un ETF', () => {
		const perdida = (asset: Asset) =>
			construirFicha(
				base({
					asset,
					transacciones: [compra('t1', 400, 100, 150, asset.ticker)],
					posicion: posicion(asset, 100, 12000),
					precioBasePorParticipacion: 120
				})
			).fiscal.recompra;

		const fondo = activo({ ticker: '0P0001XF40.F', name: 'Fidelity MSCI World Index Fund' });
		const etf = activo({ ticker: 'IWDA.AS', name: 'iShares Core MSCI World UCITS ETF' });

		expect(perdida(fondo)?.ventanaMeses).toBe(12);
		expect(perdida(etf)?.ventanaMeses).toBe(2);
	});

	it('una compra reciente bloquea la pérdida y dice cuántos días faltan', () => {
		const asset = activo({ ticker: 'IWDA.AS', name: 'iShares Core MSCI World UCITS ETF' });
		const ficha = construirFicha(
			base({
				asset,
				transacciones: [
					compra('t1', 400, 80, 150, 'IWDA.AS'),
					compra('t2', 10, 20, 130, 'IWDA.AS') // dentro de la ventana de 2 meses
				],
				posicion: posicion(asset, 100, 12000),
				precioBasePorParticipacion: 120
			})
		);

		expect(ficha.fiscal.recompra?.bloqueada).toBe(true);
		expect(ficha.fiscal.recompra?.diasParaRecomprar).toBeGreaterThan(0);
	});

	it('sin posición no calcula nada', () => {
		expect(construirFicha(base({ posicion: undefined })).fiscal.estado).toBe('sin-libro');
		expect(construirFicha(base({ posicion: undefined })).terAnualEnEuros).toBeNull();
	});
});

describe('construirFicha — el solapamiento visto desde esta posición', () => {
	/**
	 * El dato existe por pares y por empresa; lo que no existía era la vuelta:
	 * «¿con qué se pisa **esto** que estoy mirando?».
	 */
	it('encuentra el solapamiento esté este activo en cualquiera de los dos lados del par', () => {
		const asset = activo({ ticker: 'IWDA.AS' });
		const comun = {
			nameA: 'A',
			nameB: 'B',
			indexA: 'msci-world',
			indexB: 'sp500',
			duplicatedWeight: 0.1,
			note: 'se pisan'
		};

		const comoA = construirFicha(
			base({
				asset,
				solapamientos: [
					{ ...comun, tickerA: 'IWDA.AS', tickerB: 'CSPX.AS', nameB: 'S&P 500', duplicatedValue: 500 }
				]
			})
		);
		const comoB = construirFicha(
			base({
				asset,
				solapamientos: [
					{ ...comun, tickerA: 'CSPX.AS', tickerB: 'IWDA.AS', nameA: 'S&P 500', duplicatedValue: 500 }
				]
			})
		);

		expect(comoA.solapamiento.fondos[0].ticker).toBe('CSPX.AS');
		expect(comoB.solapamiento.fondos[0].ticker).toBe('CSPX.AS');
		expect(comoA.solapamiento.fondos[0].nombre).toBe('S&P 500');
		expect(comoB.solapamiento.fondos[0].nombre).toBe('S&P 500');
	});

	it('lista las empresas que llegan también por otra posición, con lo que llega por esta', () => {
		const asset = activo({ ticker: 'IWDA.AS' });
		const ficha = construirFicha(
			base({
				asset,
				concentracion: {
					empresas: [
						{
							clave: 'apple',
							nombre: 'Apple',
							valor: 800,
							peso: 0.08,
							solapada: true,
							directaYPorFondo: true,
							fuentes: [
								{ ticker: 'AAPL', nombre: 'Apple Inc', indexKey: null, valor: 600 },
								{ ticker: 'IWDA.AS', nombre: 'iShares Core MSCI World', indexKey: 'msci-world', valor: 200 }
							]
						},
						{
							clave: 'nvidia',
							nombre: 'NVIDIA',
							valor: 150,
							peso: 0.015,
							solapada: false,
							directaYPorFondo: false,
							fuentes: [
								{ ticker: 'IWDA.AS', nombre: 'iShares Core MSCI World', indexKey: 'msci-world', valor: 150 }
							]
						}
					],
					valorSolapado: 200
				} as never
			})
		);

		// Solo la solapada: NVIDIA llega por un único sitio y no es solapamiento.
		expect(ficha.solapamiento.empresas).toHaveLength(1);
		expect(ficha.solapamiento.empresas[0].nombre).toBe('Apple');
		// Lo que llega **por esta posición**, no el total de la empresa.
		expect(ficha.solapamiento.empresas[0].valorAqui).toBe(200);
		expect(ficha.solapamiento.empresas[0].tambienPor).toEqual(['Apple Inc']);
	});

	it('sin datos de concentración no revienta', () => {
		const ficha = construirFicha(base({ concentracion: null }));
		expect(ficha.solapamiento.empresas).toEqual([]);
		expect(ficha.solapamiento.fondos).toEqual([]);
	});
});
