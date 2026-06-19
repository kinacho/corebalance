<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let isEs = $derived($page.data.locale === 'es');

  // Metadatos
  const metaTitle = $derived(isEs 
    ? 'CoreBalance vs Portfolio Performance | Comparativa Completa' 
    : 'CoreBalance vs Portfolio Performance | Complete Comparison'
  );
  const metaDesc = $derived(isEs 
    ? 'Comparativa detallada de CoreBalance frente a Portfolio Performance. Analizamos usabilidad, privacidad, curva de aprendizaje y rebalanceo de carteras.' 
    : 'Detailed comparison between CoreBalance and Portfolio Performance. We analyze usability, privacy, learning curve, and portfolio rebalancing.'
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
            "item": "https://corebalance.app"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Comparativas",
            "item": "https://corebalance.app/comparativas/corebalance-vs-portfolio-performance"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "vs Portfolio Performance",
            "item": "https://corebalance.app/comparativas/corebalance-vs-portfolio-performance"
          }
        ]
      },
      {
        "@type": "Article",
        "headline": metaTitle,
        "description": metaDesc,
        "image": "https://corebalance.app/og-image.png",
        "author": {
          "@type": "Organization",
          "name": "CoreBalance"
        },
        "publisher": {
          "@type": "Organization",
          "name": "CoreBalance",
          "logo": {
            "@type": "ImageObject",
            "url": "https://corebalance.app/logo.png"
          }
        },
        "mainEntityOfPage": "https://corebalance.app/comparativas/corebalance-vs-portfolio-performance"
      }
    ]
  });

  const schemaString = $derived(JSON.stringify(schemaData));
</script>

<svelte:head>
  <title>{metaTitle}</title>
  <meta name="description" content={metaDesc} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://corebalance.app/comparativas/corebalance-vs-portfolio-performance" />
  <meta property="og:title" content={metaTitle} />
  <meta property="og:description" content={metaDesc} />
  <meta property="og:image" content="https://corebalance.app/og-image.png" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://corebalance.app/comparativas/corebalance-vs-portfolio-performance" />
  <meta name="twitter:title" content={metaTitle} />
  <meta name="twitter:description" content={metaDesc} />
  <meta name="twitter:image" content="https://corebalance.app/og-image.png" />

  {@html `<script type="application/ld+json">${schemaString}</script>`}
</svelte:head>

