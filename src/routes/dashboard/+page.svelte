<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
  import { onMount } from "svelte";
  import Header from "$lib/components/Header.svelte";
  import PortfolioSection from "$lib/components/PortfolioSection.svelte";
  import HeroSummary from "$lib/components/HeroSummary.svelte";
  import DonutChart from "$lib/components/DonutChart.svelte";
  import HistoryChart from "$lib/components/HistoryChart.svelte";
  import PendingEditsPanel from "$lib/components/PendingEditsPanel.svelte";
  import TimingCost from "$lib/components/TimingCost.svelte";
  import RebalancePanel from "$lib/components/RebalancePanel.svelte";
  import TaxAwareRebalance from "$lib/components/TaxAwareRebalance.svelte";
  import DeviationTreemap from "$lib/components/DeviationTreemap.svelte";
import CompositionBars from "$lib/components/CompositionBars.svelte";
import DriftChart from "$lib/components/DriftChart.svelte";
  import LeccionDelPanel from "$lib/components/LeccionDelPanel.svelte";
  import LookThroughMap from "$lib/components/LookThroughMap.svelte";
  import ConcentracionPanel from "$lib/components/ConcentracionPanel.svelte";
  import Projections from "$lib/components/Projections.svelte";
  import CrisisSimulator from "$lib/components/CrisisSimulator.svelte";
  import PaypalDonation from "$lib/components/PaypalDonation.svelte";

  import { portfolio } from "$lib/stores/portfolio.svelte";
  import { ui } from "$lib/stores/ui.svelte";
