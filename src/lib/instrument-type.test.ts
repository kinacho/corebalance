import { describe, it, expect } from 'vitest';
import {
	resolveInstrumentType,
	instrumentTypeOf,
	canBeTransferred,
	isTaxableOnSale,
	tipoCorregidoPorMigracion
} from './instrument-type';
import type { Asset, InstrumentType } from './types';

function asset(partial: Partial<Asset>): Asset {
	return {
		ticker: 'X',
		name: 'X',
		isin: '',
		targetWeight: 0,
		color: '#000',
		icon: '📈',
		ter: 0,
		category: 'core',
		...partial
	};
}

describe('resolveInstrumentType', () => {
	it('cree a Yahoo antes que a nada', () => {
		expect(resolveInstrumentType('0P0001', 'Lo que sea', 'MUTUALFUND')).toBe('fund');
		expect(resolveInstrumentType('VWCE.DE', 'Vanguard All-World', 'ETF')).toBe('etf');
		expect(resolveInstrumentType('AAPL', 'Apple Inc', 'EQUITY')).toBe('equity');
	});

	it('reconoce los fondos no cotizados por el ticker 0P de Yahoo', () => {
		// Es como llegan los indexados de MyInvestor / Vanguard desde la búsqueda.
		expect(resolveInstrumentType('0P0001AJ8T', 'Vanguard Global Stock Index Fund')).toBe('fund');
	});

	/**
	 * ⚠️ Con el sufijo de mercado, que es la forma que Yahoo devuelve de verdad.
	 *
	 * Los tests de esta señal usaban todos `0P0001AJ8T` a secas, y el regex terminaba en
	 * `$`, así que la señal estaba verde en la suite y **no se disparaba nunca en
	 * producción**: el ticker real medido contra Yahoo y anotado en la prosa de este repo
	 * es `0P0001XF40.F`. Un test que fija una forma que no ocurre no cubre la señal, la
	 * disfraza.
	 *
	 * Lo que costaba está en las dos aserciones de abajo: con ISIN caía a `other`, que
	 * `traspaso.ts` excluye de cualquier plan, y sin ISIN a `equity`, que le habría
	 * aplicado la ventana de antiaplicación de 2 meses en lugar de la de 12.
	 */
	it('reconoce el ticker 0P con el sufijo de mercado, que es como llega de verdad', () => {
		expect(resolveInstrumentType('0P0001XF40.F', 'Seilern World Growth EUR U R')).toBe('fund');
		expect(
			resolveInstrumentType('0P0001XF40.F', 'Seilern World Growth EUR U R', '', 'IE00B2NXKW18')
		).toBe('fund');
		expect(resolveInstrumentType('0P0000ZZZZ.L', 'Vanguard Global Stock Index Fund')).toBe('fund');
	});

	it('no llama fondo a cualquier cosa que empiece por 0P', () => {
		// Control negativo del sufijo: no puede tragarse un nombre de mercado entero ni
		// un ticker que sólo comparte el prefijo.
		expect(resolveInstrumentType('0PX', 'Lo que sea')).not.toBe('fund');
		expect(resolveInstrumentType('0P0001XF40.DEMASIADO', 'Lo que sea')).not.toBe('fund');
	});

	it('no confunde un ETF con un fondo aunque replique el mismo índice', () => {
		// El caso que importa: los dos son IE00 y los dos dicen «World».
		expect(resolveInstrumentType('IWDA.AS', 'iShares Core MSCI World UCITS ETF', '', 'IE00B4L5Y983')).toBe('etf');
		expect(
			resolveInstrumentType('0P0000ZZZZ', 'Vanguard Global Stock Index Fund EUR Acc', '', 'IE00B03HCZ61')
		).toBe('fund');
	});

	it('trata el efectivo y las cuentas remuneradas como cash', () => {
		expect(resolveInstrumentType('CASH-EUR', 'Efectivo')).toBe('cash');
		expect(resolveInstrumentType('MYINV', 'Cuenta Remunerada MyInvestor')).toBe('cash');
	});

	it('deja fuera lo que no sabe modelar fiscalmente', () => {
		expect(resolveInstrumentType('BTC-EUR', 'Bitcoin', 'CRYPTOCURRENCY')).toBe('other');
		expect(resolveInstrumentType('EURUSD=X', 'EUR/USD', 'CURRENCY')).toBe('other');
		// Sin ninguna señal utilizable: mejor `other` que adivinar.
		expect(resolveInstrumentType('???', '')).toBe('other');
	});

	it('usa el ISIN solo para descartar acción, no para elegir entre fondo y ETF', () => {
		// Un IE00 a secas no basta para decir «fondo»: los ETF irlandeses también lo son.
		expect(resolveInstrumentType('XYZ', 'Algo Raro', '', 'IE00B4L5Y983')).toBe('other');
		// Un ISIN de acción sí es concluyente en la otra dirección.
		expect(resolveInstrumentType('XYZ', 'Algo Raro', '', 'US0378331005')).toBe('equity');
	});
});

