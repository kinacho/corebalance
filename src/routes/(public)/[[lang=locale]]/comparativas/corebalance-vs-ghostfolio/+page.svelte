<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import RelatedReading from '$lib/components/blog/RelatedReading.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import SeoHead from '$lib/components/seo/SeoHead.svelte';
  import { pageOgImage } from '$lib/seo/og';
  import { link } from '$lib/i18n/link';
  import { alternates, SITE_URL, localizePath, absoluteUrl } from '$lib/i18n/routing';
  import type { Locales } from '$lib/i18n/i18n-types';
  let { data } = $props<{ data: { relatedReading: import('$lib/seo/related-reading').ReadingItem[] } }>();

  const lang = $derived(($page.data.locale ?? 'es') as Locales);
  let isEs = $derived(lang === 'es');
  const canonical = $derived(alternates($page.url.pathname, lang).canonical);
  const homeUrl = $derived(absoluteUrl(localizePath('/', lang)));

  // Metadatos
  const metaTitle = $derived(isEs
    ? 'CoreBalance vs Ghostfolio | Comparativa Completa'
    : 'CoreBalance vs Ghostfolio | Complete Comparison'
  );
  const metaDesc = $derived(isEs
    ? 'Comparativa honesta de CoreBalance frente a Ghostfolio. Analizamos instalación, privacidad, rebalanceo por aportación, métricas de rendimiento y fiscalidad española.'
    : 'Honest comparison between CoreBalance and Ghostfolio. We analyze installation, privacy, contribution-based rebalancing, performance metrics, and Spanish tax awareness.'
  );

  // Esquema JSON-LD
  const schemaData = $derived({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": isEs ? "Inicio" : "Home",
            "item": homeUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": isEs ? "Comparativas" : "Comparisons",
            "item": absoluteUrl(localizePath('/comparativas', lang))
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "vs Ghostfolio",
            "item": canonical
          }
        ]
      },
      {
        "@type": "Article",
        "headline": metaTitle,
        "description": metaDesc,
        "image": `${SITE_URL}${pageOgImage('vs-ghostfolio', lang)}`,
        "inLanguage": lang,
        "author": {
          "@type": "Organization",
          "name": "CoreBalance"
        },
        "publisher": {
          "@type": "Organization",
          "name": "CoreBalance",
          "logo": {
            "@type": "ImageObject",
            "url": `${SITE_URL}/logo.png`
          }
        },
        "mainEntityOfPage": canonical
      }
    ]
  });
</script>

<SeoHead
  title={metaTitle}
  description={metaDesc}
  path={$page.url.pathname}
  {lang}
  image={pageOgImage('vs-ghostfolio', lang)}
  ogType="article"
  jsonLd={schemaData}
/>

