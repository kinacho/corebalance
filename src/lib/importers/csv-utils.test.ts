import { describe, it, expect } from 'vitest';
import {
	detectDelimiter,
	parseCSVLine,
	detectHeaderRow,
	parseCSV,
	parseNumber,
	normalizeHeader,
	findField,
	isValidISIN,
	extractISIN,
	createSkipRow,
	normalizeText,
	parseBrokerDate,
	normalizeCurrency,
	looksLikeIsinValue,
	looksLikeTickerValue,
	looksLikeNumericValue,
	looksLikeDateValue,
	analyzeColumns,
	suggestMappingFromAnalysis,
	generateCsvSignature
} from './csv-utils';

/**
 * Las heurísticas por las que entran los datos.
 *
 * 584 líneas sin una sola prueba, y es la puerta de entrada de la app: aquí se decide qué
 * separa las columnas de un CSV, cuál es la cabecera y —lo que más importa— **cuánto vale
 * un número**. Un fallo aquí no se ve en pantalla como un error, se ve como una cartera con
 * cifras equivocadas, que es peor.
 *
 * `parseNumber` va con tabla porque el formato europeo y el americano usan los mismos dos
 * caracteres con significados opuestos: `1.234,56` y `1,234.56` son el mismo importe escrito
 * al revés, y `1,234` es mil doscientos treinta y cuatro en Nueva York y uno con dos tres
 * cuatro en Madrid.
 */

describe('parseNumber', () => {
	const casos: [string, number, string][] = [
		['1.234,56', 1234.56, 'europeo con separador de miles'],
		['1,234.56', 1234.56, 'americano con separador de miles'],
		['1234,56', 1234.56, 'europeo sin miles: dos decimales tras la coma'],
		['1234.56', 1234.56, 'americano sin miles'],
		// ⚠️ Tres cifras tras la coma NO son miles: en los CSV que esta app importa, «1,835» son
		// 1,835 participaciones. Rescatar la heurística de miles rompió tres tests con ficheros
		// reales de bróker, y por eso esa rama se borró en vez de arreglarse.
		['1,234', 1.234, 'solo coma: siempre decimal europeo, aunque lleve tres cifras'],
		['0,123456', 0.123456, 'participaciones con seis decimales, como las escribe MyInvestor'],
		['1,23', 1.23, 'solo coma con dos cifras detrás: es decimal europeo'],
		['1,2', 1.2, 'una sola cifra detrás también es decimal'],
		['-1.234,56', -1234.56, 'negativo europeo'],
		['560 EUR', 560, 'con divisa pegada'],
		['1.234,56 €', 1234.56, 'con símbolo detrás'],
		['$1,000.00', 1000, 'con símbolo delante'],
		['', 0, 'vacío'],
		['-', 0, 'solo el signo'],
		['   ', 0, 'solo espacios'],
		['abc', 0, 'sin dígitos'],
		['0', 0, 'el cero es cero, no falta de dato'],
		['1.000.000,00', 1000000, 'dos separadores de miles europeos'],
		['12.345.678', 12345678, 'solo puntos: se leen como miles']
	];

	it.each(casos)('«%s» → %s (%s)', (entrada, esperado) => {
		expect(parseNumber(entrada)).toBe(esperado);
	});

	it('nunca devuelve NaN, que es lo que rompería las sumas de la cartera', () => {
		for (const basura of ['--', '.,', ',,,', '1..2', 'e5', '∞']) {
			expect(Number.isNaN(parseNumber(basura)), `«${basura}» devolvió NaN`).toBe(false);
		}
	});
});

describe('detectDelimiter', () => {
	it('reconoce el punto y coma de los CSV europeos', () => {
		expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
	});

	it('reconoce el tabulador', () => {
		expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
	});

	it('la coma es el valor por defecto', () => {
		expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
		// Y también cuando no hay ningún delimitador reconocible.
		expect(detectDelimiter('una sola columna')).toBe(',');
	});

	it('no cuenta los delimitadores que van dentro de comillas', () => {
		// El caso real: un nombre de fondo con comas dentro, en un fichero de punto y coma.
		// Contando a ciegas ganaría la coma y el fichero entero se leería como una columna.
		const texto = '"Vanguard Global Stock Index Fund, EUR Acc";100;2026-01-01\n"Otro, con coma";50;2026-01-02';
		expect(detectDelimiter(texto)).toBe(';');
	});

	it('solo mira las cinco primeras líneas', () => {
		// Cabecera de punto y coma y un cuerpo largo lleno de comas dentro de comillas: la
		// decisión se toma arriba, que es donde está la estructura.
		const texto = ['a;b', '1;2', '3;4', '5;6', '7;8', ...Array(50).fill('"x,y,z";1')].join('\n');
		expect(detectDelimiter(texto)).toBe(';');
	});
});

describe('parseCSVLine', () => {
	it('separa campos simples y recorta espacios', () => {
		expect(parseCSVLine('a, b ,c', ',')).toEqual(['a', 'b', 'c']);
	});

	it('respeta el delimitador dentro de comillas', () => {
		expect(parseCSVLine('"Fondo, clase A",100', ',')).toEqual(['Fondo, clase A', '100']);
	});

	it('entiende las comillas escapadas al estilo CSV', () => {
		// `""` dentro de un campo entrecomillado es una comilla literal.
		expect(parseCSVLine('"El ""bueno""",1', ',')).toEqual(['El "bueno"', '1']);
	});

	it('conserva los campos vacíos, incluido el último', () => {
		// Perder el vacío final desplaza todas las columnas de esa fila.
		expect(parseCSVLine('a,,c,', ',')).toEqual(['a', '', 'c', '']);
	});

	it('una línea vacía es un campo vacío, no cero campos', () => {
		expect(parseCSVLine('', ',')).toEqual(['']);
	});
});

