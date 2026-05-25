/**
 * Parsers específicos para cada bróker soportado.
 * Cada parser recibe headers + rows crudos y devuelve ParsedPosition[].
 */

import type { BrokerInfo, ParsedPosition, ImportResult, MappingConfig } from './types';
import {
	parseCSV, parseNumber, normalizeHeader,
	findField, isValidISIN, extractISIN
} from './csv-utils';

// ─── Detección de Bróker ────────────────────────────────────────────────

interface BrokerDetector {
	id: BrokerInfo['id'];
	name: string;
	icon: string;
	/** Devuelve confianza 0-1 de que las cabeceras pertenecen a este bróker */
	detect: (headers: string[]) => number;
	/** Parsea las filas del CSV para este bróker */
	parse: (headers: string[], rows: string[][]) => { positions: ParsedPosition[]; warnings: string[]; skipped: number };
}

// ─── DEGIRO ─────────────────────────────────────────────────────────────

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
		
		// Acumular posiciones por ISIN (DEGIRO puede tener múltiples transacciones por activo)
		const accumulated = new Map<string, { name: string; shares: number; totalCost: number; currency: string; ticker?: string }>();
		
		for (const row of rows) {
			try {
				// Buscar ISIN (siempre presente en DEGIRO)
				let isin = findField(headers, row, 'ISIN');
				
				// A veces el ISIN está dentro del campo Producto
				if (!isValidISIN(isin)) {
					const product = findField(headers, row, 'Producto', 'Product');
					const extracted = extractISIN(product);
					if (extracted) isin = extracted;
				}
				
				if (!isValidISIN(isin)) {
					skipped++;
					continue;
				}
				
				const name = findField(headers, row, 'Producto', 'Product', 'Nombre');
				
				// Intentar detectar si es un portfolio snapshot o transacciones
				const closingPrice = findField(headers, row, 'Precio de cierre', 'Slotkoers', 'Closing price', 'Closing');
				
				if (closingPrice) {
					// Portfolio snapshot: una fila = una posición actual
					const shares = parseNumber(findField(headers, row, 'Cantidad', 'Aantal', 'Quantity', 'Tamaño', 'Size'));
					const price = parseNumber(closingPrice);
					const currency = findField(headers, row, 'Moneda', 'Currency', 'Valuta') || 'EUR';
					
					if (shares > 0) {
						accumulated.set(isin, {
							name: name || isin,
							shares,
							totalCost: shares * price,
							currency,
						});
					}
				} else {
					// Transaction history: acumular compras/ventas
					const sharesRaw = parseNumber(findField(headers, row, 'Cantidad', 'Aantal', 'Quantity', 'Number'));
					const price = parseNumber(findField(headers, row, 'Precio', 'Koers', 'Price', 'Koers'));
					const currency = findField(headers, row, 'Moneda', 'Currency', 'Valuta') || 'EUR';
					
					if (sharesRaw !== 0 && price > 0) {
						const existing = accumulated.get(isin);
						if (existing) {
							existing.shares += sharesRaw;
							existing.totalCost += sharesRaw * price;
						} else {
							accumulated.set(isin, {
								name: name || isin,
								shares: sharesRaw,
								totalCost: sharesRaw * price,
								currency,
							});
						}
					} else {
						skipped++;
					}
				}
			} catch {
				skipped++;
			}
		}
		
		// Convertir acumulados a posiciones
		for (const [isin, data] of accumulated) {
			if (data.shares > 0) {
				positions.push({
					isin,
					name: data.name,
					shares: Math.abs(data.shares),
					avgCost: data.shares > 0 ? Math.abs(data.totalCost / data.shares) : 0,
					currency: data.currency,
				});
			} else if (data.shares < 0) {
				warnings.push(`"${data.name}" tiene posición neta negativa (${data.shares}), omitida.`);
			}
			// shares === 0 → posición cerrada, ignorar silenciosamente
		}
		
		return { positions, warnings, skipped };
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
		const positions: ParsedPosition[] = [];
		const warnings: string[] = [];
		let skipped = 0;
		
		const accumulated = new Map<string, { name: string; shares: number; totalCost: number; currency: string; ticker?: string }>();
		
		for (const row of rows) {
			try {
				const action = findField(headers, row, 'Action').toLowerCase();
				
				// Solo procesar operaciones de compra/venta que afectan a activos
				if (!action.includes('buy') && !action.includes('sell')) {
					skipped++;
					continue;
				}

				const isin = findField(headers, row, 'ISIN');
				const ticker = findField(headers, row, 'Ticker');
				const name = findField(headers, row, 'Name');
				const shares = parseNumber(findField(headers, row, 'No. of shares', 'No of shares'));
				const price = parseNumber(findField(headers, row, 'Price / share', 'Price share'));
				const currency = findField(headers, row, 'Currency (Price / share)', 'Currency Price share') || 'EUR';
				
				if (!isValidISIN(isin) || shares === 0) {
					skipped++;
					continue;
				}
				
				// Determinar dirección: positivo para compras, negativo para ventas
				const isBuy = action.includes('buy');
				const multiplier = isBuy ? 1 : -1;
				
				const existing = accumulated.get(isin);
				if (existing) {
					existing.shares += shares * multiplier;
					existing.totalCost += shares * price * multiplier;
					if (ticker) existing.ticker = ticker;
				} else {
					accumulated.set(isin, {
						name: name || ticker || isin,
						shares: shares * multiplier,
						totalCost: shares * price * multiplier,
						currency,
						ticker: ticker || undefined,
					});
				}
			} catch {
				skipped++;
			}
		}
		
		for (const [isin, data] of accumulated) {
			if (data.shares > 0.0001) {
				positions.push({
					isin,
					ticker: data.ticker,
					name: data.name,
					shares: data.shares,
					avgCost: data.shares > 0 ? (data.totalCost / data.shares) : 0,
					currency: data.currency,
				});
			}
		}
		
		return { positions, warnings, skipped };
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
	parse(headers, rows) {
		const positions: ParsedPosition[] = [];
		const warnings: string[] = [];
		let skipped = 0;
		
		// IB suele ser snapshot de posiciones o trades  
		const isSnapshot = headers.some(h => normalizeHeader(h).includes('position') || normalizeHeader(h).includes('market value'));
		
		if (isSnapshot) {
			for (const row of rows) {
				try {
					const symbol = findField(headers, row, 'Symbol', 'Ticker');
					const positionSize = parseNumber(findField(headers, row, 'Position', 'Quantity'));
					const avgCost = parseNumber(findField(headers, row, 'Average Cost', 'Avg Cost', 'Cost Basis Per Share'));
					const currency = findField(headers, row, 'Currency') || 'USD';
					
					// Intentar obtener ISIN si disponible
					const isin = findField(headers, row, 'ISIN');
					
					if (positionSize <= 0 || !symbol) {
						skipped++;
						continue;
					}
					
					positions.push({
						isin: isValidISIN(isin) ? isin : '',
						ticker: symbol,
						name: findField(headers, row, 'Description', 'Financial Instrument', 'Name') || symbol,
						shares: positionSize,
						avgCost: avgCost > 0 ? avgCost : 0,
						currency,
					});
				} catch {
					skipped++;
				}
			}
		} else {
			// Trade history: acumular
			const accumulated = new Map<string, { name: string; shares: number; totalCost: number; currency: string }>();
			
			for (const row of rows) {
				try {
					const symbol = findField(headers, row, 'Symbol', 'Ticker');
					const qty = parseNumber(findField(headers, row, 'Quantity', 'Qty'));
					const price = parseNumber(findField(headers, row, 'T. Price', 'Trade Price', 'Price'));
					const currency = findField(headers, row, 'Currency') || 'USD';
					
					if (!symbol || qty === 0) { skipped++; continue; }
					
					const existing = accumulated.get(symbol);
					if (existing) {
						existing.shares += qty;
						existing.totalCost += qty * price;
					} else {
						accumulated.set(symbol, { name: symbol, shares: qty, totalCost: qty * price, currency });
					}
				} catch {
					skipped++;
				}
			}
			
			for (const [symbol, data] of accumulated) {
				if (data.shares > 0) {
					positions.push({
						isin: '',
						ticker: symbol,
						name: data.name,
						shares: data.shares,
						avgCost: data.totalCost / data.shares,
						currency: data.currency,
					});
				}
			}
		}
		
		return { positions, warnings, skipped };
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
		const positions: ParsedPosition[] = [];
		const warnings: string[] = [];
		let skipped = 0;
		
		const accumulated = new Map<string, { name: string; shares: number; totalCost: number; currency: string }>();
		
		for (const row of rows) {
			try {
				// Ignorar transacciones que no estén finalizadas o ejecutadas
				const estado = findField(headers, row, 'Estado').toLowerCase();
				if (estado && !estado.includes('finalizada') && !estado.includes('ejecutad')) {
					skipped++;
					continue;
				}

				let isin = findField(headers, row, 'ISIN', 'Código ISIN', 'Codigo ISIN');
				const name = findField(headers, row, 'Nombre fondo', 'Nombre del fondo', 'Producto', 'Nombre', 'Descripción');
				const tipoOp = findField(headers, row, 'Tipo operación', 'Operación', 'Tipo').toLowerCase();
				
				// Extraer ISIN del nombre si no hay campo dedicado
				if (!isValidISIN(isin) && name) {
					const extracted = extractISIN(name);
					if (extracted) isin = extracted;
				}
				
				if (!isValidISIN(isin)) {
					skipped++;
					continue;
				}
				
				const shares = parseNumber(findField(headers, row,
					'Participaciones', 'Títulos', 'Titulos', 'Cantidad', 'participaciones', 'Nº participaciones'));
				
				// Determinar dirección: positivo para suscripciones/traspasos entrada/compras, negativo para reembolsos/traspasos salida/ventas
				const isIncrease = tipoOp.includes('suscripcion') || tipoOp.includes('entrada') || tipoOp.includes('compra') || tipoOp.includes('aportacion');
				const isDecrease = tipoOp.includes('reembolso') || tipoOp.includes('salida') || tipoOp.includes('venta');
				
				const multiplier = isIncrease ? 1 : (isDecrease ? -1 : 1); // Por defecto aumento si no se detecta
				
				const importeTotal = parseNumber(findField(headers, row,
					'Importe neto', 'Importe bruto', 'Importe', 'Valoracion', 'Valoración'));

				// Si el usuario añadió "Precio Medio" manualmente, intentamos usarlo
				const manualAvgCost = parseNumber(findField(headers, row, 'Precio medio', 'Coste medio', 'Precio de compra'));

				// Calculamos coste unitario si es suscripción
				let costPerShare = 0;
				if (manualAvgCost > 0) {
					costPerShare = manualAvgCost;
				} else if (isIncrease && shares > 0 && importeTotal > 0) {
					costPerShare = importeTotal / shares;
				}

				const existing = accumulated.get(isin);
				if (existing) {
					existing.shares += (shares * multiplier);
					// Solo ajustamos coste si es compra/entrada
					if (isIncrease) {
						// Si ya tenemos coste previo, hacemos media ponderada
						if (existing.totalCost > 0) {
							existing.totalCost += (shares * costPerShare);
						} else {
							existing.totalCost = (existing.shares * costPerShare);
						}
					}
				} else {
					accumulated.set(isin, {
						name: name || isin,
						shares: (shares * multiplier),
						totalCost: isIncrease ? (shares * costPerShare) : 0,
						currency: 'EUR',
					});
				}

			} catch {
				skipped++;
			}
		}
		
		for (const [isin, data] of accumulated) {
			if (data.shares > 0.0001) { // Pequeño margen para errores de redondeo
				positions.push({
					isin,
					name: data.name,
					shares: data.shares,
					avgCost: data.shares > 0 ? (data.totalCost / data.shares) : 0,
					currency: data.currency,
				});
			}
		}
		
		return { positions, warnings, skipped };
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
		let positions: ParsedPosition[] = [];
		const warnings: string[] = [];
		let skipped = 0;
		
		for (const row of rows) {
			try {
				const isin = findField(headers, row, 'ISIN', 'Código ISIN');
				const ticker = findField(headers, row, 'Ticker', 'Symbol', 'Símbolo', 'Codigo');
				const name = findField(headers, row, 'Name', 'Nombre', 'Product', 'Producto', 'Description');
				const shares = parseNumber(findField(headers, row,
					'Shares', 'Quantity', 'Cantidad', 'Participaciones', 'Units', 'Position', 'Títulos', 'Participaciones actuales'));
				const avgCost = parseNumber(findField(headers, row,
					'Avg Cost', 'Average Cost', 'Price', 'Precio', 'Precio medio', 'Cost', 'Precio de compra'));
				const currency = findField(headers, row, 'Currency', 'Moneda', 'Divisa') || 'EUR';
				
				if (!isin && !ticker) { skipped++; continue; }
				if (shares <= 0) { skipped++; continue; }
				
				positions.push({
					isin: isValidISIN(isin) ? isin : '',
					ticker: ticker || undefined,
					name: name || ticker || isin,
					shares,
					avgCost: avgCost > 0 ? avgCost : 0,
					currency,
				});
			} catch {
				skipped++;
			}
		}

		// Agregar posiciones duplicadas (ej: múltiples compras del mismo activo)
		positions = aggregateParsedPositions(positions);
		
		return { positions, warnings, skipped };
	}
};

