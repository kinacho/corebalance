<script lang="ts">
  import { LL } from '$lib/i18n/i18n-svelte';
</script>

<section id="why-us" class="why-us">
  <div class="container">
    <div class="content-grid">
      <div class="text-content">
        <span class="eyebrow">{$LL.why_us.eyebrow()}</span>
        <h2>{$LL.why_us.title()} <span class="text-gradient">CoreBalance</span></h2>
        <div class="story">
          <p>{$LL.why_us.story_p1()}</p>
          <p>
            {@html $LL.why_us.story_p2({ highlight: `<span class="text-highlight">${$LL.why_us.story_p2_highlight()}</span>` })}
          </p>
          <p>{$LL.why_us.story_p3()}</p>
        </div>
        <div class="signature">
          <div class="avatar">KN</div>
          <div class="author">
            <strong>kinacho</strong>
            <span>{$LL.why_us.author_role()}</span>
          </div>
        </div>
      </div>
      <div class="image-content">
        <div class="experience-card">
          <div class="exp-header">
            <span class="exp-icon">✨</span>
            <h3>{$LL.why_us.exp_native_title()}</h3>
          </div>
          <p>{$LL.why_us.exp_native_desc()}</p>
        </div>
        <div class="experience-card">
          <div class="exp-header">
            <span class="exp-icon">🛠️</span>
            <h3>{$LL.why_us.exp_evolution_title()}</h3>
          </div>
          <p>{$LL.why_us.exp_evolution_desc()}</p>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .why-us {
    padding: 80px 1rem;
    background: linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.05), transparent);
  }

  @media (min-width: 768px) {
    .why-us {
      padding: 100px 1.5rem;
    }
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem;
    align-items: center;
  }

  @media (min-width: 1024px) {
    .content-grid {
      grid-template-columns: 1.2fr 0.8fr;
      gap: 4rem;
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
    font-size: clamp(1.75rem, 5vw, 3rem);
    font-weight: 800;
    margin-bottom: 1.5rem;
    color: #fff;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  @media (min-width: 768px) {
    h2 {
      margin-bottom: 2rem;
    }
  }

  .text-gradient {
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :global(.text-highlight) {
    color: #3b82f6;
    font-weight: 700;
  }

  .story p {
    color: rgba(160, 160, 200, 0.7);
    font-size: 1rem;
    line-height: 1.7;
    margin-bottom: 1.25rem;
  }

  @media (min-width: 768px) {
    .story p {
      font-size: 1.1rem;
      margin-bottom: 1.5rem;
    }
  }

  .signature {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
  }

  @media (min-width: 768px) {
    .signature {
      margin-top: 3rem;
    }
  }

  .avatar {
    width: 44px;
    height: 44px;
    background: #3b82f6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: #fff;
    font-size: 0.85rem;
  }

  @media (min-width: 768px) {
    .avatar {
      width: 48px;
      height: 48px;
      font-size: 0.9rem;
    }
  }

  .author strong {
    display: block;
    color: #fff;
    font-size: 0.95rem;
  }

  @media (min-width: 768px) {
    .author strong {
      font-size: 1rem;
    }
  }

  .author span {
    color: rgba(160, 160, 200, 0.5);
    font-size: 0.8rem;
  }

  @media (min-width: 768px) {
    .author span {
      font-size: 0.85rem;
    }
  }

  .image-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  @media (min-width: 768px) {
    .image-content {
      gap: 1.5rem;
    }
  }

  .experience-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.5rem;
    border-radius: 20px;
    transition: all 0.3s ease;
  }

  @media (min-width: 768px) {
    .experience-card {
      padding: 2rem;
    }
  }

  .experience-card:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(5px);
  }

  .exp-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  @media (min-width: 768px) {
    .exp-header {
      margin-bottom: 1rem;
    }
  }

  .exp-icon {
    font-size: 1.25rem;
  }

  @media (min-width: 768px) {
    .exp-icon {
      font-size: 1.5rem;
    }
  }

  h3 {
    margin: 0;
    color: #fff;
    font-weight: 700;
    font-size: 1.1rem;
  }

  @media (min-width: 768px) {
    h3 {
      font-size: 1.2rem;
    }
  }

  .experience-card p {
    color: rgba(160, 160, 200, 0.5);
    font-size: 0.9rem;
    line-height: 1.5;
    margin: 0;
  }

  @media (min-width: 768px) {
    .experience-card p {
      font-size: 0.95rem;
    }
  }
</style>

