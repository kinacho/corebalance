/**
 * Auditoría SEO sobre el HTML **ya construido**, que es el que recibe Google.
 *
 * `svelte-check` valida tipos y `routing.test.ts` valida el código fuente, pero
 * los fallos de SEO viven en el artefacto: una etiqueta duplicada, un `hreflang`
 * sin reciprocidad o un JSON-LD con una coma de más son código válido que
 * compila, se ve bien en el navegador y degrada el posicionamiento en silencio.
 *
 * Todas las reglas de aquí salen de fallos que este proyecto ya ha tenido:
 * las 34 imágenes OG en 404, la `meta description` duplicada y en el idioma
 * equivocado, los `hreflang` apuntando los tres a la misma URL, las páginas
 * `noindex` metidas en el sitemap y los `BreadcrumbList` con dos posiciones
 * hacia la misma URL.
 *
 * Uso (requiere `npm run build` antes):
 *   node scripts/seo-audit.mjs
 *   node scripts/seo-audit.mjs --verbose    # no colapsa los avisos repetidos
 *   node scripts/seo-audit.mjs --warnings   # los avisos también hacen fallar
 *   node scripts/seo-audit.mjs --dir <ruta> # audita otro build
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://corebalance.app';

/** `--dir` permite auditar otro build (artefacto de CI, o un fixture de prueba). */
const dirArg = process.argv.indexOf('--dir');
const OUTPUT = dirArg === -1 ? join(ROOT, '.svelte-kit', 'output') : process.argv[dirArg + 1];
const PAGES = join(OUTPUT, 'prerendered', 'pages');
const CLIENT = join(OUTPUT, 'client');

/** Rutas válidas que no se prerenderizan (la SPA del dashboard y la API). */
const DYNAMIC_ROUTES = ['/dashboard'];
const DYNAMIC_PREFIXES = ['/api/'];

/**
 * Campos que Google exige por tipo de schema. Conservador a propósito: sólo lo
 * que rompe el rich result, para que la auditoría no genere ruido.
 */
const REQUIRED_FIELDS = {
	BlogPosting: ['headline', 'image', 'datePublished', 'author'],
	Article: ['headline', 'author'],
	Dataset: ['name', 'description'],
	FAQPage: ['mainEntity'],
	BreadcrumbList: ['itemListElement'],
	SoftwareApplication: ['name', 'applicationCategory'],
	Organization: ['name', 'url'],
	WebSite: ['name', 'url']
};

/**
 * Palabras función en español. Buscamos éstas y no términos de dominio como
 * «traspaso» o «Hacienda», que aparecen legítimamente en los textos en inglés.
 */
const SPANISH_MARKERS = [
	'el', 'la', 'los', 'las', 'una', 'para', 'con', 'por', 'más', 'también',
	'según', 'cómo', 'qué', 'está', 'están', 'pero', 'desde', 'hasta', 'cuando',
	'aunque', 'sobre', 'entre', 'cada', 'tu', 'tus', 'sin'
];

const failOnWarnings = process.argv.includes('--warnings');
const verbose = process.argv.includes('--verbose');

/** @type {{file: string, rule: string, message: string}[]} */
const errors = [];
/** @type {{file: string, rule: string, message: string}[]} */
const warnings = [];

const err = (file, rule, message) => errors.push({ file, rule, message });
const warn = (file, rule, message) => warnings.push({ file, rule, message });

// ---------------------------------------------------------------- utilidades

async function walk(dir) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await walk(path)));
		else out.push(path);
	}
	return out;
}

/** `pages/blog/foo.html` → `/blog/foo`; `pages/index.html` → `/`. */
function fileToUrl(absolute) {
	const rel = absolute.slice(PAGES.length + 1).replace(/\\/g, '/');
	if (rel === 'index.html') return '/';
	return '/' + rel.replace(/\.html$/, '');
}

const headOf = (html) => html.slice(0, html.indexOf('</head>') + 7);

/** Contenido de todas las `<meta name="…">` con ese nombre. */
function metaByName(head, name) {
	const re = new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, 'gi');
	return [...head.matchAll(re)].map((m) => m[1]);
}

/** Contenido de todas las `<meta property="…">` (Open Graph). */
function metaByProperty(head, property) {
	const re = new RegExp(`<meta[^>]*property="${property}"[^>]*content="([^"]*)"`, 'gi');
	return [...head.matchAll(re)].map((m) => m[1]);
}

function linksByRel(head, rel) {
	const re = new RegExp(`<link[^>]*rel="${rel}"[^>]*>`, 'gi');
	return [...head.matchAll(re)].map((m) => m[0]);
}

