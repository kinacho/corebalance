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
	normalizeCurrency,
	looksLikeIsinValue,
	looksLikeTickerValue,
	looksLikeNumericValue,
	looksLikeDateValue
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

	it('vacío es null, y lo desconocido se devuelve en mayúsculas', () => {
		expect(normalizeCurrency('')).toBeNull();
		expect(normalizeCurrency('   ')).toBeNull();
		expect(normalizeCurrency('rublos')).toBe('RUBLOS');
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
});

describe('createSkipRow', () => {
	it('cuenta las filas omitidas y guarda por qué', () => {
		const { skipRow, skipped, skippedDetails } = createSkipRow();
		expect(skipped).toBe(0);

		skipRow(4, ['', 'VWCE', '', 'sin precio', 'x'], 'falta el precio');

		expect(skippedDetails).toHaveLength(1);
		// La fila se numera para un humano, que cuenta desde uno.
		expect(skippedDetails[0].rowNumber).toBe(5);
		expect(skippedDetails[0].reason).toBe('falta el precio');
		// La vista previa son las tres primeras celdas con contenido.
		expect(skippedDetails[0].preview).toBe('VWCE | sin precio | x');
	});

	it('el contador es una vista viva, no una copia congelada', () => {
		// Se desestructura al principio del parser y se lee al final; si fuera una copia,
		// el informe diría siempre cero filas omitidas.
		const contador = createSkipRow();
		contador.skipRow(0, ['a'], 'r1');
		contador.skipRow(1, ['b'], 'r2');
		expect(contador.skipped).toBe(2);
	});
});