/**
 * Una fila por señal, que es lo que el mutation testing pedía.
 *
 * ⚠️ `resolveInstrumentType` tenía 90 % de cobertura y un mutation score de **68,13 %**:
 * 50 mutantes vivos, y casi todos del mismo tipo —cada alternativa de un `||` sin
 * ejercitar por separado—. Con los tests de arriba, quitar `ty === 'FUND'`, `INDEX` o el
 * sufijo `-USD` de su condición no rompía nada, porque cada regla se probaba solo con una
 * de sus variantes. En un clasificador del que cuelga el trato fiscal, «esta rama no la
 * comprueba nadie» significa que se puede borrar sin enterarse.
 *
 * La tabla también documenta el orden de precedencia, que es la parte que un lector no
 * puede deducir sin ejecutarlo.
 */
describe('resolveInstrumentType · una fila por señal', () => {
	const casos: [string, string, string, string, string, string][] = [
		// ticker, nombre, tipo Yahoo, ISIN, esperado, por qué
		['CASH', '', '', '', 'cash', 'ticker exactamente CASH'],
		['CASH-EUR', '', '', '', 'cash', 'prefijo CASH-'],
		['MMF', 'Money Market', 'CASH', '', 'cash', 'tipo CASH de Yahoo'],
		['XX', 'Cuenta Remunerada', '', '', 'cash', 'nombre con REMUNERADA'],
		['XX', 'Efectivo disponible', '', '', 'cash', 'nombre con EFECTIVO'],
		['XX', 'Depósito a plazo', '', '', 'cash', 'nombre con DEPÓSITO acentuado'],
		['XX', 'Deposito a plazo', '', '', 'cash', 'nombre con DEPOSITO sin acento'],

		['BTC', 'Bitcoin', 'CRYPTOCURRENCY', '', 'other', 'tipo con CRYPTO'],
		['XX', 'Par de divisas', 'CURRENCY', '', 'other', 'tipo CURRENCY'],
		['XX', 'S&P 500', 'INDEX', '', 'other', 'tipo INDEX: un índice no se compra'],
		['XX', 'Futuro del Brent', 'FUTURE', '', 'other', 'tipo FUTURE'],
		['ETH-USD', 'Ethereum', '', '', 'other', 'sufijo -USD sin tipo de Yahoo'],
		['ADA-EUR', 'Cardano', '', '', 'other', 'sufijo -EUR sin tipo de Yahoo'],
		['EURGBP=X', 'Euro libra', '', '', 'other', 'ticker con =X sin tipo de Yahoo'],

		['XX', 'Lo que sea', 'MUTUALFUND', '', 'fund', 'MUTUALFUND, la señal más limpia'],
		['XX', 'Lo que sea', 'FUND', '', 'fund', 'tipo FUND a secas'],
		['XX', 'Lo que sea', 'ETF', '', 'etf', 'tipo ETF'],
		['XX', 'Lo que sea', 'EQUITY', '', 'equity', 'tipo EQUITY'],
		['XX', 'Lo que sea', 'STOCK', '', 'equity', 'tipo STOCK'],

		['0P0000ABCD', 'Sin más pistas', '', '', 'fund', 'ticker 0P de fondo no cotizado'],
		['0P123', 'Sin más pistas', '', '', 'other', 'un 0P demasiado corto no vale'],

		['XX', 'iShares Core MSCI World UCITS ETF', '', '', 'etf', 'ETF en el nombre'],
		['XX', 'Vanguard Exchange Traded Fund', '', '', 'etf', 'EXCHANGE TRADED en el nombre'],
		['XX', 'Fondo Ibex 35', '', '', 'fund', 'FONDO en el nombre'],
		['XX', 'Vanguard Global Index Fund', '', '', 'fund', 'INDEX FUND en el nombre'],
		['XX', 'Fondo Indexado Global', '', '', 'fund', 'FONDO INDEXADO en el nombre'],

		['XX', 'Amundi Index Solutions', '', 'LU1234567890', 'fund', 'INDEX + ISIN colectivo (LU)'],
		['XX', 'Cartera Indexado Global', '', 'IE00B03HCZ61', 'fund', 'INDEXADO + ISIN colectivo (IE)'],
		['XX', 'Indexa Capital 60', '', 'ES0159201012', 'fund', 'INDEXA + ISIN colectivo (ES0)'],
		['XX', 'Amundi Index MSCI', '', 'FR0010655746', 'fund', 'INDEX + ISIN colectivo (FR00)'],
		['XX', 'Raiffeisen Index Fonds', '', 'AT0000123456', 'fund', 'INDEX + ISIN colectivo (AT0)'],
		['XX', 'DWS Index Fonds', '', 'DE000A0F5UF5', 'fund', 'INDEX + ISIN colectivo (DE000 + letra)'],
		// ⚠️ La contraparte del anterior: el ISIN alemán de una **acción** lleva dígito tras
		// DE000, así que no es vehículo colectivo y un nombre con INDEX no lo convierte en fondo.
		['XX', 'Algo con Index', '', 'DE0005190003', 'equity', 'DE000 + dígito es acción (BMW)'],
		['XX', 'Algo con Index', '', 'US0378331005', 'equity', 'INDEX en el nombre no basta sin ISIN colectivo'],

		['XX', 'Empresa cualquiera', '', 'US5949181045', 'equity', 'ISIN de acción'],
		['XX', 'Empresa cualquiera', '', 'US123', 'other', 'ISIN malformado no clasifica'],
		['ITX.MC', 'Inditex', '', '', 'equity', 'sufijo de mercado de dos letras'],
		['ULVR.L', 'Unilever', '', '', 'equity', 'sufijo de mercado de una letra'],
		// Ticker inventado a propósito: con uno real de ETF, la fila se leería como «esta app
		// cree que VWCE.DE es una acción», y no es eso — en la app real llega con tipo de
		// Yahoo o con «ETF» en el nombre. Lo que se fija aquí es la regla de último recurso.
		['XXXX.DEX', 'Algo sin pistas', '', '', 'equity', 'sufijo de mercado de tres letras'],
		['ALGO.LARGO', 'Algo sin pistas', '', '', 'other', 'un sufijo de cuatro letras no es mercado'],
		['XX.AS', 'Algo sin pistas', '', 'IE00B4L5Y983', 'other', 'con ISIN colectivo, el sufijo no manda'],

		['', '', '', '', 'other', 'sin ninguna señal: no adivinar']
	];

	it.each(casos)(
		'«%s» / «%s» / «%s» / «%s» → %s (%s)',
		(ticker, nombre, tipo, isin, esperado) => {
			expect(resolveInstrumentType(ticker, nombre, tipo, isin)).toBe(esperado);
		}
	);

	it('el tipo de Yahoo gana a todas las demás señales', () => {
		// Precedencia, que es lo que la tabla no puede enseñar por sí sola: un ticker de
		// fondo con nombre de fondo, si Yahoo dice ETF, es ETF.
		expect(resolveInstrumentType('0P0000ABCD', 'Fondo Indexado', 'ETF', 'IE00B03HCZ61')).toBe(
			'etf'
		);
	});
});

