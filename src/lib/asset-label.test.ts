import { describe, it, expect } from 'vitest';
import {
	assetLabelCandidates,
	descriptiveAssetLabel,
	shortestAssetLabel,
	tickerLabel
} from './asset-label';

const activo = (name: string, ticker = 'X') => ({ name, ticker });

describe('assetLabelCandidates', () => {
	it('el primer candidato es siempre el nombre tal cual', () => {
		const c = assetLabelCandidates(activo('iShares Core MSCI World UCITS ETF USD (Acc)'));
		expect(c[0]).toBe('iShares Core MSCI World UCITS ETF USD (Acc)');
	});

	it('van de más largo a más corto y sin repetidos', () => {
		const c = assetLabelCandidates(activo('iShares Core MSCI World UCITS ETF USD (Acc)'));
		for (let i = 1; i < c.length; i++) {
			expect(c[i].length, `«${c[i]}» no es más corto que «${c[i - 1]}»`).toBeLessThan(
				c[i - 1].length
			);
		}
		expect(new Set(c).size).toBe(c.length);
	});

	/**
	 * El caso que motiva todo el módulo: dos fondos de la misma gestora sobre el
	 * mismo índice base comparten los primeros 18 caracteres, así que truncar el
	 * nombre a pelo produce dos rótulos idénticos. Es el defecto que en su día se
	 * llevó por delante las leyendas de los donuts.
	 */
	it('dos fondos de la misma gestora siguen distinguiéndose en el candidato corto', () => {
		const world = shortestAssetLabel(activo('iShares Core MSCI World UCITS ETF'));
		const emerging = shortestAssetLabel(activo('iShares Core MSCI EM IMI UCITS ETF'));

		expect(world).not.toBe(emerging);
		// Y se distinguen ya en los primeros caracteres, que es lo que sobrevive a un
		// recorte: comparar las cadenas enteras no probaría nada.
		expect(world.slice(0, 6)).not.toBe(emerging.slice(0, 6));
	});

	it('quita la fontanería que llevan todos los fondos', () => {
		expect(shortestAssetLabel(activo('Vanguard Global Stock Index Fund EUR Acc'))).toBe(
			'Global Stock'
		);
	});

	it('quita la clase entre paréntesis', () => {
		const c = assetLabelCandidates(activo('Amundi Index MSCI World (Acc)'));
		expect(c).toContain('MSCI World');
		// Y el más corto ya sin la palabra de familia, para las celdas estrechas.
		expect(shortestAssetLabel(activo('Amundi Index MSCI World (Acc)'))).toBe('World');
	});

	it('quita el sufijo legal de una acción', () => {
		expect(shortestAssetLabel(activo('Alphabet Inc'))).toBe('Alphabet');
		expect(shortestAssetLabel(activo('Tesla, Inc.'))).toBe('Tesla,');
	});

	/**
	 * ⚠️ Quitar la gestora **solo si lo que queda sigue identificando algo**.
	 * «Fundsmith Equity Fund» sin gestora es «Equity», que no dice qué fondo es.
	 */
	it('no quita la gestora si lo que queda no identifica nada', () => {
		expect(shortestAssetLabel(activo('Fundsmith Equity Fund'))).toBe('Fundsmith Equity');
	});

	it('sí la quita cuando lo que queda basta', () => {
		const c = assetLabelCandidates(activo('iShares MSCI World Small Cap UCITS ETF'));
		expect(c).toContain('MSCI World Small Cap');
		expect(c[c.length - 1]).toBe('World Small Cap');
	});

	/** `cap` no puede estar en la lista de fontanería: se comería «Small Cap». */
	it('«Small Cap» sobrevive', () => {
		expect(shortestAssetLabel(activo('Vanguard Global Small Cap Index Fund'))).toContain(
			'Small Cap'
		);
	});

	/** Los nexos se quitan en los bordes, nunca en medio. */
	it('«Bank of America» conserva su «of» y «Fondo de Inversión» pierde el suyo', () => {
		expect(shortestAssetLabel(activo('Bank of America Corp'))).toBe('Bank of America');
		expect(shortestAssetLabel(activo('Fondo de Inversión Global'))).toBe('Global');
	});

	it('sin nombre devuelve el ticker', () => {
		expect(assetLabelCandidates({ name: '', ticker: 'IE00B4L5Y983' })).toEqual(['IE00B4L5Y983']);
		expect(assetLabelCandidates({ ticker: 'CASH-DEP' })).toEqual(['CASH-DEP']);
	});

	/**
	 * Un nombre que es todo fontanería no puede quedarse en cadena vacía: el mapa
	 * dibujaría una celda sin rótulo teniendo nombre.
	 */
	it('un nombre que es todo fontanería se queda como estaba', () => {
		expect(shortestAssetLabel(activo('ETF Fund'))).toBe('ETF Fund');
	});

	it('normaliza los espacios de sobra', () => {
		expect(assetLabelCandidates(activo('  MSCI   World  '))[0]).toBe('MSCI World');
	});

	it('el nombre de un depósito no se toca', () => {
		expect(shortestAssetLabel(activo('Depósito remunerado'))).toBe('Depósito remunerado');
	});
});