describe('detectHeaderRow', () => {
	it('texto arriba y números abajo es una cabecera', () => {
		const filas = [
			['Ticker', 'Participaciones', 'Precio'],
			['VWCE', '10', '118,50'],
			['SXR8', '2', '520,00']
		];
		expect(detectHeaderRow(filas).hasHeader).toBe(true);
	});

	it('un fichero que empieza directamente con datos no tiene cabecera', () => {
		const filas = [
			['VWCE', '10', '118,50'],
			['SXR8', '2', '520,00'],
			['IWDA', '5', '90,10']
		];
		expect(detectHeaderRow(filas).hasHeader).toBe(false);
	});

	it('con menos de dos filas se asume cabecera', () => {
		// No hay con qué comparar; equivocarse hacia «hay cabecera» pierde una fila, y
		// equivocarse al contrario mete una cabecera como si fuera una posición.
		expect(detectHeaderRow([['Ticker', 'Shares']]).hasHeader).toBe(true);
		expect(detectHeaderRow([]).hasHeader).toBe(true);
	});

	it('reconoce las fechas como datos, no como cabecera', () => {
		const filas = [
			['Fecha', 'Importe'],
			['2026-01-01', '100'],
			['2026-01-02', '200']
		];
		expect(detectHeaderRow(filas).hasHeader).toBe(true);
	});
});

describe('parseCSV', () => {
	it('devuelve cabeceras y filas con el delimitador detectado', () => {
		const { headers, rows, delimiter } = parseCSV('Ticker;Shares\nVWCE;10\nSXR8;2');
		expect(delimiter).toBe(';');
		expect(headers).toEqual(['Ticker', 'Shares']);
		expect(rows).toEqual([
			['VWCE', '10'],
			['SXR8', '2']
		]);
	});

	it('tolera los finales de línea de Windows', () => {
		// Todo CSV de bróker exportado desde Windows los trae; sin normalizar, el último
		// campo de cada fila arrastra un `\r` y ningún ISIN vuelve a validar.
		const { rows } = parseCSV('Ticker;ISIN;Participaciones\r\nVWCE;IE00BK5BQT80;10\r\nSXR8;IE00B5BMR087;2\r\n');
		expect(rows[0][1]).toBe('IE00BK5BQT80');
		expect(isValidISIN(rows[0][1])).toBe(true);
	});

	it('⚠️ un CSV con solo columnas de texto se toma por sin cabecera', () => {
		// Comportamiento fijado, no aprobado: `detectHeaderRow` necesita ver columnas
		// numéricas o de fecha debajo para reconocer una cabecera. Con ticker e ISIN y nada
		// más, la cabecera entra como si fuera una fila de datos. No se cambia aquí porque la
		// heurística la comparten los cinco detectores de bróker y los CSV reales de
		// `training/`; queda escrito para que se vea al tocarla.
		const { headers } = parseCSV('Ticker;ISIN\nVWCE;IE00BK5BQT80\nSXR8;IE00B5BMR087');
		expect(headers).toEqual(['Columna 1', 'Columna 2']);
	});
});

describe('normalizeHeader y findField', () => {
	it('normaliza acentos, mayúsculas y puntuación', () => {
		expect(normalizeHeader('Número de Participaciones')).toBe('numero de participaciones');
		expect(normalizeHeader('  ISIN/Código  ')).toBe('isin codigo');
	});

	it('encuentra el campo por coincidencia exacta antes que por parcial', () => {
		// El orden importa: con «Precio» y «Precio medio» en el mismo fichero, buscar
		// «Precio» tiene que dar la columna exacta y no la primera que lo contenga.
		const headers = ['Precio medio', 'Precio'];
		const row = ['100', '250'];
		expect(findField(headers, row, 'Precio')).toBe('250');
	});

	it('cae en la coincidencia parcial cuando no hay exacta', () => {
		const headers = ['Precio de compra unitario'];
		expect(findField(headers, ['42'], 'Precio de compra')).toBe('42');
	});

	it('devuelve cadena vacía si el campo no está, sin lanzar', () => {
		expect(findField(['Ticker'], ['VWCE'], 'Divisa', 'Currency')).toBe('');
	});

	it('no se sale de la fila cuando hay menos celdas que cabeceras', () => {
		// Filas cortas: pasa en cuanto un CSV tiene una fila de totales al final.
		expect(findField(['A', 'B', 'C'], ['1'], 'C')).toBe('');
	});
});

describe('ISIN', () => {
	it('valida la forma: dos letras, nueve alfanuméricos y un dígito de control', () => {
		expect(isValidISIN('IE00BK5BQT80')).toBe(true);
		expect(isValidISIN('ie00bk5bqt80')).toBe(true); // se normaliza a mayúsculas
		expect(isValidISIN(' IE00BK5BQT80 ')).toBe(true);
	});

	it('rechaza lo que no lo es', () => {
		for (const malo of ['IE00BK5BQT8', 'IE00BK5BQT800', '1E00BK5BQT80', 'IE00BK5BQT8X', '']) {
			expect(isValidISIN(malo), `«${malo}» no debería validar`).toBe(false);
		}
	});

	it('extrae el ISIN de una celda con más texto alrededor', () => {
		// Como llegan de DEGIRO: el nombre y el ISIN en la misma celda.
		expect(extractISIN('VANGUARD FTSE ALL-WORLD IE00BK5BQT80 ACC')).toBe('IE00BK5BQT80');
		expect(extractISIN('ie00bk5bqt80')).toBe('IE00BK5BQT80');
	});

	it('devuelve null cuando no hay ninguno', () => {
		expect(extractISIN('Vanguard FTSE All-World')).toBeNull();
	});
});