describe('instrumentTypeOf', () => {
	it('respeta el tipo guardado', () => {
		expect(instrumentTypeOf(asset({ instrumentType: 'fund', ticker: 'AAPL', name: 'Apple' }))).toBe('fund');
	});

	it('deduce el tipo de las carteras antiguas que no lo tienen', () => {
		expect(instrumentTypeOf(asset({ ticker: '0P0001AJ8T', name: 'Vanguard Global Stock Index' }))).toBe('fund');
	});

	it('un activo con interés manual es efectivo aunque no lo diga el nombre', () => {
		expect(instrumentTypeOf(asset({ ticker: 'DEP', name: 'Plazo Fijo', manualInterestRate: 0.03 }))).toBe('cash');
	});
});

describe('reglas fiscales derivadas', () => {
	it('solo los fondos se pueden traspasar', () => {
		expect(canBeTransferred(asset({ instrumentType: 'fund' }))).toBe(true);
		expect(canBeTransferred(asset({ instrumentType: 'etf' }))).toBe(false);
		expect(canBeTransferred(asset({ instrumentType: 'equity' }))).toBe(false);
		expect(canBeTransferred(asset({ instrumentType: 'cash' }))).toBe(false);
	});

	it('solo tributan al vender los ETF y las acciones', () => {
		expect(isTaxableOnSale(asset({ instrumentType: 'etf' }))).toBe(true);
		expect(isTaxableOnSale(asset({ instrumentType: 'equity' }))).toBe(true);
		// Un traspaso de fondo no es hecho imponible, y mover efectivo tampoco.
		expect(isTaxableOnSale(asset({ instrumentType: 'fund' }))).toBe(false);
		expect(isTaxableOnSale(asset({ instrumentType: 'cash' }))).toBe(false);
		// `other` no se toca porque no sabemos qué es.
		expect(isTaxableOnSale(asset({ instrumentType: 'other' }))).toBe(false);
	});
});

