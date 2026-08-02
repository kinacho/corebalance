<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import SeoHead from '$lib/components/seo/SeoHead.svelte';
  import { pageOgImage } from '$lib/seo/og';
  import { link } from '$lib/i18n/link';
  import { alternates, SITE_URL, localizePath, absoluteUrl } from '$lib/i18n/routing';
  import type { Locales } from '$lib/i18n/i18n-types';

  const lang = $derived(($page.data.locale ?? 'es') as Locales);
  let isEs = $derived(lang === 'es');
  const canonical = $derived(alternates($page.url.pathname, lang).canonical);
  const homeUrl = $derived(absoluteUrl(localizePath('/', lang)));

  const metaTitle = $derived(
    isEs
      ? 'CoreBalance frente a otras herramientas de cartera | Comparativas'
      : 'CoreBalance versus other portfolio tools | Comparisons'
  );
  const metaDesc = $derived(
    isEs
      ? 'CoreBalance frente a Excel, Indexa Capital, Portfolio Performance, JustETF y Ghostfolio: qué hace mejor cada uno y cuándo no somos la opción.'
      : 'CoreBalance versus Excel, Indexa Capital, Portfolio Performance, JustETF and Ghostfolio: what each does better, and when we are not the choice.'
  );

  const comparisons = $derived([
    {
      path: '/comparativas/corebalance-vs-excel',
      rival: isEs ? 'Excel / Google Sheets' : 'Excel / Google Sheets',
      kind: isEs ? 'Hoja de cálculo' : 'Spreadsheet',
      body: isEs
        ? 'La hoja de cálculo gana en flexibilidad absoluta: puedes modelar cualquier cosa. Pierde en que hay que mantenerla, las fórmulas de precios se rompen cuando cambia la fuente de datos y un error de referencia no avisa.'
        : 'A spreadsheet wins on sheer flexibility: you can model anything. It loses because you have to maintain it, price formulas break when the data source changes, and a bad cell reference never warns you.',
      verdict: isEs ? 'Elige Excel si quieres control total del modelo' : 'Pick Excel if you want total control of the model'
    },
    {
      path: '/comparativas/corebalance-vs-indexa-capital',
      rival: 'Indexa Capital',
      kind: isEs ? 'Robo-advisor' : 'Robo-advisor',
      body: isEs
        ? 'Un robo-advisor gestiona el dinero por ti y rebalancea solo, a cambio de una comisión anual sobre el patrimonio. CoreBalance no gestiona nada: calcula y tú ejecutas en tu bróker, así que no hay comisión de gestión, pero tampoco piloto automático.'
        : 'A robo-advisor manages the money for you and rebalances on its own, in exchange for an annual fee on assets. CoreBalance manages nothing: it calculates and you execute at your broker, so there is no management fee — but no autopilot either.',
      verdict: isEs ? 'Elige Indexa si prefieres delegar y no tocar nada' : 'Pick Indexa if you would rather delegate and not touch anything'
    },
    {
      path: '/comparativas/corebalance-vs-portfolio-performance',
      rival: 'Portfolio Performance',
      kind: isEs ? 'App de escritorio' : 'Desktop app',
      body: isEs
        ? 'Es probablemente el analizador de carteras más potente que existe gratis, con TIR real, contabilidad por divisas y unos informes que ninguna web iguala. El precio es la curva de aprendizaje y que vive en un escritorio, no en el móvil.'
        : 'Probably the most powerful free portfolio analyser out there, with true money-weighted returns, multi-currency accounting and reporting no web app matches. The price is the learning curve, and that it lives on a desktop rather than your phone.',
      verdict: isEs ? 'Elige Portfolio Performance si quieres análisis profundo' : 'Pick Portfolio Performance if you want deep analysis'
    },
    {
      path: '/comparativas/corebalance-vs-justetf',
      rival: 'JustETF',
      kind: isEs ? 'Buscador de ETFs' : 'ETF screener',
      body: isEs
        ? 'JustETF es el mejor sitio de Europa para *encontrar* un ETF: filtros por réplica, domicilio, tamaño y coste. Su seguimiento de carteras es secundario y la parte buena está tras un plan de pago.'
        : 'JustETF is the best place in Europe to *find* an ETF: filters by replication method, domicile, size and cost. Its portfolio tracking is secondary, and the good part sits behind a paid plan.',
      verdict: isEs ? 'Elige JustETF para escoger los fondos; vuelve aquí para repartir la aportación' : 'Use JustETF to choose the funds; come back here to split the contribution'
    },
    {
      path: '/comparativas/corebalance-vs-ghostfolio',
      rival: 'Ghostfolio',
      kind: isEs ? 'Código abierto autoalojable' : 'Self-hosted open source',
      body: isEs
        ? 'Ghostfolio es el planteamiento más cercano al nuestro en filosofía: código abierto y privacidad primero. La diferencia es operativa: Ghostfolio se autoaloja, con su servidor y su base de datos, y CoreBalance no necesita instalar nada.'
        : 'Ghostfolio is the closest thing to us in philosophy: open source and privacy first. The difference is operational: Ghostfolio is self-hosted, with your own server and database, while CoreBalance needs nothing installed.',
      verdict: isEs ? 'Elige Ghostfolio si quieres tus datos en tu propio servidor' : 'Pick Ghostfolio if you want your data on your own server'
    }
  ]);

  const schemaData = $derived({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isEs ? 'Inicio' : 'Home', item: homeUrl },
          { '@type': 'ListItem', position: 2, name: isEs ? 'Comparativas' : 'Comparisons', item: canonical }
        ]
      },
      {
        '@type': 'CollectionPage',
        name: metaTitle,
        description: metaDesc,
        url: canonical,
        inLanguage: lang,
        isPartOf: { '@type': 'WebSite', name: 'CoreBalance', url: SITE_URL },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: comparisons.length,
          itemListElement: comparisons.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `CoreBalance vs ${item.rival}`,
            description: item.verdict,
            url: absoluteUrl(localizePath(item.path, lang))
          }))
        }
      }
    ]
  });
