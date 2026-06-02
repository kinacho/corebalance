<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { onMount } from 'svelte';

  const lastUpdate = new Intl.DateTimeFormat('es-ES', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(new Date());

  function openContact() {
    ui.supportType = 'contact';
    ui.showSupportModal = true;
  }
</script>

<svelte:head>
  <title>Política de Privacidad — CoreBalance</title>
  <meta name="description" content="Consulta nuestra política de privacidad. En CoreBalance priorizamos tu seguridad y privacidad utilizando almacenamiento local por defecto." />
</svelte:head>

<div class="legal-page">
  <LandingNavBar onStart={() => window.location.href = '/'} />

  <main class="legal-content">
    <div class="container">
      <h1>Política de Privacidad</h1>
      <p class="update-date">Última actualización: {lastUpdate}</p>

      <section>
        <h2>1. Responsable del Tratamiento</h2>
        <p>
          El responsable del tratamiento de sus datos personales es un desarrollador individual con residencia en España. 
          Puede contactar conmigo a través del <button class="contact-link" onclick={openContact}>formulario de contacto</button>.
        </p>
      </section>

      <section>
        <h2>2. Datos que recogemos</h2>
        <p>Para el funcionamiento de CoreBalance, tratamos las siguientes categorías de datos:</p>
        <ul>
          <li><strong>Datos de Identificación:</strong> Correo electrónico (facilitado a través de Google Auth o registro directo en Firebase).</li>
          <li><strong>Datos de Sesión:</strong> Identificadores únicos de usuario, fecha de último acceso y tokens de sesión gestionados por Firebase Authentication.</li>
          <li><strong>Datos Financieros:</strong> Información sobre activos, participaciones, precios de compra y objetivos de cartera introducidos voluntariamente por el usuario.</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalidad del Tratamiento</h2>
        <p>Sus datos son tratados exclusivamente para:</p>
        <ul>
          <li>Permitirle el acceso y uso de la aplicación CoreBalance.</li>
          <li>Sincronizar su cartera entre diferentes dispositivos.</li>
          <li>Realizar los cálculos de rebalanceo y proyecciones financieras solicitadas.</li>
          <li>Mantener la seguridad de su cuenta y prevenir accesos no autorizados.</li>
        </ul>
      </section>

      <section>
        <h2>4. Base Legal</h2>
        <p>
          Tratamos sus datos en base a la <strong>ejecución de un contrato</strong> (los Términos y Condiciones que acepta al usar la app) 
          y su <strong>consentimiento explícito</strong> al registrarse y subir su información financiera.
        </p>
      </section>

      <section>
        <h2>5. Destinatarios y Proveedores de Servicios</h2>
        <p>No vendemos ni cedemos sus datos a terceros. Sin embargo, utilizamos proveedores de infraestructura esenciales:</p>
        <ul>
          <li><strong>Google Firebase (Irlanda/EE.UU.):</strong> Hosting, base de datos (Firestore) y autenticación. Google cumple con las Cláusulas Contractuales Tipo de la UE para transferencias internacionales.</li>
          <li><strong>Vercel (EE.UU.):</strong> Despliegue de la aplicación.</li>
        </ul>
      </section>

      <section>
        <h2>6. Retención de Datos</h2>
        <p>
          Conservaremos sus datos mientras mantenga su cuenta activa. Si decide eliminar su cuenta, sus datos personales 
          y financieros serán borrados de nuestras bases de datos activas inmediatamente (salvo copias de seguridad residuales 
          que se eliminan en ciclos automáticos de 30 días).
        </p>
      </section>

      <section>
        <h2>7. Sus Derechos</h2>
        <p>Como usuario en la UE, le ampara el RGPD para ejercer sus derechos de:</p>
        <ul>
          <li><strong>Acceso:</strong> Saber qué datos tenemos.</li>
          <li><strong>Rectificación:</strong> Corregir datos erróneos.</li>
          <li><strong>Supresión (Derecho al Olvido):</strong> Solicitar el borrado de sus datos.</li>
          <li><strong>Portabilidad:</strong> Descargar sus datos en un formato legible.</li>
          <li><strong>Oposición y Limitación:</strong> En casos específicos previstos por la ley.</li>
        </ul>
        <p>Para ejercer estos derechos, utilice el <button class="contact-link" onclick={openContact}>formulario de contacto</button>.</p>
      </section>

      <section>
        <h2>8. Seguridad</h2>
        <p>
          CoreBalance utiliza medidas de seguridad técnicas avanzadas proporcionadas por Firebase, incluyendo cifrado 
          en tránsito (SSL/TLS) y en reposo.
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

  strong {
    color: #fff;
  }

  .contact-link {
    background: none;
    border: none;
    color: var(--accent-blue, #3b82f6);
    text-decoration: underline;
    font: inherit;
    cursor: pointer;
    padding: 0;
    font-weight: 700;
  }

  .contact-link:hover {
    color: #60a5fa;
  }
</style>
