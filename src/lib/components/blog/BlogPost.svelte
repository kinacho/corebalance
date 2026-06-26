<script lang="ts">
  import { locale, LL } from '$lib/i18n/i18n-svelte';
  import type { Post } from '$lib/blog';
  import { goto } from '$app/navigation';
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';

  let { post }: { post: Post } = $props();

  // Reaccionar al cambio global de idioma
  const currentLang = $derived($locale);

  // Usar $LL para las traducciones fijas que no están en el post
  const t = $derived({
    back: currentLang === 'es' ? 'Volver al blog' : 'Back to blog',
    breadcrumbHome: currentLang === 'es' ? 'Inicio' : 'Home',
    breadcrumbBlog: 'Blog',
    ctaTitle: currentLang === 'es' ? '¿Listo para rebalancear tu cartera?' : 'Ready to rebalance your portfolio?',
    ctaDesc: currentLang === 'es' 
        ? 'Introduce tus fondos o ETFs, define tus porcentajes objetivo y obtén los cálculos exactos al instante. Gratis, sin registro y 100% privado en tu navegador.' 
        : 'Enter your funds or ETFs, set your target percentages, and get the exact calculation instantly. Free, no signup required, and 100% private in your browser.',
    ctaBtn: currentLang === 'es' ? 'Probar calculadora gratis' : 'Try free calculator',
    readTime: currentLang === 'es' ? '3 min de lectura' : '3 min read',
    authorPrefix: currentLang === 'es' ? 'Por' : 'By'
  });

  function formatPostDate(dateStr: string) {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', options);
  }

  // Generamos el schema JSON-LD de Article y Breadcrumb
  const jsonLd = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': post.title,
      'description': post.description,
      'image': post.ogImage.startsWith('http') ? post.ogImage : `https://corebalance.app${post.ogImage}`,
      'datePublished': post.publishDate,
      'dateModified': post.updatedDate,
      'author': { '@type': 'Person', 'name': post.author },
      'publisher': {
        '@type': 'Organization',
        'name': 'CoreBalance',
        'logo': { '@type': 'ImageObject', 'url': 'https://corebalance.app/logo.png' }
      },
      'mainEntityOfPage': { '@type': 'WebPage', '@id': post.canonical }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': t.breadcrumbHome, 'item': 'https://corebalance.app/' },
        { '@type': 'ListItem', 'position': 2, 'name': t.breadcrumbBlog, 'item': 'https://corebalance.app/blog' },
        { '@type': 'ListItem', 'position': 3, 'name': post.title, 'item': post.canonical }
      ]
    }
  ]);

  const jsonLdString = $derived(JSON.stringify(jsonLd));

  const Content = $derived(post.content);
</script>

<svelte:head>
  <title>{post.title} | CoreBalance</title>
  <meta name="description" content={post.description} />
  
  	<!-- Canonical + Hreflang (ES/EN/x-default) -->
	{#if post.slugs?.es && post.slugs?.en}
		<link rel="alternate" hreflang="es" href="https://corebalance.app/blog/{post.slugs.es}" />
		<link rel="alternate" hreflang="en" href="https://corebalance.app/blog/{post.slugs.en}" />
		<link rel="alternate" hreflang="x-default" href="https://corebalance.app/blog/{post.slugs.es}" />
	{:else}
		<link rel="alternate" hreflang={post.lang} href="https://corebalance.app/blog/{post.slug}" />
	{/if}

	<!-- Open Graph -->
	<meta property="og:title" content={post.title} />
	<meta property="og:description" content={post.description} />
	<meta property="og:image" content={post.ogImage.startsWith('http') ? post.ogImage : `https://corebalance.app${post.ogImage}`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:type" content="article" />
	<meta property="og:url" content={post.canonical} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={post.title} />
	<meta name="twitter:description" content={post.description} />
	<meta name="twitter:image" content={post.ogImage.startsWith('http') ? post.ogImage : `https://corebalance.app${post.ogImage}`} />

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
          <span class="author">{t.authorPrefix} {post.author}</span>
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

  .markdown-body {
    line-height: 1.8;
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.85);
  }

  .markdown-body :global(p) { margin-bottom: 1.5rem; }
  .markdown-body :global(h2) { font-size: 1.6rem; font-weight: 700; margin: 2.5rem 0 1rem; color: #fff; }
  .markdown-body :global(h3) { font-size: 1.3rem; font-weight: 700; margin: 2rem 0 1rem; color: #fff; }
  .markdown-body :global(ul) { padding-left: 1.5rem; margin-bottom: 1.5rem; }
  .markdown-body :global(a) { color: var(--accent-blue, #3b82f6); text-decoration: underline; font-weight: 600; }

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
  }

  .post-back-nav { display: flex; justify-content: flex-start; margin-top: 2rem;}
  .btn-back { color: var(--text-muted, rgba(160, 160, 200, 0.6)); text-decoration: none; font-size: 0.95rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; transition: color 0.2s ease; }
  .btn-back:hover { color: #fff; }
</style>
