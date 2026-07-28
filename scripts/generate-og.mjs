/**
 * Genera las imágenes Open Graph de los posts del blog en tiempo de build.
 *
 * Antes los 34 posts declaraban `ogImage: /blog/og/<slug>.jpg` y ese directorio
 * no existía: og:image y twitter:image daban 404 (cards sin imagen al compartir)
 * y el campo `image` del schema BlogPosting era inválido.
 *
 * La imagen se genera a partir del slug real de cada post, así que los 6 posts
 * en inglés que reutilizaban el fichero del slug español quedan corregidos solos.
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
const OUT_DIR = join(ROOT, 'static', 'blog', 'og');
const FONT_DIR = join(ROOT, 'node_modules', '@fontsource', 'plus-jakarta-sans', 'files');

const WIDTH = 1200;
const HEIGHT = 630;

const LOCALES = ['es', 'en'];

const LABEL = {
	es: 'Rebalanceo de carteras · corebalance.app',
	en: 'Portfolio rebalancing · corebalance.app'
};

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

function template({ title, label }) {
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
				// Título del post
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

async function main() {
	const posts = await collectPosts();
	if (posts.length === 0) {
		console.log('[og] No se encontraron posts, nada que generar.');
		return;
	}

	await mkdir(OUT_DIR, { recursive: true });
	const fonts = await loadFonts();

	let generated = 0;
	let skipped = 0;

	for (const post of posts) {
		const outPath = join(OUT_DIR, `${post.slug}.png`);

		if (!(await needsRebuild(outPath, post.sourcePath))) {
			skipped++;
			continue;
		}

		const svg = await satori(template({ title: post.title, label: LABEL[post.lang] }), {
			width: WIDTH,
			height: HEIGHT,
			fonts
		});

		const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
			.render()
			.asPng();

		await writeFile(outPath, png);
		generated++;
	}

	console.log(`[og] ${generated} imágenes generadas, ${skipped} al día (${posts.length} posts).`);
}

main().catch((error) => {
	console.error('[og] Falló la generación de imágenes Open Graph:', error);
	process.exit(1);
});
