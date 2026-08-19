import type { InstrumentType } from './types';

/**
 * El icono que acompaña a cada activo por toda la app.
 *
 * ⚠️ **Vive fuera de `utils.ts` porque decide algo**, igual que `asset-label.ts`: qué
 * clase de cosa es un activo mirando su nombre, su ticker y lo que la app ya dedujo de
 * él. Estaba escrito como una escalera de `includes()` sin un solo test, y fallaba en
 * los dos sitios donde más se nota.
 *
 * ⚠️ **Los nombres de fondo vienen abreviados, y esa es la causa raíz.** Yahoo y FT
 * sirven «iShares Dev Wld Idx (IE) S Acc EUR», no «iShares Developed World Index»: como
 * `WLD` no contiene `WORLD`, ninguna regla geográfica casaba y el activo caía hasta la
 * última red —«es un fondo»— que devolvía un escudo. Un escudo no dice nada de un
 * indexado global; el usuario lo leyó como «defensivo», que es exactamente lo que no
 * es. Medido el 19-ago-2026 en una cartera real: **cuatro de cinco activos con el icono
 * equivocado**, dos de ellos con escudo.
 *
 * ⚠️ **`indexKey` va antes que el nombre y es la señal más fiable que hay.** La app ya
 * resuelve qué índice replica un fondo —y el importador de CSV lo trae de la columna
 * «índice» del propio bróker, y el usuario puede corregirlo a mano—, así que preguntarle
 * al nombre pudiendo preguntarle al índice era tirar el dato mejor. En esa misma cartera
 * los dos fondos del escudo ya traían `msci-world` y `msci-emerging` guardados.
 *
 * ⚠️ **No hay banderas, y no es una decisión estética.** Chrome en Windows no dibuja los
 * emoji de bandera: los pinta como sus dos letras indicadoras. Medido en el navegador del
 * autor sobre la app en producción — `🇺🇸` mide 30,7 px y `🇪🇸` 26,9 contra los 43,9 de
 * cualquier emoji de verdad, o sea dos glifos de texto estrechos donde el resto de la
 * columna tiene un icono. La familia de globos (`🌐` global, `🌎` América, `🌍` Europa,
 * `🌏` Asia y emergentes) dice lo mismo, se dibuja en todas partes y no obliga a elegir
 * un tópico nacional por país.
 */

/** Lo que se devuelve cuando no se sabe nada más: una posición, sin adjetivos. */
export const ICONO_GENERICO = '📈';

/** Contexto que la app ya ha deducido del activo. Todo opcional: hay llamadas —el
 *  buscador, el importador— que solo tienen el nombre y el tipo que dice Yahoo. */
export interface ContextoIcono {
	indexKey?: string;
	instrumentType?: InstrumentType;
	manualInterestRate?: number;
}

/**
 * Un icono por índice replicado. Las claves son las de `indices.json`; una clave nueva
 * sin entrada aquí no rompe nada, simplemente sigue camino hacia las reglas del nombre.
 *
 * `msci-world-small` comparte globo con `msci-world` a propósito: es la misma región con
 * otro tamaño de empresa, y el icono responde «de qué es esto», no «cuál de los dos es».
 * Para distinguirlos está el nombre, que va justo al lado.
 */
const ICONO_POR_INDICE: Record<string, string> = {
	'msci-world': '🌐',
	'ftse-all-world': '🌐',
	'msci-world-small': '🌐',
	sp500: '🌎',
	'nasdaq-100': '💻',
	'msci-emerging': '🌏',
	'msci-japan': '🌏',
	'msci-europe': '🌍',
	'ibex-35': '🌍',
	'global-agg-bond': '🧾',
	'euro-govt-bond': '🧾'
};

/**
 * Mayúsculas, sin acentos y con todo lo que no sea letra o número convertido en espacio.
 *
 * Lo segundo es lo que permite buscar por palabra entera: `S&P 500` y `R/C(EUR)` pasan a
 * ser `S P 500` y `R C EUR`, así que un ticker `BTC-EUR` deja el token `BTC` suelto.
 */
function normalizar(texto: string): string {
	return ` ${(texto || '')
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Z0-9]+/g, ' ')
		.trim()} `;
}

