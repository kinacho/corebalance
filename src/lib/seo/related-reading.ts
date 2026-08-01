/**
 * Lectura relacionada de las páginas que no son del blog.
 *
 * Los 106 enlaces contextuales de los artículos van todos en un sentido: post →
 * herramienta o comparativa. Al revés no había nada, y las comparativas y la
 * landing son precisamente las páginas con más autoridad —las que reciben enlaces
 * externos y rankean para intención comercial—, así que no repartían nada de ese
 * peso hacia los 34 artículos, que son los que aún no posicionan.
 *
 * La selección es **curada, no automática**: para cinco páginas una elección a
 * mano da mejor resultado que el solape de etiquetas, y evita sugerencias raras.
 *
 * Se guardan sólo los slugs **en español**; el equivalente en inglés se resuelve
 * desde `slugs.en` del propio frontmatter, así que no hay una segunda lista que
 * pueda quedar desincronizada.
 */
export const RELATED_READING: Record<string, readonly string[]> = {
	'/comparativas/corebalance-vs-excel': [
		'calculadora-rebalanceo-cartera-excel',
		'plantilla-notion-seguimiento-cartera',
		'como-rebalancear-cartera-indexada'
	],
	'/comparativas/corebalance-vs-ghostfolio': [
		'alternativas-portfolio-performance',
		'como-rebalancear-cartera-indexada',
		'que-es-asset-allocation'
	],
	'/comparativas/corebalance-vs-indexa-capital': [
		'que-es-asset-allocation',
		'cartera-bogle-principiantes-espana',
		'cuando-rebalancear-cartera'
	],
	'/comparativas/corebalance-vs-justetf': [
		'iwda-vs-vwce-comparativa',
		'fondos-indexados-vs-etfs-espana',
		'como-rebalancear-cartera-indexada'
	],
	'/comparativas/corebalance-vs-portfolio-performance': [
		'alternativas-portfolio-performance',
		'plantilla-notion-seguimiento-cartera',
		'como-rebalancear-cartera-indexada'
	],
	'/herramientas/calculadora-ter': [
		'fondos-indexados-vs-etfs-espana',
		'iwda-vs-vwce-comparativa',
		'msci-world-acc-vs-dist'
	],
	'/herramientas/checklist-rebalanceo': [
		'cuando-rebalancear-cartera',
		'que-pasa-si-no-rebalanceo-cartera',
		'rebalancear-sin-pagar-impuestos-espana'
	],
	'/herramientas/calculadora-precio-medio': [
		'dividendos-etfs-degiro',
		'como-rebalancear-cartera-indexada',
		'rebalancear-sin-pagar-impuestos-espana'
	],
	'/herramientas/simulador-crisis': [
		'que-pasa-si-no-rebalanceo-cartera',
		'cuando-rebalancear-cartera',
		'como-rebalancear-cartera-indexada'
	]
};

/** Un artículo recomendado, ya resuelto al idioma de la página. */
export interface ReadingItem {
	slug: string;
	title: string;
	description: string;
	readingMinutes?: number;
}
