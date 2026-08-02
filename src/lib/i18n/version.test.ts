import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import es from './es';
import en from './en';

/**
 * El número de versión vive en cuatro sitios a la vez: `package.json`, la etiqueta
 * `changelog_trigger` del footer (en los dos idiomas), las claves de
 * `changelog_modal.releases` y la lista `releaseVersions` de `ChangelogModal.svelte`.
 * Ya se desincronizaron una vez —el footer se quedó en v1.9.0 con la app en 1.10.0—
 * y una versión mal puesta en el footer no rompe nada, así que nadie se entera.
 * Esta suite es la que se entera.
 */

const pkgVersion: string = JSON.parse(
	readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
).version;

/** `1.10.0` → `v1_10_0`, la forma que usan las claves del diccionario. */
const releaseKey = `v${pkgVersion.replace(/\./g, '_')}`;

const esReleaseKeys = Object.keys(es.changelog_modal.releases);
const enReleaseKeys = Object.keys(en.changelog_modal.releases);

describe('versión de la app y changelog', () => {
	it('el footer anuncia la versión que declara package.json', () => {
		expect(es.db.changelog_trigger).toContain(`v${pkgVersion}`);
		expect(en.db.changelog_trigger).toContain(`v${pkgVersion}`);
	});

	it('el changelog tiene una entrada para la versión actual, y es la primera', () => {
		expect(esReleaseKeys).toContain(releaseKey);
		expect(esReleaseKeys[0]).toBe(releaseKey);
	});

	it('los dos idiomas describen exactamente las mismas versiones', () => {
		expect(enReleaseKeys).toEqual(esReleaseKeys);
	});

	it('ChangelogModal lista todas las versiones del diccionario, la actual primero', () => {
		const source = readFileSync(
			resolve(process.cwd(), 'src/lib/components/ChangelogModal.svelte'),
			'utf-8'
		);

		const listed = source
			.match(/const releaseVersions = \[([\s\S]*?)\]/)?.[1]
			.match(/'([^']+)'/g)
			?.map((quoted) => quoted.slice(1, -1));

		expect(listed, 'no se pudo leer releaseVersions de ChangelogModal.svelte').toBeDefined();
		expect(listed![0]).toBe(releaseKey);
		expect(listed).toEqual(esReleaseKeys);

		// Cada versión necesita su color: sin él el punto de la línea temporal sale transparente.
		const colored = source
			.match(/const badgeColors: Record<string, string> = \{([\s\S]*?)\}/)?.[1]
			.match(/(v[\d_]+):/g)
			?.map((entry) => entry.slice(0, -1));

		expect(colored, 'no se pudo leer badgeColors de ChangelogModal.svelte').toBeDefined();
		expect([...colored!].sort()).toEqual([...esReleaseKeys].sort());
	});
});
