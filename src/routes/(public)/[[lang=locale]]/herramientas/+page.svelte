<script lang="ts">
  import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import SeoHead from '$lib/components/seo/SeoHead.svelte';
  import { pageOgImage } from '$lib/seo/og';
  import { link } from '$lib/i18n/link';
  import { alternates, SITE_URL, localizePath, absoluteUrl } from '$lib/i18n/routing';
  import type { Locales } from '$lib/i18n/i18n-types';

  const lang = $derived(($page.data.locale ?? 'es') as Locales);
  let isEs = $derived(lang === 'es');
  const canonical = $derived(alternates($page.url.pathname, lang).canonical);

  const metaTitle = $derived(
    isEs
      ? 'Herramientas gratis para el inversor indexado | CoreBalance'
      : 'Free tools for index investors | CoreBalance'
  );
  const metaDesc = $derived(
    isEs
      ? 'Cuatro calculadoras gratis y sin registro para inversión indexada: TER de tu cartera, si toca rebalancear, cuánto caerías en una crisis y tu precio medio.'
      : 'Four free, no-sign-up calculators for index investing: your portfolio TER, whether it is time to rebalance, crash recovery and your average price.'
  );

  /** Las cuatro herramientas, en el orden en que le sirven a alguien que empieza. */
  const tools = $derived([
    {
      path: '/herramientas/calculadora-ter',
      badge: isEs ? 'Costes' : 'Costs',
      name: isEs ? 'Calculadora de TER' : 'TER Calculator',
      question: isEs ? '¿Cuánto me cuestan mis fondos de verdad?' : 'What do my funds really cost me?',
      body: isEs
        ? 'Calcula el TER medio ponderado de tu cartera y proyecta a 40 años cuántos euros se llevan las comisiones. Sirve para decidir entre dos fondos que se diferencian en un 0,10% aparentemente inocente.'
        : 'Works out the weighted average TER of your portfolio and projects, over 40 years, how many euros fees take away. Useful for choosing between two funds separated by a seemingly innocent 0.10%.',
      accent: 'var(--accent-blue)'
    },
    {
      path: '/herramientas/checklist-rebalanceo',
      badge: isEs ? 'Decisión' : 'Decision',
      name: isEs ? '¿Toca rebalancear?' : 'Is it time to rebalance?',
      question: isEs ? '¿Muevo ficha ahora o espero?' : 'Do I act now or wait?',
      body: isEs
        ? 'Cuatro preguntas —desviación, tiempo desde el último ajuste, coste fiscal y comisiones— y un veredicto. Pensada para el momento en que ves la cartera torcida y no sabes si el arreglo cuesta más que el problema.'
        : 'Four questions — drift, time since your last adjustment, tax cost and fees — and a verdict. Built for the moment you see your portfolio skewed and cannot tell whether the fix costs more than the problem.',
      accent: 'var(--accent-green)'
    },
    {
      path: '/herramientas/simulador-crisis',
      badge: isEs ? 'Riesgo' : 'Risk',
      name: isEs ? 'Simulador de crisis' : 'Crash simulator',
      question: isEs ? '¿Cuánto aguantaría yo una caída así?' : 'Could I actually sit through a drop like that?',
      body: isEs
        ? 'Aplica caídas históricas reales sobre tu capital —la burbuja de 2000 (−49%), Lehman en 2008 (−56%), el COVID de 2020 (−34%)— y estima cuánto tardarías en recuperarte, con y sin aportaciones. Es una herramienta de comportamiento, no de predicción.'
        : 'Applies real historical crashes to your capital — the 2000 bubble (−49%), Lehman in 2008 (−56%), COVID in 2020 (−34%) — and estimates how long recovery would take, with and without contributions. It is a behavioural tool, not a forecast.',
      accent: 'var(--accent-orange)'
    },
    {
      path: '/herramientas/calculadora-precio-medio',
      badge: isEs ? 'Contabilidad' : 'Accounting',
      name: isEs ? 'Calculadora de precio medio' : 'Average price calculator',
      question: isEs ? '¿A qué precio tengo esto realmente?' : 'What did I really pay for this?',
      body: isEs
        ? 'Precio medio ponderado de compra a partir de tus operaciones, contando ventas, dividendos y comisiones. Para quien lleva años aportando a plazos y ya perdió la cuenta de su coste real.'
        : 'Weighted average purchase price from your own transactions, counting sells, dividends and fees. For anyone who has been contributing for years and lost track of their real cost basis.',
      accent: 'var(--accent-blue)'
    }
  ]);

  /**
   * El recorrido que encadena las cuatro, y la razón de que exista esta sección no es
   * decorativa: **este índice era la página con menos contenido propio del sitio** —2.026
   * caracteres en `<main>`, de los cuales buena parte son el menú y el pie que se repiten en
   * las 70 URLs— y Search Console reportaba `/en/herramientas` como «soft 404», es decir un
   * 200 sin contenido suficiente que se niega a indexar. Un índice de cuatro tarjetas no le
   * dice a un buscador nada que no diga cualquier otro índice.
   *
   * El orden no es el del menú: es el que le sirve a alguien que empieza, de lo que se puede
   * decidir con datos ciertos (el coste) a lo que sólo se sabe mirando hacia atrás (el coste
   * real de lo que ya compraste).
   */
  const steps = $derived([
    {
      n: 1,
      title: isEs ? 'Primero el coste, que es el único dato seguro' : 'Cost first — the only certain number',
      body: isEs
        ? 'La rentabilidad futura de un índice no la sabe nadie; su comisión está escrita. Es la única variable de tu cartera que puedes fijar hoy y que se cumplirá los próximos cuarenta años, así que es por donde conviene empezar. Un 0,10 % de diferencia sobre 100.000 € no son 100 € al año: son 100 € el primer año y el interés compuesto de todos los que faltan.'
        : 'Nobody knows an index\'s future return; its fee is written down. It is the only variable in your portfolio you can fix today and that will hold for the next forty years, so it is where to start. A 0.10% difference on €100,000 is not €100 a year: it is €100 the first year, plus the compounding of every year after that.'
    },
    {
      n: 2,
      title: isEs ? 'Después, si de verdad toca mover algo' : 'Then, whether anything actually needs moving',
      body: isEs
        ? 'Ver la cartera torcida no es motivo suficiente para tocarla. Un rebalanceo tiene tres costes —comisiones, horquilla y peaje fiscal si obliga a vender— y hay desviaciones que cuestan menos aguantarlas que arreglarlas. La decisión depende de cuánto te has desviado, de cuánto tiempo llevas así y de si puedes corregirlo aportando en vez de vendiendo.'
        : 'Seeing your portfolio skewed is not reason enough to touch it. Rebalancing has three costs — fees, spread, and a tax toll if it forces a sale — and some drifts are cheaper to live with than to fix. The decision depends on how far you have drifted, how long you have been there, and whether you can correct it by contributing rather than selling.'
    },
    {
      n: 3,
      title: isEs ? 'La caída, antes de que llegue' : 'The crash, before it arrives',
      body: isEs
        ? 'La pregunta de una crisis no es cuánto cae el índice, es si tú te quedas. Un −56 % como el de 2008 en abstracto no dice nada; sobre tu capital, con tu cifra, con los meses que tardaría en recuperarse, sí. Se usa en frío, cuando no está pasando: durante la caída ya no es una simulación, es una decisión.'
        : 'The question in a crisis is not how far the index falls, it is whether you stay. A −56% like 2008 means nothing in the abstract; against your capital, with your number, with the months recovery would take, it does. Use it cold, when nothing is happening: during the fall it is no longer a simulation, it is a decision.'
    },
    {
      n: 4,
      title: isEs ? 'Y al final, qué tienes realmente' : 'And finally, what you actually hold',
      body: isEs
        ? 'Después de años aportando a plazos, con alguna venta y algún dividendo por medio, casi nadie sabe a qué precio tiene lo que tiene. Y sin ese número no hay forma de saber si vas ganando ni de calcular lo que deberías a Hacienda el día que vendas. Es contabilidad, no opinión.'
        : 'After years of instalments, with the odd sale and dividend in between, almost nobody knows what price they actually paid. Without that number there is no way to tell whether you are up, or to work out what you would owe the tax office the day you sell. It is accounting, not opinion.'
    }
  ]);

  /**
   * Preguntas reales, no relleno: las cuatro que decide alguien antes de abrir una
   * calculadora ajena. Deliberadamente **no repiten** lo que ya dicen las tarjetas ni la
   * nota de «por qué gratis», porque duplicar texto dentro de la misma página no añade
   * contenido, sólo longitud.
   */
  const faqs = $derived([
    {
      q: isEs ? '¿Sirven si mi cartera no es una 80/20?' : 'Do they work if my portfolio is not an 80/20?',
      a: isEs
        ? 'Sí. Los pesos los pones tú: pueden ser dos fondos o nueve, con los porcentajes que hayas decidido. Ninguna de las cuatro asume una distribución concreta ni te propone otra.'
        : 'Yes. You set the weights: two funds or nine, with whatever percentages you decided. None of the four assumes a particular allocation or suggests a different one.'
    },
    {
      q: isEs ? '¿Valen para fondos indexados y para ETF?' : 'Do they cover index funds and ETFs?',
      a: isEs
        ? 'Para los dos, con una diferencia que importa en España: entre fondos de inversión se puede traspasar sin tributar, y un ETF que replica el mismo índice no. Eso cambia el coste de un rebalanceo, y es la razón de que la pregunta fiscal esté dentro del checklist.'
        : 'Both, with one difference that matters in Spain: you can transfer between mutual funds without triggering tax, while an ETF tracking the same index cannot. That changes what a rebalance costs, which is why the tax question sits inside the checklist.'
    },
    {
      q: isEs ? '¿Qué datos tengo que tener a mano?' : 'What figures do I need to hand?',
      a: isEs
        ? 'Poco: el valor actual de cada posición y su TER para la de costes, tus objetivos para el checklist, y tus compras con fecha e importe para el precio medio. Nada de contraseñas ni de conectar el bróker.'
        : 'Not much: the current value of each holding and its TER for the cost one, your targets for the checklist, and your purchases with dates and amounts for the average price. No passwords, no connecting your broker.'
    },
    {
      q: isEs ? '¿Esto sustituye a un asesor?' : 'Does this replace an adviser?',
      a: isEs
        ? 'No, y ninguna de las cuatro te dice qué comprar. Calculan consecuencias de decisiones que ya has tomado —lo que cuesta una comisión, lo que costaría un rebalanceo, lo que aguantarías en una caída— para que decidas con el número delante en vez de con una intuición.'
        : 'No, and none of the four tells you what to buy. They compute the consequences of decisions you have already made — what a fee costs, what a rebalance would cost, what you could sit through in a crash — so you decide with the number in front of you instead of on a hunch.'
    }
  ]);

  const schemaData = $derived({
    '@context': 'https://schema.org',
    '@graph': [
      /**
       * `FAQPage` sobre las preguntas que la página muestra de verdad. Se declara aquí, en
       * el `@graph` que ya existía, y no como un segundo bloque de JSON-LD: dos bloques
       * compiten por describir la misma URL. Y sólo se declara porque las preguntas están
       * visibles en el HTML — marcar una FAQ que el usuario no puede leer es justo lo que
       * las guías de datos estructurados prohíben.
       */
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a }
        }))
      },
      // ⚠️ Aquí había un `BreadcrumbList`, y se fue con la miga de pan que lo respaldaba:
      // marcar un rastro de navegación que no está en la página es describir contenido
      // invisible, que es justo lo que retira un resultado enriquecido. En una página de
      // primer nivel el rastro era además «Inicio / Herramientas», que no dice nada que el
      // `h1` no diga ya.
      {
        '@type': 'CollectionPage',
        name: metaTitle,
        description: metaDesc,
        url: canonical,
        inLanguage: lang,
        isPartOf: { '@type': 'WebSite', name: 'CoreBalance', url: SITE_URL },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: tools.length,
          itemListElement: tools.map((tool, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: tool.name,
            description: tool.question,
            url: absoluteUrl(localizePath(tool.path, lang))
          }))
        }
      }
    ]
  });
