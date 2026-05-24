<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { goto } from '$app/navigation';
  let { onStart = () => {} } = $props();

  function startDemo() {
    (portfolio as any).loadDemoData();
    goto('/dashboard');
  }
</script>

<section class="cta-section">
  <div class="container">
    <div class="cta-card">
      <h2>Empieza a optimizar tu cartera <span class="text-gradient">hoy mismo</span></h2>
      <p>Únete a cientos de inversores que ya confían en CoreBalance para gestionar su patrimonio.</p>
      <div class="cta-actions">
        <button class="btn-primary btn-lg" onclick={() => onStart()}>
          Crear mi cuenta gratis
        </button>
        <button class="btn-demo-cta" onclick={() => startDemo()}>
          Probar Demo Interactiva
        </button>
        <span class="no-credit">No requiere tarjeta de crédito · 100% Privado</span>
      </div>
    </div>
  </div>
</section>

<style>
  .cta-section {
    padding: 100px 1.5rem;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
  }

  .cta-card {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
    border: 1px solid rgba(59, 130, 246, 0.2);
    padding: 4rem 2rem;
    border-radius: 32px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .cta-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
    z-index: 0;
  }

  h2 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    margin-bottom: 1.5rem;
    color: #fff;
    position: relative;
    z-index: 1;
    letter-spacing: -0.02em;
  }

  .text-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    color: rgba(160, 160, 200, 0.7);
    font-size: 1.2rem;
    margin-bottom: 3rem;
    position: relative;
    z-index: 1;
  }

  .cta-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    position: relative;
    z-index: 1;
  }

  .btn-lg {
    padding: 1.25rem 3rem;
    font-size: 1.1rem;
  }

  .btn-primary {
    background: var(--accent-blue, #3b82f6);
    color: white;
    border: none;
    border-radius: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(59, 130, 246, 0.4);
  }

  .btn-demo-cta {
    background: rgba(139, 92, 246, 0.1);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.3);
    padding: 0.8rem 2rem;
    border-radius: 14px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-demo-cta:hover {
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(139, 92, 246, 0.2);
  }

  .no-credit {
    font-size: 0.85rem;
    color: rgba(160, 160, 200, 0.4);
  }
</style>
