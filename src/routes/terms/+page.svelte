<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';

  const lastUpdate = new Intl.DateTimeFormat('es-ES', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(new Date());
</script>

<svelte:head>
  <title>Términos y Condiciones — CoreBalance</title>
  <meta name="description" content="Lee nuestros términos y condiciones de uso. Conoce las condiciones bajo las cuales puedes usar la herramienta de rebalanceo CoreBalance." />
</svelte:head>

<div class="legal-page">
  <LandingNavBar onStart={() => window.location.href = '/'} />

  <main class="legal-content">
    <div class="container">
      <h1>Términos y Condiciones de Uso</h1>
      <p class="update-date">Última actualización: {lastUpdate}</p>

      <section>
        <h2>1. Descripción del Servicio</h2>
        <p>
          CoreBalance es una herramienta web diseñada para ayudar a inversores particulares a gestionar, 
          analizar y rebalancear sus carteras de fondos indexados, ETFs y otros activos financieros. 
          El servicio permite el registro de posiciones, el cálculo de aportaciones necesarias para mantener una estrategia 
          determinada y la visualización de métricas de rendimiento.
        </p>
      </section>

      <section>
        <h2>2. Aviso Legal y Limitación de Responsabilidad</h2>
        <div class="disclaimer">
          <p><strong>IMPORTANTE:</strong> CoreBalance NO constituye asesoramiento financiero, de inversión ni fiscal.</p>
          <p>
            Toda la información mostrada es puramente orientativa y educativa. Los cálculos se basan en datos introducidos por el usuario 
            y precios de mercado que pueden sufrir retrasos o inexactitudes.
          </p>
          <p>
            El titular de la aplicación no se hace responsable de ninguna pérdida financiera, decisión de inversión errónea 
            o perjuicio derivado del uso de esta herramienta. Usted invierte siempre bajo su propia responsabilidad.
          </p>
        </div>
      </section>

      <section>
        <h2>3. Uso de la Aplicación</h2>
        <p>Al utilizar CoreBalance, usted se compromete a:</p>
        <ul>
          <li>Proporcionar información veraz en el registro de sus activos.</li>
          <li>No utilizar la plataforma para fines ilícitos o fraudulentos.</li>
          <li>No intentar vulnerar la seguridad de la aplicación ni realizar ingeniería inversa.</li>
        </ul>
      </section>

      <section>
        <h2>4. Propiedad Intelectual</h2>
        <p>
          El código fuente (exceptuando bibliotecas de código abierto), el diseño, la marca CoreBalance y los contenidos originales 
          son propiedad exclusiva de su creador. Queda prohibida la reproducción total o parcial del software para fines comerciales 
          sin autorización expresa.
        </p>
      </section>

      <section>
        <h2>5. Registro y Cuentas</h2>
        <p>
          El acceso a las funciones de sincronización requiere la creación de una cuenta a través de Google o email. 
          Usted es responsable de mantener la confidencialidad de su sesión. Nos reservamos el derecho de suspender 
          cuentas que infrinjan estos términos.
        </p>
      </section>

      <section>
        <h2>6. Modificaciones</h2>
        <p>
          Me reservo el derecho de modificar el servicio o estos términos en cualquier momento para adaptarlos 
          a nuevas funcionalidades o cambios legislativos. El uso continuado de la app tras un cambio implica la aceptación de los nuevos términos.
        </p>
      </section>

      <section>
        <h2>7. Ley Aplicable y Jurisdicción</h2>
        <p>
          Estos términos se rigen por la <strong>legislación española</strong>. Para cualquier controversia legal, las partes 
          se someten a los juzgados y tribunales de la ciudad de residencia del titular en España, renunciando a cualquier otro fuero.
        </p>
      </section>

      <section>
        <h2>8. Contacto</h2>
        <p>Si tiene dudas sobre estos términos, puede contactarme en: <strong>soporte@corebalance.app</strong>.</p>
      </section>
    </div>
  </main>

  <LandingFooter />
</div>

<style>
  .legal-page {
    background: var(--bg-primary, #05050a);
    color: #fff;
    min-height: 100vh;
  }

  .legal-content {
    padding: 120px 1.5rem 80px;
    line-height: 1.6;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }

  .update-date {
    color: rgba(160, 160, 200, 0.5);
    font-size: 0.9rem;
    margin-bottom: 3rem;
  }

  section {
    margin-bottom: 2.5rem;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--accent-blue, #3b82f6);
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 1rem;
  }

  ul {
    padding-left: 1.5rem;
    margin-bottom: 1rem;
    color: rgba(255, 255, 255, 0.8);
  }

  li {
    margin-bottom: 0.5rem;
  }

  .disclaimer {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    padding: 1.5rem;
    border-radius: 16px;
    margin-bottom: 1rem;
  }

  .disclaimer p {
    color: #fca5a5;
    margin-bottom: 0.5rem;
  }

  .disclaimer p:last-child {
    margin-bottom: 0;
  }

  strong {
    color: #fff;
  }
</style>
