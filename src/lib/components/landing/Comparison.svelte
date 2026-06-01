<script lang="ts">
  import { LL } from '$lib/i18n/i18n-svelte';

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
    }
  ]);
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
    color: #fff;
    line-height: 1.2;
  }

  .text-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .section-header p {
    color: rgba(160, 160, 200, 0.6);
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
    background: var(--bg-secondary, #0f0f14);
    border: 1px solid rgba(255, 255, 255, 0.05);
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
    color: rgba(255, 255, 255, 0.4);
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
    color: #fff;
    font-weight: 600;
    position: sticky;
    left: 0;
    background: #0f0f14;
    z-index: 1;
  }

  td {
    color: rgba(255, 255, 255, 0.6);
  }

  .active-col {
    background: rgba(59, 130, 246, 0.05);
    color: #60a5fa;
    font-weight: 700;
    text-align: center;
  }

  th.active-col {
    color: #3b82f6;
  }
</style>

