/**
 * Formato numérico de los **ejes y rótulos de los gráficos**.
 *
 * Existe aparte de `utils.ts` por una razón concreta: `formatEUR()` es el
 * formato de un *importe* —dos decimales, agrupación completa— y en un eje eso
 * es ilegible. Una rejilla que dice `117.000,00 €` cinco veces gasta un tercio
 * del ancho del lienzo en ceros que nadie lee, y es el detalle que más delata a
 * un gráfico hecho a ojo. En el eje se escribe `117k €`.
 *
 * ⚠️ **Los decimales los decide el paso de la rejilla, no la magnitud.** Es la
 * trampa de este formato: con la cartera entre 116.000 y 116.500 el paso es de
 * 100 €, así que redondear a `116k` repite la misma etiqueta en las seis marcas
 * y el eje deja de informar. Por eso `formatCompactCurrency` acepta `step`:
 * Chart.js entrega el array de marcas en `ticks.callback`, de ahí sale el paso,
 * y de ahí los decimales. Sin `step` se asume el paso más grosero posible.
 */

import { get } from 'svelte/store';
import { locale as localeStore } from './i18n/i18n-svelte';

/** Locale de formato a partir del idioma activo, con la misma regla que `utils.ts`. */
function activeFormatLocale(): string {
	try {
		return get(localeStore) === 'en' ? 'en-US' : 'es-ES';
	} catch {
		return 'es-ES';
	}
}

/**
 * Escala y sufijo para una magnitud.
 *
 * Se corta en millones a propósito: por encima, `1.000M` se entiende en los dos
 * idiomas y `B` no —«billón» en español es 10¹², así que un `1B €` heredado del
 * inglés diría mil veces más de lo que vale la cartera.
 */
function scaleFor(abs: number): { unit: number; suffix: string } {
	if (abs >= 1e6) return { unit: 1e6, suffix: 'M' };
	if (abs >= 1e3) return { unit: 1e3, suffix: 'k' };
	return { unit: 1, suffix: '' };
}

/**
 * Decimales necesarios para que dos marcas consecutivas no salgan iguales.
 *
 * `step` viene en unidades del dato; se compara contra la escala ya aplicada.
 * Se topa en 2 porque un eje con tres decimales vuelve a ser el problema que
 * este módulo existe para evitar.
 */
function decimalsFor(step: number, unit: number): number {
	if (!Number.isFinite(step) || step <= 0) return 0;
	const scaled = step / unit;
	if (scaled >= 1) return 0;
	return Math.min(2, Math.max(0, Math.ceil(-Math.log10(scaled))));
}

/**
 * Inserta el sufijo de escala pegado al número, respetando dónde pone cada
 * idioma el símbolo de la divisa.
 *
 * Se usa `formatToParts` en lugar de concatenar a mano porque la posición
 * cambia con el idioma (`117k €` en español, `€117k` en inglés) y el espacio
 * que va delante del símbolo en español es un `U+00A0`, no un espacio normal.
 */
function withSuffix(parts: Intl.NumberFormatPart[], suffix: string): string {
	if (!suffix) return parts.map((p) => p.value).join('');

	const numeric = new Set(['integer', 'group', 'decimal', 'fraction', 'minusSign', 'plusSign']);
	let lastNumeric = -1;
	for (let i = 0; i < parts.length; i++) {
		if (numeric.has(parts[i].type)) lastNumeric = i;
	}

	return parts
		.map((p, i) => (i === lastNumeric ? p.value + suffix : p.value))
		.join('');
}

/**
 * Importe compacto para un eje: `117k €`, `1,2M €`, `850 €`.
 *
 * @param step Distancia entre dos marcas de la rejilla. Sin ella se redondea a
 *   la unidad de escala entera, que es lo correcto para un rótulo suelto pero
 *   no para un eje con marcas juntas.
 */
export function formatCompactCurrency(
	value: number,
	currency = 'EUR',
	step?: number,
	localeOverride?: string
): string {
	const fmtLocale = localeOverride ?? activeFormatLocale();
	const { unit, suffix } = scaleFor(Math.abs(value));
	const decimals = decimalsFor(step ?? unit, unit);

	const parts = new Intl.NumberFormat(fmtLocale, {
		style: 'currency',
		currency,
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).formatToParts(value / unit);

	return withSuffix(parts, suffix);
}

/**
 * El paso de la rejilla a partir de las marcas que Chart.js entrega al
 * `callback`. Devuelve `undefined` con menos de dos marcas, que es cuando no
 * hay paso que medir.
 */
export function stepFromTicks(ticks: readonly { value: number }[] | undefined): number | undefined {
	if (!ticks || ticks.length < 2) return undefined;
	const step = Math.abs(ticks[1].value - ticks[0].value);
	return step > 0 ? step : undefined;
}

/**
 * Porcentaje de eje: un decimal como mucho, y **sin decimal cuando el paso es
 * de un punto o más**. `0,0 %` y `2,0 %` en la misma rejilla es ruido.
 */
export function formatAxisPercent(value: number, step?: number, localeOverride?: string): string {
	const fmtLocale = localeOverride ?? activeFormatLocale();
	const decimals = step !== undefined && step >= 1 ? 0 : 1;
	return (
		new Intl.NumberFormat(fmtLocale, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(value) + ' %'
	);
}

/**
 * Marcas «redondas» para un eje de valores que se dibuja a mano.
 *
 * Chart.js trae la suya; los gráficos en SVG del repo no, y sin esto un eje que
 * llega a 702.854 € se marca en 175.713,5 / 351.427 / … , que es exactamente el
 * ruido que este módulo existe para quitar. El paso se redondea al 1, 2, 5 o 10
 * más cercano de su magnitud, que es la regla clásica y la que hace que las
 * etiquetas salgan legibles al aplicarles `formatCompactCurrency`.
 *
 * Devuelve también el `max` ajustado, porque el eje tiene que llegar hasta la
 * última marca o la marca se sale del lienzo.
 */
export function niceTicks(max: number, targetCount = 4): { ticks: number[]; max: number; step: number } {
	if (!Number.isFinite(max) || max <= 0) return { ticks: [0], max: 1, step: 1 };

	const rawStep = max / targetCount;
	const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
	const normalized = rawStep / magnitude;
	const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
	const step = niceNormalized * magnitude;

	const top = Math.ceil(max / step) * step;
	const ticks: number[] = [];
	// Se compara con media tolerancia de paso para que el error de coma flotante
	// no se coma la última marca.
	for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);

	return { ticks, max: top, step };
}

/**
 * Importe **sin céntimos**, para cifras que son una estimación.
 *
 * Una proyección a veinte años depende de acertar el 7 % anual; darla al
 * céntimo (`702.854,19 €`) es precisión inventada, y el usuario la lee como una
 * promesa. Los céntimos se reservan para importes que existen de verdad: el
 * precio de una operación, el saldo de una posición.
 */
export function formatEstimate(value: number, currency = 'EUR', localeOverride?: string): string {
	const fmtLocale = localeOverride ?? activeFormatLocale();
	return new Intl.NumberFormat(fmtLocale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(value);
}
