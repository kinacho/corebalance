/** Debe coincidir con el remote real: un `sameAs` a un repo inexistente es una señal de entidad rota. */
export const GITHUB_REPO = 'https://github.com/kinacho/Rebalanceador-90-5-5';

/**
 * Datos del autor del blog, en un solo sitio porque los consumen la página de
 * autor, el schema `Person` de los posts y el `SoftwareApplication` de la
 * landing. Sin una página de autor real el `author` de `BlogPosting` es un
 * nombre suelto, y finanzas es la categoría YMYL donde Google es más exigente
 * con la señal de E-E-A-T.
 *
 * ⚠️ La biografía es deliberadamente conservadora: sólo afirma lo que se puede
 * verificar desde el propio proyecto. Concrétala (años invirtiendo, formación,
 * brokers que usas) antes de publicar: cuanto más específica y verificable, más
 * fuerte es la señal — pero nada de credenciales que no sean ciertas.
 */
export const AUTHOR = {
	/** Debe coincidir con el campo `author` del frontmatter de los posts. */
	name: 'kinacho',
	displayName: 'Kinacho',
	path: '/autor/kinacho',
	github: 'https://github.com/kinacho',
	jobTitle: {
		es: 'Desarrollador e inversor indexado',
		en: 'Developer and index investor'
	},
	headline: {
		es: 'Quién escribe en CoreBalance',
		en: 'Who writes on CoreBalance'
	},
	bio: {
		es: [
			'Soy desarrollador de software e inversor particular en fondos indexados y ETFs. CoreBalance nació de un problema propio: rebalancear una cartera a mano en una hoja de cálculo, cada trimestre, sin equivocarme con los pesos ni con las aportaciones.',
			'Escribo sobre lo que uso: rebalanceo por bandas, aportaciones periódicas, traspasos entre fondos, comisiones reales y el coste fiscal de vender para reequilibrar. Todo desde la práctica de gestionar mi propia cartera, no desde la teoría.',
			'No soy asesor financiero y nada de lo que publico aquí es una recomendación de inversión. Cuando cito normativa o datos de costes, enlazo la fuente primaria para que puedas comprobarla tú.'
		],
		en: [
			'I am a software developer and a retail investor in index funds and ETFs. CoreBalance came out of a problem of my own: rebalancing a portfolio by hand in a spreadsheet, every quarter, without getting the weights or the contributions wrong.',
			'I write about what I actually use: band rebalancing, regular contributions, fund-to-fund transfers, real fees and the tax cost of selling to rebalance. All of it from running my own portfolio, not from theory.',
			'I am not a financial adviser and nothing published here is investment advice. Whenever I cite regulation or cost data I link the primary source so you can check it yourself.'
		]
	},
	/** Temas sobre los que escribe — alimenta `knowsAbout` del schema Person. */
	knowsAbout: [
		'Index investing',
		'Portfolio rebalancing',
		'Asset allocation',
		'ETFs',
		'Index funds',
		'Bogleheads three-fund portfolio',
		'Spanish investment taxation'
	]
} as const;