describe('normalizeCurrency', () => {
	it('deja pasar los códigos ISO de tres letras', () => {
		expect(normalizeCurrency('EUR')).toBe('EUR');
		expect(normalizeCurrency('usd')).toBe('USD');
		expect(normalizeCurrency(' gbp ')).toBe('GBP');
	});

	it('traduce los símbolos', () => {
		expect(normalizeCurrency('€')).toBe('EUR');
		expect(normalizeCurrency('$')).toBe('USD');
		expect(normalizeCurrency('£')).toBe('GBP');
	});

	it('traduce también el nombre escrito, no solo el símbolo', () => {
		// ⚠️ Esto no funcionaba: las alternativas del patrón estaban en minúscula y el valor
		// se pasa a mayúsculas antes de compararlo, así que **nunca podían casar**. «EURO» se
		// devolvía tal cual, o sea un código de divisa inválido colándose en la cartera.
		expect(normalizeCurrency('Euro')).toBe('EUR');
		expect(normalizeCurrency('EUROS')).toBe('EUR');
		expect(normalizeCurrency('Dólares USD')).toBe('USD');
	});

	/**
	 * ⚠️ **Cambio de contrato, 7-ago-2026.** Antes lo desconocido se devolvía en
	 * mayúsculas (`'rublos'` → `'RUBLOS'`) y este test lo daba por bueno. Ahora es
	 * `null`, por dos razones de distinto tamaño.
	 *
	 * La pequeña: un texto que no es una divisa entraba en la cartera como si fuera un
	 * código ISO. Los llamantes de `parsers.ts` rematan todos con `|| 'EUR'`, así que
	 * `null` les da exactamente el valor por defecto que ya querían.
	 *
	 * La grande: `analyzeColumns` usa esta función como **detector**, y devolviendo
	 * siempre algo decía que sí a todo — cada columna no vacía de cualquier CSV sumaba
	 * 0,4 al rol de divisa, por encima del umbral del mapeo automático. Un detector que
	 * nunca dice que no es un detector roto.
	 *
	 * Verificado contra los CSV reales de bróker de `training/`: siguen pasando.
	 */
	it('lo que no es una divisa reconocible es null, no un código inventado', () => {
		expect(normalizeCurrency('')).toBeNull();
		expect(normalizeCurrency('   ')).toBeNull();
		expect(normalizeCurrency('rublos')).toBeNull();
		expect(normalizeCurrency('---')).toBeNull();
		// Un código ISO de tres letras sí se acepta, aunque no lo conozcamos de nombre.
		expect(normalizeCurrency('chf')).toBe('CHF');
		expect(normalizeCurrency('sek')).toBe('SEK');
	});
});

describe('las formas que reconoce el mapeo automático de columnas', () => {
	it('un ISIN son doce caracteres que empiezan por dos letras', () => {
		expect(looksLikeIsinValue('IE00BK5BQT80')).toBe(true);
		expect(looksLikeIsinValue('1E00BK5BQT80')).toBe(false);
		expect(looksLikeIsinValue('IE00BK5BQT8')).toBe(false);
	});

	it('un ticker admite puntos y guiones, pero no espacios', () => {
		expect(looksLikeTickerValue('VWCE.DE')).toBe(true);
		expect(looksLikeTickerValue('BRK-B')).toBe(true);
		expect(looksLikeTickerValue('CASH-DEP')).toBe(true);
		expect(looksLikeTickerValue('Vanguard Global')).toBe(false);
		expect(looksLikeTickerValue('')).toBe(false);
	});

	it('un número lo es en los dos formatos, y con divisa pegada', () => {
		expect(looksLikeNumericValue('1.234,56')).toBe(true);
		expect(looksLikeNumericValue('1,234.56')).toBe(true);
		expect(looksLikeNumericValue('-42')).toBe(true);
		expect(looksLikeNumericValue('VWCE')).toBe(false);
	});

	it('una fecha lo es en los formatos que usan los brókeres', () => {
		expect(looksLikeDateValue('2026-01-15')).toBe(true);
		expect(looksLikeDateValue('15/01/2026')).toBe(true);
		expect(looksLikeDateValue('15-01-2026')).toBe(true);
		expect(looksLikeDateValue('VWCE')).toBe(false);
	});

	/**
	 * ⚠️ Un número suelto no es una fecha, y hay que decírselo: `Date.parse('10')`
	 * devuelve un instante válido —el 1 de octubre de 2001— y `Date.parse('2026')`
	 * también. Sin este corte, **cualquier columna numérica puntuaba 0,5 como fecha**,
	 * por encima del umbral del mapeo automático, así que la columna de participaciones
	 * podía acabar mapeada como la fecha de la operación. Y eso no da error en ninguna
	 * parte: da una cartera con las cantidades en el sitio equivocado.
	 */
	it('un número suelto no es una fecha, aunque Date.parse opine lo contrario', () => {
		for (const n of ['10', '2026', '0,5', '1.234,56', '-3']) {
			expect(looksLikeDateValue(n), `«${n}» se tomó por fecha`).toBe(false);
		}
	});

	it('y por tanto una columna de cantidades no puntúa como fecha', () => {
		/**
		 * Enteros sueltos a propósito, y comprobado revirtiendo el arreglo: con `25,5`
		 * en la muestra sólo dos de tres valores casaban, la proporción se quedaba en
		 * 0,67 —por debajo del umbral de 0,8— y este test pasaba **igual sin la
		 * corrección**. Así no defendía nada.
		 */
		const col = analyzeColumns(['Participaciones'], [['10'], ['2026'], ['5']])[0];
		expect(col.roleScores.date).toBe(0);
		expect(col.roleScores.quantity).toBeGreaterThan(0);
	});

	/**
	 * El mismo defecto por el otro lado: `normalizeCurrency` devolvía cualquier cosa,
	 * así que como detector decía que sí a todo y cada columna sumaba 0,4 al rol de
	 * divisa.
	 */
	it('y una columna que no son divisas no puntúa como divisa', () => {
		const col = analyzeColumns(['Descripcion'], [['Compra de fondo'], ['Dividendo']])[0];
		expect(col.roleScores.currency).toBe(0);
	});
});

