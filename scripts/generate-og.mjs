/**
 * Genera todas las imágenes Open Graph del sitio en tiempo de build.
 *
 * Había tres problemas distintos:
 *
 * 1. Los 34 posts declaraban `ogImage: /blog/og/<slug>.jpg` y ese directorio no
 *    existía: og:image y twitter:image daban 404 (cards sin imagen al compartir)
 *    y el campo `image` del schema BlogPosting era inválido. La imagen se genera
 *    ahora desde el slug real, así que los 6 posts en inglés que reutilizaban el
 *    fichero del slug español quedan corregidos solos.
 * 2. `og-image.png` y `og-image-landing.png` **eran JPEG con extensión .png** y
 *    además cuadrados (1024×1024), mientras el HTML declaraba 1200×630. El
 *    desajuste de formato y de proporción hace que algunas redes rechacen o
 *    recorten mal la card.
 * 3. `og-image-blog.png`, `og-image-ter.png` y `og-image-checklist.png` se
 *    referenciaban pero no existían.
 *
 * Todo sale del mismo lenguaje visual y en las dos variantes de idioma, para que
 * al compartir una página en inglés la card no salga en español.
 *
 * Se ejecuta desde el script `prebuild`, antes de que Vite lea `static/`.
 */
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'src', 'content', 'blog');
const STATIC_DIR = join(ROOT, 'static');
const OUT_DIR = join(STATIC_DIR, 'blog', 'og');
const PAGE_OUT_DIR = join(STATIC_DIR, 'og');
const FONT_DIR = join(ROOT, 'node_modules', '@fontsource', 'plus-jakarta-sans', 'files');

const WIDTH = 1200;
const HEIGHT = 630;

const LOCALES = ['es', 'en'];

const LABEL = {
	es: 'Rebalanceo de carteras · corebalance.app',
	en: 'Portfolio rebalancing · corebalance.app'
};

/**
 * Páginas fijas. Los títulos son los mismos que sirve cada página; se repiten
 * aquí porque este script corre en Node, fuera de la app, y no puede leer
 * typesafe-i18n. Si cambias el H1 de una página, cambia también el texto de aquí.
 */
const PAGES = [
	{
		key: 'landing',
		kicker: { es: 'Calculadora gratuita', en: 'Free calculator' },
		title: {
			es: 'Rebalancea tu cartera de ETFs y fondos indexados',
			en: 'Rebalance your portfolio of ETFs and index funds'
		}
	},
	{
		key: 'blog',
		kicker: { es: 'Blog', en: 'Blog' },
		title: {
			es: 'Inversión indexada y rebalanceo de carteras',
			en: 'Index investing and portfolio rebalancing'
		}
	},
	{
		key: 'ter',
		kicker: { es: 'Herramienta interactiva', en: 'Interactive tool' },
		title: {
			es: 'Calculadora de TER total de tu cartera',
			en: 'Total expense ratio calculator'
		}
	},
	{
		key: 'checklist',
		kicker: { es: 'Recurso interactivo', en: 'Interactive resource' },
		title: { es: '¿Es hora de rebalancear?', en: 'Is it time to rebalance?' }
	},
	{
		key: 'autor',
		kicker: { es: 'Autor', en: 'Author' },
		title: { es: 'Quién escribe en CoreBalance', en: 'Who writes on CoreBalance' }
	},
	{
		key: 'vs-excel',
		kicker: { es: 'Comparativa', en: 'Comparison' },
		title: { es: 'CoreBalance vs Excel y Google Sheets', en: 'CoreBalance vs Excel & Google Sheets' }
	},
	{
		key: 'vs-indexa-capital',
		kicker: { es: 'Comparativa', en: 'Comparison' },
		title: { es: 'CoreBalance vs Indexa Capital', en: 'CoreBalance vs Indexa Capital' }
	},
	{
		key: 'vs-portfolio-performance',
		kicker: { es: 'Comparativa', en: 'Comparison' },
		title: {
			es: 'CoreBalance vs Portfolio Performance',
			en: 'CoreBalance vs Portfolio Performance'
		}
	}
];

