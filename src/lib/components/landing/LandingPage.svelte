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
    {@html JSON.stringify([
      {
        "@context": "https://schema.org",
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
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "CoreBalance",
        "url": "https://corebalance.app",
        "sameAs": [
          "https://github.com/kino166/rebalanceador" 
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "¿Cómo rebalancear una cartera en MyInvestor de forma gratuita?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Exporta tus movimientos en CSV desde MyInvestor, impórtalo en CoreBalance y la app calculará automáticamente qué compras o traspasos realizar para volver a tu asignación objetivo."
            }
          },
          {
            "@type": "Question",
            "name": "¿Es seguro CoreBalance? ¿Dónde se guardan mis datos?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "CoreBalance es una aplicación 'local-first'. Todos tus datos financieros se almacenan únicamente en tu navegador (IndexedDB), sin servidores externos ni registros obligatorios."
            }
          },
          {
            "@type": "Question",
            "name": "¿Qué brokers y plataformas soporta CoreBalance?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Soporta importación automática de MyInvestor, DEGIRO, Trading 212 e Interactive Brokers, además de permitir la carga mediante CSV genérico o entrada manual."
            }
          },
          {
            "@type": "Question",
            "name": "¿Necesito registrarme para usar CoreBalance?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No es necesario. Puedes usar la herramienta de forma totalmente anónima gracias a su arquitectura local. La autenticación solo es opcional si deseas sincronizar tus datos en la nube."
            }
          },
          {
            "@type": "Question",
            "name": "¿Qué es el rebalanceo de cartera y cuándo debo hacerlo?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Es el proceso de ajustar los pesos de tus activos a sus objetivos originales. Se recomienda hacerlo cuando las desviaciones superan un umbral (ej. 5%) o cuando realizas aportaciones periódicas."
            }
          }
        ]
      }
    ])}
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
