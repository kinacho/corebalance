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
  import { LL } from '$lib/i18n/i18n-svelte';

  let { onStart = () => {} } = $props();

  // Schema.org JSON-LD
  const schemaData = $derived({
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
        "description": $LL.seo.description(),
        "featureList": [
          $LL.features.item_rebalance_title(),
          $LL.features.item_projections_title(),
          $LL.features.item_broker_desc(),
          $LL.features.item_privacy_desc()
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
  });

  const schemaString = $derived(JSON.stringify(schemaData));
  </script>

  <svelte:head>
  <title>{$LL.seo.title()}</title>
  <meta name="description" content={$LL.seo.description()} />

  <!-- Open Graph -->
  <meta property="og:title" content={$LL.seo.og_title()} />
  <meta property="og:description" content={$LL.seo.og_description()} />
  <meta property="og:image" content="https://corebalance.app/og-image-landing.png" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://corebalance.app" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={$LL.seo.og_title()} />
  <meta name="twitter:description" content={$LL.seo.og_description()} />
  <meta name="twitter:image" content="https://corebalance.app/og-image-landing.png" />

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
