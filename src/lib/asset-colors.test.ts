import { describe, it, expect } from 'vitest';
import { nextAssetColor, assignAssetColors } from './asset-colors';
import { ASSET_COLORS, CHART_NEUTRAL } from './constants';

describe('nextAssetColor', () => {
	it('empieza por el primer tono de la paleta con la cartera vacía', () => {
		expect(nextAssetColor([])).toBe(ASSET_COLORS[0]);
	});

	it('va dando tonos libres antes de repetir ninguno', () => {
		const cartera = ASSET_COLORS.slice(0, 3).map((color) => ({ color }));
		expect(nextAssetColor(cartera)).toBe(ASSET_COLORS[3]);
	});

	it('con la paleta llena repite el menos usado, no uno al azar', () => {
		// Todos a uno menos el tercero, que va a dos: el siguiente no puede ser ése.
		const cartera = [...ASSET_COLORS, ASSET_COLORS[2]].map((color) => ({ color }));
		const elegido = nextAssetColor(cartera);
		expect(elegido).not.toBe(ASSET_COLORS[2]);
		expect(ASSET_COLORS).toContain(elegido);
	});

	it('es determinista: dos llamadas con la misma cartera dan lo mismo', () => {
		const cartera = [...ASSET_COLORS, ASSET_COLORS[0], ASSET_COLORS[1]].map((color) => ({ color }));
		expect(nextAssetColor(cartera)).toBe(nextAssetColor(cartera));
	});

	it('ignora los colores que no son de la paleta en vez de contarlos', () => {
		// Un activo heredado con un color de marca no debe gastar un hueco.
		const cartera = [{ color: '#00a4ef' }, { color: '#555555' }];
		expect(nextAssetColor(cartera)).toBe(ASSET_COLORS[0]);
	});

	it('nunca inventa un séptimo tono', () => {
		const cartera: { color: string }[] = [];
		for (let i = 0; i < 40; i++) {
			const color = nextAssetColor(cartera);
			expect(ASSET_COLORS).toContain(color);
			cartera.push({ color });
		}
	});
});

describe('assignAssetColors', () => {
	it('reparte los seis tonos distintos antes de repetir', () => {
		const repartidos = assignAssetColors(Array.from({ length: 6 }, () => ({})));
		expect(new Set(repartidos.map((a) => a.color)).size).toBe(6);
	});

	/**
	 * El caso del demo: nueve activos y seis tonos. Que repita es inevitable;
	 * lo que no puede pasar es que un activo salga gris —el gris es de «Otros»—
	 * ni que dos de los seis primeros coincidan, que son los que el donut dibuja
	 * por separado.
	 */
	it('con más activos que tonos reparte lo más plano posible y sin gris', () => {
		const repartidos = assignAssetColors(Array.from({ length: 9 }, () => ({})));

		expect(new Set(repartidos.slice(0, 6).map((a) => a.color)).size).toBe(6);
		for (const asset of repartidos) {
			expect(asset.color).not.toBe(CHART_NEUTRAL);
			expect(ASSET_COLORS).toContain(asset.color);
		}

		const cuentas = new Map<string, number>();
		for (const a of repartidos) cuentas.set(a.color, (cuentas.get(a.color) ?? 0) + 1);
		// Nueve entre seis: tres tonos van a dos y tres a uno. Nada a tres.
		expect(Math.max(...cuentas.values())).toBe(2);
	});

	it('conserva el resto de campos del activo', () => {
		const [asset] = assignAssetColors([{ ticker: 'IWDA.AS', color: '#00a4ef' }]);
		expect(asset.ticker).toBe('IWDA.AS');
		expect(asset.color).toBe(ASSET_COLORS[0]);
	});
});