<div class="compare-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto($link('/'))} />

  <main class="compare-container">
    <!-- Breadcrumb visual -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href={$link('/')}>{isEs ? 'Inicio' : 'Home'}</a>
      <span class="separator">/</span>
      <a href={$link('/comparativas')}>{isEs ? 'Comparativas' : 'Comparisons'}</a>
      <span class="separator">/</span>
      <span class="current">vs Ghostfolio</span>
    </nav>

    <header class="compare-header">
      <span class="category-badge">{isEs ? 'Comparativa de Herramientas' : 'Tool Comparison'}</span>
      <h1 class="gradient-text">CoreBalance vs <br class="mobile-break">Ghostfolio</h1>
      <p class="subtitle">
        {isEs
          ? '¿Quieres montar tu propio servidor de gestión patrimonial con métricas avanzadas o prefieres abrir una web y calcular tu aportación mensual en dos minutos?'
          : 'Do you want to run your own wealth management server with advanced metrics, or would you rather open a web page and calculate your monthly contribution in two minutes?'}
      </p>
    </header>

    <!-- Sección de Introducción Rápida -->
    <section class="intro-section">
      <div class="intro-grid">
        <div class="intro-card corebalance-intro">
          <h3>CoreBalance</h3>
          <p class="tagline">{isEs ? 'La calculadora local-first sin instalación, pensada para el inversor español' : 'The zero-install, local-first calculator built for the Spanish investor'}</p>
          <p class="description">
            {isEs
              ? 'Se abre en el navegador: sin servidor propio, sin Docker y sin registro. Tus datos viven en el IndexedDB de tu navegador, importa CSV de brokers españoles y su especialidad es el rebalanceo por aportación, con cuentas remuneradas y conciencia fiscal española (traspasos).'
              : 'It opens in your browser: no server of your own, no Docker, no signup. Your data lives in your browser\'s IndexedDB, it imports CSV files from Spanish brokers, and its specialty is contribution-based rebalancing, with interest-bearing accounts and Spanish tax awareness (fund transfers).'}
          </p>
        </div>
        <div class="intro-card ghostfolio-intro">
          <h3>Ghostfolio</h3>
          <p class="tagline">{isEs ? 'El gestor de patrimonio open source para self-hosting' : 'The open-source wealth manager built for self-hosting'}</p>
          <p class="description">
            {isEs
              ? 'Un gestor de patrimonio de código abierto (licencia AGPL) pensado para desplegarlo tú mismo con Docker, con una opción cloud de pago. Muy fuerte en métricas de rendimiento (TWR/ROAI), gestión multi-cuenta y visión de tu patrimonio completo. Si quieres self-hosting con métricas avanzadas, es excelente.'
              : 'An open-source wealth manager (AGPL license) designed to be self-hosted with Docker, with a paid cloud option. Very strong in performance metrics (TWR/ROAI), multi-account management, and a complete net worth overview. If you want self-hosting with advanced metrics, it is excellent.'}
          </p>
        </div>
      </div>
    </section>

    <!-- Tabla Comparativa -->
    <section class="table-section">
      <h2>{isEs ? 'Tabla Comparativa Directa' : 'Direct Comparison Table'}</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>{isEs ? 'Característica' : 'Feature'}</th>
              <th class="highlight-col">CoreBalance</th>
              <th>Ghostfolio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-title">{isEs ? 'Instalación' : 'Installation'}</td>
              <td class="highlight-col">{isEs ? 'Ninguna: se abre en el navegador' : 'None: it opens in your browser'}</td>
              <td>{isEs ? 'Self-hosting con Docker (o cloud de pago)' : 'Self-hosting with Docker (or paid cloud)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Precio' : 'Price'}</td>
              <td class="highlight-col">{isEs ? 'Gratuito y sin anuncios' : 'Free and ad-free'}</td>
              <td>{isEs ? 'Gratuito auto-alojado (AGPL); suscripción en la nube' : 'Free self-hosted (AGPL); cloud subscription'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Privacidad de datos' : 'Data Privacy'}</td>
              <td class="highlight-col">{isEs ? 'Local-first: los datos viven en tu navegador, sin registro' : 'Local-first: data lives in your browser, no signup'}</td>
              <td>{isEs ? 'En tu servidor (si lo auto-alojas) o en su nube' : 'On your server (if self-hosted) or in their cloud'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Cálculo de Rebalanceo' : 'Rebalancing Calculation'}</td>
              <td class="highlight-col">{isEs ? 'Especialidad: rebalanceo por aportación, al céntimo' : 'Its specialty: contribution-based rebalancing, to the cent'}</td>
              <td>{isEs ? 'Muestra desvíos vs asignación, sin calcular la aportación' : 'Shows allocation drift, without calculating the contribution'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Métricas de Rendimiento' : 'Performance Metrics'}</td>
              <td class="highlight-col">{isEs ? 'Básicas (valor, coste medio, desvíos)' : 'Basic (value, average cost, drift)'}</td>
              <td>{isEs ? 'Avanzadas: TWR, ROAI, benchmark contra índices, multi-cuenta' : 'Advanced: TWR, ROAI, index benchmarking, multi-account'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Idioma' : 'Language'}</td>
              <td class="highlight-col">{isEs ? 'Español nativo (e inglés)' : 'Native Spanish (and English)'}</td>
              <td>{isEs ? 'Inglés como idioma principal; traducciones parciales' : 'English-first; partial translations'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Brokers Españoles' : 'Spanish Brokers'}</td>
              <td class="highlight-col">{isEs ? 'Importadores de MyInvestor, DEGIRO, Trading 212 e IBKR' : 'Importers for MyInvestor, DEGIRO, Trading 212, and IBKR'}</td>
              <td>{isEs ? 'CSV genérico; sin soporte específico para MyInvestor' : 'Generic CSV; no MyInvestor-specific support'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Fiscalidad Española' : 'Spanish Taxation'}</td>
              <td class="highlight-col">{isEs ? 'Pensado para traspasos de fondos y compra sin venta' : 'Built around fund transfers and buy-only rebalancing'}</td>
              <td>{isEs ? 'Sin concepto de traspaso fiscal español' : 'No concept of the Spanish tax-free fund transfer'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Caso de estudio / Rebalancing process comparison -->
    <section class="case-study-section">
      <h2>{isEs ? 'Diferencia en el Flujo de Trabajo' : 'Difference in the Workflow'}</h2>
      <p class="section-desc">
        {isEs
          ? 'Comparamos lo que cuesta empezar a usar cada herramienta y calcular la aportación del mes.'
          : 'We compare what it takes to get started with each tool and calculate this month\'s contribution.'}
      </p>
      <div class="study-grid">
        <div class="study-card">
          <h4>Ghostfolio</h4>
          <ul>
            <li>{isEs ? 'Desplegar el contenedor Docker con su base de datos PostgreSQL y Redis (o pagar la nube).' : 'Deploy the Docker container with its PostgreSQL database and Redis (or pay for the cloud).'}</li>
            <li>{isEs ? 'Mantener el servidor: actualizaciones, copias de seguridad y acceso remoto.' : 'Maintain the server: updates, backups, and remote access.'}</li>
            <li>{isEs ? 'Importar el histórico de transacciones y mapear los activos.' : 'Import your transaction history and map the assets.'}</li>
            <li>{isEs ? 'Revisar los desvíos de asignación y calcular a mano cuánto aportar a cada activo.' : 'Review the allocation drift and manually calculate how much to contribute to each asset.'}</li>
            <li>{isEs ? 'Requiere perfil técnico y tiempo de mantenimiento.' : 'Requires a technical profile and maintenance time.'}</li>
          </ul>
        </div>
        <div class="study-card highlight-card">
          <h4>CoreBalance</h4>
          <ul>
            <li>{isEs ? 'Abrir CoreBalance en el navegador (móvil o PC). Sin instalar nada.' : 'Open CoreBalance in your browser (mobile or PC). Nothing to install.'}</li>
            <li>{isEs ? 'Introducir tus posiciones (o importar el CSV de tu broker).' : 'Enter your positions (or import your broker\'s CSV).'}</li>
            <li>{isEs ? 'Escribir la aportación del mes y obtener las compras exactas por activo.' : 'Type this month\'s contribution and get the exact purchases per asset.'}</li>
            <li>{isEs ? 'Copiar las operaciones y realizarlas en tu banco o broker.' : 'Copy the operations and perform them in your bank or broker.'}</li>
            <li>{isEs ? 'Tiempo total: dos minutos, sin servidor que mantener.' : 'Total time: two minutes, with no server to maintain.'}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Detalle de Pros y Contras -->
    <section class="details-section">
      <h2>{isEs ? 'Pros y Contras: ¿Cuál te conviene más?' : 'Pros & Cons: Which suits you best?'}</h2>
      <div class="details-grid">
        <div class="details-card">
          <h3 class="pros-title">{isEs ? 'Elige CoreBalance si buscas:' : 'Choose CoreBalance if you want:'}</h3>
          <ul>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Cero instalación:' : 'Zero installation:'}</strong> {isEs ? 'Abres una web y calculas tu aportación en dos minutos, sin Docker, sin servidor propio y sin registro.' : 'Open a web page and calculate your contribution in two minutes, without Docker, without your own server, and without signing up.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Enfoque español:' : 'Spanish focus:'}</strong> {isEs ? 'Español nativo, importadores de MyInvestor además de DEGIRO/Trading 212/IBKR, cuentas remuneradas con interés devengado y rebalanceo pensado para traspasos.' : 'Native Spanish, MyInvestor importers alongside DEGIRO/Trading 212/IBKR, interest-bearing accounts with accrued interest, and rebalancing built around fund transfers.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Rebalanceo por aportación:' : 'Contribution-based rebalancing:'}</strong> {isEs ? 'Su especialidad: te dice exactamente cuánto comprar de cada activo con tu ahorro del mes, sin vender ni aflorar plusvalías.' : 'Its specialty: it tells you exactly how much of each asset to buy with this month\'s savings, without selling or realizing capital gains.'}</span>
            </li>
          </ul>
        </div>
        <div class="details-card">
          <h3 class="cons-title">{isEs ? 'Elige Ghostfolio si buscas:' : 'Choose Ghostfolio if you want:'}</h3>
          <ul>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Métricas de rendimiento avanzadas:' : 'Advanced performance metrics:'}</strong> {isEs ? 'TWR, ROAI y comparativa contra un índice de referencia, algo que CoreBalance no ofrece.' : 'TWR, ROAI, and benchmarking against a reference index, something CoreBalance does not offer.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Visión de patrimonio completa:' : 'Complete net worth overview:'}</strong> {isEs ? 'Multi-cuenta real: agrupa varios brokers, cuentas y hasta criptomonedas en un único panel de patrimonio.' : 'Real multi-account support: it groups several brokers, accounts, and even crypto into a single net worth dashboard.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Self-hosting con control total:' : 'Self-hosting with full control:'}</strong> {isEs ? 'Si disfrutas manteniendo tu propio servidor con Docker y quieres una plataforma open source (AGPL) bajo tu control, Ghostfolio es excelente.' : 'If you enjoy maintaining your own server with Docker and want an open-source (AGPL) platform under your control, Ghostfolio is excellent.'}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Sección de Preguntas Frecuentes (FAQ) -->
    <section class="faq-section">
      <h2>{isEs ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}</h2>
      <div class="faq-grid">
        <div class="faq-item">
          <h4>{isEs ? '¿Necesito saber usar Docker para alguna de las dos?' : 'Do I need to know Docker for either of them?'}</h4>
          <p>{isEs
            ? 'Solo para Ghostfolio auto-alojado: tendrás que desplegar y mantener su contenedor Docker (o pagar su versión cloud). CoreBalance no requiere ninguna instalación: se abre en el navegador y los datos se guardan localmente en tu dispositivo.'
            : 'Only for self-hosted Ghostfolio: you will need to deploy and maintain its Docker container (or pay for its cloud version). CoreBalance requires no installation at all: it opens in your browser and your data is stored locally on your device.'}</p>
        </div>
        <div class="faq-item">
          <h4>{isEs ? '¿Puedo usar ambas herramientas a la vez?' : 'Can I use both tools at the same time?'}</h4>
          <p>{isEs
            ? 'Sí, se complementan bien. Puedes usar Ghostfolio como panel de patrimonio global con sus métricas TWR y benchmark, y CoreBalance para el momento clave del mes: calcular al céntimo cómo repartir tu aportación entre fondos sin vender nada.'
            : 'Yes, they complement each other well. You can use Ghostfolio as your global wealth dashboard with its TWR metrics and benchmarking, and CoreBalance for the key moment of the month: calculating to the cent how to split your contribution between funds without selling anything.'}</p>
        </div>
      </div>
    </section>

    <!-- Conclusión y CTA -->
    <section class="conclusion-cta">
      <div class="cta-inner">
        <h2>{isEs ? '¿Listo para rebalancear tu cartera de forma sencilla?' : 'Ready to rebalance your portfolio easily?'}</h2>
        <p>{isEs
          ? 'Prueba CoreBalance de forma totalmente gratuita. Sin cuentas, sin servidores que mantener, y 100% privado en tu navegador.'
          : 'Try CoreBalance 100% free. No accounts, no servers to maintain, and 100% private in your browser.'}</p>
        <button class="btn-primary" onclick={() => goto($link('/'))}>{isEs ? 'Probar Calculadora Gratis' : 'Try Calculator Free'}</button>
      </div>
    </section>

    <!-- Otras comparativas -->
    <section class="other-comparisons" aria-labelledby="other-comparisons-title">
      <h2 id="other-comparisons-title">{isEs ? 'Otras comparativas' : 'Other comparisons'}</h2>
      <ul>
        <li><a href={$link('/comparativas/corebalance-vs-portfolio-performance')}>CoreBalance vs Portfolio Performance</a></li>
        <li><a href={$link('/comparativas/corebalance-vs-excel')}>{isEs ? 'CoreBalance vs Excel y Google Sheets' : 'CoreBalance vs Excel & Google Sheets'}</a></li>
        <li><a href={$link('/comparativas/corebalance-vs-indexa-capital')}>CoreBalance vs Indexa Capital</a></li>
        <li><a href={$link('/comparativas/corebalance-vs-justetf')}>CoreBalance vs JustETF</a></li>
      </ul>
    </section>
  </main>

  <RelatedReading items={data.relatedReading} {lang} />

  <LandingFooter />
</div>

<style>
  .compare-page {
    background: var(--bg-primary, #05050a);
    color: var(--text-primary);
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }

  .compare-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 140px 1.5rem 80px;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 2rem;
    justify-content: center;
  }

  .breadcrumb a {
    color: var(--accent-blue-ink);
    text-decoration: none;
    font-weight: 500;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .breadcrumb .separator {
    color: var(--text-faint);
  }

  .breadcrumb .current {
    color: var(--text-secondary);
  }

  .compare-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .category-badge {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent-blue-ink);
    background: rgba(59, 130, 246, 0.1);
    padding: 0.35rem 0.85rem;
    border-radius: 9999px;
    letter-spacing: 0.05em;
    display: inline-block;
    margin-bottom: 1.5rem;
  }

  .gradient-text {
    font-size: 3.2rem;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: 1.5rem;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #ffffff 40%, #a78bfa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 768px) {
    .gradient-text {
      font-size: 2.25rem;
    }
    .mobile-break {
      display: none;
    }
  }

  .subtitle {
    color: var(--text-muted, rgba(160, 160, 200, 0.8));
    font-size: 1.2rem;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .intro-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 4rem;
  }

  @media (max-width: 768px) {
    .intro-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
  }

  .intro-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    border-radius: 24px;
    padding: 2.5rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .corebalance-intro {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(139, 92, 246, 0.03) 100%);
    border-color: rgba(59, 130, 246, 0.15);
  }

  .intro-card h3 {
    font-size: 1.6rem;
    font-weight: 800;
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .tagline {
    color: var(--accent-blue-ink);
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
  }

  .corebalance-intro .tagline {
    color: var(--accent-blue-ink);
  }

  .description {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Tabla styling */
  .table-section {
    margin-bottom: 5rem;
  }

  .table-section h2 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 2rem;
    text-align: center;
  }

  .table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.01);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    min-width: 600px;
  }

  th, td {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
    font-size: 1rem;
  }

  th {
    background: var(--bg-card);
    font-weight: 700;
    color: var(--text-primary);
  }

  .highlight-col {
    background: rgba(59, 130, 246, 0.04);
    font-weight: 600;
    color: var(--text-primary);
  }

  tr:last-child td {
    border-bottom: none;
  }

  .feature-title {
    font-weight: 600;
    color: var(--text-primary);
  }

  /* Caso de estudio */
  .case-study-section {
    margin-bottom: 5rem;
  }

  .case-study-section h2 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .section-desc {
    color: var(--text-muted, rgba(160, 160, 200, 0.8));
    text-align: center;
    margin-bottom: 2.5rem;
    font-size: 1.1rem;
  }

  .study-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  @media (max-width: 768px) {
    .study-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
  }

  .study-card {
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
    border-radius: 20px;
    padding: 2rem;
  }

  .study-card h4 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 1.25rem;
    color: var(--text-primary);
  }

  .highlight-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(59, 130, 246, 0.02) 100%);
    border-color: rgba(16, 185, 129, 0.15);
  }

  .highlight-card h4 {
    color: var(--accent-green-ink);
  }

  .study-card ul {
    list-style: decimal;
    padding-left: 1.25rem;
    margin: 0;
  }

  .study-card li {
    margin-bottom: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .study-card li:last-child {
    margin-bottom: 0;
    font-weight: 700;
    color: var(--text-primary);
  }

  /* Pros y contras cards */
  .details-section {
    margin-bottom: 5rem;
  }

  .details-section h2 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 2.5rem;
    text-align: center;
  }

  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  @media (max-width: 768px) {
    .details-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
  }

  .details-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    border-radius: 20px;
    padding: 2.5rem;
  }

  .pros-title {
    color: var(--state-positive);
    font-size: 1.3rem;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 1.5rem;
  }

  .cons-title {
    color: var(--state-negative);
    font-size: 1.3rem;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 1.5rem;
  }

  .details-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .details-card li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    line-height: 1.6;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .check-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--accent-blue-ink);
  }

  /* FAQ section */
  .faq-section {
    margin-bottom: 5rem;
  }

  .faq-section h2 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 2.5rem;
    text-align: center;
  }

  .faq-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5rem;
  }

  @media (max-width: 768px) {
    .faq-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
  }

  .faq-item h4 {
    font-size: 1.15rem;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 0.75rem;
    color: var(--text-primary);
  }

  .faq-item p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  /* CTA final */
  .conclusion-cta {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 24px;
    padding: 3.5rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .cta-inner {
    position: relative;
    z-index: 2;
    max-width: 600px;
    margin: 0 auto;
  }

  .conclusion-cta h2 {
    font-size: 2rem;
    font-weight: 800;
    margin-top: 0;
    margin-bottom: 1rem;
    letter-spacing: -0.02em;
  }

  .conclusion-cta p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 2rem;
    font-size: 1.05rem;
  }

  .btn-primary {
    background: var(--accent-blue);
    color: var(--text-on-accent);
    border: none;
    padding: 0.85rem 2rem;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
  }

  .btn-primary:active {
    transform: scale(0.98);
  }
  /* Otras comparativas */
  .other-comparisons {
    margin-top: 3rem;
  }

  .other-comparisons h2 {
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 1.25rem;
  }

  .other-comparisons ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .other-comparisons a {
    display: block;
    padding: 1rem 1.25rem;
    border-radius: 16px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-card);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .other-comparisons a:hover {
    transform: translateY(-3px);
    border-color: rgba(59, 130, 246, 0.28);
    background: var(--bg-card);
  }
</style>
