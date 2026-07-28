import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	BILINGUAL_ROUTES,
	alternates,
	absoluteUrl,
	isBilingualRoute,
	isLocaleCookieRoute,
	localeFromPath,
	localeLink,
	localizePath,
	stripLocale
} from './routing';

describe('stripLocale', () => {
	it('quita el prefijo de idioma', () => {
		expect(stripLocale('/en/blog')).toBe('/blog');
		expect(stripLocale('/en')).toBe('/');
	});

	it('deja intactas las rutas sin prefijo', () => {
		expect(stripLocale('/blog')).toBe('/blog');
		expect(stripLocale('/')).toBe('/');
	});

	it('no confunde un segmento que empieza por el prefijo', () => {
		expect(stripLocale('/entrada')).toBe('/entrada');
	});
});

describe('localeFromPath', () => {
	it('deduce el idioma del prefijo, con el español por defecto', () => {
		expect(localeFromPath('/en/comparativas/corebalance-vs-excel')).toBe('en');
		expect(localeFromPath('/comparativas/corebalance-vs-excel')).toBe('es');
		expect(localeFromPath('/entrada')).toBe('es');
	});
});

describe('localizePath', () => {
	it('el español vive en la raíz y el inglés bajo /en', () => {
		expect(localizePath('/blog', 'es')).toBe('/blog');
		expect(localizePath('/blog', 'en')).toBe('/en/blog');
		expect(localizePath('/', 'en')).toBe('/en');
	});

	it('es idempotente: traducir una ruta ya traducida no duplica el prefijo', () => {
		expect(localizePath('/en/blog', 'en')).toBe('/en/blog');
		expect(localizePath('/en/blog', 'es')).toBe('/blog');
	});
});

describe('localeLink', () => {
	it('traduce las rutas bilingües conservando hash y query', () => {
		expect(localeLink('/#features', 'en')).toBe('/en#features');
		expect(localeLink('/blog', 'en')).toBe('/en/blog');
		expect(localeLink('/privacy?x=1', 'en')).toBe('/en/privacy?x=1');
	});

	it('no toca lo que no tiene variante de idioma en la URL', () => {
		// El dashboard no está prefijado: /en/dashboard no existiría.
		expect(localeLink('/dashboard', 'en')).toBe('/dashboard');
		// Cada post ya tiene su propio slug traducido.
		expect(localeLink('/blog/degiro-etf-rebalancing', 'en')).toBe('/blog/degiro-etf-rebalancing');
	});

	it('ignora los enlaces externos', () => {
		expect(localeLink('https://github.com/kino166', 'en')).toBe('https://github.com/kino166');
		expect(localeLink('mailto:hola@corebalance.app', 'en')).toBe('mailto:hola@corebalance.app');
	});
});

describe('absoluteUrl', () => {
	it('mantiene la barra sólo en la raíz', () => {
		expect(absoluteUrl('/')).toBe('https://corebalance.app/');
		expect(absoluteUrl('/blog')).toBe('https://corebalance.app/blog');
		expect(absoluteUrl('/blog/')).toBe('https://corebalance.app/blog');
	});
});

describe('alternates', () => {
	it('declara URLs distintas por idioma y x-default al español', () => {
		const fromEs = alternates('/comparativas/corebalance-vs-excel', 'es');
		const fromEn = alternates('/en/comparativas/corebalance-vs-excel', 'en');

		expect(fromEs.es).toBe('https://corebalance.app/comparativas/corebalance-vs-excel');
		expect(fromEs.en).toBe('https://corebalance.app/en/comparativas/corebalance-vs-excel');
		expect(fromEs.es).not.toBe(fromEs.en);
		expect(fromEs.xDefault).toBe(fromEs.es);

		// La canónica es siempre la del idioma que se está sirviendo.
		expect(fromEs.canonical).toBe(fromEs.es);
		expect(fromEn.canonical).toBe(fromEn.en);

		// Las alternativas no dependen de por qué URL se entre.
		expect(fromEn.es).toBe(fromEs.es);
		expect(fromEn.en).toBe(fromEs.en);
	});
});

describe('isLocaleCookieRoute', () => {
	it('sólo el área autenticada y la API dependen de la cookie', () => {
		expect(isLocaleCookieRoute('/dashboard')).toBe(true);
		expect(isLocaleCookieRoute('/api/prices')).toBe(true);
		expect(isLocaleCookieRoute('/blog')).toBe(false);
		expect(isLocaleCookieRoute('/en')).toBe(false);
	});
});

describe('BILINGUAL_ROUTES', () => {
	const GROUP_DIR = join(process.cwd(), 'src', 'routes', '(public)', '[[lang=locale]]');

	/** Rutas de página que existen de verdad dentro del grupo con prefijo. */
	function routesOnDisk(dir: string, prefix = ''): string[] {
		const found: string[] = [];
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const path = `${prefix}/${entry.name}`;
			const full = join(dir, entry.name);
			if (existsSync(join(full, '+page.svelte'))) found.push(path);
			found.push(...routesOnDisk(full, path));
		}
		return found;
	}

	it('todas las rutas declaradas existen en el árbol de rutas', () => {
		const onDisk = new Set(routesOnDisk(GROUP_DIR));
		// La landing es el `+page.svelte` de la raíz del grupo.
		if (existsSync(join(GROUP_DIR, '+page.svelte'))) onDisk.add('/');

		for (const route of BILINGUAL_ROUTES) {
			expect(onDisk.has(route), `${route} está declarada pero no existe`).toBe(true);
		}
	});

	it('toda ruta del grupo está declarada como bilingüe', () => {
		for (const route of routesOnDisk(GROUP_DIR)) {
			expect(isBilingualRoute(route), `${route} existe pero no está en BILINGUAL_ROUTES`).toBe(
				true
			);
		}
	});
});