describe('createSkipRow', () => {
	it('guarda cada fila omitida y por qué', () => {
		const { skipRow, skippedDetails } = createSkipRow();
		expect(skippedDetails).toHaveLength(0);

		skipRow(4, ['', 'VWCE', '', 'sin precio', 'x'], 'falta el precio');

		expect(skippedDetails).toHaveLength(1);
		// La fila se numera para un humano, que cuenta desde uno.
		expect(skippedDetails[0].rowNumber).toBe(5);
		expect(skippedDetails[0].reason).toBe('falta el precio');
		// La vista previa son las tres primeras celdas con contenido.
		expect(skippedDetails[0].preview).toBe('VWCE | sin precio | x');
	});

	/**
	 * ⚠️ Este test sustituye a uno que **no podía fallar**. Se llamaba «el contador es una
	 * vista viva, no una copia congelada» y leía `contador.skipped` **sin desestructurar**,
	 * que es justo lo que ningún parser hacía: los seis escribían
	 * `const { skipRow, skipped: _skipped } = createSkipRow()`, y desestructurar evalúa el
	 * getter una sola vez, capturando el 0 inicial. Es decir, el test describía en su
	 * comentario el patrón de producción y luego probaba el contrario, así que pasaba en
	 * verde con el defecto presente y `skippedRows` valiendo siempre 0 para los usuarios.
	 *
	 * La forma de que no vuelva a pasar no es probar mejor el getter: es que no haya getter.
	 * El contador y el array eran el mismo estado escrito dos veces, y la longitud de un
	 * array no se puede congelar al desestructurar. Esto vigila que no se reintroduzca.
	 */
	it('no expone ningún contador aparte: el número sale de la longitud del array', () => {
		const contador = createSkipRow();
		contador.skipRow(0, ['a'], 'r1');
		contador.skipRow(1, ['b'], 'r2');

		expect(Object.keys(contador).sort()).toEqual(['skipRow', 'skippedDetails']);
		expect(contador.skippedDetails).toHaveLength(2);

		// Y desestructurando —el patrón que rompía— sigue contando bien.
		const { skippedDetails } = contador;
		contador.skipRow(2, ['c'], 'r3');
		expect(skippedDetails.length).toBe(3);
	});
});

/**
 * El análisis de columnas: el paso que decide, sin preguntar a nadie, qué columna de
 * un CSV desconocido es la cantidad y cuál el precio. Es un clasificador, así que se
 * prueba como tal — **una fila por señal** —, que es la forma que este repo ya
 * aprendió con `instrument-type`: cada rol se decide sumando dos señales
 * independientes, la cabecera y el contenido, y si sólo se prueban juntas cualquiera
 * de las dos puede desaparecer sin que ningún test se entere.
 */
