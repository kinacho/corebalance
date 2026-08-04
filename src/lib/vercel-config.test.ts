import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Guarda de `vercel.json`.
 *
 * ⚠️ **Vercel valida ese fichero en estricto: una clave de primer nivel que no
 * conozca tumba el build** con `should NOT have additional property <clave>`. Y lo
 * hace *al desplegar*, que es el peor momento para enterarse: el build local pasa,
 * los tests pasan, y el fallo aparece cuando el commit ya está en `main`.
 *
 * Pasó de verdad: se documentó el fichero por dentro con claves `"//github"` y
 * `"//rewrites"` —el truco habitual para comentar un JSON— y el despliegue falló.
 * La razón de cada clave vive ahora en `CLAUDE.md`, no aquí dentro.
 *
 * Este test no valida el esquema completo, que solo conoce Vercel. Comprueba lo
 * único que ha roto un despliegue: que no haya claves inventadas arriba. Y
 * comprueba que siguen presentes las tres piezas que, si desaparecen, rompen algo
 * en silencio.
 */

const CLAVES_VALIDAS = new Set([
	'buildCommand',
	'cleanUrls',
	'crons',
	'devCommand',
	'framework',
	'functions',
	'git',
	'github',
	'headers',
	'ignoreCommand',
	'images',
	'installCommand',
	'outputDirectory',
	'public',
	'redirects',
	'regions',
	'routes',
	'rewrites',
	'trailingSlash'
]);

const config = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')
) as Record<string, unknown>;

describe('vercel.json', () => {
	it('no tiene claves de primer nivel que Vercel no reconozca', () => {
		const desconocidas = Object.keys(config).filter((k) => !CLAVES_VALIDAS.has(k));
		expect(
			desconocidas,
			`Vercel rechaza el fichero entero por estas claves y el build falla al desplegar. ` +
				`Si de verdad es una clave nueva y válida, añádela a CLAVES_VALIDAS; si es un ` +
				`comentario, la explicación va en CLAUDE.md.`
		).toEqual([]);
	});

	it('mantiene el rewrite de /offline, del que depende el precache del service worker', () => {
		// Sin él, `/offline` devuelve 404 en producción, Workbox no puede precachear su
		// propio fallback y se cae el `install` completo del service worker. `vite
		// preview` no lo delata porque `sirv` resuelve la extensión por su cuenta.
		const rewrites = (config.rewrites ?? []) as Array<{ source: string; destination: string }>;
		expect(rewrites).toContainEqual({ source: '/offline', destination: '/offline.html' });
	});

	it('mantiene apagada la publicación de deployments en GitHub', () => {
		// Encenderla devuelve al repositorio público un enlace «Production» que lleva a
		// un login de Vercel, porque la integración reporta la URL protegida del
		// despliegue y GitHub no permite editarla.
		expect((config.github as { deploymentEnabled?: boolean })?.deploymentEnabled).toBe(false);
	});

	it('conserva las cabeceras de assetlinks.json y del manifest', () => {
		const fuentes = ((config.headers ?? []) as Array<{ source: string }>).map((h) => h.source);
		expect(fuentes).toContain('/.well-known/assetlinks.json');
		expect(fuentes).toContain('/manifest.webmanifest');
	});
});
