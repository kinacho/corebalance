<script lang="ts">
  const steps = [
    {
      num: 1,
      title: "Configura tus fondos objetivo",
      desc: "Entra en CoreBalance y añade tus fondos indexados o ETFs con sus porcentajes objetivo de asignación de activos (ej. 80% MSCI World y 20% Renta Fija Global)."
    },
    {
      num: 2,
      title: "Introduce tus posiciones actuales",
      desc: "Registra el saldo o número de participaciones actuales que posees en MyInvestor (o tu comercializadora preferida) para cada activo de tu cartera."
    },
    {
      num: 3,
      title: "Calcula la aportación o ajuste",
      desc: "Introduce el importe de tu aportación periódica mensual o marca la opción para ajustar tus pesos actuales. CoreBalance calculará las compras necesarias al céntimo."
    },
    {
      num: 4,
      title: "Ejecuta los traspasos o compras gratis",
      desc: "Sigue las instrucciones calculadas por CoreBalance y realiza las compras o traspasos (exentos de impuestos en España) directamente en tu cuenta de MyInvestor."
    }
  ];

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "¿Cómo rebalancear mi cartera de MyInvestor gratis?",
    "description": "Aprende a rebalancear tu cartera de fondos indexados o ETFs de MyInvestor gratis usando CoreBalance paso a paso de forma privada y local-first.",
    "totalTime": "PT5M",
    "step": steps.map((step) => ({
      "@type": "HowToStep",
      "name": step.title,
      "text": step.desc,
      "url": "https://corebalance.app/#guia-rebalanceo"
    }))
  };

  const howToSchemaString = JSON.stringify(howToSchema);
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${howToSchemaString}</script>`}
</svelte:head>

<section id="guia-rebalanceo" class="howto-section">
  <div class="container">
    <div class="section-header">
      <span class="eyebrow">Guía de Optimización</span>
      <h2>¿Cómo rebalancear mi cartera de <span class="text-gradient">MyInvestor gratis</span>?</h2>
      <p class="section-desc">
        Aprende el proceso paso a paso para optimizar tu asset allocation de forma manual, privada y 100% libre de costes con nuestra calculadora.
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
        <h4>Optimización Fiscal Inteligente</h4>
        <p>
          En España, el rebalanceo mediante <strong>traspasos</strong> entre fondos indexados está <strong>exento de tributación</strong> (diferimiento fiscal). CoreBalance te indica las compras óptimas para que aproveches esta ventaja al máximo sin pagar peajes fiscales innecesarios.
        </p>
      </div>
    </div>
  </div>
</section>

<style>
  .howto-section {
    padding: 100px 1.5rem;
    background: rgba(10, 10, 20, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    position: relative;
    overflow: hidden;
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
    margin-bottom: 5rem;
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

  h2 {
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 800;
    margin-bottom: 1.5rem;
    color: #fff;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .text-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .section-desc {
    color: rgba(160, 160, 200, 0.6);
    font-size: 1.1rem;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .howto-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-bottom: 4rem;
  }

  @media (min-width: 768px) {
    .howto-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .howto-step {
    display: flex;
    gap: 1.5rem;
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.04);
    padding: 2rem;
    border-radius: 20px;
    transition: all 0.3s ease;
  }

  .howto-step:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(59, 130, 246, 0.2);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  .step-badge {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: 800;
    font-size: 1.25rem;
    flex-shrink: 0;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.15);
  }

  .step-body h3 {
    color: #fff;
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 0.75rem 0;
  }

  .step-body p {
    color: rgba(160, 160, 200, 0.6);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0;
  }

  .howto-note {
    display: flex;
    gap: 1.5rem;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(96, 165, 250, 0.01) 100%);
    border: 1px solid rgba(59, 130, 246, 0.15);
    padding: 2rem;
    border-radius: 20px;
    max-width: 900px;
    margin: 0 auto;
    align-items: flex-start;
  }

  .note-icon {
    font-size: 2rem;
    line-height: 1;
  }

  .note-content h4 {
    color: #fff;
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }

  .note-content p {
    color: rgba(160, 160, 200, 0.6);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0;
  }
</style>
