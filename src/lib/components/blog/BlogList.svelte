<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import type { Post, Tool } from '$lib/blog';
  import { goto } from '$app/navigation';
  import { localeLink, localizePath } from '$lib/i18n/routing';

  let { posts = [], lang = 'es', tools = [] } = $props<{
    posts: Post[];
    lang: 'es' | 'en';
    tools: Tool[];
  }>();

  // Diccionario simple de traducciones internas
  const t = $derived(lang === 'en' ? {
    title: 'CoreBalance Blog',
    subtitle: 'Guides, analysis, and tips on passive investing, index funds, and portfolio rebalancing.',
    readMore: 'Read article',
    noPosts: 'No articles published yet.',
    backToHome: 'Back to home',
    tagsTitle: 'Topics:',
    toolsSection: 'Interactive Tools',
    toolsSubtitle: 'Free calculators and resources to help you manage your portfolio.',
    openTool: 'Open tool →',
    readTime: (min: number) => `${min} min read`,
    authorPrefix: 'By'
  } : {
    title: 'Blog de CoreBalance',
    subtitle: 'Guías, análisis y consejos sobre inversión pasiva, fondos indexados y rebalanceo de carteras.',
    readMore: 'Leer artículo',
    noPosts: 'No hay artículos publicados todavía.',
    backToHome: 'Volver al inicio',
    tagsTitle: 'Temas:',
    toolsSection: 'Herramientas Interactivas',
    toolsSubtitle: 'Calculadoras y recursos gratuitos para gestionar tu cartera mejor.',
    openTool: 'Abrir herramienta →',
    readTime: (min: number) => `${min} min de lectura`,
    authorPrefix: 'Por'
  });

  const homePath = $derived(localizePath('/', lang));

  function formatPostDate(dateStr: string) {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', options);
  }
</script>