<div class="compare-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto('/')} />

  <main class="compare-container">
    <!-- Breadcrumb visual -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">{isEs ? 'Inicio' : 'Home'}</a>
      <span class="separator">/</span>
      <span class="current">{isEs ? 'Comparativas' : 'Comparisons'}</span>
      <span class="separator">/</span>
      <span class="current">vs Portfolio Performance</span>
    </nav>

    <header class="compare-header">
      <span class="category-badge">{isEs ? 'Comparativa de Herramientas' : 'Tool Comparison'}</span>
      <h1 class="gradient-text">CoreBalance vs <br class="mobile-break">Portfolio Performance</h1>
      <p class="subtitle">
        {isEs 
          ? '¿Buscas un análisis exhaustivo e histórico de tu cartera o necesitas un método ágil y privado para rebalancear tus fondos indexados cada mes?' 
          : 'Are you looking for an exhaustive and historical analysis of your portfolio or do you need an agile and private method to rebalance your index funds every month?'}
      </p>
    </header>

    <!-- Sección de Introducción Rápida -->
    <section class="intro-section">
      <div class="intro-grid">
        <div class="intro-card corebalance-intro">
          <h3>CoreBalance</h3>
          <p class="tagline">{isEs ? 'La alternativa moderna, local-first y enfocada en el rebalanceo' : 'The modern, local-first alternative focused on rebalancing'}</p>
          <p class="description">
            {isEs 
              ? 'Una herramienta web ultrarrápida diseñada exclusivamente para inversores pasivos. Calcula tus aportaciones y traspasos al céntimo en segundos, manteniendo tus datos 100% privados en tu propio navegador.' 
              : 'An ultra-fast web tool designed exclusively for passive investors. It calculates your contributions and transfers to the cent in seconds, keeping your data 100% private in your own browser.'}
          </p>
        </div>
        <div class="intro-card pp-intro">
          <h3>Portfolio Performance</h3>
          <p class="tagline">{isEs ? 'El gigante clásico de escritorio para analistas detallistas' : 'The classic desktop giant for detailed analysts'}</p>
          <p class="description">
            {isEs 
              ? 'Un software de escritorio de código abierto sumamente potente. Ideal para registrar transacciones históricas al céntimo, calcular retornos ponderados (TWR) y analizar dividendos, a cambio de una alta complejidad.' 
              : 'An extremely powerful open-source desktop software. Ideal for recording historical transactions to the cent, calculating time-weighted returns (TWR), and analyzing dividends, at the expense of high complexity.'}
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
              <th>Portfolio Performance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-title">{isEs ? 'Plataforma' : 'Platform'}</td>
              <td class="highlight-col">{isEs ? 'Web y Móvil (Responsive)' : 'Web & Mobile (Responsive)'}</td>
              <td>{isEs ? 'Escritorio (Windows, Mac, Linux)' : 'Desktop (Windows, Mac, Linux)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Curva de Aprendizaje' : 'Learning Curve'}</td>
              <td class="highlight-col">{isEs ? 'Nula (Segundos)' : 'None (Seconds)'}</td>
              <td>{isEs ? 'Muy alta (Horas de tutoriales)' : 'Very High (Hours of tutorials)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Privacidad de datos' : 'Data Privacy'}</td>
              <td class="highlight-col">{isEs ? 'Excelente (Local-first en tu navegador)' : 'Excellent (Local-first in your browser)'}</td>
              <td>{isEs ? 'Excelente (Archivo local en tu disco duro)' : 'Excellent (Local file on your hard drive)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Cálculo de Rebalanceo' : 'Rebalancing Calculation'}</td>
              <td class="highlight-col">{isEs ? 'Automático y optimizado para aportaciones' : 'Automatic and optimized for contributions'}</td>
              <td>{isEs ? 'Manual mediante reglas de desvío complejas' : 'Manual via complex deviation rules'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Importación de Transacciones' : 'Transaction Importing'}</td>
              <td class="highlight-col">{isEs ? 'No requerida (solo introduces saldos o CSV opcional)' : 'Optional (just enter balances or optional CSV)'}</td>
              <td>{isEs ? 'Requerida (mediante PDFs bancarios o CSV)' : 'Required (via bank PDFs or CSV)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Precio' : 'Price'}</td>
              <td class="highlight-col">{isEs ? 'Gratuito y sin anuncios' : 'Free and ad-free'}</td>
              <td>{isEs ? 'Gratuito (Código Abierto)' : 'Free (Open Source)'}</td>
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
          ? 'Comparamos la experiencia del rebalanceo mensual de aportaciones.'
          : 'We compare the monthly rebalancing contribution experience.'}
      </p>
      <div class="study-grid">
        <div class="study-card">
          <h4>Portfolio Performance</h4>
          <ul>
            <li>{isEs ? 'Descargar los PDFs de las operaciones del mes de tu banco comercializador.' : 'Download this month\'s transaction PDFs from your retail bank.'}</li>
            <li>{isEs ? 'Importar los PDFs al programa y depurar fallos en la detección de nombres/ISIN.' : 'Import the PDFs into the software and debug name/ISIN detection failures.'}</li>
            <li>{isEs ? 'Crear taxonomías y reglas de rebalanceo manuales.' : 'Create taxonomies and manual rebalancing rules.'}</li>
            <li>{isEs ? 'Calcular a mano cuánto comprar para cuadrar los desvíos.' : 'Manually calculate how much to buy to correct deviations.'}</li>
            <li>{isEs ? 'Tiempo estimado: 15-20 minutos.' : 'Estimated time: 15-20 minutes.'}</li>
          </ul>
        </div>
        <div class="study-card highlight-card">
          <h4>CoreBalance</h4>
          <ul>
            <li>{isEs ? 'Abrir CoreBalance en el navegador (móvil o PC).' : 'Open CoreBalance in your browser (mobile or PC).'}</li>
            <li>{isEs ? 'Saldos actualizados al instante en local.' : 'Balances instantly updated locally.'}</li>
            <li>{isEs ? 'Escribir la aportación del mes y obtener las compras idóneas.' : 'Type this month\'s contribution and get the ideal purchases.'}</li>
            <li>{isEs ? 'Copiar las operaciones y realizarlas en tu banco.' : 'Copy the operations and perform them in your bank.'}</li>
            <li>{isEs ? 'Tiempo estimado: 5 segundos.' : 'Estimated time: 5 seconds.'}</li>
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
              <span><strong>{isEs ? 'Simplicidad operativa:' : 'Operational simplicity:'}</strong> {isEs ? 'Configuras tus fondos y actualizas tus saldos en menos de un minuto al mes.' : 'Set up your funds and update your balances in less than a minute per month.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Optimización del ahorro:' : 'Savings optimization:'}</strong> {isEs ? 'Introduce lo que vas a ahorrar este mes y la herramienta calcula de forma exacta cuánto destinar a cada fondo.' : 'Enter what you are going to save this month and the tool calculates exactly how much to allocate to each fund.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Acceso rápido multidispositivo:' : 'Fast multi-device access:'}</strong> {isEs ? 'Consúltalo y actualízalo desde el teléfono móvil cómodamente sin instalar software de PC.' : 'Check and update it from your mobile phone comfortably without installing PC software.'}</span>
            </li>
          </ul>
        </div>
        <div class="details-card">
          <h3 class="cons-title">{isEs ? 'Elige Portfolio Performance si buscas:' : 'Choose Portfolio Performance if you want:'}</h3>
          <ul>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Análisis histórico profundo:' : 'Deep historical analysis:'}</strong> {isEs ? 'Gráficas de rentabilidad ponderada en el tiempo (TWR) y comparativas contra benchmarks.' : 'Time-weighted return (TWR) charts and comparative benchmarking.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Control exhaustivo de transacciones:' : 'Exhaustive transaction control:'}</strong> {isEs ? 'Registro detallado de cada comisión bancaria, dividendo cobrado y retención fiscal.' : 'Detailed record of every bank fee, dividend collected, and tax withholding.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Inversión activa o trading:' : 'Active investing or trading:'}</strong> {isEs ? 'Soporte avanzado para opciones, futuros y acciones individuales con múltiples operaciones diarias.' : 'Advanced support for options, futures, and individual stocks with multiple daily operations.'}</span>
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
          <h4>{isEs ? '¿Puedo usar ambas aplicaciones a la vez?' : 'Can I use both apps at the same time?'}</h4>
          <p>{isEs 
            ? 'Sí. Muchos inversores usan Portfolio Performance en el PC para analizar el rendimiento anual y CoreBalance en el móvil o navegador para calcular el rebalanceo mensual rápido de forma muy ágil.' 
            : 'Yes. Many investors use Portfolio Performance on PC to analyze annual performance and CoreBalance on mobile or browser to calculate the quick monthly rebalancing very efficiently.'}</p>
        </div>
        <div class="faq-item">
          <h4>{isEs ? '¿Por qué elegir CoreBalance si Portfolio Performance tiene más métricas?' : 'Why choose CoreBalance if Portfolio Performance has more metrics?'}</h4>
          <p>{isEs 
            ? 'Por simplicidad y usabilidad móvil. Portfolio Performance requiere configurar cotizaciones externas complejas de Yahoo Finance o AlphaVantage que fallan recurrentemente. CoreBalance ofrece una interfaz limpia donde todo funciona a la primera.' 
            : 'For simplicity and mobile usability. Portfolio Performance requires configuring complex external quotes from Yahoo Finance or AlphaVantage that recurrently fail. CoreBalance offers a clean interface where everything works out-of-the-box.'}</p>
        </div>
      </div>
    </section>

    <!-- Conclusión y CTA -->
    <section class="conclusion-cta">
      <div class="cta-inner">
        <h2>{isEs ? '¿Listo para rebalancear tu cartera de forma sencilla?' : 'Ready to rebalance your portfolio easily?'}</h2>
        <p>{isEs 
          ? 'Prueba CoreBalance de forma totalmente gratuita. Sin cuentas, sin registros, y 100% privado en tu navegador.' 
          : 'Try CoreBalance 100% free. No accounts, no signups, and 100% private in your browser.'}</p>
        <button class="btn-primary" onclick={() => goto('/')}>{isEs ? 'Probar Calculadora Gratis' : 'Try Calculator Free'}</button>
      </div>
    </section>
  </main>

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
</style>