</script>

<SeoHead
  title={metaTitle}
  description={metaDesc}
  path={$page.url.pathname}
  {lang}
  image={pageOgImage('comparativas', lang)}
  jsonLd={schemaData}
/>

<div class="hub-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto($link('/'))} />

  <main class="hub-container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href={$link('/')}>{isEs ? 'Inicio' : 'Home'}</a>
      <span class="separator">/</span>
      <span class="current" aria-current="page">{isEs ? 'Comparativas' : 'Comparisons'}</span>
    </nav>

    <header class="hub-header">
      <span class="category-badge">{isEs ? 'Comparativas' : 'Comparisons'}</span>
      <h1 class="gradient-text">
        {isEs ? 'CoreBalance frente a las alternativas' : 'CoreBalance versus the alternatives'}
      </h1>
      <p class="hub-lead">
        {isEs
          ? 'Casi ninguna de estas herramientas compite de verdad con las otras: una hoja de cálculo, un robo-advisor, un analizador de escritorio, un buscador de ETFs y un proyecto autoalojable resuelven problemas distintos que se parecen desde fuera.'
          : 'Almost none of these tools truly competes with the others: a spreadsheet, a robo-advisor, a desktop analyser, an ETF screener and a self-hosted project solve different problems that look alike from the outside.'}
      </p>
      <p class="hub-lead">
        {isEs
          ? 'Estas cinco comparativas dicen dónde encaja CoreBalance y, sobre todo, cuándo no es la opción correcta. Una comparativa en la que el autor siempre gana no sirve para decidir.'
          : 'These five comparisons say where CoreBalance fits and, above all, when it is not the right choice. A comparison where the author always wins is useless for making a decision.'}
      </p>
    </header>

    <div class="compare-list">
      {#each comparisons as item}
        <a class="compare-card" href={$link(item.path)}>
          <div class="compare-top">
            <h2 class="compare-title">CoreBalance <span class="vs">vs</span> {item.rival}</h2>
            <span class="compare-kind">{item.kind}</span>
          </div>
          <p class="compare-body">{item.body}</p>
          <p class="compare-verdict">{item.verdict}</p>
          <span class="compare-cta">{isEs ? 'Leer la comparativa →' : 'Read the comparison →'}</span>
        </a>
      {/each}
    </div>

    <section class="hub-note">
      <h2>{isEs ? 'Cómo están hechas estas comparativas' : 'How these comparisons are built'}</h2>
      <p>
        {isEs
          ? 'Cada una compara por dimensiones concretas —coste, privacidad, esfuerzo de mantenimiento, fiscalidad española, plataforma— y no por una puntuación global, porque una nota única esconde justo lo que importa: que la herramienta que gana para un inversor pierde para otro. Cuando la alternativa hace algo mejor, lo dice.'
          : 'Each one compares along concrete dimensions — cost, privacy, maintenance effort, Spanish taxation, platform — rather than an overall score, because a single grade hides exactly what matters: the tool that wins for one investor loses for another. Where the alternative does something better, it says so.'}
      </p>
      <button class="btn-primary" onclick={() => goto($link('/'))}>
        {isEs ? 'Probar CoreBalance gratis' : 'Try CoreBalance free'}
      </button>
    </section>
  </main>

  <LandingFooter />
</div>

<style>
  .hub-page {
    position: relative;
    min-height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
    overflow-x: hidden;
  }

  .hub-container {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1.5rem 5rem;
  }

  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 2.5rem;
  }

  .breadcrumb a {
    color: var(--text-muted);
    text-decoration: none;
  }

  .breadcrumb a:hover {
    color: var(--accent-blue);
  }

  .breadcrumb .separator {
    opacity: 0.4;
  }

  .breadcrumb .current {
    color: var(--text-primary);
  }

  .hub-header {
    max-width: 760px;
    margin-bottom: 3.5rem;
  }

  .category-badge {
    display: inline-block;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.25);
    color: #a855f7;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 1.25rem;
  }

  h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
    margin: 0 0 1.5rem;
  }

  .hub-lead {
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--text-muted);
    margin: 0 0 1rem;
  }

  .compare-list {
    display: grid;
    gap: 1.25rem;
    margin-bottom: 4rem;
  }

  .compare-card {
    display: block;
    padding: 1.75rem;
    border-radius: 18px;
    background: var(--bg-card);
    border: 1px solid rgba(255, 255, 255, 0.07);
    text-decoration: none;
    color: inherit;
    transition:
      transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .compare-card:hover {
    transform: translateY(-3px);
    border-color: rgba(168, 85, 247, 0.5);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  }

  .compare-top {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.9rem;
  }

  .compare-title {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .compare-title .vs {
    color: #a855f7;
    font-weight: 800;
  }

  .compare-kind {
    padding: 0.25rem 0.6rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-muted);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  .compare-body {
    font-size: 0.92rem;
    line-height: 1.7;
    color: var(--text-muted);
    margin: 0 0 0.9rem;
  }

  .compare-verdict {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1.25rem;
    padding-left: 0.85rem;
    border-left: 3px solid #a855f7;
  }

  .compare-cta {
    font-size: 0.85rem;
    font-weight: 700;
    color: #a855f7;
  }

  .hub-note {
    max-width: 760px;
    padding: 2rem;
    border-radius: 18px;
    background: var(--bg-card);
    border: 1px solid rgba(255, 255, 255, 0.07);
  }

  .hub-note h2 {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0 0 1rem;
    letter-spacing: -0.01em;
  }

  .hub-note p {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--text-muted);
    margin: 0 0 1.5rem;
  }

  @media (max-width: 640px) {
    .hub-container {
      padding: 1.5rem 1rem 4rem;
    }

    .compare-card {
      padding: 1.5rem;
    }
  }
</style>
