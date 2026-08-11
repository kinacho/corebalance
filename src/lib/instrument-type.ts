import type { Asset, InstrumentType } from './types';

/**
 * Deduce qué es un activo: fondo, ETF, acción o efectivo.
 *
 * Existe porque de ahí cuelga todo el cálculo fiscal. En España solo los fondos
 * de inversión pueden traspasarse sin tributar (art. 94 LIRPF); un ETF que
 * replica el mismo índice no puede. Equivocarse aquí no es un icono mal puesto,
 * es proponerle al usuario un movimiento que le genera una factura fiscal que no
 * esperaba, así que ante la duda esto devuelve `other` y la app no propone nada.
 *
 * El orden de las señales va de la más fiable a la más frágil:
 *   1. El tipo que da Yahoo en la búsqueda (`MUTUALFUND` / `ETF` / `EQUITY`).
 *   2. El ticker `0P…`, que es como Yahoo identifica los fondos no cotizados.
 *   3. El nombre, que es donde vive la palabra «ETF».
 *   4. El ISIN, que solo dice el país de emisión y por tanto **no** distingue
 *      fondo de ETF: IE00 y LU vale para los dos. Se usa únicamente para
 *      descartar que sea una acción suelta.
 */
export function resolveInstrumentType(
	ticker: string = '',
	name: string = '',
	yahooType: string = '',
	isin: string = ''
): InstrumentType {
	const t = (ticker || '').toUpperCase().trim();
	const n = (name || '').toUpperCase();
	const ty = (yahooType || '').toUpperCase();
	const id = (isin || '').toUpperCase().trim();

	// Efectivo y cuentas remuneradas: sintéticos, no cotizan y no tributan al mover.
	if (t.startsWith('CASH-') || t === 'CASH' || ty === 'CASH') return 'cash';
	if (n.includes('REMUNERADA') || n.includes('EFECTIVO') || n.includes('DEPÓSITO') || n.includes('DEPOSITO')) {
		return 'cash';
	}

	// Cripto, divisas, índices y futuros: fuera del régimen de traspaso y con
	// fiscalidad propia que esta app no modela. `other` = no proponer nada.
	if (ty.includes('CRYPTO') || ty === 'CURRENCY' || ty === 'INDEX' || ty === 'FUTURE') return 'other';
	if (t.endsWith('-USD') || t.endsWith('-EUR') || t.includes('=X')) return 'other';

	// 1. Yahoo. `MUTUALFUND` es la señal más limpia que existe para «fondo».
	if (ty.includes('MUTUALFUND') || ty === 'FUND') return 'fund';
	if (ty.includes('ETF')) return 'etf';
	if (ty.includes('EQUITY') || ty.includes('STOCK')) return 'equity';

	// 2. Los fondos no cotizados llegan de Yahoo con ticker `0P0000XXXX`.
	//
	// ⚠️ Con **sufijo de mercado**, y eso no es un detalle: el ticker real es
	// `0P0001XF40.F`, no `0P0001XF40`. Sin contemplarlo, esta señal —la única que
	// reconoce un fondo cuando Yahoo no manda su tipo— no se disparaba nunca en
	// producción, y los ocho tests que la cubrían usaban todos la forma corta, que
	// Yahoo no devuelve. Un test que fija una forma que no ocurre.
	//
	// Lo que costaba: un fondo real caía a `other` con ISIN (y `other` queda fuera de
	// todo plan de traspaso) o a `equity` sin él, que además le aplica la ventana de
	// antiaplicación de 2 meses en vez de la de 12 que le toca por no cotizar.
	if (/^0P[A-Z0-9]{6,}(\.[A-Z]{1,4})?$/.test(t)) return 'fund';

	// 3. El nombre. «ETF» en el nombre es concluyente; «FONDO» o el sufijo de
	// clase de participación (`FR`, `ACC`) apuntan a fondo pero son más débiles,
	// así que solo cuentan si además el ISIN es de vehículo colectivo.
	if (n.includes('ETF') || n.includes('EXCHANGE TRADED')) return 'etf';

	const isCollectiveIsin = /^(IE|LU|ES0|FR00|AT0|DE000[A-Z])/.test(id);
	if (n.includes('FONDO') || n.includes('INDEX FUND') || n.includes('FONDO INDEXADO')) return 'fund';
	if (isCollectiveIsin && (n.includes('INDEX') || n.includes('INDEXADO') || n.includes('INDEXA'))) return 'fund';

	// 4. Con ISIN de acción y nada más que diga lo contrario, es una acción.
	if (id && !isCollectiveIsin && /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(id)) return 'equity';

	// Un ticker con sufijo de mercado y sin ninguna señal de vehículo colectivo
	// es casi siempre una acción cotizada.
	if (/\.[A-Z]{1,3}$/.test(t) && !isCollectiveIsin) return 'equity';

	return 'other';
}

/**
 * El tipo de instrumento de un activo, deducido si no está guardado.
 *
 * Único punto de lectura: `asset.instrumentType` es opcional porque las carteras
 * anteriores a este campo no lo traen, y leerlo suelto daría `undefined` justo
 * en las carteras más antiguas, que son las que más falta les hace.
 */
export function instrumentTypeOf(asset: Asset): InstrumentType {
	if (asset.instrumentType) return asset.instrumentType;
	if (asset.manualInterestRate !== undefined) return 'cash';
	return resolveInstrumentType(asset.ticker, asset.name, '', asset.isin);
}

/** Si el activo puede traspasarse sin tributar. Solo los fondos. */
export function canBeTransferred(asset: Asset): boolean {
	return instrumentTypeOf(asset) === 'fund';
}

/**
 * Si vender el activo realiza plusvalía y por tanto tributa. El efectivo no
 * cotiza (mover dinero de una cuenta a otra no es un hecho imponible) y `other`
 * queda fuera porque no sabemos qué es.
 */
export function isTaxableOnSale(asset: Asset): boolean {
	const type = instrumentTypeOf(asset);
	return type === 'etf' || type === 'equity';
}
