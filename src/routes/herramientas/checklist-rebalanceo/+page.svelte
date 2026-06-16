<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { goto } from '$app/navigation';

  // Estado del cuestionario
  let currentStep = $state(0);
  let timeAnswer = $state<string | null>(null);
  let driftAnswer = $state<string | null>(null);
  let aportationAnswer = $state<string | null>(null);
  let assetTypeAnswer = $state<string | null>(null);

  // Pasos del cuestionario
  const steps = [
    {
      title: '1. ¿Cuánto tiempo ha pasado desde tu último rebalanceo?',
      desc: 'El tiempo ayuda a evitar que operes en exceso por impulsos temporales del mercado.',
      options: [
        { label: 'Menos de 6 meses', value: 'less_6' },
        { label: 'Entre 6 y 12 meses', value: 'between_6_12' },
        { label: 'Más de 12 meses o nunca lo he hecho', value: 'more_12' }
      ]
    },
    {
      title: '2. ¿Cuál es la desviación observada en tus activos principales?',
      desc: 'Compara tus porcentajes actuales frente a tu asset allocation objetivo.',
      options: [
        { label: 'Desviación baja (menos del 3%)', value: 'drift_low' },
        { label: 'Desviación moderada (entre 3% y 5%)', value: 'drift_medium' },
        { label: 'Desviación alta (más del 5%)', value: 'drift_high' }
      ]
    },
    {
      title: '3. ¿Planeas realizar nuevas aportaciones de dinero en breve?',
      desc: 'El flujo de ahorro es el método más eficiente para equilibrar carteras pequeñas y medianas.',
      options: [
        { label: 'Sí, aporto de forma mensual o periódica', value: 'aport_yes' },
        { label: 'No, todo mi capital ya está invertido por completo', value: 'aport_no' }
      ]
    },
    {
      title: '4. ¿Qué tipo de activos componen principalmente tu cartera?',
      desc: 'El vehículo de inversión determina la fiscalidad y los costes operacionales de los ajustes.',
      options: [
        { label: 'Fondos indexados tradicionales (traspasables en España)', value: 'type_funds' },
        { label: 'ETFs o acciones individuales cotizadas', value: 'type_etfs' }
      ]
    }
  ];

  // Cálculo del veredicto dinámico
  let verdict = $derived.by(() => {
    if (currentStep < 4) return null;

    // Caso 1: Desviación muy baja (no rebalancear)
    if (driftAnswer === 'drift_low') {
      return {
        title: 'No es necesario rebalancear',
        color: '#10b981', // Verde
        desc: 'Tu cartera está muy estable. Las desviaciones actuales son insignificantes y operarlas solo te generaría costes innecesarios. Sigue aportando con normalidad y vuelve a chequear en unos meses.',
        tip: 'Mantener las manos quietas cuando no hay desvíos es una de las virtudes de los mejores inversores pasivos.'
      };
    }

    // Caso 2: Desviación moderada (3-5%) y hay aportación mensual
    if (driftAnswer === 'drift_medium' && aportationAnswer === 'aport_yes') {
      return {
        title: 'Rebalanceo recomendado por aportación',
        color: '#3b82f6', // Azul
        desc: 'Tu cartera tiene un ligero desvío, pero al realizar compras mensuales periódicas puedes solucionarlo fácilmente. Dirige tu ahorro disponible íntegramente hacia los fondos que se han quedado infraponderados.',
        tip: 'Usa CoreBalance para calcular la aportación exacta y equilibrar tu cartera sin vender ningún activo ni pagar impuestos.'
      };
    }

    // Caso 3: Desviación alta (>5%) o moderada sin aportación mensual + Fondos indexados
    if (assetTypeAnswer === 'type_funds') {
      return {
        title: 'Rebalanceo recomendado por traspaso (Exento Fiscal)',
        color: '#8b5cf6', // Violeta
        desc: 'Tus activos se han desviado notablemente de tu plan original. Al utilizar fondos indexados en España, te recomendamos ordenar un traspaso parcial desde el fondo sobreponderado hacia el infraponderado. Este movimiento es gratuito y no tributa ante Hacienda.',
        tip: 'Consulta en CoreBalance el importe exacto en euros a traspasar para volver a tu asset allocation original al céntimo.'
      };
    }

    // Caso 4: Desviación alta u operativa sin aportación + ETFs
    return {
      title: 'Rebalanceo recomendado por venta/compra (Vigila comisiones)',
      color: '#f59e0b', // Naranja
      desc: 'Tu desvío es significativo y tu capital está en ETFs. Al no disfrutar de la regla del traspaso, deberás vender una parte de tus ETFs ganadores (pagando impuestos por las plusvalías realizadas) para comprar los ETFs rezagados.',
      tip: 'Agrupa tus operaciones en una única sesión para minimizar el impacto de las comisiones de compraventa de tu bróker.'
    };
  });

  function selectOption(value: string) {
    if (currentStep === 0) timeAnswer = value;
    else if (currentStep === 1) driftAnswer = value;
    else if (currentStep === 2) aportationAnswer = value;
    else if (currentStep === 3) assetTypeAnswer = value;

    currentStep += 1;
  }

  function goBack() {
    if (currentStep > 0) currentStep -= 1;
  }

  function restart() {
    currentStep = 0;
    timeAnswer = null;
    driftAnswer = null;
    aportationAnswer = null;
    assetTypeAnswer = null;
  }
