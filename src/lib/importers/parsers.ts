/**
 * Parsers específicos para cada bróker soportado.
 * Cada parser recibe headers + rows crudos y devuelve ParsedPosition[].
 */

import type { BrokerInfo, ParsedPosition, ImportResult, MappingConfig, SkippedDetail, Transaction, TransactionType, CSVBlock } from './types';
import {
	parseCSVBlocks, detectDelimiter, parseNumber, normalizeHeader, normalizeText,
	findField, isValidISIN, extractISIN, createSkipRow, parseBrokerDate,
	analyzeColumns, suggestMappingFromAnalysis, normalizeCurrency
} from './csv-utils';
import { reduceTransactionsToPositions } from './aggregator';

// ─── Detección de Bróker ────────────────────────────────────────────────

interface BrokerDetector {
	id: BrokerInfo['id'];
	name: string;
	icon: string;
	/** Devuelve confianza 0-1 de que las cabeceras pertenecen a este bróker */
	detect: (headers: string[]) => number;
	/** Parsea las filas del CSV para este bróker */
	parse: (headers: string[], rows: string[][], blocks?: CSVBlock[]) => { 
		positions: ParsedPosition[]; 
		warnings: string[]; 
		skipped: number; 
		skippedDetails: SkippedDetail[];
		totalTransactions?: number;
	};
}

// ─── DEGIRO Account Statement ───────────────────────────────────────────
// Handles the "Account.csv" export from DEGIRO, where buy/sell operations
// are embedded in the Descripción/Description field as free text like:
//   "Compra 100 Quantum eMotion Corp@1,835 EUR (CA74767K1030)"
//   "Venta 700 Atlasclear Holdings Inc@0,2409 USD (US1287452056)"

/**
 * Parses a DEGIRO account statement description to extract trade info.
 * Returns null if the description is not a buy/sell operation.
 * Supports both European (comma decimal) and American (dot decimal) number formats.
 * Also supports spaces around '@': "Name @ Price CURRENCY (ISIN)"
 */
function parseDegiroAccountDescription(description: string): {
	type: 'buy' | 'sell';
	shares: number;
	name: string;
	price: number;
	currency: string;
	isin: string;
} | null {
	if (!description) return null;

	// Pattern: "Compra/Venta QUANTITY Name@PRICE CURRENCY (ISIN)"
	// Also handles spaces around @: "Compra/Venta QUANTITY Name @ PRICE CURRENCY (ISIN)"
	// The QUANTITY and PRICE may use European format (comma as decimal separator)
	// Examples:
	//   "Compra 100 Quantum eMotion Corp@1,835 EUR (CA74767K1030)"
	//   "Venta 700 Atlasclear Holdings Inc@0,2409 USD (US1287452056)"
	//   "Compra 15 Hub Cyber Security Ltd @ 0,4 USD (IL0012187428)"
	//   "Compra 5 a 104,52" (older format from degiro_account_statement.csv)
	const tradeRegex = /^(Compra|Venta|Buy|Sell|Koop|Verkoop)\s+([\d.,]+)\s+(.+?)\s*@\s*([\d.,]+)\s+([A-Z]{3})\s+\(([A-Z]{2}[A-Z0-9]{9}[0-9])\)$/i;
	const match = description.match(tradeRegex);
	if (!match) return null;

	const [, action, sharesStr, name, priceStr, currency, isin] = match;
	const isBuy = /^(compra|buy|koop)$/i.test(action);

	return {
		type: isBuy ? 'buy' : 'sell',
		shares: parseNumber(sharesStr),
		name: name.trim(),
		price: parseNumber(priceStr),
		currency,
		isin: isin.toUpperCase(),
	};
}

/**
 * Parses a DEGIRO STOCK SPLIT description.
 * Returns null if not a stock split.
 * Examples:
 *   "STOCK SPLIT: 11 Hub Cyber Security Ltd @ 0,1455 USD (IL0012334285)"  → split-in (new ISIN)
 *   "STOCK SPLIT: 0 Hub Cyber Security Ltd @ 7,275 USD (IL0012384504)"    → split-out (old ISIN, 0 shares)
 *   "STOCK SPLIT: 1 Hub Cyber Security Ltd @ 4,545 USD (IL0012334285)"    → split-out (old ISIN, negative)
 */
function parseDegiroStockSplit(description: string): {
	shares: number;
	name: string;
	price: number;
	currency: string;
	isin: string;
} | null {
	if (!description) return null;
	const splitRegex = /^STOCK SPLIT:\s+([\d.,]+)\s+(.+?)\s*@\s*([\d.,]+)\s+([A-Z]{3})\s+\(([A-Z]{2}[A-Z0-9]{9}[0-9])\)$/i;
	const match = description.match(splitRegex);
	if (!match) return null;

	const [, sharesStr, name, priceStr, currency, isin] = match;
	return {
		shares: parseNumber(sharesStr),
		name: name.trim(),
		price: parseNumber(priceStr),
		currency,
		isin: isin.toUpperCase(),
	};
}

/**
 * Motivo con el que se descarta una fila cuya fecha no se entiende.
 * Centralizado porque los cinco parsers lo necesitan con el mismo texto.
 */
function motivoFechaInvalida(dateStr: string): string {
	return `Fecha no reconocida: "${(dateStr || '').trim() || 'vacía'}"`;
}

/** Longitud de la palabra más larga de la lista que aparece en el texto; 0 si ninguna. */
function coincidenciaMasLarga(texto: string, palabras: string[]): number {
	let mejor = 0;
	for (const kw of palabras) {
		if (kw.length > mejor && texto.includes(kw)) mejor = kw.length;
	}
	return mejor;
}

/**
 * Clasifica el tipo de operación quedándose con la **coincidencia más larga** entre las dos
 * listas, en vez de con la primera lista que casa.
 *
 * ⚠️ Antes era `buyKeywords.some(kw => typeRaw.includes(kw))` y, si no, las de venta. Dos
 * defectos en una línea:
 *
 * - La lista de compra contenía `'in'`, de dos letras, así que **`'selling'` y `'sending'`
 *   casaban como compra** por la «in» de dentro. Cada venta se importaba como compra: los
 *   títulos se sumaban en vez de restarse y el coste medio se recalculaba con un precio de
 *   venta.
 * - Y el orden decidía los empates, así que `'koop'` (comprar) dentro de `'verkoop'`
 *   (vender) hacía lo mismo con el neerlandés de DEGIRO — el peor caso posible, porque son
 *   la compra y la venta del mismo bróker.
 *
 * Comparar longitudes resuelve los dos sin depender del orden y sin romper los gerundios:
 * en `'verkoop'` gana `verkoop` (7) sobre `koop` (4), y en `'selling'` casa `sell` y nada de
 * la lista de compra. Exigir palabra entera **no** vale: `'Selling'` y `'Buying'` dejarían
 * de casar con nada y ambas caerían al valor por defecto, que es compra.
 */
function clasificarTipoOperacion(texto: string, compra: string[], venta: string[]): TransactionType | null {
	const largoCompra = coincidenciaMasLarga(texto, compra);
	const largoVenta = coincidenciaMasLarga(texto, venta);

	if (largoCompra === 0 && largoVenta === 0) return null;
	return largoVenta > largoCompra ? 'SELL' : 'BUY';
}

/** Devuelve el string si parece un código de divisa de 3 letras, null en caso contrario */
function potentialCurrency(val: string | undefined): string | null {
	if (!val) return null;
	const trimmed = val.trim().toUpperCase();
	return /^[A-Z]{3}$/.test(trimmed) ? trimmed : null;
}

