<script lang="ts">
  import LandingNavBar from './LandingNavBar.svelte';
  import Hero from './Hero.svelte';
  import Features from './Features.svelte';
  import Comparison from './Comparison.svelte';
  import WhyUs from './WhyUs.svelte';
  import HowToRebalance from './HowToRebalance.svelte';
  import HowItWorks from './HowItWorks.svelte';
  import EducationalFAQ from './EducationalFAQ.svelte';
  import Cta from './Cta.svelte';
  import LandingFooter from './LandingFooter.svelte';

  let { onStart = () => {} } = $props();

  // Schema.org JSON-LD
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "CoreBalance",
        "url": "https://corebalance.app",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        },
        "description": "Rebalanceador de carteras de ETFs y fondos indexados, local-first, gratuito y sin registro. Calcula exactamente cuánto comprar o vender de cada activo para mantener tu asset allocation.",
        "featureList": [
          "Cálculo de rebalanceo automático",
          "Optimización con aportaciones periódicas",
          "Importación CSV desde MyInvestor, DEGIRO, Trading 212, Interactive Brokers",
          "Local-first: datos almacenados en IndexedDB, sin servidores externos",
          "Historial de rebalanceos"
        ]
      },
      {
        "@type": "Organization",
        "name": "CoreBalance",
        "url": "https://corebalance.app",
        "sameAs": [
          "https://github.com/kino166/rebalanceador"
        ]
      }
    ]
  };

  const schemaString = JSON.stringify(schemaData);
  </script>

  <svelte:head>
  <title>CoreBalance — Rebalancea tu cartera de ETFs y Fondos Indexados</title>
  <meta name="description" content="La herramienta definitiva para el inversor indexado. Calcula tu rebalanceo en segundos, optimiza tu cartera y mantén tu estrategia bajo control." />

  <!-- Open Graph -->
  <meta property="og:title" content="CoreBalance — Rebalancea tu cartera de ETFs" />
  <meta property="og:description" content="Gestiona tu cartera de fondos indexados y ETFs con rebalanceo inteligente y seguimiento en tiempo real." />
  <meta property="og:image" content="https://corebalance.app/og-image-landing.png" />

  {@html `<script type="application/ld+json">${schemaString}</script>`}
  </svelte:head>

<div class="landing-page">
  <LandingNavBar {onStart} />
  
  <main>
    <Hero {onStart} />
    <Features />
    <Comparison />
    <HowItWorks />
    <WhyUs />
    <HowToRebalance />
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