import { formatCompactCurrency } from "$lib/chart-format";

  import { DASHBOARD_TABS, CATEGORY_COLORS, type TabId } from "$lib/constants";
  import { browser } from "$app/environment";
  import { goto, beforeNavigate } from "$app/navigation";
  import { navigating } from "$app/stores";
  import { LL } from '$lib/i18n/i18n-svelte';
  import type { PortfolioPosition } from '$lib/types';

  // --- Lazy Components ---
  let ManageAssets = $state<any>(null);
  let OnboardingTour = $state<any>(null);
  let DemoRibbon = $state<any>(null);

  // --- Auto-Exit Demo on Navigation ---
  beforeNavigate(({ to }) => {
    // Normalizamos la URL de destino para evitar cierres accidentales por barras finales
    const targetPath = to?.url.pathname.replace(/\/$/, '') || '';
    if (portfolio.isDemo && targetPath !== '/dashboard') {
      portfolio.exitDemo();
    }
  });

  // --- Gatekeeper Logic (Reverse) ---
  $effect(() => {
    // Pausamos evaluaciones si SvelteKit está en plena transición de páginas
    if ($navigating) return;

    if (portfolio.isInitialized) {
      const bypassLanding = browser ? sessionStorage.getItem('bypassLanding') === 'true' : false;
      
      // Espejo simétrico de la landing: permitimos estancia si es demo, usuario registrado o tiene activos
      const hasSession = portfolio.isDemo || portfolio.user || portfolio.hasAnyHoldings;
      
      if (!hasSession && !bypassLanding) {
        goto('/');
      } else if (browser && bypassLanding) {
        // Limpiamos el ticket una vez consumido para que sea de un solo uso
        sessionStorage.removeItem('bypassLanding');
      }
    }
  });

  // Efecto para el tema dinámico
  $effect(() => {
    const mood = portfolio.moodColor;
    const root = document.documentElement;

    // Generar variantes del color de humor para el degradado
    root.style.setProperty("--bg-mesh-1", `${mood}33`); // 20% opacidad
    root.style.setProperty("--bg-mesh-2", "#6366f122");
    root.style.setProperty("--bg-mesh-3", `${mood}22`);
    root.style.setProperty("--bg-mesh-4", "#3b82f622");
    root.style.setProperty("--bg-mesh-5", `${mood}22`);
    root.style.setProperty("--bg-mesh-6", "#f59e0b11");
  });

  // --- State ---
  let activeTab = $state<TabId>("assets");

  /**
   * Qué mapa está ampliado a la fila entera. Son excluyentes: dos mapas a fila
   * completa dejarían la rejilla en una sola columna y nadie querría eso.
   */
  let deviationExpanded = $state(false);
  let lookThroughExpanded = $state(false);

  $effect(() => {
    if (deviationExpanded) lookThroughExpanded = false;
  });
  $effect(() => {
    if (lookThroughExpanded) deviationExpanded = false;
  });

  /**
   * Los dos mapas van plegados en escritorio. No es ahorro de píxeles por sí
   * mismo: con cinco paneles del mismo peso visual la pestaña se lee como una
   * pared, y estos dos son los únicos que se consultan de vez en cuando y no de
   * un vistazo.
   *
   * Se pliega con CSS, nunca con `{#if}`: desmontarlos perdería el conmutador
   * región/sector del mapa del subyacente, igual que pasaría con los lienzos de
   * Chart.js. Ocultos su `contentWidth` baja a 0, que los dos mapas ya tratan
   * (`containerWidth > 0 ? … : 3.4`), y al abrirlos vuelven a medirse solos.
   *
   * En móvil no existe: ahí el carrusel ya da un carril por panel, así que
   * `.maps-fold` es `display: contents` y los mapas siguen siendo carriles.
   */
  let mapsOpen = $state(false);

  let showManageAssets = $state(false);
  let tabsEl = $state<HTMLElement | null>(null);
  let scrollAnchor = $state<HTMLElement | null>(null);
  let tourComponent = $state<any>(null);

  async function restartTour() {
    if (!OnboardingTour) {
      const m = await import("$lib/components/OnboardingTour.svelte");
      OnboardingTour = m.default;
      // Esperamos un pequeño delay para asegurar que el componente se monte y bindee 'tourComponent'
      await new Promise(r => setTimeout(r, 50));
    }
    if (tourComponent) {
      tourComponent.startTour();
    }
  }

  function switchTab(id: TabId) {
    activeTab = id;
    // Scroll up on mobile to the start of the section
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        if (scrollAnchor) {
          const headerHeight = 64;
          const elementPosition =
            scrollAnchor.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - headerHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }, 50);
    }
  }

  // --- Derived Data for Charts ---
  const categoryChartData = $derived.by(() => {
    const categories = [
      {
        name: `Core (${portfolio.targetLabel})`,
        value: portfolio.portfolioState.totalCapital,
        color: CATEGORY_COLORS.core,
      },
      {
        name: $LL.db.reclassify_stocks(),
        value: portfolio.stockState.totalCapital,
        color: CATEGORY_COLORS.stocks,
      },
      {
        name: $LL.db.reclassify_satellite(),
        value: portfolio.satelliteState.totalCapital,
        color: CATEGORY_COLORS.satellite,
      },
    ];
    const filtered = categories.filter((c) => c.value > 0);
    return {
      labels: filtered.map((c) => c.name),
      values: filtered.map((c) =>
        portfolio.globalCapital > 0
          ? (c.value / portfolio.globalCapital) * 100
          : 0,
      ),
      colors: filtered.map((c) => c.color),
    };
  });

  // `detailedChartData` y `coreActualChartData` vivían aquí y alimentaban los
  // dos donuts de activos. Los sustituye `CompositionBars`, que se construye a
  // partir del store con `buildComposition()` y no necesita que la página le
  // premastique nada.

  // --- Lifecycle ---
  onMount(() => {
    portfolio.fetchPrices();

    // Cargar componentes pesados bajo demanda
    import("$lib/components/ManageAssets.svelte").then(m => ManageAssets = m.default);
    import("$lib/components/OnboardingTour.svelte").then(m => OnboardingTour = m.default);
    import("$lib/components/DemoRibbon.svelte").then(m => DemoRibbon = m.default);

    /**
     * El tour pide que se prepare un destino: pestaña, panel o plegado.
     *
     * ⚠️ **`abrir-mapas` no es un adorno.** Los mapas del detalle nacen plegados en
     * escritorio y plegado es `display: none`, así que el paso que los explica medía
     * una caja de **0×0** y el globo señalaba a la esquina. Medido paso a paso antes
     * de arreglarlo. En móvil el plegado no existe —son carriles del carrusel— y esta
     * línea no hace nada, que es lo correcto.
     */
    const handleTourStep = (e: Event) => {
      const customEvent = e as CustomEvent;
      const target = customEvent.detail?.target;
      if (!target) return;

      if (target === 'manage') {
        showManageAssets = true;
        return;
      }

      if (target === 'close-all') {
        showManageAssets = false;
        return;
      }

      if (target === 'abrir-mapas') {
        mapsOpen = true;
        return;
      }

      // Los dos paneles plegables se abren solos: escuchan `abrir-rebalance` y
      // `abrir-tax`, que es donde vive su estado.

      /**
       * ⚠️ **Solo ids de pestaña reales.** Antes se asignaba `activeTab = target` con
       * cualquier cosa que llegara, y basta un target que no sea una pestaña para
       * dejar `activeTab` en un valor que no casa con ninguna: las tres secciones se
       * comparan con `!==`, así que **se ocultan todas a la vez** y la página se queda
       * en blanco bajo la cabecera. Lo provocó al primer intento el propio arreglo del
       * tutorial —mandando `abrir-rebalance`, que no es una pestaña— y se vio midiendo
       * el paso: caja 0×0 donde debía haber un panel.
       */
      if (window.innerWidth < 1024 && DASHBOARD_TABS.some((t) => t.id === target)) {
        // Cambiamos la pestaña pero indicamos que es por el tour para no disparar el scroll automático
        activeTab = target as TabId;
      }
    };

    window.addEventListener('tour-step', handleTourStep);

    return () => {
      window.removeEventListener('tour-step', handleTourStep);
    };
  });

  // Schema.org JSON-LD for Dashboard
  const dashboardSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CoreBalance",
    "operatingSystem": "Web, iOS, Android",
    "applicationCategory": "FinanceApplication",
    "description": "Herramienta de gestión y rebalanceo de carteras de inversión para fondos indexados y ETFs.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR"
    },
    "screenshot": "https://corebalance.app/og-image.png"
  };
  const dashboardSchemaString = JSON.stringify(dashboardSchema);
