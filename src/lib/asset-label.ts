/**
 * Cómo se rotula un activo cuando el sitio es el que es.
 *
 * El mapa de desviación escribía el **ticker**, y para un fondo el ticker es su
 * ISIN o el código `0P…` con el que lo identifica Yahoo: `IE00B4L5Y983` no dice
 * nada. El nombre sí, pero el nombre completo no cabe en una celda de treemap, y
 * truncarlo a pelo reproduce exactamente el defecto que se documenta en
 * `CLAUDE.md` sobre las leyendas de los donuts: **`iShares Core MSCI World` y
 * `iShares Core MSCI EM IMI` comparten los primeros 18 caracteres**, así que las
 * dos se truncan a `iShares Core MS…` y el rótulo deja de identificar nada. Lo
 * que distingue a dos fondos de la misma gestora está al **final** del nombre,
 * que es justo lo que corta el truncado.
 *
 * De ahí la forma de esto: no devuelve *un* rótulo, devuelve una **lista de
 * candidatos de más largo a más corto**, y quien dibuja escoge el primero que
 * cabe. Así el nombre completo se ve donde hay sitio —una celda grande, el mapa
 * ampliado— y solo se recorta información donde de verdad no cabe, en el orden en
 * que menos cuesta perderla:
 *
 * 1. el nombre tal cual;
 * 2. sin la fontanería que llevan todos los fondos (`UCITS`, `ETF`, la clase
 *    entre paréntesis, la divisa de la clase, `Inc`/`plc`…), que es texto que no
 *    distingue un fondo de otro porque lo llevan los dos;
 * 3. sin la gestora, que es lo que provoca la colisión de prefijo.
 *
 * El nombre completo sigue estando en el tooltip, así que nada de esto pierde
 * información de verdad — salvo en móvil, donde no hay tooltip, y por eso el
 * orden importa.
 */

/** Gestoras que se quitan del principio. El nombre del índice es lo que informa. */
const GESTORAS = [
	'baillie gifford',
	'goldman sachs',
	'janus henderson',
	'legal & general',
	'morgan stanley',
	'state street',
	'j.p. morgan',
	'jpmorgan',
	'indexa capital',
	'franklin templeton',
	'myinvestor',
	'xtrackers',
	'blackrock',
	'carmignac',
	'fundsmith',
	'bankinter',
	'caixabank',
	'santander',
	'bestinver',
	'magallanes',
	'mutuactivos',
	'kutxabank',
	'templeton',
	'candriam',
	'vontobel',
	'aberdeen',
	'ishares',
	'vanguard',
	'fidelity',
	'invesco',
	'seilern',
	'openbank',
	'ibercaja',
	'numantia',
	'eurizon',
	'groupama',
	'comgest',
	'metavalor',
	'schwab',
	'amundi',
	'robeco',
	'nordea',
	'pictet',
	'sextant',
	'allianz',
	'azvalor',
	'abante',
	'renta 4',
	'lyxor',
	'spdr',
	'horos',
	'cobas',
	'pimco',
	'abrdn',
	'dws',
	'ubs',
	'hsbc',
	'axa',
	'gam',
	'm&g'
];

/**
 * Palabras que llevan (casi) todos los productos y que por tanto no distinguen a
 * ninguno. `cap` **no** está y no puede estar: se comería el «Small Cap», que sí
 * distingue.
 */
const FONTANERIA = new Set([
	'ucits',
	'etf',
	'etc',
	'etp',
	'fund',
	'funds',
	'fondo',
	'fondos',
	'sicav',
	'fi',
	'inversion',
	'index',
	'indexado',
	'indexada',
	'indice',
	'índice',
	'acc',
	'dist',
	'accumulating',
	'distributing',
	'class',
	'clase',
	'inc',
	'corp',
	'corporation',
	'company',
	'plc',
	'ltd',
	'limited',
	'sa',
	'nv',
	'ag',
	'spa',
	'eur',
	'usd',
	'gbp',
	'gbx',
	'chf',
	'jpy',
	'sek',
	'nok',
	'dkk'
]);

