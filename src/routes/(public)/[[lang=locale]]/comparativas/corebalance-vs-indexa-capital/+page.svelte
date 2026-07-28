<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import SeoHead from '$lib/components/seo/SeoHead.svelte';
  import { pageOgImage } from '$lib/seo/og';
  import { link } from '$lib/i18n/link';
  import { alternates, SITE_URL, localizePath, absoluteUrl } from '$lib/i18n/routing';
  import type { Locales } from '$lib/i18n/i18n-types';

  const lang = $derived(($page.data.locale ?? 'es') as Locales);
  let isEs = $derived(lang === 'es');
  const canonical = $derived(alternates($page.url.pathname, lang).canonical);
  const homeUrl = $derived(absoluteUrl(localizePath('/', lang)));

  // Metadatos
  const metaTitle = $derived(isEs 
    ? 'CoreBalance vs Indexa Capital | Comparativa Completa' 
    : 'CoreBalance vs Indexa Capital | Complete Comparison'
  );
  const metaDesc = $derived(isEs 
    ? 'Comparativa detallada entre CoreBalance y el robo-advisor Indexa Capital. Analizamos comisiones, flexibilidad, control y privacidad de tus inversiones.' 
    : 'Detailed comparison between CoreBalance and the robo-advisor Indexa Capital. We analyze commissions, flexibility, control, and privacy of your investments.'
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
            "item": canonical
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "vs Indexa Capital",
            "item": canonical
          }
        ]
      },
      {
        "@type": "Article",
        "headline": metaTitle,
        "description": metaDesc,
        "image": `${SITE_URL}${pageOgImage('vs-indexa-capital', lang)}`,
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
  image={pageOgImage('vs-indexa-capital', lang)}
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
      <span class="current">vs Indexa Capital</span>
    </nav>

    <header class="compare-header">
      <span class="category-badge">{isEs ? 'Comparativa de Herramientas' : 'Tool Comparison'}</span>
      <h1 class="gradient-text">CoreBalance vs <br class="mobile-break">Indexa Capital</h1>
      <p class="subtitle">
        {isEs 
          ? '¿Delegación automática a cambio de comisiones adicionales o gestión independiente de tus propios fondos de forma gratuita y 100% privada?' 
          : 'Automatic delegation in exchange for additional fees or independent management of your own funds for free and 100% privately?'}
      </p>
    </header>

    <!-- Sección de Introducción Rápida -->
    <section class="intro-section">
      <div class="intro-grid">
        <div class="intro-card corebalance-intro">
          <h3>CoreBalance</h3>
          <p class="tagline">{isEs ? 'Control total e independencia sin comisiones de intermediación' : 'Total control and independence without intermediary fees'}</p>
          <p class="description">
            {isEs 
              ? 'Una calculadora web gratuita e interactiva diseñada para inversores independientes (DIY). Te permite rebalancear carteras propias en cualquier banco o bróker, optimizando aportaciones y manteniendo tu absoluta privacidad local.' 
              : 'A free and interactive web calculator designed for DIY investors. It allows you to rebalance your own portfolios at any bank or broker, optimizing contributions and maintaining absolute local privacy.'}
          </p>
        </div>
        <div class="intro-card indexa-intro">
          <h3>Indexa Capital</h3>
          <p class="tagline">{isEs ? 'El gestor automatizado (Robo-advisor) líder en España' : 'The leading automated manager (Robo-advisor) in Spain'}</p>
          <p class="description">
            {isEs 
              ? 'Un servicio financiero regulado que delega la gestión completa de tu cartera. Seleccionan tus fondos indexados, realizan compras y rebalancean de forma automática a cambio de cobrar una comisión de gestión adicional sobre tu capital.' 
              : 'A regulated financial service that delegates the full management of your portfolio. They select your index funds, make purchases, and rebalance automatically in exchange for an additional management fee on your capital.'}
          </p>
        </div>
      </div>
    </section>

    <!-- Tabla Comparativa -->
    <section class="table-section">
      <h2>{isEs ? 'Comparativa de Costes y Flexibilidad' : 'Cost & Flexibility Comparison'}</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>{isEs ? 'Característica' : 'Feature'}</th>
              <th class="highlight-col">CoreBalance</th>
              <th>Indexa Capital</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-title">{isEs ? 'Gestión y Rebalanceo' : 'Management & Rebalancing'}</td>
              <td class="highlight-col">{isEs ? 'Manual guiado (tú ejecutas las órdenes)' : 'Guided manual (you execute orders)'}</td>
              <td>{isEs ? '100% Automático (delegado en su plataforma)' : '100% Automatic (delegated to their platform)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Comisión de Gestión Adicional' : 'Additional Management Fee'}</td>
              <td class="highlight-col"><strong>{isEs ? '0% (Completamente gratuito)' : '0% (Completamente free)'}</strong></td>
              <td>{isEs ? '0.43% - 0.60% anual de media (según capital)' : '0.43% - 0.60% annually on average (by capital)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Flexibilidad de Fondos' : 'Fund Flexibility'}</td>
              <td class="highlight-col">{isEs ? 'Total (puedes elegir cualquier fondo o ETF)' : 'Total (you choose any fund or ETF)'}</td>
              <td>{isEs ? 'Limitada (perfiles cerrados con fondos preelegidos)' : 'Limited (closed profiles with pre-selected funds)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Custodia y Banco Origen' : 'Custody & Broker Choice'}</td>
              <td class="highlight-col">{isEs ? 'Cualquiera (MyInvestor, DeGiro, R4, etc.)' : 'Any (MyInvestor, DeGiro, R4, etc.)'}</td>
              <td>{isEs ? 'Restringida (Banco Inversis o Cecabank)' : 'Restricted (Inversis Bank or Cecabank)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Privacidad y Registro' : 'Privacy & Registration'}</td>
              <td class="highlight-col">{isEs ? 'Sin registro (datos locales en tu navegador)' : 'No registration (local browser data)'}</td>
              <td>{isEs ? 'Requerido (KYC completo, DNI y datos fiscales)' : 'Required (full KYC, ID, and tax data)'}</td>
            </tr>
            <tr>
              <td class="feature-title">{isEs ? 'Capital Mínimo' : 'Minimum Capital'}</td>
              <td class="highlight-col">{isEs ? 'Desde 0 €' : 'From 0 €'}</td>
              <td>{isEs ? 'Desde 3.000 € (para carteras diversificadas)' : 'From 3,000 € (for diversified portfolios)'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Caso de estudio / Cost comparison study -->
    <section class="case-study-section">
      <h2>{isEs ? 'El Impacto a Largo Plazo de las Comisiones' : 'The Long-Term Impact of Fees'}</h2>
      <p class="section-desc">
        {isEs 
          ? 'Simulación de costes de gestión acumulados en 10 años (asumiendo un coste de gestión adicional del 0.45% anual en Indexa Capital frente al coste 0% de CoreBalance).'
          : 'Simulation of accumulated management fees over 10 years (assuming an additional annual management fee of 0.45% in Indexa Capital vs 0% in CoreBalance).'}
      </p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>{isEs ? 'Capital Invertido' : 'Invested Capital'}</th>
              <th>{isEs ? 'Coste Anual (Indexa Capital)' : 'Annual Fee (Indexa Capital)'}</th>
              <th>{isEs ? 'Comisiones en 10 años (Indexa Capital)' : 'Fees in 10 Years (Indexa Capital)'}</th>
              <th class="highlight-col">{isEs ? 'Coste en CoreBalance' : 'Cost in CoreBalance'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10.000 €</td>
              <td>~45 €</td>
              <td>~450 €</td>
              <td class="highlight-col"><strong>0 €</strong></td>
            </tr>
            <tr>
              <td>50.000 €</td>
              <td>~225 €</td>
              <td>~2.250 €</td>
              <td class="highlight-col"><strong>0 €</strong></td>
            </tr>
            <tr>
              <td>100.000 €</td>
              <td>~450 €</td>
              <td>~4.500 €</td>
              <td class="highlight-col"><strong>0 €</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="note" style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-muted, rgba(160, 160, 200, 0.8)); text-align: center;">
        * {isEs ? 'Nota: La simulación no incluye el coste de los fondos subyacentes (TER), que ronda el 0.15% en ambos modelos. Solo se compara el coste por el servicio de gestión y rebalanceo.' : 'Note: This simulation does not include the underlying fund cost (TER) of approx. 0.15% which applies to both. It only compares the management fee charge.'}
      </p>
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
              <span><strong>{isEs ? 'Ahorro en comisiones:' : 'Fee savings:'}</strong> {isEs ? 'Al gestionar tú mismo la cartera en bancos sin comisiones de custodia (ej. MyInvestor), ahorras la comisión del gestor automatizado.' : 'By managing the portfolio yourself in custody-free banks (e.g. MyInvestor), you save the robo-advisor fee.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Libertad de activos:' : 'Asset freedom:'}</strong> {isEs ? 'Puedes combinar fondos indexados de Vanguard, Fidelity o Amundi e incorporar ETFs a tu gusto.' : 'You can combine Vanguard, Fidelity, or Amundi index funds and add ETFs to your liking.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Privacidad absoluta:' : 'Absolute privacy:'}</strong> {isEs ? 'Ideal si prefieres no compartir tus saldos financieros ni tu DNI en internet.' : 'Ideal if you prefer not to share your financial balances or ID card over the internet.'}</span>
            </li>
          </ul>
        </div>
        <div class="details-card">
          <h3 class="cons-title">{isEs ? 'Elige Indexa Capital si buscas:' : 'Choose Indexa Capital if you want:'}</h3>
          <ul>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Comodidad total (Manos libres):' : 'Total convenience (Hands-free):'}</strong> {isEs ? 'Solo transfieres dinero de tu cuenta bancaria y ellos se encargan de comprar y rebalancear automáticamente sin que intervengas.' : 'Just transfer money from your bank account and they handle buying and rebalancing automatically without your intervention.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Gestión de planes de pensiones:' : 'Pension plan management:'}</strong> {isEs ? 'Automatización no solo en fondos, sino también en planes de pensiones indexados.' : 'Automation not only in index funds, but also in index pension plans.'}</span>
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span><strong>{isEs ? 'Perfilado de riesgo inicial:' : 'Initial risk profiling:'}</strong> {isEs ? 'Test automatizado que decide tu cartera óptima si no sabes cómo elegir tu asignación de activos.' : 'An automated test that decides your optimal portfolio if you do not know how to choose your asset allocation.'}</span>
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
          <h4>{isEs ? '¿Es fácil replicar la cartera de Indexa Capital?' : 'Is it easy to replicate Indexa Capital\'s portfolio?'}</h4>
          <p>{isEs 
            ? 'Sí. Indexa Capital publica la composición de sus carteras en su web. Puedes configurarla idénticamente en CoreBalance y comprar esos fondos en MyInvestor o cualquier comercializadora para ahorrarte la comisión de gestión.' 
            : 'Yes. Indexa Capital publishes their portfolio allocations. You can replicate them identically in CoreBalance and buy those funds through MyInvestor or any other broker to save the management fee.'}</p>
        </div>
        <div class="faq-item">
          <h4>{isEs ? '¿Vale la pena gestionar la cartera a mano?' : 'Is it worth managing the portfolio manually?'}</h4>
          <p>{isEs 
            ? 'Si aportas de forma periódica una vez al mes, realizar las compras te llevará menos de 5 minutos utilizando los cálculos de CoreBalance. Para la mayoría de los inversores, ahorrar miles de euros a largo plazo compensa este pequeño esfuerzo mensual.' 
            : 'If you invest monthly, making the purchases takes less than 5 minutes using CoreBalance calculations. For most investors, saving thousands of euros over the long term outweighs this small monthly effort.'}</p>
        </div>
      </div>
    </section>

    <!-- Conclusión y CTA -->
    <section class="conclusion-cta">
      <div class="cta-inner">
        <h2>{isEs ? 'Toma las riendas de tu inversión de forma privada' : 'Take control of your investments privately'}</h2>
        <p>{isEs 
          ? 'Utiliza CoreBalance gratis para calcular tus rebalanceos y mantén todo tu capital invertido sin pagar comisiones de gestión.' 
          : 'Use CoreBalance for free to calculate your rebalancing and keep all your capital invested without paying management fees.'}</p>
        <button class="btn-primary" onclick={() => goto($link('/'))}>{isEs ? 'Probar CoreBalance Gratis' : 'Try CoreBalance Free'}</button>
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
