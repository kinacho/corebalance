import { describe, it, expect } from 'vitest';
import { familiaDeCta, CTA_POR_DEFECTO } from './blog-cta';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('familiaDeCta', () => {
	it('reconoce las cuatro familias por una etiqueta característica', () => {
		expect(familiaDeCta(['csv', 'degiro'])).toBe('importar');
		expect(familiaDeCta(['traspasos', 'hacienda'])).toBe('fiscalidad');
		expect(familiaDeCta(['iwda', 'vwce'])).toBe('comparar');
		expect(familiaDeCta(['rebalanceo'])).toBe('rebalancear');
	});

	/**
	 * ⚠️ La prioridad es la decisión de este módulo, no la lista de etiquetas.
	 *
	 * `msci-world-acc-vs-dist` es el caso real y el que fija el orden: lleva `acumulacion`
	 * (comparar) y `fiscalidad` a la vez, es la página con más impresiones del sitio, y sus
	 * consultas medidas son `acc vs dist` — alguien eligiendo clase de fondo, que puede no
	 * tener cartera. Con `fiscalidad` ganando se le ofrecía calcular el traspaso de una
	 * cartera que no tiene, así que **`comparar` va delante**.
	 *
	 * La primera versión de este test afirmaba lo contrario justo debajo de un comentario
	 * que explicaba por qué estaba mal. Se vio construyendo el sitio y leyendo qué CTA
	 * salía en el HTML de esa página, no releyendo el módulo.
	 */
	it('con varias familias gana la que menos le exige al lector', () => {
		expect(familiaDeCta(['csv', 'fiscalidad', 'iwda'])).toBe('importar');
		expect(familiaDeCta(['fiscalidad', 'iwda'])).toBe('comparar');
		expect(familiaDeCta(['etfs', 'msci-world', 'acumulacion', 'distribucion', 'fiscalidad'])).toBe(
			'comparar'
		);
	});

	it('⚠️ el nombre de un bróker no convierte un post fiscal en uno de importación', () => {
		// `rebalanceo-myinvestor-sin-impuestos`, tal cual está etiquetado en el repo.
		expect(
			familiaDeCta(['rebalanceo', 'myinvestor', 'fiscalidad', 'fondos-indexados', 'traspasos'])
		).toBe('fiscalidad');
		// Y `dividendos-etfs-degiro` tampoco debe ofrecer importar por llevar `degiro`.
		expect(familiaDeCta(['degiro', 'dividendos', 'etfs'])).not.toBe('importar');
	});

	it('⚠️ ante la duda devuelve el CTA que ya había', () => {
		// Nunca puede dejar un post sin llamada a la acción: lo peor que hace un fallo
		// aquí es enseñar la versión menos afinada.
		for (const entrada of [undefined, null, [], ['etiqueta-que-no-existe'], ['']]) {
			expect(familiaDeCta(entrada as string[]), JSON.stringify(entrada)).toBe(CTA_POR_DEFECTO);
		}
	});

	it('no le afectan mayúsculas ni espacios sueltos', () => {
		expect(familiaDeCta([' CSV '])).toBe('importar');
		expect(familiaDeCta(['Traspasos'])).toBe('fiscalidad');
	});
});

/**
 * Que el reparto cubra de verdad los posts que hay.
 *
 * ⚠️ Sin esto, las listas de etiquetas podrían no casar con **ninguna** de las 42 y todos
 * los artículos caerían al CTA por defecto — o sea, el módulo entero sin efecto, verde y
 * silencioso. Es el mismo riesgo que un glob que no casa con nada.
 */
describe('familiaDeCta · sobre los posts reales', () => {
	const dirs = ['src/content/blog/es', 'src/content/blog/en'];

	const posts = dirs.flatMap((d) =>
		fs.existsSync(d)
			? fs.readdirSync(d).map((f) => {
					const texto = fs.readFileSync(path.join(d, f), 'utf8');
					const m = texto.match(/^tags: \[(.*)\]/m);
					return {
						slug: f.replace(/\.md$/, ''),
						tags: m ? m[1].split(',').map((t) => t.trim()) : []
					};
				})
			: []
	);

	it('hay posts que leer', () => {
		expect(posts.length).toBeGreaterThan(30);
	});

	it('las cuatro familias se usan al menos una vez', () => {
		const usadas = new Set(posts.map((p) => familiaDeCta(p.tags)));
		for (const familia of ['importar', 'fiscalidad', 'comparar', 'rebalancear']) {
			expect(usadas, `ninguno de los ${posts.length} posts cae en «${familia}»`).toContain(familia);
		}
	});

	it('no cae todo al CTA por defecto', () => {
		// El control que importa: si las listas dejaran de casar, esto lo dice.
		const porDefecto = posts.filter((p) => familiaDeCta(p.tags) === CTA_POR_DEFECTO).length;
		expect(porDefecto).toBeLessThan(posts.length / 2);
	});

	it('los dos gemelos de un mismo tema caen en la misma familia', () => {
		// Un post y su traducción deben ofrecer lo mismo; si no, las etiquetas en inglés
		// se han quedado fuera de alguna lista.
		const parejas: [string, string][] = [
			['msci-world-acc-vs-dist', 'msci-world-accumulating-vs-distributing'],
			['importar-movimientos-myinvestor', 'import-myinvestor-csv'],
			['traspasos-fondos-indexados-hacienda', 'index-fund-transfers-spain-tax-guide'],
			['como-rebalancear-cartera-indexada', 'how-to-rebalance-indexed-portfolio']
		];
		for (const [es, en] of parejas) {
			const a = posts.find((p) => p.slug === es);
			const b = posts.find((p) => p.slug === en);
			expect(a, es).toBeDefined();
			expect(b, en).toBeDefined();
			expect(familiaDeCta(a!.tags), `${es} vs ${en}`).toBe(familiaDeCta(b!.tags));
		}
	});
});
