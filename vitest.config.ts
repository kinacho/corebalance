import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/setupTest.ts'],
		env: {
			SSR: ''
		},
		resolveSnapshotPath: (testPath, snapExtension) => testPath + snapExtension,

		/**
		 * Cobertura **solo de los módulos donde equivocarse cuesta dinero al usuario**, y
		 * con umbrales de trinquete.
		 *
		 * No hay un porcentaje global a propósito: un 80 % de escaparate sobre 147 ficheros
		 * mezcla el motor fiscal con los componentes de la landing y no dice nada de
		 * ninguno. Estos seis son puros, sin E/S, y son los que calculan lo que el usuario
		 * va a declarar a Hacienda o a comprar.
		 *
		 * Los umbrales son **la medida de hoy redondeada hacia abajo**, no una aspiración:
		 * así el trinquete solo puede subir —un cambio que deje código nuevo sin probar
		 * rompe— y no hay que negociar con un número inventado. Medido el 6-ago-2026:
		 * fiscal 96,29/95,12 · rebalance 97,19/86,25 · traspaso 96,40/83,54 ·
		 * lookthrough 96,55/84,05 · treemap 92,06/91,17 · instrument-type 90,00/92,10
		 * (sentencias/ramas).
		 *
		 * ⚠️ La cobertura dice qué líneas se ejecutan, **no si alguien comprobó el
		 * resultado**. Un test sin aserciones da 100 %. Para eso están la guardia de
		 * `scripts/test-quality.mjs` y el mutation testing; los tres miden cosas distintas
		 * y ninguno sustituye a los otros.
		 */
		coverage: {
			provider: 'v8',
			include: [
				'src/lib/fiscal.ts',
				'src/lib/traspaso.ts',
				'src/lib/rebalance.ts',
				'src/lib/ledger.ts',
				'src/lib/lookthrough.ts',
				'src/lib/treemap.ts',
				'src/lib/instrument-type.ts',
				// Sacado de `ManageAssets.svelte` el 7-ago-2026: decide los `targetWeight`,
				// que son la entrada de `calculateRebalance()`.
				'src/lib/weights.ts',
				// Añadidos el 7-ago-2026. No son «módulos de dinero» puros como los de
				// arriba, pero fallan igual de caro y más callado: un precio malo no da
				// error en ninguna parte, se convierte en una desviación mal calculada y
				// acaba siendo un consejo de rebalanceo equivocado.
				'src/routes/api/prices/priceHelpers.ts',
				'src/routes/api/prices/+server.ts',
				// Añadidos el 9-ago-2026, tras la revisión del subsistema de importación (15
				// defectos, casi todos «el mismo predicado escrito varias veces y arreglado en
				// una sola copia»). Es la ruta de alta de la mayoría de carteras reales y su
				// salida se convierte en transacciones → `ledger.ts` → `fiscal.ts`: una
				// cantidad, una fecha o un signo mal parseados no dan error en ninguna parte,
				// se convierten en una plusvalía inventada. Era invisible a las cuatro
				// guardias mecánicas del repo.
				'src/lib/importers/parsers.ts',
				'src/lib/importers/csv-utils.ts',
				'src/lib/importers/aggregator.ts'
			],
			reporter: ['text', 'json-summary'],
			thresholds: {
				// Subido el 6-ago-2026 al matar mutantes del motor fiscal: 96,29/95,12 → 98,75/97,56.
				'src/lib/fiscal.ts': { statements: 98, branches: 97, functions: 100 },
				// Extraído del store el 6-ago-2026; medido al nacer.
				'src/lib/ledger.ts': { statements: 100, branches: 88, functions: 100 },
				// Subido el 6-ago-2026 al matar mutantes del motor fiscal: 96,40/83,54 → 98,20/89,87.
				'src/lib/traspaso.ts': { statements: 98, branches: 89, functions: 100 },
				// Subido el 6-ago-2026 al matar los mutantes del reparto: 97,19/86,25 → 100/97,22.
				'src/lib/rebalance.ts': { statements: 100, branches: 97, functions: 100 },
				'src/lib/lookthrough.ts': { statements: 96, branches: 84, functions: 100 },
				'src/lib/treemap.ts': { statements: 92, branches: 91, functions: 88 },
				// Subido el 6-ago-2026 con la tabla por señal: 90,00/92,10 → 100/100.
				'src/lib/instrument-type.ts': { statements: 100, branches: 100, functions: 100 },
				// Medido al nacer, 7-ago-2026.
				'src/lib/weights.ts': { statements: 100, branches: 93, functions: 100 },
				// Medidos al nacer la suite, 7-ago-2026. Las funciones no llegan a 100 en
				// `priceHelpers` por el callback del `setTimeout` que aborta la petición a
				// FT: sólo corre cuando FT tarda más de ocho segundos.
				'src/routes/api/prices/priceHelpers.ts': { statements: 98, branches: 91, functions: 88 },
				// El endpoint es el más bajo de la lista y es honesto que lo sea: le quedan
				// sin cubrir el troceado en lotes, el fallback de YTD para ETPs de cripto y
				// la rama de Redis, que necesitan otro arnés.
				'src/routes/api/prices/+server.ts': { statements: 84, branches: 65, functions: 92 },
				/**
				 * Medidos al añadirlos, 9-ago-2026, y **con `training/` apartado**: los dos tests
				 * de integración con CSV reales se omiten en CI y en cualquier clon limpio, así
				 * que medir en la máquina del autor daba `parsers.ts` once puntos más alto y el
				 * trinquete habría roto en el primer push. El suelo es lo que mide CI.
				 *
				 * `parsers.ts` es con diferencia el más bajo de la lista y es honesto que lo sea:
				 * son seis parsers de bróker y sólo cuatro tienen fixture sintético. Sube cuando
				 * alguien añada casos, que es justo para lo que sirve un trinquete.
				 */
				'src/lib/importers/parsers.ts': { statements: 62, branches: 54, functions: 76 },
				'src/lib/importers/csv-utils.ts': { statements: 96, branches: 93, functions: 100 },
				'src/lib/importers/aggregator.ts': { statements: 91, branches: 70, functions: 100 }
			}
		}
	},
	resolve: {
		conditions: ['mode=browser', 'browser']
	}
});