/**
 * ¿Aparece alguna de estas palabras **enteras**?
 *
 * ⚠️ **La versión anterior usaba `includes()` a pelo y eso trae falsos positivos que no
 * se ven venir**: `ETH` casa dentro de `NETHERLANDS`, `SOL` dentro de `SOLVAY`, `TECH`
 * dentro de `BIOTECH` y `ORO` dentro de `TESORO`. Todos ellos están fijados como tests.
 * Los términos de varias palabras (`ALL WORLD`, `HIGH YIELD`) se buscan igual, porque el
 * texto ya viene con espacios simples.
 */
function tiene(texto: string, ...terminos: string[]): boolean {
	return terminos.some((termino) => texto.includes(normalizar(termino)));
}

/** Las empresas cuyo icono aporta algo. Todo lo demás es una posición: `📈`. */
const ICONO_POR_EMPRESA: [string[], string][] = [
	[['AAPL', 'APPLE'], '🍎'],
	[['MSFT', 'MICROSOFT'], '💻'],
	[['GOOG', 'GOOGL', 'ALPHABET', 'GOOGLE'], '🔍'],
	[['AMZN', 'AMAZON'], '📦'],
	[['TSLA', 'TESLA'], '🚗'],
	[['NVDA', 'NVIDIA'], '🎮'],
	[['META', 'FACEBOOK'], '👥'],
	[['NFLX', 'NETFLIX'], '🎬']
];

/**
 * El icono de un activo.
 *
 * El orden de las preguntas es el contrato de esta función, y va **de la clase de activo
 * hacia la geografía**: qué es (efectivo, cripto, oro, renta fija, ladrillo) manda sobre
 * dónde invierte, porque es lo que cambia la naturaleza de la posición. Un fondo de deuda
 * pública europea es renta fija antes que europeo.
 */
