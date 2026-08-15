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
    ? 'Is It Time to Rebalance Your Portfolio? | CoreBalance'
    : 'Checklist: ¿Es hora de rebalancear tu cartera? | CoreBalance'
  );
  const metaDesc = $derived(lang === 'en'
    ? "Discover if it's time to adjust your funds or ETFs with our interactive portfolio rebalancing quiz."
    : 'Descubre si ha llegado el momento de ajustar tus fondos o ETFs con nuestro cuestionario interactivo de rebalanceo de cartera.'
  );

  const t = $derived(lang === 'en' ? {
    badge: 'Interactive Resource',
    breadcrumb: { home: 'Home', tools: 'Tools', tool: 'Rebalancing Checklist' },
    title: 'Is It Time to Rebalance?',
    subtitle: 'Answer these 4 quick questions and get a personalized recommendation on the health of your asset allocation.',
    stepIndicator: (n: number) => `Question ${n} of 4`,
    back: 'Back',
    tipLabel: '💡 Key tip:',
    goToCalc: 'Open the portfolio manager',
    restart: 'Restart Quiz',
    otherToolsTitle: 'Other tools',
    otherTools: [
      { path: '/herramientas/calculadora-ter', label: 'TER Calculator' },
      { path: '/herramientas/simulador-crisis', label: 'Crash Simulator' },
      { path: '/herramientas/calculadora-precio-medio', label: 'Average Price Calculator' }
    ],
    steps: [
      {
        title: '1. How long has it been since your last rebalance?',
        desc: 'Time helps avoid overtrading due to temporary market impulses.',
        options: [
          { label: 'Less than 6 months', value: 'less_6' },
          { label: 'Between 6 and 12 months', value: 'between_6_12' },
          { label: 'More than 12 months or never done it', value: 'more_12' }
        ]
      },
      {
        title: '2. What is the observed drift in your main assets?',
        desc: 'Compare your current percentages against your target asset allocation.',
        options: [
          { label: 'Low drift (less than 3%)', value: 'drift_low' },
          { label: 'Moderate drift (between 3% and 5%)', value: 'drift_medium' },
          { label: 'High drift (more than 5%)', value: 'drift_high' }
        ]
      },
      {
        title: '3. Are you planning to make new contributions soon?',
        desc: 'Cash flow is the most efficient method to balance small and medium-sized portfolios.',
        options: [
          { label: 'Yes, I contribute monthly or periodically', value: 'aport_yes' },
          { label: 'No, all my capital is already fully invested', value: 'aport_no' }
        ]
      },
      {
        title: '4. What type of assets make up your portfolio?',
        desc: 'The investment vehicle determines the tax implications and transaction costs of adjustments.',
        options: [
          { label: 'Traditional index funds (transferable in Spain)', value: 'type_funds' },
          { label: 'ETFs or individual listed stocks', value: 'type_etfs' }
        ]
      }
    ],
    verdicts: {
      by_time: {
        title: 'Rebalancing recommended: over a year without reviewing',
        color: '#3b82f6',
        desc: 'Your drift is small, but more than 12 months have passed since your last rebalance (or you have never done one). The calendar rule for passive investors is to review your allocation at least once a year: check your real weights and steer your next contributions towards whatever has fallen behind, without selling anything.',
        tip: 'Set a fixed annual date (e.g. every January) and let CoreBalance calculate the exact contribution that brings you back to your target allocation.'
      },
      no_rebalance: {
        title: 'Rebalancing is not necessary',
        color: '#10b981',
        desc: 'Your portfolio is very stable. Current deviations are insignificant and trading them would only generate unnecessary costs. Keep contributing normally and check again in a few months.',
        tip: 'Keeping your hands still when there are no deviations is one of the virtues of the best passive investors.'
      },
      by_contribution: {
        title: 'Rebalancing recommended via contribution',
        color: '#3b82f6',
        desc: 'Your portfolio has a slight drift, but by making periodic monthly purchases you can easily fix it. Direct all your available savings towards the underweighted funds.',
        tip: 'Use CoreBalance to calculate the exact contribution and balance your portfolio without selling any asset or paying taxes.'
      },
      by_transfer: {
        title: 'Rebalancing recommended via fund transfer (Tax-free)',
        color: '#8b5cf6',
        desc: 'Your assets have drifted noticeably from your original plan. Using index funds in Spain, we recommend ordering a partial transfer from the overweighted fund to the underweighted one. This move is free and not subject to capital gains tax.',
        tip: 'Check in CoreBalance the exact amount in euros to transfer to return to your original asset allocation to the cent.'
      },
      by_sell_buy: {
        title: 'Rebalancing recommended via sell/buy (Watch fees)',
        color: '#f59e0b',
        desc: 'Your drift is significant and your capital is in ETFs. Without the fund transfer rule, you\'ll need to sell part of your winning ETFs (paying taxes on realized gains) to buy the lagging ETFs.',
        tip: 'Group your trades into a single session to minimize the impact of your broker\'s buy/sell commissions.'
      }
    }
  } : {
    badge: 'Recurso Interactivo',
    breadcrumb: { home: 'Inicio', tools: 'Herramientas', tool: 'Checklist de Rebalanceo' },
    title: '¿Es hora de rebalancear?',
    subtitle: 'Responde a estas 4 preguntas rápidas y obtén una recomendación personalizada sobre la salud de tu asignación de activos.',
    stepIndicator: (n: number) => `Pregunta ${n} de 4`,
    back: 'Atrás',
    tipLabel: '💡 Consejo clave:',
    goToCalc: 'Abrir la calculadora de cartera',
    restart: 'Reiniciar Cuestionario',
    otherToolsTitle: 'Otras herramientas',
    otherTools: [
      { path: '/herramientas/calculadora-ter', label: 'Calculadora de TER' },
      { path: '/herramientas/simulador-crisis', label: 'Simulador de crisis' },
      { path: '/herramientas/calculadora-precio-medio', label: 'Calculadora de precio medio' }
    ],
    steps: [
      {
        title: '1. ¿Cuánto tiempo ha pasado desde tu último rebalanceo?',
        desc: 'El tiempo ayuda a evitar que operes en exceso por impulsos temporales del mercado.',
        options: [
          { label: 'Menos de 6 meses', value: 'less_6' },
          { label: 'Entre 6 y 12 meses', value: 'between_6_12' },
          { label: 'Más de 12 meses o nunca lo he hecho', value: 'more_12' }
        ]
      },
      {
        title: '2. ¿Cuál es la desviación observada en tus activos principales?',
        desc: 'Compara tus porcentajes actuales frente a tu asset allocation objetivo.',
        options: [
          { label: 'Desviación baja (menos del 3%)', value: 'drift_low' },
          { label: 'Desviación moderada (entre 3% y 5%)', value: 'drift_medium' },
          { label: 'Desviación alta (más del 5%)', value: 'drift_high' }
        ]
      },
      {
        title: '3. ¿Planeas realizar nuevas aportaciones de dinero en breve?',
        desc: 'El flujo de ahorro es el método más eficiente para equilibrar carteras pequeñas y medianas.',
        options: [
          { label: 'Sí, aporto de forma mensual o periódica', value: 'aport_yes' },
          { label: 'No, todo mi capital ya está invertido por completo', value: 'aport_no' }
        ]
      },
      {
        title: '4. ¿Qué tipo de activos componen principalmente tu cartera?',
        desc: 'El vehículo de inversión determina la fiscalidad y los costes operacionales de los ajustes.',
        options: [
          { label: 'Fondos indexados tradicionales (traspasables en España)', value: 'type_funds' },
          { label: 'ETFs o acciones individuales cotizadas', value: 'type_etfs' }
        ]
      }
    ],
    verdicts: {
      by_time: {
        title: 'Rebalanceo recomendado: más de un año sin revisar',
        color: '#3b82f6',
        desc: 'Tu desviación es pequeña, pero han pasado más de 12 meses desde tu último rebalanceo (o nunca lo has hecho). La regla de calendario del inversor pasivo es revisar la asignación al menos una vez al año: comprueba tus pesos reales y dirige tus próximas aportaciones hacia lo que se haya quedado rezagado, sin vender nada.',
        tip: 'Fija una fecha anual (por ejemplo cada enero) y deja que CoreBalance calcule la aportación exacta que te devuelve a tu asignación objetivo.'
      },
      no_rebalance: {
        title: 'No es necesario rebalancear',
        color: '#10b981',
        desc: 'Tu cartera está muy estable. Las desviaciones actuales son insignificantes y operarlas solo te generaría costes innecesarios. Sigue aportando con normalidad y vuelve a chequear en unos meses.',
        tip: 'Mantener las manos quietas cuando no hay desvíos es una de las virtudes de los mejores inversores pasivos.'
      },
      by_contribution: {
        title: 'Rebalanceo recomendado por aportación',
        color: '#3b82f6',
        desc: 'Tu cartera tiene un ligero desvío, pero al realizar compras mensuales periódicas puedes solucionarlo fácilmente. Dirige tu ahorro disponible íntegramente hacia los fondos que se han quedado infraponderados.',
        tip: 'Usa CoreBalance para calcular la aportación exacta y equilibrar tu cartera sin vender ningún activo ni pagar impuestos.'
      },
      by_transfer: {
        title: 'Rebalanceo recomendado por traspaso (Exento Fiscal)',
        color: '#8b5cf6',
        desc: 'Tus activos se han desviado notablemente de tu plan original. Al utilizar fondos indexados en España, te recomendamos ordenar un traspaso parcial desde el fondo sobreponderado hacia el infraponderado. Este movimiento es gratuito y no tributa ante Hacienda.',
        tip: 'Consulta en CoreBalance el importe exacto en euros a traspasar para volver a tu asset allocation original al céntimo.'
      },
      by_sell_buy: {
        title: 'Rebalanceo recomendado por venta/compra (Vigila comisiones)',
        color: '#f59e0b',
        desc: 'Tu desvío es significativo y tu capital está en ETFs. Al no disfrutar de la regla del traspaso, deberás vender una parte de tus ETFs ganadores (pagando impuestos por las plusvalías realizadas) para comprar los ETFs rezagados.',
        tip: 'Agrupa tus operaciones en una única sesión para minimizar el impacto de las comisiones de compraventa de tu bróker.'
      }
    }
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

  // Estado del cuestionario
  let currentStep = $state(0);
  let timeAnswer = $state<string | null>(null);
  let driftAnswer = $state<string | null>(null);
  let aportationAnswer = $state<string | null>(null);
  let assetTypeAnswer = $state<string | null>(null);

  // Cálculo del veredicto dinámico
  let verdict = $derived.by(() => {
    if (currentStep < 4) return null;

    if (driftAnswer === 'drift_low') {
      // Regla de calendario: aunque la deriva sea baja, más de 12 meses sin
      // revisar merece al menos un rebalanceo por aportación.
      return timeAnswer === 'more_12' ? t.verdicts.by_time : t.verdicts.no_rebalance;
    }
    if (driftAnswer === 'drift_medium' && aportationAnswer === 'aport_yes') return t.verdicts.by_contribution;
    if (assetTypeAnswer === 'type_funds') return t.verdicts.by_transfer;
    return t.verdicts.by_sell_buy;
  });

  function selectOption(value: string) {
    if (currentStep === 0) timeAnswer = value;
    else if (currentStep === 1) driftAnswer = value;
    else if (currentStep === 2) aportationAnswer = value;
    else if (currentStep === 3) assetTypeAnswer = value;
    currentStep += 1;
  }

  function goBack() {
    if (currentStep > 0) currentStep -= 1;
  }

  function restart() {
    currentStep = 0;
    timeAnswer = null;
    driftAnswer = null;
    aportationAnswer = null;
    assetTypeAnswer = null;
  }
</script>

<SeoHead
  title={metaTitle}
  description={metaDesc}
  path={$page.url.pathname}
  {lang}
  image={pageOgImage('checklist', lang)}
  jsonLd={breadcrumbSchema}
/>

<div class="checklist-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto($link('/'))} />

  <main class="checklist-container">
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href={$link('/')}>🏠 {t.breadcrumb.home}</a>
      <span class="breadcrumb-sep">›</span>
      <a href={$link('/herramientas')}>{t.breadcrumb.tools}</a>
      <span class="breadcrumb-sep">›</span>
      <span aria-current="page">{t.breadcrumb.tool}</span>
    </nav>
    <header class="checklist-header">
      <span class="category-badge">{t.badge}</span>
      <h1 class="gradient-text">{t.title}</h1>
      <p class="subtitle">{t.subtitle}</p>
    </header>

    <div class="questionnaire-card card-glass">
      <!-- CUESTIONARIO EN CURSO -->
      {#if currentStep < 4}
        <!-- Barra de progreso -->
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: {(currentStep / 4) * 100}%"></div>
        </div>

        <div class="step-content">
          <p class="step-indicator">{t.stepIndicator(currentStep + 1)}</p>
          <h2>{t.steps[currentStep].title}</h2>
          <p class="step-desc">{t.steps[currentStep].desc}</p>

          <div class="options-list">
            {#each t.steps[currentStep].options as option}
              <button class="option-btn" onclick={() => selectOption(option.value)}>
                {option.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Botones de navegación inferior -->
        <div class="nav-buttons">
          {#if currentStep > 0}
            <button class="btn-back" onclick={goBack}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="back-arrow">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              {t.back}
            </button>
          {/if}
        </div>

      <!-- PANTALLA DE VEREDICTO FINAL -->
      {:else if verdict}
        <div class="verdict-content" style="--verdict-color: {verdict.color}">
          <div class="verdict-icon-container">
            <svg class="verdict-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          
          <h2 class="verdict-title">{verdict.title}</h2>
          <p class="verdict-desc">{verdict.desc}</p>

          <div class="tip-box">
            <h4>{t.tipLabel}</h4>
            <p>{verdict.tip}</p>
          </div>

          <div class="action-buttons">
            <button class="btn-primary" onclick={() => goto($link('/dashboard'))}>{t.goToCalc}</button>
            <button class="btn-secondary" onclick={restart}>{t.restart}</button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Enlaces cruzados a las demás herramientas -->
    <aside class="other-tools">
      <h2>{t.otherToolsTitle}</h2>
      <ul>
        {#each t.otherTools as tool}
          <li><a href={$link(tool.path)}>{tool.label}</a></li>
        {/each}
      </ul>
    </aside>
  </main>

  <RelatedReading items={data.relatedReading} {lang} />

  <LandingFooter />
</div>

<style>
  .checklist-page {
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }

  .checklist-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 140px 1.5rem 80px;
  }

  .checklist-header {
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
    .gradient-text { font-size: 2.25rem; }
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 1.2rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .card-glass {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 28px;
    padding: 3rem;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  @media (max-width: 768px) {
    .card-glass { padding: 1.75rem; }
  }

  .progress-bar-container {
    width: 100%;
    height: 6px;
    background: var(--bg-card-hover);
    border-radius: 9999px;
    overflow: hidden;
    margin-bottom: 2.5rem;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-blue) 0%, #8b5cf6 100%);
    border-radius: 9999px;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step-indicator {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--accent-blue-ink);
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .step-content h2 { font-size: 1.8rem; font-weight: 800; margin-top: 0; margin-bottom: 0.75rem; line-height: 1.3; }

  .step-desc { color: var(--text-muted); font-size: 1rem; margin-bottom: 2rem; line-height: 1.6; }

  .options-list { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2.5rem; }

  .option-btn {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    color: var(--text-primary);
    font-size: 1.05rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .option-btn:hover { background: var(--bg-card-hover); border-color: rgba(59, 130, 246, 0.3); transform: translateY(-1px); }
  .option-btn:active { transform: scale(0.99); }

  .nav-buttons { display: flex; justify-content: flex-start; }

  .btn-back {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s ease;
  }

  .btn-back:hover { color: var(--text-primary); }
  .back-arrow { transition: transform 0.2s ease; }
  .btn-back:hover .back-arrow { transform: translateX(-3px); }

  .verdict-content { text-align: center; }

  .verdict-icon-container { color: var(--verdict-color); margin-bottom: 1.5rem; display: flex; justify-content: center; }
  .verdict-icon { width: 64px; height: 64px; }

  .verdict-title { font-size: 2.2rem; font-weight: 800; margin-top: 0; margin-bottom: 1rem; letter-spacing: -0.02em; color: var(--text-primary); line-height: 1.2; }
  .verdict-desc { font-size: 1.15rem; line-height: 1.7; color: var(--text-secondary); max-width: 650px; margin: 0 auto 2.5rem; }

  .tip-box {
    background: var(--bg-card);
    border-left: 4px solid var(--verdict-color);
    border-radius: 0 16px 16px 0;
    padding: 1.5rem 2rem;
    text-align: left;
    margin-bottom: 3rem;
  }

  .tip-box h4 { margin-top: 0; margin-bottom: 0.5rem; font-size: 1.05rem; font-weight: 700; color: var(--verdict-color); }
  .tip-box p { margin: 0; font-size: 0.95rem; line-height: 1.6; color: var(--text-secondary); }

  .action-buttons { display: flex; justify-content: center; gap: 1rem; }

  @media (max-width: 600px) {
    .action-buttons { flex-direction: column; gap: 1rem; }
  }

  .btn-primary {
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

  .btn-secondary {
    background: var(--bg-card-hover);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
    padding: 0.85rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }

  /* Otras herramientas */
  .other-tools {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    padding: 1.5rem 2rem;
    margin-top: 3rem;
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
