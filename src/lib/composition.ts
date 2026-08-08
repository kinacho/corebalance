/**
 * La composición de la cartera como **lista ordenada por bloques**, que es lo
 * que dibuja `CompositionBars.svelte`.
 *
 * Sustituye a dos donuts: «Estrategia actual» (el core sobre el core) y
 * «Detalle global» (todo sobre el total). Eran los mismos activos con distinto
 * denominador, y el donut hacía cero trabajo — nadie lee 13,02 % contra 10,98 %
 * de dos arcos, se lee de la leyenda. Con barras alineadas la comparación es
 * inmediata, cabe el nombre entero (dos fondos de la misma gestora se truncaban
 * al mismo texto y no había forma de distinguirlos) y **cabe la marca del
 * objetivo**, que es lo que la app existe para responder.
 *
 * Puro y sin store, como `weights.ts` y `treemap.ts`: se puede probar sin DOM.
 */

import type { PortfolioPosition, PortfolioState } from './types';

/**
 * Ancho de la banda de tolerancia, **en puntos porcentuales sobre el bloque**.
 *
 * Cinco es el número que usa la propia divulgación del proyecto: el post
 * «Cuándo rebalancear tu cartera» describe la banda como «habitualmente un 5 %
 * absoluto». Se declara aquí, en un solo sitio y con la razón escrita, porque el
 * día que sea un ajuste del usuario este valor pasa a ser su predeterminado y no
 * hay que ir a buscarlo por los componentes.
 *
 * ⚠️ Es **absoluta, no relativa**: un objetivo del 10 % con banda de 5 pp
 * tolera de 5 % a 15 %, no de 9,5 % a 10,5 %. La relativa es defendible y es
 * otra decisión; si algún día se ofrece, tiene que ser explícita en la interfaz,
 * porque las dos lecturas dan respuestas opuestas en las patas pequeñas.
 */
export const TOLERANCE_BAND_PP = 5;

/**
 * ⚠️ **El borde exacto de la banda no se puede comparar sin tolerancia.**
 * Un activo justo en el límite —15 % con objetivo del 20 % y banda de 5 pp—
 * calcula `0,15 − 0,2 = −0,05000000000000002`, o sea **−5,000000000000002 pp**,
 * y un `<=` pelado lo declara fuera. La misma cuenta por el otro lado
 * (`0,85 − 0,8`) da 4,999999999999993 y sale dentro: el resultado depende del
 * signo, que es la peor clase de arbitrariedad.
 *
 * Lo cazó el test del borde en `drift.test.ts`. Dos milbillonésimas de punto
 * porcentual no son una desviación, así que la comparación las perdona — y vive
 * en una función compartida para que los dos módulos que preguntan lo mismo no
 * puedan volver a responder distinto.
 */
const BAND_EPSILON_PP = 1e-9;

export function isWithinBand(deviationPp: number, bandPp: number): boolean {
	return Math.abs(deviationPp) <= bandPp + BAND_EPSILON_PP;
}

export type BlockKey = 'core' | 'stocks' | 'satellite';

export interface CompositionRow {
	ticker: string;
	name: string;
	color: string;
	/** Peso sobre el patrimonio **total**, en tanto por uno. */
	weightOfTotal: number;
	/** Peso dentro de su bloque, en tanto por uno. */
	weightOfBlock: number;
	value: number;
	/** Objetivo dentro del bloque, en tanto por uno. `null` si no lo tiene. */
	target: number | null;
	/** Desviación en **puntos porcentuales** sobre el bloque. `null` sin objetivo. */
	deviationPp: number | null;
	/** `null` cuando no hay objetivo contra el que estar dentro o fuera. */
	inBand: boolean | null;
}

export interface CompositionBlock {
	key: BlockKey;
	/** Peso del bloque sobre el total, en tanto por uno. */
	weightOfTotal: number;
	value: number;
	/**
	 * ⚠️ Se decide **por los datos, nunca por el nombre del bloque**, igual que en
	 * el mapa de desviación: si algún activo del bloque tiene objetivo, el bloque
	 * se mide. Así, ponerle objetivos a los satélites enciende sus barras solo,
	 * sin tocar código.
	 */
	measured: boolean;
	rows: CompositionRow[];
}

