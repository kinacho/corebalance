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
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  importFromCSV, importWithMapping, detectHeaderRow, analyzeColumns,
  suggestMappingFromAnalysis, normalizeCurrency, looksLikeIsinValue,
  parseCSVBlocks
} from './index';

/**
 * Devuelve el `it` que corresponde según exista o no el fixture real en `training/`.
 *
 * ⚠️ Los dos tests de integración de este fichero hacían `console.warn` + `return`
 * dentro del propio test cuando el fichero no estaba. `training/` está ignorada entera
 * —son exports de bróker con datos personales—, así que **en CI y en cualquier clon
 * limpio esos dos tests salían por esa puerta antes de la primera aserción y el informe
 * mostraba dos líneas verdes idénticas a las de haberlo comprobado todo**. Es decir: se
 * podía romper el parser de Interactive Brokers de arriba abajo y CI seguía en verde,
 * que es exactamente el defecto que `training_csv.test.ts` ya había corregido con
 * `it.skip` — una copia arreglada y la otra no, el patrón de siempre en este repo.
 *
 * Con `it.skip` el informe distingue «omitido» de «comprobado», que es toda la
 * diferencia entre saber y creer.
 */
function fixtureReal(nombre: string) {
  const ruta = join(process.cwd(), 'training', nombre);
  const existe = existsSync(ruta);
  return {
    it: existe ? it : it.skip,
    leer: () => readFileSync(ruta, 'utf-8')
  };
}