</script>

<svelte:head>
  <title>Checklist: ¿Es hora de rebalancear tu cartera? | CoreBalance</title>
  <meta name="description" content="Descubre si ha llegado el momento de ajustar tus fondos o ETFs con nuestro cuestionario interactivo de rebalanceo de cartera." />
</svelte:head>

<div class="checklist-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto('/')} />

  <main class="checklist-container">
    <header class="checklist-header">
      <span class="category-badge">Recurso Interactivo</span>
      <h1 class="gradient-text">¿Es hora de rebalancear?</h1>
      <p class="subtitle">
        Responde a estas 4 preguntas rápidas y obtén una recomendación personalizada sobre la salud de tu asignación de activos.
      </p>
    </header>

    <div class="questionnaire-card card-glass">
      <!-- CUESTIONARIO EN CURSO -->
      {#if currentStep < 4}
        <!-- Barra de progreso -->
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: {(currentStep / 4) * 100}%"></div>
        </div>

        <div class="step-content">
          <p class="step-indicator">Pregunta {currentStep + 1} de 4</p>
          <h2>{steps[currentStep].title}</h2>
          <p class="step-desc">{steps[currentStep].desc}</p>

          <div class="options-list">
            {#each steps[currentStep].options as option}
              <button class="option-btn" onclick={() => selectOption(option.value)}>
                {option.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Botones de navegación inferior -->
        <div class="nav-buttons">
          {#if currentStep > 0}
            <button class="btn-back" onclick={goBack}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="back-arrow">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Atrás
            </button>
          {/if}
        </div>

      <!-- PANTALLA DE VEREDICTO FINAL -->
      {:else if verdict}
        <div class="verdict-content" style="--verdict-color: {verdict.color}">
          <div class="verdict-icon-container">
            <svg class="verdict-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          
          <h2 class="verdict-title">{verdict.title}</h2>
          <p class="verdict-desc">{verdict.desc}</p>

          <div class="tip-box">
            <h4>💡 Consejo clave:</h4>
            <p>{verdict.tip}</p>
          </div>

          <div class="action-buttons">
            <button class="btn-primary" onclick={() => goto('/')}>Ir a la calculadora</button>
            <button class="btn-secondary" onclick={restart}>Reiniciar Cuestionario</button>
          </div>
        </div>
      {/if}
    </div>
  </main>

  <LandingFooter />
</div>

<style>
  .checklist-page {
    background: var(--bg-primary, #05050a);
    color: #fff;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }

  .checklist-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 140px 1.5rem 80px;
  }

  .checklist-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .category-badge {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent-blue, #3b82f6);
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
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .card-glass {
    background: var(--bg-card, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    border-radius: 28px;
    padding: 3rem;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  @media (max-width: 768px) {
    .card-glass {
      padding: 1.75rem;
    }
  }

  .progress-bar-container {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 9999px;
    overflow: hidden;
    margin-bottom: 2.5rem;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 9999px;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step-indicator {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--accent-blue, #3b82f6);
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .step-content h2 {
    font-size: 1.8rem;
    font-weight: 800;
    margin-top: 0;
    margin-bottom: 0.75rem;
    line-height: 1.3;
  }

  .step-desc {
    color: var(--text-muted, rgba(160, 160, 200, 0.8));
    font-size: 1rem;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2.5rem;
  }

  .option-btn {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    color: #fff;
    font-size: 1.05rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .option-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-1px);
  }

  .option-btn:active {
    transform: scale(0.99);
  }

  .nav-buttons {
    display: flex;
    justify-content: flex-start;
  }

  .btn-back {
    background: none;
    border: none;
    color: var(--text-muted, rgba(160, 160, 200, 0.6));
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s ease;
  }

  .btn-back:hover {
    color: #fff;
  }

  .back-arrow {
    transition: transform 0.2s ease;
  }

  .btn-back:hover .back-arrow {
    transform: translateX(-3px);
  }

  /* Veredicto final styles */
  .verdict-content {
    text-align: center;
  }

  .verdict-icon-container {
    color: var(--verdict-color);
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: center;
  }

  .verdict-icon {
    width: 64px;
    height: 64px;
  }

  .verdict-title {
    font-size: 2.2rem;
    font-weight: 800;
    margin-top: 0;
    margin-bottom: 1rem;
    letter-spacing: -0.02em;
    color: #fff;
    line-height: 1.2;
  }

  .verdict-desc {
    font-size: 1.15rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.85);
    max-width: 650px;
    margin: 0 auto 2.5rem;
  }

  .tip-box {
    background: rgba(255, 255, 255, 0.02);
    border-left: 4px solid var(--verdict-color);
    border-radius: 0 16px 16px 0;
    padding: 1.5rem 2rem;
    text-align: left;
    margin-bottom: 3rem;
  }

  .tip-box h4 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--verdict-color);
  }

  .tip-box p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.75);
  }

  .action-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  @media (max-width: 600px) {
    .action-buttons {
      flex-direction: column;
      gap: 1rem;
    }
  }

  .btn-primary {
    background: var(--accent-blue, #3b82f6);
    color: white;
    border: none;
    padding: 0.85rem 2rem;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.85rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
  }
</style>
