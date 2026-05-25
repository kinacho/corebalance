<script lang="ts">
  const faqs = [
    {
      question: "¿Qué es el rebalanceo de cartera?",
      answer: "Es el proceso de ajustar los pesos de tus activos para volver a tu estrategia inicial. Con el tiempo, unos activos suben más que otros, alterando tu nivel de riesgo. Rebalancear te obliga a vender caro y comprar barato de forma disciplinada."
    },
    {
      question: "¿Cuándo es necesario rebalancear?",
      answer: "Existen dos estrategias comunes: por calendario (ej. cada 6 meses) o por bandas de desviación (ej. cuando un activo se desvía más de un 5% de su peso objetivo). CoreBalance te ayuda a identificar estos momentos al instante."
    },
    {
      question: "¿Cómo garantiza CoreBalance mi privacidad?",
      answer: "A diferencia de otras apps, CoreBalance es 'Local-First'. Tus datos financieros se guardan exclusivamente en tu navegador (IndexedDB). No hay servidores que guarden tu cartera, ni necesitas vincular tus cuentas bancarias."
    },
    {
      question: "¿Es compatible con MyInvestor o Indexa Capital?",
      answer: "Sí, es el complemento perfecto. Puedes importar tu cartera mediante CSV o introducir tus posiciones manualmente para calcular el rebalanceo exacto que necesitas ejecutar en tu comercializadora."
    }
  ];

  let openIndex = $state<number | null>(null);

  function toggle(index: number) {
    openIndex = openIndex === index ? null : index;
  }

  // Generar JSON-LD para Google
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const faqSchemaString = JSON.stringify(faqSchema);
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${faqSchemaString}</script>`}
</svelte:head>

<section id="educational" class="edu-faq-section">
  <div class="container">
    <div class="grid">
      <!-- Lado Educativo -->
      <div class="educational-content">
        <span class="eyebrow">Guía Rápida</span>
        <h2>Inversión Inteligente: <span class="text-gradient">El Rebalanceo</span></h2>
        <div class="edu-body">
          <p>
            El rebalanceo no es solo una tarea técnica, es la <strong>estrategia de defensa</strong> más potente del inversor indexado. 
            Su objetivo no es maximizar el beneficio a corto plazo, sino <strong>controlar el riesgo</strong>.
          </p>
          <div class="edu-card">
            <div class="edu-card-icon">📈</div>
            <div class="edu-card-text">
              <h3>Vende caro, compra barato</h3>
              <p>Al rebalancear, trasladas beneficios de los activos que han sobre-rendido hacia aquellos que están infravalorados respecto a tu plan inicial.</p>
            </div>
          </div>
          <div class="edu-card">
            <div class="edu-card-icon">🛡️</div>
            <div class="edu-card-text">
              <h3>Mantén tu perfil de riesgo</h3>
              <p>Si tu plan es 80% acciones y 20% bonos, y las acciones suben hasta el 90%, tu cartera es ahora mucho más volátil de lo que decidiste originalmente.</p>
            </div>
          </div>
          <div class="edu-card">
            <div class="edu-card-icon">⚖️</div>
            <div class="edu-card-text">
              <h3>Traspasos en España</h3>
              <p>Recuerda que en España los traspasos entre fondos de inversión están exentos de tributación, lo que hace que el rebalanceo sea fiscalmente ultra-eficiente.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Lado FAQ -->
      <div class="faq-content">
        <div class="faq-header">
          <span class="eyebrow">FAQ</span>
          <h3>Preguntas Frecuentes</h3>
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
    padding: 100px 1.5rem;
    background: rgba(10, 10, 20, 0.3);
    border-top: 1px solid rgba(255, 255, 255, 0.03);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 5rem;
  }

  @media (min-width: 1024px) {
    .grid {
      grid-template-columns: 1fr 1fr;
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
    margin-bottom: 2rem;
  }

  h2 { font-size: clamp(2rem, 4vw, 2.5rem); letter-spacing: -0.02em; }
  h3 { font-size: 1.75rem; }

  .text-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .edu-body p {
    color: rgba(160, 160, 200, 0.7);
    font-size: 1.1rem;
    line-height: 1.7;
    margin-bottom: 2.5rem;
  }

  .edu-card {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    padding: 1.25rem;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: transform 0.2s ease;
  }

  .edu-card:hover {
    transform: translateX(5px);
    background: rgba(255, 255, 255, 0.04);
  }

  .edu-card-icon {
    font-size: 1.5rem;
    background: rgba(59, 130, 246, 0.1);
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    flex-shrink: 0;
  }

  .edu-card-text h3 {
    color: #fff;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
  }

  .edu-card-text p {
    color: rgba(160, 160, 200, 0.5);
    font-size: 0.9rem;
    line-height: 1.5;
    margin: 0;
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
    padding: 1.25rem 1.5rem;
    background: transparent;
    border: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
    font-weight: 600;
    font-size: 1rem;
    text-align: left;
    cursor: pointer;
    gap: 1rem;
  }

  .chevron {
    width: 20px;
    height: 20px;
    position: relative;
    flex-shrink: 0;
  }

  .chevron::before, .chevron::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 2px;
    background: #3b82f6;
    transition: transform 0.3s ease;
  }

  .chevron::before { transform: translate(-50%, -50%) rotate(0deg); }
  .chevron::after { transform: translate(-50%, -50%) rotate(90deg); }

  .faq-item.open .chevron::after { transform: translate(-50%, -50%) rotate(0deg); }

  .faq-answer {
    padding: 0 1.5rem 1.25rem;
    animation: slideDown 0.3s ease-out;
  }

  .faq-answer p {
    color: rgba(160, 160, 200, 0.6);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
