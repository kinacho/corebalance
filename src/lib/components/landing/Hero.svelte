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
      <div class="hero-mockup">
        <div class="mockup-header">
          <div class="dots"><span></span><span></span><span></span></div>
          <div class="address-bar">corebalance.app/dashboard</div>
        </div>
        <div class="mockup-body">
          <div class="mockup-sidebar">
            <div class="sidebar-item active"></div>
            <div class="sidebar-item"></div>
            <div class="sidebar-item"></div>
          </div>
          <div class="mockup-main">
            <div class="mockup-stats">
              <div class="stat-card">
                <span class="label">{$LL.landing.mock_capital()}</span>
                <span class="value">€45,280.00</span>
              </div>
              <div class="stat-card">
                <span class="label">{$LL.landing.mock_return()}</span>
                <span class="value success">+12.4%</span>
              </div>
            </div>
            <div class="mockup-list">
              <div class="list-header">
                <span>{$LL.dashboard.portfolio()}</span>
                <span>{$LL.landing.mock_status()}</span>
              </div>
              <div class="list-item">
                <div class="asset">
                  <div class="asset-icon">🌍</div>
                  <div class="asset-info">
                    <span class="name">MSCI World</span>
                    <span class="ticker">IWDA.L</span>
                  </div>
                </div>
                <span class="badge ok">{$LL.landing.mock_ok()}</span>
              </div>
              <div class="list-item warning">
                <div class="asset">
                  <div class="asset-icon">🌋</div>
                  <div class="asset-info">
                    <span class="name">Emerging Mkts</span>
                    <span class="ticker">EMIM.L</span>
                  </div>
                </div>
                <span class="rebalance-tag buy">{$LL.landing.mock_buy()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Floating elements -->
      <div class="floating-card c1">
        <div class="c-icon">⚖️</div>
        <div class="c-text">
          <span>{$LL.landing.mock_rebalance()}</span>
          <strong>100% Optimized</strong>
        </div>
      </div>
      <div class="floating-card c2">
        <div class="c-icon">🔒</div>
        <div class="c-text">
          <span>Privacy</span>
          <strong>Local-First</strong>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
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
      grid-template-columns: 1fr 1fr;
    }
  }

  .badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 100px;
    color: #60a5fa;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
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
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    font-size: 1.25rem;
    color: rgba(160, 160, 200, 0.7);
    line-height: 1.6;
    margin-bottom: 3rem;
    max-width: 540px;
  }

  .cta-group {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .main-ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .btn-lg {
    padding: 1.1rem 2.5rem;
    font-size: 1.1rem;
    border-radius: 16px;
    font-weight: 700;
  }

  .btn-primary {
    background: #3b82f6;
    color: #fff;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
  }

  .btn-demo {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1.1rem 2rem;
    border-radius: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-demo:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .btn-text {
    color: rgba(160, 160, 200, 0.6);
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 600;
    transition: color 0.2s ease;
  }

  .btn-text:hover {
    color: #fff;
  }

  /* Mockup Visuals */
  .hero-mockup-container {
    position: relative;
    width: 100%;
  }

  .hero-mockup {
    background: #0f0f14;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
    aspect-ratio: 16/10;
    display: flex;
    flex-direction: column;
  }

  .mockup-header {
    height: 36px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    padding: 0 1rem;
    gap: 1.5rem;
  }

  .dots {
    display: flex;
    gap: 0.4rem;
  }

  .dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
  }

  .address-bar {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    padding: 2px 1rem;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.3);
    flex-grow: 1;
    max-width: 240px;
    text-align: center;
  }

  .mockup-body {
    flex-grow: 1;
    display: grid;
    grid-template-columns: 50px 1fr;
  }

  .mockup-sidebar {
    border-right: 1px solid rgba(255, 255, 255, 0.03);
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .sidebar-item {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
  }

  .sidebar-item.active {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .mockup-main {
    padding: 1.5rem;
  }

  .mockup-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.02);
    padding: 0.75rem;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
  }

  .stat-card .label {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
  }

  .stat-card .value {
    font-size: 1rem;
    font-weight: 700;
  }

  .stat-card .value.success {
    color: #10b981;
  }

  .mockup-list {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    padding: 0.75rem;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.2);
    margin-bottom: 0.75rem;
    text-transform: uppercase;
  }

  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .asset {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .asset-icon {
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }

  .asset-info {
    display: flex;
    flex-direction: column;
  }

  .asset-info .name {
    font-size: 0.8rem;
    font-weight: 600;
  }

  .asset-info .ticker {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.3);
  }

  .badge.ok {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: none;
    font-size: 0.6rem;
    padding: 2px 8px;
    margin: 0;
  }

  .rebalance-tag.buy {
    background: #3b82f6;
    color: #fff;
    font-size: 0.6rem;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 800;
  }

  /* Floating cards */
  .floating-card {
    position: absolute;
    background: rgba(20, 20, 25, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.75rem 1rem;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .floating-card .c-icon {
    font-size: 1.5rem;
  }

  .floating-card .c-text {
    display: flex;
    flex-direction: column;
  }

  .floating-card .c-text span {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .floating-card .c-text strong {
    font-size: 0.85rem;
  }

  .c1 {
    top: -20px;
    right: -20px;
    animation: float 6s ease-in-out infinite;
  }

  .c2 {
    bottom: 20px;
    left: -40px;
    animation: float 8s ease-in-out infinite reverse;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .reveal {
    animation: fadeInUp 0.8s ease-out forwards;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