<div class="blog-page">
  <!-- Mesh de fondo animado idéntico al resto de la web -->
  <div class="background-mesh"></div>
  
  <LandingNavBar onStart={() => goto(homePath)} />

  <main class="blog-container">
    <header class="blog-header">
      <h1 class="gradient-text">{t.title}</h1>
      <p class="subtitle">{t.subtitle}</p>
    </header>

    {#if tools.length > 0}
      <section class="tools-section">
        <div class="section-label">
          <span class="section-label-line"></span>
          <span class="section-label-text">{t.toolsSection}</span>
          <span class="section-label-line"></span>
        </div>
        <p class="tools-subtitle">{t.toolsSubtitle}</p>
        <div class="tools-grid">
          {#each tools as tool}
            <a href={localeLink(tool.url, lang)} class="tool-card">
              <div class="tool-icon">{tool.icon}</div>
              <div class="tool-body">
                <span class="tool-badge">{tool.badge[lang]}</span>
                <h2 class="tool-title">{tool.title[lang]}</h2>
                <p class="tool-description">{tool.description[lang]}</p>
              </div>
              <span class="tool-cta">{t.openTool}</span>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    {#if posts.length === 0}
      <div class="no-posts-card">
        <p>{t.noPosts}</p>
        <button class="btn-secondary" onclick={() => goto(homePath)}>{t.backToHome}</button>
      </div>
    {:else}
      <div class="posts-grid">
        {#each posts as post}
          <!-- Enlace real, no un onclick: así el crawler sigue el artículo y el
               teclado puede navegarlo (antes hacía falta silenciar tres reglas
               de accesibilidad). -->
          <article class="post-card">
            <a class="card-content" href={`/blog/${post.slug}`}>
              <div class="post-meta">
                <time datetime={post.publishDate}>{formatPostDate(post.publishDate)}</time>
                <span class="author">· {t.authorPrefix} {post.author}</span>
                <span>· {t.readTime(post.readingMinutes ?? 3)}</span>
              </div>

              <h2 class="post-title">{post.title}</h2>
              <p class="post-description">{post.description}</p>

              <div class="post-tags">
                {#each post.tags as tag}
                  <span class="tag-badge">#{tag}</span>
                {/each}
              </div>

              <div class="card-footer">
                <span class="read-link">
                  {t.readMore}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow-icon">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </span>
              </div>
            </a>
          </article>
        {/each}
      </div>
    {/if}
  </main>

  <LandingFooter />
</div>

<style>
  /* ── Tools Section ────────────────────────────────────── */
  .tools-section {
    margin-bottom: 5rem;
  }

  .section-label {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .section-label-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
  }

  .section-label-text {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #a78bfa;
    white-space: nowrap;
  }

  .tools-subtitle {
    text-align: center;
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    font-size: 0.95rem;
    margin-bottom: 2rem;
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 1.25rem;
  }

  @media (max-width: 768px) {
    .tools-grid {
      grid-template-columns: 1fr;
    }
  }

  .tool-card {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 1.5rem;
    border-radius: 20px;
    border: 1px solid rgba(139, 92, 246, 0.2);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.03) 100%);
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .tool-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(59, 130, 246, 0.2));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .tool-card:hover {
    border-color: rgba(139, 92, 246, 0.4);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.06) 100%);
    transform: translateY(-3px);
    box-shadow: 0 12px 30px rgba(139, 92, 246, 0.12);
  }

  .tool-card:hover::before {
    opacity: 1;
  }

  .tool-icon {
    font-size: 2rem;
    line-height: 1;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 12px;
  }

  .tool-body {
    flex: 1;
    min-width: 0;
  }

  .tool-badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #a78bfa;
    background: rgba(139, 92, 246, 0.12);
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    margin-bottom: 0.5rem;
  }

  .tool-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.4rem;
    line-height: 1.3;
  }

  .tool-description {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.5;
    margin: 0;
  }

  .tool-cta {
    font-size: 0.8rem;
    font-weight: 700;
    color: #a78bfa;
    white-space: nowrap;
    align-self: center;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  .tool-card:hover .tool-cta {
    transform: translateX(3px);
  }

  .blog-page {
    background: var(--bg-primary, #05050a);
    color: var(--text-primary, #ffffff);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
  }

  .blog-container {
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
    padding: 140px 1.5rem 80px;
    flex-grow: 1;
    z-index: 10;
  }

  .blog-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .gradient-text {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #ffffff 30%, #a78bfa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 768px) {
    .gradient-text {
      font-size: 2.25rem;
    }
  }

  .subtitle {
    color: var(--text-muted, rgba(160, 160, 200, 0.8));
    font-size: 1.15rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .no-posts-card {
    background: var(--bg-card, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    border-radius: 24px;
    padding: 4rem 2rem;
    text-align: center;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .no-posts-card p {
    color: var(--text-muted, rgba(160, 160, 200, 0.8));
    margin-bottom: 1.5rem;
  }

  .posts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 2rem;
  }

  .post-card {
    background: var(--bg-card, rgba(255, 255, 255, 0.02));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    border-radius: 20px;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .post-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 20px;
    padding: 1px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    transition: all 0.3s ease;
  }

  .post-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(139, 92, 246, 0.2);
    box-shadow: 0 12px 30px rgba(139, 92, 246, 0.08);
  }

  .post-card:hover::before {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(139, 92, 246, 0.4) 100%);
  }

  .card-content {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    height: 100%;
    text-decoration: none;
    color: inherit;
  }

  .post-meta {
    font-size: 0.85rem;
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    margin-bottom: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .post-title {
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.4;
    margin: 0 0 1rem;
    color: #fff;
    transition: color 0.2s ease;
  }

  .post-card:hover .post-title {
    color: #a78bfa;
  }

  .post-description {
    font-size: 0.95rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 1.5rem;
    flex-grow: 1;
  }

  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .tag-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: #60a5fa;
    background: rgba(59, 130, 246, 0.1);
    padding: 0.25rem 0.6rem;
    border-radius: 9999px;
  }

  .card-footer {
    border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
    padding-top: 1.25rem;
    margin-top: auto;
  }

  .read-link {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--accent-blue, #3b82f6);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s ease;
  }

  .post-card:hover .read-link {
    color: #60a5fa;
  }

  .arrow-icon {
    transition: transform 0.2s ease;
  }

  .post-card:hover .arrow-icon {
    transform: translateX(4px);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
  }
</style>