const accountCsv = fixtureReal('Account.csv');
const ibActivityCsv = fixtureReal('interactive_brokers_activity.csv');

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

  accountCsv.it('procesa el Account.csv real completo con las posiciones correctas', () => {
    const result = importFromCSV(accountCsv.leer());

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

  ibActivityCsv.it('procesa el interactive_brokers_activity.csv real con resolución de ISINs cruzados', () => {
    const result = importFromCSV(ibActivityCsv.leer());

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

/**
 * Los defectos que encontró la revisión del subsistema de importación, cada uno con el test
 * que lo habría cazado. Casi todos comparten firma: **el mismo predicado escrito varias
 * veces y arreglado en una sola copia**.
 *
 * Lo que hace peligrosa a esta capa es que su salida se convierte en transacciones →
 * `ledger.ts` (coste medio) → `fiscal.ts` (FIFO, IRPF). Una cantidad, una fecha o un signo
 * mal parseados no dan error en ninguna parte: se convierten en una plusvalía inventada.
 */
describe('regresiones de la revisión del importador', () => {
  const T212_CABECERA =
    'Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Exchange rate';

  /**
   * ⚠️ El defecto que hacía invisibles a todos los demás: `createSkipRow` exponía `skipped`
   * como getter y los seis parsers lo desestructuraban, congelándolo en 0. `ImportModal`
   * dibuja el aviso «se han omitido N filas» bajo `{#if importResult.skippedRows > 0}`, así
   * que ese panel —traducido y funcionando— no se mostró nunca.
   */
  it('informa de las filas omitidas en vez de decir siempre cero', () => {
    const csv = [
      T212_CABECERA,
      'Deposit,2024-01-05T09:00:00.000Z,,,,,,,',
      'Market buy,2024-01-10T10:32:14.000Z,IE00B3RBWM25,VWRL,Vanguard FTSE All-World,10,104.18,EUR,1'
    ].join('\n');

    const result = importFromCSV(csv);

    expect(result.positions).toHaveLength(1);
    expect(result.skippedRows).toBe(1);
    // Y el contador coincide con el detalle, que es lo que se le enseña al usuario.
    expect(result.skippedRows).toBe(result.skippedDetails?.length);
  });

  /**
   * ⚠️ La guarda del precio existía escrita cuatro veces y sólo el histórico de DEGIRO la
   * aplicaba. Una compra sin precio entra en el coste medio como si el título fuera gratis.
   */
  it('descarta una transacción sin precio en vez de meterla a coste cero', () => {
    const csv = [
      T212_CABECERA,
      'Market buy,2024-01-10T10:32:14.000Z,IE00B3RBWM25,VWRL,Vanguard FTSE All-World,10,,EUR,1',
      'Market buy,2024-02-10T10:32:14.000Z,IE00B3RBWM25,VWRL,Vanguard FTSE All-World,10,185,EUR,1'
    ].join('\n');

    const result = importFromCSV(csv);

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].shares).toBe(10);
    // Con la fila de precio vacío dentro, el coste medio salía 92,5 en vez de 185.
    expect(result.positions[0].avgCost).toBe(185);
    expect(result.skippedRows).toBe(1);
  });

  /**
   * ⚠️ MyInvestor comparaba `tipoOp.includes('suscripcion')` sobre un `toLowerCase()` a
   * secas, así que «Suscripción» no casaba nunca y el fondo entero desaparecía de la cartera.
   */
  it('reconoce «Suscripción» con acento, que es como lo escribe MyInvestor', () => {
    const csv = [
      'Fecha operación;Fecha valor;Tipo operación;Nombre del fondo / valor;ISIN;Participaciones;Precio;Importe bruto;Gastos;Importe neto;Divisa',
      '10/01/2024;10/01/2024;Suscripción;Vanguard Global Stock Index Fund EUR Acc;IE00B03HCZ61;12,3456;81,5432;1007,42;0,00;-1007,42;EUR',
      '22/01/2024;22/01/2024;Suscripción;Vanguard Global Stock Index Fund EUR Acc;IE00B03HCZ61;5,6789;174,2310;989,16;0,00;-989,16;EUR'
    ].join('\n');

    const result = importFromCSV(csv);

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].shares).toBeCloseTo(18.0245, 4);
    expect(result.skippedRows).toBe(0);
  });

  /**
   * ⚠️ La instantánea de DEGIRO usaba `.set()` sobre un mapa llamado `accumulated`:
   * sustituía en vez de acumular, así que un ISIN repetido perdía todas las filas menos la
   * última, sin aviso y sin aparecer en `skippedDetails`.
   */
  it('suma las dos filas de un mismo ISIN en la instantánea de DEGIRO', () => {
    const csv = [
      'Producto,Symbol/ISIN,Cantidad,Precio de,Valor local,,Valor en EUR',
      'ATLASCLEAR HOLDINGS INC,US1287452056,700,"0,22",USD,"155,47","133,67"',
      'ATLASCLEAR HOLDINGS INC,US1287452056,300,"0,22",USD,"66,63","57,29"'
    ].join('\n');

    const result = importFromCSV(csv);

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].shares).toBe(1000);
  });

  /**
   * ⚠️ Se prefería «Valor en EUR» como coste total y se etiquetaba `EUR`, pero el store
   * guarda `avgCost` **en la divisa del activo** y lo multiplica luego por `fxRate`: el
   * importe se convertía dos veces y el coste quedaba infravalorado ~14 %.
   */
  it('guarda el coste en la divisa del activo, no el valor ya convertido a euros', () => {
    const csv = [
      'Producto,Symbol/ISIN,Cantidad,Precio de,Valor local,,Valor en EUR',
      'ATLASCLEAR HOLDINGS INC,US1287452056,700,"0,22",USD,"155,47","133,67"'
    ].join('\n');

    const result = importFromCSV(csv);

    // 0,22 USD por título — lo que el propio CSV dice. Antes: 133,67/700 = 0,1909 «EUR».
    expect(result.positions[0].avgCost).toBeCloseTo(0.22, 6);
    expect(result.positions[0].currency).toBe('USD');
  });

  /**
   * ⚠️ `buyKeywords` contenía `'in'` y se comprobaba antes que las de venta con `includes`,
   * así que «Selling» y «Sending» casaban como compra: los títulos se sumaban en vez de
   * restarse y el coste medio se recalculaba con un precio de venta.
   */
  it('no confunde una venta con una compra por una subcadena', () => {
    const csv = [
      'Fecha,ISIN,Tipo,Participaciones,Precio',
      '10/01/2024,IE00B4L5Y983,Buying,10,100',
      '15/02/2024,IE00B4L5Y983,Selling,4,150'
    ].join('\n');

    const result = importFromCSV(csv);

    expect(result.positions).toHaveLength(1);
    // Con el defecto, «Selling» entraba como compra y salían 14 títulos.
    expect(result.positions[0].shares).toBe(6);
  });

  /**
   * ⚠️ La ruta genérica leía la fecha con `new Date(str)`, que interpreta `10/01/2024` como
   * 1 de octubre y devuelve Invalid Date con `15/01/2024` —sustituido entonces por hoy—.
   * Con el orden barajado, una venta procesada antes de su compra se descartaba en silencio.
   */
  it('respeta el orden cronológico con fechas europeas', () => {
    /**
     * ⚠️ Las dos fechas están elegidas para que la lectura americana **invierta el orden**,
     * y no valen otras: el primer intento usó 10/01 y 15/01, que al leerse al revés dan
     * 1-oct e «inválida→hoy», o sea compra antes que venta igual, y el test pasaba con el
     * defecto puesto. Hace falta `día1 > día2` con `mes1 < mes2`: en europeo es 10-ene
     * seguido de 5-feb, y en americano 1-oct seguido de 2-may, es decir, la venta primero.
     */
    const csv = [
      'Fecha,ISIN,Tipo,Participaciones,Precio',
      '10/01/2024,IE00B4L5Y983,Compra,10,100',
      '05/02/2024,IE00B4L5Y983,Venta,4,150'
    ].join('\n');

    const result = importFromCSV(csv);

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].shares).toBe(6);
    expect(result.positions[0].avgCost).toBe(100);
  });

  /**
   * ⚠️ Un `Transacciones.csv` de DEGIRO con la columna «Precio» vacía: su parser descarta
   * las filas —correctamente, no tienen precio—, salta el respaldo genérico, y éste tomaba
   * «Valor local», que es un **importe total**, como precio **unitario**.
   *
   * ⚠️ El primer intento de arreglo fue añadir `totalTransactions` al detector de DEGIRO, y
   * el control negativo demostró que para este caso es un no-op: con todas las filas
   * descartadas ese campo vale 0, exactamente lo mismo que estar ausente. Lo que hace daño
   * es confundir un total con un precio, y ahí está el arreglo de verdad.
   */
  it('no toma un importe total por un precio unitario', () => {
    const csv = [
      'Fecha,Hora,Producto,ISIN,Cantidad,Precio,,Valor local',
      '10/01/2024,10:30,Quantum eMotion,CA74767K1030,15,,EUR,"1.536,67"'
    ].join('\n');

    const result = importFromCSV(csv);

    // Antes: 15 títulos a 1.536,67 € cada uno → 23.050 € de coste base para una posición
    // de 2.805 €. Y ni un error por ninguna parte.
    expect(result.positions.length).toBeGreaterThan(0);
    for (const pos of result.positions) {
      expect(pos.avgCost).toBeCloseTo(1536.67 / 15, 2);
    }
  });

  /**
   * ⚠️ `importWithMapping` reparseaba con `parseCSV`, que devuelve el **primer** bloque,
   * mientras que el mapeo lo construyó el usuario sobre las cabeceras del bloque que
   * `importFromCSV` eligió por confianza y le enseñó en `ColumnMapper`.
   */
  it('aplica el mapeo manual al mismo bloque que se le enseñó al usuario', () => {
    const csv = [
      'Resumen,Valor',
      'Efectivo,1000',
      '',
      'Producto,ISIN,Cantidad,Precio',
      'Vanguard FTSE All-World,IE00B3RBWM25,12,104.18'
    ].join('\n');

    const auto = importFromCSV(csv);
    // El bloque elegido —y por tanto el que se le enseña al usuario— es el de posiciones.
    expect(auto.rawHeaders).toEqual(['Producto', 'ISIN', 'Cantidad', 'Precio']);

    const manual = importWithMapping(csv, { shares: 2, isin: 1, name: 0, avgCost: 3 });

    expect(manual.rawHeaders).toEqual(auto.rawHeaders);
    expect(manual.positions).toHaveLength(1);
    expect(manual.positions[0].shares).toBe(12);
    expect(manual.positions[0].isin).toBe('IE00B3RBWM25');
  });
});

