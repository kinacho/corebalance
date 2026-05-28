import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseCSV, findField, parseNumber, normalizeHeader } from '../src/lib/importers/csv-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', 'training', 'Transactions.csv');
const csv = readFileSync(csvPath, 'utf-8');

const { headers, rows } = parseCSV(csv);

const closingPrice = findField(headers, rows[0], 'Precio de cierre', 'Slotkoers', 'Closing price', 'Closing');
console.log('closingPrice found:', closingPrice);

const accumulated = new Map();

for (const row of rows) {
    const isin = findField(headers, row, 'ISIN');
    const name = findField(headers, row, 'Producto');
    const sharesRaw = parseNumber(findField(headers, row, 'Cantidad', 'Aantal', 'Quantity', 'Number', 'Número'));
    const priceIdx = headers.findIndex(h => {
        const n = normalizeHeader(h);
        return n === 'precio' || n === 'koers' || n === 'price';
    });
    const price = priceIdx !== -1 ? parseNumber(row[priceIdx]) : 0;
    
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
                currency: 'EUR'
            });
        }
    }
}

console.log('Accumulated:');
for (const [isin, data] of accumulated) {
    console.log(isin, data);
}
