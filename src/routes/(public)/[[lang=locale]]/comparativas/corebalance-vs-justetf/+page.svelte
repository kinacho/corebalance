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
    ? 'CoreBalance vs JustETF | Comparativa Honesta'
    : 'CoreBalance vs JustETF | Honest Comparison'
  );
  const metaDesc = $derived(isEs
    ? 'Comparativa honesta de CoreBalance frente a JustETF. Buscador de ETFs vs herramienta de rebalanceo: precio, privacidad, importación CSV y fiscalidad española.'
    : 'Honest comparison between CoreBalance and JustETF. ETF screener vs rebalancing tool: pricing, privacy, CSV importing, and Spanish tax awareness.'
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
            "name": "vs JustETF",
            "item": canonical
          }
        ]
      },
      {
        "@type": "Article",
        "headline": metaTitle,
        "description": metaDesc,
        "image": `${SITE_URL}${pageOgImage('vs-justetf', lang)}`,
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
  image={pageOgImage('vs-justetf', lang)}
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
      <span class="current">{isEs ? 'Comparativas' : 'Comparisons'}</span>
      <span class="separator">/</span>
      <span class="current">vs JustETF</span>
    </nav>

    <header class="compare-header">
      <span class="category-badge">{isEs ? 'Comparativa de Herramientas' : 'Tool Comparison'}</span>
      <h1 class="gradient-text">CoreBalance vs <br class="mobile-break">JustETF</h1>
      <p class="subtitle">
        {isEs
          ? '¿Necesitas encontrar y comparar el ETF perfecto o gestionar y rebalancear la cartera que ya tienes? Son dos trabajos distintos, y cada herramienta hace bien el suyo.'
          : 'Do you need to find and compare the perfect ETF, or to manage and rebalance the portfolio you already own? They are two different jobs, and each tool does its own well.'}
      </p>
    </header>

    <!-- Sección de Introducción Rápida -->
    <section class="intro-section">
      <div class="intro-grid">
        <div class="intro-card corebalance-intro">
          <h3>CoreBalance</h3>
          <p class="tagline">{isEs ? 'La herramienta gratuita de gestión y rebalanceo de tu cartera' : 'The free tool to manage and rebalance your portfolio'}</p>
          <p class="description">
            {isEs
              ? 'CoreBalance no es un buscador de ETFs: no tiene screener ni base de datos de fondos. Es la herramienta para la cartera que ya tienes: calcula el rebalanceo por aportación gratis, importa CSV de tu broker, lleva tu libro de transacciones con precio medio y funciona local-first sin registro.'
              : 'CoreBalance is not an ETF finder: it has no screener or fund database. It is the tool for the portfolio you already own: it calculates contribution-based rebalancing for free, imports your broker CSVs, keeps a transaction ledger with average cost, and runs local-first with no signup.'}
          </p>
        </div>
        <div class="intro-card pp-intro">
          <h3>JustETF</h3>
          <p class="tagline">{isEs ? 'El mejor buscador y comparador de ETFs UCITS de Europa' : 'The best UCITS ETF screener and comparison site in Europe'}</p>
          <p class="description">
            {isEs
              ? 'JustETF es la referencia europea para descubrir ETFs UCITS: un screener potentísimo con fichas detalladas, comparador de fondos y datos de mercado. Su planificador de cartera con rebalanceo y lista de órdenes forma parte de JustETF Premium, que es de pago.'
              : 'JustETF is the European reference for discovering UCITS ETFs: a powerful screener with detailed fund profiles, a fund comparison tool, and market data. Its portfolio planner with rebalancing and order lists is part of JustETF Premium, which is paid.'}
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
              <th>JustETF</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-title">{isEs ? 'Precio' : 'Price'}</td>
              <td class="highlight-col">{isEs ? 'Gratuito y sin anuncios' : 'Free and ad-free'}</td>
              <td>{isEs ? 'Buscador gratuito; planificador y rebalanceo en Premium (de pago)' : 'Free screener; planner and rebalancing in Premium (paid)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Cálculo de Rebalanceo' : 'Rebalancing Calculation'}</td>
              <td class="highlight-col">{isEs ? 'Gratis, por aportación y sin vender (evita aflorar plusvalías)' : 'Free, contribution-based and buy-only (avoids realizing gains)'}</td>
              <td>{isEs ? 'Incluido en Premium, con lista de órdenes' : 'Included in Premium, with order list'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Buscador / Screener de ETFs' : 'ETF Finder / Screener'}</td>
              <td class="highlight-col">{isEs ? 'No disponible (no es su función)' : 'Not available (not its job)'}</td>
              <td>{isEs ? 'Excelente: el mejor de Europa para ETFs UCITS' : 'Excellent: the best in Europe for UCITS ETFs'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Privacidad de datos' : 'Data Privacy'}</td>
              <td class="highlight-col">{isEs ? 'Local-first: tu cartera vive en tu navegador' : 'Local-first: your portfolio lives in your browser'}</td>
              <td>{isEs ? 'Tu cartera se guarda en sus servidores' : 'Your portfolio is stored on their servers'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Registro' : 'Signup'}</td>
              <td class="highlight-col">{isEs ? 'No requerido (cuenta opcional para sincronizar)' : 'Not required (optional account for sync)'}</td>
              <td>{isEs ? 'Requerido para guardar carteras' : 'Required to save portfolios'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Importación CSV de brokers' : 'Broker CSV Importing'}</td>
              <td class="highlight-col">{isEs ? 'Multi-broker: MyInvestor, DEGIRO, Trading 212, IBKR' : 'Multi-broker: MyInvestor, DEGIRO, Trading 212, IBKR'}</td>
              <td>{isEs ? 'Orientado a introducir operaciones en su planificador' : 'Oriented to entering transactions in its planner'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Fiscalidad Española' : 'Spanish Taxation'}</td>
              <td class="highlight-col">{isEs ? 'Consciente: distingue traspasos exentos de fondos vs venta de ETFs' : 'Aware: distinguishes tax-exempt fund transfers vs selling ETFs'}</td>
              <td>{isEs ? 'Enfoque generalista europeo, sin lógica fiscal española' : 'Pan-European approach, no Spanish tax logic'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Idioma' : 'Language'}</td>
              <td class="highlight-col">{isEs ? 'Español e inglés' : 'Spanish and English'}</td>
              <td>{isEs ? 'Varios idiomas europeos, incluido español' : 'Several European languages, including Spanish'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Caso de estudio / flujo complementario -->
    <section class="case-study-section">
      <h2>{isEs ? 'Dos Trabajos Distintos, un Mismo Flujo' : 'Two Different Jobs, One Workflow'}</h2>
      <p class="section-desc">
        {isEs
          ? 'No compiten en lo mismo: JustETF brilla antes de comprar; CoreBalance, después.'
          : 'They do not compete at the same thing: JustETF shines before you buy; CoreBalance, after.'}
      </p>
      <div class="study-grid">
        <div class="study-card">
          <h4>{isEs ? 'Antes de comprar: JustETF' : 'Before buying: JustETF'}</h4>
          <ul>
            <li>{isEs ? 'Filtrar en el screener por índice, TER, réplica y domicilio.' : 'Filter the screener by index, TER, replication, and domicile.'}</li>
            <li>{isEs ? 'Leer la ficha del ETF: composición, tamaño y política de distribución.' : 'Read the ETF profile: holdings, size, and distribution policy.'}</li>
            <li>{isEs ? 'Comparar varios candidatos lado a lado.' : 'Compare several candidates side by side.'}</li>
            <li>{isEs ? 'Decidir qué ETF encaja en tu estrategia.' : 'Decide which ETF fits your strategy.'}</li>
            <li>{isEs ? 'Resultado: sabes QUÉ comprar.' : 'Result: you know WHAT to buy.'}</li>
          </ul>
        </div>
        <div class="study-card highlight-card">
          <h4>{isEs ? 'Después de comprar: CoreBalance' : 'After buying: CoreBalance'}</h4>
          <ul>
            <li>{isEs ? 'Importar el CSV de tu broker o introducir tus posiciones.' : 'Import your broker CSV or enter your positions.'}</li>
            <li>{isEs ? 'Ver desviaciones frente a tu asignación objetivo en tiempo real.' : 'See deviations from your target allocation in real time.'}</li>
            <li>{isEs ? 'Escribir la aportación del mes y obtener cuánto comprar de cada activo.' : 'Type this month\'s contribution and get how much to buy of each asset.'}</li>
            <li>{isEs ? 'Ejecutar las órdenes en tu broker.' : 'Execute the orders at your broker.'}</li>
            <li>{isEs ? 'Resultado: sabes CUÁNTO comprar, gratis.' : 'Result: you know HOW MUCH to buy, for free.'}</li>
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
              <span><strong>{isEs ? 'Rebalanceo gratis por aportación:' : 'Free contribution-based rebalancing:'}</strong> {isEs ? 'Calcula al céntimo cuánto destinar a cada activo sin vender nada y sin pagar suscripciones.' : 'Calculates to the cent how much to allocate to each asset without selling anything and without paying subscriptions.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Gestión completa de la cartera:' : 'Full portfolio management:'}</strong> {isEs ? 'Libro de transacciones con precio medio, dividendos, cuentas remuneradas con interés y multi-divisa, con importación CSV de MyInvestor, DEGIRO, Trading 212 e IBKR.' : 'Transaction ledger with average cost, dividends, interest-bearing cash accounts, and multi-currency support, with CSV importing from MyInvestor, DEGIRO, Trading 212, and IBKR.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Privacidad y fiscalidad española:' : 'Privacy and Spanish tax awareness:'}</strong> {isEs ? 'Local-first sin registro obligatorio, y consciente de que los traspasos entre fondos indexados están exentos mientras que vender ETFs tributa.' : 'Local-first with no mandatory signup, and aware that transfers between index funds are tax-exempt in Spain while selling ETFs is taxable.'}</span>
            </li>
          </ul>
        </div>
        <div class="details-card">
          <h3 class="cons-title">{isEs ? 'Elige JustETF si buscas:' : 'Choose JustETF if you want:'}</h3>
          <ul>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Descubrir el ETF adecuado:' : 'Discovering the right ETF:'}</strong> {isEs ? 'El screener de ETFs UCITS más completo de Europa, con filtros por índice, coste, réplica y domicilio. Aquí no hay debate: es el mejor.' : 'The most complete UCITS ETF screener in Europe, with filters by index, cost, replication, and domicile. No debate here: it is the best.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Fichas y comparador de fondos:' : 'Fund profiles and comparison:'}</strong> {isEs ? 'Información detallada de cada ETF y comparación lado a lado antes de decidir en qué invertir.' : 'Detailed information on each ETF and side-by-side comparison before deciding what to invest in.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Todo en un ecosistema:' : 'Everything in one ecosystem:'}</strong> {isEs ? 'Si no te importa pagar Premium ni guardar tu cartera en sus servidores, su planificador integra búsqueda, seguimiento y rebalanceo en un solo sitio.' : 'If you do not mind paying for Premium or storing your portfolio on their servers, its planner integrates search, tracking, and rebalancing in one place.'}</span>
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
          <h4>{isEs ? '¿CoreBalance sustituye a JustETF?' : 'Does CoreBalance replace JustETF?'}</h4>
          <p>{isEs
            ? 'No, son complementarias. JustETF es un buscador y comparador de ETFs: te ayuda a decidir qué comprar. CoreBalance no tiene screener ni base de datos de fondos: es la herramienta para gestionar y rebalancear la cartera una vez que ya la tienes. El flujo natural es descubrir el ETF en JustETF y gestionarlo en CoreBalance.'
            : 'No, they are complementary. JustETF is an ETF screener and comparison site: it helps you decide what to buy. CoreBalance has no screener or fund database: it is the tool to manage and rebalance your portfolio once you own it. The natural workflow is discovering the ETF on JustETF and managing it in CoreBalance.'}</p>
        </div>
        <div class="faq-item">
          <h4>{isEs ? '¿Necesito JustETF Premium para rebalancear mi cartera?' : 'Do I need JustETF Premium to rebalance my portfolio?'}</h4>
          <p>{isEs
            ? 'En JustETF, sí: su planificador de cartera con rebalanceo y lista de órdenes forma parte de la suscripción Premium, que es de pago. En CoreBalance el cálculo de rebalanceo por aportación es gratuito, sin registro y con tus datos guardados localmente en tu navegador.'
            : 'On JustETF, yes: its portfolio planner with rebalancing and order lists is part of the Premium subscription, which is paid. In CoreBalance, contribution-based rebalancing is free, requires no signup, and keeps your data stored locally in your browser.'}</p>
        </div>
      </div>
    </section>

    <!-- Conclusión y CTA -->
    <section class="conclusion-cta">
      <div class="cta-inner">
        <h2>{isEs ? '¿Ya sabes qué ETFs quieres? Rebalancéalos gratis' : 'Already know which ETFs you want? Rebalance them for free'}</h2>
        <p>{isEs
          ? 'Descubre y compara el ETF en JustETF; gestiona y rebalancea tu cartera en CoreBalance. Sin cuentas, sin registros, y 100% privado en tu navegador.'
          : 'Discover and compare the ETF on JustETF; manage and rebalance your portfolio in CoreBalance. No accounts, no signups, and 100% private in your browser.'}</p>
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
        <li><a href={$link('/comparativas/corebalance-vs-ghostfolio')}>CoreBalance vs Ghostfolio</a></li>
      </ul>
    </section>
  </main>

  <RelatedReading items={data.relatedReading} {lang} />

  <LandingFooter />
</div>

<style>
  .compare-page {
    background: var(--bg-primary, #05050a);
    color: #fff;
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
    color: rgba(160, 160, 200, 0.6);
    margin-bottom: 2rem;
    justify-content: center;
  }

  .breadcrumb a {
    color: var(--accent-blue, #3b82f6);
    text-decoration: none;
    font-weight: 500;
  }

  .breadcrumb a:hover {
    text-decoration: underline;
  }

  .breadcrumb .separator {
    color: rgba(160, 160, 200, 0.4);
  }

  .breadcrumb .current {
    color: rgba(255, 255, 255, 0.8);
  }

  .compare-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .category-badge {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent-blue, #3b82f6);
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
    background: rgba(255, 255, 255, 0.02);
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
    color: var(--accent-blue, #3b82f6);
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
  }

  .corebalance-intro .tagline {
    color: #60a5fa;
  }

  .description {
    font-size: 1rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.75);
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
    background: rgba(255, 255, 255, 0.02);
    font-weight: 700;
    color: #fff;
  }

  .highlight-col {
    background: rgba(59, 130, 246, 0.04);
    font-weight: 600;
    color: #fff;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .feature-title {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
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
    color: rgba(255, 255, 255, 0.9);
  }

  .highlight-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(59, 130, 246, 0.02) 100%);
    border-color: rgba(16, 185, 129, 0.15);
  }

  .highlight-card h4 {
    color: var(--accent-green, #10b981);
  }

  .study-card ul {
    list-style: decimal;
    padding-left: 1.25rem;
    margin: 0;
  }

  .study-card li {
    margin-bottom: 0.85rem;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.5;
  }

  .study-card li:last-child {
    margin-bottom: 0;
    font-weight: 700;
    color: #fff;
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
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    border-radius: 20px;
    padding: 2.5rem;
  }

  .pros-title {
    color: #34d399;
    font-size: 1.3rem;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 1.5rem;
  }

  .cons-title {
    color: #fca5a5;
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
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.95rem;
  }

  .check-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--accent-blue, #3b82f6);
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
    color: #fff;
  }

  .faq-item p {
    color: rgba(255, 255, 255, 0.7);
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
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.6;
    margin-bottom: 2rem;
    font-size: 1.05rem;
  }

  .btn-primary {
    background: var(--accent-blue, #3b82f6);
    color: white;
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
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
    color: #fff;
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .other-comparisons a:hover {
    transform: translateY(-3px);
    border-color: rgba(59, 130, 246, 0.28);
    background: rgba(255, 255, 255, 0.04);
  }
</style>