</script>


<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
  <title>{$LL.seo.title()}</title>
  <meta name="description" content={$LL.seo.description()} />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://corebalance.app/" />
  <meta property="og:title" content={$LL.seo.og_title()} />
  <meta property="og:description" content={$LL.seo.og_description()} />
  <meta property="og:image" content="https://corebalance.app/og-image.png" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://corebalance.app/" />
  <meta property="twitter:title" content={$LL.seo.og_title()} />
  <meta property="twitter:description" content={$LL.seo.og_description()} />
  <meta property="twitter:image" content="https://corebalance.app/og-image.png" />

  {@html `<script type="application/ld+json">${dashboardSchemaString}</script>`}
</svelte:head>

{#if portfolio.isInitialized}

  {#if showManageAssets && ManageAssets}
    <ManageAssets onClose={() => (showManageAssets = false)} />
  {/if}

  <div class="app-container" class:privacy-mode={portfolio.isPrivate}>
    {#if DemoRibbon}
      <DemoRibbon />
    {/if}
    <Header
      timestamp={portfolio.timestamp}
      onTogglePrivacy={() => portfolio.togglePrivacy()}
      onManageAssets={() => (showManageAssets = true)}
    />

    {#if OnboardingTour}
      <OnboardingTour bind:this={tourComponent} />
    {/if}

    <main class="main-content">

      <!-- Notifications Area -->
      {#if portfolio.error}
        <div class="error-banner" role="alert">
          <span class="error-icon">⚠️</span>
          <div class="error-text">
            <strong>{$LL.db.error_connection_title()}</strong>
            <p>{portfolio.error}</p>
          </div>
          <button class="error-retry" onclick={() => portfolio.fetchPrices()}
            >{$LL.common.retry()}</button
          >
        </div>
      {/if}

      <!-- Hero Stats Section -->
      <HeroSummary />

      <!-- Navigation (Mobile Only) -->
      <div bind:this={scrollAnchor}></div>
      <div class="tabs-sticky-nav" bind:this={tabsEl}>
        <nav class="mobile-tabs">
          {#each DASHBOARD_TABS as tab}
            <button
              class="tab-btn"
              class:active={activeTab === tab.id}
              onclick={() => switchTab(tab.id)}
            >
              <!-- Iconos de trazo, no emojis: un emoji lo dibuja la fuente del
                   sistema, cambia de estilo en cada plataforma y no hereda el
                   color del estado activo. Los `icon` de `DASHBOARD_TABS` siguen
                   ahí porque los usa el tour. -->
              <span class="tab-icon" aria-hidden="true">
                {#if tab.id === "assets"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
                  </svg>
                {:else if tab.id === "rebalance"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                {:else}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 17l5-5 4 3 8-8" />
                    <path d="M14 6h6v6" />
                  </svg>
                {/if}
              </span>
              <span class="tab-label">
                {#if tab.id === 'assets'}
                  {$LL.db.tab_assets()}
                {:else if tab.id === 'rebalance'}
                  {$LL.db.tab_rebalance()}
                {:else}
                  {$LL.db.tab_charts()}
                {/if}
              </span>
            </button>
          {/each}
        </nav>
      </div>

      <!-- History Chart Section -->
      <section
        class="history-section card"
        class:tab-hidden={activeTab !== "charts"}
      >
        <div class="section-header">
          <h3 class="section-title">{$LL.db.chart_historic_title()}</h3>
        </div>
        <PendingEditsPanel />
        <HistoryChart />
        <TimingCost />
      </section>

      <!-- Charts Row (Desktop: Horizontal, Mobile: Swipe Carousel) -->
      <section
        class="desktop-charts-section"
        class:tab-hidden={activeTab !== "charts"}
      >
        <div class="charts-row-card card">
          <div class="charts-mobile-hint">
            <span>{$LL.db.swipe_hint()}</span>
          </div>
          <!-- Los dos mapas viven aquí, dentro del carrusel, y no en una sección
               propia: en móvil como tarjetas a pantalla completa ocupaban dos
               pantallas de scroll, y deslizándose son dos paneles más.
               Siempre montados como el resto, sin `{#if}`: el selector
               región/sector del mapa del subyacente perdería su estado en cada
               cambio de pestaña. -->
          <div class="charts-grid">
            <!--
              ⚠️ Aquí había tres donuts y ahora hay uno. «Estrategia actual» y
              «Detalle global» eran los mismos activos con distinto denominador,
              y con seis o más porciones el anillo no hacía ningún trabajo: nadie
              lee 13,02 % contra 10,98 % de dos arcos, se lee de la leyenda —una
              leyenda que además truncaba dos fondos de la misma gestora al mismo
              texto—. Los sustituye `CompositionBars`, que además tiene sitio para
              la marca del objetivo. El de categorías se queda: tres porciones es
              justo donde un donut sí funciona.
            -->
            <div class="chart-box is-composition">
              <h4 class="chart-label">{$LL.db.composition_title()}</h4>
              <p class="chart-sub">
                {portfolio.portfolioState.positions.some((p) => p.asset.targetWeight > 0)
                  ? $LL.db.composition_subtitle()
                  : $LL.db.composition_subtitle_no_targets()}
              </p>
              <CompositionBars />
            </div>
            <div class="chart-box">
              <h4 class="chart-label">{$LL.db.chart_global_weight()}</h4>
              <DonutChart
                data={categoryChartData}
                center={{
                  label: $LL.dashboard.total_value_label(),
                  // Compacto y no el importe exacto: el hueco tiene 119 px de
                  // diámetro y `116.052,36 €` se sale por los dos lados. La cifra
                  // al céntimo ya está en el hero, justo encima.
                  value: formatCompactCurrency(portfolio.globalCapital, ui.baseCurrency),
                  blur: true
                }}
              />
            </div>
            <!--
              La deriva: cuánto tiempo llevas fuera de banda. El mapa de
              desviación contesta esa pregunta para hoy; ésta la contesta para
              los últimos meses, que es lo que permite ver si los rebalanceos
              que hiciste sirvieron de algo.
            -->
            <div class="chart-box is-drift">
              <h4 class="chart-label">{$LL.db.drift_title()}</h4>
              <p class="chart-sub">{$LL.db.drift_subtitle()}</p>
              <LeccionDelPanel panel="drift" />
              <DriftChart />
            </div>
            <!--
              Los dos mapas, plegados en escritorio tras una sola línea. En
              móvil este envoltorio es `display: contents`, así que los dos
              vuelven a ser carriles del carrusel y la cabecera no se dibuja.
            -->
            <div class="maps-fold" class:is-open={mapsOpen}>
              <button
                type="button"
                class="maps-fold-head"
                onclick={() => (mapsOpen = !mapsOpen)}
                aria-expanded={mapsOpen}
                aria-controls="maps-row"
              >
                <span class="maps-fold-title">{$LL.db.maps_fold_title()}</span>
                <span class="maps-fold-sub">{$LL.db.maps_fold_sub()}</span>
                <span class="maps-fold-cta">
                  {mapsOpen ? $LL.db.maps_fold_close() : $LL.db.maps_fold_open()}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              <!-- Ampliar un mapa lo lleva a ocupar la fila entera de la rejilla.
                   El estado vive aquí porque un elemento de rejilla no puede
                   salirse de su carril por sí solo, y los dos son excluyentes:
                   ampliar uno reduce el otro. -->
              <div class="maps-row" id="maps-row">
                <div
                  id="tour-maps"
                  class="chart-box map-box"
                  class:is-wide={deviationExpanded}
                >
                  <h4 class="chart-label">{$LL.treemap.title()}</h4>
                  <DeviationTreemap showTitle={false} bind:expanded={deviationExpanded} />
                </div>
                <div
                  class="chart-box map-box is-lookthrough"
                  class:is-wide={lookThroughExpanded}
                >
                  <h4 class="chart-label">{$LL.lookthrough.title()}</h4>
                  <!-- El enlace a su lección lo pone `MapFrame`, para que quede debajo del
                       subtítulo del mapa y no entre este título y aquél. -->
                  <LookThroughMap showTitle={false} bind:expanded={lookThroughExpanded} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Content Grid -->
      <div class="dashboard-grid">
        <!-- Assets Column -->
        <section id="tour-portfolio-categories" class="assets-section" class:tab-hidden={activeTab !== "assets"}>
          <PortfolioSection
            title={`${$LL.db.reclassify_core()} (${portfolio.targetLabel})`}
            portfolioState={portfolio.portfolioState}
            loading={portfolio.loading}
            skeletonCount={portfolio.coreAssets.length || 3}
          />

          <PortfolioSection
            title={$LL.db.reclassify_stocks()}
            portfolioState={portfolio.stockState}
            loading={portfolio.loading}
            skeletonCount={portfolio.stockAssets.length || 2}
            marginTop={true}
          />

          <PortfolioSection
            title={$LL.db.reclassify_satellite()}
            portfolioState={portfolio.satelliteState}
            loading={portfolio.loading}
            skeletonCount={portfolio.satelliteAssets.length || 2}
            marginTop={true}
          />
        </section>

        <!-- Side Column: Tools & Charts -->
        <aside class="sidebar">
          <div class="sidebar-item" class:tab-hidden={activeTab !== "rebalance"}>
            <RebalancePanel
              result={portfolio.rebalanceResult}
              contribution={portfolio.contribution}
              onContributionChange={(val) => portfolio.updateContribution(val)}
            />
          </div>

          <div class="sidebar-item" class:tab-hidden={activeTab !== "rebalance"}>
            <TaxAwareRebalance />
          </div>

          <!--
            El solapamiento de toda la cartera: qué parte del dinero acaba en la
            misma empresa contando los fondos y las acciones a la vez. Va aquí y no
            en el mapa del subyacente porque mide sobre el patrimonio total,
            mientras que aquel mide sobre lo analizado.
          -->
          <div class="sidebar-item" class:tab-hidden={activeTab !== "rebalance"}>
            <ConcentracionPanel />
          </div>

          <div class="sidebar-item" class:tab-hidden={activeTab !== "rebalance"}>
            <Projections />
          </div>

          <div class="sidebar-item" class:tab-hidden={activeTab !== "rebalance"}>
            <CrisisSimulator />
          </div>
        </aside>

      </div>

      <footer class="app-footer">
        <div class="footer-divider"></div>
        
        <div class="footer-main">
          <div class="footer-brand">
            <div class="footer-logo-group">
              <Logo size={36} clase="footer-logo" />
              <span class="footer-title">CoreBalance</span>
            </div>
            <p class="footer-tagline">{$LL.db.footer_tagline()}</p>
            <div class="footer-links">
              <button 
                class="footer-link-btn" 
                onclick={() => { ui.supportType = 'bug'; ui.showSupportModal = true; }}
              >
                <span class="link-icon">🪲</span> {$LL.footer.report_bug()}
              </button>
              <span class="link-separator">•</span>
              <button 
                class="footer-link-btn" 
                onclick={() => { ui.supportType = 'contact'; ui.showSupportModal = true; }}
              >
                <span class="link-icon">✉️</span> {$LL.footer.contact()}
              </button>
            </div>

          </div>

          <div class="footer-donation">
            <PaypalDonation />
          </div>
        </div>

        <div class="footer-legal">
          <p>{@html $LL.db.legal_disclaimer()}</p>
        </div>

        <div class="footer-copyright">
          <p>© {new Date().getFullYear()} CoreBalance · {$LL.db.footer_made_with()} · <button class="changelog-badge-btn" onclick={() => ui.showChangelog = true} title="Ver historial de cambios">{$LL.db.changelog_trigger()}</button> · <button class="tour-repeat-btn" onclick={restartTour} title="Repetir tutorial de bienvenida">{$LL.db.tutorial_trigger()}</button></p>
        </div>
      </footer>
    </main>
  </div>
{/if}



<style>
  :global(body) {
    color: var(--text-primary);
  }

  .tour-repeat-btn {
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.15);
    color: var(--accent-blue-ink);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.12rem 0.45rem;
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    margin-left: 0.35rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    vertical-align: middle;
  }

  .tour-repeat-btn:hover {
    background: rgba(59, 130, 246, 0.18);
    border-color: rgba(59, 130, 246, 0.35);
    color: var(--accent-blue-ink);
    transform: translateY(-0.5px);
    box-shadow: 0 4px 10px rgba(59, 130, 246, 0.15);
  }

  .tour-repeat-btn:active {
    transform: translateY(0);
  }

  .app-container {
    min-height: 100dvh;
  }

  .main-content {
    max-width: 1140px;
    margin: 0 auto;
    padding: 0.75rem;
    padding-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .main-content {
      padding: 1.5rem;
      gap: 1.25rem;
    }
  }

  /* --- Error Banner --- */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 14px;
    color: var(--state-negative);
  }

  .error-text strong {
    display: block;
    font-size: 0.85rem;
  }
  .error-text p {
    margin: 0;
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .error-retry {
    margin-left: auto;
    padding: 0.5rem 0.85rem;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 10px;
    color: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  /* --- Navigation (Mobile) --- */
  .tabs-sticky-nav {
    position: sticky;
    top: 4rem; /* Debajo del header */
    z-index: 90;
    /*
     * ⚠️ **Era `#05050a` a fuego, que es el valor de `--bg-primary` del tema
     * oscuro.** Esta barra es `sticky` y va por encima del contenido, así que en
     * tema claro dejaba una banda casi negra pegada bajo la cabecera. Y solo
     * existe por debajo de 1024 px, de modo que ningún barrido a 1440 la había
     * pintado — el mismo defecto que `.landing-page`, escondido tras el corte.
     */
    background: linear-gradient(to bottom, var(--bg-primary) 60%, transparent);
    margin: -0.5rem -0.75rem 1.5rem -0.75rem;
    padding: 0.75rem 0.75rem 1.5rem 0.75rem;
    pointer-events: none; /* Dejar pasar clics fuera de los botones */
  }

  @media (min-width: 1024px) {
    .tabs-sticky-nav {
      display: none;
    }
  }

  .mobile-tabs {
    pointer-events: auto;
    display: flex;
    gap: 0.35rem;
    background: var(--bg-overlay);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    padding: 0.5rem;
    border: 1px solid var(--border-subtle);
    border-radius: 24px;
    /*
     * La sombra va por token: negro al 50 % da profundidad sobre fondo oscuro y
     * una mancha sucia sobre claro, y el filete `inset` blanco al 5 % sobre una
     * superficie clara no es nada. Misma razón que `--mockup-shadow`.
     */
    box-shadow: var(--pill-shadow);
  }

  .tab-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.6rem 0.25rem;
    border: none;
    border-radius: 14px;
    background: transparent;
    color: var(--text-faint);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .tab-icon {
    display: block;
    margin-bottom: 2px;
  }

  .tab-icon :global(svg) {
    width: 19px;
    height: 19px;
    display: block;
  }

  .tab-btn.active {
    background: rgba(37, 99, 235, 0.16);
    color: var(--accent-blue-ink);
  }

  /* --- Layout Grid --- */
  .dashboard-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .assets-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .tab-hidden {
    display: none;
  }

  .history-section {
    padding: 1.5rem;
    background: var(--bg-card);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border: 1px solid var(--border-subtle);
    border-radius: 28px;
    margin-bottom: 2rem;
    box-shadow: var(--card-shadow);
  }

  /*
   * `.section-title` no tenía ningún estilo aquí: el que existe vive dentro de
   * `PortfolioSection.svelte` y los estilos de Svelte están encapsulados, así
   * que esta cabecera se dibujaba con el `h3` por defecto del navegador.
   */
  .section-header {
    margin-bottom: 0.9rem;
  }

  .section-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .charts-row-card {
    padding: 1.5rem;
    background: var(--bg-card);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border: 1px solid var(--border-subtle);
    border-radius: 28px;
    box-shadow: var(--card-shadow);
    margin-bottom: 1.5rem;
    overflow: visible;
  }

  .charts-grid {
    display: grid;
    /* Cinco carriles: composición, donut de categorías, deriva y los dos mapas. */
    grid-template-columns: repeat(5, 100%);
    gap: 0;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  /* Los mapas necesitan todo el ancho del carril; los donuts van centrados. */
  .map-box {
    align-items: stretch;
    min-width: 0;
  }

  /* Cada carril a su alto natural: sin esto el carril más alto —el mapa del
     subyacente— estira a los tres donuts y quedan flotando en el centro de una
     caja enorme. */
  .charts-grid > .chart-box {
    align-self: start;
  }
  .charts-grid::-webkit-scrollbar {
    display: none;
  }

  .chart-box {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    scroll-snap-align: center;
    padding: 0 1rem;
  }

  .chart-label {
    font-size: 0.75rem;
    color: var(--text-faint);
    text-transform: uppercase;
    margin: 0;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .chart-sub {
    margin: -0.6rem 0 0;
    font-size: 0.72rem;
    color: var(--text-muted);
    text-align: center;
  }

  /* El panel de composición es una lista, no una figura centrada. */
  .chart-box.is-composition {
    align-items: stretch;
  }

  .chart-box.is-composition .chart-label,
  .chart-box.is-composition .chart-sub {
    text-align: left;
  }

  .charts-mobile-hint {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
    opacity: 0.5;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /*
   * En móvil el plegado no existe: `display: contents` disuelve los dos
   * envoltorios, así que los mapas vuelven a ser hijos directos de la rejilla y
   * siguen siendo los carriles 4 y 5 del carrusel. Un envoltorio de verdad los
   * habría metido a los dos en un solo carril.
   */
  .maps-fold,
  .maps-row {
    display: contents;
  }
  .maps-fold-head {
    display: none;
  }

  @media (min-width: 1024px) {
    .charts-mobile-hint {
      display: none;
    }
    /*
     * El histórico manda: a ancho completo, sin tarjeta y con el rótulo un
     * punto mayor que los tres paneles de abajo. Lo que lo separa de la fila
     * de gráficos es una línea, no un borde con sombra.
     */
    .history-section {
      padding: 0 0 2rem;
      background: none;
      border: 0;
      border-bottom: 1px solid var(--border-subtle);
      border-radius: 0;
      box-shadow: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
    .history-section .section-title {
      font-size: 1.05rem;
    }
    /*
     * En escritorio la fila de gráficos pierde su tarjeta.
     *
     * Eran cajas de cristal dentro de otra caja de cristal, y encima el
     * histórico era una tercera igual: la pestaña se leía como una pila de
     * losas del mismo peso. Sin marco, los paneles se apoyan en el fondo y los
     * separa una línea de pelo. En móvil la tarjeta se queda, porque ahí lo que
     * hay es un carrusel y el marco es lo que le da borde al carril.
     */
    .charts-row-card {
      margin-bottom: 2rem;
      padding: 0;
      background: none;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
    .charts-grid {
      /*
       * Los tres paneles de un vistazo, en una sola fila y con el mismo peso
       * visual: composición, categorías y deriva. Los carriles no son iguales
       * porque no lo son sus contenidos —la composición es una lista con
       * nombres de fondo, y con un tercio justo trunca «iShares Core MSCI W…»,
       * que es exactamente el defecto por el que se quitaron los donuts—.
       */
      grid-template-columns: 1.25fr 0.8fr 1.15fr;
      gap: 2rem;
      overflow: visible;
      scroll-snap-type: none;
    }
    .chart-box {
      padding: 0;
      align-items: flex-start;
    }
    .chart-box.is-drift {
      align-items: stretch;
    }
    .chart-box.is-drift .chart-label,
    .chart-box.is-drift .chart-sub {
      text-align: left;
    }
    /* Aquí vivía `.map-box.is-lookthrough:not(.is-wide) { grid-column: span 2 }`.
       Se quitó al pasar `.maps-row` a dos carriles iguales: con dos columnas,
       `span 2` mandaba el subyacente a ocupar la fila entera y dejaba el de
       desviación colgando en la de abajo, que es lo contrario de repartir. */

    /* Un mapa ampliado ocupa la fila entera. Es lo que convierte «ampliar» en
       algo útil sin abrir ningún modal, y sigue valiendo con dos carriles: el
       otro mapa se va a la fila siguiente a su ancho completo. */
    .map-box.is-wide {
      grid-column: 1 / -1;
    }

    /*
     * El plegado de los mapas. Deja de ser `display: contents` para pasar a ser
     * un elemento de rejilla de verdad, a fila completa, con su propia rejilla
     * de dos carriles iguales dentro: un mapa cada mitad.
     */
    .maps-fold {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      grid-column: 1 / -1;
      padding-top: 1.75rem;
      border-top: 1px solid var(--border-subtle);
    }
    .maps-row {
      display: grid;
      /*
       * Mitad y mitad. Antes el subyacente ocupaba dos de tres carriles porque
       * la fila de mapas convivía con los donuts y en un solo carril de 400 px
       * dejaba media fila muerta. Plegados en su propia fila esa razón ya no
       * existe: son dos paneles solos, así que repartirse el ancho a partes
       * iguales es lo natural, y el de desviación pasa de ~425 a ~650 px, que
       * es donde a sus cabeceras de bloque les sobra sitio.
       *
       * El subyacente sigue por encima de sus dos umbrales —`isNarrow` a
       * 460 px y el alto de `viewBox` a 560—, así que conserva los nombres de
       * región dentro de los rectángulos y su lienzo ancho.
       */
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
    }
    /* Cada mapa a su alto natural, como los carriles de arriba: sin esto el
       más alto estira al otro y deja el pequeño flotando en una caja enorme. */
    .maps-row > .chart-box {
      align-self: start;
    }
    /* Plegado se oculta, no se desmonta: desmontar perdería el conmutador
       región/sector, y los dos mapas ya toleran un ancho de 0. */
    .maps-fold:not(.is-open) .maps-row {
      display: none;
    }
    .maps-fold-head {
      display: flex;
      align-items: center;
      gap: 1rem;
      width: 100%;
      padding: 0.85rem 1.1rem;
      background: none;
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.18s ease,
        background 0.18s ease;
    }
    .maps-fold-head:hover {
      background: var(--bg-card);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .maps-fold-head:focus-visible {
      outline: 2px solid var(--accent-blue);
      outline-offset: 2px;
    }
    .maps-fold-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-secondary);
      flex-shrink: 0;
    }
    .maps-fold-sub {
      flex: 1;
      min-width: 0;
      font-size: 0.72rem;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .maps-fold-cta {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex-shrink: 0;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--accent-blue-ink);
    }
    .maps-fold-cta svg {
      width: 14px;
      height: 14px;
      transition: transform 0.18s ease;
    }
    .maps-fold.is-open .maps-fold-cta svg {
      transform: rotate(180deg);
    }

    .desktop-charts-section {
      display: block !important;
    }
  }

  /* --- Footer --- */
  .app-footer {
    padding: 4rem 1rem 6rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3rem;
    max-width: 1140px;
    margin: 0 auto;
  }

  .footer-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05) 50%, transparent);
  }

  .footer-main {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
    gap: 2.5rem;
    text-align: center;
  }

  @media (min-width: 768px) {
    .footer-main {
      grid-template-columns: 1.5fr 1fr;
      text-align: left;
      align-items: center;
    }
  }

  .footer-logo-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    justify-content: center;
  }

  @media (min-width: 768px) {
    .footer-logo-group {
      justify-content: flex-start;
    }
  }

  .footer-logo-group :global(.footer-logo) {
    width: 32px;
    height: 32px;
    filter: grayscale(0.5) opacity(0.8);
  }

  @media (min-width: 768px) {
    .footer-logo-group :global(.footer-logo) {
      width: 36px;
      height: 36px;
    }
  }

  .footer-title {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(to bottom, var(--text-primary), var(--text-muted));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .footer-tagline {
    font-size: 0.9rem;
    color: var(--text-faint);
    line-height: 1.5;
    max-width: 400px;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .footer-tagline {
      margin: 0;
    }
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
    justify-content: center;
  }

  @media (min-width: 768px) {
    .footer-links {
      justify-content: flex-start;
    }
  }

  .footer-link-btn {
    font-size: 0.8rem;
    color: var(--text-faint);
    text-decoration: none;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .footer-link-btn:hover {
    color: var(--accent-blue-ink);
    transform: translateY(-1px);
  }

  .link-separator {
    color: var(--text-faint);
    font-size: 0.8rem;
  }

  .link-icon {
    font-size: 0.9rem;
    opacity: 0.7;
  }

  .footer-legal {
    width: 100%;
    max-width: 800px;
    padding: 1.5rem;
    background: var(--bg-card);
    border-radius: 20px;
    border: 1px solid var(--border-subtle);
  }

  .footer-legal p {
    font-size: 0.7rem;
    line-height: 1.6;
    color: var(--text-faint);
    margin: 0;
    text-align: center;
  }

  .footer-copyright p {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-faint);
    margin: 0;
  }

  .changelog-badge-btn {
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.15);
    color: var(--accent-green-ink);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.12rem 0.45rem;
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    margin-left: 0.35rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    vertical-align: middle;
  }

  .changelog-badge-btn:hover {
    background: rgba(16, 185, 129, 0.18);
    border-color: rgba(16, 185, 129, 0.35);
    color: var(--state-positive);
    transform: translateY(-0.5px);
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15);
  }

  .changelog-badge-btn:active {
    transform: translateY(0);
  }

  /* --- Responsive Magic --- */

  /* Large Desktop */
  @media (min-width: 1024px) {
    .main-content {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      gap: 2.5rem;
    }

    /* Hide mobile tabs, show desktop layout */
    .mobile-tabs {
      display: none;
    }
    .tab-hidden {
      display: block !important;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(360px, 1fr);
      gap: 3rem;
      align-items: start;
    }

    .assets-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .sidebar {
      position: sticky;
      top: 6rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .sidebar-item.tab-hidden {
      display: flex !important;
    }
  }
</style>
