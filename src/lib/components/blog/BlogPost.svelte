<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import type { Post } from '$lib/blog';
  import { goto } from '$app/navigation';

  let { post } = $props<{
    post: Post;
  }>();

  const lang = $derived(post.lang);

  const t = $derived(lang === 'en' ? {
    back: 'Back to blog',
    breadcrumbHome: 'Home',
    breadcrumbBlog: 'Blog',
    ctaTitle: 'Ready to rebalance your portfolio?',
    ctaDesc: 'Enter your funds or ETFs, set your target percentages, and get the exact calculation instantly. Free, no signup required, and 100% private in your browser.',
    ctaBtn: 'Try free calculator',
    readTime: '3 min read'
  } : {
    back: 'Volver al blog',
    breadcrumbHome: 'Inicio',
    breadcrumbBlog: 'Blog',
    ctaTitle: '¿Listo para rebalancear tu cartera?',
    ctaDesc: 'Introduce tus fondos o ETFs, define tus porcentajes objetivo y obtén los cálculos exactos al instante. Gratis, sin registro y 100% privado en tu navegador.',
    ctaBtn: 'Probar calculadora gratis',
    readTime: '3 min de lectura'
  });

  function formatPostDate(dateStr: string) {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', options);
  }

  // Generamos el schema JSON-LD de Article
  const jsonLd = $derived({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': post.title,
    'description': post.description,
    'image': post.ogImage.startsWith('http') ? post.ogImage : `https://corebalance.app${post.ogImage}`,
    'datePublished': post.publishDate,
    'dateModified': post.updatedDate,
    'author': {
      '@type': 'Person',
      'name': post.author
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'CoreBalance',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://corebalance.app/logo.png'
      }
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': post.canonical
    }
  });

  const jsonLdString = $derived(JSON.stringify(jsonLd));

  const Content = $derived(post.content);
</script>

<svelte:head>
  <title>{post.title} | CoreBalance</title>
  <meta name="description" content={post.description} />
  
  <!-- Open Graph -->
  <meta property="og:title" content={post.title} />
  <meta property="og:description" content={post.description} />
  <meta property="og:image" content={post.ogImage} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={post.canonical} />
  
  <!-- Canonical -->
  <link rel="canonical" href={post.canonical} />

  <!-- Schema.org JSON-LD -->
  {@html `<script type="application/ld+json">${jsonLdString}</script>`}
</svelte:head>

