/**
 * Qué ofrecerle a quien acaba de leer un post.
 *
 * Había **una sola llamada a la acción para los 42 artículos**: «¿Listo para rebalancear
 * tu cartera?». Y medido el 11-ago-2026 en Search Console, la mayor parte del tráfico
 * llega buscando **qué fondo comprar** (`acc vs dist`, `iwda vs vwce`: ~1.020
 * impresiones de 3.700). O sea que a alguien que **todavía no tiene cartera** se le
 * preguntaba si está listo para rebalancearla, con el verbo que además resultó ser el de
 * menos demanda de todo el sitio.
 *
 * Esto elige la familia a partir de las etiquetas que el post ya trae. No hace falta
 * tocar los 42 ficheros ni inventar un campo nuevo en el frontmatter.
 *
 * ⚠️ **El orden de las familias es la decisión, no la lista de etiquetas.** Un post suele
 * encajar en varias —`msci-world-acc-vs-dist` lleva `acumulacion` y `fiscalidad` a la
 * vez— y gana la primera que case. El criterio es **qué le exige al lector la oferta**,
 * no de qué habla el artículo:
 *
 *   1. `importar`   — pidió explícitamente meter datos: la oferta es exactamente eso.
 *   2. `comparar`   — puede no tener cartera, así que se le ofrece la de ejemplo.
 *   3. `fiscalidad` — presupone cartera **y** una decisión de mover dinero.
 *   4. `rebalancear`— por defecto.
 *
 * ⚠️ `comparar` va **antes** que `fiscalidad` justamente por `msci-world-acc-vs-dist`, que
 * es la página con más impresiones del sitio (651 de 3.700) y cuyas consultas medidas son
 * `acc vs dist`: alguien eligiendo clase de fondo, que igual ni ha abierto cuenta. Con
 * `fiscalidad` delante se le ofrecía calcular el traspaso de una cartera que no tiene.
 *
 * ⚠️ Y los nombres de bróker **no** entran en `importar`: llevar la etiqueta `myinvestor`
 * no hace que un post trate de importar. `rebalanceo-myinvestor-sin-impuestos` es un
 * artículo fiscal, y con los brókeres en esa lista salía ofreciendo subir un CSV. La
 * señal de importación son `csv` / `import` / `importar` y la familia de la hoja de
 * cálculo, no el nombre del sitio donde tiene el dinero.
 */

export type CtaFamilia = 'importar' | 'fiscalidad' | 'comparar' | 'rebalancear';

/**
 * Las familias, en orden de prioridad. La última no lleva etiquetas: es el destino de
 * todo lo que no case, y es el CTA que había antes.
 */
const FAMILIAS: { familia: CtaFamilia; etiquetas: string[] }[] = [
	{
		familia: 'importar',
		etiquetas: [
			'csv',
			'import',
			'importar',
			'excel',
			'google-sheets',
			'spreadsheets',
			'notion',
			'plantilla',
			'templates',
			'seguimiento-cartera',
			'portfolio-tracker'
		]
	},
	{
		familia: 'comparar',
		etiquetas: [
			'comparativa',
			'comparison',
			'iwda',
			'vwce',
			'ucits',
			'msci-world',
			'emerging-markets',
			'acumulacion',
			'distribucion',
			'accumulating',
			'distributing',
			'alternativas',
			'alternatives',
			'portfolio-performance',
			'comisiones',
			'transaction-fees'
		]
	},
	{
		familia: 'fiscalidad',
		etiquetas: [
			'fiscalidad',
			'taxes',
			'taxation',
			'impuestos',
			'traspasos',
			'fund-transfers',
			'hacienda',
			'irpf',
			'income-tax',
			'capital-gains',
			'declaracion-renta',
			'diferimiento-fiscal',
			'tax-deferral'
		]
	}
];

/** Por defecto: el CTA de siempre. Es lo que se sirve cuando nada casa. */
export const CTA_POR_DEFECTO: CtaFamilia = 'rebalancear';

/**
 * La familia de un post a partir de sus etiquetas.
 *
 * ⚠️ Ante la duda devuelve `rebalancear`, que es lo que ya había: un fallo aquí puede
 * enseñar un CTA menos afinado, nunca dejar el artículo sin llamada a la acción.
 */
export function familiaDeCta(tags: readonly string[] | undefined | null): CtaFamilia {
	if (!tags || tags.length === 0) return CTA_POR_DEFECTO;
	const normalizadas = new Set(tags.map((t) => String(t).trim().toLowerCase()));

	for (const { familia, etiquetas } of FAMILIAS) {
		if (etiquetas.some((e) => normalizadas.has(e))) return familia;
	}
	return CTA_POR_DEFECTO;
}