/**
 * Un informe de aportaciones por lotes hecho a mano, que es el formato con el que la gente
 * lleva su cartera cuando la lleva ella: una fila por compra, con su fecha y su precio.
 *
 * Entraba **sin coste y sin nombre** —los pares precio/valoración y fecha-compra/fecha-informe
 * empataban y `suggestMappingFromAnalysis` deja vacío lo que empata—, así que había que
 * corregir el mapeo a mano en el modal. El detalle de por qué cada campo se quedaba vacío
 * está en `csv-utils.test.ts`; aquí se comprueba el resultado de punta a punta, que es lo
 * que acaba en la cartera.
 */
describe('informe de aportaciones por lotes', () => {
  const CSV = [
    'isin,fondo,indice,lote,fecha_fiscal,inversion_eur,participaciones,precio_medio_eur,valor_mercado_eur,resultado_eur,rentabilidad_pct,dias_antiguedad,vl_valoracion_eur,fecha_valoracion',
    'IE00TEST0001,Acme Developed World Index Fund Class S Acc EUR,MSCI World,1,2025-02-10,1000.00,100.0000,10.0000,1200.00,200.00,20.00,542,12.000,2026-08-06',
    'IE00TEST0001,Acme Developed World Index Fund Class S Acc EUR,MSCI World,2,2025-04-30,500.00,45.0000,11.1111,540.00,40.00,8.00,463,12.000,2026-08-06',
    'IE00TEST0001,Acme Developed World Index Fund Class S Acc EUR,MSCI World,3,2025-07-02,250.00,21.0000,11.9047,252.00,2.00,0.80,400,12.000,2026-08-06',
    'IE00TEST0002,Acme Emerging Markets Index Fund Class S Acc EUR,MSCI EM,1,2026-04-15,300.00,25.0000,12.0000,310.00,10.00,3.33,117,12.400,2026-08-06',
    'IE00TEST0002,Acme Emerging Markets Index Fund Class S Acc EUR,MSCI EM,2,2026-05-20,200.00,16.0000,12.5000,198.40,-1.60,-0.80,82,12.400,2026-08-06'
  ].join('\n');

  it('consolida los lotes de cada ISIN con su coste medio ponderado', () => {
    const result = importFromCSV(CSV);

    expect(result.positions).toHaveLength(2);

    const world = result.positions.find((p) => p.isin === 'IE00TEST0001')!;
    // 100 + 45 + 21 participaciones, y 1.750 € invertidos entre ellas.
    expect(world.shares).toBeCloseTo(166, 4);
    expect(world.avgCost).toBeCloseTo(1750 / 166, 4);

    const em = result.positions.find((p) => p.isin === 'IE00TEST0002')!;
    expect(em.shares).toBeCloseTo(41, 4);
    expect(em.avgCost).toBeCloseTo(500 / 41, 4);
  });

  /**
   * ⚠️ El coste es lo que más caro sale de perder: sin él el activo entra como si fuera
   * gratis, con un beneficio inventado del 100 % y una plusvalía fiscal por el valor
   * íntegro. Antes salía **0,0000** en las dos posiciones.
   */
  it('ninguna posición entra con coste cero', () => {
    for (const pos of importFromCSV(CSV).positions) {
      expect(pos.avgCost).toBeGreaterThan(0);
    }
  });

  it('la posición se llama como el fondo, no como su ISIN ni como su índice', () => {
    const world = importFromCSV(CSV).positions.find((p) => p.isin === 'IE00TEST0001')!;

    expect(world.name).toContain('Acme Developed World');
    expect(world.name).not.toBe('IE00TEST0001');
    expect(world.name).not.toContain('MSCI');
  });

  /**
   * ⚠️ Y el contador tiene que describir el resultado que se enseña al lado. MyInvestor
   * reclama este fichero, descarta sus filas por «tipo de operación no reconocido» y el
   * failsafe genérico las entiende; sumando los dos intentos, el panel anunciaba «2
   * posiciones y 5 filas omitidas» de un fichero de 5 filas — todas usadas, ninguna
   * omitida. El aviso del failsafe sigue explicando qué detector falló.
   */
  it('no cuenta como omitidas las filas que el respaldo sí usó', () => {
    const result = importFromCSV(CSV);

    expect(result.positions.length).toBeGreaterThan(0);
    expect(result.skippedRows).toBe(0);
    expect(result.skippedDetails ?? []).toHaveLength(0);
    expect(result.warnings.some((w) => /respaldo|genérico/i.test(w))).toBe(true);
  });
});

