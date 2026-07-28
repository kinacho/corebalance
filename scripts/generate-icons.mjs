/**
 * Genera los iconos de `static/` a su tamaño real desde los masters de `assets/`.
 *
 * El estado anterior: `favicon.png`, `pwa-192x192.png` y `pwa-512x512.png` eran
 * **el mismo fichero de 1024×1024 y 865 KB** repetido bajo tres nombres, y
 * `logo.png` otro 1024×1024 de 867 KB que se pinta a 36-48 px con
 * `fetchpriority="high"` en la navbar de todas las páginas. Es decir, ~3,4 MB de
 * iconos para servir unos pocos cientos de píxeles, y el manifest declarando
 * `sizes: "192x192"` sobre una imagen que no lo era.
 *
 * Los masters viven fuera de `static/` para que no se sirvan por accidente.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const STATIC = join(ROOT, 'static');

const ICON_MASTER = join(ASSETS, 'icon-master.png');
const LOGO_MASTER = join(ASSETS, 'logo-master.png');

/**
 * `logo.png` se queda en 256 px: es el tamaño mayor al que se usa (48 px a 4x) y
 * cumple de sobra el mínimo de 112 px que Google pide al `logo` de Organization
 * en los datos estructurados.
 */
const TARGETS = [
	{ master: ICON_MASTER, out: 'favicon.png', size: 96, format: 'png' },
	{ master: ICON_MASTER, out: 'apple-touch-icon.png', size: 180, format: 'png' },
	{ master: ICON_MASTER, out: 'pwa-192x192.png', size: 192, format: 'png' },
	{ master: ICON_MASTER, out: 'pwa-512x512.png', size: 512, format: 'png' },
	{ master: LOGO_MASTER, out: 'logo.png', size: 256, format: 'png' },
	// offline.html referencia /logo.webp y hasta ahora daba 404.
	{ master: LOGO_MASTER, out: 'logo.webp', size: 256, format: 'webp' }
];

async function kb(path) {
	return existsSync(path) ? Math.round((await stat(path)).size / 1024) : null;
}

async function main() {
	for (const master of [ICON_MASTER, LOGO_MASTER]) {
		if (!existsSync(master)) {
			throw new Error(`Falta el master ${master}. No se puede regenerar sin él.`);
		}
	}

	await mkdir(STATIC, { recursive: true });

	let before = 0;
	let after = 0;

	for (const target of TARGETS) {
		const outPath = join(STATIC, target.out);
		const previous = (await kb(outPath)) ?? 0;

		// `fit: 'contain'` sobre fondo transparente: nunca recorta el icono, sólo
		// lo encaja. Con `withoutEnlargement` evitamos reescalar hacia arriba.
		let pipeline = sharp(target.master).resize(target.size, target.size, {
			fit: 'contain',
			background: { r: 0, g: 0, b: 0, alpha: 0 },
			withoutEnlargement: true
		});

		pipeline =
			target.format === 'webp'
				? pipeline.webp({ quality: 90, effort: 6 })
				: pipeline.png({ compressionLevel: 9, palette: true });

		await writeFile(outPath, await pipeline.toBuffer());

		const current = (await kb(outPath)) ?? 0;
		before += previous;
		after += current;

		const delta = previous ? ` (antes ${previous} KB)` : ' (nuevo)';
		console.log(
			`[icons] ${target.out.padEnd(24)} ${String(target.size).padStart(4)}px  ${String(current).padStart(4)} KB${delta}`
		);
	}

	console.log(`[icons] Total: ${before} KB → ${after} KB`);
}

main().catch((error) => {
	console.error('[icons] Falló la generación:', error);
	process.exit(1);
});
