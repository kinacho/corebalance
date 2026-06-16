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
    { url: 'en/blog', priority: '0.8', changefreq: 'daily' },
    { url: 'comparativas/corebalance-vs-portfolio-performance', priority: '0.7', changefreq: 'monthly' },
    { url: 'comparativas/corebalance-vs-excel', priority: '0.7', changefreq: 'monthly' },
    { url: 'comparativas/corebalance-vs-indexa-capital', priority: '0.7', changefreq: 'monthly' },
    { url: 'herramientas/calculadora-ter', priority: '0.7', changefreq: 'monthly' },
    { url: 'herramientas/checklist-rebalanceo', priority: '0.7', changefreq: 'monthly' }
  ];

  // Cargar posts de español e inglés
  const esPosts = getPosts('es');
  esPosts.forEach((post) => {
    pages.push({
      url: `blog/${post.slug}`,
      priority: '0.6',
      changefreq: 'weekly'
    });
  });

  const enPosts = getPosts('en');
  enPosts.forEach((post) => {
    pages.push({
      url: `en/blog/${post.slug}`,
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
