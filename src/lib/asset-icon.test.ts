import { describe, it, expect } from 'vitest';
import { resolveAssetIcon, ICONO_GENERICO } from './asset-icon';

/**
 * Los cuatro casos de arriba son **una cartera real**, leída del navegador del autor el
 * 19-ago-2026 cuando dijo «tengo activos que no son defensivos y sale un escudo». Cuatro
 * de sus cinco activos tenían el icono equivocado, así que sirven de fixture mejor que
 * cualquier ejemplo inventado: llevan las abreviaturas que usan de verdad los
 * proveedores (`Dev Wld`, `EmergMkts`, `Ultr Shrt`), que es exactamente lo que la
 * versión anterior no sabía leer.
 */
describe('resolveAssetIcon · la cartera que destapó el fallo', () => {
	it('un indexado global abreviado es un globo, no un escudo', () => {
		expect(
			resolveAssetIcon('0P0001XF40.F', 'iShares Dev Wld Idx (IE) S Acc EUR', '', {
				indexKey: 'msci-world',
				instrumentType: 'fund'
			})
		).toBe('🌐');
	});

	it('y lo es aunque no se sepa qué índice replica: «WLD» basta', () => {
		// El caso que de verdad falló: sin `indexKey`, el nombre abreviado tenía que
		// bastar y no bastaba.
		expect(resolveAssetIcon('0P0001XF40.F', 'iShares Dev Wld Idx (IE) S Acc EUR', '', { instrumentType: 'fund' })).toBe('🌐');
	});

	it('un fondo de emergentes abreviado va a su globo', () => {
		expect(resolveAssetIcon('0P0001XF3Z.F', 'iShares EmergMkts Idx (IE) S Acc EUR', '', { instrumentType: 'fund' })).toBe('🌏');
	});

	it('un fondo de crédito a corto plazo es renta fija', () => {
		expect(resolveAssetIcon('0P0001QKUD.F', 'Ostrum Credit Ultr Shrt Pls R/C(EUR)', '', { instrumentType: 'fund' })).toBe('🧾');
	});

	it('un ETP de bitcoin es bitcoin antes que ETP', () => {
		expect(resolveAssetIcon('XS2940466316.SG', 'iShares Bitcoin ETP', '', { instrumentType: 'etf' })).toBe('₿');
	});

	it('una acción cualquiera es una posición', () => {
		expect(resolveAssetIcon('34Q0.SG', 'Quantum eMotion', '', { instrumentType: 'equity' })).toBe(ICONO_GENERICO);
	});
});

describe('resolveAssetIcon · ningún fondo es defensivo por ser fondo', () => {
	it('un fondo sin más señas no lleva escudo', () => {
		// La regla que causó todo: `type` decía «fondo» y eso devolvía 🛡️.
		expect(resolveAssetIcon('0P0000ABCD.F', 'Fondo Sin Señas', 'MUTUALFUND')).toBe('📊');
	});

	it('el escudo se reserva a lo que sí es defensa', () => {
		expect(resolveAssetIcon('DFND.L', 'VanEck Defense UCITS ETF', 'ETF')).toBe('🛡️');
		expect(resolveAssetIcon('ASWC.DE', 'Global Aerospace and Defence', 'ETF')).toBe('🛡️');
	});
});

describe('resolveAssetIcon · la clase de activo manda sobre la geografía', () => {
	it('la deuda pública europea es renta fija, no Europa', () => {
		expect(resolveAssetIcon('IEGA.AS', 'iShares Core Euro Government Bond', 'ETF', { indexKey: 'euro-govt-bond' })).toBe('🧾');
	});

	it('un depósito con interés manual es efectivo diga lo que diga el nombre', () => {
		expect(resolveAssetIcon('CASH-55BQN', 'Cuenta MyInvestor World', '', { manualInterestRate: 0.02 })).toBe('🏦');
	});

	it('un sectorial mundial va a su sector, no a su región', () => {
		expect(resolveAssetIcon('WHEA.L', 'iShares MSCI World Health Care', 'ETF')).toBe('🏥');
	});
});

describe('resolveAssetIcon · el índice replicado pesa más que el nombre', () => {
	it('un nombre mudo se resuelve por su indexKey', () => {
		// Un fondo de gestora pequeña cuyo nombre no dice dónde invierte: el índice sí.
		expect(resolveAssetIcon('0P00001234.F', 'Bestinver Índice S FI', '', { indexKey: 'sp500' })).toBe('🌎');
	});

	it('un indexKey que no conocemos no rompe: sigue por el nombre', () => {
		expect(resolveAssetIcon('XXX', 'MSCI Europe Index Fund', '', { indexKey: 'indice-inventado' })).toBe('🌍');
	});
});

