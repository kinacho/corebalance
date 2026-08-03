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
        popover: {
          title: t.tour.steps.start_import.title(),
          description: t.tour.steps.start_import.description(),
          side: "top" as const,
          align: 'center' as const
        },
        onHighlightStarted: () => emitTourStep('manage')
      }
    ];
  }

  /** Recorrido completo: solo tiene sentido cuando los paneles tienen cifras. */
  function fullSteps(t: TranslationFunctions) {
    return [
      {
        element: '#tour-global-summary',
        popover: {
          title: t.tour.steps.summary.title(),
          description: t.tour.steps.summary.description(),
          side: "bottom" as const,
          align: 'center' as const
        },
        onHighlightStarted: () => emitTourStep('assets')
      },
      {
        element: '#tour-portfolio-categories',
        popover: {
          title: t.tour.steps.categories.title(),
          description: t.tour.steps.categories.description(),
          side: "top" as const,
          align: 'center' as const
        },
        onHighlightStarted: () => emitTourStep('assets')
      },
      {
        element: '#tour-rebalance',
        popover: {
          title: t.tour.steps.rebalance.title(),
          description: t.tour.steps.rebalance.description(),
          side: "top" as const,
          align: 'center' as const
        },
        onHighlightStarted: () => emitTourStep('rebalance')
      },
      {
        element: '#tour-tax',
        popover: {
          title: t.tour.steps.tax.title(),
          description: t.tour.steps.tax.description(),
          side: "top" as const,
          align: 'center' as const
        },
        onHighlightStarted: () => emitTourStep('rebalance')
      },
      {
        element: '#tour-maps',
        popover: {
          title: t.tour.steps.maps.title(),
          description: t.tour.steps.maps.description(),
          side: "top" as const,
          align: 'center' as const
        },
        onHighlightStarted: () => emitTourStep('charts')
      },
      {
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

  export function startTour() {
    const t = get(LL);
    const hasPortfolio = portfolio.hasAnyHoldings;

    const driverObj = driver({
      showProgress: true,
      nextBtnText: t.tour.btn_next(),
      prevBtnText: t.tour.btn_prev(),
      doneBtnText: hasPortfolio ? t.tour.btn_done() : t.tour.btn_done_startup(),
      popoverClass: 'corebalance-tour-theme',
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
      steps: hasPortfolio ? fullSteps(t) : startupSteps(t)
    });

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
    background: rgba(15, 23, 42, 0.95) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 16px !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset !important;
    color: #f1f5f9 !important;
    font-family: inherit !important;
    padding: 20px !important;
    max-width: 320px !important;
  }

  :global(.corebalance-tour-theme .driver-popover-title) {
    font-size: 1.15rem !important;
    font-weight: 800 !important;
    color: #fff !important;
    margin-bottom: 8px !important;
  }

  :global(.corebalance-tour-theme .driver-popover-description) {
    font-size: 0.9rem !important;
    color: #94a3b8 !important;
    line-height: 1.5 !important;
  }

  :global(.corebalance-tour-theme .driver-popover-footer) {
    margin-top: 16px !important;
  }

  :global(.corebalance-tour-theme .driver-popover-progress-text) {
    color: #64748b !important;
    font-size: 0.8rem !important;
    font-weight: 600 !important;
  }

  :global(.corebalance-tour-theme .driver-popover-prev-btn),
  :global(.corebalance-tour-theme .driver-popover-next-btn) {
    background: rgba(255, 255, 255, 0.1) !important;
    border: none !important;
    color: #fff !important;
    border-radius: 8px !important;
    padding: 8px 12px !important;
    font-size: 0.85rem !important;
    font-weight: 600 !important;
    text-shadow: none !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
  }

  :global(.corebalance-tour-theme .driver-popover-next-btn) {
    background: #3b82f6 !important;
  }

  :global(.corebalance-tour-theme .driver-popover-next-btn:hover) {
    background: #2563eb !important;
    transform: translateY(-1px) !important;
  }

  :global(.corebalance-tour-theme .driver-popover-prev-btn:hover) {
    background: rgba(255, 255, 255, 0.15) !important;
  }
  
  :global(.corebalance-tour-theme .driver-popover-arrow) {
    border-color: rgba(15, 23, 42, 0.95) !important;
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