const degiroAccountStatementDetector: BrokerDetector = {
	id: 'degiro',
	name: 'DEGIRO (Account Statement)',
	icon: '🟠',
	detect(headers) {
		const normalized = headers.map(normalizeHeader);
		
		const hasExactMatch = (term: string) => normalized.includes(term);
		
		const hasDate = hasExactMatch('fecha') || hasExactMatch('date') || hasExactMatch('datum');
		const hasTime = hasExactMatch('hora') || hasExactMatch('time') || hasExactMatch('tijd');
		const hasDescription = hasExactMatch('descripcion') || hasExactMatch('description') || hasExactMatch('omschrijving');
		const hasIsin = hasExactMatch('isin');
		const hasProduct = hasExactMatch('producto') || hasExactMatch('product');
		const hasQuantity = hasExactMatch('numero') || hasExactMatch('cantidad') || hasExactMatch('aantal');
		
		// Si tiene columna de cantidad numérica directa (Número/Cantidad), es más probable que sea el de Transacciones
		if (hasQuantity) return 0;

		if (hasDate && hasTime && hasDescription && hasIsin && hasProduct) {
			return 0.99;
		}
		
		if (hasDescription && (hasIsin || hasProduct) && hasDate) {
			return 0.8;
		}
		
		return 0;
	},
	parse(headers, rows) {
		const transactions: Transaction[] = [];
		const warnings: string[] = [];
		const { skipRow, skippedDetails } = createSkipRow();

		for (const [rowIdx, row] of rows.entries()) {
			try {
				// The description field contains the trade info
				const description = findField(headers, row, 'Descripción', 'Description', 'Omschrijving', 'Descripcion');
				const dateStr = findField(headers, row, 'Fecha', 'Date', 'Datum');
				const timeStr = findField(headers, row, 'Hora', 'Time', 'Tijd');
				const date = parseBrokerDate(dateStr, timeStr);

				// ── 1. Intentar parsear como STOCK SPLIT ───────────────────────────
				const splitInfo = parseDegiroStockSplit(description);
				if (splitInfo) {
					if (!isValidISIN(splitInfo.isin)) {
						skipRow(rowIdx, row, `Stock Split con ISIN inválido: "${splitInfo.isin}"`);
						continue;
					}
					
					const varIdx = headers.findIndex(h => {
						const n = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
						return n === 'variacion' || n === 'change' || n === 'mutatie';
					});

					let varNum = 0;
					if (varIdx !== -1) {
						const nextCol = varIdx + 1;
						const nextVal = nextCol < row.length ? (row[nextCol] ?? '') : '';
						if (/[\d]/.test(nextVal)) {
							varNum = parseNumber(nextVal);
						} else {
							varNum = parseNumber(row[varIdx] ?? '');
						}
					}
					
					if (splitInfo.shares === 0) {
						// Split con 0 acciones — apunte fantasma sin cambio de posición, ignorar
						skipRow(rowIdx, row, `Stock Split con 0 acciones (apunte contable sin efecto)`);
						continue;
					}

					if (!date) {
						skipRow(rowIdx, row, motivoFechaInvalida(dateStr));
						continue;
					}

					// En stock splits: varNum < 0 (dinero sale, entran acciones) -> BUY. varNum >= 0 -> SELL (salen acciones).
					const type: TransactionType = varNum < 0 ? 'BUY' : 'SELL';

					transactions.push({
						date,
						type,
						isin: splitInfo.isin,
						name: splitInfo.name,
						shares: splitInfo.shares,
						price: splitInfo.price,
						currency: splitInfo.currency
					});
					continue;
				}

				// ── 2. Intentar parsear como compra/venta normal ───────────────────
				const trade = parseDegiroAccountDescription(description);

				if (!trade) {
					// Not a buy/sell row — depósitos, traspasos, comisiones, FX, etc.
					skipRow(rowIdx, row, description
						? `Apunte no operativo: "${description.substring(0, 60)}"`
						: 'Fila sin descripción de compra/venta');
					continue;
				}

				if (!isValidISIN(trade.isin)) {
					skipRow(rowIdx, row, `ISIN inválido en operación: "${trade.isin}"`);
					continue;
				}

				if (!date) {
					skipRow(rowIdx, row, motivoFechaInvalida(dateStr));
					continue;
				}

				transactions.push({
					date,
					type: trade.type === 'buy' ? 'BUY' : 'SELL',
					isin: trade.isin,
					name: trade.name,
					shares: trade.shares,
					price: trade.price,
					currency: trade.currency
				});
			} catch {
				skipRow(rowIdx, row, 'Error inesperado al procesar la fila');
			}
		}

		// Consolidar posiciones usando el agregador cronológico de coste medio ponderado
		const { positions, warnings: avisosAgregador } = reduceTransactionsToPositions(transactions);
		warnings.push(...avisosAgregador);

		if (positions.length === 0 && rows.length > 0 && transactions.length === 0) {
			warnings.push('No se encontraron operaciones de compra/venta en el extracto de cuenta. Asegúrate de que el CSV contiene transacciones con formato "Compra/Venta X Nombre@Precio DIVISA (ISIN)".');
		}

		return { positions, warnings, skipped: skippedDetails.length, skippedDetails, totalTransactions: transactions.length };
	}
};

// ─── DEGIRO (Transactions / Portfolio) ──────────────────────────────────

