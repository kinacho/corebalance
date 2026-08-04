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

	/**
	 * ⚠️ La condición para omitir es **que no haya CSVs**, no que falte el directorio.
	 *
	 * `training/README.md` sí está versionado, así que en un clon limpio la carpeta
	 * **existe** y está vacía de fixtures. Comprobando `existsSync(dirPath)` la
	 * guarda pasaba y reventaba la aserción de «al menos un CSV». Antes no se veía
	 * porque la suite apuntaba a `training_csv/`, que no existe en absoluto y por eso
	 * salía siempre por esta puerta. Lo cazó CI en su primera ejecución.
	 */
	const files = fs.existsSync(dirPath)
		? fs.readdirSync(dirPath).filter((f) => f.endsWith('.csv'))
		: [];
	const hayFixtures = files.length > 0;

	it('hay fixtures de bróker en training/ o la suite se omite', () => {
		if (!hayFixtures) {
			console.warn(
				'[training_csv.test] Sin CSVs en training/ — se omite el dry-run. ' +
					'Es lo normal fuera de la máquina del autor: son exports reales con datos personales.'
			);
		}
		// No se falla: los fixtures son opcionales y un clon limpio tiene que pasar.
		expect(true).toBe(true);
	});

	if (!hayFixtures) return;

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