const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

/** Normaliza a ruta absoluta del sitio: quita dominio, hash, query y barra final. */
function toPath(href) {
	if (!href) return null;
	let path = href.startsWith(SITE) ? href.slice(SITE.length) : href;
	if (/^https?:\/\//i.test(path)) return null; // externo
	path = path.split('#')[0].split('?')[0];
	if (path === '' || path === '/') return '/';
	return path.replace(/\/$/, '');
}

/**
 * Nodos de primer nivel (raíz, array o `@graph`). Sólo sobre éstos se validan
 * los campos obligatorios: los anidados son a menudo parciales a propósito
 * (el `publisher` de un `BlogPosting` lleva nombre y logo, no `url`).
 */
function topLevelNodes(data) {
	const nodes = [];
	const visit = (value) => {
		if (Array.isArray(value)) return value.forEach(visit);
		if (!value || typeof value !== 'object') return;
		if (value['@graph']) return visit(value['@graph']);
		if (value['@type']) nodes.push(value);
	};
	visit(data);
	return nodes;
}

/**
 * Recorre el JSON-LD entero, incluidos los nodos anidados, y devuelve los
 * `@id` que **define** (nodos con `@type`) y los que sólo **referencia**
 * (objetos que son un `@id` a secas).
 */
function collectIds(data) {
	const defined = [];
	const referenced = [];
	const visit = (value) => {
		if (Array.isArray(value)) return value.forEach(visit);
		if (!value || typeof value !== 'object') return;
		const keys = Object.keys(value);
		if (value['@id']) {
			if (value['@type']) defined.push(value['@id']);
			else if (keys.length === 1) referenced.push(value['@id']);
		}
		for (const nested of Object.values(value)) visit(nested);
	};
	visit(data);
	return { defined, referenced };
}

// -------------------------------------------------------------------- reglas

function checkHead(url, file, head, html) {
	const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => m[1].trim());
	if (titles.length === 0) err(file, 'title', 'no hay <title>');
	else if (titles.length > 1) err(file, 'title', `${titles.length} <title> (debe haber uno)`);
	else if (!titles[0]) err(file, 'title', '<title> vacío');
	else if (titles[0].length > 70) warn(file, 'title', `${titles[0].length} caracteres, Google lo truncará`);

	const descriptions = metaByName(head, 'description');
	if (descriptions.length === 0) err(file, 'description', 'falta la meta description');
	else if (descriptions.length > 1)
		err(file, 'description', `${descriptions.length} meta description (debe haber una)`);
	else if (!descriptions[0].trim()) err(file, 'description', 'meta description vacía');
	else if (descriptions[0].length > 175)
		warn(file, 'description', `${descriptions[0].length} caracteres, se truncará`);

	const canonicals = linksByRel(head, 'canonical').map((tag) => attr(tag, 'href'));
	if (canonicals.length === 0) err(file, 'canonical', 'falta el canonical');
	else if (canonicals.length > 1) err(file, 'canonical', `${canonicals.length} canonical`);
	else if (toPath(canonicals[0]) !== url)
		err(file, 'canonical', `apunta a ${toPath(canonicals[0])} en vez de a ${url}`);

	const lang = html.match(/<html[^>]*lang="([^"]*)"/)?.[1];
	const expected = url === '/en' || url.startsWith('/en/') ? 'en' : null;
	if (expected && lang !== expected)
		err(file, 'lang', `<html lang="${lang}"> en una URL ${expected}`);
	if (!lang) err(file, 'lang', 'falta el atributo lang en <html>');
}

function collectHreflang(head) {
	const map = new Map();
	for (const tag of linksByRel(head, 'alternate')) {
		const hreflang = attr(tag, 'hreflang');
		if (hreflang) map.set(hreflang, toPath(attr(tag, 'href')));
	}
	return map;
}

function checkHreflang(url, file, alternates, allPages) {
	if (alternates.size === 0) return; // legítimo: páginas sin gemelo

	const targets = [...alternates.entries()].filter(([lang]) => lang !== 'x-default');
	const seen = new Map();
	for (const [lang, target] of targets) {
		if (!target) {
			err(file, 'hreflang', `hreflang="${lang}" sin href válido`);
			continue;
		}
		if (seen.has(target))
			err(
				file,
				'hreflang',
				`hreflang="${lang}" y hreflang="${seen.get(target)}" apuntan ambos a ${target}`
			);
		seen.set(target, lang);
		if (!allPages.has(target)) err(file, 'hreflang', `hreflang="${lang}" apunta a ${target}, que no existe`);
	}

	if (!alternates.has('x-default')) warn(file, 'hreflang', 'falta x-default');
	if (!targets.some(([, target]) => target === url))
		err(file, 'hreflang', 'la página no se declara a sí misma en sus alternates');
}

