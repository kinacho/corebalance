<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import RelatedReading from '$lib/components/blog/RelatedReading.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import SeoHead from '$lib/components/seo/SeoHead.svelte';
  import { pageOgImage } from '$lib/seo/og';
  import { link } from '$lib/i18n/link';
  import { absoluteUrl, localizePath } from '$lib/i18n/routing';
  import type { Locales } from '$lib/i18n/i18n-types';

  // El idioma sale de la URL (lo resuelve el layout del grupo), no del store
  // global: así el HTML prerenderizado de /en/... sale de verdad en inglés.
  let { data } = $props<{ data: { relatedReading: import('$lib/seo/related-reading').ReadingItem[] } }>();
  const lang = $derived(($page.data.locale ?? 'es') as Locales);

  const metaTitle = $derived(lang === 'en'
    ? 'Stock Market Crash Simulator | CoreBalance'
    : 'Simulador de Crisis Bursátil | CoreBalance'
  );
  const metaDesc = $derived(lang === 'en'
    ? 'Simulate how a crash like 2000, 2008 or 2020 would hit your portfolio, and how many months it would take to recover — with and without contributions.'
    : 'Simula gratis cuánto caería tu cartera en una crisis como la de 2000, 2008 o 2020 y estima cuántos meses tardarías en recuperarte, con y sin aportaciones mensuales.'
  );

  const t = $derived(lang === 'en' ? {
    badge: 'Interactive Tool',
    breadcrumb: { home: 'Home', tools: 'Tools', tool: 'Crash Simulator' },
    title: 'Stock Market Crash Simulator',
    subtitle: 'See what a historic crash would do to your portfolio today — and how long recovery would take if you keep contributing versus doing nothing.',
    panelTitle: '1. Your Scenario',
    labelCapital: 'Current Capital (€)',
    labelMonthly: 'Monthly Contribution (€)',
    labelReturn: 'Est. Annual Return (%)',
    labelDrop: 'Market Drop (%)',
    scenariosTitle: 'Historic scenarios',
    customLabel: 'Or set a custom drop',
    scenarios: [
      { name: 'DotCom (2000)', drop: 49, emoji: '💻', desc: 'The tech bubble deflated slowly: the fall stretched over more than two years instead of arriving as a single shock.' },
      { name: 'Lehman (2008)', drop: 56, emoji: '🏦', desc: 'The global financial crisis. The deepest drawdown of the modern era for a diversified equity portfolio.' },
      { name: 'COVID-19 (2020)', drop: 34, emoji: '🦠', desc: 'The fastest crash in history: roughly a third of the market\'s value gone in a few weeks.' }
    ],
    resultTitle: 'Value After the Drop',
    resultDesc: (loss: string) => `Unrealized loss: −${loss} €`,
    recoveryTitle: '2. Estimated Recovery',
    recoveryNote: (capital: string) => `Recovery means getting back to your initial ${capital} €. Monthly compounding at your expected return.`,
    rowNoDca: 'Without contributions:',
    rowWithDca: (dca: string) => `Contributing ${dca} €/month:`,
    rowSaved: 'Time saved by contributing:',
    months: (m: number) => `${m} months`,
    approxYears: (y: string) => `≈ ${y} yrs`,
    never: 'Over 50 years',
    eduTitle: 'Why simulate a crash before living through one',
    eduP1: 'The point of this simulator is not to predict the next crisis or to time the market — nobody can do that reliably. It is behavioral preparation: investors who have already seen, in cold numbers, what a −50% does to their portfolio are far less likely to panic-sell when it happens for real. Deciding today, calmly, what you will do when your portfolio is deep in the red is one of the cheapest insurances a passive investor can buy.',
    eduP2: 'If the number you see after the drop makes you feel sick, that is useful information: your asset allocation may be more aggressive than your real risk tolerance, and it is much better to fix that now than in the middle of a crash.',
    historyTitle: 'What markets actually did in 2000, 2008 and 2020',
    historyP: 'These are rough, approximate figures for global/US equities — the exact numbers depend on the index, the currency and whether you count dividends:',
    historyItems: [
      { strong: 'DotCom (2000):', text: 'a drop of roughly half the market\'s value, unfolding over about two to three years. Getting back to the previous peak took several more years — one of the longest recoveries on record.' },
      { strong: 'Lehman (2008):', text: 'a peak-to-trough fall of over half in around a year and a half. Recovery took on the order of four to six years, faster for investors who kept buying on the way down.' },
      { strong: 'COVID-19 (2020):', text: 'about a third of the market\'s value lost in a few weeks — and recovered within months, the fastest round trip in modern history.' }
    ],
    historyNote: 'The pattern behind all three, approximately: the deeper and slower the fall, the longer the recovery — but broad, diversified indices have always recovered eventually, while many individual companies never did.',
    q1Title: 'Should I sell if the market drops 40%?',
    q1P: 'The evidence from passive investing says no: selling after a crash converts a temporary paper loss into a permanent real one, and historically the market\'s strongest days tend to cluster right after its worst ones — missing them destroys long-term returns. The boring, evidence-backed plan is to hold your positions, keep your monthly contributions running, and rebalance back to your target allocation. This is general education about how broad indices have behaved historically, not financial advice or a personalized recommendation.',
    q2Title: 'Does it make sense to keep contributing during a crash?',
    q2P: 'Mathematically, yes — and the simulator above shows it. Contributions made during a drawdown buy at depressed prices, so every euro invested then buys more shares. That is exactly why the "with contributions" recovery is months or years shorter than the "without" one. The hard part is not the math but the behavior: automating your monthly contribution is the simplest way to make sure you actually do it when headlines are terrifying.',
    q3Title: 'How long does the stock market take to recover from a crash?',
    q3P: 'There is no fixed answer: historically it has ranged from a few months (2020) to several years (2000, 2008), and those figures are approximate and index-dependent. What you can control is the variables in this simulator — your contribution rate and your allocation. A portfolio you keep feeding recovers on your schedule, not only on the market\'s.',
    otherToolsTitle: 'Other tools',
    otherTools: [
      { path: '/herramientas/calculadora-ter', label: 'TER Calculator' },
      { path: '/herramientas/checklist-rebalanceo', label: 'Rebalancing Checklist' },
      { path: '/herramientas/calculadora-precio-medio', label: 'Average Price Calculator' }
    ],
    ctaTitle: 'Ready to prepare your portfolio before the next crash?',
    ctaDesc: 'Use CoreBalance\'s free calculator to set your target allocation and rebalance with new contributions — locally and 100% privately.',
    ctaBtn: 'Go to calculator'
  } : {
    badge: 'Herramienta Interactiva',
    breadcrumb: { home: 'Inicio', tools: 'Herramientas', tool: 'Simulador de Crisis' },
    title: 'Simulador de crisis bursátil',
    subtitle: 'Comprueba qué le haría a tu cartera un crash histórico hoy — y cuánto tardarías en recuperarte si sigues aportando frente a no hacer nada.',
    panelTitle: '1. Tu Escenario',
    labelCapital: 'Capital Actual (€)',
    labelMonthly: 'Aportación Mensual (€)',
    labelReturn: 'Rentabilidad Anual Est. (%)',
    labelDrop: 'Caída del Mercado (%)',
    scenariosTitle: 'Escenarios históricos',
    customLabel: 'O ajusta una caída personalizada',
    scenarios: [
      { name: 'DotCom (2000)', drop: 49, emoji: '💻', desc: 'La burbuja tecnológica se desinfló despacio: la caída se prolongó más de dos años en lugar de llegar como un shock único.' },
      { name: 'Lehman (2008)', drop: 56, emoji: '🏦', desc: 'La crisis financiera global. El drawdown más profundo de la era moderna para una cartera de acciones diversificada.' },
      { name: 'COVID-19 (2020)', drop: 34, emoji: '🦠', desc: 'El crash más rápido de la historia: aproximadamente un tercio del valor del mercado desapareció en unas semanas.' }
    ],
    resultTitle: 'Valor Tras la Caída',
    resultDesc: (loss: string) => `Pérdida latente: −${loss} €`,
    recoveryTitle: '2. Recuperación estimada',
    recoveryNote: (capital: string) => `Recuperarse significa volver a tus ${capital} € iniciales. Capitalización mensual a tu rentabilidad esperada.`,
    rowNoDca: 'Sin aportaciones:',
    rowWithDca: (dca: string) => `Aportando ${dca} €/mes:`,
    rowSaved: 'Tiempo ahorrado por aportar:',
    months: (m: number) => `${m} meses`,
    approxYears: (y: string) => `≈ ${y} años`,
    never: 'Más de 50 años',
    eduTitle: 'Por qué simular una crisis antes de vivirla',
    eduP1: 'El objetivo de este simulador no es predecir la próxima crisis ni hacer market timing — nadie puede hacerlo de forma fiable. Es preparación conductual: el inversor que ya ha visto, en números fríos, lo que un −50% le hace a su cartera tiene muchas menos papeletas de vender presa del pánico cuando ocurra de verdad. Decidir hoy, con calma, qué harás cuando tu cartera esté en rojo profundo es uno de los seguros más baratos que puede comprar un inversor pasivo.',
    eduP2: 'Si la cifra que ves tras la caída te revuelve el estómago, esa es información útil: tu asignación de activos puede ser más agresiva que tu tolerancia real al riesgo, y es mucho mejor corregirlo ahora que en mitad de un crash.',
    historyTitle: 'Qué hicieron realmente los mercados en 2000, 2008 y 2020',
    historyP: 'Estas cifras son aproximadas y orientativas para renta variable global/estadounidense — los números exactos dependen del índice, la divisa y de si cuentas dividendos:',
    historyItems: [
      { strong: 'DotCom (2000):', text: 'una caída de aproximadamente la mitad del valor del mercado, desarrollada durante unos dos o tres años. Volver al máximo anterior llevó varios años más — una de las recuperaciones más largas registradas.' },
      { strong: 'Lehman (2008):', text: 'una caída de máximo a mínimo de más de la mitad en alrededor de año y medio. La recuperación llevó del orden de cuatro a seis años, más rápida para quien siguió comprando durante la bajada.' },
      { strong: 'COVID-19 (2020):', text: 'alrededor de un tercio del valor del mercado perdido en unas semanas — y recuperado en cuestión de meses, la ida y vuelta más rápida de la historia moderna.' }
    ],
    historyNote: 'El patrón que hay detrás de las tres, aproximadamente: cuanto más profunda y lenta la caída, más larga la recuperación — pero los índices amplios y diversificados siempre han acabado recuperándose, mientras que muchas empresas individuales nunca lo hicieron.',
    q1Title: '¿Debería vender si la bolsa cae un 40%?',
    q1P: 'La evidencia de la inversión pasiva dice que no: vender tras un crash convierte una pérdida temporal sobre el papel en una pérdida real y permanente, e históricamente los mejores días de bolsa tienden a concentrarse justo después de los peores — perdérselos destroza la rentabilidad a largo plazo. El plan aburrido y respaldado por la evidencia es mantener las posiciones, seguir con las aportaciones mensuales y rebalancear hacia tu asignación objetivo. Esto es divulgación sobre cómo se han comportado históricamente los índices amplios, no asesoramiento financiero ni una recomendación personalizada.',
    q2Title: '¿Tiene sentido seguir aportando durante una caída?',
    q2P: 'Matemáticamente, sí — y el simulador de arriba lo demuestra. Las aportaciones hechas durante un drawdown compran a precios deprimidos, así que cada euro invertido entonces compra más participaciones. Justo por eso la recuperación "con aportaciones" es meses o años más corta que la de "sin aportaciones". Lo difícil no son las matemáticas sino la conducta: automatizar la aportación mensual es la forma más sencilla de asegurarte de que la haces cuando los titulares dan miedo.',
    q3Title: '¿Cuánto tarda la bolsa en recuperarse de un crash?',
    q3P: 'No hay una respuesta fija: históricamente ha oscilado entre unos meses (2020) y varios años (2000, 2008), y esas cifras son aproximadas y dependen del índice. Lo que sí controlas son las variables de este simulador — tu ritmo de aportación y tu asignación. Una cartera que sigues alimentando se recupera a tu ritmo, no solo al del mercado.',
    otherToolsTitle: 'Otras herramientas',
    otherTools: [
      { path: '/herramientas/calculadora-ter', label: 'Calculadora de TER' },
      { path: '/herramientas/checklist-rebalanceo', label: 'Checklist de rebalanceo' },
      { path: '/herramientas/calculadora-precio-medio', label: 'Calculadora de precio medio' }
    ],
    ctaTitle: '¿Listo para preparar tu cartera antes del próximo crash?',
    ctaDesc: 'Usa la calculadora gratuita de CoreBalance para fijar tu asignación objetivo y rebalancear con nuevas aportaciones — de forma local y 100% privada.',
    ctaBtn: 'Ir a la calculadora'
  });

  const breadcrumbSchema = $derived({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": t.breadcrumb.home, "item": absoluteUrl(localizePath('/', lang)) },
      { "@type": "ListItem", "position": 2, "name": t.breadcrumb.tools, "item": absoluteUrl(localizePath('/herramientas', lang)) },
      { "@type": "ListItem", "position": 3, "name": t.breadcrumb.tool, "item": absoluteUrl($page.url.pathname) }
    ]
  });

  // --- Estado del simulador (standalone: sin store del dashboard) ---
  let initialCapital = $state(10000);
  let dropPercent = $state(40);
  let monthlyDca = $state(300);
  let annualReturn = $state(7);

  // Capitalización mensual: (1 + r)^(1/12) por mes.
  const monthlyFactor = $derived(Math.pow(1 + (annualReturn || 0) / 100, 1 / 12));
  const capitalAfterDrop = $derived((initialCapital || 0) * (1 - dropPercent / 100));
  const lossAmount = $derived((initialCapital || 0) - capitalAfterDrop);

  const MAX_MONTHS = 600; // 50 años: tope para no iterar infinito si nunca se recupera

  // Meses hasta volver al capital inicial. -1 = no se recupera en 50 años.
  function monthsToRecover(dca: number): number {
    const target = initialCapital || 0;
    if (target <= 0 || dropPercent <= 0) return 0;
    let value = capitalAfterDrop;
    let months = 0;
    while (value < target && months < MAX_MONTHS) {
      value = value * monthlyFactor + dca;
      months++;
    }
    return value >= target ? months : -1;
  }

  const stats = $derived.by(() => {
    const monthsNoDca = monthsToRecover(0);
    const monthsWithDca = monthsToRecover(monthlyDca || 0);
    const timeSaved = monthsNoDca > 0 && monthsWithDca >= 0 ? monthsNoDca - monthsWithDca : 0;
    return { monthsNoDca, monthsWithDca, timeSaved };
  });

  const numLocale = $derived(lang === 'es' ? 'es-ES' : 'en-US');

  function fmt(n: number): string {
    return Math.round(n).toLocaleString(numLocale);
  }

  function fmtRecovery(months: number): string {
    if (months < 0) return t.never;
    if (months === 0) return t.months(0);
    const years = Number((months / 12).toFixed(1)).toLocaleString(numLocale);
    return `${t.months(months)} (${t.approxYears(years)})`;
  }
