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
          <div class="mockup-sidebar"></div>
          <div class="mockup-main">
            <div class="mockup-stats">
              <div class="stat-card"></div>
              <div class="stat-card"></div>
              <div class="stat-card"></div>
            </div>
            <div class="mockup-chart"></div>
            <div class="mockup-list">
              <div class="list-item"></div>
              <div class="list-item"></div>
            </div>
          </div>
        </div>
        <div class="mockup-overlay"></div>
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

  /* --- Mockup --- */
  .hero-mockup-container {
    perspective: 1000px;
  }

  .hero-mockup {
    background: #0f0f14;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.8);
    overflow: hidden;
    transform: rotateX(5deg) rotateY(-10deg) rotateZ(2deg);
    transition: transform 0.5s ease;
  }

  @media (max-width: 768px) {
    .hero-mockup {
      transform: none;
    }
  }

  .mockup-header {
    height: 40px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    padding: 0 1rem;
    gap: 1rem;
  }

  .dots {
    display: flex;
    gap: 6px;
  }

  .dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
  }

  .address-bar {
    flex: 1;
    height: 24px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mockup-content {
    height: 400px;
    display: flex;
  }

  .mockup-sidebar {
    width: 60px;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  .mockup-main {
    flex: 1;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .mockup-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .stat-card {
    height: 60px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
  }

  .mockup-chart {
    flex: 1;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 16px;
    border: 1px solid rgba(59, 130, 246, 0.1);
  }

  .mockup-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .list-item {
    height: 40px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
  }

  .mockup-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%);
    pointer-events: none;
  }

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
