import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { importFromCSV } from '../src/lib/importers/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', 'training', 'Transactions.csv');
const csv = readFileSync(csvPath, 'utf-8');

try {
	const result = importFromCSV(csv);
	console.log('Broker detectado:', result.broker.name, '(confianza:', result.broker.confidence, ')');
	console.log('Posiciones detectadas:', result.positions.length);
	console.log('Warnings:', result.warnings);
	console.log('Skipped:', result.skippedRows);
	console.log(result.positions);
} catch (error) {
	console.error(error);
}
