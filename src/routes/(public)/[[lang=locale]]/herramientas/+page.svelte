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
      ? 'Herramientas gratis para el inversor indexado | CoreBalance'
      : 'Free tools for index investors | CoreBalance'
  );
  const metaDesc = $derived(
    isEs
      ? 'Cuatro calculadoras gratis y sin registro para inversión indexada: TER de tu cartera, si toca rebalancear, cuánto caerías en una crisis y tu precio medio.'
      : 'Four free, no-sign-up calculators for index investing: your portfolio TER, whether it is time to rebalance, crash recovery and your average price.'
  );

  /** Las cuatro herramientas, en el orden en que le sirven a alguien que empieza. */
  const tools = $derived([
    {
      path: '/herramientas/calculadora-ter',
      badge: isEs ? 'Costes' : 'Costs',
      name: isEs ? 'Calculadora de TER' : 'TER Calculator',
      question: isEs ? '¿Cuánto me cuestan mis fondos de verdad?' : 'What do my funds really cost me?',
      body: isEs
        ? 'Calcula el TER medio ponderado de tu cartera y proyecta a 40 años cuántos euros se llevan las comisiones. Sirve para decidir entre dos fondos que se diferencian en un 0,10% aparentemente inocente.'
        : 'Works out the weighted average TER of your portfolio and projects, over 40 years, how many euros fees take away. Useful for choosing between two funds separated by a seemingly innocent 0.10%.',
      accent: 'var(--accent-blue)'
    },
    {
      path: '/herramientas/checklist-rebalanceo',
      badge: isEs ? 'Decisión' : 'Decision',
      name: isEs ? '¿Toca rebalancear?' : 'Is it time to rebalance?',
      question: isEs ? '¿Muevo ficha ahora o espero?' : 'Do I act now or wait?',
      body: isEs
        ? 'Cuatro preguntas —desviación, tiempo desde el último ajuste, coste fiscal y comisiones— y un veredicto. Pensada para el momento en que ves la cartera torcida y no sabes si el arreglo cuesta más que el problema.'
        : 'Four questions — drift, time since your last adjustment, tax cost and fees — and a verdict. Built for the moment you see your portfolio skewed and cannot tell whether the fix costs more than the problem.',
      accent: 'var(--accent-green)'
    },
    {
      path: '/herramientas/simulador-crisis',
      badge: isEs ? 'Riesgo' : 'Risk',
      name: isEs ? 'Simulador de crisis' : 'Crash simulator',
      question: isEs ? '¿Cuánto aguantaría yo una caída así?' : 'Could I actually sit through a drop like that?',
      body: isEs
        ? 'Aplica caídas históricas reales sobre tu capital —la burbuja de 2000 (−49%), Lehman en 2008 (−56%), el COVID de 2020 (−34%)— y estima cuánto tardarías en recuperarte, con y sin aportaciones. Es una herramienta de comportamiento, no de predicción.'
        : 'Applies real historical crashes to your capital — the 2000 bubble (−49%), Lehman in 2008 (−56%), COVID in 2020 (−34%) — and estimates how long recovery would take, with and without contributions. It is a behavioural tool, not a forecast.',
      accent: 'var(--accent-orange)'
    },
    {
      path: '/herramientas/calculadora-precio-medio',
      badge: isEs ? 'Contabilidad' : 'Accounting',
      name: isEs ? 'Calculadora de precio medio' : 'Average price calculator',
      question: isEs ? '¿A qué precio tengo esto realmente?' : 'What did I really pay for this?',
      body: isEs
        ? 'Precio medio ponderado de compra a partir de tus operaciones, contando ventas, dividendos y comisiones. Para quien lleva años aportando a plazos y ya perdió la cuenta de su coste real.'
        : 'Weighted average purchase price from your own transactions, counting sells, dividends and fees. For anyone who has been contributing for years and lost track of their real cost basis.',
      accent: 'var(--accent-blue)'
    }
  ]);

  const schemaData = $derived({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isEs ? 'Inicio' : 'Home', item: homeUrl },
          { '@type': 'ListItem', position: 2, name: isEs ? 'Herramientas' : 'Tools', item: canonical }
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
          numberOfItems: tools.length,
          itemListElement: tools.map((tool, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: tool.name,
            description: tool.question,
            url: absoluteUrl(localizePath(tool.path, lang))
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
  image={pageOgImage('herramientas', lang)}
  jsonLd={schemaData}
/>

<div class="hub-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto($link('/'))} />

  <main class="hub-container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href={$link('/')}>{isEs ? 'Inicio' : 'Home'}</a>
      <span class="separator">/</span>
      <span class="current" aria-current="page">{isEs ? 'Herramientas' : 'Tools'}</span>
    </nav>

    <header class="hub-header">
      <span class="category-badge">{isEs ? 'Herramientas interactivas' : 'Interactive tools'}</span>
      <h1 class="gradient-text">
        {isEs ? 'Herramientas gratis para el inversor indexado' : 'Free tools for index investors'}
      </h1>
      <p class="hub-lead">
        {isEs
          ? 'Invertir en indexados es sencillo de explicar y difícil de sostener. Lo que se lleva la rentabilidad a largo plazo casi nunca es la elección del índice: son las comisiones que no miraste, el peaje fiscal de un rebalanceo mal cronometrado y la venta en el peor mes de una caída.'
          : 'Index investing is simple to explain and hard to sustain. What eats long-term returns is almost never the choice of index: it is the fees you never checked, the tax toll of a badly timed rebalance, and selling in the worst month of a drawdown.'}
      </p>
      <p class="hub-lead">
        {isEs
          ? 'Estas cuatro herramientas atacan cada una de esas decisiones y responden a una sola pregunta. Son gratuitas, no piden registro y calculan en tu navegador: ningún dato que escribas sale de tu dispositivo.'
          : 'These four tools take on one of those decisions each, and answer a single question. They are free, ask for no sign-up, and run in your browser: nothing you type leaves your device.'}
      </p>
    </header>

    <div class="tools-grid">
      {#each tools as tool}
        <a class="tool-card" href={$link(tool.path)} style="--card-accent: {tool.accent}">
          <span class="tool-badge">{tool.badge}</span>
          <h2 class="tool-name">{tool.name}</h2>
          <p class="tool-question">{tool.question}</p>
          <p class="tool-body">{tool.body}</p>
          <span class="tool-cta">{isEs ? 'Abrir herramienta →' : 'Open tool →'}</span>
        </a>
      {/each}
    </div>

    <section class="hub-note">
      <h2>{isEs ? '¿Por qué gratis y sin registro?' : 'Why free and with no sign-up?'}</h2>
      <p>
        {isEs
          ? 'Porque una calculadora que te pide el correo antes de darte un número no es una calculadora, es un formulario. Ninguna de estas herramientas guarda lo que escribes ni lo envía a un servidor, y no hay versión de pago detrás. Si quieres llevar el seguimiento completo de tu cartera —con tu libro de operaciones, precios en vivo y el reparto exacto de cada aportación— eso es la app, y también es gratis.'
          : 'Because a calculator that asks for your email before giving you a number is not a calculator, it is a form. None of these tools store what you type or send it to a server, and there is no paid tier behind them. If you want full portfolio tracking — your transaction ledger, live prices and the exact split of every contribution — that is the app, and it is free too.'}
      </p>
      <button class="btn-primary" onclick={() => goto($link('/'))}>
        {isEs ? 'Ver la calculadora de rebalanceo' : 'See the rebalancing calculator'}
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
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.25);
    color: var(--accent-blue);
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

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.25rem;
    margin-bottom: 4rem;
  }

  .tool-card {
    display: flex;
    flex-direction: column;
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

  .tool-card:hover {
    transform: translateY(-4px);
    border-color: var(--card-accent);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  }

  .tool-badge {
    align-self: flex-start;
    padding: 0.25rem 0.6rem;
    border-radius: 8px;
    background: color-mix(in srgb, var(--card-accent) 12%, transparent);
    color: var(--card-accent);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 1rem;
  }

  .tool-name {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.4rem;
    letter-spacing: -0.01em;
  }

  .tool-question {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--card-accent);
    margin: 0 0 0.9rem;
  }

  .tool-body {
    font-size: 0.9rem;
    line-height: 1.65;
    color: var(--text-muted);
    margin: 0 0 1.5rem;
    flex-grow: 1;
  }

  .tool-cta {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--card-accent);
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

    .tool-card {
      padding: 1.5rem;
    }
  }
</style>