describe('analyzeColumns', () => {
	const analizar = (header: string, valores: string[]) =>
		analyzeColumns([header], valores.map((v) => [v]))[0];

	describe('cada rol se reconoce por la cabecera sola y por el contenido solo', () => {
		const CASOS: Array<{
			rol: 'isin' | 'ticker' | 'quantity' | 'currency' | 'name' | 'date' | 'type';
			cabecera: string;
			valores: string[];
		}> = [
			{ rol: 'isin', cabecera: 'ISIN', valores: ['IE00B4L5Y983', 'LU0908500753'] },
			{ rol: 'ticker', cabecera: 'Ticker', valores: ['VWCE', 'SXR8'] },
			{ rol: 'quantity', cabecera: 'Cantidad', valores: ['10', '25,5'] },
			{ rol: 'currency', cabecera: 'Divisa', valores: ['EUR', 'USD'] },
			{ rol: 'name', cabecera: 'Nombre', valores: ['Vanguard Global Stock', 'iShares Core World'] },
			{ rol: 'date', cabecera: 'Fecha', valores: ['01/02/2026', '15/03/2026'] },
			{ rol: 'type', cabecera: 'Tipo', valores: ['buy', 'sell'] }
		];

		// Contenido deliberadamente inservible: sólo puede puntuar la cabecera.
		const SIN_CONTENIDO = [['---'], ['---']];

		it.each(CASOS)('$rol: la cabecera sola ya puntúa', ({ rol, cabecera }) => {
			expect(analyzeColumns([cabecera], SIN_CONTENIDO)[0].roleScores[rol]).toBeGreaterThan(0);
		});

		it.each(CASOS)('$rol: el contenido solo ya puntúa', ({ rol, valores }) => {
			expect(analizar('col', valores).roleScores[rol]).toBeGreaterThan(0);
		});

		it.each(CASOS)('$rol: juntas puntúan más que cada una por separado', ({ rol, cabecera, valores }) => {
			const soloCabecera = analyzeColumns([cabecera], SIN_CONTENIDO)[0].roleScores[rol];
			const soloContenido = analizar('col', valores).roleScores[rol];
			const ambas = analizar(cabecera, valores).roleScores[rol];

			expect(ambas).toBeGreaterThan(soloCabecera);
			expect(ambas).toBeGreaterThan(soloContenido);
		});
	});

	it('una columna vacía no puntúa para nada, en vez de puntuar para todo', () => {
		const col = analyzeColumns(['Cantidad'], [[''], ['  ']])[0];
		expect(Object.values(col.roleScores).every((s) => s === 0)).toBe(true);
		expect(col.sampleValues).toEqual([]);
	});

	/**
	 * Saxo y DEGIRO meten cantidad, precio y operación en una sola celda descriptiva.
	 * La heurística del arroba marca esa columna como candidata a los tres roles a la
	 * vez, que es lo que permite que el parser la reviente después.
	 */
	it('reconoce la celda descriptiva con arroba como cantidad, precio y tipo a la vez', () => {
		const col = analizar('Descripcion', ['Buy 10 VWCE @ 95,20', 'Sell 5 SXR8 @ 480,10']);

		expect(col.roleScores.quantity).toBeGreaterThanOrEqual(0.85);
		expect(col.roleScores.price).toBeGreaterThanOrEqual(0.85);
		expect(col.roleScores.type).toBeGreaterThanOrEqual(0.8);
	});

	it('no confunde una descripción cualquiera con la celda del arroba', () => {
		const col = analizar('Descripcion', ['Dividendo trimestral', 'Comision de custodia']);
		expect(col.roleScores.quantity).toBeLessThan(0.85);
	});

	it('sólo mira las primeras 50 filas, que es lo que lo hace barato en un CSV largo', () => {
		const filas = [
			...Array.from({ length: 50 }, () => ['IE00B4L5Y983']),
			...Array.from({ length: 200 }, () => ['basura'])
		];
		const col = analyzeColumns(['col'], filas)[0];
		expect(col.sampleValues).toHaveLength(50);
		expect(col.roleScores.isin).toBeGreaterThan(0);
	});

	it('devuelve una entrada por columna, con su índice y su cabecera', () => {
		const analisis = analyzeColumns(['ISIN', 'Cantidad'], [['IE00B4L5Y983', '10']]);
		expect(analisis).toHaveLength(2);
		expect(analisis[0]).toMatchObject({ index: 0, header: 'ISIN' });
		expect(analisis[1].index).toBe(1);
	});
});

describe('suggestMappingFromAnalysis', () => {
	const CABECERAS = ['ISIN', 'Nombre', 'Cantidad', 'Precio', 'Divisa'];
	const FILAS = [
		['IE00B4L5Y983', 'Vanguard Global Stock', '10', '95,20', 'EUR'],
		['LU0908500753', 'Amundi Index MSCI World', '25', '480,10', 'EUR']
	];

	it('mapea un CSV claro sin ayuda', () => {
		const m = suggestMappingFromAnalysis(analyzeColumns(CABECERAS, FILAS));

		expect(m.isin).toBe(0);
		expect(m.name).toBe(1);
		expect(m.shares).toBe(2);
		expect(m.currency).toBe(4);
	});

	it('deja sin mapear un rol que no aparece por ninguna parte', () => {
		const m = suggestMappingFromAnalysis(
			analyzeColumns(['ISIN', 'Cantidad'], [['IE00B4L5Y983', '10']])
		);
		expect(m.date).toBeUndefined();
		expect(m.type).toBeUndefined();
	});

	/**
	 * Dos columnas igual de plausibles no se resuelven a cara o cruz: se dejan sin
	 * mapear para que el usuario confirme. Adivinar aquí es lo que mete la cantidad de
	 * una columna en el precio de otra, y eso no da error en ninguna parte.
	 */
	it('ante un empate, prefiere no mapear a acertar por suerte', () => {
		const m = suggestMappingFromAnalysis(
			analyzeColumns(['Fecha', 'Fecha valor'], [['01/02/2026', '03/02/2026']])
		);
		expect(m.date).toBeUndefined();
	});

	/**
	 * ⚠️ Filo conocido: la cantidad es obligatoria, así que cuando el empate la deja
	 * sin decidir **cae en la columna 0**, que puede ser un ISIN o una fecha. Queda
	 * fijado porque es una decisión con consecuencia visible, no un descuido — el
	 * mapeo se le enseña al usuario para que lo confirme. Si algún día se quita ese
	 * fallback, este test lo verá.
	 */
	it('la cantidad, que es obligatoria, cae en la primera columna si no hay ganador', () => {
		const m = suggestMappingFromAnalysis(
			analyzeColumns(['Fecha', 'Fecha valor'], [['01/02/2026', '03/02/2026']])
		);
		expect(m.shares).toBe(0);
	});

	it('una señal débil no basta: por debajo del umbral no se mapea', () => {
		const m = suggestMappingFromAnalysis(analyzeColumns(['col_a'], [['---'], ['---']]));
		expect(m.isin).toBeUndefined();
		expect(m.currency).toBeUndefined();
	});
});

