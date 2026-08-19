import { describe, it, expect } from 'vitest';
import indicesData from './data/indices.json';
import { calcularConcentracion, empresaDe, COMPANIES, HOLDINGS_AS_OF } from './concentracion';
import { INDICES } from './lookthrough';
import type { Asset, InstrumentType, PortfolioPosition } from './types';

const DATA = indicesData as unknown as {
	holdingsAsOf: string;
	companies: Record<string, { name: string; tickers: string[]; isins: string[] }>;
	indices: Record<string, { assetClass: string; topHoldings?: Record<string, number>; holdingsSource?: string }>;
};

interface Opciones {
	indexKey?: string;
	isin?: string;
	instrumentType?: InstrumentType;
	manualInterestRate?: number;
}

function makePosition(ticker: string, name: string, value: number, opciones: Opciones = {}): PortfolioPosition {
	const asset: Asset = {
		ticker,
		name,
		isin: opciones.isin ?? '',
		targetWeight: 0,
		color: '#000',
		icon: '📈',
		ter: 0,
		category: 'core',
		indexKey: opciones.indexKey,
		instrumentType: opciones.instrumentType,
		manualInterestRate: opciones.manualInterestRate
	};
	return {
		asset,
		holdings: value / 100,
		avgCost: 100,
		totalCost: value,
		unitPrice: 100,
		totalValue: value,
		currentWeight: 0,
		deviation: 0,
		targetValue: 0,
		targetHoldings: 0,
		profit: 0,
		profitPercent: 0,
		dailyChangeValue: 0,
		dailyChangePercent: 0
	};
}

/** Atajo: casi todos los casos miden sobre el valor que se pasa. */
function calcular(positions: PortfolioPosition[], patrimonioTotal?: number) {
	const total = patrimonioTotal ?? positions.reduce((s, p) => s + p.totalValue, 0);
	return calcularConcentracion(positions, { patrimonioTotal: total });
}

const empresaPorClave = (r: ReturnType<typeof calcular>, clave: string) => r.empresas.find((e) => e.clave === clave);

