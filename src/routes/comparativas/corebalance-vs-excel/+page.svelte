<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>CoreBalance vs Excel y Google Sheets | Comparativa Completa</title>
  <meta name="description" content="Comparativa detallada entre CoreBalance y las hojas de cálculo (Excel, Google Sheets) para el rebalanceo de carteras. Analizamos usabilidad, mantenimiento y privacidad." />
</svelte:head>

<div class="compare-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto('/')} />

  <main class="compare-container">
    <header class="compare-header">
      <span class="category-badge">Comparativa de Herramientas</span>
      <h1 class="gradient-text">CoreBalance vs <br class="mobile-break">Excel / Google Sheets</h1>
      <p class="subtitle">
        ¿Prefieres lidiar con fórmulas rotas, APIs inestables y zoom de pantalla en tu móvil o rebalancear tu cartera de fondos en 5 segundos con total privacidad?
      </p>
    </header>

    <!-- Sección de Introducción Rápida -->
    <section class="intro-section">
      <div class="intro-grid">
        <div class="intro-card corebalance-intro">
          <h3>CoreBalance</h3>
          <p class="tagline">La solución dedicada y local-first sin mantenimiento</p>
          <p class="description">
            Una calculadora web optimizada que funciona en local. Sin registrarte, introduces tus porcentajes objetivo e importes mensuales y calcula la distribución óptima en segundos. Diseñada especialmente para pantallas móviles y ordenadores.
          </p>
        </div>
        <div class="intro-card excel-intro">
          <h3>Excel / Sheets</h3>
          <p class="tagline">La hoja en blanco clásica y altamente configurable</p>
          <p class="description">
            Perfecta para quienes aman el control manual total y desean diseñar simulaciones personalizadas a largo plazo. Requiere programar fórmulas, lidiar con errores de cotizaciones en tiempo real y tolerar la fricción en pantallas táctiles.
          </p>
        </div>
      </div>
    </section>

    <!-- Tabla Comparativa -->
    <section class="table-section">
      <h2>Comparativa de Características</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Característica</th>
              <th class="highlight-col">CoreBalance</th>
              <th>Excel / Google Sheets</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-title">Tiempo de Configuración</td>
              <td class="highlight-col">Segundos (sin registrarse)</td>
              <td>Horas (creando fórmulas y celdas)</td>
            </tr>
            <tr>
              <td class="feature-title">Mantenimiento de Fórmulas</td>
              <td class="highlight-col">Nulo (se encarga el sistema)</td>
              <td>Constante (APIs que fallan, errores de formato)</td>
            </tr>
            <tr>
              <td class="feature-title">Privacidad en la nube</td>
              <td class="highlight-col">100% Privado (datos locales encriptados)</td>
              <td>Media-Baja (datos guardados en servidores de Google/Microsoft)</td>
            </tr>
            <tr>
              <td class="feature-title">Uso en teléfonos móviles</td>
              <td class="highlight-col">Perfecto (diseño adaptado nativamente)</td>
              <td>Poco práctico (fricción al editar celdas pequeñas)</td>
            </tr>
            <tr>
              <td class="feature-title">Cálculo de aportaciones</td>
              <td class="highlight-col">Automático al céntimo</td>
              <td>Requiere programar fórmulas lógicas complejas</td>
            </tr>
            <tr>
              <td class="feature-title">Coste</td>
              <td class="highlight-col">Gratuito y sin publicidad</td>
              <td>Gratuito (Google) o licencia Office (Excel)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Detalle de Pros y Contras -->
    <section class="details-section">
      <h2>Pros y Contras: ¿Cuál te conviene más?</h2>
      <div class="details-grid">
        <div class="details-card">
          <h3 class="pros-title">Elige CoreBalance si buscas:</h3>
          <ul>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <strong>Rapidez y comodidad:</strong> Olvídate de programar o arrastrar celdas. La aplicación calcula todo por ti de forma automática.
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <strong>Seguridad fiscal y operativa:</strong> Evita errores aritméticos humanos que puedan desbalancear tu cartera de forma involuntaria.
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <strong>Sincronización local offline:</strong> Puedes usarla en cualquier sitio sin preocuparte de si tu plantilla sincroniza correctamente en la nube.
            </li>
          </ul>
        </div>
        <div class="details-card">
          <h3 class="cons-title">Elige Hojas de Cálculo si buscas:</h3>
          <ul>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <strong>Personalización a medida:</strong> Añadir columnas con ratios personalizados, gráficos de tarta a medida y tablas de amortización.
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <strong>Simulación histórica compleja:</strong> Proyecciones de interés compuesto a 40 años con variaciones aleatorias (Método de Montecarlo).
            </li>
            <li>
              <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <strong>Historial de aportaciones guardado:</strong> Registro histórico de cada aportación mensual detallada en una pestaña separada.
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Conclusión y CTA -->
    <section class="conclusion-cta">
      <div class="cta-inner">
        <h2>Simplifica tu rebalanceo mensual hoy mismo</h2>
        <p>Prueba la calculadora de CoreBalance de forma 100% gratuita y privada. Tus datos financieros nunca saldrán de tu dispositivo.</p>
        <button class="btn-primary" onclick={() => goto('/')}>Probar CoreBalance Gratis</button>
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
