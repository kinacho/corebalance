<script lang="ts">
  import { LL } from '$lib/i18n/i18n-svelte';

  const features = $derived([
    {
      title: $LL.features.item_rebalance_title(),
      description: $LL.features.item_rebalance_desc(),
      icon: "⚖️"
    },
    {
      title: $LL.features.item_tracking_title(),
      description: $LL.features.item_tracking_desc(),
      icon: "📈"
    },
    {
      title: $LL.features.item_privacy_title(),
      description: $LL.features.item_privacy_desc(),
      icon: "🔒"
    },
    {
      title: $LL.features.item_crisis_title(),
      description: $LL.features.item_crisis_desc(),
      icon: "📉"
    },
    {
      title: $LL.features.item_projections_title(),
      description: $LL.features.item_projections_desc(),
      icon: "🚀"
    },
    {
      title: $LL.features.item_broker_title(),
      description: $LL.features.item_broker_desc(),
      icon: "💼"
    },
    {
      title: $LL.features.item_ledger_title(),
      description: $LL.features.item_ledger_desc(),
      icon: "📒"
    },
    {
      title: $LL.features.item_cash_title(),
      description: $LL.features.item_cash_desc(),
      icon: "🏦"
    },
    {
      title: $LL.features.item_currency_title(),
      description: $LL.features.item_currency_desc(),
      icon: "🌍"
    }
  ]);
</script>

<section id="features" class="features">
  <div class="container">
    <div class="section-header">
      <span class="eyebrow">{$LL.features.eyebrow()}</span>
      <h2>{$LL.features.title()} <span class="text-gradient">{$LL.features.title_gradient()}</span></h2>
      <p>{$LL.features.subtitle()}</p>
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
    padding: 80px 1rem;
    background: var(--bg-card);
  }

  @media (min-width: 768px) {
    .features {
      padding: 100px 1.5rem;
    }
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .section-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  @media (min-width: 768px) {
    .section-header {
      margin-bottom: 4rem;
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
    font-size: clamp(1.75rem, 5vw, 3rem);
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

  .section-header p {
    color: var(--text-muted);
    font-size: 1rem;
    max-width: 600px;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .section-header p {
      font-size: 1.1rem;
    }
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  @media (max-width: 360px) {
    .features-grid {
      grid-template-columns: 1fr;
    }
  }

  .feature-card {
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    padding: 1.5rem;
    border-radius: 20px;
    transition: all 0.3s ease;
  }

  @media (min-width: 768px) {
    .feature-card {
      padding: 2.5rem;
      border-radius: 24px;
    }
  }

  .feature-card:hover {
    transform: translateY(-5px);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  }

  .icon {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  @media (min-width: 768px) {
    .icon {
      font-size: 2.5rem;
      margin-bottom: 1.5rem;
    }
  }

  h3 {
    font-size: 1.15rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: var(--text-primary);
  }

  @media (min-width: 768px) {
    h3 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
  }

  .feature-card p {
    color: var(--text-muted);
    line-height: 1.6;
    margin: 0;
    font-size: 0.9rem;
  }

  @media (min-width: 768px) {
    .feature-card p {
      font-size: 0.95rem;
    }
  }
</style>