const degiroDetector: BrokerDetector = {
	id: 'degiro',
	name: 'DEGIRO',
	icon: '🟠',
	detect(headers) {
		const normalized = headers.map(normalizeHeader);
		
		const hasExactMatch = (term: string) => normalized.includes(term);
		
		const hasIsin = hasExactMatch('isin');
		const hasProduct = hasExactMatch('producto') || hasExactMatch('product');
		const hasQuantity = hasExactMatch('cantidad') || hasExactMatch('aantal') || hasExactMatch('quantity') || hasExactMatch('numero') || hasExactMatch('number');
		const hasPrice = hasExactMatch('precio') || hasExactMatch('koers') || hasExactMatch('price') || hasExactMatch('precio de');
		const hasClosing = hasExactMatch('precio de cierre') || hasExactMatch('slotkoers') || hasExactMatch('closing price') || hasExactMatch('precio de');
		
		if (hasIsin && hasProduct && hasQuantity && hasPrice) {
			return 0.98;
		}
		
		if (hasIsin && hasProduct && hasQuantity && hasClosing) {
			return 0.95;
		}
		
		let exactCount = 0;
		if (hasIsin) exactCount++;
		if (hasProduct) exactCount++;
		if (hasQuantity) exactCount++;
		if (hasPrice || hasClosing) exactCount++;
		
		if (exactCount >= 3) return 0.8;
		
		return 0;
	},
	parse(headers, rows) {
		const positions: ParsedPosition[] = [];
		const warnings: string[] = [];
		const { skipRow, skippedDetails } = createSkipRow();

		// Intentar detectar si es un portfolio snapshot o transacciones buscando el campo de precio en las primeras filas
		let closingPrice = '';
		for (let i = 0; i < Math.min(rows.length, 5); i++) {
			closingPrice = findField(headers, rows[i], 'Precio de cierre', 'Slotkoers', 'Closing price', 'Closing', 'Precio de');
			if (closingPrice) break;
		}

		if (closingPrice) {
			// Portfolio snapshot: procesar directamente
			const accumulated = new Map<string, { name: string; shares: number; totalCost: number; currency: string }>();

			for (const [rowIdx, row] of rows.entries()) {
				try {
					let isin = findField(headers, row, 'ISIN');
					if (!isValidISIN(isin)) {
						const product = findField(headers, row, 'Producto', 'Product');
						const extracted = extractISIN(product);
						if (extracted) isin = extracted;
					}

					if (!isValidISIN(isin)) {
						skipRow(rowIdx, row, 'Sin ISIN válido');
						continue;
					}

					const name = findField(headers, row, 'Producto', 'Product', 'Nombre');
					const shares = parseNumber(findField(headers, row, 'Cantidad', 'Aantal', 'Quantity', 'Tamaño', 'Size'));
					const price = parseNumber(findField(headers, row, 'Precio de cierre', 'Slotkoers', 'Closing price', 'Closing', 'Precio de'));
					const valorEUR = parseNumber(findField(headers, row, 'Valor en EUR', 'Value in EUR', 'Waarde in EUR', 'Valor EUR'));
					
					let currency = findField(headers, row, 'Moneda', 'Currency', 'Valuta');
					if (!currency) {
						/**
						 * Heurística: DEGIRO a veces pone la divisa en una columna con cabecera
						 * «Valor local» o similar.
						 *
						 * ⚠️ Esto era un `findIndex` que se quedaba con la **primera cabecera que
						 * casaba** y miraba solo esa celda. En el `Portfolio.csv` real las columnas
						 * son `Producto, Symbol/ISIN, Cantidad, Precio de, Valor local, , Valor en
						 * EUR`, así que «Precio de» casa antes que «Valor local», su celda es un
						 * número y la búsqueda se daba por fallida — mientras el `USD` estaba en la
						 * columna de al lado. Ahora se recorren **todas** las candidatas y se toma
						 * la primera cuya celda es de verdad una divisa, que es lo que se quería.
						 */
						for (let i = 0; i < headers.length && !currency; i++) {
							const n = normalizeHeader(headers[i]);
							if (!n.includes('valor local') && !n.includes('precio de')) continue;
							const val = potentialCurrency(row[i]);
							if (val) currency = val;
						}

						if (!currency) {
							// Heurística: divisa en columna sin cabecera justo después del precio o valor local
							const priceIdx = headers.findIndex(h => {
								const n = normalizeHeader(h);
								return n.includes('precio') || n.includes('price') || n.includes('koers');
							});
							if (priceIdx !== -1 && priceIdx + 1 < row.length && !headers[priceIdx + 1]) {
								const pVal = potentialCurrency(row[priceIdx + 1]);
								if (pVal) currency = pVal;
							}
							
							if (!currency) {
								const localValIdx = headers.findIndex(h => normalizeHeader(h).includes('valor local'));
								if (localValIdx !== -1 && localValIdx + 1 < row.length && !headers[localValIdx + 1]) {
									const lVal = potentialCurrency(row[localValIdx + 1]);
									if (lVal) currency = lVal;
								}
							}
						}
					}
					
					/**
					 * ⚠️ El coste se toma **en la divisa del activo**, y por eso «Valor en EUR»
					 * es el último recurso y no el preferido.
					 *
					 * `avgCost` viaja hasta el store, que lo multiplica por `fxRate` según la
					 * divisa que Yahoo da para el ticker (ver el docblock de `pricesWithFx` en
					 * `portfolio.svelte.ts`). Guardar aquí un importe **ya convertido a euros**
					 * y etiquetarlo `EUR` no evitaba la conversión: la hacía **dos veces**. Con
					 * el fixture real de DEGIRO, una posición en USD quedaba con el coste
					 * infravalorado ~14 %, es decir, una plusvalía inventada en el panel fiscal.
					 * El CSV trae el precio unitario en divisa local, así que `shares * price`
					 * es tanto la respuesta correcta como la que ya estaba en el fichero.
					 */
					const detectedCurrency = normalizeCurrency(currency || '') || '';
					const usaValorEUR = !(price > 0);
					const totalCost = usaValorEUR ? valorEUR : shares * price;
					const finalCurrency = usaValorEUR ? 'EUR' : (detectedCurrency || 'EUR');

					if (shares > 0) {
						/**
						 * ⚠️ Esto era `.set(...)` sobre un mapa llamado `accumulated`: sustituía
						 * en vez de acumular, así que un ISIN repetido —la misma posición en dos
						 * bolsas o en dos cuentas, o dos exportaciones concatenadas— perdía todas
						 * las filas menos la última, sin aviso y sin aparecer en `skippedDetails`.
						 * Las otras dos copias del mismo cometido (`aggregateParsedPositions` y
						 * `reduceTransactionsToPositions`) sí consolidan con coste medio ponderado.
						 */
						const previo = accumulated.get(isin);
						if (previo) {
							previo.shares += shares;
							previo.totalCost += totalCost;
							if ((name || '').length > previo.name.length) previo.name = name;
						} else {
							accumulated.set(isin, {
								name: name || isin,
								shares,
								totalCost,
								currency: finalCurrency,
							});
						}
					} else {
						skipRow(rowIdx, row, `Cantidad <= 0 (valor: ${shares})`);
					}
				} catch {
					skipRow(rowIdx, row, 'Error inesperado al procesar la fila');
				}
			}

			for (const [isin, data] of accumulated) {
				positions.push({
					isin,
					name: data.name,
					shares: data.shares,
					avgCost: data.shares > 0 ? (data.totalCost / data.shares) : 0,
					currency: data.currency,
				});
			}

			return { positions, warnings, skipped: skippedDetails.length, skippedDetails };
		} else {
			// Transaction history: usar transacciones + agregador cronológico
			const transactions: Transaction[] = [];

			for (const [rowIdx, row] of rows.entries()) {
				try {
					let isin = findField(headers, row, 'ISIN');
					if (!isValidISIN(isin)) {
						const product = findField(headers, row, 'Producto', 'Product');
						const extracted = extractISIN(product);
						if (extracted) isin = extracted;
					}

					if (!isValidISIN(isin)) {
						skipRow(rowIdx, row, 'Sin ISIN válido');
						continue;
					}

					const name = findField(headers, row, 'Producto', 'Product', 'Nombre') || isin;
					const sharesRaw = parseNumber(findField(headers, row, 'Cantidad', 'Aantal', 'Quantity', 'Number', 'Número'));
					const priceIdx = headers.findIndex(h => {
						const n = normalizeHeader(h);
						return n === 'precio' || n === 'koers' || n === 'price' || n === 'precio de';
					});
					const price = priceIdx !== -1 ? parseNumber(row[priceIdx]) : 0;

					let currency = 'EUR';
					if (priceIdx !== -1 && priceIdx + 1 < row.length && (priceIdx + 1 >= headers.length || headers[priceIdx + 1].trim() === '')) {
						currency = row[priceIdx + 1]?.trim() || 'EUR';
					} else {
						currency = findField(headers, row, 'Moneda', 'Currency', 'Valuta') || 'EUR';
					}
					currency = normalizeCurrency(currency) || 'EUR';

					if (sharesRaw !== 0 && price > 0) {
						const dateStr = findField(headers, row, 'Fecha', 'Date', 'Datum');
						const timeStr = findField(headers, row, 'Hora', 'Time', 'Tijd');
						const date = parseBrokerDate(dateStr, timeStr);

						if (!date) {
							skipRow(rowIdx, row, motivoFechaInvalida(dateStr));
							continue;
						}

						transactions.push({
							date,
							type: sharesRaw > 0 ? 'BUY' : 'SELL',
							isin,
							name,
							shares: Math.abs(sharesRaw),
							price,
							currency,
						});
					} else {
						const reason = sharesRaw === 0 ? 'Cantidad = 0' : price === 0 ? 'Precio = 0' : 'Sin datos válidos';
						skipRow(rowIdx, row, reason);
					}
				} catch {
					skipRow(rowIdx, row, 'Error inesperado al procesar la fila');
				}
			}

			const { positions: consolidated, warnings: avisosAgregador } = reduceTransactionsToPositions(transactions);
			warnings.push(...avisosAgregador);
			/**
			 * ⚠️ `totalTransactions` no es decorativo: es el campo con el que `importFromCSV`
			 * distingue «este parser no entendió el fichero» de «lo entendió y el neto es
			 * cero». Faltaba aquí y en Interactive Brokers —los otros tres sí lo devolvían—,
			 * así que un `Transacciones.csv` cuyas filas se descartan todas caía al importador
			 * genérico, que mapea «Valor local» como precio unitario e importa 15 títulos a
			 * 1.536,67 € cada uno. La guarda existía; solo faltaba en dos de las cinco copias.
			 */
			return { positions: consolidated, warnings, skipped: skippedDetails.length, skippedDetails, totalTransactions: transactions.length };
		}
	}
};

