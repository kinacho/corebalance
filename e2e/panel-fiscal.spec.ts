import { test, expect } from '@playwright/test';
import { abrirDashboard, sembrarCartera, FONDOS_DESVIADOS } from './util/cartera';

/**
 * El panel fiscal con un plan de verdad dentro.
 *
 * ⚠️ **La cartera de demostración está exactamente en objetivo**, así que en un navegador
 * ese panel siempre dice «nada que mover» y el camino poblado —el que calcula traspasos,
 * cuenta lo que tributa y estima el IRPF— no se ejercitaba en ningún sitio salvo en un
 * test de componente con el store simulado. Aquí se siembra el estado que lo llena: dos
 * **fondos** del core, uno muy por encima de su objetivo y otro por debajo.
 *
 * Y fondos, no ETF, porque es la distinción de la que cuelga todo: solo las
 * participaciones de fondo se traspasan con diferimiento fiscal (art. 94 LIRPF). Con dos
 * ETF el panel propondría un reembolso tributable y este spec comprobaría otra cosa.
 */
test.describe('Panel fiscal', () => {
	test('propone un traspaso entre fondos y lo marca como no tributable', async ({ page }) => {
		await sembrarCartera(page, FONDOS_DESVIADOS);
		await abrirDashboard(page);

		const panel = page.locator('#tour-tax');
		await expect(panel).toBeVisible();

		// El panel es un acordeón: si está cerrado, se abre por su cabecera.
		if ((await panel.locator('.moves').count()) === 0) {
			await panel.locator('.panel-header').click();
		}

		const movimientos = panel.locator('.move');
		await expect(movimientos.first()).toBeVisible({ timeout: 15_000 });

		// El origen es el fondo sobreponderado y el destino el infraponderado.
		await expect(movimientos.first()).toContainText('Global Stock');
		await expect(movimientos.first()).toContainText('Emerging Markets');

		// Un traspaso entre fondos no tributa: la clase `taxed` marca justo lo contrario,
		// así que no debe estar. Es la afirmación con consecuencias fiscales del panel.
		await expect(movimientos.first()).not.toHaveClass(/taxed/);

		// Y no aparece el mensaje de cartera equilibrada, que es lo que sale con la demo.
		await expect(panel).not.toContainText('Ya está equilibrada');
	});
});
