<script lang="ts">
</script>

<section id="why-us" class="why-us">
  <div class="container">
    <div class="content-grid">
      <div class="text-content">
        <span class="eyebrow">La historia</span>
        <h2>Por qué creé <span class="text-gradient">CoreBalance</span></h2>
        <div class="story">
          <p>
            Como inversor indexado, me pasaba horas cada mes peleándome con hojas de cálculo para calcular 
            cuánto debía aportar a cada fondo para mantener mi estrategia 90/10 o 80/20.
          </p>
          <p>
            Buscaba una herramienta que fuera <strong>sencilla, rápida y privada</strong>. 
            No quería dar mis contraseñas bancarias a terceros ni pagar cuotas mensuales por algo que debería ser básico.
          </p>
          <p>
            Así nació CoreBalance: una herramienta creada por un inversor para inversores. Sin florituras innecesarias, 
            centrada en lo que de verdad importa: mantener el rumbo de tu estrategia de inversión.
          </p>
        </div>
        <div class="signature">
          <div class="avatar">KN</div>
          <div class="author">
            <strong>kinacho</strong>
            <span>Creador de CoreBalance</span>
          </div>
        </div>
      </div>
      <div class="image-content">
        <div class="experience-card">
          <div class="exp-header">
            <span class="exp-icon">✨</span>
            <h4>Experiencia Nativa</h4>
          </div>
          <p>Diseñado para sentirse como una app nativa en tu móvil, pero con la facilidad de acceso de una web.</p>
        </div>
        <div class="experience-card">
          <div class="exp-header">
            <span class="exp-icon">🛠️</span>
            <h4>Evolución Constante</h4>
          </div>
          <p>Añadimos mejoras cada semana basadas en el feedback real de la comunidad de inversores.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .why-us {
    padding: 100px 1.5rem;
    background: linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.05), transparent);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4rem;
    align-items: center;
  }

  @media (min-width: 1024px) {
    .content-grid {
      grid-template-columns: 1.2fr 0.8fr;
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

  h2 {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800;
    margin-bottom: 2rem;
    color: #fff;
    letter-spacing: -0.02em;
  }

  .text-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .story p {
    color: rgba(160, 160, 200, 0.7);
    font-size: 1.1rem;
    line-height: 1.7;
    margin-bottom: 1.5rem;
  }

  .signature {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 3rem;
  }

  .avatar {
    width: 48px;
    height: 48px;
    background: #3b82f6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: #fff;
    font-size: 0.9rem;
  }

  .author strong {
    display: block;
    color: #fff;
    font-size: 1rem;
  }

  .author span {
    color: rgba(160, 160, 200, 0.5);
    font-size: 0.85rem;
  }

  .image-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .experience-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 2rem;
    border-radius: 20px;
    transition: all 0.3s ease;
  }

  .experience-card:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(5px);
  }

  .exp-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .exp-icon {
    font-size: 1.5rem;
  }

  h4 {
    margin: 0;
    color: #fff;
    font-weight: 700;
  }

  .experience-card p {
    color: rgba(160, 160, 200, 0.5);
    font-size: 0.95rem;
    line-height: 1.5;
    margin: 0;
  }
</style>
