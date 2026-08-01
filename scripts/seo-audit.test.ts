import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * El linter de SEO se ejecuta sobre el HTML construido, así que si una de sus
 * reglas dejara de detectar nada seguiría diciendo «0 errores» y nadie se
 * enteraría: un linter roto y un sitio limpio se leen igual.
 *
 * Por eso el fixture de `__fixtures__/seo-audit` es un build en miniatura con
 * un fallo inyectado por regla, y aquí se comprueba que los caza todos.
 */
const SCRIPT = join(process.cwd(), 'scripts', 'seo-audit.mjs');
const FIXTURE = join(process.cwd(), 'scripts', '__fixtures__', 'seo-audit');

function runAudit(): { output: string; exitCode: number } {
	try {
		const output = execFileSync('node', [SCRIPT, '--dir', FIXTURE], { encoding: 'utf8' });
		return { output, exitCode: 0 };
	} catch (error) {
		const failure = error as { stdout?: string; status?: number };
		return { output: failure.stdout ?? '', exitCode: failure.status ?? 1 };
	}
}

describe('seo-audit', () => {
	const { output, exitCode } = runAudit();

	it('falla con código distinto de cero cuando hay errores', () => {
		expect(exitCode).toBe(1);
	});

	it.each([
		['meta description duplicada', '2 meta description'],
		['canonical que apunta a otra URL', 'apunta a /blog en vez de a /en'],
		['lang que no concuerda con la URL', '<html lang="es"> en una URL en'],
		['dos hreflang hacia el mismo destino', 'apuntan ambos a /en'],
		['hreflang sin reciprocidad', 'no enlaza de vuelta'],
		['imagen Open Graph inexistente', 'og/twitter image inexistente'],
		['enlace interno roto', 'enlace interno roto: /pagina-que-no-existe'],
		['JSON-LD que no parsea', 'bloque que no parsea como JSON'],
		['campo obligatorio ausente en el schema', 'BlogPosting sin el campo obligatorio'],
		['BreadcrumbList con posiciones duplicadas', 'BreadcrumbList con dos posiciones hacia'],
		['referencia @id colgante', 'que no define ninguna página del sitio'],
		['URL noindex dentro del sitemap', 'URL declarada noindex'],
		['URL del sitemap sin página', 'URL sin página prerenderizada'],
		['página indexable ausente del sitemap', 'página indexable ausente del sitemap'],
		['URL duplicada en el sitemap', 'URL duplicada']
	])('detecta: %s', (_caso, expected) => {
		expect(output).toContain(expected);
	});

	it('no inventa errores en la página de control', () => {
		// index.html sólo debe aparecer por la falta de reciprocidad que provoca
		// en.html, no por reglas propias (canonical, description, imagen, enlaces).
		const bloque = output.split('\nindex.html\n')[1]?.split('\n\n')[0] ?? '';
		expect(bloque).not.toContain('[canonical]');
		expect(bloque).not.toContain('[description]');
		expect(bloque).not.toContain('[imagen]');
		expect(bloque).not.toContain('[enlace]');
	});
});
