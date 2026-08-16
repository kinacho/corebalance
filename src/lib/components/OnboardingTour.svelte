<script lang="ts">
  import { onMount } from "svelte";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { get } from 'svelte/store';
  import { LL } from '$lib/i18n/i18n-svelte';
  import type { TranslationFunctions } from '$lib/i18n/i18n-types';
  import { portfolio } from '$lib/stores/portfolio.svelte';

  /**
   * El tutorial son **dos recorridos distintos**, y cuál se lanza lo decide si
   * hay cartera o no.
   *
   * Antes había uno solo, de once pasos, y se lanzaba igual en los dos casos. El
   * problema es que el camino del usuario nuevo de verdad —«Empezar gratis» en
   * la landing— entra al dashboard **vacío**, así que el tutorial le explicaba
   * «monitoriza tu patrimonio con datos en tiempo real» sobre ceros, la
   * calculadora de aportación sobre un panel en blanco y el simulador de crisis
   * sobre nada. Encima dejaba «importar CSV» —lo único que necesita— en el paso
   * 11 de 11, cuando ya no queda atención.
   *
   * Ahora:
   *  - **cartera vacía** → tres pasos cuyo único objetivo es meter los datos;
   *  - **demo o con posiciones** → seis pasos por lo que de verdad hay que saber,
   *    incluido el panel fiscal, que es lo que nadie espera que exista.
   *
   * De rebote, relanzar el tutorial desde el pie de página después de añadir
   * activos da el recorrido completo, que es justo lo que uno querría.
   */
  function emitTourStep(target: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tour-step', { detail: { target } }));
    }
  }

  /**
   * ⚠️ **Preparar el destino ANTES de que driver.js lo mida, no a la vez.**
   *
   * El defecto que esto arregla es el que se veía como «el tutorial no viaja a donde
   * debe». Los pasos avisaban al panel con `onHighlightStarted`, que se ejecuta
   * **mientras** driver.js calcula el recuadro: Svelte todavía no ha aplicado el
   * cambio de estado, así que se medía el elemento anterior —o uno con caja cero, o
   * uno que aún no existía— y el globo acababa señalando a nada. Medido paso a paso
   * en el navegador, fallaban cuatro paradas de las seis:
   *
   * - `#tour-maps` en escritorio: **0×0**, porque los mapas nacen plegados y plegado
   *   es `display: none`.
   * - `#tour-maps` en móvil: existía, pero en **y=1093**, fuera de la pantalla.
   * - `#tour-import-csv`: driver.js no lo encontraba y caía a su elemento de relleno,
   *   porque el panel de gestión se abre en el mismo tick.
   * - `#tour-manage-btn` en demo: **no existe** —`Header.svelte` lo esconde con
   *   `{#if !portfolio.isDemo}`—, así que el último paso del recorrido de demo
   *   señalaba al vacío.
   *
   * Ahora se avisa al panel, se **espera a que el elemento tenga caja de verdad**, y
   * solo entonces se avanza. El sondeo es por fotograma y acotado: si algo no llega,
   * el paso sigue adelante en vez de dejar el tutorial colgado.
   */
  async function prepararDestino(paso: { element?: string; prepara?: string[] } | undefined) {
    if (!paso) return;
    for (const target of paso.prepara ?? []) emitTourStep(target);
    if (!paso.element) return;

    const limite = performance.now() + 900;
    while (performance.now() < limite) {
      const el = document.querySelector(paso.element);
      if (el && el.getBoundingClientRect().height > 0) return;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
  }

  /** Pasos para una cartera vacía: el trabajo es tener datos dentro. */
  function startupSteps(t: TranslationFunctions) {
    return [
      {
        // Sin `element` a propósito: driver.js lo muestra centrado como modal.
        // Antes esto apuntaba a `#tour-welcome`, un id que no existe en el
        // proyecto, así que acababa centrado igual pero por accidente.
        popover: {
          title: t.tour.steps.start_welcome.title(),
          description: t.tour.steps.start_welcome.description()
        }
      },
      {
        element: '#tour-manage-btn',
        popover: {
          title: t.tour.steps.start_manage.title(),
          description: t.tour.steps.start_manage.description(),
          side: "bottom" as const,
          align: 'end' as const
        }
      },
      {
        element: '#tour-import-csv',
        prepara: ['manage'],
        popover: {
          title: t.tour.steps.start_import.title(),
          description: t.tour.steps.start_import.description(),
          side: "top" as const,
          align: 'center' as const
        }
      }
    ];
  }

  /** Recorrido completo: solo tiene sentido cuando los paneles tienen cifras. */
  function fullSteps(t: TranslationFunctions) {
    return [
      {
        element: '#tour-global-summary',
        prepara: ['assets'],
        popover: {
          title: t.tour.steps.summary.title(),
          description: t.tour.steps.summary.description(),
          side: "bottom" as const,
          align: 'center' as const
        }
      },
      {
        element: '#tour-portfolio-categories',
        prepara: ['assets'],
        popover: {
          title: t.tour.steps.categories.title(),
          description: t.tour.steps.categories.description(),
          side: "top" as const,
          align: 'center' as const
        }
      },
      {
        element: '#tour-rebalance',
        // `abrir-rebalance` despliega el panel: resaltar una cabecera plegada de 86 px
        // mientras el globo habla de «cuánto comprar este mes» enseña justo lo que no
        // se está explicando. Lo escucha el propio panel, que es quien tiene el estado.
        prepara: ['rebalance', 'abrir-rebalance'],
        popover: {
          title: t.tour.steps.rebalance.title(),
          description: t.tour.steps.rebalance.description(),
          side: "top" as const,
          align: 'center' as const
        }
      },
      {
        element: '#tour-tax',
        prepara: ['rebalance', 'abrir-tax'],
        popover: {
          title: t.tour.steps.tax.title(),
          description: t.tour.steps.tax.description(),
          side: "top" as const,
          align: 'center' as const
        }
      },
      {
        element: '#tour-maps',
        // ⚠️ `abrir-mapas` es imprescindible en escritorio: los mapas nacen plegados y
        // plegado es `display: none`, así que sin esto el paso medía una caja de 0×0.
        prepara: ['charts', 'abrir-mapas'],
        popover: {
          title: t.tour.steps.maps.title(),
          description: t.tour.steps.maps.description(),
          side: "top" as const,
          align: 'center' as const
        }
      },
      /**
       * ⚠️ **El último paso depende de si esto es una demo, porque el botón que
       * señalaba no existe ahí.** `Header.svelte` esconde `#tour-manage-btn` con
       * `{#if !portfolio.isDemo}`, así que el recorrido de la cartera de ejemplo
       * —que es el que ve cualquiera que entre por «Probar demo»— acababa señalando
       * al vacío. Y no es cuestión de buscarle otro ancla: a quien está en la demo no
       * le sirve «cuando quieras cambiar algo», porque no puede cambiar nada hasta
       * salir. Se le enseña la salida, que es su siguiente paso de verdad.
       */
      portfolio.isDemo
        ? {
            element: '#tour-demo-exit',
            popover: {
              title: t.tour.steps.demo_exit.title(),
              description: t.tour.steps.demo_exit.description(),
              side: "bottom" as const,
              align: 'center' as const
            }
          }
        : {
            element: '#tour-manage-btn',
            popover: {
              title: t.tour.steps.manage.title(),
              description: t.tour.steps.manage.description(),
              side: "bottom" as const,
              align: 'end' as const
            }
          }
    ];
  }

  export async function startTour() {
    const t = get(LL);
    const hasPortfolio = portfolio.hasAnyHoldings;
    const pasos = hasPortfolio ? fullSteps(t) : startupSteps(t);

    const driverObj = driver({
      showProgress: true,
      nextBtnText: t.tour.btn_next(),
      prevBtnText: t.tour.btn_prev(),
      doneBtnText: hasPortfolio ? t.tour.btn_done() : t.tour.btn_done_startup(),
      popoverClass: 'corebalance-tour-theme',
      /**
       * Se intercepta el avance para preparar el destino **antes** de moverse.
       * `onHighlightStarted` no vale para esto: corre cuando driver.js ya está
       * midiendo. Ver el docblock de `prepararDestino`.
       */
      onNextClick: async () => {
        await prepararDestino(pasos[(driverObj.getActiveIndex() ?? 0) + 1]);
        driverObj.moveNext();
      },
      onPrevClick: async () => {
        await prepararDestino(pasos[(driverObj.getActiveIndex() ?? 0) - 1]);
        driverObj.movePrevious();
      },
      onDestroyed: () => {
        emitTourStep('close-all');
        // El flag se quema **al cerrar**, no al abrir. Antes se escribía justo
        // después de `drive()`, así que una recarga a mitad de recorrido —o un
        // cierre accidental en el primer paso— lo dejaba visto para siempre.
        try {
          localStorage.setItem('corebalance_tour_seen', 'true');
        } catch {
          // Modo privado del navegador; no vale la pena romper por esto.
        }
      },
      steps: pasos
    });

    // El primer paso también necesita su preparación: en el recorrido completo abre
    // la pestaña de activos, y sin eso en móvil la primera parada mide lo que hubiera.
    await prepararDestino(pasos[0]);
    driverObj.drive();
  }


  onMount(() => {
    // Solo iniciar automáticamente la primera vez
    if (localStorage.getItem('corebalance_tour_seen')) return;

    // El retraso deja que la app acabe de cargar, pero abre una ventana peligrosa: un
    // visitante que entra directo a /dashboard sin cartera es devuelto a la landing en
    // ese intervalo, y driver.js monta su overlay en `document.body`, fuera del árbol
    // de Svelte. Sin la guarda de abajo el tutorial se abría sobre la landing.
    const timer = setTimeout(() => {
      if (!window.location.pathname.startsWith('/dashboard')) return;
      // El flag lo escribe `onDestroyed`, no esta línea: así una recarga a mitad
      // de recorrido no cuenta como visto.
      startTour();
    }, 1000);

    return () => clearTimeout(timer);
  });
</script>

<style>
  /* Personalización Premium para Driver.js */
  :global(.corebalance-tour-theme) {
    background: var(--bg-overlay) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: 16px !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset !important;
    color: var(--text-primary) !important;
    font-family: inherit !important;
    padding: 20px !important;
    max-width: 320px !important;
  }

  :global(.corebalance-tour-theme .driver-popover-title) {
    font-size: 1.15rem !important;
    font-weight: 800 !important;
    color: var(--text-primary) !important;
    margin-bottom: 8px !important;
  }

  :global(.corebalance-tour-theme .driver-popover-description) {
    font-size: 0.9rem !important;
    color: var(--text-muted) !important;
    line-height: 1.5 !important;
  }

  :global(.corebalance-tour-theme .driver-popover-footer) {
    margin-top: 16px !important;
  }

  :global(.corebalance-tour-theme .driver-popover-progress-text) {
    color: var(--text-faint) !important;
    font-size: 0.8rem !important;
    font-weight: 600 !important;
  }

  :global(.corebalance-tour-theme .driver-popover-prev-btn),
  :global(.corebalance-tour-theme .driver-popover-next-btn) {
    background: rgba(255, 255, 255, 0.1) !important;
    border: none !important;
    color: var(--text-primary) !important;
    border-radius: 8px !important;
    padding: 8px 12px !important;
    font-size: 0.85rem !important;
    font-weight: 600 !important;
    text-shadow: none !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
  }

  /*
   * ⚠️ **`--text-on-accent`, no `--text-primary`, y este botón es el ejemplo de por
   * qué la distinción existe.**
   *
   * El color lo pone la regla de arriba (compartida con «Anterior») y el fondo lo
   * pone ésta, así que las dos declaraciones viven en **bloques distintos** — que
   * es justo lo que hizo que el barrido automático no lo viera: mira el fondo de la
   * misma regla. En tema claro `--text-primary` es `#111118`, así que salía **texto
   * negro sobre azul**.
   */
  :global(.corebalance-tour-theme .driver-popover-next-btn) {
    background: var(--accent-blue) !important;
    color: var(--text-on-accent) !important;
  }

  :global(.corebalance-tour-theme .driver-popover-next-btn:hover) {
    background: var(--accent-blue) !important;
    transform: translateY(-1px) !important;
  }

  :global(.corebalance-tour-theme .driver-popover-prev-btn:hover) {
    background: rgba(255, 255, 255, 0.15) !important;
  }
  
  /* La flecha es la esquina del propio panel, así que lleva su mismo fondo. */
  :global(.corebalance-tour-theme .driver-popover-arrow) {
    border-color: var(--bg-overlay) !important;
  }

  /* Responsive Mobile Tweak */
  @media (max-width: 600px) {
    :global(.corebalance-tour-theme) {
      max-width: 90vw !important;
      padding: 16px !important;
    }
    
    :global(.corebalance-tour-theme .driver-popover-title) {
      font-size: 1.05rem !important;
    }
    
    :global(.corebalance-tour-theme .driver-popover-description) {
      font-size: 0.85rem !important;
    }
  }
</style>

