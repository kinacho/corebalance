import { getPosts } from '$lib/blog';
import { BILINGUAL_ROUTES, absoluteUrl, isNoindexRoute, localizePath } from '$lib/i18n/routing';
import type { RequestHandler } from './$types';

export const prerender = true;

/**
 * Fecha real de última modificación del contenido de cada página estática.
 *
 * Antes se usaba `new Date()` del build, así que cada deploy marcaba el sitio
 * entero como actualizado. Es frescura inventada: Google acaba desconfiando del
 * `lastmod` de todas las URLs, incluidas las de los posts, que sí son ciertas.
 *
 * ⚠️ Al cambiar el contenido visible de una de estas páginas, actualiza su fecha
 * aquí. Cambiar sólo metadatos o estilos no cuenta como modificación.
 */
const STATIC_PAGES: Record<string, { lastmod: string; priority: string; changefreq: string }> = {
	'/': { lastmod: '2026-08-01', priority: '1.0', changefreq: 'weekly' },
	// Los dos hubs van a 0.8, por encima de sus hijas (0.7): son el destino del
	// enlace de la navbar, que se repite en todas las páginas del sitio.
	// 10-ago-2026: el índice pasó de 2.026 a 4.700 caracteres de contenido propio (el
	// recorrido de cuatro pasos y las preguntas frecuentes), que es el arreglo del «soft 404»
	// que Search Console reportaba en `/en/herramientas`. La fecha se toca porque cambió el
	// contenido visible: es la única señal del sitemap que invita a revisitar la página.
	'/herramientas': { lastmod: '2026-08-10', priority: '0.8', changefreq: 'monthly' },
	'/comparativas': { lastmod: '2026-08-02', priority: '0.8', changefreq: 'monthly' },
	'/comparativas/corebalance-vs-portfolio-performance': {
		lastmod: '2026-08-01',
		priority: '0.7',
		changefreq: 'monthly'
	},
	'/comparativas/corebalance-vs-excel': {
		lastmod: '2026-08-01',
		priority: '0.7',
		changefreq: 'monthly'
	},
	'/comparativas/corebalance-vs-indexa-capital': {
		lastmod: '2026-08-01',
		priority: '0.7',
		changefreq: 'monthly'
	},
	'/herramientas/calculadora-ter': {
		lastmod: '2026-08-01',
		priority: '0.7',
		changefreq: 'monthly'
	},
	'/herramientas/checklist-rebalanceo': {
		lastmod: '2026-08-01',
		priority: '0.7',
		changefreq: 'monthly'
	},
	'/comparativas/corebalance-vs-justetf': {
		lastmod: '2026-08-01',
		priority: '0.7',
		changefreq: 'monthly'
	},
	'/comparativas/corebalance-vs-ghostfolio': {
		lastmod: '2026-08-01',
		priority: '0.7',
		changefreq: 'monthly'
	},
	'/herramientas/simulador-crisis': {
		lastmod: '2026-08-01',
		priority: '0.7',
		changefreq: 'monthly'
	},
	'/herramientas/calculadora-precio-medio': {
		lastmod: '2026-08-01',
		priority: '0.7',
		changefreq: 'monthly'
	},
	// Las legales (/privacy, /terms, /cookies) no están aquí a propósito: llevan
	// noindex, así que quedan fuera del sitemap. Ver NOINDEX_ROUTES.
};

/** Rutas cuya frescura sí depende del contenido publicado, no de una fecha fija. */
const POST_DRIVEN_PAGES: Record<string, { priority: string; changefreq: string }> = {
	'/blog': { priority: '0.8', changefreq: 'weekly' },
	'/autor/kinacho': { priority: '0.5', changefreq: 'monthly' }
};

interface UrlEntry {
	loc: string;
	lastmod: string;
	changefreq: string;
	priority: string;
	alternates?: { hreflang: string; href: string }[];
}

function renderUrl(entry: UrlEntry): string {
	const alts = (entry.alternates ?? [])
		.map(
			({ hreflang, href }) =>
				`    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`
		)
		.join('\n');

	return `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${alts ? `\n${alts}` : ''}
  </url>`;
}

export const GET: RequestHandler = async () => {
	const esPosts = getPosts('es');
	const enPosts = getPosts('en');
	const allPosts = [...esPosts, ...enPosts];

	const postDate = (post: (typeof allPosts)[number]) => post.updatedDate || post.publishDate;

	/** Fecha del post más reciente por idioma, para /blog y la página de autor. */
	const newestByLang = {
		es: esPosts.length ? postDate(esPosts[0]) : '2026-06-26',
		en: enPosts.length ? postDate(enPosts[0]) : '2026-06-26'
	};

	const entries: UrlEntry[] = [];

	// ── Páginas bilingües: una entrada por idioma, con hreflang real ───────────
	// Cada idioma tiene ahora su propia URL (`/x` y `/en/x`), así que los
	// `hreflang` apuntan a documentos distintos. Antes los tres apuntaban a la
	// misma URL, que es `hreflang` inválido y Google simplemente lo ignora.
	for (const route of BILINGUAL_ROUTES) {
		// Las legales se declaran noindex en su propio <head>: pedir en el sitemap
		// que se indexen sería contradecirse, y Search Console lo reporta como error.
		if (isNoindexRoute(route)) continue;

		const esUrl = absoluteUrl(route);
		const enUrl = absoluteUrl(localizePath(route, 'en'));
		const alternates = [
			{ hreflang: 'es', href: esUrl },
			{ hreflang: 'en', href: enUrl },
			{ hreflang: 'x-default', href: esUrl }
		];

		const config = STATIC_PAGES[route];
		const postDriven = POST_DRIVEN_PAGES[route];

		if (!config && !postDriven) continue;

		const priority = config?.priority ?? postDriven!.priority;
		const changefreq = config?.changefreq ?? postDriven!.changefreq;

		entries.push({
			loc: esUrl,
			lastmod: config?.lastmod ?? newestByLang.es,
			changefreq,
			priority,
			alternates
		});
		entries.push({
			loc: enUrl,
			lastmod: config?.lastmod ?? newestByLang.en,
			changefreq,
			priority,
			alternates
		});
	}

	// ── Posts del blog ────────────────────────────────────────────────────────
	// El slug ya es propio de cada idioma, así que cada post es una URL con sus
	// alternativas declaradas desde el frontmatter (`slugs`).
	for (const post of allPosts) {
		const esSlug = post.slugs?.es ?? (post.lang === 'es' ? post.slug : null);
		const enSlug = post.slugs?.en ?? (post.lang === 'en' ? post.slug : null);

		const alternates: { hreflang: string; href: string }[] = [];
		if (esSlug) alternates.push({ hreflang: 'es', href: absoluteUrl(`/blog/${esSlug}`) });
		if (enSlug) alternates.push({ hreflang: 'en', href: absoluteUrl(`/blog/${enSlug}`) });
		const defaultSlug = esSlug ?? enSlug;
		if (defaultSlug) {
			alternates.push({ hreflang: 'x-default', href: absoluteUrl(`/blog/${defaultSlug}`) });
		}

		entries.push({
			loc: absoluteUrl(`/blog/${post.slug}`),
			lastmod: postDate(post),
			changefreq: 'monthly',
			priority: '0.6',
			alternates
		});
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map(renderUrl).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
