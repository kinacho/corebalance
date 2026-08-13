import { test, expect } from './util/test-base';

/**
 * Las cabeceras SEO de una URL que no existe.
 *
 * ⚠️ **Este spec existe porque ningún otro guarda puede ver este caso.**
 * `scripts/seo-audit.mjs` exige exactamente un canonical autorreferencial por página, y
 * eso es justo lo que estaba mal: `+layout.svelte` compone la canónica del pathname
 * pedido, envuelve también a `+error.svelte`, y por tanto cualquier URL muerta se
 * declaraba canónica de sí misma. Pero el audit solo lee el HTML **prerenderizado** y en
 * el build no existe ningún artefacto 404 —lo genera en runtime la función del
 * adaptador—, así que no puede auditarlo ni antes ni después del arreglo. Tampoco hay
 * ningún test unitario del canonical en el repo: `routing.test.ts` prueba el que devuelve
 * `alternates()`, que no es el que se emite.
 *
 * Hay que pedirlo por HTTP, y eso solo pasa aquí.
 *
 * El segundo test es el control positivo, y no es decorativo: el riesgo real del arreglo
 * no es fallar en el 404, es cargarse el canonical de las 118 páginas buenas. Un spec que
 * solo comprobase el 404 pasaría igual con la etiqueta borrada de todo el sitio.
 */
test.describe('Una URL que no existe', () => {
	test('devuelve 404 y no se declara canónica de sí misma', async ({ page }) => {
		const respuesta = await page.goto('/esto-no-existe-y-no-deberia-existir');

		expect(respuesta?.status()).toBe(404);

		// Es la página de error de la app, no un 404 del servidor sin renderizar.
		await expect(page.locator('h1')).toHaveText('Página no encontrada');

		// Lo que arregla este spec: cero canónicas, no una apuntándose a sí misma.
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

		// Y el `noindex`, que es la otra mitad del arreglo.
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex, follow'
		);
	});

	test('una página que sí existe conserva su canonical', async ({ page }) => {
		await page.goto('/');

		const canonicas = page.locator('link[rel="canonical"]');
		await expect(canonicas).toHaveCount(1);
		await expect(canonicas).toHaveAttribute('href', 'https://corebalance.app/');

		// La portada no lleva `noindex`: si lo llevara, el arreglo se habría ido de rango.
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
	});
});
