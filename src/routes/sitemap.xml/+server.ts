import { getPosts } from '$lib/blog';
import type { RequestHandler } from './$types';

export const prerender = true;

const BASE = 'https://corebalance.app';

export const GET: RequestHandler = async () => {
  const buildDate = new Date().toISOString().split('T')[0];

  // ── Páginas estáticas ──────────────────────────────────────────────────────
  const staticPages = [
    { url: '',           priority: '1.0', changefreq: 'weekly',  lastmod: buildDate },
    { url: 'blog',       priority: '0.8', changefreq: 'weekly',  lastmod: buildDate },
    { url: 'herramientas/calculadora-ter',                 priority: '0.7', changefreq: 'monthly', lastmod: buildDate },
    { url: 'herramientas/checklist-rebalanceo',            priority: '0.7', changefreq: 'monthly', lastmod: buildDate },
    { url: 'comparativas/corebalance-vs-portfolio-performance', priority: '0.7', changefreq: 'monthly', lastmod: buildDate },
    { url: 'comparativas/corebalance-vs-excel',            priority: '0.7', changefreq: 'monthly', lastmod: buildDate },
    { url: 'comparativas/corebalance-vs-indexa-capital',   priority: '0.7', changefreq: 'monthly', lastmod: buildDate },
    { url: 'privacy',    priority: '0.3', changefreq: 'monthly', lastmod: buildDate },
    { url: 'terms',      priority: '0.3', changefreq: 'monthly', lastmod: buildDate },
    { url: 'cookies',    priority: '0.3', changefreq: 'monthly', lastmod: buildDate },
  ];

  // ── Blog posts con hreflang ────────────────────────────────────────────────
  const esPosts = getPosts('es');
  const enPosts = getPosts('en');

  // Mapa slug → post para búsquedas O(1)
  const enBySlug = new Map(enPosts.map(p => [p.slug, p]));
  const esBySlug = new Map(esPosts.map(p => [p.slug, p]));

  // Generamos una entrada por cada post, con sus alternativas hreflang
  interface BlogEntry {
    slug: string;
    lastmod: string;
    altEs: string | null;
    altEn: string | null;
  }

  const blogEntries: BlogEntry[] = [];
  const seen = new Set<string>();

  // ES posts
  for (const post of esPosts) {
    if (seen.has(post.slug)) continue;
    seen.add(post.slug);
    const enSlug = post.slugs?.en ?? null;
    blogEntries.push({
      slug: post.slug,
      lastmod: post.updatedDate || post.publishDate,
      altEs: post.slug,
      altEn: enSlug,
    });
  }

  // EN posts (solo los que no han sido vistos ya por tener slugs distintos)
  for (const post of enPosts) {
    if (seen.has(post.slug)) continue;
    seen.add(post.slug);
    const esSlug = post.slugs?.es ?? null;
    blogEntries.push({
      slug: post.slug,
      lastmod: post.updatedDate || post.publishDate,
      altEs: esSlug,
      altEn: post.slug,
    });
  }

  // Para cada post ES con par EN, añadimos también la URL EN al sitemap
  const pairedEnEntries: BlogEntry[] = [];
  for (const entry of blogEntries) {
    if (entry.altEn && entry.altEn !== entry.slug && !seen.has(entry.altEn)) {
      const enPost = enBySlug.get(entry.altEn);
      pairedEnEntries.push({
        slug: entry.altEn,
        lastmod: enPost?.updatedDate || enPost?.publishDate || entry.lastmod,
        altEs: entry.altEs,
        altEn: entry.altEn,
      });
      seen.add(entry.altEn);
    }
  }

  const allBlogEntries = [...blogEntries, ...pairedEnEntries];

  // ── Renderizado XML ────────────────────────────────────────────────────────
  function hreflang(altEs: string | null, altEn: string | null): string {
    const lines: string[] = [];
    if (altEs) lines.push(`    <xhtml:link rel="alternate" hreflang="es" href="${BASE}/blog/${altEs}"/>`);
    if (altEn) lines.push(`    <xhtml:link rel="alternate" hreflang="en" href="${BASE}/blog/${altEn}"/>`);
    // x-default apunta al ES si existe, si no al EN
    const def = altEs ?? altEn;
    if (def) lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/blog/${def}"/>`);
    return lines.join('\n');
  }

  const staticXml = staticPages.map(p => `  <url>
    <loc>${BASE}/${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  const blogXml = allBlogEntries.map(entry => {
    const hl = hreflang(entry.altEs, entry.altEn);
    return `  <url>
    <loc>${BASE}/blog/${entry.slug}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
${hl}
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticXml}
${blogXml}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600'
    }
  });
};
