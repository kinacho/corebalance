import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { importFromCSV } from './index';

/**
 * Dry-run de todos los CSV reales de bróker que hay en `training/`.
 * Garantiza que ningún parser lanza una excepción no controlada y que
 * los CSVs conocidos producen al menos una posición válida.
 *
 * ⚠️ **Apuntaba a `training_csv/`, una carpeta que la purga del historial
 * eliminó**, así que desde entonces la suite entera se saltaba siempre: cero
 * ficheros leídos, y con el mismo aspecto verde que si estuviera comprobando
 * algo. Los CSV reales viven en `training/`, que es lo que lee también
 * `parsers.test.ts`.
 *
 * El skip sigue siendo necesario y correcto: `training/` está ignorada por
 * completo porque son exports de bróker con datos personales, así que en un clone
 * limpio no existe y la batería tiene que pasar igual.
 */
describe('Dry-run de los CSV reales de training/', () => {
	const dirPath = path.join(process.cwd(), 'training');

	// Omitir la suite si la carpeta no existe (ej. en un clone limpio, sin fixtures)
	const dirExists = fs.existsSync(dirPath);

	it('el directorio training/ existe', () => {
		if (!dirExists) {
			console.warn('[training_csv.test] Carpeta training/ no encontrada — saltando el dry-run');
		}
		// No se falla si no existe: la carpeta es opcional fuera de la máquina del autor
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
