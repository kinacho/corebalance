<script lang="ts">
  import LandingNavBar from './LandingNavBar.svelte';
  import Hero from './Hero.svelte';
  import Features from './Features.svelte';
  import Comparison from './Comparison.svelte';
  import WhyUs from './WhyUs.svelte';
  import HowItWorks from './HowItWorks.svelte';
  import EducationalFAQ from './EducationalFAQ.svelte';
  import Cta from './Cta.svelte';
  import LandingFooter from './LandingFooter.svelte';

  let { onStart = () => {} } = $props();
</script>

<svelte:head>
  <title>CoreBalance — Rebalancea tu cartera de ETFs y Fondos Indexados</title>
  <meta name="description" content="La herramienta definitiva para el inversor indexado. Calcula tu rebalanceo en segundos, optimiza tu cartera y mantén tu estrategia bajo control." />
  
  <!-- Open Graph -->
  <meta property="og:title" content="CoreBalance — Rebalancea tu cartera de ETFs" />
  <meta property="og:description" content="Gestiona tu cartera de fondos indexados y ETFs con rebalanceo inteligente y seguimiento en tiempo real." />
  <meta property="og:image" content="https://corebalance.app/og-image-landing.png" />
  
  <!-- JSON-LD -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "CoreBalance",
      "operatingSystem": "Web, iOS, Android",
      "applicationCategory": "FinanceApplication",
      "description": "Herramienta de gestión y rebalanceo de carteras de inversión para fondos indexados y ETFs.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      }
    }
  </script>
</svelte:head>

<div class="landing-page">
  <LandingNavBar {onStart} />
  
  <main>
    <Hero {onStart} />
    <Features />
    <Comparison />
    <HowItWorks />
    <WhyUs />
    <EducationalFAQ />
    <Cta {onStart} />
  </main>

  <LandingFooter />
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .landing-page {
    background: #05050a;
    color: #fff;
    min-height: 100vh;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }

  main {
    overflow-x: hidden;
  }
</style>