// ─── Trading 212 ────────────────────────────────────────────────────────

const trading212Detector: BrokerDetector = {
	id: 'trading212',
	name: 'Trading 212',
	icon: '🔵',
	detect(headers) {
		const normalized = headers.map(normalizeHeader);
		const joined = normalized.join(' ');
		
		const markers = ['action', 'no of shares', 'price share', 'isin', 'ticker',
			'currency price share', 'exchange rate', 'stamp duty', 'currency conversion fee'];
		const matches = markers.filter(m => joined.includes(m)).length;
		
		if (matches >= 4) return 0.95;
		if (matches >= 3) return 0.8;
		return 0;
	},
	parse(headers, rows) {
		const transactions: Transaction[] = [];
		const warnings: string[] = [];
		const { skipRow, skippedDetails } = createSkipRow();
		
		for (const [rowIdx, row] of rows.entries()) {
			try {
				const action = findField(headers, row, 'Action').toLowerCase();
				
				// Solo procesar operaciones de compra/venta que afectan a activos
				if (!action.includes('buy') && !action.includes('sell')) {
					skipRow(rowIdx, row, `Operación no aplicable: "${action || 'sin acción'}"`); 
					continue;
				}

				const isin = findField(headers, row, 'ISIN');
				const ticker = findField(headers, row, 'Ticker');
				const name = findField(headers, row, 'Name');
				const shares = parseNumber(findField(headers, row, 'No. of shares', 'No of shares'));
				const price = parseNumber(findField(headers, row, 'Price / share', 'Price share'));
				const currency = findField(headers, row, 'Currency (Price / share)', 'Currency Price share') || 'EUR';
				
				if (!isValidISIN(isin)) {
					skipRow(rowIdx, row, `ISIN inválido: "${isin}"`);
					continue;
				}
				if (shares === 0) {
					skipRow(rowIdx, row, 'Cantidad de acciones = 0');
					continue;
				}
				/**
				 * ⚠️ Esto era `price: price || 0` — es decir, se admitía la transacción con
				 * precio cero. La misma guarda existía escrita cuatro veces y solo el
				 * histórico de DEGIRO la aplicaba de verdad. Una compra con la celda de precio
				 * vacía no es un redondeo: entra en el coste medio como si el título hubiera
				 * sido gratis, así que la app presenta como plusvalía dinero que el usuario sí
				 * pagó y el panel fiscal estima IRPF sobre una ganancia inventada. Mejor
				 * descartar la fila y decirlo, que ahora además se ve.
				 */
				if (price <= 0) {
					skipRow(rowIdx, row, `Precio por acción no válido (valor: "${findField(headers, row, 'Price / share', 'Price share') || 'vacío'}")`);
					continue;
				}

				const isBuy = action.includes('buy');
				const dateStr = findField(headers, row, 'Time', 'Date', 'Fecha');
				const date = parseBrokerDate(dateStr);

				if (!date) {
					skipRow(rowIdx, row, motivoFechaInvalida(dateStr));
					continue;
				}

				transactions.push({
					date,
					type: isBuy ? 'BUY' : 'SELL',
					isin,
					ticker: ticker || undefined,
					name: name || ticker || isin,
					shares,
					price,
					currency,
				});
			} catch {
				skipRow(rowIdx, row, 'Error inesperado al procesar la fila');
			}
		}

		const { positions: consolidated, warnings: avisosAgregador } = reduceTransactionsToPositions(transactions);
		warnings.push(...avisosAgregador);
		return { positions: consolidated, warnings, skipped: skippedDetails.length, skippedDetails, totalTransactions: transactions.length };
	}
};

// ─── Interactive Brokers ────────────────────────────────────────────────

