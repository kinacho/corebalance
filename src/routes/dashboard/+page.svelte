<script lang="ts">
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
  import LookThroughMap from "$lib/components/LookThroughMap.svelte";
  import Projections from "$lib/components/Projections.svelte";
  import CrisisSimulator from "$lib/components/CrisisSimulator.svelte";
  import PaypalDonation from "$lib/components/PaypalDonation.svelte";

  import { portfolio } from "$lib/stores/portfolio.svelte";
  import { ui } from "$lib/stores/ui.svelte";

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

  const detailedChartData = $derived.by(() => {
    const allPositions = [
      ...portfolio.portfolioState.positions,
      ...portfolio.stockState.positions,
      ...portfolio.satelliteState.positions,
    ];
    return {
      labels: allPositions.map((p: PortfolioPosition) => p.asset.name),
      values: allPositions.map((p: PortfolioPosition) =>
        portfolio.globalCapital > 0
          ? (p.totalValue / portfolio.globalCapital) * 100
          : 0,
      ),
      colors: allPositions.map((p: PortfolioPosition) => p.asset.color),
    };
  });

  const coreActualChartData = $derived.by(() => {
    const positions = portfolio.portfolioState.positions;
    const total = portfolio.portfolioState.totalCapital;
    return {
      labels: positions.map((p: PortfolioPosition) => p.asset.name),
      values: positions.map((p: PortfolioPosition) =>
        total > 0 ? (p.totalValue / total) * 100 : 0,
      ),
      colors: positions.map((p: PortfolioPosition) => p.asset.color),
    };
  });

  // --- Lifecycle ---
  onMount(() => {
    portfolio.fetchPrices();

    // Cargar componentes pesados bajo demanda
    import("$lib/components/ManageAssets.svelte").then(m => ManageAssets = m.default);
    import("$lib/components/OnboardingTour.svelte").then(m => OnboardingTour = m.default);
    import("$lib/components/DemoRibbon.svelte").then(m => DemoRibbon = m.default);

    // Listener para el Tour (cambio automático de pestañas en móvil)
    const handleTourStep = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.target) {
        if (customEvent.detail.target === 'manage') {
          showManageAssets = true;
          return;
        }

        if (customEvent.detail.target === 'close-all') {
          showManageAssets = false;
          return;
        }

        if (window.innerWidth < 1024) {
          // Cambiamos la pestaña pero indicamos que es por el tour para no disparar el scroll automático
          activeTab = customEvent.detail.target;
        }
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
            <div class="chart-box">
              <h4 class="chart-label">{$LL.db.chart_actual_strategy()}</h4>
              <DonutChart data={coreActualChartData} />
            </div>
            <div class="chart-box">
              <h4 class="chart-label">{$LL.db.chart_global_weight()}</h4>
              <DonutChart data={categoryChartData} />
            </div>
            <div class="chart-box">
              <h4 class="chart-label">{$LL.db.chart_global_detail()}</h4>
              <DonutChart data={detailedChartData} />
            </div>
            <!-- Ampliar un mapa lo lleva a ocupar la fila entera de la rejilla.
                 El estado vive aquí porque un elemento de rejilla no puede
                 salirse de su carril por sí solo, y los dos son excluyentes:
                 ampliar uno reduce el otro. -->
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
              <LookThroughMap showTitle={false} bind:expanded={lookThroughExpanded} />
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
              <img src="/logo.png?v=2" alt="CoreBalance" class="footer-logo" width="36" height="36" loading="lazy" />
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
    color: #f0f0ff;
  }

  .tour-repeat-btn {
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.15);
    color: #60a5fa;
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
    color: #93c5fd;
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
    color: #fca5a5;
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
    background: linear-gradient(to bottom, #05050a 60%, transparent);
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
    background: rgba(15, 15, 20, 0.95);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    padding: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    box-shadow:
      0 12px 32px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
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
    color: rgba(255, 255, 255, 0.3);
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
    color: #bfdbfe;
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
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 28px;
    margin-bottom: 2rem;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  }

  .charts-row-card {
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 28px;
    box-shadow: 0 12px 48px 0 rgba(0, 0, 0, 0.5);
    margin-bottom: 1.5rem;
    overflow: visible;
  }

  .charts-grid {
    display: grid;
    /* Cinco carriles: tres donuts y los dos mapas. */
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
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    margin: 0;
    font-weight: 700;
    letter-spacing: 0.05em;
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

  @media (min-width: 1024px) {
    .charts-mobile-hint {
      display: none;
    }
    .charts-row-card {
      margin-bottom: 2rem;
      padding: 2rem;
    }
    .charts-grid {
      /* Tres carriles fijos en vez de `auto-fit`: con cinco elementos hace falta
         saber cuántos hay por fila para que el mapa del subyacente pueda ocupar
         dos. A partir de 1024 px `auto-fit` daba tres de todas formas, así que
         para los donuts no cambia nada. */
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      overflow: visible;
      scroll-snap-type: none;
    }
    .chart-box {
      padding: 0;
      align-items: flex-start;
    }
    /* El mapa del subyacente ocupa dos de los tres carriles ya sin ampliar.
       Es el que tiene densidad —nueve regiones, once sectores— y en un solo
       carril dejaba la tercera columna de su fila completamente vacía: unos
       400 px de hueco muerto justo debajo de los donuts. En dos carriles pasa
       de 400 a 840 px, y como el mapa deriva todo de `contentWidth`, eso solo
       ya le enciende los nombres de región dentro de los rectángulos.

       El `:not(.is-wide)` es para que ampliar siga ganando: son la misma
       propiedad y ampliado tiene que llegar a los tres carriles. */
    .map-box.is-lookthrough:not(.is-wide) {
      grid-column: span 2;
    }
    /* Un mapa ampliado ocupa la fila entera: los tres carriles. Es lo que
       convierte «ampliar» en algo útil sin abrir ningún modal. */
    .map-box.is-wide {
      grid-column: 1 / -1;
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

  .footer-logo {
    width: 32px;
    height: 32px;
    filter: grayscale(0.5) opacity(0.8);
  }

  @media (min-width: 768px) {
    .footer-logo {
      width: 36px;
      height: 36px;
    }
  }

  .footer-title {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(to bottom, #fff, rgba(255, 255, 255, 0.4));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .footer-tagline {
    font-size: 0.9rem;
    color: rgba(160, 160, 200, 0.4);
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
    color: rgba(160, 160, 200, 0.4);
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
    color: #3b82f6;
    transform: translateY(-1px);
  }

  .link-separator {
    color: rgba(160, 160, 200, 0.15);
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
    background: rgba(255, 255, 255, 0.02);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.03);
  }

  .footer-legal p {
    font-size: 0.7rem;
    line-height: 1.6;
    color: rgba(160, 160, 200, 0.35);
    margin: 0;
    text-align: center;
  }

  .footer-copyright p {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(160, 160, 200, 0.25);
    margin: 0;
  }

  .changelog-badge-btn {
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.15);
    color: #10b981;
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
    color: #34d399;
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