/**
 * Imágenes en la raíz de `static/` que ya estaban referenciadas (y posiblemente
 * compartidas por ahí fuera): se regeneran en su sitio para no romper enlaces
 * antiguos, ahora sí como PNG de 1200×630 de verdad.
 */
const LEGACY_IMAGES = [
	{ out: 'og-image.png', page: 'landing', lang: 'es' },
	{ out: 'og-image-landing.png', page: 'landing', lang: 'es' },
	{ out: 'og-image-blog.png', page: 'blog', lang: 'es' },
	{ out: 'og-image-ter.png', page: 'ter', lang: 'es' },
	{ out: 'og-image-checklist.png', page: 'checklist', lang: 'es' }
];

/** Extrae el frontmatter mínimo que necesitamos sin añadir un parser de YAML. */
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

/** Tamaño de fuente adaptado al largo del título, para que quepa siempre. */
function titleFontSize(title) {
	if (title.length <= 45) return 68;
	if (title.length <= 70) return 58;
	if (title.length <= 95) return 50;
	return 44;
}

function template({ title, label, kicker }) {
	return {
		type: 'div',
		props: {
			style: {
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '72px',
				backgroundColor: '#05050a',
				backgroundImage:
					'radial-gradient(at 0% 0%, rgba(59,130,246,0.35) 0px, transparent 55%), radial-gradient(at 100% 100%, rgba(139,92,246,0.28) 0px, transparent 55%)',
				fontFamily: 'Plus Jakarta Sans'
			},
			children: [
				// Marca
				{
					type: 'div',
					props: {
						style: { display: 'flex', alignItems: 'center', gap: '18px' },
						children: [
							{
								type: 'div',
								props: {
									style: {
										width: '22px',
										height: '22px',
										borderRadius: '9999px',
										backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)'
									}
								}
							},
							{
								type: 'div',
								props: {
									style: {
										fontSize: '32px',
										fontWeight: 800,
										color: '#ffffff',
										letterSpacing: '-0.02em'
									},
									children: 'CoreBalance'
								}
							}
						]
					}
				},
				// Antetítulo (sólo en las páginas fijas) + título
				{
					type: 'div',
					props: {
						style: { display: 'flex', flexDirection: 'column', gap: '20px' },
						children: [
							...(kicker
								? [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '24px',
													fontWeight: 700,
													color: '#60a5fa',
													textTransform: 'uppercase',
													letterSpacing: '0.12em'
												},
												children: kicker
											}
										}
									]
								: []),
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: `${titleFontSize(title)}px`,
										fontWeight: 800,
										lineHeight: 1.18,
										color: '#ffffff',
										letterSpacing: '-0.03em',
										maxWidth: '1000px'
									},
									children: title
								}
							}
						]
					}
				},
				// Pie
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							alignItems: 'center',
							gap: '16px',
							fontSize: '26px',
							fontWeight: 500,
							color: 'rgba(160,160,200,0.85)'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										width: '48px',
										height: '4px',
										borderRadius: '9999px',
										backgroundColor: '#3b82f6'
									}
								}
							},
							{ type: 'div', props: { children: label } }
						]
					}
				}
			]
		}
	};
}

async function loadFonts() {
	const files = [
		{ file: 'plus-jakarta-sans-latin-400-normal.woff', weight: 400 },
		{ file: 'plus-jakarta-sans-latin-ext-400-normal.woff', weight: 400 },
		{ file: 'plus-jakarta-sans-latin-500-normal.woff', weight: 500 },
		{ file: 'plus-jakarta-sans-latin-800-normal.woff', weight: 800 },
		{ file: 'plus-jakarta-sans-latin-ext-800-normal.woff', weight: 800 }
	];

	const fonts = [];
	for (const { file, weight } of files) {
		const path = join(FONT_DIR, file);
		if (!existsSync(path)) continue;
		fonts.push({
			name: 'Plus Jakarta Sans',
			data: await readFile(path),
			weight,
			style: 'normal'
		});
	}

	if (fonts.length === 0) {
		throw new Error(
			`No se encontró ninguna fuente en ${FONT_DIR}. ¿Falta @fontsource/plus-jakarta-sans?`
		);
	}
	return fonts;
}

