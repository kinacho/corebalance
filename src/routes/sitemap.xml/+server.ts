import { getPosts } from '$lib/blog';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const lastmod = new Date().toISOString().split('T')[0];
  
  const pages = [
    { url: '', priority: '1.0', changefreq: 'weekly' },
    { url: 'privacy', priority: '0.3', changefreq: 'monthly' },
    { url: 'terms', priority: '0.3', changefreq: 'monthly' },
    { url: 'cookies', priority: '0.3', changefreq: 'monthly' },
    { url: 'blog', priority: '0.8', changefreq: 'daily' },
    { url: 'comparativas/corebalance-vs-portfolio-performance', priority: '0.7', changefreq: 'monthly' },
    { url: 'comparativas/corebalance-vs-excel', priority: '0.7', changefreq: 'monthly' },
    { url: 'comparativas/corebalance-vs-indexa-capital', priority: '0.7', changefreq: 'monthly' },
    { url: 'herramientas/calculadora-ter', priority: '0.7', changefreq: 'monthly' },
    { url: 'herramientas/checklist-rebalanceo', priority: '0.7', changefreq: 'monthly' }
  ];

  // Obtener todos los posts (unificando slugs de ambos idiomas si es necesario)
  const esPosts = getPosts('es');
  const enPosts = getPosts('en');
  
  // Usamos un Set para evitar duplicados si un post tiene el mismo slug en ambos idiomas
  const uniqueSlugs = new Set([
    ...esPosts.map(p => p.slug),
    ...enPosts.map(p => p.slug)
  ]);

  uniqueSlugs.forEach((slug) => {
    pages.push({
      url: `blog/${slug}`,
      priority: '0.6',
      changefreq: 'weekly'
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>https://corebalance.app/${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600'
    }
  });
};
