<script lang="ts">
  import LandingPage from '$lib/components/landing/LandingPage.svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  import { portfolio } from '$lib/stores/portfolio.svelte';

  $effect(() => {
    if (portfolio.isInitialized && portfolio.hasAnyHoldings) {
      goto('/dashboard');
    }
  });

  function handleStart() {
    if (browser) {
      if (portfolio.isDemo) {
        portfolio.exitDemo();
      }
      sessionStorage.setItem('bypassLanding', 'true');
      goto('/');
    }
  }
</script>

<LandingPage onStart={handleStart} />
