<script lang="ts">
  import { onMount } from 'svelte';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  let { onStart = () => {} } = $props();
  let isScrolled = $state(false);

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
      <a href="#features">Características</a>
      <a href="#how-it-works">Cómo funciona</a>
      <a href="#why-us">Por qué CoreBalance</a>
    </div>

    <div class="nav-actions">
      {#if portfolio.user}
        <button class="btn-primary" onclick={() => goto('/dashboard')}>
          Ir al Dashboard
        </button>
      {:else}
        <button class="btn-secondary" onclick={() => portfolio.login()}>
          Iniciar sesión
        </button>
        <button class="btn-primary" onclick={onStart}>
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

  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.6rem 1.25rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 640px) {
    .btn-secondary {
      display: none;
    }
  }
</style>
