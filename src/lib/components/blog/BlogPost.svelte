<script lang="ts">
  import type { Post, RelatedPost } from '$lib/blog';
  import { postOgImage } from '$lib/blog';
  import { goto } from '$app/navigation';
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import SeoHead from '$lib/components/seo/SeoHead.svelte';
  import { AUTHOR } from '$lib/seo/author';
  import { SITE_URL, absoluteUrl, localizePath } from '$lib/i18n/routing';
  import { familiaDeCta, type CtaFamilia } from '$lib/blog-cta';

  let { post, related = [] }: { post: Post; related?: RelatedPost[] } = $props();

  /**
   * La llamada a la acción, según de qué hable el post.
   *
   * Había una sola para los 42, y le pedía rebalancear su cartera a quien llegaba
   * buscando **qué fondo comprar** — que es de dónde viene la mayor parte del tráfico
   * (~1.020 impresiones de 3.700, medido el 11-ago-2026). Alguien así no tiene cartera
   * todavía: la oferta correcta es la cartera de ejemplo, no un cálculo sobre nada.
   *
   * ⚠️ El botón sigue apuntando a la **landing**, no a `/dashboard`, y eso no es un
   * descuido: el guardián del dashboard rebota a quien no tiene sesión ni posiciones, así
   * que un enlace directo devolvería al lector a la landing dando un salto de más. Además
   * el botón de la cartera de ejemplo vive allí.
   *
   * Qué familia toca lo decide `$lib/blog-cta` a partir de las etiquetas que el post ya
   * trae; aquí solo vive el texto, que es lo propio del componente.
   */
  const CTA_COPY: Record<'es' | 'en', Record<CtaFamilia, { ctaTitle: string; ctaDesc: string; ctaBtn: string }>> = {
    es: {
      importar: {
        ctaTitle: '¿Y si dejas de pelearte con la hoja de cálculo?',
        ctaDesc:
          'Sube el CSV de tu bróker y CoreBalance reconstruye tus posiciones, su coste medio y lo que llevas ganado. Gratis, sin registro y sin que tus datos salgan del navegador.',
        ctaBtn: 'Importar mi cartera'
      },
      fiscalidad: {
        ctaTitle: '¿Cuánto te costaría rebalancear vendiendo?',
        ctaDesc:
          'CoreBalance compara las dos vías con tus números: traspasar entre fondos con diferimiento fiscal, o vender y tributar. Con FIFO, los tramos del ahorro y la regla de los dos meses.',
        ctaBtn: 'Calcular mi traspaso'
      },
      comparar: {
        ctaTitle: '¿Sabes cuánto se solapan los fondos que estás comparando?',
        ctaDesc:
          'Dos fondos distintos pueden apuntar a las mismas empresas. CoreBalance te enseña qué hay dentro de cada uno y cuánto se pisan — pruébalo con la cartera de ejemplo, sin meter nada tuyo.',
        ctaBtn: 'Ver la cartera de ejemplo'
      },
      rebalancear: {
        ctaTitle: '¿Listo para rebalancear tu cartera?',
        ctaDesc:
          'Introduce tus fondos o ETFs, define tus porcentajes objetivo y obtén los cálculos exactos al instante. Gratis, sin registro y 100% privado en tu navegador.',
        ctaBtn: 'Probar calculadora gratis'
      }
    },
    en: {
      importar: {
        ctaTitle: 'Done fighting with the spreadsheet?',
        ctaDesc:
          "Upload your broker's CSV and CoreBalance rebuilds your positions, their average cost and what you have actually gained. Free, no signup, and your data never leaves the browser.",
        ctaBtn: 'Import my portfolio'
      },
      fiscalidad: {
        ctaTitle: 'What would rebalancing by selling actually cost you?',
        ctaDesc:
          'CoreBalance compares both routes with your own numbers: transferring between funds with tax deferral, or selling and paying. With FIFO, the savings brackets and the wash-sale window.',
        ctaBtn: 'Calculate my transfer'
      },
      comparar: {
        ctaTitle: 'Do you know how much the funds you are comparing overlap?',
        ctaDesc:
          'Two different funds can point at the same companies. CoreBalance shows what is inside each one and how much they overlap — try it on the example portfolio, without entering anything of yours.',
        ctaBtn: 'See the example portfolio'
      },
      rebalancear: {
        ctaTitle: 'Ready to rebalance your portfolio?',
        ctaDesc:
          'Enter your funds or ETFs, set your target percentages, and get the exact calculation instantly. Free, no signup required, and 100% private in your browser.',
        ctaBtn: 'Try free calculator'
      }
    }
  };

  // El idioma lo manda el propio post, no el store global: un post en inglés se
  // prerenderiza en build (sin cookie → locale 'es') y antes eso hacía que el
  // HTML servido a Googlebot llevara la interfaz en español sobre texto inglés.
  const currentLang = $derived(post.lang);
  const isEs = $derived(currentLang === 'es');

  const t = $derived({
    back: isEs ? 'Volver al blog' : 'Back to blog',
    breadcrumbHome: isEs ? 'Inicio' : 'Home',
    breadcrumbBlog: 'Blog',
    ...CTA_COPY[isEs ? 'es' : 'en'][familiaDeCta(post.tags)],
    readTime: (min: number) => (isEs ? `${min} min de lectura` : `${min} min read`),
    authorPrefix: isEs ? 'Por' : 'By',
    updatedOn: isEs ? 'Actualizado el' : 'Updated on',
    relatedTitle: isEs ? 'Seguir leyendo' : 'Keep reading',
    relatedSubtitle: isEs
        ? 'Artículos relacionados con este tema'
        : 'Articles related to this topic',
    summaryTitle: isEs ? 'Resumen rápido' : 'Quick summary'
  });

  // Antes estaba cableado a "3 min"; ahora lo calcula en build el plugin remark
  // de svelte.config.js a partir del texto real del artículo.
  const readingMinutes = $derived(post.readingMinutes ?? 3);

  /** Sólo mostramos "actualizado" si de verdad es posterior a la publicación. */
  const wasUpdated = $derived(
    Boolean(post.updatedDate) && post.updatedDate !== post.publishDate
  );

  const homePath = $derived(localizePath('/', currentLang));
  const blogPath = $derived(localizePath('/blog', currentLang));
  const postUrl = $derived(absoluteUrl(`/blog/${post.slug}`));
  const ogImage = $derived(postOgImage(post));

  function formatPostDate(dateStr: string) {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(isEs ? 'es-ES' : 'en-US', options);
  }

  /**
   * FAQPage cuando el artículo tiene de verdad una sección de preguntas (dos o
   * más). Las parejas las extrae en build el plugin remark, así que el schema no
   * puede desincronizarse del texto visible, que es justo lo que Google penaliza.
   *
   * Nota: desde 2023 Google sólo muestra el rich result de FAQ a sitios
   * gubernamentales y sanitarios, así que esto ya no decora la SERP. Sigue
   * mereciendo la pena porque Bing lo usa y los buscadores generativos leen las
   * parejas pregunta/respuesta para citar la respuesta directa.
   */
  const faqSchema = $derived(
    (post.faq?.length ?? 0) >= 2
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'inLanguage': post.lang,
          'mainEntity': post.faq!.map((entry) => ({
            '@type': 'Question',
            'name': entry.question,
            'acceptedAnswer': { '@type': 'Answer', 'text': entry.answer }
          }))
        }
      : null
  );

  // Generamos el schema JSON-LD de Article y Breadcrumb
  const jsonLd = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': post.title,
      'description': post.description,
      // El resumen también en el schema: es la respuesta corta que un motor
      // generativo puede citar sin tener que resumir el artículo por su cuenta.
      ...(post.summary?.length ? { 'abstract': post.summary.join(' ') } : {}),
      'image': `${SITE_URL}${ogImage}`,
      'datePublished': post.publishDate,
      'dateModified': post.updatedDate || post.publishDate,
      'inLanguage': post.lang,
      'wordCount': post.wordCount,
      'timeRequired': `PT${readingMinutes}M`,
      'author': {
        '@type': 'Person',
        '@id': `${SITE_URL}${AUTHOR.path}#person`,
        'name': post.author,
        'url': absoluteUrl(localizePath(AUTHOR.path, currentLang))
      },
      'publisher': {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#org`,
        'name': 'CoreBalance',
        'logo': { '@type': 'ImageObject', 'url': `${SITE_URL}/logo.png` }
      },
      'mainEntityOfPage': { '@type': 'WebPage', '@id': postUrl }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': t.breadcrumbHome, 'item': absoluteUrl(homePath) },
        { '@type': 'ListItem', 'position': 2, 'name': t.breadcrumbBlog, 'item': absoluteUrl(blogPath) },
        { '@type': 'ListItem', 'position': 3, 'name': post.title, 'item': postUrl }
      ]
    },
    ...(faqSchema ? [faqSchema] : [])
  ]);

  const Content = $derived(post.content);
