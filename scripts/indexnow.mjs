/**
 * Avisa a IndexNow (Bing, Yandex, Seznam, Naver) de las URLs modificadas
 * recientemente, leyéndolas del sitemap ya generado en el build.
 *
 * Esto no es opcional para GEO: ChatGPT Search y Copilot beben del índice de
 * Bing, así que si el sitio no está bien indexado ahí no aparece en sus
 * respuestas por bueno que sea el `llms.txt`.
 *
 * La clave de IndexNow es pública por diseño: se valida sirviendo el fichero
 * `static/<clave>.txt` con la clave dentro. No es un secreto.
 *
 * Uso:
 *   node scripts/indexnow.mjs              # URLs de los últimos 7 días
 *   node scripts/indexnow.mjs --days 30
 *   node scripts/indexnow.mjs --all        # todas las del sitemap
 *   node scripts/indexnow.mjs --dry-run    # no envía, sólo lista
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const KEY = process.env.INDEXNOW_KEY ?? '84c01184f7f92e7b2df0a395bda39019';
const HOST = 'corebalance.app';
const ENDPOINT = 'https://api.indexnow.org/IndexNow';

/** Sitemap prerenderizado por el build de SvelteKit. */
const SITEMAP_CANDIDATES = [
	join(ROOT, '.svelte-kit', 'output', 'prerendered', 'pages', 'sitemap.xml'),
	join(ROOT, '.svelte-kit', 'output', 'prerendered', 'dependencies', 'sitemap.xml'),
	join(ROOT, 'build', 'sitemap.xml')
];

function arg(name) {
	const index = process.argv.indexOf(`--${name}`);
	return index === -1 ? undefined : process.argv[index + 1];
}

const dryRun = process.argv.includes('--dry-run');
const submitAll = process.argv.includes('--all');
const days = Number(arg('days') ?? 7);

async function readSitemap() {
	const path = SITEMAP_CANDIDATES.find((candidate) => existsSync(candidate));
	if (!path) {
		throw new Error(
			`No se encontró el sitemap generado. Ejecuta "npm run build" antes.\nBuscado en:\n  ${SITEMAP_CANDIDATES.join('\n  ')}`
		);
	}
	return readFile(path, 'utf8');
}

function parseUrls(xml) {
	const urls = [];
	const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];

	for (const block of blocks) {
		const loc = block.match(/<loc>(.*?)<\/loc>/)?.[1];
		const lastmod = block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1];
		if (loc) urls.push({ loc, lastmod });
	}
	return urls;
}

async function main() {
	const xml = await readSitemap();
	const all = parseUrls(xml);

	const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
	const selected = submitAll
		? all
		: all.filter(({ lastmod }) => lastmod && new Date(lastmod).getTime() >= cutoff);

	if (selected.length === 0) {
		console.log(
			`[indexnow] Nada modificado en los últimos ${days} días (${all.length} URLs en el sitemap). Usa --all para forzar.`
		);
		return;
	}

	console.log(`[indexnow] ${selected.length}/${all.length} URLs a enviar:`);
	for (const { loc, lastmod } of selected) console.log(`  ${lastmod ?? '—'}  ${loc}`);

	if (dryRun) {
		console.log('[indexnow] --dry-run: no se ha enviado nada.');
		return;
	}

	const response = await fetch(ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
		body: JSON.stringify({
			host: HOST,
			key: KEY,
			keyLocation: `https://${HOST}/${KEY}.txt`,
			urlList: selected.map(({ loc }) => loc)
		})
	});

	// 200 = aceptado, 202 = aceptado pendiente de validar la clave.
	if (response.ok) {
		console.log(`[indexnow] Enviado correctamente (HTTP ${response.status}).`);
		return;
	}

	console.error(`[indexnow] Error HTTP ${response.status}: ${await response.text()}`);
	process.exitCode = 1;
}

main().catch((error) => {
	console.error('[indexnow] Falló el envío:', error.message);
	process.exitCode = 1;
});