</script>

<SeoHead
  title={metaTitle}
  description={metaDesc}
  path={$page.url.pathname}
  {lang}
  image={pageOgImage('crisis', lang)}
  jsonLd={breadcrumbSchema}
/>

<div class="crisis-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto($link('/'))} />

  <main class="crisis-container">
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href={$link('/')}>🏠 {t.breadcrumb.home}</a>
      <span class="breadcrumb-sep">›</span>
      <a href={$link('/herramientas')}>{t.breadcrumb.tools}</a>
      <span class="breadcrumb-sep">›</span>
      <span aria-current="page">{t.breadcrumb.tool}</span>
    </nav>
    <header class="crisis-header">
      <span class="category-badge">{t.badge}</span>
      <h1 class="gradient-text">{t.title}</h1>
      <p class="subtitle">{t.subtitle}</p>
    </header>

    <div class="calculator-grid">
      <!-- PANEL IZQUIERDO: Configuración del escenario -->
      <section class="left-panel card-glass">
        <div class="panel-header">
          <h2>{t.panelTitle}</h2>
        </div>

        <div class="config-grid">
          <div class="input-group">
            <label for="initial-capital">{t.labelCapital}</label>
            <input id="initial-capital" type="number" bind:value={initialCapital} min="0" step="500" />
          </div>
          <div class="input-group">
            <label for="monthly-dca">{t.labelMonthly}</label>
            <input id="monthly-dca" type="number" bind:value={monthlyDca} min="0" step="50" />
          </div>
          <div class="input-group">
            <label for="annual-return">{t.labelReturn}</label>
            <input id="annual-return" type="number" bind:value={annualReturn} min="0" max="20" step="0.5" />
          </div>
        </div>

        <div class="scenario-block">
          <p class="scenario-label">{t.scenariosTitle}</p>
          <div class="presets">
            {#each t.scenarios as scenario}
              <button
                class="preset-btn"
                class:active={dropPercent === scenario.drop}
                onclick={() => dropPercent = scenario.drop}
              >
                {scenario.emoji} {scenario.name} (−{scenario.drop}%)
              </button>
            {/each}
          </div>

          {#each t.scenarios as scenario}
            {#if dropPercent === scenario.drop}
              <div class="scenario-detail">
                <span class="detail-title">{scenario.emoji} {scenario.name}</span>
                <p class="detail-desc">{scenario.desc}</p>
              </div>
            {/if}
          {/each}
        </div>

        <div class="input-group slider-group">
          <div class="slider-header">
            <label for="drop-range">{t.customLabel}</label>
            <span class="drop-value">−{dropPercent}%</span>
          </div>
          <input id="drop-range" type="range" min="10" max="70" step="1" bind:value={dropPercent} />
        </div>
      </section>

      <!-- PANEL DERECHO: Resultados -->
      <section class="right-panel">
        <div class="drop-result-card card-glass">
          <h3>{t.resultTitle}</h3>
          <p class="big-number">{fmt(capitalAfterDrop)} €</p>
          <p class="card-desc loss-desc">{t.resultDesc(fmt(lossAmount))}</p>
        </div>

        <div class="recovery-card card-glass">
          <div class="recovery-header">
            <h3>{t.recoveryTitle}</h3>
          </div>
          <div class="recovery-breakdown">
            <div class="breakdown-row">
              <span>{t.rowNoDca}</span>
              <span class="value-highlight">{fmtRecovery(stats.monthsNoDca)}</span>
            </div>
            <div class="breakdown-row">
              <span>{t.rowWithDca(fmt(monthlyDca || 0))}</span>
              <span class="value-recovery">{fmtRecovery(stats.monthsWithDca)}</span>
            </div>
            <div class="breakdown-row">
              <span>{t.rowSaved}</span>
              <span class="value-recovery">{t.months(stats.timeSaved)}</span>
            </div>
          </div>
          <p class="recovery-note">{t.recoveryNote(fmt(initialCapital || 0))}</p>
        </div>
      </section>
    </div>

    <!-- Contenido educativo -->
    <section class="edu-sections">
      <h2>{t.eduTitle}</h2>
      <p>{t.eduP1}</p>
      <p>{t.eduP2}</p>

      <h2>{t.historyTitle}</h2>
      <p>{t.historyP}</p>
      <ul>
        {#each t.historyItems as item}
          <li><strong>{item.strong}</strong> {item.text}</li>
        {/each}
      </ul>
      <p>{t.historyNote}</p>

      <h2>{t.q1Title}</h2>
      <p>{t.q1P}</p>

      <h2>{t.q2Title}</h2>
      <p>{t.q2P}</p>

      <h2>{t.q3Title}</h2>
      <p>{t.q3P}</p>
    </section>

    <!-- Enlaces cruzados a las demás herramientas -->
    <aside class="other-tools">
      <h2>{t.otherToolsTitle}</h2>
      <ul>
        {#each t.otherTools as tool}
          <li><a href={$link(tool.path)}>{tool.label}</a></li>
        {/each}
      </ul>
    </aside>

    <!-- CTA final -->
    <section class="crisis-cta">
      <div class="cta-inner">
        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaDesc}</p>
        <!--
          ⚠️ El botón decía «Ir a la calculadora» y llevaba a la portada. Es el mismo
          defecto que se arregló en el índice de herramientas: el destino tiene que cumplir
          lo que promete el botón, y la calculadora es el dashboard.

          Y es un enlace de verdad, no un `goto()`, por lo mismo que allí: así lo ve un
          rastreador. `/dashboard` no es ruta bilingüe, así que no pasa por `$link` —
          `localizeInternalLink` devolvería el href intacto de todos modos.
        -->
        <a class="btn-primary" href="/dashboard">{t.ctaBtn}</a>
      </div>
    </section>
  </main>

  <RelatedReading items={data.relatedReading} {lang} />

  <LandingFooter />
</div>

<style>
  .crisis-page {
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }

  .crisis-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 140px 1.5rem 80px;
  }

  .crisis-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .category-badge {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent-blue-ink);
    background: rgba(59, 130, 246, 0.1);
    padding: 0.35rem 0.85rem;
    border-radius: 9999px;
    letter-spacing: 0.05em;
    display: inline-block;
    margin-bottom: 1.5rem;
  }

  .gradient-text {
    font-size: 3.2rem;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: 1.5rem;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, var(--text-primary) 40%, var(--accent-violet-ink) 100%);
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
    color: var(--text-muted);
    font-size: 1.2rem;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .calculator-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 2.5rem;
    margin-bottom: 5rem;
  }

  @media (max-width: 900px) {
    .calculator-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  .card-glass {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 24px;
    padding: 2.5rem;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .panel-header h2 {
    font-size: 1.4rem;
    font-weight: 800;
    margin: 0;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input-group label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .input-group input[type="number"] {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    color: var(--text-primary);
    font-size: 0.95rem;
    width: 100%;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .input-group input[type="number"]:focus {
    border-color: var(--accent-blue-ink);
  }

  .config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  @media (max-width: 640px) {
    .config-grid {
      grid-template-columns: 1fr;
    }
  }

  .scenario-block {
    margin-bottom: 2rem;
  }

  .scenario-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    margin: 0 0 0.75rem;
  }

  .presets {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  @media (max-width: 640px) {
    .presets {
      grid-template-columns: 1fr;
    }
  }

  .preset-btn {
    background: var(--bg-card-hover);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 0.6rem 0.4rem;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preset-btn:hover { background: rgba(255, 255, 255, 0.1); }

  .preset-btn.active {
    background: rgba(59, 130, 246, 0.2);
    border-color: var(--accent-blue-ink);
    color: var(--accent-blue-ink);
  }

  .scenario-detail {
    background: rgba(59, 130, 246, 0.06);
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    margin-top: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .detail-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--accent-blue-ink);
  }

  .detail-desc {
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
  }

  .slider-group { gap: 0.75rem; }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .drop-value {
    font-size: 1rem;
    font-weight: 800;
    color: var(--state-negative);
    font-variant-numeric: tabular-nums;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: var(--track);
    border-radius: 10px;
    outline: none;
    touch-action: pan-y pinch-zoom;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--accent-blue);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid #05050a;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  }

  .right-panel { display: flex; flex-direction: column; gap: 2rem; }

  .drop-result-card {
    text-align: center;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(139, 92, 246, 0.03) 100%);
    border-color: rgba(239, 68, 68, 0.15);
  }

  .drop-result-card h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .big-number {
    font-size: 4rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    background: linear-gradient(135deg, var(--state-negative) 30%, var(--accent-violet-ink) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 640px) {
    .big-number { font-size: 3rem; }
  }

  .card-desc { color: var(--text-muted); font-size: 0.9rem; margin: 0.5rem 0 0; }

  .loss-desc { color: var(--state-negative); font-weight: 600; font-variant-numeric: tabular-nums; }

  .recovery-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .recovery-header h3 { font-size: 1.3rem; font-weight: 800; color: var(--text-primary); margin: 0 0 1.5rem; }

  .recovery-breakdown { display: flex; flex-direction: column; gap: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 1.25rem; }

  .breakdown-row { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.9rem; color: var(--text-muted); }

  .value-highlight { color: var(--text-primary); font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
  .value-recovery { color: var(--accent-green-ink); font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }

  .recovery-note {
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 1.25rem 0 0;
  }

  /* Contenido educativo */
  .edu-sections {
    max-width: 760px;
    margin: 0 auto 5rem;
  }

  .edu-sections h2 {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 2.5rem 0 1rem;
  }

  .edu-sections h2:first-child { margin-top: 0; }

  .edu-sections p {
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 1rem;
    margin: 0 0 1rem;
  }

  .edu-sections ul {
    margin: 0 0 1rem;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .edu-sections li {
    color: var(--text-secondary);
    line-height: 1.7;
    font-size: 1rem;
  }

  .edu-sections strong { color: var(--text-primary); }

  /* Otras herramientas */
  .other-tools {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    padding: 1.5rem 2rem;
    margin: 0 auto 3rem;
    max-width: 760px;
  }
  .other-tools h2 {
    font-size: 1.05rem;
    font-weight: 800;
    margin: 0 0 1rem;
  }
  .other-tools ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.75rem;
  }
  .other-tools a {
    color: var(--accent-blue-ink);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    transition: color 0.2s ease;
  }
  .other-tools a:hover { color: var(--accent-blue-ink); text-decoration: underline; }

  .crisis-cta {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 24px;
    padding: 3.5rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .cta-inner { position: relative; z-index: 2; max-width: 600px; margin: 0 auto; }

  .crisis-cta h2 { font-size: 2rem; font-weight: 800; margin-top: 0; margin-bottom: 1rem; letter-spacing: -0.02em; }

  .crisis-cta p { color: var(--text-secondary); line-height: 1.6; margin-bottom: 2rem; font-size: 1.05rem; }

  /* Es un `<a>`, no un `<button>`: de ahí `inline-block` y quitar el subrayado. */
  .btn-primary {
    display: inline-block;
    text-decoration: none;
    background: var(--accent-blue);
    color: var(--text-on-accent);
    border: none;
    padding: 0.85rem 2rem;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
    transition: all 0.2s ease;
  }

  .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35); }
  .btn-primary:active { transform: scale(0.98); }

  /* Breadcrumb */
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .breadcrumb a {
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s;
  }
  .breadcrumb a:hover { color: var(--text-primary); }
  .breadcrumb-sep { color: var(--text-faint); }
  .breadcrumb span[aria-current="page"] { color: var(--text-secondary); font-weight: 500; }
</style>