</script>

<!--
  ⚠️ El título va **sin** sufijo « | CoreBalance», y es un cambio medido, no estético.

  Ese sufijo costaba 14 caracteres en cada uno de los 42 posts, sobre un presupuesto de
  ~60 que Google trunca: 20 de los 27 títulos que `npm run seo:audit` marcaba como
  truncados lo estaban **solo** por él. Y no aportaba marca, porque Google ya pinta el
  dominio encima del título en el resultado — era la misma información dos veces, pagada
  con la parte del título que sí responde a la consulta.

  Medido el 11-ago-2026 en Search Console (3 meses): la consulta «corebalance» son 21
  impresiones de 3.700. No hay marca que proteger todavía; sí hay títulos que truncar.

  Las páginas que NO son del blog conservan su sufijo: ahí el título es de producto y la
  marca sí es lo que se busca.
-->
<SeoHead
  title={post.title}
  description={post.description}
  path={`/blog/${post.slug}`}
  lang={currentLang}
  image={ogImage}
  ogType="article"
  bilingual={false}
  altEs={post.slugs?.es ? absoluteUrl(`/blog/${post.slugs.es}`) : null}
  altEn={post.slugs?.en ? absoluteUrl(`/blog/${post.slugs.en}`) : null}
  jsonLd={jsonLd}