</script>

<SeoHead
  title={metaTitle}
  description={metaDesc}
  path={$page.url.pathname}
  {lang}
  image={pageOgImage('herramientas', lang)}
  jsonLd={schemaData}
/>

<div class="hub-page">
  <div class="background-mesh"></div>

  <LandingNavBar onStart={() => goto($link('/'))} />

  <main class="hub-container">
    <header class="hub-header">
      <span class="category-badge">{isEs ? 'Herramientas interactivas' : 'Interactive tools'}</span>
      <h1 class="gradient-text">
        {isEs ? 'Herramientas gratis para el inversor indexado' : 'Free tools for index investors'}
      </h1>
      <p class="hub-lead">
        {isEs
          ? 'Invertir en indexados es sencillo de explicar y difícil de sostener. Lo que se lleva la rentabilidad a largo plazo casi nunca es la elección del índice: son las comisiones que no miraste, el peaje fiscal de un rebalanceo mal cronometrado y la venta en el peor mes de una caída.'
          : 'Index investing is simple to explain and hard to sustain. What eats long-term returns is almost never the choice of index: it is the fees you never checked, the tax toll of a badly timed rebalance, and selling in the worst month of a drawdown.'}
      </p>
      <p class="hub-lead">
        {isEs
          ? 'Estas cuatro herramientas atacan cada una de esas decisiones y responden a una sola pregunta. Son gratuitas, no piden registro y calculan en tu navegador: ningún dato que escribas sale de tu dispositivo.'
          : 'These four tools take on one of those decisions each, and answer a single question. They are free, ask for no sign-up, and run in your browser: nothing you type leaves your device.'}
      </p>
    </header>

    <div class="tools-grid">
      {#each tools as tool}
        <a class="tool-card" href={$link(tool.path)} style="--card-accent: {tool.accent}">
          <span class="tool-badge">{tool.badge}</span>
          <h2 class="tool-name">{tool.name}</h2>
          <p class="tool-question">{tool.question}</p>
          <p class="tool-body">{tool.body}</p>
          <span class="tool-cta">{isEs ? 'Abrir herramienta →' : 'Open tool →'}</span>
        </a>
      {/each}
    </div>

    <section class="hub-steps">
      <h2>{isEs ? 'En qué orden usarlas' : 'What order to use them in'}</h2>
      <p class="steps-lead">
        {isEs
          ? 'No hace falta usar las cuatro, ni en este orden. Pero si estás montando la cartera ahora, éste es el recorrido que evita el error más caro de cada etapa.'
          : 'You do not need all four, nor in this order. But if you are building the portfolio now, this is the path that avoids the most expensive mistake at each stage.'}
      </p>
      <ol class="steps-list">
        {#each steps as step (step.n)}
          <li class="step">
            <span class="step-n" aria-hidden="true">{step.n}</span>
            <div>
              <h3 class="step-title">{step.title}</h3>
              <p class="step-body">{step.body}</p>
            </div>
          </li>
        {/each}
      </ol>
    </section>

    <section class="hub-faq">
      <h2>{isEs ? 'Preguntas frecuentes' : 'Frequently asked questions'}</h2>
      <dl class="faq-list">
        {#each faqs as faq (faq.q)}
          <div class="faq-item">
            <dt class="faq-q">{faq.q}</dt>
            <dd class="faq-a">{faq.a}</dd>
          </div>
        {/each}
      </dl>
    </section>

    <section class="hub-note">
      <h2>{isEs ? '¿Por qué gratis y sin registro?' : 'Why free and with no sign-up?'}</h2>
      <p>
        {isEs
          ? 'Porque una calculadora que te pide el correo antes de darte un número no es una calculadora, es un formulario. Ninguna de estas herramientas guarda lo que escribes ni lo envía a un servidor, y no hay versión de pago detrás. Si quieres llevar el seguimiento completo de tu cartera —con tu libro de operaciones, precios en vivo y el reparto exacto de cada aportación— eso es la app, y también es gratis.'
          : 'Because a calculator that asks for your email before giving you a number is not a calculator, it is a form. None of these tools store what you type or send it to a server, and there is no paid tier behind them. If you want full portfolio tracking — your transaction ledger, live prices and the exact split of every contribution — that is the app, and it is free too.'}
      </p>
      <!--
        ⚠️ Dos defectos en tres líneas, y los dos invisibles para el compilador.

        Era un `<button class="btn-primary">` y **`.btn-primary` no es una clase global**:
        está definida por separado dentro de diez componentes, y esta página la usaba sin
        declararla. Svelte aísla los estilos por componente, así que el botón se servía como
        texto plano sin ningún aviso en ninguna parte.

        Y llevaba a `/` teniendo escrito «ver la calculadora de rebalanceo». La calculadora
        es `/dashboard`; la portada es otra cosa. Ahora es un enlace de verdad y no un
        `goto()`, que además se puede abrir en otra pestaña y lo ve un rastreador.
      -->
      <a class="cta-app" href="/dashboard">
        {isEs ? 'Ver la calculadora de rebalanceo' : 'See the rebalancing calculator'}
      </a>
    </section>
  </main>

  <LandingFooter />
</div>

<style>
  .hub-page {
    position: relative;
    min-height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
    overflow-x: hidden;
  }

  .hub-container {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    /*
     * ⚠️ Eran 2rem —32 px— contra una barra de navegación **fija de 76 px de alto**, así
     * que lo primero de la página quedaba debajo de ella: la miga de pan se comía la marca
     * «CoreBalance» por arriba y el rótulo «Herramientas interactivas» por abajo. Quitar la
     * miga sin tocar esto solo habría movido el problema al rótulo, que pasaba a ser el
     * primer elemento. `/comparativas` tenía exactamente el mismo defecto; las páginas de
     * detalle no, porque ya empezaban a 130 px.
     */
    padding: 7.5rem 1.5rem 5rem;
  }

  /* Mismo aspecto que el botón principal de la landing, declarado aquí porque los
     estilos de Svelte no cruzan de un componente a otro. */
  .cta-app {
    display: inline-block;
    margin-top: 1.5rem;
    padding: 0.9rem 1.6rem;
    border-radius: 16px;
    background: var(--accent-blue);
    color: #fff;
    font-size: 1rem;
    font-weight: 700;
    text-decoration: none;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }
  .cta-app:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(37, 99, 235, 0.4);
  }

  .hub-header {
    max-width: 760px;
    margin-bottom: 3.5rem;
  }

  .category-badge {
    display: inline-block;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.25);
    color: var(--accent-blue);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 1.25rem;
  }

  h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
    margin: 0 0 1.5rem;
  }

  .hub-lead {
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--text-muted);
    margin: 0 0 1rem;
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.25rem;
    margin-bottom: 4rem;
  }

  .tool-card {
    display: flex;
    flex-direction: column;
    padding: 1.75rem;
    border-radius: 18px;
    background: var(--bg-card);
    border: 1px solid rgba(255, 255, 255, 0.07);
    text-decoration: none;
    color: inherit;
    transition:
      transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .tool-card:hover {
    transform: translateY(-4px);
    border-color: var(--card-accent);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  }

  .tool-badge {
    align-self: flex-start;
    padding: 0.25rem 0.6rem;
    border-radius: 8px;
    background: color-mix(in srgb, var(--card-accent) 12%, transparent);
    color: var(--card-accent);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 1rem;
  }

  .tool-name {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.4rem;
    letter-spacing: -0.01em;
  }

  .tool-question {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--card-accent);
    margin: 0 0 0.9rem;
  }

  .tool-body {
    font-size: 0.9rem;
    line-height: 1.65;
    color: var(--text-muted);
    margin: 0 0 1.5rem;
    flex-grow: 1;
  }

  .tool-cta {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--card-accent);
  }

  /* Las dos secciones nuevas no llevan tarjeta: son texto corrido, y encerrarlas en una
     caja de cristal más dentro de otra es el apilamiento que este proyecto ya corrigió en
     la pestaña de gráficos. La jerarquía la dan el ancho de línea y el aire. */
  .hub-steps,
  .hub-faq {
    max-width: 760px;
    margin: 3.5rem 0 0;
  }

  .hub-steps h2,
  .hub-faq h2 {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
    letter-spacing: -0.01em;
  }

  .steps-lead {
    margin: 0 0 1.75rem;
    color: var(--text-muted);
    line-height: 1.7;
  }

  .steps-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .step {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .step-n {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 1.85rem;
    height: 1.85rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .step-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0.15rem 0 0.4rem;
    color: var(--text-primary);
  }

  .step-body {
    margin: 0;
    line-height: 1.75;
    color: var(--text-muted);
  }

  .faq-list {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1.35rem;
  }

  .faq-q {
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.35rem;
  }

  .faq-a {
    margin: 0;
    line-height: 1.75;
    color: var(--text-muted);
  }

  .hub-note {
    max-width: 760px;
    margin-top: 3.5rem;
    padding: 2rem;
    border-radius: 18px;
    background: var(--bg-card);
    border: 1px solid rgba(255, 255, 255, 0.07);
  }

  .hub-note h2 {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0 0 1rem;
    letter-spacing: -0.01em;
  }

  .hub-note p {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--text-muted);
    margin: 0 0 1.5rem;
  }

  @media (max-width: 640px) {
    .hub-container {
      padding: 1.5rem 1rem 4rem;
    }

    .tool-card {
      padding: 1.5rem;
    }
  }
</style>
