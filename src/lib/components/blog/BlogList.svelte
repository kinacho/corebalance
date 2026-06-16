<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import type { Post } from '$lib/blog';
  import { goto } from '$app/navigation';

  let { posts = [], lang = 'es' } = $props<{
    posts: Post[];
    lang: 'es' | 'en';
  }>();

  // Diccionario simple de traducciones internas
  const t = $derived(lang === 'en' ? {
    title: 'CoreBalance Blog',
    subtitle: 'Guides, analysis, and tips on passive investing, index funds, and portfolio rebalancing.',
    readMore: 'Read article',
    noPosts: 'No articles published yet.',
    backToHome: 'Back to home',
    tagsTitle: 'Topics:'
  } : {
    title: 'Blog de CoreBalance',
    subtitle: 'Guías, análisis y consejos sobre inversión pasiva, fondos indexados y rebalanceo de carteras.',
    readMore: 'Leer artículo',
    noPosts: 'No hay artículos publicados todavía.',
    backToHome: 'Volver al inicio',
    tagsTitle: 'Temas:'
  });

  function formatPostDate(dateStr: string) {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', options);
  }

  function navigateToPost(slug: string) {
    const prefix = lang === 'es' ? '/blog/' : '/en/blog/';
    goto(`${prefix}${slug}`);
  }
</script>

<div class="blog-page">
  <!-- Mesh de fondo animado idéntico al resto de la web -->
  <div class="background-mesh"></div>
  
  <LandingNavBar onStart={() => goto('/')} />

  <main class="blog-container">
    <header class="blog-header">
      <h1 class="gradient-text">{t.title}</h1>
      <p class="subtitle">{t.subtitle}</p>
    </header>

    {#if posts.length === 0}
      <div class="no-posts-card">
        <p>{t.noPosts}</p>
        <button class="btn-secondary" onclick={() => goto('/')}>{t.backToHome}</button>
      </div>
    {:else}
      <div class="posts-grid">
        {#each posts as post}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <article class="post-card" onclick={() => navigateToPost(post.slug)}>
            <div class="card-content">
              <div class="post-meta">
                <time datetime={post.publishDate}>{formatPostDate(post.publishDate)}</time>
                <span class="author">· Por {post.author}</span>
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
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </main>

  <LandingFooter />
</div>

<style>
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
  }

  .post-meta {
    font-size: 0.85rem;
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    margin-bottom: 1rem;
    display: flex;
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
