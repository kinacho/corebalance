<script lang="ts">
  import LandingNavBar from './LandingNavBar.svelte';
  import Hero from './Hero.svelte';
  import Features from './Features.svelte';
  import Comparison from './Comparison.svelte';
  import WhyUs from './WhyUs.svelte';
  import HowToRebalance from './HowToRebalance.svelte';
  import HowItWorks from './HowItWorks.svelte';
  import EducationalFAQ from './EducationalFAQ.svelte';
  import Cursos from './Cursos.svelte';
  import Cta from './Cta.svelte';
  import LandingFooter from './LandingFooter.svelte';
  import { LL } from '$lib/i18n/i18n-svelte';
  import { page } from '$app/stores';
  import SeoHead from '$lib/components/seo/SeoHead.svelte';
  import { AUTHOR, GITHUB_REPO } from '$lib/seo/author';
  import { FEATURE_LIST } from '$lib/seo/features';
  import { pageOgImage } from '$lib/seo/og';
  import { SITE_URL, alternates } from '$lib/i18n/routing';
  import type { Locales } from '$lib/i18n/i18n-types';

  let { onStart = () => {} } = $props();

  const lang = $derived(($page.data.locale ?? 'es') as Locales);
  const alts = $derived(alternates($page.url.pathname, lang));

  // Schema.org JSON-LD
  const schemaData = $derived({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        "name": "CoreBalance",
        "url": alts.canonical,
        "applicationCategory": "FinanceApplication",
        "applicationSubCategory": "Index portfolio tracker and rebalancing calculator",
        "operatingSystem": "Web",
        "browserRequirements": "Requires JavaScript",
        "softwareVersion": __APP_VERSION__,
        "inLanguage": ["es", "en"],
        "isAccessibleForFree": true,
        "screenshot": `${SITE_URL}${pageOgImage('landing', lang)}`,
        "sameAs": [GITHUB_REPO],
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        },
        "description": $LL.seo.description(),
        "featureList": FEATURE_LIST[lang],
        "author": { "@id": `${SITE_URL}${AUTHOR.path}#person` }
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        "name": "CoreBalance",
        "url": SITE_URL,
        "logo": `${SITE_URL}/logo.png`,
        "sameAs": [GITHUB_REPO]
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        "name": "CoreBalance",
        "url": SITE_URL,
        "inLanguage": lang,
        "publisher": { "@id": `${SITE_URL}/#org` },
        "description": $LL.seo.description()
      }
    ]
  });
  </script>

  <SeoHead
    title={$LL.seo.title()}
    description={$LL.seo.description()}
    path={$page.url.pathname}
    {lang}
    image={pageOgImage('landing', lang)}
    jsonLd={schemaData}
  />

<div class="landing-page">
  <LandingNavBar {onStart} />
  
  <main>
    <Hero {onStart} />
    <Features />
    <!--
      Los cursos solo existen en español, así que la sección solo se ofrece ahí.
      Enseñarla en `/en` llevaría a páginas en español, que es peor que no ofrecerla.

      ⚠️ Va en tercer lugar y no la séptima, que es donde estaba. Antes quedaba por
      debajo de cuatro bloques de producto: quien entra desde una búsqueda informativa
      —que es de dónde viene la mayor parte del tráfico— se iba sin llegar a verla nunca.
      Después de `Features` porque primero hay que saber qué es esto; antes del resto
      porque los cursos son lo nuevo y lo que se puede consumir sin registrarse.
    -->
    {#if lang === 'es'}
      <Cursos />
    {/if}
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
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }

  main {
    overflow-x: hidden;
  }
</style>