const ibDetector: BrokerDetector = {
	id: 'interactive_brokers',
	name: 'Interactive Brokers',
	icon: '🔴',
	detect(headers) {
		const normalized = headers.map(normalizeHeader);
		const joined = normalized.join(' ');
		
		// IB Flex Query / TWS export markers
		const markers = ['symbol', 'position', 'market value', 'average cost', 'unrealized p l',
			'cost basis', 'asset class', 'conid'];
		const matches = markers.filter(m => joined.includes(m)).length;
		
		if (matches >= 4) return 0.9;
		if (matches >= 3) return 0.75;
		
		// IB Trade export markers
		const tradeMarkers = ['symbol', 'date time', 'quantity', 't price', 'proceeds', 'comm fee'];
		const tradeMatches = tradeMarkers.filter(m => joined.includes(m)).length;
		if (tradeMatches >= 4) return 0.85;
		
		return 0;
	},
	parse(headers, rows, blocks) {
		const positions: ParsedPosition[] = [];
		const warnings: string[] = [];
		const { skipRow, skippedDetails } = createSkipRow();
		let totalTransactions = 0;

		// 1. Extraer mapeo de Símbolo a ISIN de todas partes del documento (ej: bloque Dividendos)
		const symbolToIsinMap = new Map<string, string>();
		const listToScan = blocks || [{ name: 'Default', headers, rows }];
		
		for (const block of listToScan) {
			const isinColIdx = block.headers.findIndex(h => normalizeHeader(h) === 'isin');
			const symbolColIdx = block.headers.findIndex(h => {
				const n = normalizeHeader(h);
				return n === 'symbol' || n === 'ticker';
			});
			
			for (const row of block.rows) {
				// Buscar mapping directo en columnas
				if (isinColIdx !== -1 && symbolColIdx !== -1 && isinColIdx < row.length && symbolColIdx < row.length) {
					const isinVal = row[isinColIdx]?.trim().toUpperCase();
					const symbolVal = row[symbolColIdx]?.trim().toUpperCase();
					if (isValidISIN(isinVal) && symbolVal) {
						symbolToIsinMap.set(symbolVal, isinVal);
					}
				}
				
				// Buscar en descripciones de texto o en cualquier celda
				for (const cell of row) {
					if (cell && cell.includes('(')) {
						// Patrón: SYMBOL (ISIN)
						const match = cell.match(/\b([A-Z0-9.\-]+)\s*\(([A-Z]{2}[A-Z0-9]{9}[0-9])\)/i);
						if (match) {
							const sym = match[1].trim().toUpperCase();
							const isin = match[2].toUpperCase();
							if (isValidISIN(isin)) {
								symbolToIsinMap.set(sym, isin);
							}
						}
					}
				}
			}
		}

		// 2. Procesar bloques de transacciones ("Trades") o snapshots ("Positions")
		// Buscaremos primero si hay algún bloque de transacciones (Trades)
		let hasTradesBlock = false;
		const tradesBlocks = listToScan.filter(b => {
			const nameLower = b.name.toLowerCase();
			const hasRequiredHeaders = b.headers.some(h => {
				const n = normalizeHeader(h);
				return n === 'symbol' || n === 'ticker';
			}) && b.headers.some(h => {
				const n = normalizeHeader(h);
				return n === 'quantity' || n === 'qty';
			});
			return nameLower === 'trades' || (hasRequiredHeaders && !nameLower.includes('positions') && !b.headers.some(h => normalizeHeader(h).includes('position') || normalizeHeader(h).includes('market value')));
		});

		if (tradesBlocks.length > 0) {
			hasTradesBlock = true;
		}

		if (hasTradesBlock) {
			const transactions: Transaction[] = [];
			for (const block of tradesBlocks) {
				for (const [rowIdx, row] of block.rows.entries()) {
					try {
						const symbol = findField(block.headers, row, 'Symbol', 'Ticker');
						const qty = parseNumber(findField(block.headers, row, 'Quantity', 'Qty'));
						const price = parseNumber(findField(block.headers, row, 'T. Price', 'Trade Price', 'Price'));
						const currency = findField(block.headers, row, 'Currency') || 'USD';
						
						if (!symbol) {
							skipRow(rowIdx, row, 'Sin símbolo/ticker');
							continue;
						}
						if (qty === 0) {
							skipRow(rowIdx, row, `Cantidad = 0 para ${symbol}`);
							continue;
						}
						// Misma guarda que en DEGIRO y Trading 212: un trade sin precio entra en
						// el coste medio como si el título hubiera sido gratis.
						if (price <= 0) {
							skipRow(rowIdx, row, `Precio no válido para ${symbol}`);
							continue;
						}

						const dateStr = findField(block.headers, row, 'Date/Time', 'DateTime', 'Date', 'Fecha');
						const date = parseBrokerDate(dateStr);

						if (!date) {
							skipRow(rowIdx, row, motivoFechaInvalida(dateStr));
							continue;
						}

						// Determinar el ISIN desde nuestro mapa acumulado o columna si existe
						let isin = findField(block.headers, row, 'ISIN');
						if (!isValidISIN(isin) && symbol) {
							isin = symbolToIsinMap.get(symbol.toUpperCase()) || '';
						}

						transactions.push({
							date,
							type: qty > 0 ? 'BUY' : 'SELL',
							isin: isValidISIN(isin) ? isin : undefined,
							ticker: symbol,
							name: findField(block.headers, row, 'Description', 'Financial Instrument', 'Name') || symbol,
							shares: Math.abs(qty),
							price,
							currency: normalizeCurrency(currency) || 'USD'
						});
					} catch {
						skipRow(rowIdx, row, 'Error inesperado al procesar fila de trade');
					}
				}
			}

			// Consolidar posiciones con coste medio ponderado
			totalTransactions = transactions.length;
			const { positions: consolidated, warnings: avisosAgregador } = reduceTransactionsToPositions(transactions);
		warnings.push(...avisosAgregador);
			positions.push(...consolidated);
		} else {
			// Si no hay bloques de transacciones, procesamos como snapshot de posiciones
			const positionsBlocks = listToScan.filter(b => {
				const nameLower = b.name.toLowerCase();
				return nameLower.includes('position') || b.headers.some(h => normalizeHeader(h).includes('position') || normalizeHeader(h).includes('market value'));
			});

			const blocksToParse = positionsBlocks.length > 0 ? positionsBlocks : listToScan;

			for (const block of blocksToParse) {
				for (const [rowIdx, row] of block.rows.entries()) {
					try {
						const symbol = findField(block.headers, row, 'Symbol', 'Ticker');
						const positionSize = parseNumber(findField(block.headers, row, 'Position', 'Quantity'));
						const avgCost = parseNumber(findField(block.headers, row, 'Average Cost', 'Avg Cost', 'Cost Basis Per Share'));
						const currency = findField(block.headers, row, 'Currency') || 'USD';
						
						let isin = findField(block.headers, row, 'ISIN');
						if (!isValidISIN(isin) && symbol) {
							isin = symbolToIsinMap.get(symbol.toUpperCase()) || '';
						}

						if (!symbol) {
							skipRow(rowIdx, row, 'Sin símbolo/ticker');
							continue;
						}
						if (positionSize <= 0) {
							skipRow(rowIdx, row, `Posición <= 0 para ${symbol}`);
							continue;
						}

						positions.push({
							isin: isValidISIN(isin) ? isin : '',
							ticker: symbol,
							name: findField(block.headers, row, 'Description', 'Financial Instrument', 'Name') || symbol,
							shares: positionSize,
							avgCost: avgCost > 0 ? avgCost : 0,
							currency: normalizeCurrency(currency) || 'USD',
						});
					} catch {
						skipRow(rowIdx, row, 'Error inesperado al procesar la fila de posición');
					}
				}
			}
		}

		// Enriquecer posiciones resultantes con ISIN si quedó vacío y lo tenemos mapeado
		for (const pos of positions) {
			if (!pos.isin && pos.ticker) {
				const mappedIsin = symbolToIsinMap.get(pos.ticker.toUpperCase());
				if (mappedIsin) {
					pos.isin = mappedIsin;
				}
			}
		}

		// Ver la nota de `totalTransactions` en el detector de DEGIRO: sin este campo, un
		// fichero de trades cuyas filas se descartan todas cae al importador genérico.
		return { positions, warnings, skipped: skippedDetails.length, skippedDetails, totalTransactions };
	}
};

// ─── MyInvestor ─────────────────────────────────────────────────────────

