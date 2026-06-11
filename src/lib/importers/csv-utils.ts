/**
 * Utilidades de bajo nivel para parseo de CSV sin dependencias externas.
 * Soporta formatos europeos (separador decimal = coma) y americanos (separador decimal = punto).
 */

import type { ColumnRole, ColumnAnalysis, MappingConfig, CSVBlock } from './types';

/** Detecta el delimitador principal del CSV (coma, punto y coma, o tabulador) */
export function detectDelimiter(text: string): string {
	const firstLines = text.split('\n').slice(0, 5).join('\n');
	
	const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
	
	// Contar delimitadores fuera de campos entrecomillados
	let inQuotes = false;
	for (const char of firstLines) {
		if (char === '"') { inQuotes = !inQuotes; continue; }
		if (!inQuotes && char in counts) {
			counts[char]++;
		}
	}
	
	// El punto y coma es muy común en CSVs europeos (DEGIRO, MyInvestor)
	if (counts[';'] > counts[','] && counts[';'] > counts['\t']) return ';';
	if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
	return ',';
}

/** Parsea una línea de CSV respetando campos entrecomillados */
export function parseCSVLine(line: string, delimiter: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;
	
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		
		if (char === '"') {
			if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
				// Escaped quote
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === delimiter && !inQuotes) {
			fields.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	
	fields.push(current.trim());
	return fields;
}

/** Detecta si la primera fila de un CSV es una cabecera comparando tipos con las filas siguientes */
export function detectHeaderRow(rows: string[][]): { hasHeader: boolean; headerRowIndex: number } {
	if (rows.length < 2) return { hasHeader: true, headerRowIndex: 0 };

	const firstRow = rows[0];
	const dataRows = rows.slice(1, Math.min(rows.length, 6));

	let headerTextCols = 0;
	let numericOrDateCols = 0;

	const numCols = Math.max(...rows.slice(0, 5).map(r => r.length));

	for (let colIdx = 0; colIdx < numCols; colIdx++) {
		const firstVal = firstRow[colIdx] || '';
		const dataVals = dataRows.map(r => r[colIdx] || '').filter(v => v.trim().length > 0);

		if (dataVals.length === 0) continue;

		// Verificar si el primer elemento parece texto de cabecera no numérico
		const isFirstValNumber = looksLikeNumericValue(firstVal);
		const isFirstValDate = looksLikeDateValue(firstVal);
		const isFirstValHeaderText = firstVal.trim().length > 0 && !isFirstValNumber && !isFirstValDate;

		// Contar tipos de datos subsiguientes
		let dataNumbers = 0;
		let dataDates = 0;
		for (const val of dataVals) {
			if (looksLikeNumericValue(val)) dataNumbers++;
			if (looksLikeDateValue(val)) dataDates++;
		}

		const isDataNumericOrDate = (dataNumbers / dataVals.length > 0.6) || (dataDates / dataVals.length > 0.6);

		if (isFirstValHeaderText && isDataNumericOrDate) {
			headerTextCols++;
		}
		if (isDataNumericOrDate) {
			numericOrDateCols++;
		}
	}

	// Heurística: si encontramos columnas con texto arriba y números/fechas abajo,
	// o si al menos la mitad de las columnas con números tienen texto en la primera fila.
	const hasHeader = headerTextCols > 0 || (headerTextCols >= numericOrDateCols / 2 && numericOrDateCols > 0);
	return { hasHeader, headerRowIndex: 0 };
}

/** Parsea el contenido completo del CSV en bloques de tablas según la estructura detectada */
export function parseCSVBlocks(text: string): CSVBlock[] {
	const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const lines = normalized.split('\n').filter(l => l.trim().length > 0);
	
	if (lines.length === 0) return [];
	
	const delimiter = detectDelimiter(normalized);
	
	// 1. Estrategia A (Prefijo de Sección / Estilo IBKR)
	let strategyACount = 0;
	const parsedLines = lines.map(line => parseCSVLine(line, delimiter));
	for (const row of parsedLines) {
		if (row.length >= 2) {
			const marker = row[1].toLowerCase();
			if (marker === 'header' || marker === 'data' || marker === 'total' || marker === 'subtotal') {
				strategyACount++;
			}
		}
	}
	
	const isStrategyA = strategyACount >= 3 && strategyACount >= parsedLines.length * 0.2;
	
	if (isStrategyA) {
		const blockMap = new Map<string, { headers: string[]; rows: string[][] }>();
		for (const row of parsedLines) {
			if (row.length >= 2) {
				const sectionName = row[0].trim();
				const marker = row[1].toLowerCase();
				if (sectionName && (marker === 'header' || marker === 'data')) {
					const fields = row.slice(2);
					if (marker === 'header') {
						if (!blockMap.has(sectionName)) {
							blockMap.set(sectionName, { headers: fields, rows: [] });
						} else {
							blockMap.get(sectionName)!.headers = fields;
						}
					} else if (marker === 'data') {
						let block = blockMap.get(sectionName);
						if (!block) {
							block = { headers: [], rows: [] };
							blockMap.set(sectionName, block);
						}
						block.rows.push(fields);
					}
				}
			}
		}
		
		const blocks: CSVBlock[] = [];
		for (const [name, data] of blockMap.entries()) {
			if (data.headers.length > 0 || data.rows.length > 0) {
				blocks.push({
					name,
					headers: data.headers,
					rows: data.rows
				});
			}
		}
		return blocks;
	}
	
	// 2. Estrategia B (Bloques por saltos de línea en blanco)
	const segments = normalized.split(/\n\s*\n/).filter(s => s.trim().length > 0);
	const blocks: CSVBlock[] = [];
	let blockIndex = 1;
	
	for (const segment of segments) {
		const segmentLines = segment.split('\n').filter(l => l.trim().length > 0);
		if (segmentLines.length === 0) continue;
		
		const segDelimiter = detectDelimiter(segment);
		const parsedRows = segmentLines.map(line => parseCSVLine(line, segDelimiter));
		
		const { hasHeader, headerRowIndex } = detectHeaderRow(parsedRows);
		
		let headers: string[] = [];
		let rows: string[][] = [];
		
		if (hasHeader && parsedRows.length > 0) {
			headers = parsedRows[headerRowIndex].map(h => h.trim());
			rows = parsedRows.slice(headerRowIndex + 1);
		} else {
			const numCols = Math.max(...parsedRows.map(r => r.length));
			headers = Array.from({ length: numCols }, (_, i) => `Columna ${i + 1}`);
			rows = parsedRows;
		}
		
		blocks.push({
			name: `Bloque ${blockIndex++}`,
			headers,
			rows
		});
	}
	
	return blocks;
}

/** Parsea el contenido completo del CSV a un array de filas detectando cabeceras de forma inteligente */
export function parseCSV(text: string): { headers: string[]; rows: string[][]; delimiter: string } {
	const delimiter = detectDelimiter(text);
	const blocks = parseCSVBlocks(text);
	if (blocks.length === 0) {
		return { headers: [], rows: [], delimiter };
	}
	
	// Buscar el bloque más relevante: "Trades", "Positions" o el que tenga más filas/columnas, o simplemente el primero.
	let bestBlock = blocks[0];
	for (const block of blocks) {
		const lowerName = block.name.toLowerCase();
		if (lowerName === 'trades' || lowerName === 'positions') {
			bestBlock = block;
			break;
		}
	}
	
	return {
		headers: bestBlock.headers,
		rows: bestBlock.rows,
		delimiter
	};
}

/**
 * Parsea un número con formato europeo o americano.
 * Ejemplos:
 *   "1.234,56"  → 1234.56 (formato europeo)
 *   "1,234.56"  → 1234.56 (formato americano)
 *   "1234.56"   → 1234.56
 *   "1234,56"   → 1234.56
 *   "-150,00"   → -150.00
 */
export function parseNumber(value: string): number {
	if (!value || typeof value !== 'string') return 0;
	
	let cleaned = value.trim();
	
	// Eliminar símbolos de moneda, letras y espacios (ej: "560 EUR" -> "560")
	cleaned = cleaned.replace(/[^\d.,-]/g, '');
	
	if (cleaned === '' || cleaned === '-') return 0;
	
	// Detectar formato: si hay coma después del último punto, es europeo
	const lastComma = cleaned.lastIndexOf(',');
	const lastDot = cleaned.lastIndexOf('.');
	
	if (lastComma > lastDot) {
		// Formato europeo: 1.234,56 → quitar puntos, reemplazar coma por punto
		cleaned = cleaned.replace(/\./g, '').replace(',', '.');
	} else if (lastDot > lastComma) {
		// Formato americano: 1,234.56 → quitar comas
		cleaned = cleaned.replace(/,/g, '');
	} else if (lastComma !== -1 && lastDot === -1) {
		// Solo coma, sin punto: podría ser "1234,56" (europeo) o "1,234" (americano con miles)
		// Heurística: si hay exactamente 2 dígitos tras la coma, es decimal europeo
		const afterComma = cleaned.substring(lastComma + 1);
		if (afterComma.length <= 2) {
			cleaned = cleaned.replace(',', '.');
		} else {
			// Separador de miles americano (ej: "1,234")
			cleaned = cleaned.replace(',', '');
		}
	}
	
	const result = parseFloat(cleaned);
	return isNaN(result) ? 0 : result;
}

/** Normaliza una cabecera para comparación flexible (lowercase, sin acentos, sin espacios extra) */
export function normalizeHeader(header: string): string {
	return header
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // quitar acentos
		.replace(/[^a-z0-9]/g, ' ')      // solo alfanuméricos
		.replace(/\s+/g, ' ')
		.trim();
}

/** Busca un campo en una fila usando múltiples nombres posibles para la cabecera */
export function findField(headers: string[], row: string[], ...possibleNames: string[]): string {
	const normalizedHeaders = headers.map(normalizeHeader);
	
	for (const name of possibleNames) {
		const normalized = normalizeHeader(name);
		const idx = normalizedHeaders.indexOf(normalized);
		if (idx !== -1 && idx < row.length) {
			return row[idx];
		}
	}
	
	// Búsqueda parcial (contiene)
	for (const name of possibleNames) {
		const normalized = normalizeHeader(name);
		const idx = normalizedHeaders.findIndex(h => h.includes(normalized));
		if (idx !== -1 && idx < row.length) {
			return row[idx];
		}
	}
	
	return '';
}

/** Valida que un ISIN tiene el formato correcto (2 letras + 9 alfanuméricos + 1 dígito control) */
export function isValidISIN(value: string): boolean {
	return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(value.trim().toUpperCase());
}

/** Extrae un ISIN de un string que puede contener más texto */
export function extractISIN(text: string): string | null {
	const match = text.match(/\b([A-Z]{2}[A-Z0-9]{9}[0-9])\b/i);
	return match ? match[1].toUpperCase() : null;
}


/** Normaliza códigos y símbolos de divisa comunes a formato estándar ISO de 3 letras */
export function normalizeCurrency(value: string): string | null {
	const v = value.trim().toUpperCase();
	if (!v) return null;
	if (/^[A-Z]{3}$/.test(v)) return v;
	if (/€|eur/.test(v)) return 'EUR';
	if (/\$|usd/.test(v)) return 'USD';
	if (/£|gbp/.test(v)) return 'GBP';
	return v;
}

/** Comprueba si una cadena de texto tiene la forma estructural de un ISIN */
export function looksLikeIsinValue(value: string): boolean {
	const v = value.trim().toUpperCase();
	if (!/^[A-Z0-9]{12}$/.test(v)) return false;
	if (!/^[A-Z]{2}/.test(v)) return false;
	return true;
}

/** Comprueba si una cadena de texto tiene la forma estructural de un Ticker */
export function looksLikeTickerValue(value: string): boolean {
	const v = value.trim().toUpperCase();
	if (!v) return false;
	if (!/^[A-Z0-9.\-]+$/.test(v)) return false;
	if (v.length > 8) return false;
	if (looksLikeIsinValue(v)) return false;
	if (/^[0-9.,\-]+$/.test(v)) return false; // No debe ser un número puro
	if (!/[A-Z]/.test(v)) return false; // Debe tener al menos una letra
	return true;
}

/** Comprueba si una cadena de texto parece un valor numérico */
export function looksLikeNumericValue(value: string): boolean {
	const v = value.trim();
	if (!v) return false;
	return /^[+-]?[\d.,\s$€£¥]+$/.test(v);
}

/** Comprueba si una cadena de texto parece representar una fecha */
export function looksLikeDateValue(value: string): boolean {
	const v = value.trim();
	if (!v) return false;
	if (/^[a-fA-F0-9]{16,40}$/.test(v)) return false; // Evitar hashes alfanuméricos largos
	if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}(\s+\d{2}:\d{2}(:\d{2})?)?$/.test(v)) return true;
	const ts = Date.parse(v);
	return !isNaN(ts);
}