describe('integridad del dataset de empresas', () => {
	it('toda clave de topHoldings existe en el registro de empresas', () => {
		for (const [key, index] of Object.entries(DATA.indices)) {
			for (const clave of Object.keys(index.topHoldings ?? {})) {
				expect(DATA.companies[clave], `${key} apunta a la empresa desconocida "${clave}"`).toBeDefined();
			}
		}
	});

	it('los pesos están entre 0 y 100 y su suma por índice no llega a 100', () => {
		for (const [key, index] of Object.entries(DATA.indices)) {
			if (!index.topHoldings) continue;
			const pesos = Object.values(index.topHoldings);
			for (const peso of pesos) {
				expect(peso, `${key} tiene un peso fuera de rango`).toBeGreaterThan(0);
				expect(peso).toBeLessThanOrEqual(100);
			}
			// Es un top diez: si sumara 100 estaría afirmando ver el índice entero,
			// que es justo lo contrario de lo que este dataset promete.
			expect(pesos.reduce((a, b) => a + b, 0), `${key} suma demasiado`).toBeLessThan(100);
		}
	});

	it('ningún ISIN ni ticker está en dos empresas a la vez', () => {
		const isins = new Map<string, string>();
		const tickers = new Map<string, string>();
		for (const [clave, empresa] of Object.entries(DATA.companies)) {
			for (const isin of empresa.isins) {
				expect(isins.has(isin), `${isin} está en ${isins.get(isin)} y en ${clave}`).toBe(false);
				isins.set(isin, clave);
			}
			for (const ticker of empresa.tickers) {
				expect(tickers.has(ticker), `${ticker} está en ${tickers.get(ticker)} y en ${clave}`).toBe(false);
				tickers.set(ticker, clave);
			}
		}
	});

	it('toda empresa tiene nombre y al menos un ticker', () => {
		for (const [clave, empresa] of Object.entries(DATA.companies)) {
			expect(empresa.name.length, `${clave} sin nombre`).toBeGreaterThan(0);
			expect(empresa.tickers.length, `${clave} sin tickers`).toBeGreaterThan(0);
		}
	});

	it('la fecha de las posiciones tiene formato ISO', () => {
		expect(DATA.holdingsAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(HOLDINGS_AS_OF).toBe(DATA.holdingsAsOf);
	});

	it('todo índice con posiciones declara de qué ETF se leyeron', () => {
		// `holdingsSource` es lo que hace la cifra reproducible: sin él no hay forma
		// de volver a comprobarla, y una cifra que no se puede comprobar envejece
		// sin que nadie se entere.
		for (const [key, index] of Object.entries(DATA.indices)) {
			if (!index.topHoldings) continue;
			expect(index.holdingsSource, `${key} no dice de dónde salen sus posiciones`).toMatch(/^[A-Z0-9]+(\.[A-Z]{1,3})?$/);
		}
	});

	it('los tres índices sin datos de empresa son exactamente los esperados', () => {
		// La pequeña capitalización y la renta fija se quedan fuera a propósito, y
		// esto es lo que obliga a revisar la prosa si alguien les añade empresas.
		const sinTop = Object.keys(DATA.indices).filter((k) => !DATA.indices[k].topHoldings);
		expect(sinTop.sort()).toEqual(['euro-govt-bond', 'global-agg-bond', 'msci-world-small']);
	});

	it('solo la renta variable trae empresas', () => {
		for (const [key, index] of Object.entries(DATA.indices)) {
			if (!index.topHoldings) continue;
			expect(index.assetClass, `${key} no es renta variable`).toBe('equity');
		}
	});

	it('las cifras coinciden con lo leído del ETF de réplica', () => {
		// Dos anclas contra la fuente. Si alguien actualiza el dataset sin volver a
		// leer los ETF, esto es lo que se queja.
		expect(DATA.indices['sp500'].topHoldings?.apple).toBe(7.03);
		expect(DATA.indices['msci-emerging'].topHoldings?.tsmc).toBe(13.57);
		expect(DATA.indices['ibex-35'].topHoldings?.santander).toBe(17.85);
	});

	it('las clases de acción de una empresa van en una sola clave', () => {
		// Alphabet A (2,31) y C (1,84) del MSCI World suman en una entrada. Si se
		// dejaran separadas, el ranking mostraría dos «Alphabet» de la mitad.
		expect(COMPANIES.alphabet.tickers).toEqual(['GOOGL', 'GOOG']);
		expect(COMPANIES.alphabet.isins).toHaveLength(2);
		expect(DATA.companies['alphabet-c']).toBeUndefined();
		expect(DATA.indices['msci-world'].topHoldings?.alphabet).toBeCloseTo(4.15, 2);
	});

	it('el solapamiento de renta fija está declarado', () => {
		// Sin esta regla la cartera conservadora no podía producir ni un hallazgo.
		const overlaps = (indicesData as unknown as { overlaps: { a: string; b: string }[] }).overlaps;
		const rf = overlaps.find(
			(o) =>
				(o.a === 'global-agg-bond' && o.b === 'euro-govt-bond') ||
				(o.a === 'euro-govt-bond' && o.b === 'global-agg-bond')
		);
		expect(rf).toBeDefined();
	});
});

describe('empresaDe', () => {
	it('reconoce por ticker', () => {
		expect(empresaDe(makePosition('AAPL', 'Apple Inc', 1).asset)).toBe('apple');
	});

	it('reconoce por ISIN aunque el ticker sea el de otro mercado', () => {
		// El Apple comprado en Fráncfort cotiza como APC.DE y no está en la lista de
		// tickers; su ISIN sí.
		const asset = makePosition('APC.DE', 'Apple Inc', 1, { isin: 'US0378331005' }).asset;
		expect(empresaDe(asset)).toBe('apple');
	});

	it('reconoce el ISIN cuando viene en el campo del ticker', () => {
		// Los importadores de CSV usan el ISIN como ticker interno.
		expect(empresaDe(makePosition('US5949181045', 'Microsoft', 1).asset)).toBe('microsoft');
	});

	it('las dos clases de Alphabet caen en la misma empresa', () => {
		expect(empresaDe(makePosition('GOOGL', 'Alphabet A', 1).asset)).toBe('alphabet');
		expect(empresaDe(makePosition('GOOG', 'Alphabet C', 1).asset)).toBe('alphabet');
	});

	it('no adivina por nombre parecido', () => {
		// Este es el fallo que importa: emparejar nombres haría que «Apple
		// Hospitality REIT» sumara a Apple, y el usuario leería ese dinero como
		// suyo en una empresa que no tiene.
		const asset = makePosition('APLE', 'Apple Hospitality REIT Inc', 1, { isin: 'US03784Y2000' }).asset;
		expect(empresaDe(asset)).toBeUndefined();
	});

	it('un activo sin ticker no resuelve nada', () => {
		// Una fila de CSV a la que le falta el ticker. Sin esta salida temprana el
		// mapa se consultaría con la cadena vacía.
		expect(empresaDe(makePosition('', 'Algo sin ticker', 1).asset)).toBeUndefined();
	});

	it('no reconoce un fondo', () => {
		expect(empresaDe(makePosition('IWDA.AS', 'iShares Core MSCI World', 1, { isin: 'IE00B4L5Y983' }).asset)).toBeUndefined();
	});
});

describe('calcularConcentracion', () => {
	it('suma lo que llega por un fondo y lo que se tiene en directo', () => {
		const r = calcular([
			makePosition('IWDA.AS', 'iShares Core MSCI World', 10_000, { indexKey: 'msci-world' }),
			makePosition('AAPL', 'Apple Inc', 6_000, { instrumentType: 'equity' })
		]);
		const apple = empresaPorClave(r, 'apple');
		// 5,05 % de 10.000 dentro del fondo, más los 6.000 sueltos.
		expect(apple?.valor).toBeCloseTo(6_505, 2);
		expect(apple?.fuentes).toHaveLength(2);
		expect(apple?.solapada).toBe(true);
		expect(apple?.directaYPorFondo).toBe(true);
		// Ordenadas de mayor a menor: primero los 6.000 en directo.
		expect(apple?.fuentes[0].indexKey).toBeNull();
		expect(apple?.fuentes[1].indexKey).toBe('msci-world');
	});

	it('la misma empresa en dos fondos distintos suma con el peso de cada uno', () => {
		const r = calcular([
			makePosition('IWDA.AS', 'MSCI World', 10_000, { indexKey: 'msci-world' }),
			makePosition('CSPX.AS', 'S&P 500', 10_000, { indexKey: 'sp500' })
		]);
		const apple = empresaPorClave(r, 'apple');
		// 5,05 % del World más 7,03 % del S&P: cada peso sobre SUS euros. No hay
		// doble conteo, aunque los dos índices se solapen entre sí.
		expect(apple?.valor).toBeCloseTo(505 + 703, 2);
		expect(apple?.solapada).toBe(true);
		expect(apple?.directaYPorFondo).toBe(false);
	});

	it('el peso va sobre el patrimonio total, no sobre lo analizado', () => {
		const posiciones = [
			makePosition('IWDA.AS', 'MSCI World', 10_000, { indexKey: 'msci-world' }),
			makePosition('CASH-EUR', 'Cuenta remunerada', 10_000, { manualInterestRate: 0.03 })
		];
		const r = calcular(posiciones, 20_000);
		const apple = empresaPorClave(r, 'apple');
		expect(apple?.valor).toBeCloseTo(505, 2);
		// 505 sobre 20.000, no sobre los 10.000 que sí se pudieron analizar.
		expect(apple?.peso).toBeCloseTo(505 / 20_000, 6);
		expect(r.patrimonioTotal).toBe(20_000);
	});

	it('el efectivo se queda fuera del análisis y se dice cuál', () => {
		const r = calcular([makePosition('CASH-EUR', 'Cuenta remunerada', 8_000, { manualInterestRate: 0.03 })]);
		expect(r.valorFueraDelAnalisis).toBe(8_000);
		expect(r.tickersFueraDelAnalisis).toEqual(['CASH-EUR']);
		expect(r.empresas).toHaveLength(0);
	});

	it('un índice sin datos de empresa no inventa ninguna', () => {
		const r = calcular([
			makePosition('ZPRV.DE', 'SPDR MSCI USA Small Cap Value', 5_000, { indexKey: 'msci-world-small' }),
			makePosition('AGGH.MI', 'Renta fija global', 3_000, { indexKey: 'global-agg-bond' })
		]);
		expect(r.empresas).toHaveLength(0);
		expect(r.valorSinDatosDeEmpresa).toBe(8_000);
		expect(r.tickersSinDatosDeEmpresa.sort()).toEqual(['AGGH.MI', 'ZPRV.DE']);
		expect(r.valorFueraDelAnalisis).toBe(0);
	});

	it('una posición sin valor se ignora, y la cartera vacía no rompe', () => {
		const vacia = calcular([]);
		expect(vacia.empresas).toHaveLength(0);
		expect(vacia.valorSolapado).toBe(0);
		expect(vacia.pesoSolapado).toBe(0);

		const conCero = calcular([
			makePosition('IWDA.AS', 'MSCI World', 0, { indexKey: 'msci-world' }),
			makePosition('AAPL', 'Apple Inc', 0, { instrumentType: 'equity' })
		]);
		expect(conCero.empresas).toHaveLength(0);
		expect(conCero.valorFueraDelAnalisis).toBe(0);
	});

	it('con patrimonio cero los pesos son cero en lugar de infinito', () => {
		// No debería pasar en la app —el patrimonio es la suma de estas mismas
		// posiciones—, pero es una división y el denominador viene de fuera.
		const r = calcularConcentracion(
			[
				makePosition('IWDA.AS', 'MSCI World', 10_000, { indexKey: 'msci-world' }),
				makePosition('AAPL', 'Apple Inc', 6_000, { instrumentType: 'equity' })
			],
			{ patrimonioTotal: 0 }
		);
		expect(r.empresas.every((e) => e.peso === 0)).toBe(true);
		expect(r.pesoSolapado).toBe(0);
		// El dinero sigue estando bien contado: lo que falla es el denominador.
		expect(empresaPorClave(r, 'apple')?.valor).toBeCloseTo(6_505, 2);
	});

	it('una sola fuente no es solapamiento', () => {
		const r = calcular([makePosition('IWDA.AS', 'MSCI World', 10_000, { indexKey: 'msci-world' })]);
		expect(r.empresas.length).toBeGreaterThan(0);
		expect(r.empresas.every((e) => e.solapada === false)).toBe(true);
		expect(r.valorSolapado).toBe(0);
	});

	it('lo solapado es lo que llega por el segundo camino, no el total de la empresa', () => {
		const r = calcular([
			makePosition('IWDA.AS', 'MSCI World', 10_000, { indexKey: 'msci-world' }),
			makePosition('AAPL', 'Apple Inc', 6_000, { instrumentType: 'equity' })
		]);
		// Apple es la única solapada: 6.000 en directo y 505 por el fondo. Lo que se
		// pisa son los 505, no los 6.505: contar el total inflaría el titular.
		const solapadas = r.empresas.filter((e) => e.solapada);
		expect(solapadas.map((e) => e.clave)).toEqual(['apple']);
		expect(r.valorSolapado).toBeCloseTo(505, 2);
		expect(r.pesoSolapado).toBeCloseTo(505 / 16_000, 6);
	});

	it('lo atribuido a un fondo nunca supera su valor', () => {
		// La propiedad del suelo. Con un top diez, lo repartido tiene que quedarse
		// muy por debajo del valor de la posición; si lo superara, el panel estaría
		// afirmando más exposición de la que hay dinero.
		const valor = 10_000;
		for (const indexKey of Object.keys(DATA.indices)) {
			if (!DATA.indices[indexKey].topHoldings) continue;
			const r = calcular([makePosition('X', 'Fondo', valor, { indexKey })]);
			const repartido = r.empresas.reduce((s, e) => s + e.valor, 0);
			expect(repartido, `${indexKey} reparte más de lo que tiene`).toBeLessThan(valor);
			expect(repartido).toBeGreaterThan(0);
		}
	});

	it('una acción que no está en ningún índice entra con su propio nombre', () => {
		// Si cayera en «fuera del análisis», el panel le estaría diciendo al usuario
		// que ha ignorado sus acciones.
		const r = calcular([makePosition('SAB.MC', 'Banco Sabadell', 2_000, { instrumentType: 'equity' })]);
		expect(r.empresas).toHaveLength(1);
		expect(r.empresas[0].nombre).toBe('Banco Sabadell');
		expect(r.empresas[0].clave).toBe('ticker:SAB.MC');
		expect(r.empresas[0].solapada).toBe(false);
		expect(r.valorFueraDelAnalisis).toBe(0);
	});

	it('una acción cuyo nombre contiene el de un índice no se reparte como fondo', () => {
		// `resolveIndexKey` empareja por nombre, así que «World Fuel Services» le
		// casa el WORLD. Comprobar el tipo de instrumento antes que el índice es lo
		// que evita repartir una acción entre las mayores del MSCI World.
		const r = calcular([makePosition('INT', 'World Fuel Services Corp', 4_000, { instrumentType: 'equity' })]);
		expect(r.empresas).toHaveLength(1);
		expect(r.empresas[0].nombre).toBe('World Fuel Services Corp');
		expect(empresaPorClave(r, 'apple')).toBeUndefined();
	});

	it('los pares de fondos llegan con el peso sobre el patrimonio', () => {
		const r = calcular(
			[
				makePosition('IWDA.AS', 'MSCI World', 10_000, { indexKey: 'msci-world' }),
				makePosition('CSPX.AS', 'S&P 500', 4_000, { indexKey: 'sp500' })
			],
			20_000
		);
		expect(r.solapamientosDeFondos).toHaveLength(1);
		const par = r.solapamientosDeFondos[0];
		// min(10.000 × 72,5 %, 4.000 × 97 %) = 3.880
		expect(par.duplicatedValue).toBeCloseTo(3_880, 2);
		// El campo heredado mide sobre lo cubierto (14.000); el nuevo, sobre el
		// patrimonio (20.000). Son distintos a propósito.
		expect(par.duplicatedWeight).toBeCloseTo(3_880 / 14_000, 6);
		expect(par.pesoSobrePatrimonio).toBeCloseTo(3_880 / 20_000, 6);
	});

	it('un par de renta fija se marca como tal, y uno de bolsa no', () => {
		// La frase no vale para los dos casos: dos fondos de deuda soberana no se
		// pisan en «empresas» sino en emisiones, y el panel tiene una plantilla por
		// caso. Sin esta marca le decía al usuario que sus bonos comparten compañías.
		const rf = calcular([
			makePosition('AGGH.MI', 'Agregado global', 5_000, { indexKey: 'global-agg-bond' }),
			makePosition('IEGA.AS', 'Deuda pública euro', 4_000, { indexKey: 'euro-govt-bond' })
		]);
		expect(rf.solapamientosDeFondos).toHaveLength(1);
		expect(rf.solapamientosDeFondos[0].esRentaFija).toBe(true);

		const rv = calcular([
			makePosition('IWDA.AS', 'MSCI World', 10_000, { indexKey: 'msci-world' }),
			makePosition('CSPX.AS', 'S&P 500', 4_000, { indexKey: 'sp500' })
		]);
		expect(rv.solapamientosDeFondos[0].esRentaFija).toBe(false);
	});

	it('dice qué parte de cada índice está viendo', () => {
		const r = calcular([makePosition('IWDA.AS', 'MSCI World', 10_000, { indexKey: 'msci-world' })]);
		expect(r.coberturaPorIndice).toHaveLength(1);
		expect(r.coberturaPorIndice[0].indexKey).toBe('msci-world');
		expect(r.coberturaPorIndice[0].nombre).toBe(INDICES['msci-world'].name);
		expect(r.coberturaPorIndice[0].valor).toBe(10_000);
		// Un top diez del World ve poco más de una cuarta parte del índice.
		expect(r.coberturaPorIndice[0].pctVisible).toBeCloseTo(26.33, 2);
	});

	it('la cobertura solo cuenta los índices que aportan empresas', () => {
		const r = calcular([
			makePosition('IWDA.AS', 'MSCI World', 10_000, { indexKey: 'msci-world' }),
			makePosition('ZPRV.DE', 'Small caps', 5_000, { indexKey: 'msci-world-small' })
		]);
		expect(r.coberturaPorIndice.map((c) => c.indexKey)).toEqual(['msci-world']);
	});

	it('las empresas salen ordenadas por dinero', () => {
		const r = calcular([makePosition('CSPX.AS', 'S&P 500', 10_000, { indexKey: 'sp500' })]);
		const valores = r.empresas.map((e) => e.valor);
		expect(valores).toEqual([...valores].sort((a, b) => b - a));
		// NVIDIA pesa más que Apple en el S&P: 7,54 contra 7,03.
		expect(r.empresas[0].clave).toBe('nvidia');
	});
});

describe('la cartera de ejemplo de la app', () => {
	/**
	 * El caso que motivó el panel, con los datos exactos del demo y **sin**
	 * declarar `instrumentType` ni `indexKey`: el demo no pasa por
	 * `normalizeAssets`, así que ambos se resuelven por heurística igual que en el
	 * navegador. Antes de esto el análisis no decía nada de estas cinco acciones.
	 */
	const demo = () => [
		makePosition('IWDA.AS', 'iShares Core MSCI World', 60_000, { isin: 'IE00B4L5Y983' }),
		makePosition('EMIM.AS', 'iShares Core MSCI EM IMI', 8_000, { isin: 'IE00BKM4GZ66' }),
		makePosition('ZPRV.DE', 'SPDR MSCI USA Small Cap Value', 7_000, { isin: 'IE00BS166D92' }),
		makePosition('MSFT', 'Microsoft Corp', 5_000, { isin: 'US5949181045' }),
		makePosition('AAPL', 'Apple Inc', 5_000, { isin: 'US0378331005' }),
		makePosition('AMZN', 'Amazon.com Inc', 4_000, { isin: 'US0231351067' }),
		makePosition('GOOGL', 'Alphabet Inc', 3_000, { isin: 'US02079K3059' }),
		makePosition('TSLA', 'Tesla, Inc.', 3_000, { isin: 'US88160R1014' }),
		makePosition('CASH-DEMO', 'Cuenta Remunerada (Demo)', 5_000, { manualInterestRate: 0.03 })
	];

	it('encuentra el solapamiento entre el World y las cuatro acciones que lleva dentro', () => {
		const r = calcular(demo());
		for (const clave of ['apple', 'microsoft', 'amazon', 'alphabet']) {
			const e = empresaPorClave(r, clave);
			expect(e, `${clave} no aparece`).toBeDefined();
			expect(e?.solapada, `${clave} debería estar solapada`).toBe(true);
			expect(e?.directaYPorFondo, `${clave} se tiene suelta y dentro del fondo`).toBe(true);
		}
		expect(r.valorSolapado).toBeGreaterThan(0);
	});

	it('Tesla aparece pero no está solapada, porque no está en ningún top', () => {
		const r = calcular(demo());
		const tesla = empresaPorClave(r, 'ticker:TSLA');
		expect(tesla?.valor).toBe(3_000);
		expect(tesla?.solapada).toBe(false);
	});

	it('declara lo que no puede ver: los small caps y el efectivo', () => {
		const r = calcular(demo());
		expect(r.tickersSinDatosDeEmpresa).toEqual(['ZPRV.DE']);
		expect(r.valorSinDatosDeEmpresa).toBe(7_000);
		expect(r.tickersFueraDelAnalisis).toEqual(['CASH-DEMO']);
		expect(r.valorFueraDelAnalisis).toBe(5_000);
	});

	it('NVIDIA aparece aunque no se tenga suelta, porque va dentro del World', () => {
		const r = calcular(demo());
		const nvidia = empresaPorClave(r, 'nvidia');
		expect(nvidia?.valor).toBeCloseTo(60_000 * 0.0516, 2);
		expect(nvidia?.fuentes).toHaveLength(1);
		expect(nvidia?.fuentes[0].indexKey).toBe('msci-world');
	});
});
