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
    ? 'Portfolio TER Calculator | CoreBalance'
    : 'Calculadora de TER de Cartera Indexada | CoreBalance'
  );
  const metaDesc = $derived(lang === 'en'
    ? 'Free tool to calculate the total weighted TER (real cost) of your index fund or ETF portfolio and simulate your long-term fee savings.'
    : 'Calcula gratis el TER total ponderado (coste real) de tu cartera de fondos indexados o ETFs y simula tu ahorro en comisiones a largo plazo.'
  );


  const t = $derived(lang === 'en' ? {
    badge: 'Interactive Tool',
    breadcrumb: { home: 'Home', blog: 'Blog', tool: 'TER Calculator' },
    title: 'Total Expense Ratio Calculator',
    subtitle: 'Calculate the real cost of your portfolio (weighted average TER) and project the thousands of euros you\'ll save by avoiding actively managed funds.',
    panelTitle: '1. Your Funds / ETFs',
    addAsset: 'Add Asset',
    labelName: 'Fund / ETF Name',
    labelWeight: 'Weight (%)',
    labelTER: 'TER (%)',
    validationWarning: (w: number) => `Weights must add up to exactly 100% (current: ${w}%)`,
    terResultTitle: 'Weighted Average TER',
    terResultDesc: 'This is the average annual fee of your portfolio.',
    simTitle: '2. Fee Simulation',
    labelCapital: 'Initial Capital (€)',
    labelMonthly: 'Monthly Savings (€)',
    labelReturn: 'Est. Annual Return (%)',
    labelYears: 'Investment Years',
    labelActiveTer: 'Active fund TER (%)',
    savingsTitle: 'Projected fee savings',
    rowPassive: (ter: number) => `Final Capital (Index funds TER: ${ter}%):`,
    rowActive: (ter: number) => `Final Capital (Active fund TER: ${ter}%):`,
    rowFees: 'Fees paid to the commercial bank:',
    faqs: [
      {
        heading: 'What is a fund\'s TER?',
        paragraphs: [
          'The TER (Total Expense Ratio) is a fund\'s total annual fee expressed as a percentage of its assets. You never pay it separately: it is deducted daily from the fund\'s net asset value, so the return you see already has it subtracted. A 1.5% TER means the fund quietly takes 1.5% of your money every year, whether it beats the market or not.'
        ]
      },
      {
        heading: 'What is the difference between TER and the management fee?',
        paragraphs: [
          'The management fee is only one component of the TER — what the fund manager charges for running the fund. The TER adds on top the custody fee, administration costs and other ongoing expenses, so it reflects the real total cost you bear each year far better than the management fee alone.'
        ]
      },
      {
        heading: 'What is a reasonable TER for an index fund?',
        paragraphs: [
          'The reference index funds available in Europe usually sit well below 0.5% per year, and the most competitive ones below 0.2%. Actively managed funds sold by traditional banks, by contrast, often exceed 1.5% — a difference that, compounded over decades, can cost tens of thousands of euros, as the simulator above shows.'
        ]
      }
    ],
    otherToolsTitle: 'Other tools',
    otherTools: [
      { path: '/herramientas/checklist-rebalanceo', label: 'Rebalancing Checklist' },
      { path: '/herramientas/simulador-crisis', label: 'Crash Simulator' },
      { path: '/herramientas/calculadora-precio-medio', label: 'Average Price Calculator' }
    ],
    ctaTitle: 'Ready to optimize your portfolio to the cent?',
    ctaDesc: 'Once you\'ve calculated your fund costs, use CoreBalance\'s free calculator to rebalance your weights locally and 100% privately.',
    ctaBtn: 'Open the portfolio manager',
    deleteLabel: 'Remove fund',
    fundPlaceholder: 'e.g. Vanguard MSCI World'
  } : {
    badge: 'Herramienta Interactiva',
    breadcrumb: { home: 'Inicio', blog: 'Blog', tool: 'Calculadora TER' },
    title: 'Calculadora de TER total',
    subtitle: 'Calcula el coste real de tu cartera (TER medio ponderado) y proyecta los miles de euros que ahorrarás al evitar fondos gestionados activos.',
    panelTitle: '1. Tus Fondos / ETFs',
    addAsset: 'Añadir Activo',
    labelName: 'Nombre del Fondo / ETF',
    labelWeight: 'Peso (%)',
    labelTER: 'TER (%)',
    validationWarning: (w: number) => `Los porcentajes deben sumar exactamente 100% (actual: ${w}%)`,
    terResultTitle: 'TER Medio Ponderado',
    terResultDesc: 'Este es el coste medio anual de las comisiones de tu cartera.',
    simTitle: '2. Simulación de comisiones',
    labelCapital: 'Capital Inicial (€)',
    labelMonthly: 'Ahorro Mensual (€)',
    labelReturn: 'Rentabilidad Est. (%)',
    labelYears: 'Años de Inversión',
    labelActiveTer: 'TER fondo activo (%)',
    savingsTitle: 'Ahorro proyectado en comisiones',
    rowPassive: (ter: number) => `Capital Final (Con indexados TER: ${ter}%):`,
    rowActive: (ter: number) => `Capital Final (Con fondo activo TER: ${ter}%):`,
    rowFees: 'Comisiones pagadas al banco comercial:',
    faqs: [
      {
        heading: '¿Qué es el TER de un fondo?',
        paragraphs: [
          'El TER (Total Expense Ratio) es la comisión anual total de un fondo expresada como porcentaje de su patrimonio. Nunca lo pagas aparte: se descuenta a diario del valor liquidativo, así que la rentabilidad que ves ya lo lleva restado. Un TER del 1,5% significa que el fondo se queda silenciosamente con un 1,5% de tu dinero cada año, bata o no al mercado.'
        ]
      },
      {
        heading: '¿Qué diferencia hay entre TER y comisión de gestión?',
        paragraphs: [
          'La comisión de gestión es solo una parte del TER: lo que cobra la gestora por administrar el fondo. El TER añade además la comisión de depósito, los gastos de administración y otros gastos corrientes, por lo que refleja mucho mejor el coste total real que soportas cada año que la comisión de gestión por sí sola.'
        ]
      },
      {
        heading: '¿Qué TER es razonable para un fondo indexado?',
        paragraphs: [
          'Los fondos indexados de referencia disponibles en Europa suelen situarse muy por debajo del 0,5% anual, y los más competitivos por debajo del 0,2%. En cambio, los fondos activos de la banca tradicional superan a menudo el 1,5% — una diferencia que, capitalizada durante décadas, puede costar decenas de miles de euros, como muestra el simulador de arriba.'
        ]
      }
    ],
    otherToolsTitle: 'Otras herramientas',
    otherTools: [
      { path: '/herramientas/checklist-rebalanceo', label: 'Checklist de rebalanceo' },
      { path: '/herramientas/simulador-crisis', label: 'Simulador de crisis' },
      { path: '/herramientas/calculadora-precio-medio', label: 'Calculadora de precio medio' }
    ],
    ctaTitle: '¿Listo para optimizar tu cartera al céntimo?',
    ctaDesc: 'Una vez calculado el coste de tus fondos, usa la calculadora de CoreBalance gratis para rebalancear tus pesos de forma local y 100% privada.',
    ctaBtn: 'Abrir la calculadora de cartera',
    deleteLabel: 'Eliminar fondo',
    fundPlaceholder: 'Ej. Vanguard MSCI World'
  });

  const breadcrumbSchema = $derived({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": t.breadcrumb.home, "item": absoluteUrl(localizePath('/', lang)) },
      { "@type": "ListItem", "position": 2, "name": t.breadcrumb.blog, "item": absoluteUrl(localizePath('/blog', lang)) },
      { "@type": "ListItem", "position": 3, "name": t.breadcrumb.tool, "item": absoluteUrl($page.url.pathname) }
    ]
  });

  // FAQPage con los encabezados que son pregunta, con su respuesta directa.
  const faqSchema = $derived({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": t.faqs
      .filter((s) => s.heading.endsWith('?'))
      .map((s) => ({
        "@type": "Question",
        "name": s.heading,
        "acceptedAnswer": { "@type": "Answer", "text": s.paragraphs[0] }
      }))
  });

  // Lista de fondos iniciales por defecto
  let funds = $state([
    { name: 'MSCI World Fund', weight: 80, ter: 0.12 },
    { name: 'Emerging Markets Fund', weight: 20, ter: 0.23 }
  ]);

  // Variables de la simulación
  let initialCapital = $state(10000);
  let monthlyAportation = $state(300);
  let annualReturn = $state(7);
  let years = $state(30);
  let activeTer = $state(1.80); // TER medio de fondos activos en España

  // Cálculos reactivos de la cartera
  let totalWeight = $derived(funds.reduce((acc, f) => acc + (f.weight || 0), 0));
  
  let weightedTer = $derived.by(() => {
    if (totalWeight === 0) return 0;
    const sum = funds.reduce((acc, f) => acc + ((f.weight || 0) * (f.ter || 0)), 0);
    return Number((sum / totalWeight).toFixed(3));
  });

  // Simulación a largo plazo (Fórmula de interés compuesto con aportaciones)
  let simulationResult = $derived.by(() => {
    const monthlyRate = annualReturn / 100 / 12;
    const months = years * 12;
    
    const passiveTerRate = (weightedTer / 100) / 12;
    const activeTerRate = (activeTer / 100) / 12;

    let valPassive = initialCapital;
    let totalPassiveFees = 0;
    for (let i = 0; i < months; i++) {
      const fees = valPassive * passiveTerRate;
      totalPassiveFees += fees;
      valPassive = (valPassive - fees) * (1 + monthlyRate) + monthlyAportation;
    }

    let valActive = initialCapital;
    let totalActiveFees = 0;
    for (let i = 0; i < months; i++) {
      const fees = valActive * activeTerRate;
      totalActiveFees += fees;
      valActive = (valActive - fees) * (1 + monthlyRate) + monthlyAportation;
    }

    const savings = valPassive - valActive;

    return {
      finalPassive: Math.round(valPassive),
      finalActive: Math.round(valActive),
      feesPassive: Math.round(totalPassiveFees),
      feesActive: Math.round(totalActiveFees),
      savings: Math.round(savings)
    };
  });

  function addFund() {
    funds.push({ name: `Fund #${funds.length + 1}`, weight: 0, ter: 0.15 });
  }

  function removeFund(index: number) {
    funds = funds.filter((_, i) => i !== index);
  }

  const numLocale = $derived(lang === 'es' ? 'es-ES' : 'en-US');