/**
 * El defecto que salió de **abrir la app** el 10-ago-2026, no de leer el código: al mirar la
 * previsualización del importador, un CSV que compra 100 títulos y vende 30 mostraba 600.
 *
 * La cadena era ésta, y ninguno de sus tres eslabones estaba roto por su cuenta:
 *  1. el detector de DEGIRO se quedaba cualquier CSV con ISIN + Cantidad + Precio, sin exigir
 *     una sola cabecera característica suya;
 *  2. su parser deduce compra/venta **del signo de la cantidad**, que es la convención real
 *     de DEGIRO —las ventas van en negativo— y por tanto es correcta *para DEGIRO*;
 *  3. un fichero ajeno trae columna «Tipo» y todas las cantidades en positivo, así que el
 *     signo no informa de nada y toda venta y todo dividendo **sumaban** participaciones.
 *
 * Es la firma que este subsistema ya tenía descrita —un predicado bueno que no se llega a
 * llamar— y del peor tipo: `clasificarTipoOperacion()` estaba arreglado desde el 9-ago.
 */
describe('un CSV ajeno no se importa como DEGIRO', () => {
  const CABECERA = 'Fecha,Tipo,ISIN,Nombre,Cantidad,Precio,Divisa';

  /**
   * El control negativo de este test es el que importa: con `exactCount >= 3` a secas, el
   * detector devuelve 0,8 y la aserción falla. La señal que se exige es `Producto`, que traen
   * los dos exports de DEGIRO —posiciones y transacciones— en español y en neerlandés.
   */
  it('el detector de DEGIRO no reclama un CSV sin ninguna cabecera suya', () => {
    const ajeno = importFromCSV([
      CABECERA,
      '2024-01-15,Compra,IE00B4L5Y983,iShares Core MSCI World,100,72.40,EUR'
    ].join('\n'));

    expect(ajeno.broker?.id).not.toBe('degiro');
  });

  /**
   * La otra mitad del contrato, y la razón de que el arreglo no sea «subir el umbral»: el
   * `Portfolio (1).csv` real de DEGIRO **depende** de esa rama de 0,8, porque su ISIN viaja
   * dentro de `Symbol/ISIN` y no alcanza las cuatro señales del 0,98.
   */
  it('sigue reconociendo el export de posiciones de DEGIRO, que depende de esa rama', () => {
    const degiro = importFromCSV([
      'Producto,Symbol/ISIN,Cantidad,Precio de,Valor local,,Valor en EUR',
      'VANGUARD FTSE AW,IE00B3RBWM25,12,"104,18",EUR,"1250,16","1250,16"'
    ].join('\n'));

    expect(degiro.broker?.id).toBe('degiro');
    expect(degiro.positions).toHaveLength(1);
  });

  /**
   * El defecto tal y como se vio en pantalla. Las cantidades son todas **positivas**, que es
   * lo que hace inútil al signo; con el detector viejo esto daba 130 títulos en vez de 70.
   */
  it('una venta resta participaciones aunque su cantidad venga en positivo', () => {
    const result = importFromCSV([
      CABECERA,
      '2024-01-15,Compra,IE00B4L5Y983,iShares Core MSCI World,100,72.40,EUR',
      '2024-05-02,Venta,IE00B4L5Y983,iShares Core MSCI World,30,80.00,EUR'
    ].join('\n'));

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].shares).toBe(70);
    // Una venta reduce el coste total sin mover el coste medio (ver `ledgerHoldings`).
    expect(result.positions[0].avgCost).toBeCloseTo(72.4, 2);
  });

  /**
   * Un dividendo es renta, no un movimiento de títulos. Entraba sumando participaciones al
   * precio del dividendo, que además hundía el coste medio: 50 títulos a 105,20 € más un
   * dividendo de «5 a 1,20» salían como 55 a 95,75 €.
   */
  it('un dividendo no suma participaciones ni hunde el coste medio', () => {
    const result = importFromCSV([
      CABECERA,
      '2024-02-20,Compra,IE00BK5BQT80,Vanguard FTSE All-World,50,105.20,EUR',
      '2024-03-15,Dividendo,IE00BK5BQT80,Vanguard FTSE All-World,5,1.20,EUR'
    ].join('\n'));

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].shares).toBe(50);
    expect(result.positions[0].avgCost).toBeCloseTo(105.2, 2);
    expect(result.skippedDetails?.some(d => /dividendo/i.test(d.reason))).toBe(true);
  });

  /**
   * La red de seguridad, que es la mitad del arreglo que **no** depende de acertar el umbral
   * de ningún detector: si un fichero vuelve a colarse por el parser de DEGIRO llevando
   * columna de tipo, una venta declarada no se degrada a compra. La asimetría es deliberada
   * —el signo negativo sigue mandando para vender— porque sumar títulos que no existen es el
   * daño irreversible. Aquí el fichero **sí** entra por DEGIRO: lleva `Producto`.
   */
  it('el parser de DEGIRO respeta una venta declarada en la columna de tipo', () => {
    const result = importFromCSV([
      'Fecha,Tipo,Producto,ISIN,Cantidad,Precio',
      '15-01-2024,Compra,iShares Core MSCI World,IE00B4L5Y983,100,"72,40"',
      '02-05-2024,Venta,iShares Core MSCI World,IE00B4L5Y983,30,"80,00"'
    ].join('\n'));

    expect(result.broker?.id).toBe('degiro');
    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].shares).toBe(70);
  });

  /**
   * Y el aviso que `reduceTransactionsToPositions()` ya sabía dar y que nadie había visto,
   * porque con la venta contada como compra no había sobreventa que detectar. No es un caso
   * raro: es lo que pasa siempre que alguien descarga sólo los últimos doce meses.
   */
  it('avisa de la sobreventa en vez de dejar la posición inflada', () => {
    const result = importFromCSV([
      CABECERA,
      '2024-01-15,Compra,IE00B4L5Y983,iShares Core MSCI World,100,72.40,EUR',
      '2024-05-02,Venta,IE00B4L5Y983,iShares Core MSCI World,500,80.00,EUR'
    ].join('\n'));

    expect(result.positions).toHaveLength(0);
    expect(result.warnings.some(w => /m[áa]s t[íi]tulos/i.test(w))).toBe(true);
  });
});