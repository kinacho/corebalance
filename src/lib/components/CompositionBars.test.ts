import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import CompositionBars from './CompositionBars.svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';

loadLocale('es');
setLocale('es');

/**
 * `composition.test.ts` prueba la aritmética; esto prueba **el cableado**, que es
 * lo que un test puro no puede ver: que la marca del objetivo y la banda lleguen
 * al DOM sólo donde toca, y que el nombre del activo salga entero.
 */

/**
 * ⚠️ La cartera se construye **dentro** de la fábrica: `vi.mock` se iza al
 * principio del fichero, así que no puede leer nada declarado arriba. Vitest lo
 * reporta como «error when mocking a module» y la suite se queda en cero tests
 * —que con la salida filtrada se lee como `PASS (0)` y parece que va bien—.
 */
vi.mock('$lib/stores/portfolio.svelte', () => {
	const pos = (
		ticker: string,
		name: string,
		totalValue: number,
		currentWeight: number,
		targetWeight = 0
	) => ({
		asset: { ticker, name, targetWeight, color: '#d97706', category: 'core' },
		totalValue,
		currentWeight
	});

	return {
		portfolio: {
			portfolioState: {
				positions: [
					pos('IWDA.AS', 'iShares Core MSCI World', 57930, 0.76, 0.8),
					pos('ZPRV.DE', 'SPDR MSCI USA Small Cap Value', 9925, 0.1302, 0.1),
					pos('EMIM.AS', 'iShares Core MSCI EM IMI', 8368, 0.1098, 0.1)
				],
				totalCapital: 76223
			},
			stockState: { positions: [pos('AMZN', 'Amazon.com Inc', 9490, 0.5)], totalCapital: 9490 },
			satelliteState: { positions: [], totalCapital: 0 },
			isPrivate: false
		}
	};
});

describe('CompositionBars.svelte', () => {
	it('pinta una fila por posición con valor, agrupadas por bloque', () => {
		const { container } = render(CompositionBars);
		expect(container.querySelectorAll('.row')).toHaveLength(4);
		// El bloque conservador está vacío y no debe generar cabecera.
		expect(container.querySelectorAll('.block')).toHaveLength(2);
	});

	/**
	 * El defecto que mató a los donuts: `iShares Core MSCI World` e
	 * `iShares Core MSCI EM IMI` comparten 18 caracteres y la leyenda los cortaba
	 * al mismo texto, sin `title` ni ticker con el que distinguirlos.
	 */
	it('escribe el nombre completo, sin dos filas que digan lo mismo', () => {
		const { container } = render(CompositionBars);
		const nombres = [...container.querySelectorAll('.row-name')].map((n) => n.textContent?.trim());
		expect(nombres).toContain('iShares Core MSCI World');
		expect(nombres).toContain('iShares Core MSCI EM IMI');
		expect(new Set(nombres).size).toBe(nombres.length);
	});

	it('la marca del objetivo y la banda salen sólo en las filas que tienen objetivo', () => {
		const { container } = render(CompositionBars);
		// Tres activos del core lo tienen; Amazon no.
		expect(container.querySelectorAll('.tick')).toHaveLength(3);
		expect(container.querySelectorAll('.band')).toHaveLength(3);
	});

	it('la banda envuelve al objetivo, no arranca de la izquierda del carril', () => {
		const { container } = render(CompositionBars);
		const fila = container.querySelectorAll('.row')[0];
		const banda = fila.querySelector('.band') as HTMLElement;
		const marca = fila.querySelector('.tick') as HTMLElement;

		const izq = parseFloat(banda.style.left);
		const ancho = parseFloat(banda.style.width);
		const centro = parseFloat(marca.style.left);

		expect(izq).toBeGreaterThan(0);
		expect(centro).toBeGreaterThan(izq);
		expect(centro).toBeLessThan(izq + ancho);
	});

	it('ninguna barra se sale del carril, ni siquiera la marca del objetivo', () => {
		const { container } = render(CompositionBars);
		for (const bar of container.querySelectorAll('.bar')) {
			expect(parseFloat((bar as HTMLElement).style.width)).toBeLessThanOrEqual(100);
		}
		for (const tick of container.querySelectorAll('.tick')) {
			expect(parseFloat((tick as HTMLElement).style.left)).toBeLessThanOrEqual(100);
		}
	});

	it('dice «en banda» cuando lo está y los puntos porcentuales cuando no', () => {
		const { container } = render(CompositionBars);
		const devs = [...container.querySelectorAll('.row-dev')].map((n) => n.textContent?.trim());
		// Con la banda por defecto de ±5 pp, esta cartera está entera dentro.
		expect(devs.filter((d) => d === 'en banda')).toHaveLength(3);
		// Amazon no tiene objetivo: su celda va vacía, no con un 0 inventado.
		expect(devs.filter((d) => d === '')).toHaveLength(1);
	});

	it('con la banda estrecha aparecen los puntos porcentuales y su signo', () => {
		const { container } = render(CompositionBars, { props: { bandPp: 2.5 } });
		const texto = container.textContent ?? '';
		expect(texto).toContain('4,0 pp');
		expect(texto).toContain('3,0 pp');
		// Signo y flecha además del color: el estado nunca depende solo del tono.
		expect(texto).toContain('▼');
		expect(texto).toContain('▲');
	});

	it('no filtra el importe en el title cuando el modo privado está activo', async () => {
		const { portfolio } = await import('$lib/stores/portfolio.svelte');
		(portfolio as { isPrivate: boolean }).isPrivate = true;
		const { container } = render(CompositionBars);
		const titles = [...container.querySelectorAll('.row')].map((r) => r.getAttribute('title') ?? '');
		expect(titles.some((t) => /\d/.test(t))).toBe(false);
		(portfolio as { isPrivate: boolean }).isPrivate = false;
	});
});
