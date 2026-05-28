/**
 * Valida el parser contra el Account.csv real.
 * Ejecutar con: node --import tsx/esm scratch/validate_account_csv.mjs
 * O con: npx tsx scratch/validate_account_csv.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', 'training', 'Account.csv');
const csv = readFileSync(csvPath, 'utf-8');

// Importar directamente desde el módulo compilado no es trivial desde un .mjs
// Usamos un pequeño reimplementación inline del parser para validación manual

// Posiciones esperadas derivadas manualmente del Account.csv:
const EXPECTED = {
  // QEM: 76 + 124 + 100 = 300 compradas, nunca vendidas
  'CA74767K1030': { name: 'Quantum eMotion Corp', shares: 300, currency: 'EUR' },
  // ATCH: 100+300+200+100=700 compradas, 700 vendidas → net 0 → no debe aparecer
  'US1287452056': null,
  // Gossamer: 100 compradas, 100 vendidas → net 0 → no aparece
  'US38341P1021': null,
  // District: 100 compradas, 100 vendidas → net 0 → no aparece
  'CA2548481043': null,
  // Stallion: 100 compradas, 100 vendidas → net 0 → no aparece
  'CA8529192087': null,
  // Hub IL0012187428: 15 compradas + 15 split-in = 30
  'IL0012187428': { name: 'Hub Cyber Security Ltd', shares: 30, currency: 'USD' },
  // Hub IL0012334285: 10 compradas - 1 split-out + 11 split-in = 20
  'IL0012334285': { name: 'Hub Cyber Security Ltd', shares: 20, currency: 'USD' },
  // Hub IL0012384504: split-out con 0 shares → skip
  'IL0012384504': null,
};

// Parsear manualmente el CSV para verificar líneas de descripción
const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
const header = lines[0];
const rows = lines.slice(1);

console.log('=== Validación manual del Account.csv ===\n');
console.log('Headers:', header);
console.log(`Total filas de datos: ${rows.length}\n`);

// Extraer filas relevantes (buy/sell/stock split)
const BUY_SELL_RE = /^(Compra|Venta|Buy|Sell|Koop|Verkoop)\s+[\d.,]+\s+.+?\s*@\s*[\d.,]+\s+[A-Z]{3}\s+\([A-Z]{2}[A-Z0-9]{9}[0-9]\)$/i;
const SPLIT_RE = /^STOCK SPLIT:\s+[\d.,]+\s+.+?\s*@\s*[\d.,]+\s+[A-Z]{3}\s+\([A-Z]{2}[A-Z0-9]{9}[0-9]\)$/i;

// Parsear línea CSV con comillas
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

const headerFields = parseCSVLine(header);
console.log('Columnas detectadas:');
headerFields.forEach((h, i) => console.log(`  [${i}] "${h}"`));
console.log();

// Índice de descripción
const descIdx = headerFields.findIndex(h => 
  h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('descripci') ||
  h.toLowerCase() === 'description' ||
  h.toLowerCase() === 'omschrijving'
);
// Índice de variación (col 7) → valor en col 8
const varIdx = headerFields.findIndex(h => {
  const n = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return n === 'variacion' || n === 'change' || n === 'mutatie';
});

console.log(`Columna Descripción: ${descIdx}`);
console.log(`Columna Variación: ${varIdx} (valor en col ${varIdx+1})\n`);

let tradeCount = 0, splitCount = 0, skipped = 0;

for (const line of rows) {
  if (!line.trim()) continue;
  const fields = parseCSVLine(line);
  const desc = descIdx !== -1 ? fields[descIdx] : '';
  const varVal = varIdx !== -1 ? fields[varIdx+1] : '';
  
  if (BUY_SELL_RE.test(desc)) {
    tradeCount++;
    console.log(`[TRADE] ${desc} | Variación: ${varVal}`);
  } else if (SPLIT_RE.test(desc)) {
    splitCount++;
    console.log(`[SPLIT] ${desc} | Variación: ${varVal}`);
  } else {
    skipped++;
  }
}

console.log(`\n=== Resumen ===`);
console.log(`Operaciones compra/venta: ${tradeCount}`);
console.log(`Stock splits: ${splitCount}`);
console.log(`Filas ignoradas: ${skipped}`);
console.log('\n=== Posiciones esperadas ===');
Object.entries(EXPECTED).forEach(([isin, exp]) => {
  if (exp) {
    console.log(`  ${isin}: ${exp.shares} shares ${exp.currency} (${exp.name})`);
  } else {
    console.log(`  ${isin}: net 0 → omitido`);
  }
});