const myinvestorDetector: BrokerDetector = {
	id: 'myinvestor',
	name: 'MyInvestor',
	icon: '🟢',
	detect(headers) {
		const normalized = headers.map(normalizeHeader);
		const joined = normalized.join(' ');
		
		const markers = ['nombre fondo', 'nombre del fondo', 'isin', 'participaciones',
			'valoracion', 'valor liquidativo', 'fecha suscripcion', 'importe', 'fecha de la orden', 'importe estimado', 'estado'];
		const matches = markers.filter(m => joined.includes(m)).length;
		
		if (matches >= 3) return 0.9;
		if (matches >= 2) return 0.7;
		
		// Inversis/Renta 4/Bankinter style
		const spanishBrokerMarkers = ['producto', 'isin', 'titulos', 'participaciones',
			'precio medio', 'coste medio', 'valoracion', 'beneficio'];
		const spanishMatches = spanishBrokerMarkers.filter(m => joined.includes(m)).length;
		if (spanishMatches >= 3) return 0.8;
		
		return 0;
	},
	parse(headers, rows) {
		const transactions: Transaction[] = [];
		const warnings: string[] = [];
		const { skipRow, skippedDetails } = createSkipRow();

		for (const [rowIdx, row] of rows.entries()) {
			try {
				// Ignorar transacciones que no estén finalizadas o ejecutadas
				const estado = normalizeText(findField(headers, row, 'Estado'));
				if (estado && !estado.includes('finalizada') && !estado.includes('ejecutad')) {
					skipRow(rowIdx, row, `Estado no procesable: "${estado}"`);
					continue;
				}

				let isin = findField(headers, row, 'ISIN', 'Código ISIN', 'Codigo ISIN');
				const name = findField(headers, row, 'Nombre fondo', 'Nombre del fondo', 'Producto', 'Nombre', 'Descripción');
				/**
				 * ⚠️ `normalizeText` y no `toLowerCase()`: las palabras con las que se compara
				 * abajo van sin acento (`suscripcion`, `aportacion`), y MyInvestor escribe
				 * «Suscripción». Con el `toLowerCase()` a secas no casaba **ninguna**
				 * suscripción; medido contra el fixture real, las 5 filas de suscripción del
				 * fichero se descartaban como «tipo de operación no reconocido» y el fondo
				 * desaparecía entero de la cartera importada.
				 */
				const tipoOpRaw = findField(headers, row, 'Tipo operación', 'Operación', 'Tipo');
				const tipoOp = tipoOpRaw ? normalizeText(tipoOpRaw) : '';
				
				// Extraer ISIN del nombre si no hay campo dedicado
				if (!isValidISIN(isin) && name) {
					const extracted = extractISIN(name);
					if (extracted) isin = extracted;
				}
				
				if (!isValidISIN(isin)) {
					skipRow(rowIdx, row, `Sin ISIN válido (valor: "${isin || 'vacío'}")`);
					continue;
				}
				
				const shares = parseNumber(findField(headers, row,
					'Participaciones', 'Títulos', 'Titulos', 'Cantidad', 'participaciones', 'Nº participaciones'));
				
				// Determinar dirección: positivo para suscripciones/traspasos entrada/compras, negativo para reembolsos/traspasos salida/ventas
				let isIncrease = tipoOp.includes('suscripcion') || tipoOp.includes('entrada') || tipoOp.includes('compra') || tipoOp.includes('aportacion');
				let isDecrease = tipoOp.includes('reembolso') || tipoOp.includes('salida') || tipoOp.includes('venta');
				
				// HEURÍSTICA: Si no hay tipo de operación pero sí participaciones y estado finalizado, asumimos COMPRA (Suscripción)
				if (!tipoOp && shares > 0 && estado.includes('finalizada')) {
					isIncrease = true;
				}

				if (shares === 0) {
					skipRow(rowIdx, row, 'Cantidad de participaciones = 0');
					continue;
				}

				if (!isIncrease && !isDecrease) {
					skipRow(rowIdx, row, `Tipo de operación no reconocido: "${tipoOp || 'vacio'}"`);
					continue;
				}

				const dateStr = findField(headers, row, 'Fecha suscripcion', 'Fecha de la orden', 'Fecha valor', 'Fecha', 'Fecha de suscripción');
				const date = parseBrokerDate(dateStr);

				if (!date) {
					skipRow(rowIdx, row, motivoFechaInvalida(dateStr));
					continue;
				}

				const importeTotal = parseNumber(findField(headers, row,
					'Importe neto', 'Importe bruto', 'Importe', 'Valoracion', 'Valoración', 'Importe estimado'));

				// Si el usuario añadió "Precio Medio" manualmente, intentamos usarlo
				const manualAvgCost = parseNumber(findField(headers, row, 'Precio medio', 'Coste medio', 'Precio de compra'));

				// Calculamos coste unitario
				let costPerShare = 0;
				if (manualAvgCost > 0) {
					costPerShare = manualAvgCost;
				} else if (Math.abs(shares) > 0 && Math.abs(importeTotal) > 0) {
					costPerShare = Math.abs(importeTotal) / Math.abs(shares);
				}

				// Misma guarda que en los otros tres parsers: sin ninguna columna de importe
				// el fondo entraba en la cartera con coste 0, y la app presentaba el 100 % de
				// su valor de mercado como plusvalía.
				if (costPerShare <= 0) {
					skipRow(rowIdx, row, 'Sin importe ni precio medio: no se puede calcular el coste');
					continue;
				}

				transactions.push({
					date,
					type: isIncrease ? 'BUY' : 'SELL',
					isin,
					name: name || isin,
					shares: Math.abs(shares),
					price: costPerShare,
					currency: 'EUR',
				});
			} catch {
				skipRow(rowIdx, row, 'Error inesperado al procesar la fila');
			}
		}
		
		const { positions: consolidated, warnings: avisosAgregador } = reduceTransactionsToPositions(transactions);
		warnings.push(...avisosAgregador);
		return { positions: consolidated, warnings, skipped: skippedDetails.length, skippedDetails, totalTransactions: transactions.length };
	}
};

/**
 * Agrega posiciones duplicadas por Ticker o ISIN, calculando el coste medio ponderado.
 */
function aggregateParsedPositions(positions: ParsedPosition[]): ParsedPosition[] {
	const map = new Map<string, ParsedPosition>();
	
	for (const pos of positions) {
		const key = (pos.isin || pos.ticker || pos.name).toUpperCase();
		const existing = map.get(key);
		
		if (existing) {
			const totalShares = existing.shares + pos.shares;
			if (totalShares > 0) {
				// Coste medio ponderado: (S1*C1 + S2*C2) / (S1+S2)
				existing.avgCost = (existing.shares * existing.avgCost + pos.shares * pos.avgCost) / totalShares;
			}
			existing.shares = totalShares;
			
			// Mantener el nombre más descriptivo
			if (pos.name.length > existing.name.length) existing.name = pos.name;
			if (!existing.isin && pos.isin) existing.isin = pos.isin;
			if (!existing.ticker && pos.ticker) existing.ticker = pos.ticker;
		} else {
			map.set(key, { ...pos });
		}
	}
	
	return Array.from(map.values());
}

// ─── Parser Genérico y Agregación Contable ──────────────────────────────

/**
 * Parsea un CSV genérico aplicando la configuración de mapeo especificada.
 * Soporta tanto instantáneas de posiciones estáticas como historiales de transacciones cronológicas.
 */
