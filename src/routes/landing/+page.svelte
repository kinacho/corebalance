<script lang="ts">
  import LandingPage from '$lib/components/landing/LandingPage.svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  function handleStart() {
    if (browser) {
      sessionStorage.setItem('bypassLanding', 'true');
      goto('/');
    }
  }
</script>

<LandingPage onStart={handleStart} />
