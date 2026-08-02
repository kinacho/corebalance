<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { goto } from '$app/navigation';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import { LL } from '$lib/i18n/i18n-svelte';
  import { link } from '$lib/i18n/link';

  let { onStart = () => {} } = $props();
  let isScrolled = $state(false);
  let isMobileMenuOpen = $state(false);

  function startDemo() {
    if (portfolio && typeof portfolio.loadDemoData === 'function') {
      portfolio.loadDemoData();
      goto('/dashboard');
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
    <a class="nav-brand" href={$link('/')} aria-label="CoreBalance">
      <img src="/logo.png?v=2" alt="CoreBalance" class="logo" width="48" height="48" fetchpriority="high" loading="eager" />
      <span class="brand-name">CoreBalance</span>
    </a>

    <!-- Menú Desktop Links -->
    <div class="nav-links">
      <a href={$link('/#features')} aria-label={$LL.nav.aria_features()}>{$LL.nav.features()}</a>
      <a href={$link('/#how-it-works')} aria-label={$LL.nav.aria_how_it_works()}>{$LL.nav.how_it_works()}</a>
      <a href={$link('/#why-us')} aria-label={$LL.nav.aria_why_us()}>{$LL.nav.why_us()}</a>
      <a href={$link('/#educational')} aria-label={$LL.nav.aria_faq()}>{$LL.nav.faq()}</a>
      <a href={$link('/herramientas')} aria-label={$LL.nav.aria_tools()}>{$LL.nav.tools()}</a>
      <a href={$link('/blog')} aria-label={$LL.nav.aria_blog()}>{$LL.nav.blog()}</a>
    </div>

    <!-- Menú Desktop Acciones -->
    <div class="nav-actions">
      <div class="lang-container">
        <LanguageSwitcher />
      </div>
      {#if portfolio.user && portfolio.hasAnyHoldings}
        <button class="btn-primary" onclick={() => goto('/dashboard')} aria-label={$LL.nav.aria_dashboard()}>
          {$LL.nav.dashboard()}
        </button>
      {:else}
        <button class="btn-demo" onclick={() => startDemo()} aria-label={$LL.nav.aria_demo()}>
          {$LL.nav.demo()}
        </button>
        <button class="btn-primary" onclick={() => onStart()} aria-label={$LL.nav.aria_start_free()}>
          {$LL.nav.start_free()}
        </button>
      {/if}
    </div>

    <!-- Botón Menú Hamburguesa para Móviles -->
    <button 
      class="menu-toggle" 
      onclick={() => isMobileMenuOpen = !isMobileMenuOpen} 
      aria-label={isMobileMenuOpen ? $LL.nav.aria_menu_close() : $LL.nav.aria_menu_open()}
      aria-expanded={isMobileMenuOpen}
    >
      <span class="hamburger-bar" class:open={isMobileMenuOpen}></span>
    </button>
  </div>
</nav>

<!-- Menú Móvil Desplegable -->
{#if isMobileMenuOpen}
  <div class="mobile-menu" transition:fade={{ duration: 150 }}>
    <div class="mobile-menu-links">
      <a href={$link('/#features')} onclick={() => isMobileMenuOpen = false} aria-label={$LL.nav.aria_features()}>{$LL.nav.features()}</a>
      <a href={$link('/#how-it-works')} onclick={() => isMobileMenuOpen = false} aria-label={$LL.nav.aria_how_it_works()}>{$LL.nav.how_it_works()}</a>
      <a href={$link('/#why-us')} onclick={() => isMobileMenuOpen = false} aria-label={$LL.nav.aria_why_us()}>{$LL.nav.why_us()}</a>
      <a href={$link('/#educational')} onclick={() => isMobileMenuOpen = false} aria-label={$LL.nav.aria_faq()}>{$LL.nav.faq()}</a>
      <a href={$link('/herramientas')} onclick={() => isMobileMenuOpen = false} aria-label={$LL.nav.aria_tools()}>{$LL.nav.tools()}</a>
      <a href={$link('/blog')} onclick={() => isMobileMenuOpen = false} aria-label={$LL.nav.aria_blog()}>{$LL.nav.blog()}</a>
    </div>
    <div class="mobile-menu-actions">
      <div class="mobile-lang">
        <LanguageSwitcher />
      </div>
      {#if portfolio.user && portfolio.hasAnyHoldings}
        <button class="btn-primary w-full" onclick={() => { isMobileMenuOpen = false; goto('/dashboard'); }} aria-label={$LL.nav.aria_dashboard()}>
          {$LL.nav.dashboard()}
        </button>
      {:else}
        <button class="btn-demo w-full" onclick={() => { isMobileMenuOpen = false; startDemo(); }} aria-label={$LL.nav.aria_demo()}>
          {$LL.nav.demo()}
        </button>
        <button class="btn-primary w-full" onclick={() => { isMobileMenuOpen = false; onStart(); }} aria-label={$LL.nav.aria_start_free()}>
          {$LL.nav.start_free()}
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 76px;
    z-index: 1000;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    border-bottom: 1px solid transparent;
    background: transparent;
  }

  .navbar.scrolled {
    background: rgba(5, 5, 10, 0.75);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  @media (max-width: 768px) {
    .navbar.scrolled {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      background: var(--bg-secondary, #0f0f14);
    }
  }

  .nav-container {
    max-width: 1250px;
    margin: 0 auto;
    width: 100%;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem; /* Espacio de seguridad para que los bloques principales nunca se toquen */
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: inherit;
    text-decoration: none; /* Es un <a> real para que el crawler siga el enlace al home del idioma */
    flex-shrink: 0; /* Evita que el logo se deforme o se achique */
  }

  .logo {
    width: 36px;
    height: 36px;
  }

  @media (min-width: 768px) {
    .logo {
      width: 48px;
      height: 48px;
    }
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
  }

  .nav-links {
    display: none;
    gap: 2.25rem; /* Separación elegante y equilibrada entre las palabras */
    align-items: center;
    justify-content: center;
  }

  @media (min-width: 1140px) { /* Subido de 1024px a 1140px para asegurar espacio en pantallas intermedias */
    .nav-links {
      display: flex;
    }
  }

  .nav-links a {
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap; /* SOLUCIÓN AL BUG: Impide totalmente que los textos se rompan en 2 líneas */
    transition: color 0.2s ease;
  }

  .nav-links a:hover {
    color: #fff;
  }

  .nav-actions {
    display: none;
    gap: 0.85rem;
    align-items: center;
    flex-shrink: 0; /* Protege los botones de acción para que no se aplasten */
  }

  .lang-container {
    margin-right: 0.25rem;
    display: flex;
    align-items: center;
  }

  @media (min-width: 768px) {
    .nav-actions {
      display: flex;
    }
  }

  /* COLOR ORIGINAL RESTAURADO (Azul) con acabados más pulidos */
  .btn-primary {
    background: var(--accent-blue, #3b82f6);
    color: white;
    border: none;
    padding: 0.6rem 1.35rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
  }

  /* COLOR ORIGINAL RESTAURADO (Violeta semi-transparente) */
  .btn-demo {
    background: rgba(139, 92, 246, 0.1);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.25);
    padding: 0.6rem 1.35rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-demo:hover {
    background: rgba(139, 92, 246, 0.18);
    color: #c4b5fd;
    border-color: rgba(139, 92, 246, 0.45);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
  }

  /* Hamburguesa Menú */
  .menu-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    z-index: 1010;
    transition: all 0.2s ease;
  }

  .menu-toggle:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  @media (min-width: 1140px) {
    .menu-toggle {
      display: none;
    }
  }

  .hamburger-bar {
    width: 20px;
    height: 2px;
    background: #fff;
    position: relative;
    transition: all 0.3s ease;
  }

  .hamburger-bar::before,
  .hamburger-bar::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 2px;
    background: #fff;
    left: 0;
    transition: all 0.3s ease;
  }

  .hamburger-bar::before { top: -6px; }
  .hamburger-bar::after { top: 6px; }

  .hamburger-bar.open { background: transparent; }
  .hamburger-bar.open::before { transform: rotate(45deg); top: 0; }
  .hamburger-bar.open::after { transform: rotate(-45deg); top: 0; }

  /* Menú móvil desplegable */
  .mobile-menu {
    position: fixed;
    top: 72px;
    left: 0;
    width: 100%;
    height: calc(100vh - 72px);
    background: rgba(5, 5, 10, 0.98);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    z-index: 999;
    display: flex;
    flex-direction: column;
    padding: 2rem 1.5rem;
    gap: 2.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .mobile-menu-links {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .mobile-menu-links a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: 1.15rem;
    font-weight: 600;
    transition: color 0.2s ease;
    padding: 0.5rem 0;
  }

  .mobile-menu-links a:hover {
    color: #3b82f6;
  }

  .mobile-menu-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: auto;
    padding-bottom: 2rem;
  }

  .mobile-lang {
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
  }

  .w-full {
    width: 100%;
    padding: 0.8rem 1.25rem;
  }
</style>