/**
 * Tests para parsers.ts — basados en el Account.csv real de DEGIRO.
 *
 * Casos cubiertos:
 *  1. Compra/venta con @ sin espacios: "Compra 100 Name@1,835 EUR (ISIN)"
 *  2. Compra/venta con @ con espacios: "Compra 15 Name @ 0,4 USD (ISIN)"
 *  3. STOCK SPLIT pair (split-in y split-out)
 *  4. Filas no comerciales (depósitos, comisiones, transferencias) → ignoradas
 *  5. Posición completamente vendida → share netas ≈ 0 → omitida silenciosamente
 *  6. Detección correcta de headers del Account.csv ES
 */

import { describe, it, expect } from 'vitest';
import { 
  importFromCSV, detectHeaderRow, analyzeColumns, 
  suggestMappingFromAnalysis, normalizeCurrency, looksLikeIsinValue,
  parseCSVBlocks
} from './index';

// ────────────────────────────────────────────────────────────────────────────
// Helpers de construcción de CSV
// ────────────────────────────────────────────────────────────────────────────

const ACCOUNT_HEADERS = 'Fecha,Hora,Fecha valor,Producto,ISIN,Descripción,Tipo,Variación,,Saldo,,ID Orden';

function makeRow(fields: {
  fecha?: string;
  hora?: string;
  fechaValor?: string;
  producto?: string;
  isin?: string;
  descripcion?: string;
  tipo?: string;
  variacion?: string;
  varCurrency?: string;
  saldo?: string;
  saldoCurrency?: string;
  idOrden?: string;
}): string {
  const f = fields;
  const varStr = f.variacion ? `${f.varCurrency ?? 'EUR'},"${f.variacion}"` : `${f.varCurrency ?? 'EUR'},`;
  const saldoStr = f.saldo ? `${f.saldoCurrency ?? 'EUR'},"${f.saldo}"` : `${f.saldoCurrency ?? 'EUR'},`;
  return [
    f.fecha ?? '01-01-2025',
    f.hora ?? '10:00',
    f.fechaValor ?? '01-01-2025',
    f.producto ?? '',
    f.isin ?? '',
    f.descripcion ? `"${f.descripcion}"` : '',
    f.tipo ?? '',
    varStr,
    saldoStr,
    f.idOrden ?? '',
  ].join(',');
}