/**
 * Palabras de **familia**: la gama del producto y el proveedor del índice.
 *
 * ⚠️ Este paso existe porque el test lo exigió: quitando solo la gestora,
 * `iShares Core MSCI World` e `iShares Core MSCI EM IMI` se quedan en `Core MSCI
 * World` y `Core MSCI EM IMI`, **que siguen compartiendo nueve caracteres**, así
 * que en una celda estrecha se truncan las dos a «Core MSCI…» y el rótulo vuelve a
 * no identificar nada. Lo que distingue a esos dos fondos es lo que va después.
 *
 * Se quitan **de una en una y por la izquierda**, y cada paso es un candidato: así
 * se pierde lo menos posible según lo que quepa. `ESG`, `Value`, `Small` y
 * compañía no están y no pueden estar — ésas sí distinguen dos fondos del mismo
 * índice.
 */
const FAMILIA = new Set([
	'core',
	'prime',
	'msci',
	'ftse',
	'stoxx',
	'solactive',
	'bloomberg',
	'refinitiv'
]);

/**
 * Se quitan si quedan al principio o al final, nunca en medio: «Bank **of**
 * America» tiene que sobrevivir, y «**de** Inversión» no.
 */
const NEXOS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'of', 'the', 'y', 'and', '-', '·']);

/**
 * Sin acentos y en minúsculas, solo para comparar.
 *
 * Los diacríticos se quitan con `\p{Diacritic}` y no con un rango de caracteres
 * combinantes escrito literalmente: esos caracteres son **invisibles en el
 * editor** y los pierde cualquier herramienta que reguarde el fichero con otra
 * codificación — que es exactamente el tropiezo con `Set-Content` documentado en
 * `CLAUDE.md`. Una expresión que no se puede leer no se puede revisar.
 */
function normaliza(texto: string): string {
	return texto
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

function limpiaToken(token: string): string {
	return normaliza(token).replace(/[.,;:()]/g, '');
}

function recortaNexos(tokens: string[]): string[] {
	let inicio = 0;
	let fin = tokens.length;
	while (inicio < fin && NEXOS.has(limpiaToken(tokens[inicio]))) inicio += 1;
	while (fin > inicio && NEXOS.has(limpiaToken(tokens[fin - 1]))) fin -= 1;
	return tokens.slice(inicio, fin);
}

/** El nombre sin paréntesis, sin fontanería y sin nexos sueltos en los bordes. */
function sinFontaneria(nombre: string): string {
	// Los paréntesis de un nombre de fondo son siempre la clase o la divisa:
	// «(Acc)», «(EUR Hedged)», «(Clase S)».
	const sinParentesis = nombre.replace(/\([^)]*\)/g, ' ');
	const tokens = sinParentesis.split(/\s+/).filter(Boolean);
	const utiles = tokens.filter((t) => {
		const limpio = limpiaToken(t);
		if (!limpio) return false;
		if (FONTANERIA.has(limpio)) return false;
		// Una letra suelta es una clase de participación («Clase S», «MSCI World A»).
		if (/^[a-z]$/.test(limpio)) return false;
		return true;
	});
	return recortaNexos(utiles).join(' ');
}

/**
 * El nombre sin la gestora del principio.
 *
 * ⚠️ Solo si lo que queda sigue identificando algo: «Fundsmith Equity Fund» sin
 * la gestora es «Equity», que no dice qué fondo es. El umbral —dos palabras, u
 * ocho caracteres— es lo que separa «MSCI World» (sirve) de «Equity» (no).
 */
function sinGestora(nombre: string): string {
	const base = normaliza(nombre);
	for (const gestora of GESTORAS) {
		if (!base.startsWith(gestora + ' ')) continue;
		const resto = recortaNexos(nombre.slice(gestora.length).trim().split(/\s+/)).join(' ');
		const palabras = resto.split(/\s+/).filter(Boolean).length;
		if (palabras >= 2 || resto.length >= 8) return resto;
		return nombre;
	}
	return nombre;
}

