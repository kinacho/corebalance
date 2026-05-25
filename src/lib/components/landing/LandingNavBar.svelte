<script lang="ts">
  import { onMount } from 'svelte';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  let { onStart = () => {} } = $props();
  let isScrolled = $state(false);

  function startDemo() {
    console.log('--- NAV DEMO BUTTON CLICKED ---');
    if (portfolio && typeof portfolio.loadDemoData === 'function') {
      console.log('Store and loadDemoData found, executing...');
      portfolio.loadDemoData();
      console.log('Demo data loaded, navigating...');
      goto('/dashboard');
    } else {
      console.error('ERROR: portfolio or loadDemoData is undefined/not a function', { portfolio });
    }
  }

  onMount(() => {
    const handleScroll = () => {
      isScrolled = window.scrollY > 20;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

<nav class="navbar" class:scrolled={isScrolled}>
  <div class="nav-container">
    <div class="nav-brand">
      <img src="/favicon.png" alt="CoreBalance" class="logo" />
      <span class="brand-name">CoreBalance</span>
    </div>

    <div class="nav-links">
      <a href="#features" aria-label="Ir a la sección de características de CoreBalance">Características</a>
      <a href="#how-it-works" aria-label="Ver cómo funciona el rebalanceo de carteras">Cómo funciona</a>
      <a href="#why-us" aria-label="Conocer la historia y por qué usar CoreBalance">Por qué CoreBalance</a>
      <a href="#educational" aria-label="Ver preguntas frecuentes sobre inversión pasiva y rebalanceo">FAQ</a>
    </div>

    <div class="nav-actions">
      {#if portfolio.user && portfolio.hasAnyHoldings}
        <button class="btn-primary" onclick={() => goto('/dashboard')} aria-label="Ir a tu panel de control de inversiones">
          Ir al Dashboard
        </button>
      {:else}
        <button class="btn-demo" onclick={() => startDemo()} aria-label="Probar demostración interactiva de rebalanceo de cartera">
          Probar Demo
        </button>
        <button class="btn-primary" onclick={() => onStart()} aria-label="Empezar a rebalancear tu cartera gratis">
          Empezar gratis
        </button>
      {/if}
    </div>
  </div>
</nav>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 72px;
    z-index: 1000;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    border-bottom: 1px solid transparent;
  }

  .navbar.scrolled {
    background: rgba(5, 5, 10, 0.8);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  @media (max-width: 768px) {
    .navbar.scrolled {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      background: var(--bg-secondary, #0f0f14);
    }
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo {
    width: 32px;
    height: 32px;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
  }

  .nav-links {
    display: none;
    gap: 2rem;
  }

  @media (min-width: 1024px) {
    .nav-links {
      display: flex;
    }
  }

  .nav-links a {
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .nav-links a:hover {
    color: #fff;
  }

  .nav-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-primary {
    background: var(--accent-blue, #3b82f6);
    color: white;
    border: none;
    padding: 0.6rem 1.25rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .btn-demo {
    background: rgba(139, 92, 246, 0.1);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.3);
    padding: 0.6rem 1.25rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-demo:hover {
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
  }
</style>
