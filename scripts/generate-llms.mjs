/**
 * Genera `static/llms.txt` y `static/llms-es.txt` desde las plantillas de
 * `src/content/llms/` y el frontmatter real de los artículos.
 *
 * El problema que resuelve: la sección de contenido del sitio estaba escrita a
 * mano, así que cada post nuevo había que añadirlo también ahí o el fichero
 * mentía a los modelos justo sobre lo que se quiere que citen. La prosa (que está
 * muy trabajada) sigue siendo manual; sólo se genera el índice de contenidos.
 *
 * De paso, la versión en inglés apunta ya a las URLs `/en/...` de las páginas
 * bilingües, que antes no existían.
 *
 * `llms-full.txt` NO se genera: no contiene listado de artículos, así que no se
 * queda desfasado, y su contenido es prosa técnica y fórmulas escritas a mano.
 *
 * Se ejecuta desde el script `prebuild`.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'src', 'content', 'blog');
const TEMPLATE_DIR = join(ROOT, 'src', 'content', 'llms');
const STATIC_DIR = join(ROOT, 'static');

const SITE = 'https://corebalance.app';
const TOKEN = '{{SITE_CONTENT}}';

/** URL absoluta de una ruta bilingüe. El español vive en la raíz. */
function url(path, lang) {
	if (lang === 'es') return `${SITE}${path === '/' ? '/' : path}`;
	return `${SITE}${path === '/' ? '/en' : `/en${path}`}`;
}

const COPY = {
	es: {
		heading: '## Contenido del Sitio',
		app: '### Páginas Principales de la Aplicación',
		tools: '### Herramientas Interactivas',
		comparisons: '### Páginas de Comparativa',
		author: '### Autor',
		feeds: '### Feeds',
		blog: (lang) => (lang === 'es' ? '### Blog — Español (ES)' : '### Blog — Inglés (EN)'),
		appLines: (l) => [
			`- [CoreBalance](${url('/', l)}) — Calculadora de rebalanceo (aplicación principal)`,
			`- [Blog](${url('/blog', l)}) — Blog de inversión indexada`
		],
		toolLines: (l) => [
			`- [Calculadora de TER](${url('/herramientas/calculadora-ter', l)}) — TER medio ponderado de la cartera y simulación de comisiones a largo plazo`,
			`- [Checklist de rebalanceo](${url('/herramientas/checklist-rebalanceo', l)}) — Cuestionario interactivo: ¿toca rebalancear ahora?`
		],
		comparisonLines: (l) => [
			`- [CoreBalance vs Portfolio Performance](${url('/comparativas/corebalance-vs-portfolio-performance', l)})`,
			`- [CoreBalance vs Excel y Google Sheets](${url('/comparativas/corebalance-vs-excel', l)})`,
			`- [CoreBalance vs Indexa Capital](${url('/comparativas/corebalance-vs-indexa-capital', l)})`
		],
		authorLines: (l) => [
			`- [Sobre el autor](${url('/autor/kinacho', l)}) — Quién escribe los artículos, experiencia y aviso de que no es asesoramiento financiero`
		],
		feedLines: () => [
			`- [RSS en español](${SITE}/rss.xml)`,
			`- [RSS en inglés](${SITE}/en/rss.xml)`,
			`- [Sitemap](${SITE}/sitemap.xml)`
		]
	},
	en: {
		heading: '## Site Content',
		app: '### Main Application Pages',
		tools: '### Interactive Tools',
		comparisons: '### Comparison Pages',
		author: '### Author',
		feeds: '### Feeds',
		blog: (lang) => (lang === 'es' ? '### Blog — Spanish (ES)' : '### Blog — English (EN)'),
		appLines: (l) => [
			`- [CoreBalance](${url('/', l)}) — Rebalancing calculator (main application)`,
			`- [Blog](${url('/blog', l)}) — Index investing blog`
		],
		toolLines: (l) => [
			`- [TER Calculator](${url('/herramientas/calculadora-ter', l)}) — Weighted portfolio TER and long-term fee simulation`,
			`- [Rebalancing Checklist](${url('/herramientas/checklist-rebalanceo', l)}) — Interactive quiz: should I rebalance now?`
		],
		comparisonLines: (l) => [
			`- [CoreBalance vs Portfolio Performance](${url('/comparativas/corebalance-vs-portfolio-performance', l)})`,
			`- [CoreBalance vs Excel & Google Sheets](${url('/comparativas/corebalance-vs-excel', l)})`,
			`- [CoreBalance vs Indexa Capital](${url('/comparativas/corebalance-vs-indexa-capital', l)})`
		],
		authorLines: (l) => [
			`- [About the author](${url('/autor/kinacho', l)}) — Who writes the articles, background, and the note that none of it is financial advice`
		],
		feedLines: () => [
			`- [RSS in Spanish](${SITE}/rss.xml)`,
			`- [RSS in English](${SITE}/en/rss.xml)`,
			`- [Sitemap](${SITE}/sitemap.xml)`
		]
	}
};