export function parseGenericCSVWithMapping(
	headers: string[],
	rows: string[][],
	mapping: MappingConfig
): { positions: ParsedPosition[]; warnings: string[]; skipped: number; skippedDetails: SkippedDetail[] } {
	const { skipRow, skippedDetails } = createSkipRow();
	const warnings: string[] = [];

	// 1. Detectar si el mapping contiene columna de fecha para flujo transaccional
	const isTransactional = mapping.date !== undefined && mapping.date !== -1 && mapping.date < headers.length;

	if (isTransactional) {
		const transactions: Transaction[] = [];

		for (const [rowIdx, row] of rows.entries()) {
			try {
				let sharesRaw = parseNumber(row[mapping.shares]);
				let unitPrice = 0;
				let type: TransactionType = 'BUY';
				let typeDetected = false;
				let parsedFromDesc = false;

				// 1. Intentar parsear si hay formato descriptivo "Buy 3 @ 134.85 USD" en alguna celda (ej. Saxo, DEGIRO)
				for (const cell of row) {
					if (cell && cell.includes('@')) {
						const match = cell.match(/^(Buy|Sell|Koop|Verkoop|Kop|Salj|Köp|Sälj)\s+([\d.,]+)\s*@\s*([\d.,]+)/i);
						if (match) {
							const [, action, qtyStr, priceStr] = match;
							type = /^(buy|compra|koop|kop|köp)$/i.test(action) ? 'BUY' : 'SELL';
							sharesRaw = parseNumber(qtyStr);
							unitPrice = parseNumber(priceStr);
							typeDetected = true;
							parsedFromDesc = true;
							break;
						}
					}
				}

				if (sharesRaw === 0) {
					skipRow(rowIdx, row, 'Cantidad es 0');
					continue;
				}

				const isinRaw = mapping.isin !== undefined && mapping.isin !== -1 && mapping.isin < row.length ? row[mapping.isin] : '';
				let isin = isValidISIN(isinRaw) ? isinRaw.trim().toUpperCase() : '';
				let ticker = mapping.ticker !== undefined && mapping.ticker !== -1 && mapping.ticker < row.length ? row[mapping.ticker]?.trim() : undefined;
				const name = mapping.name !== undefined && mapping.name !== -1 && mapping.name < row.length ? row[mapping.name]?.trim() : (ticker || isin || 'Activo desconocido');

				if (!isin && name) {
					const ext = extractISIN(name);
					if (ext) isin = ext;
				}

				// Inferir ticker si no existe (para criptomonedas como Relai, Bitvavo)
				let inferredTicker = ticker;
				if (!isin && !inferredTicker) {
					for (let i = 0; i < headers.length; i++) {
						const h = headers[i].toLowerCase();
						if (h.includes('btc') || h.includes('bitcoin')) { inferredTicker = 'BTC'; break; }
						if (h.includes('eth') || h.includes('ethereum')) { inferredTicker = 'ETH'; break; }
						if (h.includes('sol') || h.includes('solana')) { inferredTicker = 'SOL'; break; }
						if (h.includes('usdt')) { inferredTicker = 'USDT'; break; }
						if (h.includes('cro')) { inferredTicker = 'CRO'; break; }
					}
					if (!inferredTicker) {
						for (const cell of row) {
							if (cell) {
								const upperCell = cell.toUpperCase();
								if (upperCell.includes('BTC/') || upperCell.includes('/BTC')) { inferredTicker = 'BTC'; break; }
								if (upperCell.includes('ETH/') || upperCell.includes('/ETH')) { inferredTicker = 'ETH'; break; }
								if (upperCell.includes('SOL/') || upperCell.includes('/SOL')) { inferredTicker = 'SOL'; break; }
							}
						}
					}
				}

				if (!isin && !inferredTicker) {
					skipRow(rowIdx, row, 'Fila sin identificador (ISIN o Ticker) válido');
					continue;
				}

				// Detección de tipo BUY/SELL si no se parseó de la descripción
				if (!typeDetected) {
					if (mapping.type !== undefined && mapping.type !== -1 && mapping.type < row.length) {
						const typeRaw = row[mapping.type]?.trim().toLowerCase() || '';

						const buyKeywords = ['buy', 'compra', 'suscripcion', 'aportacion', 'adquirir', 'deposit', 'receive', 'incoming', 'koop', 'staking', 'stake reward', 'lockup reward', 'converted'];
						const sellKeywords = ['sell', 'venta', 'reembolso', 'salida', 'out', 'withdrawal', 'send', 'outgoing', 'verkoop'];
						/**
						 * ⚠️ `'dividend'` estaba en la lista de compra, así que una fila de
						 * dividendo **sumaba participaciones**. Un dividendo es renta, no un
						 * movimiento de títulos; en esta app además lo trata el ledger aparte
						 * (reduce el coste medio). Se descarta y se dice por qué.
						 */
						const ignoreKeywords = ['dividend', 'dividendo'];

						if (coincidenciaMasLarga(typeRaw, ignoreKeywords) > 0) {
							skipRow(rowIdx, row, `Apunte de dividendo, no es un movimiento de títulos: "${typeRaw}"`);
							continue;
						}

						const clasificado = clasificarTipoOperacion(typeRaw, buyKeywords, sellKeywords);
						if (clasificado) {
							type = clasificado;
							typeDetected = true;
						}
					}
				}

				// Failsafe por signo de cantidad
				if (!typeDetected && sharesRaw < 0) {
					type = 'SELL';
					typeDetected = true;
				}

				const finalShares = Math.abs(sharesRaw);
				const dateStr = mapping.date !== undefined && mapping.date !== -1 && mapping.date < row.length ? row[mapping.date] : '';
				const finalDate = parseBrokerDate(dateStr);

				if (!finalDate) {
					skipRow(rowIdx, row, motivoFechaInvalida(dateStr));
					continue;
				}

				if (!parsedFromDesc) {
					const priceOrTotal = mapping.avgCost !== undefined && mapping.avgCost !== -1 && mapping.avgCost < row.length ? parseNumber(row[mapping.avgCost]) : 0;
					/**
					 * ⚠️ La variable ya se llamaba `priceOrTotal` y se usaba **siempre como
					 * precio unitario**. Cuando la columna mapeada es un importe total, eso
					 * multiplica el coste por el número de títulos.
					 *
					 * No es hipotético: un `Transacciones.csv` de DEGIRO con la columna «Precio»
					 * vacía hace que su parser descarte las filas, salte el respaldo genérico, y
					 * éste mapee «Valor local» —un total— como precio unitario. Medido con el
					 * caso real: 15 títulos a **1.536,67 € cada uno**, o sea 23.050 € de coste
					 * base para una posición de 2.805 €. Eso viaja al coste medio, a la
					 * desviación y a la estimación de IRPF sin que salte un solo error.
					 *
					 * El resto del subsistema ya sabía distinguirlo: el parser de MyInvestor
					 * divide el importe entre las participaciones. Aquí se hace igual, mirando
					 * el vocabulario de la cabecera mapeada.
					 */
					const cabeceraPrecio = mapping.avgCost !== undefined && mapping.avgCost !== -1 && mapping.avgCost < headers.length
						? normalizeHeader(headers[mapping.avgCost])
						: '';
					const esImporteTotal = /\b(valor local|valor|importe|total|monto|proceeds|amount)\b/.test(cabeceraPrecio);

					unitPrice = esImporteTotal && Math.abs(sharesRaw) > 0
						? Math.abs(priceOrTotal) / Math.abs(sharesRaw)
						: Math.abs(priceOrTotal);
				}

				const currencyRaw = mapping.currency !== undefined && mapping.currency !== -1 && mapping.currency < row.length ? row[mapping.currency] : 'EUR';
				const currency = normalizeCurrency(currencyRaw) || 'EUR';

				transactions.push({
					date: finalDate,
					type,
					isin: isin || undefined,
					ticker: inferredTicker,
					name: name !== 'Activo desconocido' ? name : (inferredTicker || isin || 'Activo'),
					shares: finalShares,
					price: unitPrice,
					currency
				});
			} catch {
				skipRow(rowIdx, row, 'Error inesperado al parsear la transacción');
			}
		}

		const { positions, warnings: avisosAgregador } = reduceTransactionsToPositions(transactions);
		warnings.push(...avisosAgregador);
		return { positions, warnings, skipped: skippedDetails.length, skippedDetails };
	} else {
		// 2. Flujo instantánea de posiciones (Static positions list)
		let positions: ParsedPosition[] = [];

		for (const [rowIdx, row] of rows.entries()) {
			try {
				const shares = parseNumber(row[mapping.shares]);
				if (shares <= 0) {
					skipRow(rowIdx, row, `Cantidad <= 0 (valor: "${row[mapping.shares] || 'vacío'}")`);
					continue;
				}

				const isinRaw = mapping.isin !== undefined && mapping.isin !== -1 && mapping.isin < row.length ? row[mapping.isin] : '';
				let isin = isValidISIN(isinRaw) ? isinRaw.trim().toUpperCase() : '';
				const ticker = mapping.ticker !== undefined && mapping.ticker !== -1 && mapping.ticker < row.length ? row[mapping.ticker]?.trim() : undefined;
				const name = mapping.name !== undefined && mapping.name !== -1 && mapping.name < row.length ? row[mapping.name]?.trim() : (ticker || isin || 'Activo desconocido');

				if (!isin && name) {
					const ext = extractISIN(name);
					if (ext) isin = ext;
				}

				if (!isin && !ticker) {
					skipRow(rowIdx, row, 'Fila sin identificador (ISIN o Ticker) válido');
					continue;
				}

				const avgCost = mapping.avgCost !== undefined && mapping.avgCost !== -1 && mapping.avgCost < row.length ? parseNumber(row[mapping.avgCost]) : 0;
				const currency = mapping.currency !== undefined && mapping.currency !== -1 && mapping.currency < row.length ? row[mapping.currency]?.trim() || 'EUR' : 'EUR';

				positions.push({
					isin,
					ticker,
					name,
					shares,
					avgCost: Math.abs(avgCost),
					currency: normalizeCurrency(currency) || 'EUR'
				});
			} catch {
				skipRow(rowIdx, row, 'Error inesperado al parsear la posición');
			}
		}

		positions = aggregateParsedPositions(positions);
		return { positions, warnings, skipped: skippedDetails.length, skippedDetails };
	}
}

