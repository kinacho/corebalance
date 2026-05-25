<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { goto } from '$app/navigation';
  let { onStart = () => {} } = $props();
</script>

<section class="hero">
  <div class="hero-content">
    <div class="reveal">
      <span class="badge">Disponible para Web, iOS y Android</span>
      <h1>
        Rebalancea tu cartera de <span class="text-gradient">ETFs y Fondos Indexados</span>
      </h1>
      <p class="subtitle">
        La calculadora definitiva para el inversor indexado. Calcula tu rebalanceo en segundos, 
        optimiza tus aportaciones y mantén tu estrategia bajo control de forma local y privada.
      </p>
      <div class="cta-group">
        <button class="btn-primary btn-lg" onclick={() => onStart()} aria-label="Empezar gratis a rebalancear tu cartera con CoreBalance">
          Empezar gratis
        </button>
        <button class="btn-demo" onclick={() => { (portfolio as any).loadDemoData(); goto('/dashboard'); }} aria-label="Probar demo interactiva con una cartera indexada de ejemplo">
          Probar Demo Interactiva
        </button>
        <a href="#how-it-works" class="btn-text" aria-label="Ver explicación de cómo funciona el rebalanceo de carteras">Ver cómo funciona →</a>
      </div>
    </div>

    <div class="hero-mockup-container reveal">
      <div class="hero-mockup">
        <div class="mockup-header">
          <div class="dots"><span></span><span></span><span></span></div>
          <div class="address-bar">corebalance.app/dashboard</div>
        </div>
        <div class="mockup-content">
          <div class="mockup-sidebar">
            <div class="sidebar-item active"></div>
            <div class="sidebar-item"></div>
            <div class="sidebar-item"></div>
          </div>
          <div class="mockup-main">
            <div class="mockup-stats">
              <div class="mock-stat">
                <span class="label">Capital Total</span>
                <span class="value">45.230€</span>
              </div>
              <div class="mock-stat">
                <span class="label">Rentabilidad</span>
                <span class="value positive">+12.4%</span>
              </div>
              <div class="mock-stat highlight">
                <span class="label">Estado</span>
                <span class="value">Rebalancear</span>
              </div>
            </div>
            
            <div class="mockup-grid">
              <div class="mock-chart-container">
                <div class="mock-donut">
                  <div class="donut-segment" style="--color: #3b82f6; --offset: 0; --size: 70;"></div>
                  <div class="donut-segment" style="--color: #10b981; --offset: 70; --size: 20;"></div>
                  <div class="donut-segment" style="--color: #f59e0b; --offset: 90; --size: 10;"></div>
                  <div class="donut-center"></div>
                </div>
              </div>
              
              <div class="mock-assets">
                <div class="mock-asset">
                  <span class="icon">🌐</span>
                  <div class="info">
                    <span class="name">MSCI World</span>
                    <div class="progress"><div class="fill" style="width: 75%"></div></div>
                  </div>
                  <span class="badge buy">COMPRAR</span>
                </div>
                <div class="mock-asset">
                  <span class="icon">🇺🇸</span>
                  <div class="info">
                    <span class="name">S&P 500</span>
                    <div class="progress"><div class="fill" style="width: 92%"></div></div>
                  </div>
                  <span class="badge ok">OK</span>
                </div>
                <div class="mock-asset">
                  <span class="icon">🧾</span>
                  <div class="info">
                    <span class="name">Bonds</span>
                    <div class="progress"><div class="fill" style="width: 110%"></div></div>
                  </div>
                  <span class="badge sell">VENDER</span>
                </div>
              </div>
            </div>
          </div>
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
    font-size: clamp(1.1rem, 2vw, 1.25rem);
    color: rgba(160, 160, 200, 0.6);
    line-height: 1.6;
    margin-bottom: 2.5rem;
    max-width: 540px;
  }

  .cta-group {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: center;
  }

  .btn-lg {
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }

  .btn-primary {
    background: var(--accent-blue, #3b82f6);
    color: white;
    border: none;
    border-radius: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  }

  .btn-demo {
    background: rgba(139, 92, 246, 0.1);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.3);
    padding: 1rem 2rem;
    border-radius: 14px;
    font-weight: 700;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-demo:hover {
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(139, 92, 246, 0.2);
  }

  .btn-text {
    color: #fff;
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s ease;
  }

  .btn-text:hover {
    opacity: 0.8;
  }

  /* --- Mockup Refined --- */
  .hero-mockup-container {
    perspective: 1200px;
    position: relative;
  }

  .hero-mockup {
    background: #0f0f14;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.8), 0 0 50px rgba(59, 130, 246, 0.1);
    overflow: hidden;
    transform: rotateX(8deg) rotateY(-15deg) rotateZ(2deg);
    transition: transform 0.8s cubic-bezier(0.2, 0, 0.2, 1);
    max-width: 580px;
    margin: 0 auto;
  }

  .hero-mockup:hover {
    transform: rotateX(2deg) rotateY(-5deg) rotateZ(0deg) scale(1.02);
  }

  @media (max-width: 1024px) {
    .hero-mockup {
      transform: none;
      max-width: 100%;
    }
  }

  .mockup-header {
    height: 48px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    padding: 0 1.25rem;
    gap: 1.5rem;
  }

  .dots {
    display: flex;
    gap: 8px;
  }

  .dots span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
  }

  .address-bar {
    flex: 1;
    height: 28px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Monaco', monospace;
  }

  .mockup-content {
    height: 440px;
    display: flex;
  }

  .mockup-sidebar {
    width: 60px;
    background: rgba(255, 255, 255, 0.01);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .sidebar-item {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
  }

  .sidebar-item.active {
    background: #3b82f6;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
  }

  .mockup-main {
    flex: 1;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent);
  }

  .mockup-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .mock-stat {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mock-stat .label {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    font-weight: 700;
  }

  .mock-stat .value {
    font-size: 0.9rem;
    font-weight: 800;
    color: #fff;
  }

  .mock-stat.highlight .value {
    color: #f59e0b;
  }

  .mock-stat .positive {
    color: #10b981;
  }

  .mockup-grid {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 1.5rem;
    align-items: center;
  }

  .mock-chart-container {
    display: flex;
    justify-content: center;
  }

  .mock-donut {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    position: relative;
    background: conic-gradient(
      var(--color) calc(var(--offset) * 1%), 
      var(--color) calc((var(--offset) + var(--size)) * 1%),
      transparent 0
    );
  }

  /* Simplified donut logic with layers */
  .mock-donut {
    background: conic-gradient(
      #3b82f6 0% 70%,
      #10b981 70% 90%,
      #f59e0b 90% 100%
    );
  }

  .donut-center {
    position: absolute;
    inset: 25px;
    background: #0f0f14;
    border-radius: 50%;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
  }

  .mock-assets {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .mock-asset {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    transition: background 0.2s;
  }

  .mock-asset .icon {
    font-size: 1.25rem;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.2);
    border-radius: 8px;
  }

  .mock-asset .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .mock-asset .name {
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
  }

  .mock-asset .progress {
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
    width: 100%;
  }

  .mock-asset .fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 2px;
  }

  .mock-asset:nth-child(2) .fill { background: #10b981; }
  .mock-asset:nth-child(3) .fill { background: #f59e0b; }

  .mock-asset .badge {
    font-size: 0.55rem;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 4px;
    margin-bottom: 0;
  }

  .badge.buy { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
  .badge.ok { background: rgba(16, 185, 129, 0.2); color: #34d399; }
  .badge.sell { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

  .reveal {
    animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes reveal {
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

