<script lang="ts">
  import { LL } from '$lib/i18n/i18n-svelte';
  import { page } from '$app/stores';
  import type { Locales } from '$lib/i18n/i18n-types';

  const lang = $derived(($page.data.locale ?? 'es') as Locales);

  const faqs = $derived([
    {
      question: $LL.faq.q1_q(),
      answer: $LL.faq.q1_a()
    },
    {
      question: $LL.faq.q2_q(),
      answer: $LL.faq.q2_a()
    },
    {
      question: $LL.faq.q3_q(),
      answer: $LL.faq.q3_a()
    },
    {
      question: $LL.faq.q4_q(),
      answer: $LL.faq.q4_a()
    },
    {
      question: $LL.faq.q5_q(),
      answer: $LL.faq.q5_a()
    },
    {
      question: $LL.faq.q6_q(),
      answer: $LL.faq.q6_a()
    },
    {
      question: $LL.faq.q7_q(),
      answer: $LL.faq.q7_a()
    },
    {
      question: $LL.faq.q8_q(),
      answer: $LL.faq.q8_a()
    }
  ]);

  let openIndex = $state<number | null>(null);

  function toggle(index: number) {
    openIndex = openIndex === index ? null : index;
  }

  // Generar JSON-LD para Google
  const faqSchema = $derived({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "inLanguage": lang,
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  });

  const faqSchemaString = $derived(JSON.stringify(faqSchema));
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${faqSchemaString}</script>`}
</svelte:head>

<section id="educational" class="edu-faq-section">
  <div class="container">
    <div class="grid">
      <!-- Lado Educativo -->
      <div class="educational-content">
        <span class="eyebrow">{$LL.faq.eyebrow()}</span>
        <h2>{$LL.faq.title()} <span class="text-gradient">{$LL.faq.title_gradient()}</span></h2>
        <div class="edu-body">
          <p>
            {@html $LL.faq.subtitle({ 
              bold: `<strong>${$LL.faq.subtitle_bold()}</strong>`,
              bold2: `<strong>${$LL.faq.subtitle_bold2()}</strong>`
            })}
          </p>
          <div class="edu-card">
            <div class="edu-card-icon">📈</div>
            <div class="edu-card-text">
              <h3>{$LL.faq.card1_title()}</h3>
              <p>{$LL.faq.card1_desc()}</p>
            </div>
          </div>
          <div class="edu-card">
            <div class="edu-card-icon">🛡️</div>
            <div class="edu-card-text">
              <h3>{$LL.faq.card2_title()}</h3>
              <p>{$LL.faq.card2_desc()}</p>
            </div>
          </div>
          <div class="edu-card">
            <div class="edu-card-icon">⚖️</div>
            <div class="edu-card-text">
              <h3>{$LL.faq.card3_title()}</h3>
              <p>{$LL.faq.card3_desc()}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Lado FAQ -->
      <div class="faq-content">
        <div class="faq-header">
          <span class="eyebrow">{$LL.faq.faq_eyebrow()}</span>
          <h3>{$LL.faq.faq_title()}</h3>
        </div>
        <div class="faq-list">
          {#each faqs as faq, i}
            <div class="faq-item" class:open={openIndex === i}>
              <button class="faq-question" onclick={() => toggle(i)} aria-expanded={openIndex === i}>
                {faq.question}
                <span class="chevron"></span>
              </button>
              {#if openIndex === i}
                <div class="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .edu-faq-section {
    padding: 80px 1rem;
    background: rgba(10, 10, 20, 0.3);
    border-top: 1px solid rgba(255, 255, 255, 0.03);
  }

  @media (min-width: 768px) {
    .edu-faq-section {
      padding: 100px 1.5rem;
    }
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  @media (min-width: 1024px) {
    .grid {
      grid-template-columns: 1fr 1fr;
      gap: 5rem;
    }
  }

  .eyebrow {
    color: #3b82f6;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.8rem;
    margin-bottom: 1rem;
    display: block;
  }

  h2, h3 {
    color: #fff;
    font-weight: 800;
    margin-bottom: 1.5rem;
  }

  h2 { font-size: clamp(1.75rem, 5vw, 2.5rem); letter-spacing: -0.02em; line-height: 1.2; }
  h3 { font-size: 1.5rem; }

  @media (min-width: 768px) {
    h2, h3 { margin-bottom: 2rem; }
    h3 { font-size: 1.75rem; }
  }

  .text-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .edu-body p {
    color: rgba(160, 160, 200, 0.7);
    font-size: 1rem;
    line-height: 1.7;
    margin-bottom: 2rem;
  }

  @media (min-width: 768px) {
    .edu-body p {
      font-size: 1.1rem;
      margin-bottom: 2.5rem;
    }
  }

  .edu-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.25rem;
    background: rgba(255, 255, 255, 0.02);
    padding: 1.25rem;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: transform 0.2s ease;
  }

  @media (min-width: 480px) {
    .edu-card {
      flex-direction: row;
      gap: 1.25rem;
    }
  }

  .edu-card:hover {
    transform: translateX(5px);
    background: rgba(255, 255, 255, 0.04);
  }

  .edu-card-icon {
    font-size: 1.25rem;
    background: rgba(59, 130, 246, 0.1);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    flex-shrink: 0;
  }

  @media (min-width: 480px) {
    .edu-card-icon {
      font-size: 1.5rem;
      width: 48px;
      height: 48px;
      border-radius: 12px;
    }
  }

  .edu-card-text h3 {
    color: #fff;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
  }

  .edu-card-text p {
    color: rgba(160, 160, 200, 0.5);
    font-size: 0.85rem;
    line-height: 1.5;
    margin: 0;
  }

  @media (min-width: 480px) {
    .edu-card-text p {
      font-size: 0.9rem;
    }
  }

  /* FAQ Styles */
  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .faq-item {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .faq-item.open {
    background: rgba(59, 130, 246, 0.05);
    border-color: rgba(59, 130, 246, 0.2);
  }

  .faq-question {
    width: 100%;
    padding: 1rem 1.25rem;
    background: transparent;
    border: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
    font-weight: 600;
    font-size: 0.95rem;
    text-align: left;
    cursor: pointer;
    gap: 1rem;
  }

  @media (min-width: 480px) {
    .faq-question {
      padding: 1.25rem 1.5rem;
      font-size: 1rem;
    }
  }

  .chevron {
    width: 18px;
    height: 18px;
    position: relative;
    flex-shrink: 0;
  }

  @media (min-width: 480px) {
    .chevron {
      width: 20px;
      height: 20px;
    }
  }

  .chevron::before, .chevron::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 2px;
    background: #3b82f6;
    transition: transform 0.3s ease;
  }

  @media (min-width: 480px) {
    .chevron::before, .chevron::after {
      width: 10px;
    }
  }

  .chevron::before { transform: translate(-50%, -50%) rotate(0deg); }
  .chevron::after { transform: translate(-50%, -50%) rotate(90deg); }

  .faq-item.open .chevron::after { transform: translate(-50%, -50%) rotate(0deg); }

  .faq-answer {
    padding: 0 1.25rem 1rem;
    animation: slideDown 0.3s ease-out;
  }

  @media (min-width: 480px) {
    .faq-answer {
      padding: 0 1.5rem 1.25rem;
    }
  }

  .faq-answer p {
    color: rgba(160, 160, 200, 0.6);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
  }

  @media (min-width: 480px) {
    .faq-answer p {
      font-size: 0.95rem;
    }
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>

