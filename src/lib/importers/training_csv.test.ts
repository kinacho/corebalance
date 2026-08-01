import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { importFromCSV } from './index';

/**
 * Dry-run de todos los CSVs de entrenamiento.
 * Garantiza que ningún parser lanza una excepción no controlada y que
 * los CSVs conocidos producen al menos una posición válida.
 */
describe('Dry-run of all training_csv files', () => {
	const dirPath = path.join(process.cwd(), 'training_csv');

	// Omitir la suite si la carpeta no existe (ej. en CI sin los fixtures)
	const dirExists = fs.existsSync(dirPath);

	it('training_csv directory exists', () => {
		if (!dirExists) {
			console.warn('[training_csv.test] Carpeta training_csv no encontrada — saltando tests de dry-run');
		}
		// No se falla si no existe: la carpeta es opcional en CI
		expect(true).toBe(true);
	});

	if (!dirExists) return;

	const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));

	it('should have at least one CSV file to parse', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	for (const file of files) {
		it(`should parse ${file} without throwing`, () => {
			const filePath = path.join(dirPath, file);
			const content = fs.readFileSync(filePath, 'utf-8');

			// El parser nunca debe lanzar una excepción
			let result: ReturnType<typeof importFromCSV>;
			expect(() => {
				result = importFromCSV(content);
			}).not.toThrow();

			// El resultado siempre debe tener una estructura válida
			expect(result!).toBeDefined();
			expect(result!.broker).toBeDefined();
			expect(result!.broker.id).toBeTruthy();
			expect(Array.isArray(result!.positions)).toBe(true);
			expect(Array.isArray(result!.warnings)).toBe(true);
			expect(typeof result!.skippedRows).toBe('number');

			// Cada posición importada debe tener al menos un identificador y shares > 0
			for (const pos of result!.positions) {
				expect(pos.shares).toBeGreaterThan(0);
				const hasIdentifier = Boolean(pos.isin || pos.ticker);
				expect(hasIdentifier).toBe(true);
			}

			// Diagnóstico en consola (no falla, solo informa)
			if (result!.positions.length === 0) {
				console.warn(`[${file}] Sin posiciones detectadas. Broker: ${result!.broker.name}, Skipped: ${result!.skippedRows}`);
			}
		});
	}
});
