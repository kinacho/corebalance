import adapter from '@sveltejs/adapter-auto';
import { mdsvex } from 'mdsvex';
import { BILINGUAL_ROUTES } from './src/lib/i18n/bilingual-routes.js';

/**
 * `'*'` cubre las rutas sin parámetros obligatorios, lo que incluye la variante
 * en español de `[[lang=locale]]` (el parámetro ausente). La variante `/en/...`
 * hay que pedirla explícitamente, o no se generaría el HTML en inglés.
 */
const prerenderEntries = [
	'*',
	...BILINGUAL_ROUTES.map((route) => (route === '/' ? '/en' : `/en${route}`)),
	'/rss.xml',
	'/en/rss.xml'
];

/**
 * Texto plano de un nodo mdast, sin formato.
 *
 * @param {any} node
 * @returns {string}
 */
function nodeText(node) {
	if (typeof node.value === 'string') return node.value;
	if (Array.isArray(node.children)) return node.children.map(nodeText).join('');
	return '';
}

/**
 * Cuenta las palabras del artículo y deja los minutos de lectura en el
 * frontmatter, para no tener el dato cableado en la plantilla ni cargar el
 * markdown en crudo en el cliente sólo para contarlo.
 *
 * @returns {(tree: any, file: any) => void}
 */
function remarkReadingTime() {
	const WORDS_PER_MINUTE = 200;

	return (tree, file) => {
		let words = 0;

		/** @param {any} node */
		const walk = (node) => {
			if (typeof node.value === 'string') {
				words += node.value.split(/\s+/).filter(Boolean).length;
			}
			if (Array.isArray(node.children)) node.children.forEach(walk);
		};
		walk(tree);

		file.data.fm = {
			...file.data.fm,
			wordCount: words,
			readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE))
		};
	};
}

/**
 * Extrae las parejas pregunta/respuesta del artículo para poder emitir el schema
 * FAQPage sin duplicar el contenido a mano en el componente.
 *
 * Se considera pregunta cualquier encabezado h2/h3 que termine en '?', y como
 * respuesta el texto que le sigue hasta el siguiente encabezado. Es exactamente
 * cómo están escritos los artículos, así que no hay que retocar los markdown.
 *
 * @returns {(tree: any, file: any) => void}
 */
function remarkFaq() {
	return (tree, file) => {
		const faq = [];
		const nodes = tree.children ?? [];

		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (node.type !== 'heading' || node.depth < 2 || node.depth > 3) continue;

			const question = nodeText(node).trim();
			if (!question.endsWith('?')) continue;

			// Todo lo que hay hasta el siguiente encabezado es la respuesta.
			const answer = [];
			for (let j = i + 1; j < nodes.length && nodes[j].type !== 'heading'; j++) {
				const text = nodeText(nodes[j]).trim();
				if (text) answer.push(text);
			}

			if (answer.length > 0) faq.push({ question, answer: answer.join(' ') });
		}

		file.data.fm = { ...file.data.fm, faq };
	};
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		mdsvex({
			extensions: ['.md'],
			remarkPlugins: [remarkReadingTime, remarkFaq]
		})
	],
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
		// Silenciamos el warning de mdsvex por usar context="module" en Svelte 5
		warningFilter: (warning) => warning.code !== 'script_context_deprecated'
	},
	kit: {
		adapter: adapter(),
		prerender: {
			handleUnseenRoutes: 'ignore',
			entries: prerenderEntries
		}
	}
};

export default config;