/** Analiza las columnas de un CSV para calcular probabilidades de rol por columna */
export function analyzeColumns(headers: string[], rows: string[][]): ColumnAnalysis[] {
	const sampleRows = rows.slice(0, 50);
	const numCols = headers.length;

	return headers.map((header, colIdx) => {
		const normalized = normalizeHeader(header);
		const sampleValues = sampleRows.map(r => r[colIdx] || '').filter(v => v.trim().length > 0);

		const scores: Record<ColumnRole, number> = {
			isin: 0,
			ticker: 0,
			name: 0,
			quantity: 0,
			price: 0,
			currency: 0,
			date: 0,
			type: 0,
			ignored: 0
		};

		if (sampleValues.length > 0) {
			// 1. ISIN
			let isinCount = 0;
			for (const val of sampleValues) {
				if (looksLikeIsinValue(val)) isinCount++;
			}
			const isinRatio = isinCount / sampleValues.length;
			let isinScore = 0;
			if (normalized.includes('isin')) isinScore += 0.6;
			if (isinRatio > 0.8) isinScore += 0.4;
			scores.isin = isinScore;

			// 2. Ticker
			let tickerCount = 0;
			for (const val of sampleValues) {
				if (looksLikeTickerValue(val)) tickerCount++;
			}
			const tickerRatio = tickerCount / sampleValues.length;
			let tickerScore = 0;
			if (/\b(ticker|symbol|simbolo|sym|epic|codigo|code)\b/i.test(normalized)) tickerScore += 0.5;
			if (tickerRatio > 0.8) tickerScore += 0.5;
			scores.ticker = tickerScore;

			// 3. Cantidad
			let numCount = 0;
			for (const val of sampleValues) {
				if (looksLikeNumericValue(val)) numCount++;
			}
			const numRatio = numCount / sampleValues.length;
			let qtyScore = 0;
			if (/\b(shares|quantity|cantidad|participaciones|units|posicion|position|size|tamaño|volumen|volume|titulos|acciones|antal|amount|importe|fiat|n|no|num)\b/i.test(normalized)) qtyScore += 0.5;
			if (numRatio > 0.8) qtyScore += 0.4;
			scores.quantity = qtyScore;

			// 4. Precio
			let priceScore = 0;
			if (/\b(price|precio|avg|average|cost|coste|valor|value|importe|monto|amount|kurs)\b/i.test(normalized)) priceScore += 0.5;
			if (numRatio > 0.8) priceScore += 0.3;
			const currencySymbolCount = sampleValues.filter(v => /[\$€£]/.test(v)).length;
			if (currencySymbolCount / sampleValues.length > 0.5) priceScore += 0.2;
			scores.price = priceScore;

			// 5. Divisa
			let curCount = 0;
			for (const val of sampleValues) {
				if (normalizeCurrency(val) !== null) curCount++;
			}
			const curRatio = curCount / sampleValues.length;
			let curScore = 0;
			if (/\b(currency|divisa|cur|moneda|valuta)\b/i.test(normalized)) curScore += 0.6;
			if (curRatio > 0.8) curScore += 0.4;
			scores.currency = curScore;

			// 6. Nombre
			let textCount = 0;
			for (const val of sampleValues) {
				const v = val.trim();
				if (v.length > 3 && !looksLikeIsinValue(v) && !looksLikeTickerValue(v) && !looksLikeNumericValue(v)) {
					textCount++;
				}
			}
			const textRatio = textCount / sampleValues.length;
			let nameScore = 0;
			if (/\b(name|nombre|producto|product|descripcion|description|asset|activo|security|instrumento|instrument|vardepapper)\b/i.test(normalized)) nameScore += 0.5;
			if (textRatio > 0.6) nameScore += 0.5;
			scores.name = nameScore;

			// 7. Fecha
			let dateCount = 0;
			for (const val of sampleValues) {
				if (looksLikeDateValue(val)) dateCount++;
			}
			const dateRatio = dateCount / sampleValues.length;
			let dateScore = 0;
			if (/\b(date|fecha|datum|tijd|time|hora|timestamp)\b/i.test(normalized)) dateScore += 0.5;
			if (dateRatio > 0.8) dateScore += 0.5;
			scores.date = dateScore;

			// 8. Tipo de operación (BUY/SELL)
			let typeCount = 0;
			for (const val of sampleValues) {
				const v = val.trim().toLowerCase();
				if (v === 'buy' || v === 'sell' || v === 'compra' || v === 'venta' || v === 'suscripcion' || v === 'reembolso' || v === 'trade' || v === 'deposit' || v === 'withdrawal' || v === 'staking' || v === 'transfer' || v === 'kop' || v === 'salj') {
					typeCount++;
				}
			}
			const typeRatio = typeCount / sampleValues.length;
			let typeScore = 0;
			if (/\b(type|tipo|action|operation|operacion|event|eventos|category|categoria|transaction type|activity|typ av transaktion|transaktie|buy\s*sell|buy|sell|direction)\b/i.test(normalized)) typeScore += 0.5;
			if (typeRatio > 0.4) typeScore += 0.5;
			scores.type = typeScore;

			// 9. Heurística para columnas descriptivas con '@' (ej. Saxo Bank, DEGIRO)
			let atCount = 0;
			for (const val of sampleValues) {
				if (/@/.test(val) && /\b(buy|sell|koop|verkoop|kop|salj|compra|venta)\b/i.test(val)) {
					atCount++;
				}
			}
			if (atCount > 0) {
				scores.quantity = Math.max(scores.quantity, 0.85);
				scores.price = Math.max(scores.price, 0.85);
				scores.type = Math.max(scores.type, 0.8);
			}
		}

		return {
			index: colIdx,
			header,
			normalizedHeader: normalized,
			sampleValues,
			roleScores: scores
		};
	});
}