const genericDetector: BrokerDetector = {
	id: 'generic',
	name: 'CSV Genérico',
	icon: '📄',
	detect(headers) {
		const normalized = headers.map(normalizeHeader);
		const joined = normalized.join(' ');
		
		const hasIdentifier = ['isin', 'ticker', 'symbol', 'codigo'].some(m => joined.includes(m));
		const hasQuantity = ['shares', 'quantity', 'cantidad', 'participaciones', 'units', 'titulos', 'position', 'antal'].some(m => joined.includes(m));
		
		return (hasIdentifier && hasQuantity) ? 0.3 : 0;
	},
	parse(headers, rows) {
		const analysis = analyzeColumns(headers, rows);
		const mapping = suggestMappingFromAnalysis(analysis);
		return parseGenericCSVWithMapping(headers, rows, mapping);
	}
};

// ─── Motor Principal de Importación ─────────────────────────────────────

const ALL_DETECTORS: BrokerDetector[] = [
	degiroAccountStatementDetector,
	degiroDetector,
	trading212Detector,
	ibDetector,
	myinvestorDetector,
	genericDetector,
];

/**
 * Elige sobre qué bloque del CSV se trabaja, y con qué detector.
 *
 * ⚠️ Existe para que `importWithMapping` e `importFromCSV` no puedan elegir bloques
 * distintos, que es lo que pasaba. `importWithMapping` llamaba a `parseCSV`, que devuelve
 * el **primer** bloque, mientras que el mapeo que el usuario acababa de confirmar se había
 * construido sobre las cabeceras del bloque que `importFromCSV` eligió por confianza de
 * detector y le enseñó en `ColumnMapper`. En un CSV con una tabla de resumen arriba y las
 * posiciones debajo —el caso que parte `parseCSVBlocks` en dos—, el usuario mapeaba las
 * columnas del segundo bloque y se aplicaban al primero: los índices apuntaban a columnas
 * que significan otra cosa, así que o no salía ninguna posición («no se encontraron
 * posiciones» justo después de mapear bien), o entraban cifras del resumen como si fueran
 * participaciones.
 */
function seleccionarBloque(fileContent: string) {
	const blocks = parseCSVBlocks(fileContent);
	const delimiter = detectDelimiter(fileContent);

	let bestDetector: BrokerDetector = genericDetector;
	let bestConfidence = 0;
	let bestBlock: CSVBlock | undefined = blocks[0];

	for (const detector of ALL_DETECTORS) {
		for (const block of blocks) {
			const confidence = detector.detect(block.headers);
			if (confidence > bestConfidence) {
				bestConfidence = confidence;
				bestDetector = detector;
				bestBlock = block;
			}
		}
	}

	return { blocks, delimiter, bestDetector, bestConfidence, bestBlock };
}

/**
 * Parsea un CSV utilizando un mapeo manual de columnas definido por el usuario.
 */
export function importWithMapping(fileContent: string, mapping: MappingConfig): ImportResult {
	const { blocks, delimiter, bestBlock } = seleccionarBloque(fileContent);

	if (!bestBlock) {
		return {
			broker: { id: 'generic', name: 'Mapeo Manual', icon: '⚙️', confidence: 1 },
			positions: [],
			warnings: ['El archivo está vacío o no tiene un formato CSV válido.'],
			skippedRows: 0,
			delimiter
		};
	}

	const { positions, warnings, skipped, skippedDetails } =
		parseGenericCSVWithMapping(bestBlock.headers, bestBlock.rows, mapping);

	return {
		broker: { id: 'generic', name: 'Mapeo Manual', icon: '⚙️', confidence: 1 },
		positions,
		warnings,
		skippedRows: skipped,
		skippedDetails,
		rawHeaders: bestBlock.headers,
		rawRows: bestBlock.rows.slice(0, 10),
		delimiter,
		blocks
	};
}


/**
 * Punto de entrada principal: dado el contenido bruto de un archivo CSV,
 * detecta automáticamente el bróker y extrae las posiciones.
 */
export function importFromCSV(fileContent: string): ImportResult {
	const { blocks, delimiter, bestDetector, bestConfidence, bestBlock } = seleccionarBloque(fileContent);

	if (!bestBlock) {
		return {
			broker: { id: 'generic', name: 'Desconocido', icon: '❓', confidence: 0 },
			positions: [],
			warnings: ['El archivo está vacío o no tiene un formato CSV válido.'],
			skippedRows: 0,
			delimiter
		};
	}

	// Parsear con el mejor detector
	let result = bestDetector.parse(
		bestBlock.headers,
		bestBlock.rows,
		blocks
	);
	
	// Failsafe: Si el detector seleccionado no es genérico, pero ha devuelto 0 posiciones
	// en un archivo que sí contiene filas, lo tratamos como un falso positivo y recurrimos
	// al importador genérico inteligente.
	// NOTA: Si el detector devuelve totalTransactions > 0, significa que SÍ entendió el archivo
	// pero que las posiciones netas son 0 (ej: todo vendido), por lo que NO debemos caer al genérico.
	if (bestDetector.id !== 'generic' && result.positions.length === 0 && bestBlock.rows.length > 0 && (result.totalTransactions ?? 0) === 0) {
		const genericResult = genericDetector.parse(bestBlock.headers, bestBlock.rows, blocks);
		if (genericResult.positions.length > 0) {
			return {
				broker: { id: 'generic', name: 'CSV Genérico', icon: '📄', confidence: 0.1 },
				positions: genericResult.positions,
				warnings: [
					...result.warnings,
					`El detector automático sugirió '${bestDetector.name}' pero no pudo extraer activos de la tabla. Se ha utilizado el importador genérico como alternativa de respaldo.`
				],
				// ⚠️ Suma de los dos: el respaldo devolvía solo su propio contador y tiraba el
				// del bróker, así que las filas que el detector original había descartado —el
				// motivo por el que estamos en el failsafe— desaparecían del informe.
				skippedRows: result.skipped + genericResult.skipped,
				skippedDetails: [...(result.skippedDetails ?? []), ...(genericResult.skippedDetails ?? [])],
				rawHeaders: bestBlock.headers,
				rawRows: bestBlock.rows.slice(0, 10),
				delimiter,
				blocks
			};
		}
	}
	
	if (result.positions.length === 0 && result.skipped > 0) {
		result.warnings.push(`No se pudo extraer ninguna posición de las ${bestBlock.rows.length} filas del bloque/archivo.`);
	}
	
	return {
		broker: {
			id: bestDetector.id,
			name: bestDetector.name,
			icon: bestDetector.icon,
			confidence: bestConfidence,
		},
		positions: result.positions,
		warnings: result.warnings,
		skippedRows: result.skipped,
		skippedDetails: result.skippedDetails,
		rawHeaders: bestBlock.headers,
		rawRows: bestBlock.rows.slice(0, 10),
		delimiter,
		blocks
	};
}