/**
 * ⚠️ Los cinco de abajo son el motivo de buscar por palabra entera. La versión anterior
 * usaba `includes()` a pelo, y cada uno de estos casos devolvía el icono de otra cosa
 * —una acción holandesa se convertía en Ethereum— sin que nada lo dijera.
 */
describe('resolveAssetIcon · las palabras enteras evitan los falsos positivos', () => {
	it('NETHERLANDS no es Ethereum', () => {
		expect(resolveAssetIcon('ABN.AS', 'ABN Amro Netherlands', '', { instrumentType: 'equity' })).not.toBe('Ξ');
	});

	it('SOLVAY no es Solana', () => {
		expect(resolveAssetIcon('SOLB.BR', 'Solvay SA', '', { instrumentType: 'equity' })).toBe(ICONO_GENERICO);
	});

	it('BIOTECH es salud, no tecnología', () => {
		expect(resolveAssetIcon('BTEC.L', 'iShares Nasdaq Biotechnology', 'ETF')).toBe('🏥');
	});

	it('TESORO no es oro', () => {
		expect(resolveAssetIcon('TES.MC', 'Tesoro Público Letras', '', { instrumentType: 'fund' })).toBe('🧾');
	});

	it('un nombre con acentos se lee igual que sin ellos', () => {
		expect(resolveAssetIcon('XX', 'Fondo Tecnología Global', '', { instrumentType: 'fund' })).toBe('💻');
	});
});

describe('resolveAssetIcon · sin datos no inventa', () => {
	it('sin nombre ni ticker devuelve el genérico', () => {
		expect(resolveAssetIcon()).toBe(ICONO_GENERICO);
	});

	it('una acción conocida conserva su icono', () => {
		expect(resolveAssetIcon('AAPL', 'Apple Inc', 'EQUITY')).toBe('🍎');
	});

	it('no hay banderas en ningún resultado', () => {
		// Chrome en Windows no las dibuja: las pinta como sus dos letras indicadoras, más
		// estrechas que cualquier otro icono de la columna. Medido en producción.
		const casos: [string, string, string][] = [
			['SPY', 'SPDR S&P 500 ETF', 'ETF'],
			['IBEX', 'Amundi IBEX 35', 'ETF'],
			['EWJ', 'iShares MSCI Japan', 'ETF'],
			['EXSA.DE', 'iShares STOXX Europe 600', 'ETF']
		];
		const banderas = /[\u{1F1E6}-\u{1F1FF}]/u;
		for (const [t, n, ty] of casos) {
			expect(banderas.test(resolveAssetIcon(t, n, ty)), `${n} lleva bandera`).toBe(false);
		}
	});
});

/**
 * La tabla de familias. Una fila por rama del resolutor, porque cada rama es un icono
 * distinto en pantalla y la de al lado no la cubre: sin esto, media función se quedaba
 * sin ejecutar nunca y el primer aviso de un icono mal puesto habría sido otro usuario.
 */
describe('resolveAssetIcon · una fila por familia', () => {
	const casos: [string, string, string, string][] = [
		['Oro físico', 'IGLN.L', 'iShares Physical Gold ETC', '🥇'],
		['Plata y materias primas', 'SSLN.L', 'WisdomTree Broad Commodities', '⛏️'],
		['Inmobiliario', 'IPRP.AS', 'iShares European Property Yield REIT', '🏢'],
		['Agua', 'IH2O.L', 'iShares Global Water', '💧'],
		['Energía', 'INRG.L', 'iShares Global Clean Energy', '⚡'],
		['Dividendos', 'VHYL.AS', 'Vanguard All-World High Dividend', '💰'],
		['Tecnología', 'QQQ', 'Invesco QQQ Trust', '💻'],
		['Otra cripto', 'SOL-EUR', 'Solana EUR', '🪙'],
		['Ethereum', 'ETH-EUR', 'Ethereum EUR', 'Ξ'],
		['Efectivo por nombre', 'MYINV', 'Cuenta Remunerada MyInvestor', '🏦'],
		['Europa', 'EXSA.DE', 'iShares STOXX Europe 600', '🌍'],
		['Estados Unidos', 'CSPX.L', 'iShares Core S&P 500', '🌎'],
		['Small caps mundiales', 'WSML.L', 'iShares MSCI World Small Cap', '🌐'],
		['Una acción conocida', 'NVDA', 'NVIDIA Corporation', '🎮']
	];

	for (const [familia, ticker, nombre, esperado] of casos) {
		it(`${familia}: ${nombre}`, () => {
			expect(resolveAssetIcon(ticker, nombre)).toBe(esperado);
		});
	}
});