</script>

<SeoHead
  title={metaTitle}
  description={metaDesc}
  path={$page.url.pathname}
  {lang}
  image={pageOgImage('ter', lang)}
  jsonLd={[breadcrumbSchema, faqSchema]}
/>

<div class="ter-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto($link('/'))} />

  <main class="ter-container">
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href={$link('/')}>🏠 {t.breadcrumb.home}</a>
      <span class="breadcrumb-sep">›</span>
      <a href={$link('/blog')}>{t.breadcrumb.blog}</a>
      <span class="breadcrumb-sep">›</span>
      <span aria-current="page">{t.breadcrumb.tool}</span>
    </nav>
    <header class="ter-header">
      <span class="category-badge">{t.badge}</span>
      <h1 class="gradient-text">{t.title}</h1>
      <p class="subtitle">{t.subtitle}</p>
    </header>

    <div class="calculator-grid">
      <!-- PANEL IZQUIERDO: Configuración de cartera -->
      <section class="left-panel card-glass">
        <div class="panel-header">
          <h2>{t.panelTitle}</h2>
          <button class="btn-add" onclick={addFund}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {t.addAsset}
          </button>
        </div>

        <div class="funds-list">
          {#each funds as fund, index}
            <div class="fund-row">
              <div class="input-group name-col">
                <label for="fund-name-{index}">{t.labelName}</label>
                <input id="fund-name-{index}" type="text" bind:value={fund.name} placeholder={t.fundPlaceholder} />
              </div>
              <div class="input-group num-col">
                <label for="fund-weight-{index}">{t.labelWeight}</label>
                <input id="fund-weight-{index}" type="number" bind:value={fund.weight} min="0" max="100" />
              </div>
              <div class="input-group num-col">
                <label for="fund-ter-{index}">{t.labelTER}</label>
                <input id="fund-ter-{index}" type="number" bind:value={fund.ter} step="0.01" min="0" max="5" />
              </div>
              <button class="btn-delete" aria-label={t.deleteLabel} onclick={() => removeFund(index)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          {/each}
        </div>

        <!-- Alertas de Validación -->
        {#if totalWeight !== 100}
          <div class="validation-warning">
            <svg class="warning-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            {t.validationWarning(totalWeight)}
          </div>
        {/if}
      </section>

      <!-- PANEL DERECHO: Resumen y métricas -->
      <section class="right-panel">
        <div class="ter-result-card card-glass">
          <h3>{t.terResultTitle}</h3>
          <p class="big-number">{weightedTer}%</p>
          <p class="card-desc">{t.terResultDesc}</p>
        </div>

        <!-- Configuración de la Simulación -->
        <div class="simulation-config card-glass">
          <h2>{t.simTitle}</h2>
          <div class="config-grid">
            <div class="input-group">
              <label for="initial-capital">{t.labelCapital}</label>
              <input id="initial-capital" type="number" bind:value={initialCapital} />
            </div>
            <div class="input-group">
              <label for="monthly-contribution">{t.labelMonthly}</label>
              <input id="monthly-contribution" type="number" bind:value={monthlyAportation} />
            </div>
            <div class="input-group">
              <label for="annual-return">{t.labelReturn}</label>
              <input id="annual-return" type="number" bind:value={annualReturn} />
            </div>
            <div class="input-group">
              <label for="simulation-years">{t.labelYears}</label>
              <input id="simulation-years" type="number" bind:value={years} />
            </div>
            <div class="input-group">
              <label for="active-ter">{t.labelActiveTer}</label>
              <input id="active-ter" type="number" bind:value={activeTer} min="0" max="5" step="0.05" />
            </div>
          </div>
        </div>

        <!-- Resultados de la Simulación -->
        <div class="savings-card card-glass gradient-border">
          <div class="savings-header">
            <h3>{t.savingsTitle}</h3>
            <p class="savings-number">+{simulationResult.savings.toLocaleString(numLocale)} €</p>
          </div>
          <div class="savings-breakdown">
            <div class="breakdown-row">
              <span>{t.rowPassive(weightedTer)}</span>
              <span class="value-highlight">{simulationResult.finalPassive.toLocaleString(numLocale)} €</span>
            </div>
            <div class="breakdown-row">
              <span>{t.rowActive(activeTer)}</span>
              <span>{simulationResult.finalActive.toLocaleString(numLocale)} €</span>
            </div>
            <div class="breakdown-row">
              <span>{t.rowFees}</span>
              <span class="fees-highlight">{simulationResult.feesActive.toLocaleString(numLocale)} €</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Preguntas frecuentes -->
    <section class="edu-content">
      {#each t.faqs as faq}
        <article class="edu-section">
          <h2>{faq.heading}</h2>
          {#each faq.paragraphs as paragraph}
            <p>{paragraph}</p>
          {/each}
        </article>
      {/each}
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
    <section class="ter-cta">
      <div class="cta-inner">
        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaDesc}</p>
        <button class="btn-primary" onclick={() => goto($link('/dashboard'))}>{t.ctaBtn}</button>
      </div>
    </section>
  </main>

  <RelatedReading items={data.relatedReading} {lang} />

  <LandingFooter />
</div>

<style>
  .ter-page {
    background: var(--bg-primary, #05050a);
    color: #fff;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }

  .ter-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 140px 1.5rem 80px;
  }

  .ter-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .category-badge {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent-blue, #3b82f6);
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
    background: linear-gradient(135deg, #ffffff 40%, #a78bfa 100%);
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
    background: var(--bg-card, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
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

  .btn-add {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .btn-add:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
  }

  .funds-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .fund-row {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input-group label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
  }

  .input-group input {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    border-radius: 12px;
    padding: 0.75rem 1rem;
    color: #fff;
    font-size: 0.95rem;
    width: 100%;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .input-group input:focus {
    border-color: var(--accent-blue, #3b82f6);
  }

  .name-col { flex-grow: 1; }
  .num-col { width: 80px; }

  .btn-delete {
    background: none;
    border: none;
    color: rgba(239, 68, 68, 0.6);
    padding: 0.75rem;
    cursor: pointer;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .btn-delete:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .validation-warning {
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 14px;
    padding: 1rem 1.25rem;
    color: #f59e0b;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .warning-icon { width: 18px; height: 18px; flex-shrink: 0; }

  .right-panel { display: flex; flex-direction: column; gap: 2rem; }

  .ter-result-card {
    text-align: center;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(139, 92, 246, 0.03) 100%);
    border-color: rgba(59, 130, 246, 0.15);
  }

  .ter-result-card h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .big-number {
    font-size: 4rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.04em;
    background: linear-gradient(135deg, #60a5fa 30%, #a78bfa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .card-desc { color: var(--text-muted, rgba(160, 160, 200, 0.6)); font-size: 0.9rem; margin: 0.5rem 0 0; }

  .simulation-config h2 { font-size: 1.3rem; font-weight: 800; margin-top: 0; margin-bottom: 1.5rem; }

  .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

  .savings-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .savings-header h3 { font-size: 1rem; font-weight: 700; color: rgba(255, 255, 255, 0.9); margin: 0 0 0.5rem; }

  .savings-number { font-size: 2.5rem; font-weight: 800; color: #10b981; margin: 0 0 1.5rem; letter-spacing: -0.02em; }

  .savings-breakdown { display: flex; flex-direction: column; gap: 0.75rem; border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06)); padding-top: 1.25rem; }

  .breakdown-row { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-muted, rgba(160, 160, 200, 0.8)); }

  .value-highlight { color: #fff; font-weight: 600; }
  .fees-highlight { color: #ef4444; font-weight: 600; }

  /* Preguntas frecuentes */
  .edu-content {
    max-width: 760px;
    margin: 0 auto 4rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .edu-section h2 {
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.3;
    margin: 0 0 1rem;
  }

  .edu-section p {
    color: rgba(255, 255, 255, 0.78);
    font-size: 1.05rem;
    line-height: 1.75;
    margin: 0 0 1rem;
  }

  .edu-section p:last-child { margin-bottom: 0; }

  /* Otras herramientas */
  .other-tools {
    background: var(--bg-card, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
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
    color: #60a5fa;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    transition: color 0.2s ease;
  }
  .other-tools a:hover { color: #93c5fd; text-decoration: underline; }

  .ter-cta {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 24px;
    padding: 3.5rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .cta-inner { position: relative; z-index: 2; max-width: 600px; margin: 0 auto; }

  .ter-cta h2 { font-size: 2rem; font-weight: 800; margin-top: 0; margin-bottom: 1rem; letter-spacing: -0.02em; }

  .ter-cta p { color: rgba(255, 255, 255, 0.75); line-height: 1.6; margin-bottom: 2rem; font-size: 1.05rem; }

  .btn-primary {
    background: var(--accent-blue, #3b82f6);
    color: white;
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
    color: rgba(255, 255, 255, 0.55);
    text-decoration: none;
    transition: color 0.2s;
  }
  .breadcrumb a:hover { color: rgba(255, 255, 255, 0.9); }
  .breadcrumb-sep { color: rgba(255, 255, 255, 0.25); }
  .breadcrumb span[aria-current="page"] { color: rgba(255, 255, 255, 0.85); font-weight: 500; }
</style>
