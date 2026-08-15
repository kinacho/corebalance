<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { goto } from '$app/navigation';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { LL } from '$lib/i18n/i18n-svelte';
  import { link } from '$lib/i18n/link';
  import { page } from '$app/stores';

  let { onStart = () => {} } = $props();

  /**
   * El enlace a los cursos solo se pinta en español, y el `href` va a pelo.
   *
   * ⚠️ Los dos detalles son necesarios. `$link()` localiza la ruta, así que en inglés
   * compondría `/en/cursos` — que no existe, porque los cursos son solo en español a
   * propósito (la normativa fiscal que usan es española y el inglés del sitio da
   * impresiones y cero clics). Sería exactamente el 404 que el selector de idioma ya
   * estuvo a punto de servir en estas mismas páginas.
   *
   * Y el rótulo va escrito aquí en lugar de en `i18n`: una clave de traducción para un
   * texto que solo se muestra en un idioma es una clave que alguien traducirá algún día,
   * y entonces el enlace aparecerá en inglés apuntando a una página que no existe.
   */
  const isEs = $derived((($page.data.locale as string) ?? 'es') === 'es');
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
      {#if isEs}<a class="destacado" href="/cursos" aria-label="Cursos gratuitos de inversión indexada (novedad)">Cursos</a>{/if}
          <a href={$link('/herramientas')} aria-label={$LL.nav.aria_tools()}>{$LL.nav.tools()}</a>
      <a href={$link('/blog')} aria-label={$LL.nav.aria_blog()}>{$LL.nav.blog()}</a>
    </div>

    <!-- Menú Desktop Acciones -->
    <div class="nav-actions">
      <ThemeToggle />
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
      {#if isEs}<a class="destacado" href="/cursos" onclick={() => isMobileMenuOpen = false} aria-label="Cursos gratuitos de inversión indexada (novedad)">Cursos</a>{/if}
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
    background: var(--bg-scrim);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border-bottom: 1px solid var(--border-subtle);
  }

  @media (max-width: 768px) {
    .navbar.scrolled {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      background: var(--bg-elevated);
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
    color: var(--text-primary);
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
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap; /* SOLUCIÓN AL BUG: Impide totalmente que los textos se rompan en 2 líneas */
    transition: color 0.2s ease;
  }

  .nav-links a:hover {
    color: var(--text-primary);
  }

  /*
   * «Cursos» es lo único nuevo del menú y se leía exactamente igual que los otros seis.
   *
   * ⚠️ El distintivo **no puede añadir ancho**, y eso decide toda la solución. Este menú
   * solo aparece a partir de 1140 px, y ese punto de corte se subió desde 1024 px
   * precisamente porque los textos se partían en dos líneas: una píldora «Nuevo» al lado
   * del enlace serían unos 50 px más y volveríamos a estar al borde de aquello. Así que el
   * punto va en `::after` posicionado en absoluto —fuera del flujo, cero ancho ocupado— y
   * el peso y el color hacen el resto. El `aria-label` dice «novedad» porque un punto de
   * color no existe para quien no lo ve.
   */
  .nav-links a.destacado,
  .mobile-menu-links a.destacado {
    position: relative;
    color: var(--text-primary);
    font-weight: 700;
  }
  .nav-links a.destacado::after,
  .mobile-menu-links a.destacado::after {
    content: '';
    position: absolute;
    top: -0.28rem;
    right: -0.5rem;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-blue);
    /* Un punto decorativo no debe robar el clic del enlace que marca. */
    pointer-events: none;
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
    background: var(--accent-blue);
    color: var(--text-on-accent);
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
    color: var(--accent-violet-ink);
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
    color: var(--accent-violet-ink);
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
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    cursor: pointer;
    z-index: 1010;
    transition: all 0.2s ease;
  }

  .menu-toggle:hover {
    background: var(--bg-card-hover);
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
    background: var(--bg-overlay);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    z-index: 999;
    display: flex;
    flex-direction: column;
    padding: 2rem 1.5rem;
    gap: 2.5rem;
    border-top: 1px solid var(--border-subtle);
  }

  .mobile-menu-links {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .mobile-menu-links a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 1.15rem;
    font-weight: 600;
    transition: color 0.2s ease;
    padding: 0.5rem 0;
  }

  .mobile-menu-links a:hover {
    color: var(--accent-blue-ink);
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