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
 * ⚠️ **Y este test dio un falso verde precisamente por mirar solo el primer nivel.**
 * `{"github": {"deploymentEnabled": false}}` pasaba —`github` sí es una clave
 * válida— mientras que `deploymentEnabled` **no existe dentro de `github`**, así que
 * era un no-op: se creyó durante días que apagaba la publicación de deployments en
 * GitHub y no apagaba nada. Por eso ahora hay tres comprobaciones nominales sobre
 * claves anidadas concretas, y `$schema` en el fichero para que el editor y la CLI
 * validen el esquema de verdad, que es la única defensa completa.
 */

/**
 * Claves de primer nivel documentadas en
 * https://vercel.com/docs/project-configuration (tabla completa) más
 * https://vercel.com/docs/project-configuration/git-configuration (`git` y
 * `github`, que la tabla no lista). Copiadas el 6-ago-2026.
 *
 * La lista estaba incompleta —le faltaban `$schema`, `bunVersion`, `fluid`,
 * `bulkRedirectsPath`, `functionFailoverRegions`— y habría rechazado justo la clave
 * que da validación de esquema real.
 */
const CLAVES_VALIDAS = new Set([
	'$schema',
	'buildCommand',
	'bulkRedirectsPath',
	'bunVersion',
	'cleanUrls',
	'crons',
	'devCommand',
	'fluid',
	'framework',
	'functionFailoverRegions',
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
	'rewrites',
	'trailingSlash'
]);

/** Sub-claves válidas, para no repetir el mismo error un nivel más abajo. */
const SUBCLAVES_VALIDAS: Record<string, Set<string>> = {
	git: new Set(['deploymentEnabled']),
	// `silent` y `enabled` están marcadas como Legacy en la documentación, pero
	// Vercel las sigue aceptando.
	github: new Set(['autoAlias', 'autoJobCancelation', 'silent', 'enabled'])
};

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

	it('no tiene sub-claves inventadas dentro de git ni de github', () => {
		// Éste es el test que faltaba: una sub-clave inventada no rompe el despliegue,
		// se ignora en silencio, y eso es peor — parece configurado y no lo está.
		for (const [padre, validas] of Object.entries(SUBCLAVES_VALIDAS)) {
			const bloque = config[padre] as Record<string, unknown> | undefined;
			if (!bloque) continue;
			const desconocidas = Object.keys(bloque).filter((k) => !validas.has(k));
			expect(desconocidas, `Vercel ignora estas sub-claves de "${padre}" sin avisar`).toEqual([]);
		}
	});

	it('declara $schema, que es la única validación completa del fichero', () => {
		expect(config.$schema).toBe('https://openapi.vercel.sh/vercel.json');
	});

	it('mantiene el rewrite de /offline, del que depende el precache del service worker', () => {
		// Sin él, `/offline` devuelve 404 en producción, Workbox no puede precachear su
		// propio fallback y se cae el `install` completo del service worker. `vite
		// preview` no lo delata porque `sirv` resuelve la extensión por su cuenta.
		const rewrites = (config.rewrites ?? []) as Array<{ source: string; destination: string }>;
		expect(rewrites).toContainEqual({ source: '/offline', destination: '/offline.html' });
	});

	it('no apaga los despliegues automáticos', () => {
		/**
		 * ⚠️ Trampa mortal, y por poco se cae en ella al arreglar lo de arriba: la clave
		 * real se llama `git.deploymentEnabled`, así que «mover `deploymentEnabled` de
		 * `github` a `git`» suena a corrección obvia y **deja el sitio sin desplegarse
		 * nunca más** — en `false` a secas apaga el despliegue automático de *todas* las
		 * ramas. No tiene nada que ver con publicar o no el enlace de Production en
		 * GitHub, que no se controla desde este fichero.
		 */
		const git = config.git as { deploymentEnabled?: unknown } | undefined;
		expect(
			git?.deploymentEnabled,
			'`git.deploymentEnabled: false` apaga TODOS los despliegues automáticos, ' +
				'no la publicación de deployments en GitHub. Ver CLAUDE.md.'
		).not.toBe(false);
	});

	it('conserva las cabeceras de assetlinks.json y del manifest', () => {
		const fuentes = ((config.headers ?? []) as Array<{ source: string }>).map((h) => h.source);
		expect(fuentes).toContain('/.well-known/assetlinks.json');
		expect(fuentes).toContain('/manifest.webmanifest');
	});
});
