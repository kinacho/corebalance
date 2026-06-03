<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { goto } from '$app/navigation';
  import { LL } from '$lib/i18n/i18n-svelte';

  let { onStart = () => {} } = $props();
</script>

<section class="hero">
  <div class="hero-content">
    <div class="reveal">
      <div class="badge">{$LL.landing.badge()}</div>
      <h1>
        {$LL.landing.hero_title_1()} <span class="text-gradient">{$LL.landing.hero_title_gradient()}</span>
      </h1>
      <p class="subtitle">
        {$LL.landing.hero_subtitle()}
      </p>

      <div class="cta-group">
        <div class="main-ctas">
          <button class="btn-primary btn-lg" onclick={() => onStart()} aria-label={$LL.nav.aria_start_free()}>
            {$LL.landing.cta_primary()}
          </button>
          <button class="btn-demo" onclick={() => { portfolio.loadDemoData(); goto('/dashboard'); }} aria-label={$LL.nav.aria_demo()}>
            {$LL.landing.cta_demo()}
          </button>
        </div>
        <div class="secondary-ctas">
          <a href="#how-it-works" class="btn-text" aria-label={$LL.nav.aria_cta_how()}>{$LL.landing.cta_how()}</a>
        </div>
      </div>
    </div>

    <div class="hero-mockup-container reveal">
      <!-- Glow ambiental detrás del mockup -->
      <div class="mockup-glow"></div>

      <div class="hero-mockup">
        <!-- Browser chrome -->
        <div class="mockup-header">
          <div class="dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="address-bar">
            <span class="lock-icon">🔒</span>
            corebalance.app/dashboard
          </div>
          <div class="header-actions">
            <div class="header-pill">Live</div>
          </div>
        </div>

        <div class="mockup-body">
          <!-- Sidebar -->
          <div class="mockup-sidebar">
            <div class="sidebar-logo">
              <div class="logo-dot"></div>
            </div>
            <div class="sidebar-nav">
              <div class="sidebar-item active" title="Dashboard">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </div>
              <div class="sidebar-item" title="Activos">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              </div>
              <div class="sidebar-item" title="Ajustes">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
              </div>
            </div>
          </div>

          <!-- Main content -->
          <div class="mockup-main">

            <!-- Top bar: capital + change inline -->
            <div class="mockup-topbar">
              <div class="topbar-left">
                <span class="topbar-label">{$LL.landing.mock_capital()}</span>
                <span class="topbar-value">€45,280<span class="topbar-cents">.00</span></span>
              </div>
              <div class="topbar-right">
                <div class="change-pill positive">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
                  +12.4%
                </div>
                <span class="topbar-sublabel">{$LL.landing.mock_return()}</span>
              </div>
            </div>

            <!-- Sparkline SVG decorativa -->
            <div class="sparkline-container">
              <svg class="sparkline" viewBox="0 0 280 48" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,38 C20,35 35,30 55,28 S85,22 105,18 S135,14 155,12 S185,10 205,8 S235,6 255,5 L280,3" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round"/>
                <path d="M0,38 C20,35 35,30 55,28 S85,22 105,18 S135,14 155,12 S185,10 205,8 S235,6 255,5 L280,3 L280,48 L0,48 Z" fill="url(#sparkGrad)"/>
                <!-- Dot en el último punto -->
                <circle cx="278" cy="3" r="3" fill="#3b82f6"/>
                <circle cx="278" cy="3" r="6" fill="#3b82f6" opacity="0.2"/>
              </svg>
              <div class="sparkline-labels">
                <span>-30d</span>
                <span>Hoy</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="section-divider">
              <span>{$LL.dashboard.portfolio()}</span>
              <span>{$LL.landing.mock_status()}</span>
            </div>

            <!-- Asset rows -->
            <div class="asset-row">
              <div class="asset-left">
                <div class="asset-icon blue">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div class="asset-info">
                  <span class="asset-name">MSCI World</span>
                  <span class="asset-ticker">IWDA.L · 68%</span>
                </div>
              </div>
              <div class="asset-right">
                <span class="asset-value">€30,790</span>
                <span class="status-pill ok">{$LL.landing.mock_ok()}</span>
              </div>
            </div>

            <div class="asset-row highlighted">
              <div class="asset-left">
                <div class="asset-icon emerald">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <div class="asset-info">
                  <span class="asset-name">Emerging Mkts</span>
                  <span class="asset-ticker">EMIM.L · 22%</span>
                </div>
              </div>
              <div class="asset-right">
                <span class="asset-value">€9,960</span>
                <span class="status-pill buy">{$LL.landing.mock_buy()}</span>
              </div>
            </div>

            <div class="asset-row">
              <div class="asset-left">
                <div class="asset-icon violet">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                </div>
                <div class="asset-info">
                  <span class="asset-name">Small Cap</span>
                  <span class="asset-ticker">ZPRX · 10%</span>
                </div>
              </div>
              <div class="asset-right">
                <span class="asset-value">€4,530</span>
                <span class="status-pill ok">{$LL.landing.mock_ok()}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Floating cards -->
      <div class="floating-card c1">
        <div class="c-icon-wrap green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="c-text">
          <span>{$LL.landing.mock_rebalance()}</span>
          <strong>100% Optimized</strong>
        </div>
      </div>

      <div class="floating-card c2">
        <div class="c-icon-wrap blue">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div class="c-text">
          <span>Privacy</span>
          <strong>Local-First</strong>
        </div>
      </div>

      <!-- Mini badge TER -->
      <div class="floating-card c3">
        <div class="c-text centered">
          <span>TER medio</span>
          <strong class="amber">0.18%</strong>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  /* ── Hero layout ── */
  .hero {
    padding: 120px 1.5rem 80px;
    position: relative;
    overflow: hidden;
  }

  .hero-content {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 4rem;
    align-items: center;
  }

  @media (min-width: 1024px) {
    .hero-content {
      grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.18fr);
      gap: 3rem;
      align-items: center;
    }
  }

  @media (min-width: 1280px) {
    .hero-content {
      max-width: 1360px;
      grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.22fr);
      gap: 3.5rem;
    }
  }

  /* ── Left copy ── */
  .badge {
    display: inline-block;
    padding: 0.4rem 1rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.25);
    border-radius: 100px;
    color: #60a5fa;
    font-size: 0.78rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    letter-spacing: 0.02em;
  }

  h1 {
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.04em;
    margin-bottom: 1.5rem;
    color: #fff;
  }

  .text-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #10b981 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    font-size: 1.1rem;
    color: rgba(160, 160, 200, 0.7);
    line-height: 1.7;
    margin-bottom: 3rem;
    max-width: 480px;
  }

  .cta-group { display: flex; flex-direction: column; gap: 1.5rem; }
  .main-ctas { display: flex; flex-wrap: wrap; gap: 1rem; }

  .btn-lg { padding: 1.1rem 2.5rem; font-size: 1.05rem; border-radius: 14px; font-weight: 700; }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    border: none;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.45);
  }

  .btn-demo {
    background: rgba(139, 92, 246, 0.1);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.3);
    padding: 1.1rem 2rem;
    border-radius: 14px;
    font-weight: 700;
    font-size: 1.05rem;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  }
  .btn-demo:hover {
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(139, 92, 246, 0.2);
  }

  .btn-text {
    color: rgba(160, 160, 200, 0.55);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    transition: color 0.2s ease;
  }
  .btn-text:hover { color: #fff; }

  /* ── Mockup container ── */
  .hero-mockup-container {
    position: relative;
    width: 100%;
    padding: 24px 40px 24px 16px;
  }

  /* Glow ambiental */
  .mockup-glow {
    position: absolute;
    inset: 10% 5%;
    background: radial-gradient(ellipse at 60% 40%, rgba(59, 130, 246, 0.18) 0%, transparent 70%),
                radial-gradient(ellipse at 30% 80%, rgba(16, 185, 129, 0.12) 0%, transparent 60%);
    filter: blur(40px);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Browser chrome ── */
  .hero-mockup {
    position: relative;
    z-index: 1;
    background: rgba(10, 10, 18, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 24px 48px rgba(0, 0, 0, 0.6),
      0 8px 16px rgba(0, 0, 0, 0.3);
    aspect-ratio: 16 / 10;
    display: flex;
    flex-direction: column;
  }

  .mockup-header {
    height: 38px;
    background: rgba(255, 255, 255, 0.025);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 12px;
    flex-shrink: 0;
  }

  .dots { display: flex; gap: 5px; }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
  .dot.red    { background: #ff5f57; }
  .dot.yellow { background: #febc2e; }
  .dot.green  { background: #28c840; }

  .address-bar {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    padding: 3px 10px;
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.35);
    flex-grow: 1;
    max-width: 220px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .lock-icon { font-size: 0.55rem; opacity: 0.5; }

  .header-actions { margin-left: auto; }
  .header-pill {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #34d399;
    font-size: 0.55rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 100px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ── Body grid ── */
  .mockup-body {
    flex: 1;
    display: grid;
    grid-template-columns: 44px 1fr;
    min-height: 0;
  }

  /* Sidebar */
  .mockup-sidebar {
    border-right: 1px solid rgba(255, 255, 255, 0.04);
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.1);
  }

  .sidebar-logo {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
  }
  .logo-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3b82f6;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.8);
  }

  .sidebar-nav { display: flex; flex-direction: column; align-items: center; gap: 8px; }

  .sidebar-item {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.2);
    transition: background 0.2s;
  }
  .sidebar-item.active {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.25);
    color: #60a5fa;
  }

  /* Main panel */
  .mockup-main {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  /* Topbar: capital */
  .mockup-topbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .topbar-left { display: flex; flex-direction: column; gap: 1px; }
  .topbar-label { font-size: 0.58rem; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.08em; }
  .topbar-value {
    font-size: 1.35rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .topbar-cents { font-size: 0.8rem; opacity: 0.5; font-weight: 600; }

  .topbar-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .topbar-sublabel { font-size: 0.55rem; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.06em; }

  .change-pill {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 700;
  }
  .change-pill.positive {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #34d399;
  }

  /* Sparkline */
  .sparkline-container {
    position: relative;
    height: 42px;
  }
  .sparkline {
    width: 100%;
    height: 38px;
    display: block;
  }
  .sparkline-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.52rem;
    color: rgba(255,255,255,0.2);
    padding: 0 2px;
  }

  /* Divider */
  .section-divider {
    display: flex;
    justify-content: space-between;
    font-size: 0.58rem;
    color: rgba(255, 255, 255, 0.2);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }

  /* Asset rows */
  .asset-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-radius: 9px;
    transition: background 0.2s;
  }
  .asset-row:hover { background: rgba(255,255,255,0.02); }
  .asset-row.highlighted { background: rgba(59, 130, 246, 0.04); }

  .asset-left { display: flex; align-items: center; gap: 9px; }
  .asset-right { display: flex; align-items: center; gap: 8px; }

  .asset-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .asset-icon.blue    { background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59,130,246,0.2); }
  .asset-icon.emerald { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16,185,129,0.2); }
  .asset-icon.violet  { background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139,92,246,0.2); }

  .asset-info { display: flex; flex-direction: column; gap: 1px; }
  .asset-name { font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.85); }
  .asset-ticker { font-size: 0.58rem; color: rgba(255,255,255,0.28); }

  .asset-value { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.5); }

  .status-pill {
    font-size: 0.57rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 100px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .status-pill.ok {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #34d399;
  }
  .status-pill.buy {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.35);
    color: #60a5fa;
  }

  /* ── Floating cards ── */
  .floating-card {
    position: absolute;
    z-index: 2;
    background: rgba(14, 14, 22, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.09);
    padding: 10px 14px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.03);
    white-space: nowrap;
  }

  .c-icon-wrap {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .c-icon-wrap.green  { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16,185,129,0.2); }
  .c-icon-wrap.blue   { background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59,130,246,0.2); }

  .c-text { display: flex; flex-direction: column; gap: 1px; }
  .c-text span    { font-size: 0.6rem; color: rgba(255,255,255,0.35); }
  .c-text strong  { font-size: 0.82rem; color: #fff; font-weight: 700; }
  .c-text.centered { align-items: center; }
  .c-text .amber  { color: #fbbf24; }

  .c1 { top: 0; right: 0; animation: float 6s ease-in-out infinite; }
  .c2 { bottom: 10px; left: -10px; animation: float 8s ease-in-out infinite reverse; }
  .c3 {
    top: 50%;
    right: -14px;
    transform: translateY(-50%);
    animation: float 7s ease-in-out infinite 1s;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .c3 { animation: float3 7s ease-in-out infinite 1s; }
  @keyframes float3 {
    0%, 100% { transform: translateY(-50%); }
    50% { transform: translateY(calc(-50% - 8px)); }
  }

  /* ── Entrance animation ── */
  .reveal {
    animation: fadeInUp 0.8s ease-out forwards;
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Desktop scaling overrides (≥1024px) ── */
  @media (min-width: 1024px) {
    .hero-mockup-container {
      padding: 28px 48px 28px 0;
      min-width: 0;
    }

    .hero-mockup {
      aspect-ratio: unset;
      min-height: 400px;
      border-radius: 20px;
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.05),
        0 40px 80px rgba(0, 0, 0, 0.7),
        0 12px 24px rgba(0, 0, 0, 0.4);
    }

    .mockup-header {
      height: 46px;
      padding: 0 16px;
      gap: 16px;
    }

    .dot { width: 11px; height: 11px; }

    .address-bar {
      font-size: 0.72rem;
      padding: 4px 14px;
      max-width: 260px;
    }

    .header-pill { font-size: 0.62rem; padding: 3px 9px; }

    /* Sidebar */
    .mockup-body { grid-template-columns: 54px 1fr; }

    .sidebar-logo { width: 32px; height: 32px; border-radius: 9px; }
    .logo-dot { width: 10px; height: 10px; }

    .sidebar-item { width: 34px; height: 34px; border-radius: 9px; }
    .sidebar-item svg { width: 16px; height: 16px; }

    /* Main panel */
    .mockup-main { padding: 18px 22px; gap: 11px; }

    /* Capital */
    .topbar-value { font-size: 2rem; }
    .topbar-cents { font-size: 1.1rem; }
    .topbar-label { font-size: 0.72rem; }
    .topbar-sublabel { font-size: 0.66rem; }

    .change-pill { font-size: 0.9rem; padding: 5px 12px; }
    .change-pill svg { width: 13px; height: 13px; }

    /* Sparkline */
    .sparkline-container { height: 58px; }
    .sparkline { height: 52px; }
    .sparkline-labels { font-size: 0.66rem; }

    /* Divider */
    .section-divider { font-size: 0.72rem; padding-bottom: 7px; }

    /* Asset rows */
    .asset-row { padding: 9px 12px; border-radius: 11px; }

    .asset-icon { width: 40px; height: 40px; border-radius: 10px; }
    .asset-icon svg { width: 18px; height: 18px; }

    .asset-name { font-size: 0.95rem; }
    .asset-ticker { font-size: 0.72rem; }
    .asset-value { font-size: 0.9rem; }

    .status-pill { font-size: 0.7rem; padding: 4px 10px; }

    /* Floating cards */
    .floating-card { padding: 14px 20px; border-radius: 16px; gap: 12px; }

    .c-icon-wrap { width: 40px; height: 40px; border-radius: 10px; }
    .c-icon-wrap svg { width: 20px; height: 20px; }

    .c-text span   { font-size: 0.74rem; }
    .c-text strong { font-size: 1.05rem; }

    .c1 { top: -12px; right: -12px; }
    .c2 { bottom: 16px; left: -20px; }
    .c3 { right: -20px; }

    /* Mockup glow más pronunciado en desktop */
    .mockup-glow {
      background:
        radial-gradient(ellipse at 60% 35%, rgba(59, 130, 246, 0.22) 0%, transparent 65%),
        radial-gradient(ellipse at 25% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 55%);
      filter: blur(50px);
    }
  }

  /* ── Large desktop (≥1280px) — aún más grande ── */
  @media (min-width: 1280px) {
    .hero-mockup-container {
      padding: 32px 56px 32px 0;
    }

    .hero-mockup {
      min-height: 460px;
      border-radius: 22px;
    }

    .mockup-header { height: 54px; padding: 0 20px; }
    .dot { width: 12px; height: 12px; }
    .address-bar { font-size: 0.8rem; max-width: 300px; padding: 5px 16px; }

    .mockup-body { grid-template-columns: 66px 1fr; }
    .sidebar-logo { width: 38px; height: 38px; }
    .sidebar-item { width: 40px; height: 40px; }
    .sidebar-item svg { width: 18px; height: 18px; }

    .mockup-main { padding: 24px 28px; gap: 14px; }

    .topbar-value { font-size: 2.35rem; }
    .topbar-cents { font-size: 1.25rem; }
    .topbar-label { font-size: 0.78rem; }

    .change-pill { font-size: 0.98rem; padding: 6px 14px; }

    .sparkline-container { height: 68px; }
    .sparkline { height: 62px; }

    .asset-row { padding: 11px 14px; }
    .asset-icon { width: 44px; height: 44px; }
    .asset-icon svg { width: 20px; height: 20px; }
    .asset-name { font-size: 1.02rem; }
    .asset-ticker { font-size: 0.76rem; }
    .asset-value { font-size: 0.96rem; }
    .status-pill { font-size: 0.74rem; padding: 4px 11px; }

    .floating-card { padding: 16px 22px; }
    .c-icon-wrap { width: 44px; height: 44px; }
    .c-text span { font-size: 0.78rem; }
    .c-text strong { font-size: 1.12rem; }

    .c1 { top: -14px; right: -14px; }
    .c2 { bottom: 18px; left: -24px; }
    .c3 { right: -24px; }
  }

  /* ── Extra large desktop (≥1536px) ── */
  @media (min-width: 1536px) {
    .hero-content {
      max-width: 1440px;
      gap: 4rem;
    }

    .hero-mockup {
      min-height: 500px;
    }

    .topbar-value { font-size: 2.55rem; }
    .sparkline-container { height: 74px; }
    .sparkline { height: 68px; }
  }

</style>