describe('generateCsvSignature', () => {
	const CABECERAS = ['ISIN', 'Cantidad', 'Fecha'];
	const FILAS = [['IE00B4L5Y983', '10', '01/02/2026']];

	it('dos CSV del mismo bróker dan la misma firma aunque cambien los valores', () => {
		const a = generateCsvSignature(CABECERAS, FILAS);
		const b = generateCsvSignature(CABECERAS, [['LU0908500753', '999', '15/03/2026']]);
		expect(a).toBe(b);
	});

	it('cambiar el número de columnas cambia la firma', () => {
		expect(generateCsvSignature([...CABECERAS, 'Extra'], [[...FILAS[0], 'x']])).not.toBe(
			generateCsvSignature(CABECERAS, FILAS)
		);
	});

	it('cambiar el nombre de una cabecera cambia la firma', () => {
		expect(generateCsvSignature(['ISIN', 'Titulos', 'Fecha'], FILAS)).not.toBe(
			generateCsvSignature(CABECERAS, FILAS)
		);
	});

	/**
	 * La firma lleva el tipo de cada columna —N(úmero), D(fecha), T(exto)—, así que
	 * dos CSV con las mismas cabeceras pero contenido de otra forma no se confunden.
	 */
	it('clasifica cada columna como número, fecha o texto', () => {
		const firma = generateCsvSignature(['a', 'b', 'c'], [['10', '01/02/2026', 'Vanguard']]);
		expect(firma).toContain('_NDT_');
	});

	it('sólo mira las primeras cinco filas', () => {
		const muchas = [
			...Array.from({ length: 5 }, () => ['10']),
			...Array.from({ length: 50 }, () => ['texto'])
		];
		expect(generateCsvSignature(['a'], muchas)).toContain('_N_');
	});
});

/**
 * ⚠️ `parseNumber` con **más de una coma**. Es un caso distinto del que documenta el
 * cuerpo de la función: aquella heurística borrada trataba de la coma *única* («1,835»
 * son 1,835 participaciones y no mil ochocientos treinta y cinco), y sigue siendo así.
 * Con dos comas la lectura europea es imposible, así que son miles americanos — y el
 * `.replace(',', '.')` sin bandera global sustituía solo la primera, dejando el resto
 * dentro para que `parseFloat` cortase ahí.
 */
describe('parseNumber con miles americanos', () => {
	it('lee un número con varias comas como miles, no lo corta en la primera', () => {
		expect(parseNumber('1,234,567')).toBe(1234567);
		expect(parseNumber('12,345,678')).toBe(12345678);
	});

	it('y la coma única sigue siendo decimal europeo', () => {
		// El control que impide reabrir la heurística que se borró por romper tres CSV reales.
		expect(parseNumber('1,835')).toBe(1.835);
		expect(parseNumber('1.234,56')).toBe(1234.56);
		expect(parseNumber('1,234.56')).toBe(1234.56);
	});
});

describe('normalizeText', () => {
	it('quita los acentos, que es lo que las comparaciones de los parsers dan por hecho', () => {
		expect(normalizeText('Suscripción')).toBe('suscripcion');
		expect(normalizeText('APORTACIÓN')).toBe('aportacion');
	});
});

/**
 * El parseo de fechas es una fila por formato, y no por gusto: una fecha mal leída no da
 * error en ninguna parte. `reduceTransactionsToPositions` ordena por fecha antes de aplicar
 * el coste medio, así que barajar el orden hace desaparecer ventas y deja un coste medio
 * que nunca ocurrió.
 */
describe('parseBrokerDate', () => {
	const partes = (d: Date | null) => d && [d.getFullYear(), d.getMonth() + 1, d.getDate()];

	it('lee ISO como año-mes-día', () => {
		// El fallo de `parseDegiroDate`: leía las tres partes como día-mes-año, así que
		// '2024-05-13' salía como día 2024 / mes 5 / año 13.
		expect(partes(parseBrokerDate('2024-05-13'))).toEqual([2024, 5, 13]);
		expect(partes(parseBrokerDate('2026-01-02'))).toEqual([2026, 1, 2]);
	});

	it('lee el formato europeo como día-primero', () => {
		// El fallo de `new Date(str)`: '10/01/2024' salía como 1 de octubre.
		expect(partes(parseBrokerDate('10/01/2024'))).toEqual([2024, 1, 10]);
		expect(partes(parseBrokerDate('27-04-2026'))).toEqual([2026, 4, 27]);
	});

	it('acepta un día mayor que doce, que a `new Date` le parece inválido', () => {
		// `new Date('15/01/2024')` es Invalid Date, y el código lo sustituía por hoy.
		expect(partes(parseBrokerDate('15/01/2024'))).toEqual([2024, 1, 15]);
	});

	it('desambigua a mes-primero sólo cuando el segundo campo no puede ser un mes', () => {
		expect(partes(parseBrokerDate('05/13/2024'))).toEqual([2024, 5, 13]);
	});

	it('completa el año de dos cifras', () => {
		expect(partes(parseBrokerDate('15/01/24'))).toEqual([2024, 1, 15]);
	});

	it('coge la hora del segundo argumento y también la que venga pegada', () => {
		const conArg = parseBrokerDate('15-01-2024', '14:05:30');
		expect([conArg?.getHours(), conArg?.getMinutes(), conArg?.getSeconds()]).toEqual([14, 5, 30]);

		// Trading 212 e IB traen la hora dentro del mismo campo.
		const pegada = parseBrokerDate('2024-01-15 10:30:00');
		expect(partes(pegada)).toEqual([2024, 1, 15]);
		expect(pegada?.getHours()).toBe(10);

		const conComa = parseBrokerDate('2024-01-15, 10:30:00');
		expect(partes(conComa)).toEqual([2024, 1, 15]);
		expect(conComa?.getHours()).toBe(10);
	});

	/**
	 * ⚠️ Devuelve `null`, no «hoy». Sustituir una fecha ilegible por la de hoy era la otra
	 * mitad del defecto: inventaba una fecha plausible que barajaba el orden igual de bien,
	 * y sin dejar rastro. Con `null` el llamante descarta la fila y lo dice.
	 */
	it('devuelve null en vez de inventarse hoy cuando no entiende la fecha', () => {
		expect(parseBrokerDate('')).toBeNull();
		expect(parseBrokerDate('   ')).toBeNull();
		expect(parseBrokerDate('no es una fecha')).toBeNull();
		// 31 de febrero: `new Date(2024, 1, 31)` no falla, desborda al 2 de marzo.
		expect(parseBrokerDate('31/02/2024')).toBeNull();
		expect(parseBrokerDate('15/13/2024')).toBeNull();
	});
});

