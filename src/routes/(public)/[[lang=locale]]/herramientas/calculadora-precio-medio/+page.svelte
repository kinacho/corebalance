<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import RelatedReading from '$lib/components/blog/RelatedReading.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import SeoHead from '$lib/components/seo/SeoHead.svelte';
  import { pageOgImage } from '$lib/seo/og';
  import { link } from '$lib/i18n/link';
  import { absoluteUrl, localizePath } from '$lib/i18n/routing';
  import type { Locales } from '$lib/i18n/i18n-types';

  // El idioma sale de la URL (lo resuelve el layout del grupo), no del store
  // global: así el HTML prerenderizado de /en/... sale de verdad en inglés.
  let { data } = $props<{ data: { relatedReading: import('$lib/seo/related-reading').ReadingItem[] } }>();
  const lang = $derived(($page.data.locale ?? 'es') as Locales);

  const metaTitle = $derived(lang === 'en'
    ? 'Average Purchase Price Calculator | CoreBalance'
    : 'Calculadora de Precio Medio de Compra | CoreBalance'
  );
  const metaDesc = $derived(lang === 'en'
    ? 'Free tool to calculate the weighted average purchase price of your stocks, ETFs or funds — buys, sells, dividends and fees included — with live unrealized P&L.'
    : 'Calcula gratis el precio medio ponderado de tus acciones, ETFs o fondos con compras, ventas y dividendos, comisiones incluidas, y consulta tu P&L latente.'
  );

  const t = $derived(lang === 'en' ? {
    badge: 'Interactive Tool',
    breadcrumb: { home: 'Home', tools: 'Tools', tool: 'Average Price Calculator' },
    title: 'Average Purchase Price Calculator',
    subtitle: 'Add your buys, sells and dividends and see live your weighted average cost, total cost basis and unrealized P&L — the same ledger accounting CoreBalance uses.',
    panelTitle: '1. Your Transactions',
    addRow: 'Add Row',
    labelType: 'Type',
    typeBuy: 'Buy',
    typeSell: 'Sell',
    typeDividend: 'Dividend',
    labelShares: 'Shares',
    labelPrice: 'Price / Share (€)',
    labelFees: 'Fees (€)',
    deleteLabel: 'Remove row',
    orderHint: 'Rows are processed top to bottom (chronological order).',
    divHint: 'For a dividend row: shares × price = gross amount received; use the fees field for withholding tax.',
    oversellWarning: 'One sell exceeds the shares held at that point — it is capped at the available amount.',
    resultsTitle: '2. Your Position',
    labelTotalShares: 'Total shares',
    labelTotalCost: 'Total cost basis',
    avgResultTitle: 'Average Purchase Price',
    avgResultDesc: 'Weighted average cost per share, fees included and net dividends deducted.',
    pnlTitle: '3. Unrealized P&L (optional)',
    labelCurrentPrice: 'Current price per share (€)',
    rowMarketValue: 'Market value:',
    rowPnlAbs: 'Unrealized gain / loss:',
    rowPnlPct: 'Return on cost:',
    pnlPlaceholder: 'Enter a current price to see your unrealized P&L.',
    sections: [
      {
        heading: 'What is the average purchase price and why does it matter?',
        paragraphs: [
          'Your average purchase price is the weighted average of everything you paid for a position — total cost invested (fees included) divided by the shares you hold. It is the reference that tells you whether a position sits at a gain or a loss, and it only moves when new money enters or leaves the cost basis.',
          'Because it is weighted, a large buy moves it a lot and a small buy barely moves it. That is why averaging down with small contributions lowers your average price much more slowly than most investors expect.'
        ]
      },
      {
        heading: 'Why does selling NOT change your average price?',
        paragraphs: [
          'Because when you sell, you remove shares at exactly their average cost: the total cost basis shrinks in the same proportion as the shares, so the ratio between the two — the average price — stays identical for what remains.',
          'It is a very common mistake to think that selling your "expensive" shares lowers the average price of the rest. What a sale changes is your realized gain or loss; the cost of the shares still in the portfolio is untouched. This calculator applies exactly that rule: a sell reduces the total cost proportionally and leaves the average price of the remainder as it was.'
        ]
      },
      {
        heading: 'Why CoreBalance deducts dividends from the cost basis',
        paragraphs: [
          'CoreBalance follows a conservative accounting approach: each net dividend received is subtracted from the total cost of the position, so your average price gradually drops. The idea is that a dividend is capital you have already recovered — your money at risk is smaller.',
          'Other tools count dividends as separate profit instead: the average price never changes and dividends are added on top of the return. Both approaches are valid and end up measuring the same total performance; they simply show it in a different place. Just make sure you do not mix the two, or you will double-count your dividends.'
        ]
      },
      {
        heading: 'FIFO or average cost: which method does the Spanish tax agency apply?',
        paragraphs: [
          'For sales of stocks and ETFs in Spain, Hacienda applies FIFO (first in, first out): the shares you bought first are considered the first ones sold, regardless of your average price. The taxable gain of a sale is therefore computed against the cost of your oldest shares, not against the weighted average shown here.',
          'This calculator uses the weighted average cost method because it is the most useful metric for tracking a portfolio day to day. It is informational only — not tax advice and not a substitute for the FIFO computation your tax return requires. For your filing, rely on your broker\'s tax report or a professional advisor.'
        ]
      }
    ],
    otherToolsTitle: 'Other tools',
    otherTools: [
      { path: '/herramientas/calculadora-ter', label: 'TER Calculator' },
      { path: '/herramientas/checklist-rebalanceo', label: 'Rebalancing Checklist' },
      { path: '/herramientas/simulador-crisis', label: 'Crash Simulator' }
    ],
    ctaTitle: 'Put your transaction ledger on autopilot',
    ctaDesc: 'In CoreBalance the transaction ledger does all of this automatically — average price, cost basis and P&L updated with every buy, sell or dividend — and you can import your broker\'s CSV in seconds. Free, local and 100% private.',
    ctaBtn: 'Open the dashboard'
  } : {
    badge: 'Herramienta Interactiva',
    breadcrumb: { home: 'Inicio', tools: 'Herramientas', tool: 'Calculadora Precio Medio' },
    title: 'Calculadora de precio medio de compra',
    subtitle: 'Añade tus compras, ventas y dividendos y ve en vivo tu precio medio ponderado, tu coste total y tu P&L latente — con la misma contabilidad de libro que usa CoreBalance.',
    panelTitle: '1. Tus Transacciones',
    addRow: 'Añadir Fila',
    labelType: 'Tipo',
    typeBuy: 'Compra',
    typeSell: 'Venta',
    typeDividend: 'Dividendo',
    labelShares: 'Participaciones',
    labelPrice: 'Precio / Part. (€)',
    labelFees: 'Comisiones (€)',
    deleteLabel: 'Eliminar fila',
    orderHint: 'Las filas se procesan de arriba abajo (orden cronológico).',
    divHint: 'En una fila de dividendo: participaciones × precio = importe bruto cobrado; usa el campo de comisiones para la retención.',
    oversellWarning: 'Una venta supera las participaciones que tienes en ese momento — se ajusta al máximo disponible.',
    resultsTitle: '2. Tu Posición',
    labelTotalShares: 'Participaciones totales',
    labelTotalCost: 'Coste total',
    avgResultTitle: 'Precio Medio de Compra',
    avgResultDesc: 'Coste medio ponderado por participación, con comisiones incluidas y dividendos netos descontados.',
    pnlTitle: '3. P&L latente (opcional)',
    labelCurrentPrice: 'Precio actual por participación (€)',
    rowMarketValue: 'Valor de mercado:',
    rowPnlAbs: 'Ganancia / pérdida latente:',
    rowPnlPct: 'Rentabilidad sobre coste:',
    pnlPlaceholder: 'Introduce un precio actual para ver tu P&L latente.',
    sections: [
      {
        heading: '¿Qué es el precio medio de compra y por qué importa?',
        paragraphs: [
          'Tu precio medio de compra es la media ponderada de todo lo que has pagado por una posición: el coste total invertido (comisiones incluidas) dividido entre las participaciones que tienes. Es la referencia que te dice si una posición está en beneficio o en pérdida, y solo se mueve cuando entra o sale dinero del coste base.',
          'Al ser ponderado, una compra grande lo mueve mucho y una compra pequeña apenas lo mueve. Por eso promediar a la baja con aportaciones pequeñas baja tu precio medio mucho más despacio de lo que la mayoría espera.'
        ]
      },
      {
        heading: '¿Por qué una venta NO cambia tu precio medio?',
        paragraphs: [
          'Porque al vender retiras participaciones exactamente a su coste medio: el coste total se reduce en la misma proporción que las participaciones, así que el cociente entre ambos — el precio medio — queda idéntico para lo que conservas.',
          'Es un error muy común pensar que vender las participaciones "caras" baja el precio medio del resto. Lo que cambia una venta es tu plusvalía o minusvalía realizada; el coste de lo que sigue en cartera no se toca. Esta calculadora aplica exactamente esa regla: una venta reduce el coste total de forma proporcional y deja intacto el precio medio de lo que queda.'
        ]
      },
      {
        heading: 'Por qué CoreBalance resta los dividendos del coste base',
        paragraphs: [
          'CoreBalance sigue una contabilidad conservadora: cada dividendo neto cobrado se resta del coste total de la posición, así que tu precio medio va bajando poco a poco. La idea es que un dividendo es capital que ya has recuperado — tu dinero en riesgo es menor.',
          'Otras herramientas, en cambio, cuentan los dividendos como beneficio aparte: el precio medio no cambia nunca y los dividendos se suman por encima de la rentabilidad. Ambos enfoques son válidos y acaban midiendo el mismo rendimiento total; simplemente lo reflejan en sitios distintos. Eso sí: no mezcles los dos criterios o contarás tus dividendos dos veces.'
        ]
      },
      {
        heading: '¿FIFO o coste medio: qué método aplica Hacienda?',
        paragraphs: [
          'En las ventas de acciones y ETFs en España, Hacienda aplica FIFO (first in, first out): las participaciones que compraste primero se consideran las primeras vendidas, con independencia de tu precio medio. La ganancia que tributa en una venta se calcula, por tanto, contra el coste de tus participaciones más antiguas, no contra la media ponderada que ves aquí.',
          'Esta calculadora usa el método de coste medio ponderado porque es la métrica más útil para seguir tu cartera en el día a día. Es puramente informativa: no es asesoramiento fiscal ni sustituye el cálculo FIFO que exige tu declaración. Para Hacienda, apóyate en el informe fiscal de tu bróker o en un asesor profesional.'
        ]
      }
    ],
    otherToolsTitle: 'Otras herramientas',
    otherTools: [
      { path: '/herramientas/calculadora-ter', label: 'Calculadora de TER' },
      { path: '/herramientas/checklist-rebalanceo', label: 'Checklist de rebalanceo' },
      { path: '/herramientas/simulador-crisis', label: 'Simulador de crisis' }
    ],
    ctaTitle: 'Pon tu libro de transacciones en piloto automático',
    ctaDesc: 'En CoreBalance el libro de transacciones hace todo esto automáticamente — precio medio, coste base y P&L actualizados con cada compra, venta o dividendo — y puedes importar el CSV de tu bróker en segundos. Gratis, local y 100% privado.',
    ctaBtn: 'Abrir el dashboard'
  });

  const breadcrumbSchema = $derived({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": t.breadcrumb.home, "item": absoluteUrl(localizePath('/', lang)) },
      { "@type": "ListItem", "position": 2, "name": t.breadcrumb.tools, "item": absoluteUrl(localizePath('/herramientas', lang)) },
      { "@type": "ListItem", "position": 3, "name": t.breadcrumb.tool, "item": absoluteUrl($page.url.pathname) }
    ]
  });

  // FAQPage con los encabezados que son pregunta, con su respuesta directa.
  const faqSchema = $derived({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": t.sections
      .filter((s) => s.heading.endsWith('?'))
      .map((s) => ({
        "@type": "Question",
        "name": s.heading,
        "acceptedAnswer": { "@type": "Answer", "text": s.paragraphs[0] }
      }))
  });

  type TxType = 'buy' | 'sell' | 'dividend';
  interface TxRow { type: TxType; shares: number; price: number; fees: number; }

  // Dos filas de ejemplo editables
  let rows = $state<TxRow[]>([
    { type: 'buy', shares: 10, price: 85.5, fees: 2 },
    { type: 'buy', shares: 5, price: 92, fees: 2 }
  ]);

  let currentPrice = $state<number | null>(null);

  // Misma contabilidad que `ledgerHoldings` en el dashboard (reimplementada aquí
  // a propósito: nada del dashboard puede importarse en rutas públicas):
  // - Compra: coste = participaciones × precio + comisiones; media ponderada.
  // - Venta: reduce el coste total proporcionalmente y NO toca el precio medio.
  // - Dividendo: el importe neto se resta del coste base y el precio medio baja.
  let position = $derived.by(() => {
    let shares = 0;
    let totalCost = 0;
    let avgCost = 0;
    let oversell = false;

    for (const r of rows) {
      const qty = r.shares || 0;
      const price = r.price || 0;
      const fees = r.fees || 0;

      if (r.type === 'buy') {
        if (qty > 0) {
          totalCost += qty * price + fees;
          shares += qty;
          avgCost = shares > 0 ? totalCost / shares : 0;
        }
      } else if (r.type === 'sell') {
        if (qty > shares) oversell = true;
        if (shares > 0) {
          const ratio = Math.min(1, qty / shares);
          totalCost -= totalCost * ratio;
          shares = Math.max(0, shares - qty);
          // El precio medio de lo que queda no cambia.
        }
      } else if (r.type === 'dividend') {
        const divAmount = qty * price - fees;
        totalCost -= divAmount;
        avgCost = shares > 0 ? totalCost / shares : 0;
      }
    }

    return { shares, totalCost, avgCost, oversell };
  });

  let pnl = $derived.by(() => {
    if (currentPrice === null || !(currentPrice > 0) || position.shares <= 0) return null;
    const marketValue = position.shares * currentPrice;
    const abs = marketValue - position.totalCost;
    const pct = position.totalCost > 0 ? (abs / position.totalCost) * 100 : null;
    return { marketValue, abs, pct };
  });

  function addRow() {
    rows.push({ type: 'buy', shares: 0, price: 0, fees: 0 });
  }

  function removeRow(index: number) {
    rows = rows.filter((_, i) => i !== index);
  }

  const numLocale = $derived(lang === 'es' ? 'es-ES' : 'en-US');
  const fmtMoney = $derived((v: number) =>
    v.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const fmtPrice = $derived((v: number) =>
    v.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
  const fmtShares = $derived((v: number) =>
    v.toLocaleString(numLocale, { maximumFractionDigits: 4 }));
</script>

<SeoHead
  title={metaTitle}
  description={metaDesc}
  path={$page.url.pathname}
  {lang}
  image={pageOgImage('precio-medio', lang)}
  jsonLd={[breadcrumbSchema, faqSchema]}
/>

<div class="avg-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto($link('/'))} />

  <main class="avg-container">
    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href={$link('/')}>🏠 {t.breadcrumb.home}</a>
      <span class="breadcrumb-sep">›</span>
      <a href={$link('/herramientas')}>{t.breadcrumb.tools}</a>
      <span class="breadcrumb-sep">›</span>
      <span aria-current="page">{t.breadcrumb.tool}</span>
    </nav>
    <header class="avg-header">
      <span class="category-badge">{t.badge}</span>
      <h1 class="gradient-text">{t.title}</h1>
      <p class="subtitle">{t.subtitle}</p>
    </header>

    <div class="calculator-grid">
      <!-- PANEL IZQUIERDO: Libro de transacciones -->
      <section class="left-panel card-glass">
        <div class="panel-header">
          <h2>{t.panelTitle}</h2>
          <button class="btn-add" onclick={addRow}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {t.addRow}
          </button>
        </div>

        <div class="tx-list">
          {#each rows as row, index}
            <div class="tx-row">
              <div class="input-group type-col">
                <label for="tx-type-{index}">{t.labelType}</label>
                <select id="tx-type-{index}" bind:value={row.type}>
                  <option value="buy">{t.typeBuy}</option>
                  <option value="sell">{t.typeSell}</option>
                  <option value="dividend">{t.typeDividend}</option>
                </select>
              </div>
              <div class="input-group num-col">
                <label for="tx-shares-{index}">{t.labelShares}</label>
                <input id="tx-shares-{index}" type="number" bind:value={row.shares} min="0" step="any" />
              </div>
              <div class="input-group num-col">
                <label for="tx-price-{index}">{t.labelPrice}</label>
                <input id="tx-price-{index}" type="number" bind:value={row.price} min="0" step="any" />
              </div>
              <div class="input-group num-col">
                <label for="tx-fees-{index}">{t.labelFees}</label>
                <input id="tx-fees-{index}" type="number" bind:value={row.fees} min="0" step="any" />
              </div>
              <button class="btn-delete" aria-label={t.deleteLabel} onclick={() => removeRow(index)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          {/each}
        </div>

        {#if position.oversell}
          <div class="validation-warning">
            <svg class="warning-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            {t.oversellWarning}
          </div>
        {/if}

        <p class="panel-hint">{t.orderHint}</p>
        <p class="panel-hint">{t.divHint}</p>
      </section>

      <!-- PANEL DERECHO: Posición y P&L -->
      <section class="right-panel">
        <div class="avg-result-card card-glass">
          <h3>{t.avgResultTitle}</h3>
          <p class="big-number metric-value">{fmtPrice(position.avgCost)} €</p>
          <p class="card-desc">{t.avgResultDesc}</p>
        </div>

        <div class="position-card card-glass">
          <h2>{t.resultsTitle}</h2>
          <div class="breakdown-rows">
            <div class="breakdown-row">
              <span>{t.labelTotalShares}</span>
              <span class="value-highlight metric-value">{fmtShares(position.shares)}</span>
            </div>
            <div class="breakdown-row">
              <span>{t.labelTotalCost}</span>
              <span class="value-highlight metric-value">{fmtMoney(position.totalCost)} €</span>
            </div>
          </div>
        </div>

        <div class="pnl-card card-glass">
          <h2>{t.pnlTitle}</h2>
          <div class="input-group">
            <label for="current-price">{t.labelCurrentPrice}</label>
            <input id="current-price" type="number" bind:value={currentPrice} min="0" step="any" />
          </div>
          {#if pnl}
            <div class="breakdown-rows pnl-rows">
              <div class="breakdown-row">
                <span>{t.rowMarketValue}</span>
                <span class="value-highlight metric-value">{fmtMoney(pnl.marketValue)} €</span>
              </div>
              <div class="breakdown-row">
                <span>{t.rowPnlAbs}</span>
                <span class="metric-value" class:pnl-positive={pnl.abs >= 0} class:pnl-negative={pnl.abs < 0}>
                  {pnl.abs >= 0 ? '+' : ''}{fmtMoney(pnl.abs)} €
                </span>
              </div>
              {#if pnl.pct !== null}
                <div class="breakdown-row">
                  <span>{t.rowPnlPct}</span>
                  <span class="metric-value" class:pnl-positive={pnl.pct >= 0} class:pnl-negative={pnl.pct < 0}>
                    {pnl.pct >= 0 ? '+' : ''}{pnl.pct.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>
              {/if}
            </div>
          {:else}
            <p class="card-desc pnl-placeholder">{t.pnlPlaceholder}</p>
          {/if}
        </div>
      </section>
    </div>

    <!-- CONTENIDO EDUCATIVO -->
    <section class="edu-content">
      {#each t.sections as section}
        <article class="edu-section">
          <h2>{section.heading}</h2>
          {#each section.paragraphs as paragraph}
            <p>{paragraph}</p>
          {/each}
        </article>
      {/each}
    </section>

    <!-- Enlaces cruzados a las demás herramientas -->
    <aside class="other-tools">
      <h2>{t.otherToolsTitle}</h2>
      <ul>
        {#each t.otherTools as tool}
          <li><a href={$link(tool.path)}>{tool.label}</a></li>
        {/each}
      </ul>
    </aside>

    <!-- CTA final -->
    <section class="avg-cta">
      <div class="cta-inner">
        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaDesc}</p>
        <button class="btn-primary" onclick={() => goto($link('/dashboard'))}>{t.ctaBtn}</button>
      </div>
    </section>
  </main>

  <RelatedReading items={data.relatedReading} {lang} />

  <LandingFooter />
</div>

<style>
  .avg-page {
    background: var(--bg-primary, #05050a);
    color: var(--text-primary);
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }

  .avg-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 140px 1.5rem 80px;
  }

  .avg-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .category-badge {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent-blue-ink);
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
  }

  .subtitle {
    color: var(--text-muted, rgba(160, 160, 200, 0.8));
    font-size: 1.2rem;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .calculator-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 2.5rem;
    margin-bottom: 5rem;
  }

  @media (max-width: 900px) {
    .calculator-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  .card-glass {
    background: var(--bg-card, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    border-radius: 24px;
    padding: 2.5rem;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .panel-header h2 {
    font-size: 1.4rem;
    font-weight: 800;
    margin: 0;
  }

  .btn-add {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    color: var(--accent-blue-ink);
    padding: 0.5rem 1rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .btn-add:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
  }

  .tx-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .tx-row {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input-group label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
  }

  .input-group input,
  .input-group select {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    border-radius: 12px;
    padding: 0.75rem 1rem;
    color: var(--text-primary);
    font-size: 0.95rem;
    width: 100%;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .input-group select option {
    background: #12121c;
    color: var(--text-primary);
  }

  .input-group input:focus,
  .input-group select:focus {
    border-color: var(--accent-blue-ink);
  }

  .type-col { width: 130px; flex-grow: 1; }
  .num-col { width: 105px; flex-grow: 1; }

  .btn-delete {
    background: none;
    border: none;
    color: var(--state-negative);
    padding: 0.75rem;
    cursor: pointer;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .btn-delete:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--state-negative);
  }

  .validation-warning {
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 14px;
    padding: 1rem 1.25rem;
    color: var(--accent-orange-ink);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .warning-icon { width: 18px; height: 18px; flex-shrink: 0; }

  .panel-hint {
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    font-size: 0.85rem;
    line-height: 1.5;
    margin: 0 0 0.5rem;
  }

  .right-panel { display: flex; flex-direction: column; gap: 2rem; }

  .avg-result-card {
    text-align: center;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(139, 92, 246, 0.03) 100%);
    border-color: rgba(59, 130, 246, 0.15);
  }

  .avg-result-card h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .big-number {
    font-size: 3.2rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.04em;
    background: linear-gradient(135deg, #60a5fa 30%, #a78bfa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .card-desc { color: var(--text-muted, rgba(160, 160, 200, 0.6)); font-size: 0.9rem; margin: 0.5rem 0 0; }

  .position-card h2,
  .pnl-card h2 { font-size: 1.3rem; font-weight: 800; margin-top: 0; margin-bottom: 1.5rem; }

  .breakdown-rows {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    padding-top: 1.25rem;
  }

  .position-card .breakdown-rows { border-top: none; padding-top: 0; }

  .pnl-rows { margin-top: 1.5rem; }

  .breakdown-row { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-muted, rgba(160, 160, 200, 0.8)); }

  .value-highlight { color: var(--text-primary); font-weight: 600; }
  .pnl-positive { color: var(--accent-green-ink); font-weight: 600; }
  .pnl-negative { color: var(--state-negative); font-weight: 600; }

  .pnl-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .pnl-placeholder { margin-top: 1.25rem; }

  /* Contenido educativo */
  .edu-content {
    max-width: 760px;
    margin: 0 auto 5rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .edu-section h2 {
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.3;
    margin: 0 0 1rem;
  }

  .edu-section p {
    color: var(--text-secondary);
    font-size: 1.05rem;
    line-height: 1.75;
    margin: 0 0 1rem;
  }

  .edu-section p:last-child { margin-bottom: 0; }

  /* Otras herramientas */
  .other-tools {
    background: var(--bg-card, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    border-radius: 16px;
    padding: 1.5rem 2rem;
    margin: 0 auto 3rem;
    max-width: 760px;
  }
  .other-tools h2 {
    font-size: 1.05rem;
    font-weight: 800;
    margin: 0 0 1rem;
  }
  .other-tools ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.75rem;
  }
  .other-tools a {
    color: var(--accent-blue-ink);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    transition: color 0.2s ease;
  }
  .other-tools a:hover { color: var(--accent-blue-ink); text-decoration: underline; }

  .avg-cta {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 24px;
    padding: 3.5rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .cta-inner { position: relative; z-index: 2; max-width: 600px; margin: 0 auto; }

  .avg-cta h2 { font-size: 2rem; font-weight: 800; margin-top: 0; margin-bottom: 1rem; letter-spacing: -0.02em; }

  .avg-cta p { color: var(--text-secondary); line-height: 1.6; margin-bottom: 2rem; font-size: 1.05rem; }

  .btn-primary {
    background: var(--accent-blue);
    color: var(--text-on-accent);
    border: none;
    padding: 0.85rem 2rem;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
    transition: all 0.2s ease;
  }

  .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35); }
  .btn-primary:active { transform: scale(0.98); }

  /* Breadcrumb */
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .breadcrumb a {
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s;
  }
  .breadcrumb a:hover { color: var(--text-primary); }
  .breadcrumb-sep { color: var(--text-faint); }
  .breadcrumb span[aria-current="page"] { color: var(--text-secondary); font-weight: 500; }
</style>
