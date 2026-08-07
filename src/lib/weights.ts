/**
 * Reparto de pesos objetivo entre los activos del núcleo.
 *
 * ⚠️ Esto vivía dentro de `ManageAssets.svelte` y no es interfaz: **es matemática de
 * dinero**. Decide los `targetWeight`, y los `targetWeight` son la entrada de
 * `calculateRebalance()`, así que un error aquí no se ve como un fallo de pantalla —
 * se ve como una recomendación de aportación equivocada. Era el único trozo de
 * aritmética del repo que no vivía en un módulo puro, y por tanto el único sin tests
 * ni mutación. Sale del componente por el mismo motivo por el que salió `ledger.ts`
 * del store.
 *
 * Las funciones **no tocan el store**: devuelven los pesos resultantes y el
 * componente los aplica. Eso es lo que las hace probables sin montar un DOM.
 *
 * Convenio de unidades, que es fuente de confusión constante en este fichero: los
 * pesos se guardan como **fracción** (0,35), y el usuario los escribe en
 * **porcentaje** (35). Sólo `redistributeWeights` recibe porcentaje, y lo dice su
 * nombre de parámetro.
 */

/** Lo mínimo que necesita saberse de un activo para repartir. */
export interface WeightedAsset {
	ticker: string;
	targetWeight: number;
}

/** Mapa ticker → peso, en fracción. */
export type Weights = Record<string, number>;

export interface RedistributeResult {
	/** Pesos resultantes de **todos** los activos. Vacío si no se pudo repartir. */
	weights: Weights;
	/** Presente cuando no había a quién quitarle el peso que se pide. */
	error?: 'no-free-assets';
}

/** Los pesos se guardan con cuatro decimales; el tope de bloqueados con dos. */
export const WEIGHT_DECIMALS = 4;

/** Por debajo de esto, la diferencia con el 100 % es ruido de redondeo. */
const TOLERANCIA = 0.00001;

export function roundWeight(val: number, dec: number = WEIGHT_DECIMALS): number {
	const factor = Math.pow(10, dec);
	return Math.round(val * factor) / factor;
}

/**
 * Cuadra la suma a 1 exacto echando el sobrante del redondeo sobre un activo.
 *
 * ⚠️ El sobrante va **al primer activo no bloqueado en el orden de la lista**, y ese
 * puede ser el que el usuario acaba de fijar. Es decir: pedir 35 % puede dejarte un
 * 35,01 %. Queda así porque es el comportamiento que la app lleva teniendo y el
 * sobrante es de una diezmilésima, pero está fijado en un test para que se vea si
 * algún día molesta. Si todos están bloqueados, el sobrante cae en el primero de
 * todos: cuadrar importa más que respetar un candado en una diezmilésima.
 */
export function settleToExactTotal(
	assets: WeightedAsset[],
	weights: Weights,
	locked: Record<string, boolean> = {}
): Weights {
	if (assets.length === 0) return weights;

	const salida = { ...weights };
	let total = 0;
	for (const a of assets) total += salida[a.ticker] ?? 0;

	const diff = 1.0 - total;
	if (Math.abs(diff) <= TOLERANCIA) return salida;

	const destino = assets.find((a) => !locked[a.ticker]) ?? assets[0];
	salida[destino.ticker] = Math.max(0, roundWeight((salida[destino.ticker] ?? 0) + diff));
	return salida;
}

/**
 * Fija el peso de un activo y reparte el resto entre los que no están bloqueados.
 *
 * El reparto es **proporcional a lo que cada uno ya tenía**, que es lo que conserva
 * las proporciones relativas de la cartera al mover una sola. Sólo cuando todos los
 * libres están a cero se reparte a partes iguales: sin ese caso, multiplicar por
 * cero dejaría a todo el mundo a cero y la suma no cerraría nunca.
 */
export function redistributeWeights(
	assets: WeightedAsset[],
	ticker: string,
	newPercent: number,
	locked: Record<string, boolean> = {}
): RedistributeResult {
	// Con un solo activo no hay nada que repartir: se lo lleva todo.
	if (assets.length <= 1) {
		return { weights: assets.length === 1 ? { [assets[0].ticker]: 1.0 } : {} };
	}

	let lockedSum = 0;
	for (const a of assets) {
		if (a.ticker !== ticker && locked[a.ticker]) lockedSum += a.targetWeight;
	}

	const otherFree = assets.filter((a) => a.ticker !== ticker && !locked[a.ticker]);
	if (otherFree.length === 0) {
		return { weights: {}, error: 'no-free-assets' };
	}

	// El usuario no puede pedir más de lo que no está bloqueado.
	const maxPercent = Math.max(0, 100 - roundWeight(lockedSum * 100, 2));
	const clampedPercent = Math.max(0, Math.min(maxPercent, newPercent));
	const newWeight = roundWeight(clampedPercent / 100);

	const availableWeight = roundWeight(1.0 - newWeight - lockedSum);

	let otherFreeSum = 0;
	for (const a of otherFree) otherFreeSum += a.targetWeight;

	const weights: Weights = {};
	for (const a of assets) weights[a.ticker] = a.targetWeight;

	if (otherFreeSum > 0) {
		for (const a of otherFree) {
			weights[a.ticker] = roundWeight(a.targetWeight * (availableWeight / otherFreeSum));
		}
	} else {
		const equalShare = availableWeight / otherFree.length;
		for (const a of otherFree) weights[a.ticker] = roundWeight(equalShare);
	}

	weights[ticker] = newWeight;

	return { weights: settleToExactTotal(assets, weights, locked) };
}

/**
 * Reparte a partes iguales entre todos. Los candados se sueltan al igualar —esa
 * parte la hace el componente, porque los candados son estado suyo—, así que aquí no
 * se respetan a propósito.
 */
export function equalizeWeights(assets: WeightedAsset[]): Weights {
	if (assets.length === 0) return {};

	const baseWeight = roundWeight(1.0 / assets.length);
	const weights: Weights = {};
	for (const a of assets) weights[a.ticker] = baseWeight;

	return settleToExactTotal(assets, weights, {});
}