/**
 * ⚠️ `importe` y `amount` estaban en la lista de cantidad **y** en la de precio, así que
 * una columna de importes competía por los dos roles a la vez.
 */
describe('los roles de cantidad y precio no comparten palabras clave', () => {
	it('«Importe» no le gana el rol de cantidad a «Participaciones»', () => {
		const analisis = analyzeColumns(
			['ISIN', 'Participaciones', 'Importe'],
			[
				['IE00B4L5Y983', '12,5', '1500,00'],
				['IE00B4L5Y983', '30,25', '3600,00'],
				['IE00B4L5Y983', '7,75', '900,00']
			]
		);
		const mapeo = suggestMappingFromAnalysis(analisis);
		expect(mapeo.shares).toBe(1);
		expect(mapeo.avgCost).toBe(2);
	});

	it('y una columna de importes sola no puntúa como cantidad', () => {
		const col = analyzeColumns(['Importe'], [['1500,00'], ['3600,00'], ['900,00']])[0];
		expect(col.roleScores.price).toBeGreaterThan(col.roleScores.quantity);
	});
});

/**
 * Los cinco campos que un informe de aportaciones por lotes dejaba sin mapear, y que
 * obligaban a corregir el mapeo a mano en el modal.
 *
 * La forma del fichero es la que trae un desglose fiscal por lotes: una fila por
 * aportación, con la fecha de la compra **y** la fecha en que se generó el informe, el
 * precio de compra **y** el valor de mercado de hoy. Esa duplicidad de pares es lo que
 * rompía el mapeo: `suggestMappingFromAnalysis` descarta los empates de menos de 0,1
 * devolviendo `-1`, así que cada par empatado dejaba su campo vacío.
 *
 * Y vaciarse no era inocuo en ningún caso: sin `avgCost` el activo entra **con coste 0**
 * —beneficio inventado del 100 % y plusvalía fiscal por el valor íntegro—, y sin `date`
 * las operaciones pierden su fecha, con lo que no hay libro y la reconstrucción del
 * patrimonio no puede ir hacia atrás.
 */
