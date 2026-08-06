import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de los E2E.
 *
 * ⚠️ **`npm run test:e2e` existía en `package.json` desde siempre y no había ni este
 * fichero ni un solo spec**: el comando fallaba, y en `CLAUDE.md` constaba como
 * «declarado pero no montado». Se monta ahora porque la mitad de los defectos de la
 * revisión del 4-ago solo se veían **ejecutando la app** —el service worker que no se
 * registraba, `/dashboard` sirviendo la página offline, el mapa en una cartera recién
 * importada— y esa verificación se venía haciendo a mano, con un script de usar y
 * tirar, una vez por sesión y solo cuando alguien se acordaba.
 *
 * Se prueba sobre `vite preview`, no sobre `vite dev`: el service worker, el precache
 * y los chunks con hash solo existen en el build. **Hay que construir antes**
 * (`npm run build`); si no, `preview` arranca y devuelve 404 en todo.
 */
export default defineConfig({
	testDir: 'e2e',
	timeout: 45_000,
	expect: { timeout: 10_000 },

	// Un solo navegador a propósito: estos specs comprueban lógica de la app y del
	// service worker, no compatibilidad entre motores. Tres navegadores triplicarían
	// el tiempo de CI para volver a comprobar lo mismo.
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	// Un reintento en CI y ninguno en local: en CI un fallo intermitente cuesta un
	// pipeline entero, en local quiero verlo a la primera.
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: process.env.CI ? [['github'], ['list']] : [['list']],

	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		/**
		 * ⚠️ Idioma fijado, y hace falta.
		 *
		 * La app es bilingüe y `hooks.server.ts` resuelve el idioma del `Accept-Language`
		 * cuando no hay cookie, así que el dashboard sale en inglés o en español según
		 * con qué navegador se abra. Los specs afirman textos concretos: sin fijar el
		 * idioma, fallan por el motivo equivocado —y peor, el localizador por título no
		 * encuentra el panel y el error que sale es un timeout que no dice nada—.
		 */
		locale: 'es-ES',
		extraHTTPHeaders: { 'Accept-Language': 'es-ES,es;q=0.9' },
		// El dashboard es un panel de escritorio: el carril del carrusel se prueba
		// fijando el ancho del contenedor en los tests unitarios, no aquí.
		viewport: { width: 1440, height: 1000 }
	},

	webServer: {
		command: 'npm run preview -- --port 4173',
		url: 'http://localhost:4173/dashboard',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
