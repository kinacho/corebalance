<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { LL } from '$lib/i18n/i18n-svelte';

  const lastUpdateDate = new Date();
</script>

<svelte:head>
  <title>{$LL.cookies.title()} — CoreBalance</title>
  <meta name="description" content={$LL.cookies.seo_desc()} />
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="legal-page">
  <LandingNavBar onStart={() => window.location.href = '/'} />

  <main class="legal-content">
    <div class="container">
      <h1>{$LL.cookies.title()}</h1>
      <p class="update-date">{$LL.cookies.updated({ date: lastUpdateDate })}</p>

      <section>
        <h2>{$LL.cookies.sections.s1_title()}</h2>
        <p>{$LL.cookies.sections.s1_content()}</p>
      </section>

      <section>
        <h2>{$LL.cookies.sections.s2_title()}</h2>
        <p>{@html $LL.cookies.sections.s2_content()}</p>

        <h3>{$LL.cookies.sections.s2_subtitle()}</h3>
        <p>{$LL.cookies.sections.s2_content2()}</p>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                {#each Object.values($LL.cookies.sections.s2_table_headers) as headerFn}
                  <th>{headerFn()}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each Object.values($LL.cookies.sections.s2_table_data) as row}
                <tr>
                  <td>{row.name()}</td>
                  <td>{row.origin()}</td>
                  <td>{row.purpose()}</td>
                  <td>{row.duration()}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>{$LL.cookies.sections.s3_title()}</h2>
        <p>{@html $LL.cookies.sections.s3_content()}</p>
        <p>{@html $LL.cookies.sections.s3_content2()}</p>
      </section>

      <section>
        <h2>{$LL.cookies.sections.s4_title()}</h2>
        <p>{$LL.cookies.sections.s4_content()}</p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647?hl=es" target="_blank" rel="noopener noreferrer">{$LL.cookies.sections.s4_list['0']()}</a></li>
          <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63491102-8316-6551-34a1-5360f35352c2" target="_blank" rel="noopener noreferrer">{$LL.cookies.sections.s4_list['1']()}</a></li>
          <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">{$LL.cookies.sections.s4_list['2']()}</a></li>
          <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">{$LL.cookies.sections.s4_list['3']()}</a></li>
        </ul>
        <p><em>{$LL.cookies.sections.s4_note()}</em></p>
      </section>

      <section>
        <h2>{$LL.cookies.sections.s5_title()}</h2>
        <p>{$LL.cookies.sections.s5_content()}</p>
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

  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
    color: #fff;
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

  li a {
    color: var(--accent-blue, #3b82f6);
    text-decoration: none;
  }

  li a:hover {
    text-decoration: underline;
  }

  .table-container {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
    margin: 1.5rem 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th {
    background: rgba(255, 255, 255, 0.05);
    text-align: left;
    padding: 0.75rem 1rem;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 600;
  }

  td {
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
  }

</style>