describe('mapeo automático de un informe de aportaciones por lotes', () => {
	const CABECERAS = [
		'isin', 'fondo', 'indice', 'lote', 'fecha_fiscal', 'inversion_eur', 'participaciones',
		'precio_medio_eur', 'valor_mercado_eur', 'resultado_eur', 'rentabilidad_pct',
		'dias_antiguedad', 'vl_valoracion_eur', 'fecha_valoracion'
	];
	const FILAS = [
		['IE00TEST0001', 'Acme Developed World Index Fund Class S Acc EUR', 'MSCI World', '1', '2025-02-10', '1000.00', '100.0000', '10.0000', '1200.00', '200.00', '20.00', '542', '12.000', '2026-08-06'],
		['IE00TEST0001', 'Acme Developed World Index Fund Class S Acc EUR', 'MSCI World', '2', '2025-04-30', '500.00', '45.0000', '11.1111', '540.00', '40.00', '8.00', '463', '12.000', '2026-08-06'],
		['IE00TEST0001', 'Acme Developed World Index Fund Class S Acc EUR', 'MSCI World', '3', '2025-07-02', '250.00', '21.0000', '11.9047', '252.00', '2.00', '0.80', '400', '12.000', '2026-08-06'],
		['IE00TEST0002', 'Acme Emerging Markets Index Fund Class S Acc EUR', 'MSCI EM', '1', '2026-04-15', '300.00', '25.0000', '12.0000', '310.00', '10.00', '3.33', '117', '12.400', '2026-08-06']
	];

	const mapeo = () => suggestMappingFromAnalysis(analyzeColumns(CABECERAS, FILAS));
	const idx = (cabecera: string) => CABECERAS.indexOf(cabecera);

	it('mapea los cinco campos que decidían el resultado', () => {
		const m = mapeo();
		expect(m.shares).toBe(idx('participaciones'));
		expect(m.isin).toBe(idx('isin'));
		expect(m.name).toBe(idx('fondo'));
		expect(m.avgCost).toBe(idx('precio_medio_eur'));
		expect(m.date).toBe(idx('fecha_fiscal'));
	});

	/**
	 * El rol `price` de este importador significa **coste de adquisición**, no «cuánto vale
	 * hoy»: se escribe en `avgCost`. Con `valor` en la lista de sinónimos, la valoración
	 * empataba con el precio de compra y ganaba el empate nadie.
	 */
	it('el precio de compra gana a la valoración de hoy, y no empatan', () => {
		const analisis = analyzeColumns(CABECERAS, FILAS);
		const compra = analisis[idx('precio_medio_eur')].roleScores.price;
		const mercado = analisis[idx('valor_mercado_eur')].roleScores.price;
		const liquidativo = analisis[idx('vl_valoracion_eur')].roleScores.price;

		expect(compra).toBeGreaterThan(mercado + 0.1);
		expect(compra).toBeGreaterThan(liquidativo + 0.1);
	});

	/**
	 * ⚠️ El nombre del fondo acaba en «Class S Acc EUR» y `normalizeCurrency` busca `EUR`
	 * *dentro* del texto —lo necesita para entender «Dólares USD»—, así que la columna del
	 * nombre se mapeaba como divisa. Misma familia que el defecto ya documentado en esa
	 * función: un detector demasiado generoso no informa de nada.
	 */
	it('un nombre de fondo que acaba en EUR no es una columna de divisa', () => {
		const col = analyzeColumns(CABECERAS, FILAS)[idx('fondo')];
		expect(col.roleScores.currency).toBe(0);
		expect(mapeo().currency).not.toBe(idx('fondo'));
	});

	it('el índice de referencia no se confunde con el nombre del activo', () => {
		const analisis = analyzeColumns(CABECERAS, FILAS);
		expect(analisis[idx('fondo')].roleScores.name).toBeGreaterThan(
			analisis[idx('indice')].roleScores.name + 0.1
		);
	});

	/**
	 * ⚠️ El test de arriba **no aisla** la penalización del índice: con `fondo` en la lista
	 * de cabeceras conocidas su ventaja ya es de medio punto, así que pasa igual sin ella
	 * —comprobado revirtiéndola—. Lo que la penalización decide de verdad es este otro
	 * caso: la columna del nombre tiene una cabecera que el detector no conoce, así que
	 * ambas puntúan sólo por su contenido, empatan, y el empate deja el nombre **sin
	 * mapear**. Dos fondos distintos pueden seguir el mismo índice, así que mapearlo como
	 * nombre fusiona posiciones que no son la misma.
	 */
	it('con una cabecera desconocida, el índice sigue sin ganar el rol de nombre', () => {
		const analisis = analyzeColumns(
			['referencia_interna', 'indice'],
			[
				['Acme Developed World Index Fund Class S', 'MSCI World'],
				['Acme Emerging Markets Index Fund Class S', 'MSCI EM'],
				['Acme Global Bond Index Fund Class S', 'Bloomberg Global']
			]
		);

		expect(analisis[0].roleScores.name).toBeGreaterThan(analisis[1].roleScores.name + 0.1);
		expect(suggestMappingFromAnalysis(analisis).name).toBe(0);
	});

	/**
	 * El desempate que no depende del idioma ni del nombre de la columna: la fecha del
	 * informe es la misma en todas las filas, la de la compra cambia en cada lote.
	 */
	it('una columna de fechas con un solo valor distinto no es la fecha de la operación', () => {
		const analisis = analyzeColumns(CABECERAS, FILAS);
		expect(analisis[idx('fecha_fiscal')].roleScores.date).toBeGreaterThan(
			analisis[idx('fecha_valoracion')].roleScores.date + 0.1
		);
	});

	it('el desempate por variabilidad funciona sin ayuda de la cabecera', () => {
		// Dos columnas llamadas igual de bien, una constante y otra no.
		const analisis = analyzeColumns(
			['fecha_a', 'fecha_b'],
			[
				['2025-01-10', '2026-08-06'],
				['2025-05-20', '2026-08-06'],
				['2025-09-30', '2026-08-06']
			]
		);
		expect(analisis[0].roleScores.date).toBeGreaterThan(analisis[1].roleScores.date);
	});

	it('los porcentajes, los días y el número de lote no compiten por ser la cantidad', () => {
		const analisis = analyzeColumns(CABECERAS, FILAS);
		const participaciones = analisis[idx('participaciones')].roleScores.quantity;

		for (const cabecera of ['rentabilidad_pct', 'dias_antiguedad', 'lote', 'resultado_eur']) {
			expect(analisis[idx(cabecera)].roleScores.quantity).toBeLessThan(participaciones);
		}
	});

	/**
	 * ⚠️ **El test de arriba no puede fallar** —comprobado revirtiendo la penalización— porque
	 * `participaciones` ya gana medio punto por su cabecera. Lo que esa penalización decide
	 * es el caso en que la columna de títulos **no** tiene una cabecera reconocible: entonces
	 * empata con la de días o de porcentaje, y el empate no deja el campo vacío como en los
	 * demás roles, porque la cantidad es obligatoria y `suggestMappingFromAnalysis` cae a
	 * `shares: 0` — **la primera columna del fichero, que suele ser el ISIN**. Es decir, la
	 * cartera se llevaría un código alfanumérico donde van los títulos.
	 */
	it('sin cabecera reconocible, la columna numérica gana a la de días y no cae al ISIN', () => {
		const analisis = analyzeColumns(
			['isin', 'saldo', 'dias_antiguedad'],
			[
				['IE00TEST0001', '166.5998', '542'],
				['IE00TEST0002', '45.0404', '117'],
				['IE00TEST0003', '12.3456', '80']
			]
		);

		expect(analisis[1].roleScores.quantity).toBeGreaterThan(analisis[2].roleScores.quantity + 0.1);
		// Y lo que de verdad importa: `shares` no acaba apuntando a la columna 0.
		expect(suggestMappingFromAnalysis(analisis).shares).toBe(1);
	});
});
