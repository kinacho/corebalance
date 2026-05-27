<script lang="ts">
  import { portfolio } from "$lib/stores/portfolio.svelte";
  import LandingPage from "$lib/components/landing/LandingPage.svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";

  // --- Gatekeeper Logic ---
  let bypassLanding = $state(browser ? sessionStorage.getItem('bypassLanding') === 'true' : false);

  function handleBypass() {
    if (portfolio.isDemo) {
      portfolio.exitDemo();
    }
    // Solo poner el flag en sessionStorage y navegar.
    // NO mutar el estado reactivo bypassLanding para evitar que el $effect
    // lo detecte y lo borre antes de que el dashboard pueda leerlo.
    if (browser) sessionStorage.setItem('bypassLanding', 'true');
    goto('/dashboard');
  }

  // Determinar de manera síncrona si hay datos locales guardados para evitar flashes de la landing en usuarios recurrentes.
  const hasLocalHoldings = browser ? (() => {
    try {
      const saved = localStorage.getItem('corebalance_holdings_v2');
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      return Object.values(parsed).some((h: any) => h.shares > 0);
    } catch {
      return false;
    }
  })() : false;

  $effect(() => {
    // Si la app ya inicializó, decidimos dónde mandarlo
    if (portfolio.isInitialized) {
      // Regla simétrica: permitimos dashboard si hay usuario, activos o es demo
      const canAccessDashboard = portfolio.user || portfolio.hasAnyHoldings || portfolio.isDemo;
      
      if (canAccessDashboard || bypassLanding) {
        // El ticket de acceso rápido es de un solo uso
        if (browser && bypassLanding) {
          sessionStorage.removeItem('bypassLanding');
        }
        goto('/dashboard');
      }
    }
  });
</script>

{#if !bypassLanding && (!hasLocalHoldings || portfolio.isInitialized)}
  {#if !portfolio.isInitialized || (!portfolio.user || !portfolio.hasAnyHoldings)}
    <LandingPage onStart={handleBypass} />
  {/if}
{/if}