export function resolveAssetIcon(
	ticker: string = '',
	name: string = '',
	type: string = '',
	contexto: ContextoIcono = {}
): string {
	const t = normalizar(ticker);
	const n = normalizar(name);
	const ty = normalizar(type);
	const tn = `${t}${n}`;
	const tipo = contexto.instrumentType;

	// 1. Efectivo y cuentas remuneradas. `manualInterestRate` es la marca que pone la
	//    propia app cuando el usuario crea un depósito a mano, así que manda sobre todo
	//    lo demás: no hay nombre que la contradiga.
	if (
		tipo === 'cash' ||
		contexto.manualInterestRate !== undefined ||
		t.startsWith(' CASH ') ||
		tiene(ty, 'CASH', 'CURRENCY') ||
		tiene(n, 'CASH', 'EFECTIVO', 'REMUNERADA', 'MONETARIO', 'MONETARY', 'MONEY MARKET', 'DEPOSITO', 'DEPOSIT', 'LIQUIDEZ')
	) {
		return '🏦';
	}

	// 2. Criptoactivos. Van pronto porque un ETP de bitcoin es antes bitcoin que ETP.
	if (tiene(tn, 'BTC', 'BITCOIN', 'XBT')) return '₿';
	if (tiene(tn, 'ETH', 'ETHEREUM')) return 'Ξ';
	if (
		tiene(ty, 'CRYPTO', 'CRYPTOCURRENCY') ||
		tiene(tn, 'CRIPTO', 'CRYPTO', 'SOLANA', 'CARDANO', 'POLKADOT', 'TETHER', 'USDT', 'RIPPLE', 'XRP', 'LITECOIN')
	) {
		return '🪙';
	}

	// 3. Metales y materias primas.
	if (tiene(tn, 'GOLD', 'ORO', 'XAU', 'GLD', 'IAU', 'BULLION', 'LINGOTE')) return '🥇';
	if (tiene(tn, 'SILVER', 'PLATA', 'XAG', 'COMMODITY', 'COMMODITIES', 'MATERIAS PRIMAS')) return '⛏️';

	// 4. Renta fija. La lista incluye las formas abreviadas que sirven los proveedores
	//    (`GOVT`, `ULTR SHRT`) porque son las que llegan de verdad.
	if (
		tiene(n, 'BOND', 'BONDS', 'BONOS', 'TREASURY', 'RENTA FIJA', 'GOVERNMENT', 'GOVT', 'GILT', 'OBLIGACIONES', 'AGGREGATE', 'CORPORATE', 'CREDIT', 'CREDITO', 'HIGH YIELD', 'DEUDA', 'LETRAS', 'DURATION', 'ULTRA SHORT', 'ULTR SHRT', 'SHORT TERM', 'FIXED INCOME')
	) {
		return '🧾';
	}

	// 5. Ladrillo.
	if (tiene(n, 'REIT', 'REITS', 'REAL ESTATE', 'INMOBILIARIO', 'PROPERTY', 'VIVIENDA')) return '🏢';

	// 6. Sectoriales y temáticos: para un fondo de un sector, el sector dice más que la
	//    región. Aquí es donde el escudo tiene su único sitio honesto.
	if (tiene(n, 'DEFENCE', 'DEFENSE', 'DEFENSA', 'AEROSPACE', 'AEROESPACIAL')) return '🛡️';
	/**
	 * ⚠️ Buscar por palabra entera obliga a **listar las variantes**, y aquí está el
	 * ejemplo: `BIOTECHNOLOGY` no contiene la palabra `BIOTECH`. Sin ella, «iShares
	 * Nasdaq Biotechnology» caía en la regla de tecnología por el `NASDAQ` del nombre.
	 * Lo cazó su test, no la revisión.
	 */
	if (tiene(n, 'HEALTH', 'HEALTHCARE', 'SALUD', 'BIOTECH', 'BIOTECHNOLOGY', 'BIOTECNOLOGIA', 'PHARMA', 'PHARMACEUTICAL', 'PHARMACEUTICALS', 'FARMA')) return '🏥';
	if (tiene(n, 'WATER', 'AGUA')) return '💧';
	if (tiene(n, 'ENERGY', 'ENERGIA', 'SOLAR', 'OIL', 'PETROLEO', 'UTILITIES')) return '⚡';
	if (tiene(n, 'DIVIDEND', 'DIVIDENDO', 'DIVIDENDOS', 'INCOME')) return '💰';
	if (
		tiene(n, 'NASDAQ', 'TECH', 'TECHNOLOGY', 'TECNOLOGIA', 'INFORMATION TECHNOLOGY', 'SEMICONDUCTOR', 'SEMICONDUCTORS', 'SOFTWARE', 'ROBOTICS', 'ROBOTICA') ||
		tiene(t, 'QQQ')
	) {
		return '💻';
	}

	// 7. El índice que replica, cuando se sabe: la señal más fiable de todas.
	const porIndice = contexto.indexKey ? ICONO_POR_INDICE[contexto.indexKey] : undefined;
	if (porIndice) return porIndice;

	// 8. Geografía por el nombre, con las abreviaturas incluidas.
	if (tiene(n, 'WORLD', 'WLD', 'GLOBAL', 'ACWI', 'MUNDIAL', 'MUNDO') || tiene(t, 'IWDA', 'VWCE', 'VWRA', 'VWRL')) return '🌐';
	if (tiene(n, 'EMERGING', 'EMERGENTES', 'EMERGMKTS', 'EM IMI', 'ASIA', 'CHINA', 'JAPAN', 'JAPON', 'NIKKEI', 'PACIFIC', 'PACIFICO', 'INDIA', 'KOREA') || tiene(t, 'EMIM', 'EIMI')) return '🌏';
	if (tiene(n, 'S P 500', 'SP500', 'USA', 'US', 'EEUU', 'UNITED STATES', 'AMERICA', 'AMERICAN', 'NORTEAMERICA', 'RUSSELL') || tiene(t, 'SPY', 'VOO', 'CSPX', 'SXR8')) return '🌎';
	if (tiene(n, 'EUROPE', 'EUROPA', 'EUROPEAN', 'STOXX', 'DAX', 'CAC', 'IBEX', 'ESPANA', 'SPAIN', 'FTSE 100', 'UK', 'UNITED KINGDOM', 'EMU', 'EUROZONE')) return '🌍';

	// 9. Última red: lo que sea, según su tipo. **Nunca un escudo**: que algo sea un
	//    fondo no lo hace defensivo, y ese error es el que trajo a esta función aquí.
	if (tipo === 'equity' || tiene(ty, 'EQUITY', 'STOCK', 'EQUITIES')) {
		for (const [claves, icono] of ICONO_POR_EMPRESA) {
			if (tiene(tn, ...claves)) return icono;
		}
		return ICONO_GENERICO;
	}
	if (tipo === 'fund' || tipo === 'etf' || tiene(ty, 'ETF', 'FUND', 'MUTUALFUND', 'MUTUAL') || tiene(n, 'ETF', 'FONDO', 'INDEX', 'IDX', 'INDICE')) {
		return '📊';
	}

	for (const [claves, icono] of ICONO_POR_EMPRESA) {
		if (tiene(tn, ...claves)) return icono;
	}
	return ICONO_GENERICO;
}