function checkHreflangReciprocity(pages) {
	for (const [url, page] of pages) {
		for (const [lang, target] of page.alternates) {
			if (lang === 'x-default' || !target || target === url) continue;
			const other = pages.get(target);
			if (!other) continue; // ya reportado como inexistente
			const back = [...other.alternates.values()].includes(url);
			if (!back)
				err(
					page.file,
					'hreflang',
					`declara ${target} como alternativa ${lang}, pero esa página no enlaza de vuelta`
				);
		}
	}
}

/**
 * Valida el JSON-LD de una página y devuelve los `@id` que define y referencia,
 * para que el índice de entidades de todo el sitio se resuelva después: apuntar
 * desde un post a `#org` o `#person`, definidos en la landing y en la página de
 * autor, es la forma deliberada de que Google una el grafo entre páginas.
 */
function checkJsonLd(url, file, html) {
	const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
	const defined = [];
	const referenced = [];

	for (const [, raw] of blocks) {
		let data;
		try {
			data = JSON.parse(raw);
		} catch (error) {
			err(file, 'json-ld', `bloque que no parsea como JSON: ${error.message}`);
			continue;
		}

		const ids = collectIds(data);
		defined.push(...ids.defined);
		referenced.push(...ids.referenced);

		for (const node of topLevelNodes(data)) {
			const types = [node['@type']].flat();

			for (const type of types)
				for (const field of REQUIRED_FIELDS[type] ?? [])
					if (node[field] === undefined || node[field] === null || node[field] === '')
						err(file, 'json-ld', `${type} sin el campo obligatorio "${field}"`);

			if (types.includes('BreadcrumbList')) {
				const items = node.itemListElement ?? [];
				const urls = items.map((item) => item.item?.['@id'] ?? item.item).filter(Boolean);
				const duplicated = urls.filter((value, index) => urls.indexOf(value) !== index);
				for (const duplicate of new Set(duplicated))
					err(file, 'json-ld', `BreadcrumbList con dos posiciones hacia ${duplicate}`);
			}
		}
	}

	return { defined, referenced };
}

