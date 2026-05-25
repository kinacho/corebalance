<script lang="ts">
  const comparison = [
    {
      feature: "Actualización de precios",
      excel: "Manual (tedioso)",
      others: "Retrasada / Pago",
      corebalance: "Automática y Gratis",
      highlight: true
    },
    {
      feature: "Cálculo de rebalanceo",
      excel: "Fórmulas complejas",
      others: "Básico",
      corebalance: "Optimizado",
      highlight: true
    },
    {
      feature: "Privacidad",
      excel: "Local, pero expuesta",
      others: "Venden tus datos",
      corebalance: "Tus datos son tuyos",
      highlight: true
    },
    {
      feature: "Facilidad de uso",
      excel: "Sólo para expertos",
      others: "Compleja",
      corebalance: "Intuitiva",
      highlight: true
    }
  ];
</script>

<section class="comparison">
  <div class="container">
    <div class="section-header">
      <h2>La alternativa a <span class="text-gradient">Portfolio Performance</span> y Excel</h2>
      <p>CoreBalance es la herramienta gratuita, rápida y privada que hace el trabajo sucio por ti, para que te centres en lo que importa: tu libertad financiera.</p>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Funcionalidad</th>
            <th>Excel / Google Sheets</th>
            <th>Otras Apps</th>
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
    padding: 100px 1.5rem;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  h2 {
    font-size: clamp(2rem, 4vw, 2.5rem);
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

  .table-container {
    background: var(--bg-secondary, #0f0f14);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    overflow-x: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;
  }

  th, td {
    padding: 1.5rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    font-size: 0.95rem;
  }

  th {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
  }

  .feature-name {
    color: #fff;
    font-weight: 600;
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