/**
 * El rótulo de una leyenda no es el de una celda de treemap.
 *
 * ⚠️ El primer arreglo que se propuso para la leyenda del gráfico de deriva fue usar
 * `shortestAssetLabel()`, y era peor que el defecto: convertía `IWDA.AS` en «World».
 * Se descubrió ejecutándolo antes de escribirlo en el componente, no razonándolo.
 */
describe('tickerLabel', () => {
	it('deja el ticker cuando el ticker dice algo', () => {
		expect(tickerLabel({ ticker: 'IWDA.AS', name: 'iShares Core MSCI World UCITS ETF' })).toBe(
			'IWDA.AS'
		);
		expect(tickerLabel({ ticker: 'AAPL', name: 'Apple Inc' })).toBe('AAPL');
	});

	it('cae al nombre cuando el ticker es un ISIN', () => {
		// Es el caso normal de un fondo, y el que hace ilegible una leyenda entera.
		expect(tickerLabel({ ticker: 'IE00B4L5Y983', name: 'iShares Core MSCI World UCITS ETF' })).toBe(
			'World'
		);
	});

	it('cae al nombre cuando el ticker es un código 0P de Yahoo', () => {
		expect(tickerLabel({ ticker: '0P0001XF40.F', name: 'Seilern World Growth EUR U R' })).toBe(
			'World Growth'
		);
	});

	it('se queda con el ISIN si no hay nombre del que tirar', () => {
		// Un ISIN feo informa más que una cadena vacía.
		expect(tickerLabel({ ticker: 'IE00B4L5Y983' })).toBe('IE00B4L5Y983');
	});

	it('no confunde un ticker corto con un ISIN', () => {
		// Control negativo del regex: doce caracteres exactos y acabado en dígito.
		expect(tickerLabel({ ticker: 'BRK.B', name: 'Berkshire Hathaway Inc' })).toBe('BRK.B');
		expect(tickerLabel({ ticker: 'CASH-EUR', name: 'Cuenta Remunerada' })).toBe('CASH-EUR');
	});
});

/**
 * El rótulo de la lista «Lo que más lo mueve hoy», que responde a qué está
 * moviendo tu dinero. Allí un ticker obliga a traducir antes de entender la
 * respuesta, así que se sirve el nombre sin fontanería.
 */
describe('descriptiveAssetLabel', () => {
	it('quita la fontanería y conserva la gestora', () => {
		expect(descriptiveAssetLabel(activo('Vanguard FTSE All-World UCITS ETF', 'VWCE'))).toBe(
			'Vanguard FTSE All-World'
		);
		expect(descriptiveAssetLabel(activo('Fidelity MSCI World Index Fund', 'IE00BYX5NX33'))).toBe(
			'Fidelity MSCI World'
		);
		expect(descriptiveAssetLabel(activo('Apple Inc', 'AAPL'))).toBe('Apple');
	});

	/**
	 * ⚠️ El control negativo del atajo evidente. `assetLabelCandidates()[1]` parecía
	 * valer y no vale: la lista se deduplica, así que con un nombre **sin**
	 * fontanería el segundo elemento pasa a ser el nombre sin gestora. Aquí eso
	 * serviría «Core MSCI World», y la gestora es media identidad de un fondo.
	 */
	it('conserva la gestora incluso cuando el nombre no trae fontanería que quitar', () => {
		const asset = activo('iShares Core MSCI World', 'IWDA.AS');
		expect(assetLabelCandidates(asset)[1]).toBe('Core MSCI World');
		expect(descriptiveAssetLabel(asset)).toBe('iShares Core MSCI World');
	});

	it('no colapsa dos fondos del mismo índice en el mismo texto', () => {
		// La trampa que este módulo existe para evitar: truncar el nombre entero deja
		// «iShares Core MS…» en los dos.
		const world = descriptiveAssetLabel(activo('iShares Core MSCI World UCITS ETF', 'IWDA.AS'));
		const emergentes = descriptiveAssetLabel(activo('iShares Core MSCI EM IMI UCITS ETF', 'EMIM.AS'));
		expect(world).not.toBe(emergentes);
	});

	it('prefiere el nombre al ticker aunque el ticker sea perfectamente legible', () => {
		// Es justo la diferencia con `tickerLabel`, que aquí devolvería «VWCE».
		expect(tickerLabel(activo('Vanguard FTSE All-World UCITS ETF', 'VWCE'))).toBe('VWCE');
		expect(descriptiveAssetLabel(activo('Vanguard FTSE All-World UCITS ETF', 'VWCE'))).not.toBe(
			'VWCE'
		);
	});

	it('cae al ticker cuando no hay nombre', () => {
		expect(descriptiveAssetLabel({ ticker: 'CASH-EUR' })).toBe('CASH-EUR');
		expect(descriptiveAssetLabel({ ticker: 'CASH-EUR', name: '   ' })).toBe('CASH-EUR');
	});

	it('devuelve el nombre entero si quitar la fontanería lo dejaría vacío', () => {
		// «Fondo» entero es fontanería; mejor un nombre pobre que ninguno.
		expect(descriptiveAssetLabel(activo('Fondo', 'X'))).toBe('Fondo');
	});
});