interface Input {
	core: PortfolioState;
	stocks: PortfolioState;
	satellite: PortfolioState;
}

/** Las posiciones con valor; una posición a cero no es una fila, es ruido. */
function heldPositions(state: PortfolioState): PortfolioPosition[] {
	return state.positions.filter((p) => p.totalValue > 0);
}

function buildBlock(
	key: BlockKey,
	state: PortfolioState,
	globalCapital: number,
	bandPp: number
): CompositionBlock {
	const held = heldPositions(state);
	const measured = held.some((p) => p.asset.targetWeight > 0);
	const value = held.reduce((sum, p) => sum + p.totalValue, 0);

	const rows: CompositionRow[] = held
		.map((p) => {
			// Solo hay objetivo si el bloque se mide *y* este activo tiene el suyo.
			// Un activo a cero dentro de un bloque medido es la anomalía que el mapa
			// de desviación raya: aquí se queda sin marca y sin banda, no con una
			// desviación inventada que sería su propio peso otra vez.
			const hasTarget = measured && p.asset.targetWeight > 0;
			const deviationPp = hasTarget ? (p.currentWeight - p.asset.targetWeight) * 100 : null;

			return {
				ticker: p.asset.ticker,
				name: p.asset.name,
				color: p.asset.color,
				weightOfTotal: globalCapital > 0 ? p.totalValue / globalCapital : 0,
				weightOfBlock: p.currentWeight,
				value: p.totalValue,
				target: hasTarget ? p.asset.targetWeight : null,
				deviationPp,
				inBand: deviationPp === null ? null : isWithinBand(deviationPp, bandPp)
			};
		})
		.sort((a, b) => b.weightOfTotal - a.weightOfTotal);

	return {
		key,
		weightOfTotal: globalCapital > 0 ? value / globalCapital : 0,
		value,
		measured,
		rows
	};
}

/**
 * Agrupa las tres carteras en bloques con sus filas ya ordenadas de mayor a
 * menor peso.
 *
 * Los bloques vacíos se descartan: una cartera sin acciones individuales no
 * necesita una cabecera que anuncie que no hay nada debajo.
 */
export function buildComposition(
	{ core, stocks, satellite }: Input,
	bandPp: number = TOLERANCE_BAND_PP
): CompositionBlock[] {
	const globalCapital = [core, stocks, satellite].reduce(
		(sum, s) => sum + heldPositions(s).reduce((acc, p) => acc + p.totalValue, 0),
		0
	);

	return [
		buildBlock('core', core, globalCapital, bandPp),
		buildBlock('stocks', stocks, globalCapital, bandPp),
		buildBlock('satellite', satellite, globalCapital, bandPp)
	].filter((block) => block.rows.length > 0);
}

/**
 * El tope de la escala horizontal, en tanto por uno del total.
 *
 * ⚠️ No basta con el activo más grande: **la marca del objetivo puede caer más a
 * la derecha que cualquier barra**, y entonces se sale del lienzo. Ocurre cuando
 * un activo está muy por debajo de su objetivo — un core al 40 % con objetivo
 * del 80 % pone la marca al doble de su propia barra.
 *
 * ⚠️ **No es el caso de la cartera demo, y conviene decirlo porque parece que
 * sí.** Ahí el World está al 49,9 % del total contra un objetivo que equivale al
 * 52,6 %: cae por delante de su barra, pero el 8 % de aire ya lo cubriría de
 * sobra. Lo comprobé quitando esta línea y el test seguía verde, así que el
 * test se rehízo con una cartera que sí la necesita. Si alguien vuelve a
 * «simplificar» esto, que sepa que el fixture de la demo no lo detecta.
 */
export function compositionScaleMax(blocks: CompositionBlock[]): number {
	let max = 0;
	for (const block of blocks) {
		for (const row of block.rows) {
			max = Math.max(max, row.weightOfTotal);
			if (row.target !== null) max = Math.max(max, row.target * block.weightOfTotal);
		}
	}
	return max > 0 ? max * 1.08 : 1;
}
