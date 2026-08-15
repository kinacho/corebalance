<script lang="ts">
  import { LL } from '$lib/i18n/i18n-svelte';
  import { link } from '$lib/i18n/link';

  const comparison = $derived([
    {
      feature: $LL.comparison.item_prices_title(),
      excel: $LL.comparison.item_prices_excel(),
      others: $LL.comparison.item_prices_others(),
      corebalance: $LL.comparison.item_prices_core(),
      highlight: true
    },
    {
      feature: $LL.comparison.item_calc_title(),
      excel: $LL.comparison.item_calc_excel(),
      others: $LL.comparison.item_calc_others(),
      corebalance: $LL.comparison.item_calc_core(),
      highlight: true
    },
    {
      feature: $LL.comparison.item_privacy_title(),
      excel: $LL.comparison.item_privacy_excel(),
      others: $LL.comparison.item_privacy_others(),
      corebalance: $LL.comparison.item_privacy_core(),
      highlight: true
    },
    {
      feature: $LL.comparison.item_ease_title(),
      excel: $LL.comparison.item_ease_excel(),
      others: $LL.comparison.item_ease_others(),
      corebalance: $LL.comparison.item_ease_core(),
      highlight: true
    },
    {
      feature: $LL.comparison.item_ledger_title(),
      excel: $LL.comparison.item_ledger_excel(),
      others: $LL.comparison.item_ledger_others(),
      corebalance: $LL.comparison.item_ledger_core(),
      highlight: true
    },
    {
      feature: $LL.comparison.item_currency_title(),
      excel: $LL.comparison.item_currency_excel(),
      others: $LL.comparison.item_currency_others(),
      corebalance: $LL.comparison.item_currency_core(),
      highlight: true
    }
  ]);

  const comparisonLinks = [
    { href: '/comparativas/corebalance-vs-portfolio-performance', label: 'vs Portfolio Performance' },
    { href: '/comparativas/corebalance-vs-excel', label: 'vs Excel / Sheets' },
    { href: '/comparativas/corebalance-vs-indexa-capital', label: 'vs Indexa Capital' },
    { href: '/comparativas/corebalance-vs-justetf', label: 'vs JustETF' },
    { href: '/comparativas/corebalance-vs-ghostfolio', label: 'vs Ghostfolio' }
  ];
</script>

<section class="comparison">
  <div class="container">
    <div class="section-header">
      <h2>{$LL.comparison.title()} <span class="text-gradient">{$LL.comparison.title_gradient()}</span> {$LL.comparison.title_and()}</h2>
      <p>{$LL.comparison.subtitle()}</p>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>{$LL.comparison.col_feature()}</th>
            <th>{$LL.comparison.col_excel()}</th>
            <th>{$LL.comparison.col_others()}</th>
            <th class="active-col">CoreBalance</th>
          </tr>
        </thead>
        <tbody>
          {#each comparison as item}
            <tr>
              <td class="feature-name">{item.feature}</td>
              <td>{item.excel}</td>
              <td>{item.others}</td>
              <td class="active-col">{item.corebalance}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <p class="comparison-links">
      <span class="links-label">{$LL.comparison.see_full()}</span>
      {#each comparisonLinks as cl, i}
        <a href={$link(cl.href)}>{cl.label}</a>{#if i < comparisonLinks.length - 1}<span class="links-sep" aria-hidden="true"> · </span>{/if}
      {/each}
    </p>
  </div>
</section>

<style>
  .comparison {
    padding: 80px 1rem;
  }

  @media (min-width: 768px) {
    .comparison {
      padding: 100px 1.5rem;
    }
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
  }

  .section-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  @media (min-width: 768px) {
    .section-header {
      margin-bottom: 4rem;
    }
  }

  h2 {
    font-size: clamp(1.75rem, 5vw, 2.5rem);
    font-weight: 800;
    margin-bottom: 1.25rem;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .text-gradient {
    background: linear-gradient(135deg, var(--accent-blue) 0%, #1d4ed8 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .section-header p {
    color: var(--text-muted);
    font-size: 1rem;
    max-width: 600px;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .section-header p {
      font-size: 1.1rem;
    }
  }

  .table-container {
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 20px;
    overflow-x: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    -webkit-overflow-scrolling: touch;
  }

  @media (min-width: 768px) {
    .table-container {
      border-radius: 24px;
    }
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 500px;
  }

  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    font-size: 0.85rem;
  }

  @media (min-width: 768px) {
    th, td {
      padding: 1.5rem;
      font-size: 0.95rem;
    }
  }

  th {
    color: var(--text-faint);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.65rem;
    letter-spacing: 0.1em;
  }

  @media (min-width: 768px) {
    th {
      font-size: 0.75rem;
    }
  }

  .feature-name {
    color: var(--text-primary);
    font-weight: 600;
    position: sticky;
    left: 0;
    background: var(--bg-elevated);
    z-index: 1;
  }

  td {
    color: var(--text-muted);
  }

  .active-col {
    background: rgba(59, 130, 246, 0.05);
    color: var(--accent-blue-ink);
    font-weight: 700;
    text-align: center;
  }

  th.active-col {
    color: var(--accent-blue-ink);
  }

  .comparison-links {
    margin-top: 2rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.8;
  }

  .links-label {
    margin-right: 0.5rem;
  }

  .comparison-links a {
    color: var(--accent-blue-ink);
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.2s ease;
  }

  .comparison-links a:hover {
    color: var(--accent-blue-ink);
    text-decoration: underline;
  }

  .links-sep {
    margin: 0 0.35rem;
  }

  /**
   * ⚠️ En móvil esta fila de enlaces **se salía de la pantalla y quedaba
   * recortada**, no desplazada: medido a 390 px, un enlace ocupaba de 328 a 442 y
   * el separador siguiente empezaba en 448, o sea fuera. Los enlaces llevan
   * `white-space: nowrap` a propósito —«vs Portfolio Performance» partido en dos
   * líneas se lee peor—, y con el párrafo centrado eso deja al último sin sitio
   * donde caer. Como lista que envuelve de verdad, cada enlace ocupa su línea si
   * hace falta; los separadores sobran ahí, que era su única función.
   */
  @media (max-width: 640px) {
    .comparison-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.15rem 0.75rem;
    }

    .links-label {
      margin-right: 0;
      width: 100%;
    }

    .links-sep {
      display: none;
    }

    /* Y con sitio para el dedo: 18 px de alto no es un objetivo de toque. */
    .comparison-links a {
      padding: 0.35rem 0;
    }
  }
</style>