/>

<div class="blog-post-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto(homePath)} />

  <main class="post-container">
    <!-- Breadcrumb de navegación -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href={homePath}>{t.breadcrumbHome}</a>
      <span class="separator">/</span>
      <a href={blogPath}>{t.breadcrumbBlog}</a>
      <span class="separator">/</span>
      <span class="current" aria-current="page">{post.title}</span>
    </nav>

    <article class="post-article">
      <header class="post-header">
        <div class="post-meta">
          <time datetime={post.publishDate}>{formatPostDate(post.publishDate)}</time>
          <span class="separator-dot">·</span>
          <span>{t.readTime(readingMinutes)}</span>
          <span class="separator-dot">·</span>
          <span class="author">
            {t.authorPrefix}
            <a href={localizePath(AUTHOR.path, currentLang)} rel="author">{post.author}</a>
          </span>
        </div>

        <h1 class="post-title">{post.title}</h1>

        {#if wasUpdated}
          <!-- Visible, no sólo en el schema: la frescura que se ve es la que
               premian tanto Google como los buscadores generativos. -->
          <p class="post-updated">
            {t.updatedOn} <time datetime={post.updatedDate}>{formatPostDate(post.updatedDate)}</time>
          </p>
        {/if}

        <div class="post-tags">
          {#each post.tags as tag}
            <span class="tag-badge">#{tag}</span>
          {/each}
        </div>
      </header>

      {#if post.summary?.length}
        <!-- Resumen answer-first: es el primer bloque que responde directo a la
             pregunta del artículo, que es justo lo que citan los buscadores
             generativos. -->
        <aside class="post-summary" aria-labelledby="summary-heading">
          <h2 id="summary-heading">{t.summaryTitle}</h2>
          <ul>
            {#each post.summary as point}
              <li>{point}</li>
            {/each}
          </ul>
        </aside>
      {/if}

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
          <button class="btn-cta" onclick={() => goto(homePath)}>
            {t.ctaBtn}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="cta-arrow">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </section>
    </article>

    {#if related.length > 0}
      <section class="related" aria-labelledby="related-heading">
        <h2 id="related-heading">{t.relatedTitle}</h2>
        <p class="related-subtitle">{t.relatedSubtitle}</p>
        <ul class="related-grid">
          {#each related as item}
            <li>
              <a class="related-card" href={`/blog/${item.slug}`}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span class="related-meta">{t.readTime(item.readingMinutes ?? 3)}</span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <div class="post-back-nav">
      <a href={blogPath} class="btn-back">
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
    color: var(--text-primary);
  }

  .breadcrumb .separator {
    color: var(--text-faint);
  }

  .breadcrumb .current {
    color: var(--text-primary);
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
    color: var(--text-faint);
  }

  .post-title {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1.25;
    margin: 0 0 1.5rem;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .post-title {
      font-size: 1.85rem;
    }
  }

  .post-meta .author a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: rgba(255, 255, 255, 0.2);
    text-underline-offset: 3px;
  }

  .post-meta .author a:hover {
    color: var(--text-primary);
    text-decoration-color: var(--accent-blue);
  }

  .post-updated {
    font-size: 0.85rem;
    color: rgba(16, 185, 129, 0.85);
    margin: -0.75rem 0 1.5rem;
    font-weight: 600;
  }

  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  /* ── Posts relacionados ─────────────────────────────────── */
  .related {
    margin-bottom: 3rem;
  }

  .related h2 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 0.35rem;
    letter-spacing: -0.02em;
  }

  .related-subtitle {
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    font-size: 0.9rem;
    margin: 0 0 1.5rem;
  }

  .related-grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }

  .related-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 0.5rem;
    padding: 1.25rem;
    border-radius: 16px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-card);
    text-decoration: none;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .related-card:hover {
    transform: translateY(-3px);
    border-color: rgba(139, 92, 246, 0.25);
    background: var(--bg-card);
  }

  .related-card h3 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.4;
  }

  .related-card p {
    font-size: 0.85rem;
    line-height: 1.55;
    color: var(--text-muted);
    margin: 0;
    flex-grow: 1;
  }

  .related-meta {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent-violet-ink);
  }

  .tag-badge {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--accent-blue-ink);
    background: rgba(59, 130, 246, 0.1);
    padding: 0.3rem 0.75rem;
    border-radius: 9999px;
  }

  /* ── Resumen rápido (TL;DR) ─────────────────────────────── */
  .post-summary {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.07) 0%, rgba(59, 130, 246, 0.04) 100%);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 16px;
    padding: 1.5rem 1.75rem;
    margin-bottom: 2.5rem;
  }

  .post-summary h2 {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--state-positive);
    margin: 0 0 1rem;
  }

  .post-summary ul {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .post-summary li {
    color: var(--text-primary);
    line-height: 1.65;
    font-size: 1rem;
  }

  .post-summary li::marker {
    color: rgba(52, 211, 153, 0.7);
  }

  @media (max-width: 768px) {
    .post-summary {
      padding: 1.25rem 1.35rem;
    }

    .post-summary li {
      font-size: 0.95rem;
    }
  }

  .markdown-body {
    line-height: 1.8;
    font-size: 1.1rem;
    color: var(--text-secondary);
  }

  .markdown-body :global(p) { margin-bottom: 1.5rem; }
  .markdown-body :global(h2) { font-size: 1.6rem; font-weight: 700; margin: 2.5rem 0 1rem; color: var(--text-primary); }
  .markdown-body :global(h3) { font-size: 1.3rem; font-weight: 700; margin: 2rem 0 1rem; color: var(--text-primary); }
  .markdown-body :global(ul) { padding-left: 1.5rem; margin-bottom: 1.5rem; }
  .markdown-body :global(a) { color: var(--accent-blue-ink); text-decoration: underline; font-weight: 600; }

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
    background: var(--accent-blue);
    color: var(--text-on-accent);
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
  .btn-back:hover { color: var(--text-primary); }
</style>
