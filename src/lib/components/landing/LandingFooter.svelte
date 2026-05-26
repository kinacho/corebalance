<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { ui } from '$lib/stores/ui.svelte';
</script>

<footer class="landing-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="brand-col">
        <div class="logo-group">
          <picture>
            <source srcset="/logo.webp" type="image/webp" />
            <img src="/logo.png" alt="CoreBalance" class="logo" width="28" height="28" loading="lazy" />
          </picture>
          <span class="brand-name">CoreBalance</span>
        </div>
        <p>Tu centro de mandos para una gestión de activos inteligente y equilibrada.</p>
      </div>

      <div class="links-col">
        <h3>Producto</h3>
        <ul>
          <li><a href="/#features">Características</a></li>
          <li><a href="/#how-it-works">Cómo funciona</a></li>
          <li><a href="/#why-us">Por qué CoreBalance</a></li>
          <li><span class="link-disabled">Sincronización (Próximamente)</span></li>
        </ul>
      </div>

      <div class="links-col">
        <h3>Legal</h3>
        <ul>
          <li><a href="/privacy">Privacidad</a></li>
          <li><a href="/terms">Términos</a></li>
          <li><a href="/cookies">Cookies</a></li>
        </ul>
      </div>

      <div class="links-col">
        <h3>Comunidad</h3>
        <ul>
          <li>
            <button 
              class="footer-btn" 
              onclick={() => { ui.supportType = 'bug'; ui.showSupportModal = true; }}
            >
              Reportar un error
            </button>
          </li>
          <li><a href="https://paypal.me/kinacho" target="_blank" rel="noopener noreferrer">Apoya el proyecto</a></li>
          <li>
            <button 
              class="footer-btn" 
              onclick={() => { ui.supportType = 'contact'; ui.showSupportModal = true; }}
            >
              Contacto
            </button>
          </li>
        </ul>
      </div>
    </div>


    <div class="footer-bottom">
      <p>© {new Date().getFullYear()} CoreBalance. Hecho con ❤️ para la comunidad inversora.</p>
      <div class="legal-notice">
        CoreBalance es una herramienta informativa. No constituye asesoramiento financiero.
      </div>
    </div>
  </div>
</footer>

<style>
  .landing-footer {
    padding: 80px 1.5rem 40px;
    background: #05050a;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 4rem;
    margin-bottom: 4rem;
  }

  @media (min-width: 1024px) {
    .brand-col {
      grid-column: span 2;
    }
  }

  .logo-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .logo {
    width: 28px;
    height: 28px;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 800;
    color: #fff;
  }

  .brand-col p {
    color: rgba(160, 160, 200, 0.5);
    line-height: 1.6;
    max-width: 300px;
    margin-bottom: 2rem;
  }

  h3 {
    color: #fff;
    font-weight: 700;
    margin-bottom: 1.5rem;
    font-size: 1rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    margin-bottom: 0.75rem;
  }

  li a, .footer-btn {
    color: rgba(160, 160, 200, 0.5);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s ease;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
    display: inline;
  }

  li a:hover, .footer-btn:hover {
    color: #3b82f6;
  }

  .link-disabled {
    color: rgba(160, 160, 200, 0.2);
    font-size: 0.9rem;
    cursor: not-allowed;
  }

  .footer-bottom {
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }

  @media (min-width: 768px) {
    .footer-bottom {
      flex-direction: row;
      justify-content: space-between;
      text-align: left;
    }
  }

  .footer-bottom p {
    color: rgba(160, 160, 200, 0.3);
    font-size: 0.85rem;
    margin: 0;
  }

  .legal-notice {
    color: rgba(160, 160, 200, 0.2);
    font-size: 0.75rem;
  }
</style>