function makeCsv(rows: string[]): string {
  return [ACCOUNT_HEADERS, ...rows].join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Suite principal
// ────────────────────────────────────────────────────────────────────────────

describe('DEGIRO Account Statement parser', () => {

  // ── 1. Compra con formato sin espacios alrededor de @ ──────────────────

  it('parsea compra con formato "Name@Price" (sin espacios)', () => {
    const csv = makeCsv([
      makeRow({
        producto: 'QUANTUM EMOTION CORP',
        isin: 'CA74767K1030',
        descripcion: 'Compra 100 Quantum eMotion Corp@1,835 EUR (CA74767K1030)',
        variacion: '-183,50',
        varCurrency: 'EUR',
      }),
    ]);

    const result = importFromCSV(csv);
    expect(result.broker.id).toBe('degiro');
    expect(result.positions).toHaveLength(1);
    const pos = result.positions[0];
    expect(pos.isin).toBe('CA74767K1030');
    expect(pos.shares).toBeCloseTo(100, 4);
    expect(pos.avgCost).toBeCloseTo(1.835, 4);
    expect(pos.currency).toBe('EUR');
  });

  // ── 2. Compra con formato con espacios alrededor de @ ─────────────────

  it('parsea compra con formato "Name @ Price" (con espacios)', () => {
    const csv = makeCsv([
      makeRow({
        producto: 'HUB CYBER SECURITY LTD',
        isin: 'IL0012187428',
        descripcion: 'Compra 15 Hub Cyber Security Ltd @ 0,4 USD (IL0012187428)',
        variacion: '-6,00',
        varCurrency: 'USD',
      }),
    ]);

    const result = importFromCSV(csv);
    expect(result.positions).toHaveLength(1);
    const pos = result.positions[0];
    expect(pos.isin).toBe('IL0012187428');
    expect(pos.shares).toBeCloseTo(15, 4);
    expect(pos.avgCost).toBeCloseTo(0.4, 4);
    expect(pos.currency).toBe('USD');
  });

  // ── 3. Venta ──────────────────────────────────────────────────────────

  it('parsea venta correctamente (resta shares)', () => {
    const csv = makeCsv([
      makeRow({
        descripcion: 'Compra 700 Atlasclear Holdings Inc@0,25 USD (US1287452056)',
        variacion: '-175,00',
        varCurrency: 'USD',
        hora: '10:00',
      }),
      makeRow({
        descripcion: 'Venta 700 Atlasclear Holdings Inc@0,2409 USD (US1287452056)',
        variacion: '168,63',
        varCurrency: 'USD',
        hora: '11:00',
      }),
    ]);

    const result = importFromCSV(csv);
    // posición neta = 0 → se omite silenciosamente
    expect(result.positions).toHaveLength(0);
  });

  // ── 4. Acumulación de múltiples compras ───────────────────────────────

  it('acumula múltiples compras del mismo ISIN con coste medio ponderado', () => {
    const csv = makeCsv([
      // 76 @ 2,15 EUR = 163,40 EUR
      makeRow({
        descripcion: 'Compra 76 Quantum eMotion Corp@2,15 EUR (CA74767K1030)',
        variacion: '-163,40',
        varCurrency: 'EUR',
      }),
      // 124 @ 2,37 EUR = 293,88 EUR
      makeRow({
        descripcion: 'Compra 124 Quantum eMotion Corp@2,37 EUR (CA74767K1030)',
        variacion: '-293,88',
        varCurrency: 'EUR',
      }),
      // 100 @ 1,835 EUR = 183,50 EUR
      makeRow({
        descripcion: 'Compra 100 Quantum eMotion Corp@1,835 EUR (CA74767K1030)',
        variacion: '-183,50',
        varCurrency: 'EUR',
      }),
    ]);

    const result = importFromCSV(csv);
    expect(result.positions).toHaveLength(1);
    const pos = result.positions[0];
    expect(pos.shares).toBeCloseTo(300, 4);
    // coste medio: (76*2.15 + 124*2.37 + 100*1.835) / 300
    const expectedAvg = (76 * 2.15 + 124 * 2.37 + 100 * 1.835) / 300;
    expect(pos.avgCost).toBeCloseTo(expectedAvg, 3);
  });

  // ── 5. STOCK SPLIT — par correcto ────────────────────────────────────

  it('maneja STOCK SPLIT: resta shares del ISIN viejo y suma al ISIN nuevo', () => {
    const csv = makeCsv([
      // Compra inicial 15 acciones del ISIN viejo (IL0012187428)
      makeRow({
        descripcion: 'Compra 15 Hub Cyber Security Ltd @ 0,4 USD (IL0012187428)',
        variacion: '-6,00',
        varCurrency: 'USD',
      }),
      // Split-out: 15 salen del ISIN viejo (variación positiva en USD)
      makeRow({
        descripcion: 'STOCK SPLIT: 15 Hub Cyber Security Ltd @ 0,303 USD (IL0012187428)',
        variacion: '4,54',
        varCurrency: 'USD',
      }),
      // Split-in: 1 entra al ISIN nuevo (IL0012334285) (variación negativa)
      makeRow({
        descripcion: 'STOCK SPLIT: 1 Hub Cyber Security Ltd @ 4,545 USD (IL0012334285)',
        variacion: '-4,54',
        varCurrency: 'USD',
      }),
    ]);

    const result = importFromCSV(csv);
    // IL0012187428 → 15 compradas - 15 split-out = 0 → omitida
    // IL0012334285 → 1 split-in > 0 → posición válida
    const oldIsin = result.positions.find(p => p.isin === 'IL0012187428');
    const newIsin = result.positions.find(p => p.isin === 'IL0012334285');
    expect(oldIsin).toBeUndefined();
    expect(newIsin).toBeDefined();
    expect(newIsin!.shares).toBeCloseTo(1, 4);
  });

  // ── 6. STOCK SPLIT con 0 shares → ignorado ──────────────────────────

  it('ignora líneas STOCK SPLIT con shares = 0', () => {
    const csv = makeCsv([
      // Compra del ISIN viejo
      makeRow({
        descripcion: 'Compra 10 Hub Cyber Security Ltd@4,95 USD (IL0012334285)',
        variacion: '-49,50',
        varCurrency: 'USD',
      }),
      // Split-out con 0 shares (señal de que el viejo ISIN queda a 0)
      makeRow({
        descripcion: 'STOCK SPLIT: 0 Hub Cyber Security Ltd @ 7,275 USD (IL0012384504)',
        variacion: '0,00',
        varCurrency: 'USD',
      }),
      // Split-in: 11 acciones del ISIN nuevo (variación negativa para sumarse)
      makeRow({
        descripcion: 'STOCK SPLIT: 11 Hub Cyber Security Ltd @ 0,1455 USD (IL0012334285)',
        variacion: '-1,60',
        varCurrency: 'USD',
      }),
    ]);

    const result = importFromCSV(csv);
    // IL0012334285: 10 compradas + 11 split-in = 21
    const pos = result.positions.find(p => p.isin === 'IL0012334285');
    expect(pos).toBeDefined();
    expect(pos!.shares).toBeCloseTo(21, 4);
    // IL0012384504 no tiene posición relevante (split-out con 0 shares → skipped)
    const oldPos = result.positions.find(p => p.isin === 'IL0012384504');
    expect(oldPos).toBeUndefined();
  });

  // ── 7. Filas no comerciales → ignoradas ──────────────────────────────

  it('ignora depósitos, comisiones, transferencias y cambios de divisa', () => {
    const csv = makeCsv([
      makeRow({ descripcion: 'flatex Deposit', variacion: '200,00' }),
      makeRow({ descripcion: 'Costes de transacción y/o externos de DEGIRO', variacion: '-3,90' }),
      makeRow({ descripcion: 'Ingreso Cambio de Divisa', variacion: '144,34' }),
      makeRow({ descripcion: 'Retirada Cambio de Divisa', variacion: '-168,63' }),
      makeRow({ descripcion: 'Degiro Cash Sweep Transfer', variacion: '-142,34' }),
      makeRow({ descripcion: 'Flatex Interest Income', variacion: '0,00' }),
      makeRow({ descripcion: 'Transferir a su Cuenta de Efectivo en flatexDEGIRO Bank: 142,34 EUR', variacion: '' }),
    ]);

    const result = importFromCSV(csv);
    expect(result.positions).toHaveLength(0);
    // All rows should be skipped, no warnings about empty CSV unless explicitly triggered
  });

  // ── 8. CSV del Account.csv real (fragmento) ───────────────────────────

  it('procesa un fragmento real del Account.csv con compras y ventas mixtas', () => {
    // Basado en el Account.csv real: QEM x300, ATCH (vendido), District (vendido), Stallion (vendido)
    const csv = [
      ACCOUNT_HEADERS,
      // QEM: 76 + 124 + 100 = 300 compradas
      '07-11-2025,11:51,07-11-2025,QUANTUM EMOTION CORP,CA74767K1030,"Compra 76 Quantum eMotion Corp@2,15 EUR (CA74767K1030)",,EUR,"-163,40",EUR,"5,82",023fbeef',
      '06-11-2025,13:26,06-11-2025,QUANTUM EMOTION CORP,CA74767K1030,"Compra 124 Quantum eMotion Corp@2,37 EUR (CA74767K1030)",,EUR,"-293,88",EUR,"6,12",65b905b2',
      '31-03-2026,10:11,31-03-2026,QUANTUM EMOTION CORP,CA74767K1030,"Compra 100 Quantum eMotion Corp@1,835 EUR (CA74767K1030)",,EUR,"-183,50",EUR,"36,30",b030c9ef',
      // Stallion: 100 compradas, 100 vendidas → net 0
      '29-12-2025,20:29,29-12-2025,STALLION URANIUM CORP,CA8529192087,"Compra 100 Stallion Uranium Corp@0,208 EUR (CA8529192087)",,EUR,"-20,80",EUR,"87,83",db0d5507',
      '24-03-2026,17:44,24-03-2026,STALLION URANIUM CORP,CA8529192087,"Venta 100 Stallion Uranium Corp@0,183 EUR (CA8529192087)",,EUR,"18,30",EUR,"79,62",0ce3b426',
    ].join('\n');

    const result = importFromCSV(csv);
    expect(result.broker.id).toBe('degiro');

    const qem = result.positions.find(p => p.isin === 'CA74767K1030');
    expect(qem).toBeDefined();
    expect(qem!.shares).toBeCloseTo(300, 4);

    // Stallion vendido completamente → net 0 → omitido silenciosamente
    const stallion = result.positions.find(p => p.isin === 'CA8529192087');
    expect(stallion).toBeUndefined();
  });

  // ── 9. Detección → confianza alta para el formato ES ─────────────────

  it('detecta el Account.csv ES con confianza >= 0.97', () => {
    const csv = makeCsv([
      makeRow({
        descripcion: 'Compra 100 Quantum eMotion Corp@1,835 EUR (CA74767K1030)',
        variacion: '-183,50',
        varCurrency: 'EUR',
      }),
    ]);
    const result = importFromCSV(csv);
    expect(result.broker.confidence).toBeGreaterThanOrEqual(0.97);
    expect(result.broker.id).toBe('degiro');
  });

  // ── 10. Integración: Account.csv real completo ────────────────────────

  it('procesa el Account.csv real completo con las posiciones correctas', async () => {
    const { readFileSync } = await import('fs');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');

    // Leer el CSV real desde training/
    const csvPath = join(process.cwd(), 'training', 'Account.csv');
    let csvContent: string;
    try {
      csvContent = readFileSync(csvPath, 'utf-8');
    } catch {
      // Si no existe el fichero en este entorno, saltar el test
      console.warn('training/Account.csv no encontrado, test omitido');
      return;
    }

    const result = importFromCSV(csvContent);

    // Broker detectado correctamente
    expect(result.broker.id).toBe('degiro');
    expect(result.broker.confidence).toBeGreaterThanOrEqual(0.97);

    // QEM: 76 + 124 + 100 = 300 shares, nunca vendidas
    const qem = result.positions.find(p => p.isin === 'CA74767K1030');
    expect(qem).toBeDefined();
    expect(qem!.shares).toBeCloseTo(300, 4);
    expect(qem!.currency).toBe('EUR');
    // Coste medio ponderado: (76*2.15 + 124*2.37 + 100*1.835) / 300
    const qemAvg = (76 * 2.15 + 124 * 2.37 + 100 * 1.835) / 300;
    expect(qem!.avgCost).toBeCloseTo(qemAvg, 3);

    // ATCH: 700 compradas, 700 vendidas → net 0 → no aparece
    const atch = result.positions.find(p => p.isin === 'US1287452056');
    expect(atch).toBeUndefined();

    // Gossamer, District, Stallion → completamente vendidas → no aparecen
    expect(result.positions.find(p => p.isin === 'US38341P1021')).toBeUndefined();
    expect(result.positions.find(p => p.isin === 'CA2548481043')).toBeUndefined();
    expect(result.positions.find(p => p.isin === 'CA8529192087')).toBeUndefined();

    // Hub IL0012187428: 15 compradas - 15 split-out = 0 (cerrada)
    const hubOld = result.positions.find(p => p.isin === 'IL0012187428');
    expect(hubOld).toBeUndefined();

    // Hub IL0012334285: +1 split-in + 10 compradas - 11 split-out = 0 (cerrada)
    const hubMid = result.positions.find(p => p.isin === 'IL0012334285');
    expect(hubMid).toBeUndefined();

    // Hub IL0012384504: split-out con 0 shares → skip
    const hubNew = result.positions.find(p => p.isin === 'IL0012384504');
    expect(hubNew).toBeUndefined();

    // Total: solo QEM (Quantum eMotion Corp) queda como posición activa
    expect(result.positions.length).toBe(1);
  });

  // ── 11. Heurísticas y Análisis de Columnas ────────────────────────────

  it('detecta cabeceras dinámicamente con detectHeaderRow', () => {
    // Caso con cabeceras reales
    const rowsWithHeader = [
      ['ISIN', 'Cantidad', 'Precio medio'],
      ['ES0112345678', '100,00', '12.34'],
      ['ES0198765432', '50', '9.99']
    ];
    expect(detectHeaderRow(rowsWithHeader).hasHeader).toBe(true);

    // Caso sin cabeceras (datos puros)
    const rowsWithoutHeader = [
      ['ES0112345678', '100,00', '12.34'],
      ['ES0198765432', '50', '9.99']
    ];
    expect(detectHeaderRow(rowsWithoutHeader).hasHeader).toBe(false);
  });

  it('analiza columnas y sugiere mapping para CSVs genéricos', () => {
    const headers = ['Código ISIN', 'Número de Títulos', 'Precio Promedio', 'Moneda de la Operación'];
    const rows = [
      ['US0378331005', '15', '175.50', 'USD'],
      ['IE00B4L5Y983', '120.5', '85.20', 'EUR'],
      ['US5949181045', '10', '420.00', 'USD']
    ];

    const analysis = analyzeColumns(headers, rows);
    expect(analysis).toHaveLength(4);

    // Verificar que se le asigne alta probabilidad al rol correspondiente
    const isinAnalysis = analysis[0];
    expect(isinAnalysis.roleScores.isin).toBeGreaterThan(0.5);

    const qtyAnalysis = analysis[1];
    expect(qtyAnalysis.roleScores.quantity).toBeGreaterThan(0.5);

    const priceAnalysis = analysis[2];
    expect(priceAnalysis.roleScores.price).toBeGreaterThan(0.5);

    const curAnalysis = analysis[3];
    expect(curAnalysis.roleScores.currency).toBeGreaterThan(0.5);

    const mapping = suggestMappingFromAnalysis(analysis);
    expect(mapping.shares).toBe(1);
    expect(mapping.isin).toBe(0);
    expect(mapping.avgCost).toBe(2);
    expect(mapping.currency).toBe(3);
  });

  // ── 12. Parseador de Múltiples Bloques (Multi-tabla) ────────────────────

  it('parsea CSV con Estrategia A (prefijos de sección / estilo IBKR)', () => {
    const csv = [
      'Statement,Header,Field Name,Field Value',
      'Statement,Data,Title,Activity Statement',
      'Trades,Header,Symbol,Quantity,T. Price',
      'Trades,Data,AAPL,10,186.50',
      'Trades,Data,MSFT,5,404.10',
      'Dividends,Header,Symbol,Amount',
      'Dividends,Data,AAPL,2.40'
    ].join('\n');

    const blocks = parseCSVBlocks(csv);
    expect(blocks).toHaveLength(3);

    const statement = blocks.find(b => b.name === 'Statement');
    expect(statement).toBeDefined();
    expect(statement!.headers).toEqual(['Field Name', 'Field Value']);
    expect(statement!.rows).toEqual([['Title', 'Activity Statement']]);

    const trades = blocks.find(b => b.name === 'Trades');
    expect(trades).toBeDefined();
    expect(trades!.headers).toEqual(['Symbol', 'Quantity', 'T. Price']);
    expect(trades!.rows).toEqual([
      ['AAPL', '10', '186.50'],
      ['MSFT', '5', '404.10']
    ]);

    const dividends = blocks.find(b => b.name === 'Dividends');
    expect(dividends).toBeDefined();
    expect(dividends!.headers).toEqual(['Symbol', 'Amount']);
    expect(dividends!.rows).toEqual([['AAPL', '2.40']]);
  });

  it('parsea CSV con Estrategia B (bloques separados por saltos de línea)', () => {
    const csv = [
      'ISIN,Cantidad,Precio medio',
      'ES0112345678,100,12.34',
      '',
      'Ticker,Position,Avg Cost',
      'AAPL,10,186.50'
    ].join('\n');

    const blocks = parseCSVBlocks(csv);
    expect(blocks).toHaveLength(2);

    expect(blocks[0].name).toBe('Bloque 1');
    expect(blocks[0].headers).toEqual(['ISIN', 'Cantidad', 'Precio medio']);
    expect(blocks[0].rows).toEqual([['ES0112345678', '100', '12.34']]);

    expect(blocks[1].name).toBe('Bloque 2');
    expect(blocks[1].headers).toEqual(['Ticker', 'Position', 'Avg Cost']);
    expect(blocks[1].rows).toEqual([['AAPL', '10', '186.50']]);
  });

  // ── 13. Integración con Interactive Brokers Real (Activity Statement) ──

  it('procesa el interactive_brokers_activity.csv real con resolución de ISINs cruzados', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');

    // Leer el CSV real de IBKR desde training/
    const csvPath = join(process.cwd(), 'training', 'interactive_brokers_activity.csv');
    let csvContent: string;
    try {
      csvContent = readFileSync(csvPath, 'utf-8');
    } catch {
      console.warn('training/interactive_brokers_activity.csv no encontrado, test omitido');
      return;
    }

    const result = importFromCSV(csvContent);

    // Debe detectarse como Interactive Brokers
    expect(result.broker.id).toBe('interactive_brokers');
    expect(result.broker.confidence).toBeGreaterThanOrEqual(0.8);

    // Debe contener las posiciones correctas: AAPL, MSFT, NVDA, VWRL, IWDA
    expect(result.positions.length).toBe(5);

    // VWRL: 50 compradas a 104.22 EUR. ISIN resuelto desde Dividendos -> IE00B3RBWM25
    const vwrl = result.positions.find(p => p.ticker === 'VWRL');
    expect(vwrl).toBeDefined();
    expect(vwrl!.shares).toBeCloseTo(50, 4);
    expect(vwrl!.avgCost).toBeCloseTo(104.22, 4);
    expect(vwrl!.currency).toBe('EUR');
    expect(vwrl!.isin).toBe('IE00B3RBWM25');

    // AAPL: 10 compradas, 5 vendidas -> 5 shares netos a 186.50 USD. ISIN resuelto -> US0378331005
    const aapl = result.positions.find(p => p.ticker === 'AAPL');
    expect(aapl).toBeDefined();
    expect(aapl!.shares).toBeCloseTo(5, 4);
    expect(aapl!.avgCost).toBeCloseTo(186.50, 4); // Las ventas no alteran el precio medio en CMP
    expect(aapl!.currency).toBe('USD');
    expect(aapl!.isin).toBe('US0378331005');

    // MSFT: 5 compradas a 404.10 USD. Sin ISIN
    const msft = result.positions.find(p => p.ticker === 'MSFT');
    expect(msft).toBeDefined();
    expect(msft!.shares).toBeCloseTo(5, 4);
    expect(msft!.avgCost).toBeCloseTo(404.10, 4);
    expect(msft!.currency).toBe('USD');
    expect(msft!.isin).toBe('');

    // NVDA: 3 compradas a 620.00 USD. Sin ISIN
    const nvda = result.positions.find(p => p.ticker === 'NVDA');
    expect(nvda).toBeDefined();
    expect(nvda!.shares).toBeCloseTo(3, 4);
    expect(nvda!.avgCost).toBeCloseTo(620.00, 4);
    expect(nvda!.currency).toBe('USD');
    expect(nvda!.isin).toBe('');

    // IWDA: 30 compradas a 79.40 EUR. Sin ISIN
    const iwda = result.positions.find(p => p.ticker === 'IWDA');
    expect(iwda).toBeDefined();
    expect(iwda!.shares).toBeCloseTo(30, 4);
    expect(iwda!.avgCost).toBeCloseTo(79.40, 4);
    expect(iwda!.currency).toBe('EUR');
    expect(iwda!.isin).toBe('');
    });

    // ─── 14. Historical Transactions & Generic Mapping ──────────────────────

    describe('Historical Transactions & Generic Mapping', () => {

    it('supports historical transactions in generic parser with date/type mapping', () => {
      const csv = [
        'Fecha,Operacion,ISIN,Acciones,Precio,Divisa',
        '2024-01-01,BUY,US0378331005,10,180.50,USD',
        '2024-02-01,BUY,US0378331005,5,190.00,USD',
        '2024-03-01,SELL,US0378331005,3,200.00,USD',
      ].join('\n');

      const result = importFromCSV(csv);
      // Broker should be generic
      expect(result.broker.id).toBe('generic');

      // Apple (US0378331005): 10+5 - 3 = 12 shares
      const aapl = result.positions.find(p => p.isin === 'US0378331005');
      expect(aapl).toBeDefined();
      expect(aapl!.shares).toBe(12);
      // Coste medio: (10*180.50 + 5*190.00) / 15 = 183.666...
      expect(aapl!.avgCost).toBeCloseTo(183.6666, 3);
    });

    it('applies failsafe when specific broker parser yields zero positions', () => {
      // Un CSV que parece Trading 212 por las cabeceras, pero que no tiene acciones válidas
      // para su parser específico (ej: todas las filas son 'Interest on cash')
      // pero que el genérico SÍ podría entender si hubiera alguna compra.
      const csv = [
        'Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share)',
        'Interest on cash,2024-01-01,,,Interest,0,0,EUR',
        'Deposit,2024-01-01,,,Deposit,0,0,EUR',
        'Buy,2024-01-01,IE00B4L5Y983,VWCE,Vanguard All-World,10,105.50,EUR'
      ].join('\n');

      // Nota: El parser de Trading 212 actual SÍ entendería la fila 'Buy'.
      // Para forzar el failsafe, necesitamos algo que el parser específico IGNORE
      // pero que el genérico ENTIENDA.

      // Si el parser de T212 se vuelve más estricto o falla, el failsafe actuaría.
      // Vamos a probar con un caso donde el detector de bróker se confunda.
      const confusingCsv = [
        'Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share)',
        'CUALQUIER_COSA,2024-01-01,IE00B4L5Y983,VWCE,Vanguard All-World,10,105.50,EUR'
      ].join('\n');

      // 'CUALQUIER_COSA' hará que T212 ignore la fila (yields 0 positions).
      // Pero el genérico verá ISIN, No. of shares y Price / share y lo entenderá.

      const result = importFromCSV(confusingCsv);

      // Debería haber caído al failsafe genérico
      expect(result.broker.id).toBe('generic');
      expect(result.positions.length).toBe(1);
      expect(result.positions[0].isin).toBe('IE00B4L5Y983');
      expect(result.warnings.some(w => w.includes('Se ha utilizado el importador genérico'))).toBe(true);
    });

    it('handles Trading 212 historical transaction exports correctly', () => {
      const csv = [
        'Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share)',
        'Market buy,2024-01-10 10:00:00,US0378331005,AAPL,Apple Inc,10,185.00,USD',
        'Market sell,2024-02-15 15:30:00,US0378331005,AAPL,Apple Inc,5,195.00,USD',
        'Limit buy,2024-03-01 09:15:00,US0378331005,AAPL,Apple Inc,10,175.00,USD'
      ].join('\n');

      const result = importFromCSV(csv);
      expect(result.broker.id).toBe('trading212');

      const aapl = result.positions.find(p => p.ticker === 'AAPL');
      expect(aapl).toBeDefined();
      // 10 - 5 + 10 = 15
      expect(aapl!.shares).toBe(15);
      // Coste medio:
      // 1. Compra 10 @ 185 -> total 1850, shares 10
      // 2. Venta 5 -> total 1850 - 5*185 = 925, shares 5 (el precio medio no cambia)
      // 3. Compra 10 @ 175 -> total 925 + 1750 = 2675, shares 15
      // Avg = 2675 / 15 = 178.333
      expect(aapl!.avgCost).toBeCloseTo(178.3333, 4);
    });

    });

    });