import { describe, it, expect } from 'vitest';
import {
	resolveInstrumentType,
	instrumentTypeOf,
	canBeTransferred,
	isTaxableOnSale
} from './instrument-type';
import type { Asset } from './types';

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
