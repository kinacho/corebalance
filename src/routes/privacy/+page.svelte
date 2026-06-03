<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { LL } from '$lib/i18n/i18n-svelte';

  const lastUpdateDate = new Date();
</script>

<svelte:head>
  <title>{$LL.privacy.title()} — CoreBalance</title>
  <meta name="description" content={$LL.privacy.seo_desc()} />
</svelte:head>

<div class="legal-page">
  <LandingNavBar onStart={() => window.location.href = '/'} />

  <main class="legal-content">
    <div class="container">
      <h1>{$LL.privacy.title()}</h1>
      <p class="update-date">{$LL.privacy.updated({ date: lastUpdateDate })}</p>

      <section>
        <h2>{$LL.privacy.sections.s1_title()}</h2>
        <p>{@html $LL.privacy.sections.s1_content()}</p>
      </section>

      <section>
        <h2>{$LL.privacy.sections.s2_title()}</h2>
        <p>{$LL.privacy.sections.s2_content()}</p>
        <ul>
          {#each Object.values($LL.privacy.sections.s2_list) as itemFn}
            <li>{@html itemFn()}</li>
          {/each}
        </ul>
      </section>

      <section>
        <h2>{$LL.privacy.sections.s3_title()}</h2>
        <p>{$LL.privacy.sections.s3_content()}</p>
        <ul>
          {#each Object.values($LL.privacy.sections.s3_list) as itemFn}
            <li>{itemFn()}</li>
          {/each}
        </ul>
      </section>

      <section>
        <h2>{$LL.privacy.sections.s4_title()}</h2>
        <p>{@html $LL.privacy.sections.s4_content()}</p>
      </section>

      <section>
        <h2>{$LL.privacy.sections.s5_title()}</h2>
        <p>{$LL.privacy.sections.s5_content()}</p>
        <ul>
          {#each Object.values($LL.privacy.sections.s5_list) as itemFn}
            <li>{@html itemFn()}</li>
          {/each}
        </ul>
      </section>

      <section>
        <h2>{$LL.privacy.sections.s6_title()}</h2>
        <p>{$LL.privacy.sections.s6_content()}</p>
      </section>

      <section>
        <h2>{$LL.privacy.sections.s7_title()}</h2>
        <p>{$LL.privacy.sections.s7_content()}</p>
        <ul>
          {#each Object.values($LL.privacy.sections.s7_list) as itemFn}
            <li>{@html itemFn()}</li>
          {/each}
        </ul>
        <p>{@html $LL.privacy.sections.s7_contact()}</p>
      </section>

      <section>
        <h2>{$LL.privacy.sections.s8_title()}</h2>
        <p>{$LL.privacy.sections.s8_content()}</p>
      </section>
    </div>
  </main>

  <LandingFooter />
</div>

<style>
  .legal-page {
    background: var(--bg-primary, #05050a);
    color: #fff;
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
    color: rgba(160, 160, 200, 0.5);
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
    color: var(--accent-blue, #3b82f6);
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 1rem;
  }

  ul {
    padding-left: 1.5rem;
    margin-bottom: 1rem;
    color: rgba(255, 255, 255, 0.8);
  }

  li {
    margin-bottom: 0.5rem;
  }

  :global(strong) {
    color: #fff;
  }
</style>
