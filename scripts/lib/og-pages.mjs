/**
 * Qué cards sociales existen: las páginas fijas, las de los cursos y los nombres antiguos.
 *
 * ⚠️ **Es un módulo de datos y no vive dentro de `generate-og.mjs` por una razón concreta:
 * para que `src/lib/seo/og.test.ts` pueda importarlo.** Ese test comprueba que estas
 * claves y el tipo `OgPageKey` de `src/lib/seo/og.ts` no se desincronicen, que es un
 * desajuste hoy silencioso en una de sus dos direcciones —una entrada que ninguna ruta usa
 * son 260 KB huérfanos que nadie caza—. Importar `generate-og.mjs` no sirve: arrastraría
 * `satori` y el binario nativo de `@resvg/resvg-js` al entorno de test, y además su
 * `main()` regeneraría las imágenes al importarlo.
 *
 * La alternativa era leer las claves con una expresión regular, y una comprobación que
 * deja de encajar en silencio es exactamente el defecto recurrente de este repo.
 */
import { LOCALES } from './locales.mjs';

/**
 * Páginas fijas. Los títulos son los mismos que sirve cada página; se repiten
 * aquí porque este script corre en Node, fuera de la app, y no puede leer
 * typesafe-i18n. Si cambias el H1 de una página, cambia también el texto de aquí.
 *
 * `langs` es opcional y por defecto son los dos idiomas. Declararlo sirve para las
 * páginas que **solo existen en español** —los cursos, y las dos calculadoras de
 * fiscalidad española—: sin él el bucle escribiría un `-en.png` de ~130 KB que ninguna
 * página pide nunca.
 */
export const PAGES = [
	{
		key: 'landing',
		kicker: { es: 'Gratis, privada y sin registro', en: 'Free, private, no sign-up' },
		title: {
			es: 'Gestiona y rebalancea tu cartera de ETFs y fondos indexados',
			en: 'Track and rebalance your index fund & ETF portfolio'
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
		key: 'herramientas',
		kicker: { es: 'Herramientas interactivas', en: 'Interactive tools' },
		title: {
			es: 'Herramientas gratis para el inversor indexado',
			en: 'Free tools for index investors'
		}
	},
	{
		key: 'comparativas',
		kicker: { es: 'Comparativas', en: 'Comparisons' },
		title: {
			es: 'CoreBalance frente a las alternativas',
			en: 'CoreBalance versus the alternatives'
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
		key: 'crisis',
		kicker: { es: 'Herramienta interactiva', en: 'Interactive tool' },
		title: {
			es: '¿Qué pasaría con tu cartera si la bolsa cae?',
			en: 'What would a market crash do to your portfolio?'
		}
	},
	{
		key: 'precio-medio',
		kicker: { es: 'Herramienta interactiva', en: 'Interactive tool' },
		title: {
			es: 'Calculadora de precio medio de compra',
			en: 'Average purchase cost calculator'
		}
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
	},
	{
		key: 'vs-justetf',
		kicker: { es: 'Comparativa', en: 'Comparison' },
		title: { es: 'CoreBalance vs JustETF', en: 'CoreBalance vs JustETF' }
	},
	{
		key: 'vs-ghostfolio',
		kicker: { es: 'Comparativa', en: 'Comparison' },
		title: { es: 'CoreBalance vs Ghostfolio', en: 'CoreBalance vs Ghostfolio' }
	},
	{
		key: 'cursos',
		langs: ['es'],
		kicker: { es: 'Cursos gratuitos' },
		title: { es: 'Aprende a invertir en indexados sin que nadie te venda nada' }
	}
];

/**
 * Imágenes en la raíz de `static/` que ya estaban referenciadas (y posiblemente
 * compartidas por ahí fuera): se regeneran en su sitio para no romper enlaces
 * antiguos, ahora sí como PNG de 1200×630 de verdad.
 */
export const LEGACY_IMAGES = [
	{ out: 'og-image.png', page: 'landing', lang: 'es' },
	{ out: 'og-image-landing.png', page: 'landing', lang: 'es' },
	{ out: 'og-image-blog.png', page: 'blog', lang: 'es' },
	{ out: 'og-image-ter.png', page: 'ter', lang: 'es' },
	{ out: 'og-image-checklist.png', page: 'checklist', lang: 'es' }
];

/**
 * Una card por curso, y las lecciones heredan la de su curso.
 *
 * ⚠️ **Antes las 34 lecciones compartían `/og-image.png`**, que no es una imagen genérica:
 * es la card de la portada en español (ver `LEGACY_IMAGES`). Al compartir una lección
 * salía el titular de la landing.
 *
 * Se generan desde `collectCursos()` en vez de escribirse en `PAGES` a mano porque los
 * títulos ya viven en `src/lib/cursos.ts` y una segunda copia aquí es una copia que se
 * queda desfasada en silencio — la card seguiría generándose, solo diría otra cosa. El
 * kicker numera el curso, que es lo que da contexto cuando lo que se comparte es una
 * lección suelta: «Curso 2 de 5 · El 80 % de tu resultado se decide aquí».
 *
 * @param {{slug: string, titulo: string}[]} cursos
 */
export function cursoPages(cursos) {
	return cursos.map((curso, i) => ({
		key: `curso-${curso.slug}`,
		langs: ['es'],
		kicker: { es: `Curso ${i + 1} de ${cursos.length}` },
		title: { es: curso.titulo }
	}));
}

/**
 * Cuántos ficheros produce una lista de páginas. Se cuenta y no se multiplica por el
 * número de idiomas: con `langs` ya no todas las páginas producen dos.
 *
 * @param {{langs?: string[]}[]} pages
 */
export function contarCards(pages) {
	return pages.reduce((total, page) => total + (page.langs ?? LOCALES).length, 0);
}
