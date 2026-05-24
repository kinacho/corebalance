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
  <title>Política de Cookies — CoreBalance</title>
</svelte:head>

<div class="legal-page">
  <LandingNavBar onStart={() => window.location.href = '/'} />

  <main class="legal-content">
    <div class="container">
      <h1>Política de Cookies</h1>
      <p class="update-date">Última actualización: {lastUpdate}</p>

      <section>
        <h2>1. ¿Qué es una cookie?</h2>
        <p>
          Una cookie es un pequeño fichero de texto que se almacena en su navegador cuando visita casi cualquier página web. 
          Su utilidad es que la web sea capaz de recordar su visita cuando vuelva a navegar por esa página.
        </p>
      </section>

      <section>
        <h2>2. Cookies utilizadas en CoreBalance</h2>
        <p>
          Siguiendo las directrices de la Agencia Española de Protección de Datos y la normativa europea, procedemos a detallar 
          el uso de cookies que hace esta web. CoreBalance utiliza una política de <strong>mínima intrusión</strong>.
        </p>

        <h3>Cookies Técnicas y Estrictamente Necesarias</h3>
        <p>
          Estas cookies son esenciales para el funcionamiento de la app y no requieren su consentimiento previo según la 
          Directiva ePrivacy (excepción para servicios solicitados por el usuario).
        </p>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Origen</th>
                <th>Finalidad</th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>__session / firebase_auth</td>
                <td>Google Firebase</td>
                <td>Mantener la sesión del usuario autenticado.</td>
                <td>Sesión / Persistente</td>
              </tr>
              <tr>
                <td>bypassLanding</td>
                <td>CoreBalance (sessionStorage)</td>
                <td>Recordar que el usuario ha solicitado entrar al dashboard en la pestaña actual.</td>
                <td>Sesión</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>3. Cookies de Terceros y Analítica</h2>
        <p>
          CoreBalance <strong>no utiliza</strong> cookies de publicidad, seguimiento comportamental ni marketing de terceros.
        </p>
        <p>
          Podemos utilizar herramientas de analítica básica proporcionadas por <strong>Vercel Analytics</strong> o 
          <strong>Speed Insights</strong> para medir el rendimiento de la web. Estas herramientas están configuradas para ser 
          lo más respetuosas posible con la privacidad, utilizando en su mayoría datos agregados y anónimos.
        </p>
      </section>

      <section>
        <h2>4. Cómo desactivar las cookies</h2>
        <p>
          Usted puede restringir, bloquear o borrar las cookies de CoreBalance utilizando su navegador. En cada navegador 
          la operativa es diferente:
        </p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647?hl=es" target="_blank">Chrome</a></li>
          <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63491102-8316-6551-34a1-5360f35352c2" target="_blank">Edge</a></li>
          <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank">Firefox</a></li>
          <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank">Safari</a></li>
        </ul>
        <p><em>Tenga en cuenta que si desactiva las cookies técnicas, es posible que no pueda iniciar sesión ni usar las funciones principales de la aplicación.</em></p>
      </section>

      <section>
        <h2>5. Notas Adicionales</h2>
        <p>
          Ni esta web ni sus representantes legales se hacen responsables ni del contenido ni de la veracidad de las 
          políticas de privacidad que puedan tener los terceros mencionados en esta política de cookies (como Google).
        </p>
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

  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
    color: #fff;
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

  li a {
    color: var(--accent-blue, #3b82f6);
    text-decoration: none;
  }

  li a:hover {
    text-decoration: underline;
  }

  .table-container {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
    margin: 1.5rem 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th {
    background: rgba(255, 255, 255, 0.05);
    text-align: left;
    padding: 0.75rem 1rem;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 600;
  }

  td {
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
  }

  strong {
    color: #fff;
  }
</style>