function assetExists(href) {
	const path = toPath(href);
	if (!path) return true; // externo, no lo auditamos
	return existsSync(join(CLIENT, path.replace(/^\//, '').replace(/\//g, '/')));
}

function checkImages(file, head) {
	const declared = [
		...metaByProperty(head, 'og:image'),
		...metaByName(head, 'twitter:image')
	];
	for (const image of new Set(declared))
		if (!assetExists(image)) err(file, 'imagen', `og/twitter image inexistente: ${image}`);
}

function checkLinks(file, html, allPages, staticFiles) {
	const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
	for (const href of new Set(hrefs)) {
		const path = toPath(href);
		if (!path) continue;
		if (allPages.has(path)) continue;
		if (DYNAMIC_ROUTES.includes(path)) continue;
		if (DYNAMIC_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
		if (staticFiles.has(path)) continue;
		err(file, 'enlace', `enlace interno roto: ${path}`);
	}
}

function checkSpanishLeak(url, file, html) {
	if (!(url === '/en' || url.startsWith('/en/'))) return;
	const text = html
		.replace(/<script[\s\S]*?<\/script>/g, ' ')
		.replace(/<style[\s\S]*?<\/style>/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.toLowerCase();
	const found = SPANISH_MARKERS.filter((word) =>
		new RegExp(`(^|[\\s.,;:!¡?¿"'()])${word}([\\s.,;:!?"'()]|$)`, 'u').test(text)
	);
	if (found.length >= 4)
		warn(file, 'idioma', `posible texto en español (${found.slice(0, 6).join(', ')}…)`);
}

async function checkSitemap(allPages, noindexPages) {
	const path = join(PAGES, 'sitemap.xml');
	if (!existsSync(path)) return err('sitemap.xml', 'sitemap', 'no se generó el sitemap');

	const xml = await readFile(path, 'utf8');
	const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => toPath(m[1]));
	const inSitemap = new Set(locs);

	for (const loc of locs) {
		if (!allPages.has(loc)) err('sitemap.xml', 'sitemap', `URL sin página prerenderizada: ${loc}`);
		if (noindexPages.has(loc)) err('sitemap.xml', 'sitemap', `URL declarada noindex: ${loc}`);
	}

	for (const url of allPages)
		if (!inSitemap.has(url) && !noindexPages.has(url))
			err('sitemap.xml', 'sitemap', `página indexable ausente del sitemap: ${url}`);

	const duplicates = locs.filter((value, index) => locs.indexOf(value) !== index);
	for (const duplicate of new Set(duplicates))
		err('sitemap.xml', 'sitemap', `URL duplicada: ${duplicate}`);
}

// --------------------------------------------------------------------- salida

/**
 * Los errores se listan siempre. Los avisos que se repiten en muchas páginas
 * (títulos largos, por ejemplo) se colapsan en una línea: un linter que escupe
 * treinta líneas de lo mismo enseña a ignorar su propia salida.
 */
const COLLAPSE_THRESHOLD = 5;

function report() {
	const byRule = new Map();
	for (const warning of warnings) {
		if (!byRule.has(warning.rule)) byRule.set(warning.rule, []);
		byRule.get(warning.rule).push(warning);
	}
	const collapsed = new Set(
		verbose
			? []
			: [...byRule.entries()].filter(([, items]) => items.length > COLLAPSE_THRESHOLD).map(([rule]) => rule)
	);

	const shown = [
		...errors.map((e) => ({ ...e, level: 'error' })),
		...warnings.filter((w) => !collapsed.has(w.rule)).map((w) => ({ ...w, level: 'aviso' }))
	];

	const grouped = new Map();
	for (const item of shown) {
		if (!grouped.has(item.file)) grouped.set(item.file, []);
		grouped.get(item.file).push(item);
	}

	for (const [file, items] of [...grouped].sort()) {
		console.log(`\n${file}`);
		for (const { level, rule, message } of items)
			console.log(`  ${level === 'error' ? '✗' : '⚠'} [${rule}] ${message}`);
	}

	for (const rule of collapsed) {
		const items = byRule.get(rule);
		console.log(`\n⚠ [${rule}] ${items.length} páginas con el mismo aviso (--verbose para verlas):`);
		console.log(`  p. ej. ${items[0].file} — ${items[0].message}`);
	}

	console.log(`\n[seo-audit] ${errors.length} errores, ${warnings.length} avisos.`);
}

async function main() {
	if (!existsSync(PAGES)) {
		console.error('[seo-audit] No hay build prerenderizado. Ejecuta "npm run build" antes.');
		process.exitCode = 1;
		return;
	}

	const files = (await walk(PAGES)).filter((f) => f.endsWith('.html'));
	const allFiles = await walk(PAGES);

	/** Ficheros servidos que no son páginas (rss.xml, sitemap.xml, el dataset…). */
	const staticFiles = new Set(
		allFiles
			.filter((f) => !f.endsWith('.html'))
			.map((f) => '/' + f.slice(PAGES.length + 1).replace(/\\/g, '/'))
	);
	for (const asset of await walk(CLIENT))
		staticFiles.add('/' + asset.slice(CLIENT.length + 1).replace(/\\/g, '/'));

	const pages = new Map();
	const noindexPages = new Set();

	for (const file of files) {
		const html = await readFile(file, 'utf8');
		const url = fileToUrl(file);
		const head = headOf(html);
		const label = file.slice(PAGES.length + 1).replace(/\\/g, '/');

		if (/<meta name="robots"[^>]*content="[^"]*noindex/i.test(html)) noindexPages.add(url);
		pages.set(url, { file: label, html, head, alternates: collectHreflang(head) });
	}

	const allPages = new Set(pages.keys());

	/** Entidades definidas en cualquier página, para resolver los `@id` cruzados. */
	const definedIds = new Set();
	const references = [];

	for (const [url, page] of pages) {
		checkHead(url, page.file, page.head, page.html);
		checkHreflang(url, page.file, page.alternates, allPages);
		checkImages(page.file, page.head);
		checkLinks(page.file, page.html, allPages, staticFiles);
		checkSpanishLeak(url, page.file, page.html);

		const ids = checkJsonLd(url, page.file, page.html);
		for (const id of ids.defined) definedIds.add(id);
		for (const id of ids.referenced) references.push({ file: page.file, id });
	}

	for (const { file, id } of references)
		if (!definedIds.has(id))
			err(file, 'json-ld', `referencia a @id "${id}" que no define ninguna página del sitio`);

	checkHreflangReciprocity(pages);
	await checkSitemap(allPages, noindexPages);

	console.log(`[seo-audit] ${pages.size} páginas auditadas.`);
	report();

	if (errors.length > 0 || (failOnWarnings && warnings.length > 0)) process.exitCode = 1;
}

main().catch((error) => {
	console.error('[seo-audit] Falló la auditoría:', error);
	process.exitCode = 1;
});
