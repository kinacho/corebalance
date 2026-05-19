/**
 * Utilidades de bajo nivel para parseo de CSV sin dependencias externas.
 * Soporta formatos europeos (separador decimal = coma) y americanos (separador decimal = punto).
 */

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

/** Parsea el contenido completo del CSV a un array de filas */
export function parseCSV(text: string): { headers: string[]; rows: string[][]; delimiter: string } {
	// Normalizar saltos de línea
	const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const lines = normalized.split('\n').filter(l => l.trim().length > 0);
	
	if (lines.length < 2) {
		return { headers: [], rows: [], delimiter: ',' };
	}
	
	const delimiter = detectDelimiter(normalized);
	const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim());
	const rows = lines.slice(1).map(line => parseCSVLine(line, delimiter));
	
	return { headers, rows, delimiter };
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
	
	// Eliminar símbolos de moneda y espacios
	cleaned = cleaned.replace(/[€$£¥CHF\s]/g, '');
	
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
		const idx = normalizedHeaders.findIndex(h => h.includes(normalized) || normalized.includes(h));
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