/**
 * La migración del tipo mal guardado.
 *
 * ⚠️ Lo que se prueba aquí sobre todo es **lo que NO toca**. Un barrido que volviera a
 * deducir el tipo de todos los activos borraría las correcciones manuales de Gestionar
 * Activos, que `normalizeAssets` respeta a propósito. La estrechez es la garantía, así
 * que la mayoría de los casos comprueban que devuelve `null`.
 */
describe('tipoCorregidoPorMigracion', () => {
	const activo = (ticker: string, instrumentType?: InstrumentType): Asset =>
		({ ticker, name: 'x', isin: '', targetWeight: 0, color: '#fff', ter: 0, category: 'core', instrumentType }) as Asset;

	it('repara el fondo con ticker 0P y sufijo que quedó como other o equity', () => {
		// El caso real: importado antes del arreglo, con el tipo equivocado en disco.
		expect(tipoCorregidoPorMigracion(activo('0P0001XF40.F', 'other'))).toBe('fund');
		expect(tipoCorregidoPorMigracion(activo('0P0001XF40.F', 'equity'))).toBe('fund');
		expect(tipoCorregidoPorMigracion(activo('0P0001XF40.F', 'etf'))).toBe('fund');
	});

	it('no toca el que ya está bien', () => {
		expect(tipoCorregidoPorMigracion(activo('0P0001XF40.F', 'fund'))).toBeNull();
	});

	it('⚠️ no toca los tickers 0P **sin** sufijo, que el regex viejo ya reconocía', () => {
		// Si estos llegaran con otro tipo, es porque alguien lo puso a mano: el defecto
		// nunca los alcanzó, así que la migración no tiene nada que reparar ahí.
		expect(tipoCorregidoPorMigracion(activo('0P0001AJ8T', 'etf'))).toBeNull();
		expect(tipoCorregidoPorMigracion(activo('0P0000ZZZZ', 'equity'))).toBeNull();
	});

	it('⚠️ no toca nada que no sea un ticker 0P', () => {
		// El control que impide que esto se convierta en un barrido: una corrección manual
		// sobre cualquier otro activo tiene que sobrevivir.
		for (const t of ['IWDA.AS', 'AAPL', 'IE00B4L5Y983', 'CASH-EUR', 'BRK.B', '', '0P']) {
			expect(tipoCorregidoPorMigracion(activo(t, 'etf')), `«${t}» no debe migrarse`).toBeNull();
		}
	});

	it('es idempotente: aplicarla dos veces no cambia nada', () => {
		const migrado = activo('0P0001XF40.F', tipoCorregidoPorMigracion(activo('0P0001XF40.F', 'other'))!);
		expect(tipoCorregidoPorMigracion(migrado)).toBeNull();
	});
});
