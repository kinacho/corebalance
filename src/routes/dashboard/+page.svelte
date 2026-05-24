<script lang="ts">
  import { onMount } from "svelte";
  import QRCode from "qrcode";
  import Header from "$lib/components/Header.svelte";
  import AssetCard from "$lib/components/AssetCard.svelte";
  import PortfolioSection from "$lib/components/PortfolioSection.svelte";
  import HeroSummary from "$lib/components/HeroSummary.svelte";
  import DonutChart from "$lib/components/DonutChart.svelte";
  import HistoryChart from "$lib/components/HistoryChart.svelte";
  import RebalancePanel from "$lib/components/RebalancePanel.svelte";
  import ManageAssets from "$lib/components/ManageAssets.svelte";
  import Projections from "$lib/components/Projections.svelte";
  import CrisisSimulator from "$lib/components/CrisisSimulator.svelte";
  import PaypalDonation from "$lib/components/PaypalDonation.svelte";

  import OnboardingTour from "$lib/components/OnboardingTour.svelte";
  import ChangelogModal from "$lib/components/ChangelogModal.svelte";
  import { portfolio } from "$lib/stores/portfolio.svelte";

  import { formatEUR, formatPercent } from "$lib/utils";
  import { DASHBOARD_TABS, type TabId } from "$lib/constants";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";

  // --- Gatekeeper Logic (Reverse) ---
  $effect(() => {
    if (portfolio.isInitialized) {
      const bypassLanding = browser ? sessionStorage.getItem('bypassLanding') === 'true' : false;
      const hasSession = portfolio.user && portfolio.hasAnyHoldings;
      
      if (!hasSession && !bypassLanding) {
        goto('/');
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
  let showManageAssets = $state(false);
  let showChangelog = $state(false);
  let tabsEl = $state<HTMLElement | null>(null);
  let scrollAnchor = $state<HTMLElement | null>(null);
  let tourComponent = $state<any>(null);

  function restartTour() {
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
        color: "#3b82f6",
      },
      {
        name: "Acciones",
        value: portfolio.stockState.totalCapital,
        color: "#10b981",
      },
      {
        name: "Conservadora",
        value: portfolio.satelliteState.totalCapital,
        color: "#f59e0b",
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
      labels: allPositions.map((p: any) => p.asset.name),
      values: allPositions.map((p: any) =>
        portfolio.globalCapital > 0
          ? (p.totalValue / portfolio.globalCapital) * 100
          : 0,
      ),
      colors: allPositions.map((p: any) => p.asset.color),
    };
  });

  const coreActualChartData = $derived.by(() => {
    const positions = portfolio.portfolioState.positions;
    const total = portfolio.portfolioState.totalCapital;
    return {
      labels: positions.map((p: any) => p.asset.name),
      values: positions.map((p: any) =>
        total > 0 ? (p.totalValue / total) * 100 : 0,
      ),
      colors: positions.map((p: any) => p.asset.color),
    };
  });

  // --- Lifecycle ---
  onMount(() => {
    portfolio.fetchPrices();

    // Listener para el Tour (cambio automático de pestañas en móvil)
    const handleTourStep = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.target) {
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
</script>


<svelte:head>
  <title>CoreBalance — Dashboard de Inversión y Rebalanceo de ETFs</title>
  <meta
    name="description"
    content="Gestiona tu cartera de fondos indexados y ETFs. Rebalanceo inteligente, seguimiento de patrimonio y herramientas para el inversor pasivo."
  />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://corebalance.app/" />
  <meta property="og:title" content="CoreBalance — Rebalancea tu cartera de ETFs y Fondos Indexados" />
  <meta property="og:description" content="La herramienta definitiva para el inversor indexado. Calcula tu rebalanceo en segundos y optimiza tu cartera." />
  <meta property="og:image" content="https://corebalance.app/og-image.png" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://corebalance.app/" />
  <meta property="twitter:title" content="CoreBalance — Rebalancea tu cartera de ETFs" />
  <meta property="twitter:description" content="Gestiona tu cartera de fondos indexados y ETFs con rebalanceo inteligente." />
  <meta property="twitter:image" content="https://corebalance.app/og-image.png" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
    {
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
    }
  </script>
</svelte:head>

{#if portfolio.isInitialized}

  {#if showManageAssets}
    <ManageAssets onClose={() => (showManageAssets = false)} />
  {/if}

  <div class="app-container" class:privacy-mode={portfolio.isPrivate}>
    <Header
      timestamp={portfolio.timestamp}
      onTogglePrivacy={() => portfolio.togglePrivacy()}
      onManageAssets={() => (showManageAssets = true)}
    />

    <OnboardingTour bind:this={tourComponent} />

    <main class="main-content">

      <!-- Notifications Area -->
      {#if portfolio.error}
        <div class="error-banner" role="alert">
          <span class="error-icon">⚠️</span>
          <div class="error-text">
            <strong>Error de conexión</strong>
            <p>{portfolio.error}</p>
          </div>
          <button class="error-retry" onclick={() => portfolio.fetchPrices()}
            >Reintentar</button
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
              <span class="tab-icon">{tab.icon}</span>
              <span class="tab-label">{tab.label}</span>
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
          <h3 class="section-title">Evolución del Patrimonio</h3>
        </div>
        <HistoryChart />
      </section>

      <!-- Charts Row (Desktop: Horizontal, Mobile: Swipe Carousel) -->
      <section
        class="desktop-charts-section"
        class:tab-hidden={activeTab !== "charts"}
      >
        <div class="charts-row-card card">
          <div class="charts-mobile-hint">
            <span>← Desliza para ver más →</span>
          </div>
          <div class="charts-grid">
            <div class="chart-box">
              <h4 class="chart-label">Estrategia actual</h4>
              <DonutChart data={coreActualChartData} />
            </div>
            <div class="chart-box">
              <h4 class="chart-label">Peso Global (Categorías)</h4>
              <DonutChart data={categoryChartData} />
            </div>
            <div class="chart-box">
              <h4 class="chart-label">Detalle Global</h4>
              <DonutChart data={detailedChartData} />
            </div>
          </div>
        </div>
      </section>

      <!-- Content Grid -->
      <div class="dashboard-grid">
        <!-- Assets Column -->
        <section id="tour-portfolio-categories" class="assets-section" class:tab-hidden={activeTab !== "assets"}>
          <PortfolioSection
            title={`Cartera Principal (${portfolio.targetLabel})`}
            portfolioState={portfolio.portfolioState}
            loading={portfolio.loading}
            skeletonCount={portfolio.coreAssets.length || 3}
          />

          <PortfolioSection
            title="Acciones Individuales"
            portfolioState={portfolio.stockState}
            loading={portfolio.loading}
            skeletonCount={portfolio.stockAssets.length || 2}
            marginTop={true}
          />

          <PortfolioSection
            title="Cartera Conservadora"
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
              <img src="/favicon.png" alt="CoreBalance" class="footer-logo" />
              <span class="footer-title">CoreBalance</span>
            </div>
            <p class="footer-tagline">Tu centro de mandos para una gestión de activos inteligente y equilibrada.</p>
          </div>

          <div class="footer-donation">
            <PaypalDonation />
          </div>
        </div>

        <div class="footer-legal">
          <p><strong>Aviso Legal:</strong> CoreBalance es una herramienta puramente informativa y educativa. No constituye asesoramiento financiero, de inversión ni fiscal. Los datos mostrados pueden sufrir retrasos o ser inexactos. El desarrollador no se hace responsable de posibles pérdidas financieras derivadas del uso de esta aplicación. Invierte siempre bajo tu propia responsabilidad.</p>
        </div>

        <div class="footer-copyright">
          <p>© {new Date().getFullYear()} CoreBalance · Hecho con ❤️ para la comunidad inversora · <button class="changelog-badge-btn" onclick={() => showChangelog = true} title="Ver historial de cambios">v1.5.0 🚀</button> · <button class="tour-repeat-btn" onclick={restartTour} title="Repetir tutorial de bienvenida">🎓 Tutorial</button></p>
        </div>
      </footer>
    </main>
  </div>

  {#if showChangelog}
    <ChangelogModal onClose={() => showChangelog = false} />
  {/if}
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
    font-size: 1.2rem;
    margin-bottom: 2px;
    transition: transform 0.3s ease;
  }

  .tab-btn.active {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
  }

  .tab-btn.active .tab-icon {
    transform: translateY(-2px) scale(1.1);
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
    grid-template-columns: repeat(3, 100%);
    gap: 0;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
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
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      overflow: visible;
      scroll-snap-type: none;
    }
    .chart-box {
      padding: 0;
      align-items: flex-start;
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
    width: 28px;
    height: 28px;
    filter: grayscale(0.5) opacity(0.8);
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