/** Frontmatter mínimo, sin añadir un parser de YAML. */
function readFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const fields = {};
	for (const line of match[1].split(/\r?\n/)) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (!kv) continue;
		let value = kv[2].trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		fields[kv[1]] = value;
	}
	return fields;
}

async function collectPosts(lang) {
	const dir = join(CONTENT_DIR, lang);
	if (!existsSync(dir)) return [];

	const posts = [];
	for (const file of await readdir(dir)) {
		if (!file.endsWith('.md')) continue;
		const fm = readFrontmatter(await readFile(join(dir, file), 'utf8'));
		if (!fm.title) continue;
		posts.push({
			slug: file.replace(/\.md$/, ''),
			title: fm.title,
			description: fm.description ?? '',
			publishDate: fm.publishDate ?? '',
			updatedDate: fm.updatedDate ?? ''
		});
	}

	// Más recientes primero, igual que en el sitio.
	return posts.sort((a, b) => (a.publishDate < b.publishDate ? 1 : -1));
}

function blogLines(posts) {
	return posts.map((post) => {
		// Los posts conservan su slug propio por idioma en la raíz /blog/.
		const link = `${SITE}/blog/${post.slug}`;
		return post.description
			? `- [${post.title}](${link}) — ${post.description}`
			: `- [${post.title}](${link})`;
	});
}

async function build(docLang) {
	const templatePath = join(TEMPLATE_DIR, docLang === 'es' ? 'llms-es.txt' : 'llms.txt');
	const outPath = join(STATIC_DIR, docLang === 'es' ? 'llms-es.txt' : 'llms.txt');

	const raw = await readFile(templatePath, 'utf8');

	// La plantilla empieza con un comentario HTML dirigido a quien la edita: no
	// debe acabar en el fichero que se sirve (y si se dejara, su texto podría
	// contener el propio token y recibir la sustitución por error).
	const template = raw.replace(/^<!--[\s\S]*?-->\s*/, '');

	if (!template.includes(TOKEN)) {
		throw new Error(`La plantilla ${templatePath} no contiene ${TOKEN}`);
	}

	const copy = COPY[docLang];
	// El documento en español enlaza las URLs españolas; el inglés, las /en/.
	const pageLang = docLang;

	const [esPosts, enPosts] = await Promise.all([collectPosts('es'), collectPosts('en')]);

	const section = [
		copy.heading,
		'',
		copy.app,
		...copy.appLines(pageLang),
		'',
		copy.tools,
		...copy.toolLines(pageLang),
		'',
		copy.comparisons,
		...copy.comparisonLines(pageLang),
		'',
		copy.author,
		...copy.authorLines(pageLang),
		'',
		copy.feeds,
		...copy.feedLines(),
		'',
		copy.blog('es'),
		...blogLines(esPosts),
		'',
		copy.blog('en'),
		...blogLines(enPosts),
		'',
		'---'
	].join('\n');

	await writeFile(outPath, template.replace(TOKEN, section), 'utf8');
	console.log(
		`[llms] ${outPath.replace(ROOT, '.')} — ${esPosts.length} posts ES + ${enPosts.length} posts EN`
	);
}

async function main() {
	await mkdir(STATIC_DIR, { recursive: true });
	await build('en');
	await build('es');
}

main().catch((error) => {
	console.error('[llms] Falló la generación:', error.message);
	process.exit(1);
});
