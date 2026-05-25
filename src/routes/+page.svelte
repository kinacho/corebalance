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
      
      // Si tiene datos (en la nube o locales), el dashboard es su sitio.
      // Ya no permitimos ver la landing si hay una cartera activa.
      if (hasSession || hasLocalData || bypassLanding) {
        goto('/dashboard');
      }
    }
  });

  onMount(() => {
    // Si ya hay bypass activo, redirigir al dashboard
    if (bypassLanding) {
      goto('/dashboard');
    }
  });
</script>

{#if portfolio.isInitialized}
  {#if !bypassLanding && (!portfolio.user || !portfolio.hasAnyHoldings)}
    <LandingPage onStart={handleBypass} />
  {/if}
{/if}