/** Sugiere un MappingConfig óptimo basado en las puntuaciones del análisis de columnas */
export function suggestMappingFromAnalysis(analysis: ColumnAnalysis[]): MappingConfig {
	const pickBest = (role: ColumnRole): number => {
		const candidates = analysis
			.map(col => ({ index: col.index, score: col.roleScores[role] ?? 0 }))
			.filter(c => c.score > 0.25)
			.sort((a, b) => b.score - a.score);

		if (!candidates.length) return -1;

		const [best, second] = candidates;
		if (second && best.score - second.score < 0.1) {
			// Empate o muy similar -> forzar confirmación manual
			return -1;
		}

		return best.index;
	};

	const shares = pickBest('quantity');

	return {
		shares: shares !== -1 ? shares : 0, // La cantidad es obligatoria, fallback a primera columna
		isin: pickBest('isin') !== -1 ? pickBest('isin') : undefined,
		ticker: pickBest('ticker') !== -1 ? pickBest('ticker') : undefined,
		name: pickBest('name') !== -1 ? pickBest('name') : undefined,
		avgCost: pickBest('price') !== -1 ? pickBest('price') : undefined,
		currency: pickBest('currency') !== -1 ? pickBest('currency') : undefined,
		date: pickBest('date') !== -1 ? pickBest('date') : undefined,
		type: pickBest('type') !== -1 ? pickBest('type') : undefined
	};
}

/** Genera una firma única y estable para un diseño/estructura de CSV dado */
export function generateCsvSignature(headers: string[], rows: string[][]): string {
	const colCount = headers.length;
	const headerString = headers.map(normalizeHeader).join('|');
	const sampleRows = rows.slice(0, 5);
	const types: string[] = [];

	for (let colIdx = 0; colIdx < colCount; colIdx++) {
		let numCount = 0;
		let dateCount = 0;
		const vals = sampleRows.map(r => r[colIdx] || '').filter(v => v.trim().length > 0);
		for (const val of vals) {
			if (looksLikeNumericValue(val)) numCount++;
			if (looksLikeDateValue(val)) dateCount++;
		}
		const total = vals.length || 1;
		if (numCount / total > 0.6) types.push('N');
		else if (dateCount / total > 0.6) types.push('D');
		else types.push('T');
	}
	const typeString = types.join('');
	return `${colCount}_${typeString}_${headerString}`;
}
