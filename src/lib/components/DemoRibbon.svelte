<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { goto } from '$app/navigation';
  import { LL } from '$lib/i18n/i18n-svelte';
</script>

{#if portfolio.isDemo}
  <div class="demo-ribbon">
    <div class="demo-content">
      <span class="demo-badge">{$LL.demo_ribbon.badge()}</span>
      <p>{@html $LL.demo_ribbon.text({ bold: `<strong>${$LL.demo_ribbon.text_bold()}</strong>` })}</p>
      <!-- `id` para el tutorial: en demo, el último paso señala aquí en vez de al botón
           de gestionar cartera, que `Header.svelte` esconde precisamente en demo. -->
      <button id="tour-demo-exit" class="exit-demo-btn" onclick={() => (portfolio as any).exitDemo()}>
        {$LL.demo_ribbon.exit_btn()}
      </button>
    </div>
  </div>
{/if}

<style>
  .demo-ribbon {
    /*
		 * El extremo claro del degradado (#8b5cf6) deja el blanco en 4,23:1, por
		 * debajo de AA. Un paso más oscuro en los dos topes lo sube sin cambiar el
		 * tono, que es lo que identifica a la cinta de demo.
		 */
		background: linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%);
    color: var(--text-on-accent);
    padding: 0.5rem 1rem;
    position: sticky;
    top: 0;
    z-index: 2000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .demo-content {
    max-width: 1140px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .demo-badge {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  p {
    margin: 0;
    font-size: 0.85rem;
    flex: 1;
  }

  .exit-demo-btn {
    background: white;
    color: var(--accent-blue-ink);
    border: none;
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .exit-demo-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 640px) {
    p { display: none; }
    .demo-content { justify-content: space-between; }
  }
</style>
