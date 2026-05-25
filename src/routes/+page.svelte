<script lang="ts">
  import { onMount } from "svelte";
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
    bypassLanding = true;
    if (browser) sessionStorage.setItem('bypassLanding', 'true');
    goto('/dashboard');
  }

  $effect(() => {
    // Si la app ya inicializó, decidimos dónde mandarlo
    if (portfolio.isInitialized) {
      const hasSession = (portfolio.user && portfolio.hasAnyHoldings);
      const hasLocalData = !portfolio.user && portfolio.hasAnyHoldings;
      
      if (hasSession || hasLocalData || bypassLanding) {
        // Solo redirigir si realmente hay datos. Si bypassLanding está activo
        // pero no hay datos, limpiar el flag para evitar loops.
        if (bypassLanding && !hasSession && !hasLocalData) {
          if (browser) sessionStorage.removeItem('bypassLanding');
          bypassLanding = false;
          return; // No redirigir, mostrar landing
        }
        goto('/dashboard');
      }
    }
  });

  onMount(() => {
    // Si ya hay bypass activo, redirigir al dashboard
    if (bypassLanding) {
      // Solo hacer goto si hay datos reales, si no limpiar el flag
      if (portfolio.isInitialized && !portfolio.hasAnyHoldings && !portfolio.user) {
        if (browser) sessionStorage.removeItem('bypassLanding');
        bypassLanding = false;
      } else if (portfolio.isInitialized) {
        goto('/dashboard');
      }
      // Si no está initialized todavía, el $effect se encargará cuando lo esté
    }
  });
</script>

{#if portfolio.isInitialized}
  {#if !bypassLanding && (!portfolio.user || !portfolio.hasAnyHoldings)}
    <LandingPage onStart={handleBypass} />
  {/if}
{/if}
