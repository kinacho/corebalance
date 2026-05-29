/**
 * Parsers específicos para cada bróker soportado.
 * Cada parser recibe headers + rows crudos y devuelve ParsedPosition[].
 */

import type { BrokerInfo, ParsedPosition, ImportResult, MappingConfig, SkippedDetail, Transaction, TransactionType, CSVBlock } from './types';
import {
	parseCSV, parseCSVBlocks, detectDelimiter, parseNumber, normalizeHeader,
	findField, isValidISIN, extractISIN,
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
	parse: (headers: string[], rows: string[][], blocks?: CSVBlock[]) => { positions: ParsedPosition[]; warnings: string[]; skipped: number; skippedDetails: SkippedDetail[] };
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

/** Parsea una fecha y hora con formato específico de DEGIRO */
function parseDegiroDate(dateStr: string, timeStr?: string): Date {
	const trimmed = dateStr.trim();
	if (!trimmed) return new Date();

	// Formato: DD-MM-YYYY o DD/MM/YYYY
	const parts = trimmed.split(/[-/]/);
	if (parts.length === 3) {
		const day = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10) - 1; // 0-indexed en JS
		const year = parseInt(parts[2], 10);

		if (timeStr && timeStr.trim()) {
			const timeParts = timeStr.trim().split(':');
			const hours = parseInt(timeParts[0], 10) || 0;
			const minutes = parseInt(timeParts[1], 10) || 0;
			const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
			return new Date(year, month, day, hours, minutes, seconds);
		}
		return new Date(year, month, day);
	}

	const ts = Date.parse(trimmed);
	return isNaN(ts) ? new Date() : new Date(ts);
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
		const joined = normalized.join(' ');

		// DEGIRO Account Statement exports have these specific headers:
		// ES: "Fecha,Hora,Fecha valor,Producto,ISIN,Descripción,Tipo,Variación,,Saldo,,ID Orden"
		// EN: "Date,Time,Value date,Product,ISIN,Description,FX,Change,,Balance,"
		// NL: "Datum,Tijd,Valutadatum,Product,ISIN,Omschrijving,FX,Mutatie,,Saldo,"
		const accountMarkers = [
			'fecha valor', 'value date', 'valutadatum',
			'descripcion', 'description', 'omschrijving',
			'variacion', 'change', 'mutatie',
			'saldo', 'balance',
			'id orden', 'order id',
			'tipo',  // column in ES export
		];
		const matches = accountMarkers.filter(m => joined.includes(m)).length;

		// Need at least 3 account-specific markers + also product/isin to confirm it's DEGIRO
		const hasCoreFields = joined.includes('isin') || joined.includes('producto') || joined.includes('product');
		const hasDescription = joined.includes('descripcion') || joined.includes('description') || joined.includes('omschrijving');
		// ES export has 'hora' (time) — strong signal
		const hasHora = joined.includes('hora') || joined.includes('tijd') || joined.includes('time');

		if (hasCoreFields && hasDescription && hasHora && matches >= 3) return 0.98;
		if (hasCoreFields && hasDescription && matches >= 3) return 0.97;
		if (hasCoreFields && hasDescription && matches >= 2) return 0.85;

		return 0;
	},
	parse(headers, rows) {
		const transactions: Transaction[] = [];
		const warnings: string[] = [];
		let skipped = 0;
		const skippedDetails: SkippedDetail[] = [];

		const skipRow = (rowIdx: number, row: string[], reason: string) => {
			skipped++;
			skippedDetails.push({
				rowNumber: rowIdx + 1,
				preview: row.filter(Boolean).slice(0, 3).join(' | '),
				reason,
			});
		};

		for (const [rowIdx, row] of rows.entries()) {
			try {
				// The description field contains the trade info
				const description = findField(headers, row, 'Descripción', 'Description', 'Omschrijving', 'Descripcion');
				const dateStr = findField(headers, row, 'Fecha', 'Date', 'Datum');
				const timeStr = findField(headers, row, 'Hora', 'Time', 'Tijd');
				const date = parseDegiroDate(dateStr, timeStr);

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
		const positions = reduceTransactionsToPositions(transactions);

		if (positions.length === 0 && rows.length > 0) {
			warnings.push('No se encontraron operaciones de compra/venta en el extracto de cuenta. Asegúrate de que el CSV contiene transacciones con formato "Compra/Venta X Nombre@Precio DIVISA (ISIN)".');
		}

		return { positions, warnings, skipped, skippedDetails };
	}
};

// ─── DEGIRO (Transactions / Portfolio) ──────────────────────────────────

const degiroDetector: BrokerDetector = {
	id: 'degiro',
	name: 'DEGIRO',
	icon: '🟠',
	detect(headers) {
		const normalized = headers.map(normalizeHeader);
		const joined = normalized.join(' ');
		
		// DEGIRO transaction exports (Dutch/English/Spanish)
		const degiroMarkers = ['producto', 'product', 'isin', 'cantidad', 'aantal', 'quantity',
			'koers', 'precio', 'bolsa', 'beurs', 'exchange', 'valor local', 'lokale waarde'];
		const matches = degiroMarkers.filter(m => joined.includes(m)).length;
		
		if (matches >= 3) return 0.95;
		if (matches >= 2) return 0.7;
		
		// DEGIRO Portfolio export
		const portfolioMarkers = ['producto', 'product', 'isin', 'cantidad', 'tamaño', 'size',
			'precio de cierre', 'slotkoers', 'closing price', 'valor en eur'];
		const portfolioMatches = portfolioMarkers.filter(m => joined.includes(m)).length;
		if (portfolioMatches >= 3) return 0.9;
		
		return 0;
	},
	parse(headers, rows) {
		const positions: ParsedPosition[] = [];
		const warnings: string[] = [];
		let skipped = 0;
		const skippedDetails: SkippedDetail[] = [];

		const skipRow = (rowIdx: number, row: string[], reason: string) => {
			skipped++;
			skippedDetails.push({
				rowNumber: rowIdx + 1,
				preview: row.filter(Boolean).slice(0, 3).join(' | '),
				reason,
			});
		};

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
						// Heurística: DEGIRO a veces pone la divisa en una columna con cabecera "Valor local" o similar
						const possibleIdx = headers.findIndex(h => {
							const n = normalizeHeader(h);
							return n.includes('valor local') || n.includes('precio de');
						});
						const possibleVal = potentialCurrency(row[possibleIdx]);
						if (possibleVal) {
							currency = possibleVal;
						} else {
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
					
					// Si tenemos el valor en EUR, lo preferimos para el coste total
					const totalCost = valorEUR > 0 ? valorEUR : (shares * price);
					const finalCurrency = valorEUR > 0 ? 'EUR' : (normalizeCurrency(currency || 'EUR') || 'EUR');

					if (shares > 0) {
						accumulated.set(isin, {
							name: name || isin,
							shares,
							totalCost,
							currency: finalCurrency,
						});
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

			return { positions, warnings, skipped, skippedDetails };
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
						const date = parseDegiroDate(dateStr, timeStr);

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

			const consolidated = reduceTransactionsToPositions(transactions);
			return { positions: consolidated, warnings, skipped, skippedDetails };
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
		let skipped = 0;
		const skippedDetails: SkippedDetail[] = [];

		const skipRow = (rowIdx: number, row: string[], reason: string) => {
			skipped++;
			skippedDetails.push({
				rowNumber: rowIdx + 1,
				preview: row.filter(Boolean).slice(0, 3).join(' | '),
				reason,
			});
		};
		
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
				
				const isBuy = action.includes('buy');
				const dateStr = findField(headers, row, 'Time', 'Date', 'Fecha');
				const date = dateStr ? new Date(dateStr) : new Date();

				transactions.push({
					date: isNaN(date.getTime()) ? new Date() : date,
					type: isBuy ? 'BUY' : 'SELL',
					isin,
					ticker: ticker || undefined,
					name: name || ticker || isin,
					shares,
					price: price || 0,
					currency,
				});
			} catch {
				skipRow(rowIdx, row, 'Error inesperado al procesar la fila');
			}
		}

		const consolidated = reduceTransactionsToPositions(transactions);
		return { positions: consolidated, warnings, skipped, skippedDetails };
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
		let skipped = 0;
		const skippedDetails: SkippedDetail[] = [];

		const skipRow = (rowIdx: number, row: string[], reason: string) => {
			skipped++;
			skippedDetails.push({
				rowNumber: rowIdx + 1,
				preview: row.filter(Boolean).slice(0, 3).join(' | '),
				reason,
			});
		};

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
						
						const dateStr = findField(block.headers, row, 'Date/Time', 'DateTime', 'Date', 'Fecha');
						const date = dateStr ? new Date(dateStr) : new Date();

						// Determinar el ISIN desde nuestro mapa acumulado o columna si existe
						let isin = findField(block.headers, row, 'ISIN');
						if (!isValidISIN(isin) && symbol) {
							isin = symbolToIsinMap.get(symbol.toUpperCase()) || '';
						}

						transactions.push({
							date: isNaN(date.getTime()) ? new Date() : date,
							type: qty > 0 ? 'BUY' : 'SELL',
							isin: isValidISIN(isin) ? isin : undefined,
							ticker: symbol,
							name: findField(block.headers, row, 'Description', 'Financial Instrument', 'Name') || symbol,
							shares: Math.abs(qty),
							price: price || 0,
							currency: normalizeCurrency(currency) || 'USD'
						});
					} catch {
						skipRow(rowIdx, row, 'Error inesperado al procesar fila de trade');
					}
				}
			}

			// Consolidar posiciones con coste medio ponderado
			const consolidated = reduceTransactionsToPositions(transactions);
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

		return { positions, warnings, skipped, skippedDetails };
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
		let skipped = 0;
		const skippedDetails: SkippedDetail[] = [];

		const skipRow = (rowIdx: number, row: string[], reason: string) => {
			skipped++;
			skippedDetails.push({
				rowNumber: rowIdx + 1,
				preview: row.filter(Boolean).slice(0, 3).join(' | '),
				reason,
			});
		};
		
		for (const [rowIdx, row] of rows.entries()) {
			try {
				// Ignorar transacciones que no estén finalizadas o ejecutadas
				const estado = findField(headers, row, 'Estado').toLowerCase();
				if (estado && !estado.includes('finalizada') && !estado.includes('ejecutad')) {
					skipRow(rowIdx, row, `Estado no procesable: "${estado}"`);
					continue;
				}

				let isin = findField(headers, row, 'ISIN', 'Código ISIN', 'Codigo ISIN');
				const name = findField(headers, row, 'Nombre fondo', 'Nombre del fondo', 'Producto', 'Nombre', 'Descripción');
				const tipoOpRaw = findField(headers, row, 'Tipo operación', 'Operación', 'Tipo');
				const tipoOp = tipoOpRaw ? tipoOpRaw.toLowerCase() : '';
				
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
				const date = parseDegiroDate(dateStr); // Utiliza el mismo parseador de DD/MM/YYYY o DD_MM_YYYY

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
		
		const consolidated = reduceTransactionsToPositions(transactions);
		return { positions: consolidated, warnings, skipped, skippedDetails };
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

// ─── Parser Genérico ────────────────────────────────────────────────────

const genericDetector: BrokerDetector = {
	id: 'generic',
	name: 'CSV Genérico',
	icon: '📄',
	detect(headers) {
		const normalized = headers.map(normalizeHeader);
		const joined = normalized.join(' ');
		
		// Buscar campos mínimos: algún identificador + alguna cantidad
		const hasIdentifier = ['isin', 'ticker', 'symbol', 'codigo'].some(m => joined.includes(m));
		const hasQuantity = ['shares', 'quantity', 'cantidad', 'participaciones', 'units', 'titulos', 'position'].some(m => joined.includes(m));
		
		return (hasIdentifier && hasQuantity) ? 0.3 : 0;
	},
	parse(headers, rows) {
		const analysis = analyzeColumns(headers, rows);
		const mapping = suggestMappingFromAnalysis(analysis);
		
		let positions: ParsedPosition[] = [];
		const warnings: string[] = [];
		let skipped = 0;
		const skippedDetails: SkippedDetail[] = [];

		const skipRow = (rowIdx: number, row: string[], reason: string) => {
			skipped++;
			skippedDetails.push({
				rowNumber: rowIdx + 1,
				preview: row.filter(Boolean).slice(0, 3).join(' | '),
				reason,
			});
		};
		
		for (const [rowIdx, row] of rows.entries()) {
			try {
				const shares = parseNumber(row[mapping.shares]);
				if (shares <= 0) { skipRow(rowIdx, row, `Cantidad <= 0 (valor: "${row[mapping.shares] || 'vacío'}")`); continue; }

				const isinRaw = mapping.isin !== undefined && mapping.isin !== -1 && mapping.isin < row.length ? row[mapping.isin] : '';
				const isin = isValidISIN(isinRaw) ? isinRaw.trim().toUpperCase() : '';
				const ticker = mapping.ticker !== undefined && mapping.ticker !== -1 && mapping.ticker < row.length ? row[mapping.ticker]?.trim() : undefined;
				const name = mapping.name !== undefined && mapping.name !== -1 && mapping.name < row.length ? row[mapping.name]?.trim() : (ticker || isin || 'Activo desconocido');
				const avgCost = mapping.avgCost !== undefined && mapping.avgCost !== -1 && mapping.avgCost < row.length ? parseNumber(row[mapping.avgCost]) : 0;
				const currency = mapping.currency !== undefined && mapping.currency !== -1 && mapping.currency < row.length ? row[mapping.currency]?.trim() || 'EUR' : 'EUR';

				if (!isin && !ticker) {
					skipRow(rowIdx, row, 'Sin ISIN ni ticker válidos');
					continue;
				}

				positions.push({
					isin,
					ticker,
					name,
					shares,
					avgCost,
					currency: normalizeCurrency(currency) || 'EUR'
				});
			} catch {
				skipRow(rowIdx, row, 'Error inesperado al procesar la fila');
			}
		}

		// Agregar posiciones duplicadas (ej: múltiples compras del mismo activo)
		positions = aggregateParsedPositions(positions);
		
		return { positions, warnings, skipped, skippedDetails };
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
 * Parsea un CSV utilizando un mapeo manual de columnas definido por el usuario.
 */
export function importWithMapping(fileContent: string, mapping: MappingConfig): ImportResult {
	const { headers, rows, delimiter } = parseCSV(fileContent);
	let positions: ParsedPosition[] = [];
	const warnings: string[] = [];
	let skipped = 0;

	for (const row of rows) {
		try {
			const shares = parseNumber(row[mapping.shares]);
			if (shares === 0) { skipped++; continue; }

			const isinRaw = mapping.isin !== undefined ? row[mapping.isin] : '';
			const isin = isValidISIN(isinRaw) ? isinRaw.trim().toUpperCase() : '';
			const ticker = mapping.ticker !== undefined ? row[mapping.ticker]?.trim() : undefined;
			const name = mapping.name !== undefined ? row[mapping.name]?.trim() : (ticker || isin || 'Activo desconocido');
			const avgCost = mapping.avgCost !== undefined ? parseNumber(row[mapping.avgCost]) : 0;
			const currency = mapping.currency !== undefined ? row[mapping.currency]?.trim() || 'EUR' : 'EUR';

			if (!isin && !ticker) {
				skipped++;
				continue;
			}

			positions.push({
				isin,
				ticker,
				name,
				shares,
				avgCost,
				currency
			});
		} catch {
			skipped++;
		}
	}

	// Agregar posiciones duplicadas
	positions = aggregateParsedPositions(positions);

	return {
		broker: { id: 'generic', name: 'Mapeo Manual', icon: '⚙️', confidence: 1 },
		positions,
		warnings,
		skippedRows: skipped,
		rawHeaders: headers,
		rawRows: rows.slice(0, 10),
		delimiter
	};
}


/**
 * Punto de entrada principal: dado el contenido bruto de un archivo CSV,
 * detecta automáticamente el bróker y extrae las posiciones.
 */
export function importFromCSV(fileContent: string): ImportResult {
	const blocks = parseCSVBlocks(fileContent);
	const delimiter = detectDelimiter(fileContent);
	
	if (blocks.length === 0) {
		return {
			broker: { id: 'generic', name: 'Desconocido', icon: '❓', confidence: 0 },
			positions: [],
			warnings: ['El archivo está vacío o no tiene un formato CSV válido.'],
			skippedRows: 0,
			delimiter
		};
	}
	
	// Detectar el bróker con mayor confianza recorriendo las cabeceras de todos los bloques
	let bestDetector: BrokerDetector = genericDetector;
	let bestConfidence = 0;
	let bestBlock = blocks[0];
	
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
	
	// Parsear con el mejor detector
	const { positions, warnings, skipped, skippedDetails } = bestDetector.parse(
		bestBlock.headers,
		bestBlock.rows,
		blocks
	);
	
	if (positions.length === 0 && skipped > 0) {
		warnings.push(`No se pudo extraer ninguna posición de las ${bestBlock.rows.length} filas del bloque/archivo.`);
	}
	
	return {
		broker: {
			id: bestDetector.id,
			name: bestDetector.name,
			icon: bestDetector.icon,
			confidence: bestConfidence,
		},
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