async function collectPosts() {
	const posts = [];
	for (const lang of LOCALES) {
		const dir = join(CONTENT_DIR, lang);
		if (!existsSync(dir)) continue;
		for (const file of await readdir(dir)) {
			if (!file.endsWith('.md')) continue;
			const path = join(dir, file);
			const raw = await readFile(path, 'utf8');
			const fm = readFrontmatter(raw);
			if (!fm.title) continue;
			posts.push({
				slug: file.replace(/\.md$/, ''),
				title: fm.title,
				lang,
				sourcePath: path
			});
		}
	}
	return posts;
}

/** ¿Hay que regenerar? Sólo si no existe o el markdown es más reciente. */
async function needsRebuild(outPath, sourcePath) {
	if (process.argv.includes('--force')) return true;
	if (!existsSync(outPath)) return true;
	const [out, source] = await Promise.all([stat(outPath), stat(sourcePath)]);
	return source.mtimeMs > out.mtimeMs;
}

/** Rasteriza una card y la escribe en disco. */
async function render(outPath, content, fonts) {
	const svg = await satori(template(content), { width: WIDTH, height: HEIGHT, fonts });
	const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
	await writeFile(outPath, png);
}

async function main() {
	const posts = await collectPosts();
	const fonts = await loadFonts();

	await mkdir(OUT_DIR, { recursive: true });
	await mkdir(PAGE_OUT_DIR, { recursive: true });

	let generated = 0;
	let skipped = 0;

	// ── Posts del blog ────────────────────────────────────────────────────────
	for (const post of posts) {
		const outPath = join(OUT_DIR, `${post.slug}.png`);

		if (!(await needsRebuild(outPath, post.sourcePath))) {
			skipped++;
			continue;
		}

		await render(outPath, { title: post.title, label: LABEL[post.lang] }, fonts);
		generated++;
	}

	// ── Páginas fijas, una por idioma ─────────────────────────────────────────
	// Estas dependen del propio script, no de un markdown, así que se regeneran
	// cuando el script cambia.
	for (const page of PAGES) {
		for (const lang of LOCALES) {
			const outPath = join(PAGE_OUT_DIR, `${page.key}-${lang}.png`);

			if (!(await needsRebuild(outPath, fileURLToPath(import.meta.url)))) {
				skipped++;
				continue;
			}

			await render(
				outPath,
				{ title: page.title[lang], kicker: page.kicker[lang], label: LABEL[lang] },
				fonts
			);
			generated++;
		}
	}

	// ── Nombres antiguos en la raíz de static/ ────────────────────────────────
	for (const legacy of LEGACY_IMAGES) {
		const outPath = join(STATIC_DIR, legacy.out);
		const page = PAGES.find((candidate) => candidate.key === legacy.page);

		if (!(await needsRebuild(outPath, fileURLToPath(import.meta.url)))) {
			skipped++;
			continue;
		}

		await render(
			outPath,
			{ title: page.title[legacy.lang], kicker: page.kicker[legacy.lang], label: LABEL[legacy.lang] },
			fonts
		);
		generated++;
	}

	console.log(
		`[og] ${generated} imágenes generadas, ${skipped} al día ` +
			`(${posts.length} posts + ${PAGES.length * LOCALES.length} páginas + ${LEGACY_IMAGES.length} nombres antiguos).`
	);
}

main().catch((error) => {
	console.error('[og] Falló la generación de imágenes Open Graph:', error);
	process.exit(1);
});
