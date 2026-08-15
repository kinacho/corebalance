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
    ? 'CoreBalance vs Excel y Google Sheets | Comparativa Completa' 
    : 'CoreBalance vs Excel & Google Sheets | Complete Comparison'
  );
  const metaDesc = $derived(isEs 
    ? 'Comparativa detallada entre CoreBalance y las hojas de cálculo (Excel, Google Sheets) para el rebalanceo de carteras. Analizamos usabilidad, mantenimiento y privacidad.' 
    : 'Detailed comparison between CoreBalance and spreadsheets (Excel, Google Sheets) for portfolio rebalancing. We analyze usability, maintenance, and privacy.'
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
            "name": "vs Excel",
            "item": canonical
          }
        ]
      },
      {
        "@type": "Article",
        "headline": metaTitle,
        "description": metaDesc,
        "image": `${SITE_URL}${pageOgImage('vs-excel', lang)}`,
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
  image={pageOgImage('vs-excel', lang)}
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
      <span class="current">vs Excel & Sheets</span>
    </nav>

    <header class="compare-header">
      <span class="category-badge">{isEs ? 'Comparativa de Herramientas' : 'Tool Comparison'}</span>
      <h1 class="gradient-text">CoreBalance vs <br class="mobile-break">Excel / Google Sheets</h1>
      <p class="subtitle">
        {isEs 
          ? '¿Prefieres lidiar con fórmulas rotas, APIs inestables y zoom de pantalla en tu móvil o rebalancear tu cartera de fondos en 5 segundos con total privacidad?' 
          : 'Do you prefer dealing with broken formulas, unstable APIs, and screen zooming on your mobile, or rebalancing your fund portfolio in 5 seconds with total privacy?'}
      </p>
    </header>

    <!-- Sección de Introducción Rápida -->
    <section class="intro-section">
      <div class="intro-grid">
        <div class="intro-card corebalance-intro">
          <h3>CoreBalance</h3>
          <p class="tagline">{isEs ? 'La solución dedicada y local-first sin mantenimiento' : 'The dedicated, maintenance-free local-first solution'}</p>
          <p class="description">
            {isEs 
              ? 'Una calculadora web optimizada que funciona en local. Sin registrarte, introduces tus porcentajes objetivo e importes mensuales y calcula la distribución óptima en segundos. Diseñada especialmente para pantallas móviles y ordenadores.' 
              : 'An optimized web calculator that works locally. Without registration, enter your target percentages and monthly amounts, and it calculates the optimal distribution in seconds. Specifically designed for mobile screens and desktops.'}
          </p>
        </div>
        <div class="intro-card excel-intro">
          <h3>Excel / Sheets</h3>
          <p class="tagline">{isEs ? 'La hoja en blanco clásica y altamente configurable' : 'The classic, highly configurable blank sheet'}</p>
          <p class="description">
            {isEs 
              ? 'Perfecta para quienes aman el control manual total y desean diseñar simulaciones personalizadas a largo plazo. Requiere programar fórmulas, lidiar con errores de cotizaciones en tiempo real y tolerar la fricción en pantallas táctiles.' 
              : 'Perfect for those who love total manual control and want to design custom long-term simulations. Requires programming formulas, dealing with real-time quote errors, and tolerating friction on touchscreens.'}
          </p>
        </div>
      </div>
    </section>

    <!-- Tabla Comparativa -->
    <section class="table-section">
      <h2>{isEs ? 'Comparativa de Características' : 'Feature Comparison'}</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>{isEs ? 'Característica' : 'Feature'}</th>
              <th class="highlight-col">CoreBalance</th>
              <th>Excel / Google Sheets</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-title">{isEs ? 'Tiempo de Configuración' : 'Setup Time'}</td>
              <td class="highlight-col">{isEs ? 'Segundos (sin registrarse)' : 'Seconds (no signup)'}</td>
              <td>{isEs ? 'Horas (creando fórmulas y celdas)' : 'Hours (creating formulas & cells)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Mantenimiento de Fórmulas' : 'Formula Maintenance'}</td>
              <td class="highlight-col">{isEs ? 'Nulo (se encarga el sistema)' : 'None (handled by system)'}</td>
              <td>{isEs ? 'Constante (APIs que fallan, errores de formato)' : 'Constant (failing APIs, formatting errors)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Privacidad en la nube' : 'Cloud Privacy'}</td>
              <td class="highlight-col">{isEs ? '100% privado (datos locales en tu navegador, sin servidor)' : '100% private (local data in your browser, no server)'}</td>
              <td>{isEs ? 'Media-Baja (datos guardados en servidores de Google/Microsoft)' : 'Medium-Low (stored on Google/Microsoft servers)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Uso en teléfonos móviles' : 'Mobile Usability'}</td>
              <td class="highlight-col">{isEs ? 'Perfecto (diseño adaptado nativamente)' : 'Perfect (natively adapted design)'}</td>
              <td>{isEs ? 'Poco práctico (fricción al editar celdas pequeñas)' : 'Impractical (friction editing small cells)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Cálculo de aportaciones' : 'Contribution Calculation'}</td>
              <td class="highlight-col">{isEs ? 'Automático al céntimo' : 'Automatic to the cent'}</td>
              <td>{isEs ? 'Requiere programar fórmulas lógicas complejas' : 'Requires programming complex logic'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Coste' : 'Cost'}</td>
              <td class="highlight-col">{isEs ? 'Gratuito y sin publicidad' : 'Free and ad-free'}</td>
              <td>{isEs ? 'Gratuito (Google) o licencia Office (Excel)' : 'Free (Google) or Office License (Excel)'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Caso de estudio real / Real-world case study -->
    <section class="case-study-section">
      <h2>{isEs ? 'Caso de Uso Real: El Rebalanceo Mensual' : 'Real-World Case Study: Monthly Rebalancing'}</h2>
      <p class="section-desc">
        {isEs
          ? 'Comparamos la experiencia real de un inversor indexado que aporta 500 € mensuales a su cartera de 4 fondos.'
          : 'We compare the actual experience of an index investor contributing €500 monthly to a 4-fund portfolio.'}
      </p>
      <div class="study-grid">
        <div class="study-card">
          <h4>{isEs ? 'Con Hojas de Cálculo (Excel / Sheets)' : 'With Spreadsheets (Excel / Sheets)'}</h4>
          <ul>
            <li>{isEs ? 'Abrir archivo e iniciar sesión en Google/Microsoft.' : 'Open file and log into Google/Microsoft.'}</li>
            <li>{isEs ? 'Esperar a que carguen las cotizaciones (a veces fallan y dan error #N/A).' : 'Wait for quotes to load (sometimes fails with #N/A error).'}</li>
            <li>{isEs ? 'Revisar manualmente que ninguna celda o fila se haya desconfigurado.' : 'Manually check that no cell or row has lost its format.'}</li>
            <li>{isEs ? 'Calcular a mano con fórmulas la compra de activos.' : 'Manually calculate asset purchases using formulas.'}</li>
            <li>{isEs ? 'Tiempo estimado: 10-15 minutos.' : 'Estimated time: 10-15 minutes.'}</li>
          </ul>
        </div>
        <div class="study-card highlight-card">
          <h4>{isEs ? 'Con CoreBalance' : 'With CoreBalance'}</h4>
          <ul>
            <li>{isEs ? 'Abrir la web o app en tu móvil (carga inmediata en 1 segundo).' : 'Open the web or app on your mobile (instant 1-second load).'}</li>
            <li>{isEs ? 'Los precios se actualizan solos al instante y de forma fiable.' : 'Prices update automatically and reliably.'}</li>
            <li>{isEs ? 'Introducir el importe del mes (ej: 500 €).' : 'Enter the month\'s amount (e.g., €500).'}</li>
            <li>{isEs ? 'Ver el cálculo preciso de aportaciones y copiarlo a tu comercializadora.' : 'See the exact contribution calculations and copy them to your broker.'}</li>
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
              <span><strong>{isEs ? 'Rapidez y comodidad:' : 'Speed and convenience:'}</strong> {isEs ? 'Olvídate de programar o arrastrar celdas. La aplicación calcula todo por ti de forma automática.' : 'Forget about programming or dragging cells. The app calculates everything for you automatically.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Seguridad fiscal y operativa:' : 'Tax and operational safety:'}</strong> {isEs ? 'Evita errores aritméticos humanos que puedan desbalancear tu cartera de forma involuntaria.' : 'Avoid human arithmetic errors that could unintentionally unbalance your portfolio.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Sincronización local offline:' : 'Local offline sync:'}</strong> {isEs ? 'Puedes usarla en cualquier sitio sin preocuparte de si tu plantilla sincroniza correctamente en la nube.' : 'You can use it anywhere without worrying about whether your template syncs correctly to the cloud.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Libro de transacciones con precio medio automático:' : 'Transaction ledger with automatic average cost:'}</strong> {isEs ? 'Registra compras, ventas, dividendos y traspasos, y calcula el precio medio de cada activo sin fórmulas.' : 'Records buys, sells, dividends, and transfers, and calculates each asset\'s average cost with no formulas.'}</span>
            </li>
          </ul>
        </div>
        <div class="details-card">
          <h3 class="cons-title">{isEs ? 'Elige Hojas de Cálculo si buscas:' : 'Choose Spreadsheets if you want:'}</h3>
          <ul>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Personalización a medida:' : 'Custom personalization:'}</strong> {isEs ? 'Añadir columnas con ratios personalizados, gráficos de tarta a medida y tablas de amortización.' : 'Add columns with custom ratios, tailored pie charts, and amortization tables.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Simulación histórica compleja:' : 'Complex historical simulation:'}</strong> {isEs ? 'Proyecciones de interés compuesto a 40 años con variaciones aleatorias (Método de Montecarlo).' : '40-year compound interest projections with random variations (Monte Carlo method).'}</span>
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
          <h4>{isEs ? '¿Puedo importar mis datos desde Excel a CoreBalance?' : 'Can I import my data from Excel to CoreBalance?'}</h4>
          <p>{isEs 
            ? 'Sí. Puedes guardar tu hoja de cálculo como un archivo CSV e importarlo directamente en la pestaña de Importar de CoreBalance para no tener que meter los activos a mano.' 
            : 'Yes. You can save your spreadsheet as a CSV file and import it directly into the Import tab in CoreBalance so you do not have to enter assets manually.'}</p>
        </div>
        <div class="faq-item">
          <h4>{isEs ? '¿Es CoreBalance seguro si mis datos se guardan en el navegador?' : 'Is CoreBalance secure if my data is saved in the browser?'}</h4>
          <p>{isEs 
            ? 'Totalmente. Al usar IndexedDB en local, tus datos financieros no se envían a ningún servidor de terceros, garantizando una privacidad que Google Sheets o Microsoft Excel 365 en la nube no pueden asegurar por completo.' 
            : 'Absolutely. By using IndexedDB locally, your financial data is not sent to any third-party servers, guaranteeing privacy that Google Sheets or Microsoft Excel 365 in the cloud cannot fully assure.'}</p>
        </div>
      </div>
    </section>

    <!-- Conclusión y CTA -->
    <section class="conclusion-cta">
      <div class="cta-inner">
        <h2>{isEs ? 'Simplifica tu rebalanceo mensual hoy mismo' : 'Simplify your monthly rebalancing today'}</h2>
        <p>{isEs 
          ? 'Prueba la calculadora de CoreBalance de forma 100% gratuita y privada. Tus datos financieros nunca saldrán de tu dispositivo.' 
          : 'Try the CoreBalance calculator 100% free and privately. Your financial data will never leave your device.'}</p>
        <button class="btn-primary" onclick={() => goto($link('/'))}>{isEs ? 'Probar CoreBalance Gratis' : 'Try CoreBalance Free'}</button>
      </div>
    </section>

    <!-- Otras comparativas -->
    <section class="other-comparisons" aria-labelledby="other-comparisons-title">
      <h2 id="other-comparisons-title">{isEs ? 'Otras comparativas' : 'Other comparisons'}</h2>
      <ul>
        <li><a href={$link('/comparativas/corebalance-vs-portfolio-performance')}>CoreBalance vs Portfolio Performance</a></li>
        <li><a href={$link('/comparativas/corebalance-vs-indexa-capital')}>CoreBalance vs Indexa Capital</a></li>
        <li><a href={$link('/comparativas/corebalance-vs-justetf')}>CoreBalance vs JustETF</a></li>
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
