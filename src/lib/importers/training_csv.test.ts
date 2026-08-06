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

	if (!hayFixtures) {
		/**
		 * ⚠️ **Se omite con un test marcado como omitido, no con uno que pasa.**
		 *
		 * Antes esta rama emitía un `console.warn` y un `expect(true).toBe(true)`: en el
		 * informe se veía una línea verde **idéntica** a la de haber comprobado los nueve
		 * CSVs, y el aviso se perdía en stderr. Un `training/` vaciado por accidente en la
		 * máquina del autor pasaba exactamente igual que un clon limpio.
		 */
		it.skip('omitido: no hay CSVs en training/ (lo normal fuera de la máquina del autor)', () => {});
		return;
	}

	it(`hay ${files.length} CSV de bróker que ejercitar`, () => {
		// El número va en el nombre del test a propósito: el informe dice cuántos
		// ficheros se han leído de verdad.
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

			/**
			 * ⚠️ **Cero posiciones falla.** Antes solo escribía un `console.warn`, así que
			 * un detector que dejara de reconocer su formato —o un cambio en
			 * `csv-utils` que rompiera la detección de cabeceras— seguía dando verde
			 * mientras importaba exactamente nada. Es el modo de fallo que de verdad
			 * importa aquí: el parser no revienta, simplemente no encuentra nada.
			 *
			 * Los nueve fixtures actuales producen posiciones. Si algún día se añade un
			 * export que legítimamente no tenga ninguna —un extracto de cuenta con solo
			 * movimientos de efectivo—, no pertenece a este dry-run: va a
			 * `parsers.test.ts` con su propio caso y su propia expectativa.
			 */
			expect(
				result!.positions.length,
				`«${file}» no ha producido ni una posición. Bróker detectado: ` +
					`${result!.broker.name}, filas descartadas: ${result!.skippedRows}`
			).toBeGreaterThan(0);
		});
	}
});
