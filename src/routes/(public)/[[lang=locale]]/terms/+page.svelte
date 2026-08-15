<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { LL } from '$lib/i18n/i18n-svelte';
  import { ui } from '$lib/stores/ui.svelte';

  const lastUpdateDate = new Date();

  function openContact() {
    ui.supportType = 'contact';
    ui.showSupportModal = true;
  }

  const contactLinkBtn = $derived(`<button class="contact-link" data-action="contact">${$LL.common.contact_form()}</button>`);

  function handleContactClick(e: MouseEvent) {
    if ((e.target as HTMLElement).dataset?.action === 'contact') openContact();
  }
</script>

<svelte:head>
  <title>{$LL.terms.title()} — CoreBalance</title>
  <meta name="description" content={$LL.terms.seo_desc()} />
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="legal-page">
  <LandingNavBar onStart={() => window.location.href = '/'} />

  <main class="legal-content">
    <div class="container">
      <h1>{$LL.terms.title()}</h1>
      <p class="update-date">{$LL.terms.updated({ date: lastUpdateDate })}</p>

      <section>
        <h2>{$LL.terms.sections.s1_title()}</h2>
        <p>{$LL.terms.sections.s1_content()}</p>
      </section>

      <section>
        <h2>{$LL.terms.sections.s2_title()}</h2>
        <div class="disclaimer">
          <p><strong>{$LL.terms.sections.s2_disclaimer_title()}</strong> {$LL.terms.sections.s2_disclaimer_content()}</p>
          <p>{$LL.terms.sections.s2_content()}</p>
          <p>{$LL.terms.sections.s2_content2()}</p>
        </div>
      </section>

      <section>
        <h2>{$LL.terms.sections.s3_title()}</h2>
        <p>{$LL.terms.sections.s3_content()}</p>
        <ul>
          {#each Object.values($LL.terms.sections.s3_list) as itemFn}
            <li>{itemFn()}</li>
          {/each}
        </ul>
      </section>

      <section>
        <h2>{$LL.terms.sections.s4_title()}</h2>
        <p>{$LL.terms.sections.s4_content()}</p>
      </section>

      <section>
        <h2>{$LL.terms.sections.s5_title()}</h2>
        <p>{$LL.terms.sections.s5_content()}</p>
      </section>

      <section>
        <h2>{$LL.terms.sections.s6_title()}</h2>
        <p>{$LL.terms.sections.s6_content()}</p>
      </section>

      <section>
        <h2>{$LL.terms.sections.s7_title()}</h2>
        <p>{@html $LL.terms.sections.s7_content()}</p>
      </section>

      <section>
        <h2>{$LL.terms.sections.s8_title()}</h2>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <p onclick={handleContactClick}>{@html $LL.terms.sections.s8_content({ contactLink: contactLinkBtn })}</p>
      </section>
    </div>
  </main>

  <LandingFooter />
</div>

<style>
  .legal-page {
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
  }

  .legal-content {
    padding: 120px 1.5rem 80px;
    line-height: 1.6;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }

  .update-date {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 3rem;
  }

  section {
    margin-bottom: 2.5rem;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--accent-blue-ink);
  }

  p {
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }

  ul {
    padding-left: 1.5rem;
    margin-bottom: 1rem;
    color: var(--text-secondary);
  }

  li {
    margin-bottom: 0.5rem;
  }

  .disclaimer {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    padding: 1.5rem;
    border-radius: 16px;
    margin-bottom: 1rem;
  }

  .disclaimer p {
    color: var(--state-negative);
    margin-bottom: 0.5rem;
  }

  .disclaimer p:last-child {
    margin-bottom: 0;
  }

  :global(strong) {
    color: var(--text-primary);
  }

  :global(.contact-link) {
    background: none;
    border: none;
    color: var(--accent-blue-ink);
    text-decoration: underline;
    font: inherit;
    cursor: pointer;
    padding: 0;
    font-weight: 700;
  }

  :global(.contact-link:hover) {
    color: var(--accent-blue-ink);
  }
</style>
