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
				'src/lib/lookthrough.ts',
				'src/lib/treemap.ts',
				'src/lib/instrument-type.ts'
			],
			reporter: ['text', 'json-summary'],
			thresholds: {
				'src/lib/fiscal.ts': { statements: 96, branches: 95, functions: 92 },
				// Subido el 6-ago-2026 al matar mutantes del motor fiscal: 96,40/83,54 → 98,20/89,87.
				'src/lib/traspaso.ts': { statements: 98, branches: 89, functions: 100 },
				// Subido el 6-ago-2026 al matar los mutantes del reparto: 97,19/86,25 → 100/97,22.
				'src/lib/rebalance.ts': { statements: 100, branches: 97, functions: 100 },
				'src/lib/lookthrough.ts': { statements: 96, branches: 84, functions: 100 },
				'src/lib/treemap.ts': { statements: 92, branches: 91, functions: 88 },
				// Subido el 6-ago-2026 con la tabla por señal: 90,00/92,10 → 100/100.
				'src/lib/instrument-type.ts': { statements: 100, branches: 100, functions: 100 }
			}
		}
	},
	resolve: {
		conditions: ['mode=browser', 'browser']
	}
});
