<script lang="ts">
  import { LL } from '$lib/i18n/i18n-svelte';
  import { page } from '$app/stores';
  import { absoluteUrl } from '$lib/i18n/routing';
  import type { Locales } from '$lib/i18n/i18n-types';

  const lang = $derived(($page.data.locale ?? 'es') as Locales);
  /** La guía vive en la landing del idioma correspondiente, no siempre en la raíz. */
  const sectionUrl = $derived(`${absoluteUrl($page.url.pathname)}#guia-rebalanceo`);

  const steps = $derived([
    {
      num: 1,
      title: $LL.how_to_rebalance.step1_title(),
      desc: $LL.how_to_rebalance.step1_desc()
    },
    {
      num: 2,
      title: $LL.how_to_rebalance.step2_title(),
      desc: $LL.how_to_rebalance.step2_desc()
    },
    {
      num: 3,
      title: $LL.how_to_rebalance.step3_title(),
      desc: $LL.how_to_rebalance.step3_desc()
    },
    {
      num: 4,
      title: $LL.how_to_rebalance.step4_title(),
      desc: $LL.how_to_rebalance.step4_desc()
    }
  ]);

  const howToSchema = $derived({
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": $LL.how_to_rebalance.title() + " " + $LL.how_to_rebalance.title_gradient(),
    "description": $LL.how_to_rebalance.subtitle(),
    "totalTime": "PT5M",
    "inLanguage": lang,
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.title,
      "text": step.desc,
      "url": sectionUrl
    }))
  });

  const howToSchemaString = $derived(JSON.stringify(howToSchema));
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${howToSchemaString}</script>`}
</svelte:head>

<section id="guia-rebalanceo" class="howto-section">
  <div class="container">
    <div class="section-header">
      <span class="eyebrow">{$LL.how_to_rebalance.eyebrow()}</span>
      <h2>{$LL.how_to_rebalance.title()} <span class="text-gradient">{$LL.how_to_rebalance.title_gradient()}</span>?</h2>
      <p class="section-desc">
        {$LL.how_to_rebalance.subtitle()}
      </p>
    </div>

    <div class="howto-grid">
      {#each steps as step}
        <article class="howto-step">
          <div class="step-badge">
            <span class="step-num">{step.num}</span>
          </div>
          <div class="step-body">
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </div>
        </article>
      {/each}
    </div>

    <div class="howto-note">
      <div class="note-icon">💡</div>
      <div class="note-content">
        <h4>{$LL.how_to_rebalance.note_title()}</h4>
        <p>
          {@html $LL.how_to_rebalance.note_desc({ 
            link: `<strong>${$LL.how_to_rebalance.note_link()}</strong>`,
            bold: `<strong>${$LL.how_to_rebalance.note_bold()}</strong>`
          })}
        </p>
      </div>
    </div>
  </div>
</section>

<style>
  .howto-section {
    padding: 80px 1rem;
    background: rgba(10, 10, 20, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    position: relative;
    overflow: hidden;
  }

  @media (min-width: 768px) {
    .howto-section {
      padding: 100px 1.5rem;
    }
  }

  /* Efecto de brillo de fondo */
  .howto-section::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%);
    z-index: 0;
    pointer-events: none;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .section-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  @media (min-width: 768px) {
    .section-header {
      margin-bottom: 5rem;
    }
  }

  .eyebrow {
    color: var(--accent-blue-ink);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.8rem;
    margin-bottom: 1rem;
    display: block;
  }

  h2 {
    font-size: clamp(1.75rem, 5vw, 2.75rem);
    font-weight: 800;
    margin-bottom: 1.25rem;
    color: var(--text-primary);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .text-gradient {
    background: linear-gradient(135deg, var(--accent-blue) 0%, #1d4ed8 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .section-desc {
    color: var(--text-muted);
    font-size: 1rem;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }

  @media (min-width: 768px) {
    .section-desc {
      font-size: 1.1rem;
    }
  }

  .howto-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  @media (min-width: 768px) {
    .howto-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
      margin-bottom: 4rem;
    }
  }

  .howto-step {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid var(--border-subtle);
    padding: 1.5rem;
    border-radius: 20px;
    transition: all 0.3s ease;
  }

  @media (min-width: 480px) {
    .howto-step {
      flex-direction: row;
      padding: 2rem;
      gap: 1.5rem;
    }
  }

  .howto-step:hover {
    transform: translateY(-4px);
    background: var(--bg-card);
    border-color: rgba(59, 130, 246, 0.2);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  .step-badge {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: var(--accent-blue-ink);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: 800;
    font-size: 1.1rem;
    flex-shrink: 0;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.15);
  }

  @media (min-width: 480px) {
    .step-badge {
      width: 48px;
      height: 48px;
      font-size: 1.25rem;
    }
  }

  .step-body h3 {
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }

  @media (min-width: 480px) {
    .step-body h3 {
      font-size: 1.2rem;
      margin-bottom: 0.75rem;
    }
  }

  .step-body p {
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
  }

  @media (min-width: 480px) {
    .step-body p {
      font-size: 0.95rem;
    }
  }

  .howto-note {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(96, 165, 250, 0.01) 100%);
    border: 1px solid rgba(59, 130, 246, 0.15);
    padding: 1.5rem;
    border-radius: 20px;
    max-width: 900px;
    margin: 0 auto;
    align-items: flex-start;
  }

  @media (min-width: 640px) {
    .howto-note {
      flex-direction: row;
      padding: 2rem;
      gap: 1.5rem;
    }
  }

  .note-icon {
    font-size: 1.75rem;
    line-height: 1;
  }

  .note-content h4 {
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }

  .note-content p {
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
  }
</style>