<div class="blog-post-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto('/')} />

  <main class="post-container">
    <!-- Breadcrumb de navegación -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">{t.breadcrumbHome}</a>
      <span class="separator">/</span>
      <a href="/blog">{t.breadcrumbBlog}</a>
      <span class="separator">/</span>
      <span class="current" aria-current="page">{post.title}</span>
    </nav>

    <article class="post-article">
      <header class="post-header">
        <div class="post-meta">
          <time datetime={post.publishDate}>{formatPostDate(post.publishDate)}</time>
          <span class="separator-dot">·</span>
          <span>{t.readTime}</span>
          <span class="separator-dot">·</span>
          <span class="author">Por {post.author}</span>
        </div>

        <h1 class="post-title">{post.title}</h1>
        
        <div class="post-tags">
          {#each post.tags as tag}
            <span class="tag-badge">#{tag}</span>
          {/each}
        </div>
      </header>

      <!-- Cuerpo del post (Markdown renderizado) -->
      <div class="markdown-body">
        <Content />
      </div>

      <!-- CTA integrado al final del artículo -->
      <section class="post-cta">
        <div class="cta-mesh"></div>
        <div class="cta-content">
          <h3>{t.ctaTitle}</h3>
          <p>{t.ctaDesc}</p>
          <button class="btn-cta" onclick={() => goto('/')}>
            {t.ctaBtn}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="cta-arrow">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </section>
    </article>

    <div class="post-back-nav">
      <a href="/blog" class="btn-back">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="back-arrow">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        {t.back}
      </a>
    </div>
  </main>

  <LandingFooter />
</div>

<style>
  .blog-post-page {
    background: var(--bg-primary, #05050a);
    color: var(--text-primary, #ffffff);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
  }

  .post-container {
    max-width: 800px;
    width: 100%;
    margin: 0 auto;
    padding: 130px 1.5rem 80px;
    flex-grow: 1;
    z-index: 10;
  }

  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    margin-bottom: 2.5rem;
  }

  .breadcrumb a {
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .breadcrumb a:hover {
    color: #fff;
  }

  .breadcrumb .separator {
    color: rgba(255, 255, 255, 0.2);
  }

  .breadcrumb .current {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 600px) {
    .breadcrumb .current {
      max-width: 150px;
    }
  }

  .post-article {
    background: var(--bg-card, rgba(255, 255, 255, 0.02));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
    border-radius: 24px;
    padding: 3rem;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    margin-bottom: 3rem;
  }

  @media (max-width: 768px) {
    .post-article {
      padding: 1.75rem;
      border-radius: 16px;
    }
  }

  .post-header {
    margin-bottom: 3rem;
    border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    padding-bottom: 2rem;
  }

  .post-meta {
    font-size: 0.9rem;
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .separator-dot {
    color: rgba(255, 255, 255, 0.2);
  }

  .post-title {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1.25;
    margin: 0 0 1.5rem;
    letter-spacing: -0.02em;
    color: #fff;
  }

  @media (max-width: 768px) {
    .post-title {
      font-size: 1.85rem;
    }
  }

  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-badge {
    font-size: 0.8rem;
    font-weight: 600;
    color: #60a5fa;
    background: rgba(59, 130, 246, 0.1);
    padding: 0.3rem 0.75rem;
    border-radius: 9999px;
  }

  /* Estilos tipográficos premium para el cuerpo del Markdown */
  .markdown-body {
    line-height: 1.8;
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.85);
  }

  .markdown-body :global(p) {
    margin-top: 0;
    margin-bottom: 1.5rem;
  }

  .markdown-body :global(h2) {
    font-size: 1.6rem;
    font-weight: 700;
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    color: #fff;
    letter-spacing: -0.01em;
  }

  .markdown-body :global(h3) {
    font-size: 1.3rem;
    font-weight: 700;
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: #fff;
  }

  .markdown-body :global(ul), .markdown-body :global(ol) {
    margin-top: 0;
    margin-bottom: 1.5rem;
    padding-left: 1.5rem;
  }

  .markdown-body :global(li) {
    margin-bottom: 0.5rem;
  }

  .markdown-body :global(blockquote) {
    margin: 2rem 0;
    padding: 1rem 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border-left: 4px solid var(--accent-blue, #3b82f6);
    border-radius: 0 12px 12px 0;
    font-style: italic;
    color: rgba(255, 255, 255, 0.95);
  }

  .markdown-body :global(blockquote p) {
    margin: 0;
  }

  .markdown-body :global(a) {
    color: var(--accent-blue, #3b82f6);
    text-decoration: underline;
    font-weight: 600;
    transition: color 0.2s ease;
  }

  .markdown-body :global(a:hover) {
    color: #60a5fa;
  }

  .markdown-body :global(strong) {
    color: #fff;
    font-weight: 700;
  }

  .markdown-body :global(hr) {
    border: 0;
    height: 1px;
    background: var(--border-subtle, rgba(255, 255, 255, 0.08));
    margin: 3rem 0;
  }

  /* Estilos específicos del bloque de llamada a la acción (CTA) */
  .post-cta {
    margin-top: 4rem;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 20px;
    padding: 2.5rem;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .cta-mesh {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 60%);
    pointer-events: none;
    z-index: 1;
  }

  .cta-content {
    position: relative;
    z-index: 2;
    width: 100%;
  }

  .post-cta h3 {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0 0 1rem;
    color: #fff;
    letter-spacing: -0.02em;
  }

  .post-cta p {
    font-size: 0.95rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 2rem;
  }

  .btn-cta {
    background: var(--accent-blue, #3b82f6);
    color: white;
    border: none;
    padding: 0.75rem 1.75rem;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
  }

  .btn-cta:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
  }

  .cta-arrow {
    transition: transform 0.2s ease;
  }

  .btn-cta:hover .cta-arrow {
    transform: translateX(3px);
  }

  /* Navegación inferior */
  .post-back-nav {
    display: flex;
    justify-content: flex-start;
  }

  .btn-back {
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s ease;
  }

  .btn-back:hover {
    color: #fff;
  }

  .back-arrow {
    transition: transform 0.2s ease;
  }

  .btn-back:hover .back-arrow {
    transform: translateX(-3px);
  }
</style>
