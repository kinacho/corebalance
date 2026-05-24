<script lang="ts">
  import { onMount } from "svelte";
  import { portfolio } from "$lib/stores/portfolio.svelte";
  import LandingPage from "$lib/components/landing/LandingPage.svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";

  // --- Gatekeeper Logic ---
  let bypassLanding = $state(browser ? sessionStorage.getItem('bypassLanding') === 'true' : false);

  function handleBypass() {
    bypassLanding = true;
    if (browser) sessionStorage.setItem('bypassLanding', 'true');
    goto('/dashboard');
  }

  $effect(() => {
    // Si el usuario ya está autenticado y tiene cartera, al dashboard directo
    if (portfolio.isInitialized && portfolio.user && portfolio.hasAnyHoldings && !bypassLanding) {
      goto('/dashboard');
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