// ─── Motor Principal de Importación ─────────────────────────────────────

const ALL_DETECTORS: BrokerDetector[] = [
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
	const { headers, rows, delimiter } = parseCSV(fileContent);
	
	if (headers.length === 0 || rows.length === 0) {
		return {
			broker: { id: 'generic', name: 'Desconocido', icon: '❓', confidence: 0 },
			positions: [],
			warnings: ['El archivo está vacío o no tiene un formato CSV válido.'],
			skippedRows: 0,
		};
	}
	
	// Detectar el bróker con mayor confianza
	let bestDetector: BrokerDetector = genericDetector;
	let bestConfidence = 0;
	
	for (const detector of ALL_DETECTORS) {
		const confidence = detector.detect(headers);
		if (confidence > bestConfidence) {
			bestConfidence = confidence;
			bestDetector = detector;
		}
	}
	
	// Parsear con el mejor detector
	const { positions, warnings, skipped } = bestDetector.parse(headers, rows);
	
	if (positions.length === 0 && skipped > 0) {
		warnings.push(`No se pudo extraer ninguna posición de las ${rows.length} filas del archivo.`);
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
		rawHeaders: headers,
		rawRows: rows.slice(0, 10), // Guardar solo las primeras 10 para previsualización ligera
		delimiter: delimiter,
	};
}
