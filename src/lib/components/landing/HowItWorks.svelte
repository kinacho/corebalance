<script lang="ts">
  const steps = [
    {
      number: "01",
      title: "Define tu estrategia",
      description: "Elige tus fondos o ETFs y asigna el peso ideal para cada uno (ej. 70% MSCI World, 30% Emerging Markets)."
    },
    {
      number: "02",
      title: "Registra tus posiciones",
      description: "Introduce tus participaciones actuales o importa tu historial de transacciones desde tu broker."
    },
    {
      number: "03",
      title: "Rebalancea",
      description: "Indica cuánto vas a invertir este mes y CoreBalance te dirá exactamente cuánto comprar de cada activo."
    }
  ];
</script>

<section id="how-it-works" class="how-it-works">
  <div class="container">
    <div class="section-header">
      <span class="eyebrow">Proceso</span>
      <h2>Tu rebalanceo en <span class="text-gradient">3 pasos</span></h2>
      <p>Sin fórmulas complejas ni errores de cálculo. Directo al grano.</p>
    </div>

    <div class="steps-grid">
      {#each steps as step}
        <div class="step-card">
          <div class="step-number">{step.number}</div>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .how-it-works {
    padding: 100px 1.5rem;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
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
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800;
    margin-bottom: 1.5rem;
    color: #fff;
  }

  .text-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .section-header p {
    color: rgba(160, 160, 200, 0.6);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 3rem;
    position: relative;
  }

  /* Línea conectora en desktop */
  @media (min-width: 1024px) {
    .steps-grid::before {
      content: '';
      position: absolute;
      top: 40px;
      left: 10%;
      right: 10%;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2) 50%, transparent);
      z-index: 0;
    }
  }

  .step-card {
    position: relative;
    z-index: 1;
    text-align: center;
  }

  .step-number {
    width: 80px;
    height: 80px;
    background: #0f0f14;
    border: 2px solid rgba(59, 130, 246, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    color: #3b82f6;
    margin: 0 auto 2rem;
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.1);
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.25rem;
    color: #fff;
  }

  .step-card p {
    color: rgba(160, 160, 200, 0.6);
    line-height: 1.6;
    font-size: 1.05rem;
  }
</style>
