<script lang="ts">
  const features = [
    {
      title: "Rebalanceo Inteligente",
      description: "Calcula exactamente cuánto comprar de cada activo para volver a tu estrategia ideal.",
      icon: "⚖️"
    },
    {
      title: "Seguimiento en Tiempo Real",
      description: "Precios actualizados automáticamente para que siempre sepas el valor de tu cartera.",
      icon: "📈"
    },
    {
      title: "Privacidad por Diseño",
      description: "Tus datos son tuyos. Modo incógnito para mostrar tu cartera sin revelar cifras sensibles.",
      icon: "🔒"
    },
    {
      title: "Simulador de Crisis",
      description: "¿Qué pasaría si el mercado cae un 30%? Prepárate mentalmente para la volatilidad.",
      icon: "📉"
    },
    {
      title: "Proyecciones a Futuro",
      description: "Visualiza cómo crecerá tu patrimonio basándote en tus aportaciones y rentabilidad esperada.",
      icon: "🚀"
    },
    {
      title: "Multi-Broker",
      description: "Importa tus operaciones desde MyInvestor, DeGiro, Interactive Brokers y más.",
      icon: "💼"
    }
  ];
</script>

<section id="features" class="features">
  <div class="container">
    <div class="section-header">
      <span class="eyebrow">Características</span>
      <h2>Todo lo que necesitas para tu <span class="text-gradient">inversión pasiva</span></h2>
      <p>CoreBalance está diseñado para simplificar la vida del inversor indexado de largo plazo.</p>
    </div>

    <div class="features-grid">
      {#each features as feature}
        <div class="feature-card">
          <div class="icon">{feature.icon}</div>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .features {
    padding: 100px 1.5rem;
    background: rgba(255, 255, 255, 0.02);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
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
    letter-spacing: -0.02em;
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

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }

  .feature-card {
    background: var(--bg-secondary, #0f0f14);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 2.5rem;
    border-radius: 24px;
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    transform: translateY(-5px);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  }

  .icon {
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #fff;
  }

  .feature-card p {
    color: rgba(160, 160, 200, 0.5);
    line-height: 1.6;
    margin: 0;
  }
</style>