/**
 * Rótulos posibles para un activo, **de más largo a más corto**, sin repetidos y
 * sin vacíos. Quien dibuja escoge el primero que quepa; el último es el más corto
 * que esta función sabe dar, y es el que se trunca si no cabe ninguno.
 *
 * Siempre devuelve al menos un elemento: sin nombre, el ticker.
 */
export function assetLabelCandidates(asset: { name?: string; ticker: string }): string[] {
	const nombre = (asset.name ?? '').trim().replace(/\s+/g, ' ');
	if (!nombre) return [asset.ticker];

	const limpio = sinFontaneria(nombre);
	const corto = limpio ? sinGestora(limpio) : '';

	const candidatos = [nombre, limpio, corto].filter(Boolean);

	// Y a partir del más corto, una palabra de familia menos por candidato, hasta
	// que lo que queda ya distingue por sí solo. Nunca hasta dejarlo vacío.
	let tokens = (corto || limpio || nombre).split(/\s+/).filter(Boolean);
	while (tokens.length > 1 && FAMILIA.has(limpiaToken(tokens[0]))) {
		tokens = tokens.slice(1);
		candidatos.push(tokens.join(' '));
	}

	return [...new Set(candidatos)];
}

/** El más corto de los candidatos: el que se trunca cuando no cabe ninguno. */
export function shortestAssetLabel(asset: { name?: string; ticker: string }): string {
	const candidatos = assetLabelCandidates(asset);
	return candidatos[candidatos.length - 1];
}

/**
 * Un ticker que **no identifica nada** para quien lo lee: un ISIN de doce caracteres
 * o el código `0P…` con el que Yahoo nombra los fondos no cotizados.
 *
 * La misma pareja de señales que usa `resolveInstrumentType()`, aquí con otra
 * pregunta: allí deciden *qué es* el instrumento, y aquí si su ticker **se puede
 * enseñar**. Se repite el patrón en vez de importarlo porque son dos decisiones
 * distintas que coinciden hoy en las señales; unirlas ataría el rótulo a la
 * clasificación fiscal, y esa sí que cambia.
 */
function tickerMudo(ticker: string): boolean {
	const t = (ticker || '').toUpperCase().trim();
	// ⚠️ El sufijo de mercado es obligatorio contemplarlo: el ticker real de un fondo es
	// `0P0001XF40.F`, no `0P0001XF40`. Escribir el regex sin él —que es lo que hay hoy en
	// `resolveInstrumentType`— deja la señal sin dispararse nunca en producción, y sus
	// tests no lo ven porque todos usan la forma corta, que Yahoo no devuelve.
	return /^0P[A-Z0-9]{6,}(\.[A-Z]{1,4})?$/.test(t) || /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(t);
}

/**
 * El rótulo corto de un activo **donde el sitio es estrecho pero no se trunca**: una
 * leyenda, un chip, una fila.
 *
 * ⚠️ No es `shortestAssetLabel()`, y confundirlos empeora las cosas en vez de
 * arreglarlas. Aquel devuelve el candidato **más corto** porque está pensado para que
 * quepa en una celda de treemap: para `IWDA.AS` da «World», que es *menos* preciso que
 * el ticker para quien indexa, y dos fondos World distintos darían los dos «World».
 *
 * Un ticker de verdad es el mejor rótulo corto que hay: es corto, es exacto y es como
 * el usuario llama a su posición. El problema es solo el ticker que no dice nada —para
 * un fondo, el ticker *es* su ISIN o su código `0P…`—, y ahí sí vale más un trozo de
 * nombre que `IE00B4L5Y983`. Así que se prefiere el ticker y solo se cae al nombre
 * cuando el ticker no informa.
 */
export function tickerLabel(asset: { name?: string; ticker: string }): string {
	if (!tickerMudo(asset.ticker)) return asset.ticker;
	const porNombre = shortestAssetLabel(asset);
	return porNombre === asset.ticker ? asset.ticker : porNombre;
}
