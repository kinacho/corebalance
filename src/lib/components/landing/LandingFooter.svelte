<script lang="ts">
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
          <img src="/logo.png?v=2" alt="CoreBalance" class="logo" width="36" height="36" loading="lazy" />
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
    width: 32px;
    height: 32px;
  }

  @media (min-width: 768px) {
    .logo {
      width: 36px;
      height: 36px;
    }
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
