/**
 * Reparto de los tonos categóricos entre los activos de la cartera.
 *
 * ⚠️ **Esta función estaba escrita dos veces**, idéntica, dentro de
 * `AssetSearch.svelte` y de `ImportModal.svelte` — o sea en los dos sitios donde
 * se puede añadir un activo—, y **el modo demo no usaba ninguna de las dos**: sus
 * nueve activos llevaban colores de marca a fuego (`#00a4ef` de Microsoft,
 * `#4285f4` de Google, `#555555` de Apple, `#ff9900` de Amazon…). Como el demo
 * es lo primero que ve cualquier visitante, eso significaba que **la cartera de
 * ejemplo se saltaba entera la paleta validada**: tres azules casi idénticos
 * (`#3b82f6`, `#00a4ef`, `#4285f4`) en el mismo donut, y un gris de activo que
 * chocaba con el gris de «Otros», así que el gráfico enseñaba dos porciones
 * grises que significaban cosas distintas.
 *
 * Vive aquí, puro y sin store, por lo mismo que `weights.ts`: es reparto, se
 * puede probar sin DOM, y así hay **un** sitio donde está la regla.
 */

import { ASSET_COLORS } from './constants';

/** Lo mínimo que hace falta saber de un activo ya coloreado. */
interface Coloreable {
	color?: string;
}

/** Lo que devuelve el reparto: el activo tal cual, más un color garantizado. */
export type ConColor<T> = T & { color: string };

/**
 * El siguiente color libre de la paleta, y si están todos ocupados, se
 * reutiliza **en orden** el que menos veces aparezca.
 *
 * El respaldo fue en su día `ASSET_COLORS[Math.floor(Math.random() * …)]`, y un
 * tono al azar puede caer idéntico a otro que ya está en la cartera —
 * exactamente lo que no debe pasar en una paleta categórica. Repetir el menos
 * usado es determinista y reparte, y los tonos siguen siendo los seis
 * validados: **nunca se genera uno nuevo**.
 */
export function nextAssetColor(existing: readonly Coloreable[]): string {
	const timesUsed = new Map<string, number>(ASSET_COLORS.map((c) => [c, 0]));
	for (const asset of existing) {
		if (asset.color && timesUsed.has(asset.color)) {
			timesUsed.set(asset.color, timesUsed.get(asset.color)! + 1);
		}
	}
	// `ASSET_COLORS` marca el desempate, así que el reparto es reproducible.
	return ASSET_COLORS.reduce((best, color) =>
		timesUsed.get(color)! < timesUsed.get(best)! ? color : best
	);
}

/**
 * Reparte tonos a una lista entera, en orden, como si se hubieran ido añadiendo
 * uno a uno. Es lo que usa el demo para no tener que escribir ningún color.
 *
 * ⚠️ **El orden de la lista es el orden del reparto**, así que los primeros se
 * llevan los seis tonos distintos y los siguientes empiezan a repetir. En una
 * lista más larga que la paleta conviene poner delante los que van a pesar más,
 * porque son los que el donut dibuja por separado antes de plegar la cola.
 */
export function assignAssetColors<T extends object>(assets: readonly T[]): ConColor<T>[] {
	const assigned: ConColor<T>[] = [];
	for (const asset of assets) {
		assigned.push({ ...asset, color: nextAssetColor(assigned) });
	}
	return assigned;
}
