<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { LL, locale } from '$lib/i18n/i18n-svelte';
  import { link } from '$lib/i18n/link';

  let isEs = $derived($locale === 'es');
</script>

<footer class="landing-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="brand-col">
        <div class="logo-group">
          <Logo size={36} clase="logo" />
          <span class="brand-name">CoreBalance</span>
        </div>
        <p>{$LL.footer.tagline()}</p>
      </div>

      <div class="links-col">
        <h3>{$LL.nav.product()}</h3>
        <ul>
          <li><a href={$link('/#features')}>{$LL.nav.features()}</a></li>
          <li><a href={$link('/#how-it-works')}>{$LL.nav.how_it_works()}</a></li>
          <li><a href={$link('/#why-us')}>{$LL.nav.why_us()}</a></li>
          <li>
            <button 
              class="footer-btn" 
              onclick={() => ui.showChangelog = true}
            >
              {$LL.nav.changelog()}
            </button>
          </li>
        </ul>
      </div>

      <div class="links-col">
        <h3>{isEs ? 'Recursos' : 'Resources'}</h3>
        <ul>
          <li><a href={$link('/blog')}>{$LL.nav.blog()}</a></li>
          <li><a href={$link('/herramientas/calculadora-ter')}>{isEs ? 'Calculadora TER' : 'TER Calculator'}</a></li>
          <li><a href={$link('/herramientas/checklist-rebalanceo')}>{isEs ? 'Checklist Rebalanceo' : 'Rebalancing Checklist'}</a></li>
          <li><a href={$link('/herramientas/simulador-crisis')}>{isEs ? 'Simulador de crisis' : 'Crash simulator'}</a></li>
          <li><a href={$link('/herramientas/calculadora-precio-medio')}>{isEs ? 'Calculadora de precio medio' : 'Average cost calculator'}</a></li>
          <li><a href={$link('/autor/kinacho')}>{isEs ? 'Sobre el autor' : 'About the author'}</a></li>
          <li><a href={isEs ? '/rss.xml' : '/en/rss.xml'}>RSS</a></li>
        </ul>
      </div>

      <div class="links-col">
        <h3>{isEs ? 'Comparativas' : 'Comparisons'}</h3>
        <ul>
          <li><a href={$link('/comparativas/corebalance-vs-excel')}>vs Excel / Sheets</a></li>
          <li><a href={$link('/comparativas/corebalance-vs-indexa-capital')}>vs Indexa Capital</a></li>
          <li><a href={$link('/comparativas/corebalance-vs-portfolio-performance')}>vs Portfolio Performance</a></li>
          <li><a href={$link('/comparativas/corebalance-vs-justetf')}>vs JustETF</a></li>
          <li><a href={$link('/comparativas/corebalance-vs-ghostfolio')}>vs Ghostfolio</a></li>
        </ul>
      </div>

      <div class="links-col">
        <h3>{$LL.nav.legal()}</h3>
        <ul>
          <li><a href={$link('/privacy')}>{$LL.footer.privacy()}</a></li>
          <li><a href={$link('/terms')}>{$LL.footer.terms()}</a></li>
          <li><a href={$link('/cookies')}>{$LL.footer.cookies()}</a></li>
        </ul>
      </div>

      <div class="links-col">
        <h3>{$LL.nav.community()}</h3>
        <ul>
          <li>
            <button 
              class="footer-btn" 
              onclick={() => { ui.supportType = 'bug'; ui.showSupportModal = true; }}
            >
              {$LL.footer.report_bug()}
            </button>
          </li>
          <li><a href="https://paypal.me/kinacho" target="_blank" rel="noopener noreferrer">{$LL.footer.support_project()}</a></li>
          <li>
            <button 
              class="footer-btn" 
              onclick={() => { ui.supportType = 'contact'; ui.showSupportModal = true; }}
            >
              {$LL.footer.contact()}
            </button>
          </li>
        </ul>
      </div>
    </div>


    <div class="footer-bottom">
      <p>© {new Date().getFullYear()} CoreBalance. {$LL.footer.made_with()}</p>
      <div class="legal-notice">
        {$LL.footer.legal_notice()}
      </div>
    </div>
  </div>
</footer>

<style>
  .landing-footer {
    padding: 80px 1.5rem 40px;
    background: var(--bg-primary);
    border-top: 1px solid var(--border-subtle);
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

  .logo-group :global(.logo) {
    width: 32px;
    height: 32px;
  }

  @media (min-width: 768px) {
    .logo-group :global(.logo) {
      width: 36px;
      height: 36px;
    }
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .brand-col p {
    color: var(--text-muted);
    line-height: 1.6;
    max-width: 300px;
    margin-bottom: 2rem;
  }

  h3 {
    color: var(--text-primary);
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
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s ease;
    background: transparent;
    border: none;
    cursor: pointer;
    /* Medidos a 390 px: 16-18 px de alto. Un pie de página es casi todo enlaces y
       es lo último que se toca en móvil, así que van con sitio para el dedo. */
    display: inline-block;
    padding: 0.45rem 0;
    font-family: inherit;
    display: inline;
  }

  li a:hover, .footer-btn:hover {
    color: var(--accent-blue-ink);
  }

  .footer-bottom {
    padding-top: 2rem;
    border-top: 1px solid var(--border-subtle);
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
    color: var(--text-faint);
    font-size: 0.85rem;
    margin: 0;
  }

  .legal-notice {
    color: var(--text-faint);
    font-size: 0.75rem;
  }
</style>
