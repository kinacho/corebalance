<script lang="ts">
  import { onMount } from "svelte";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { get } from 'svelte/store';
  import { LL } from '$lib/i18n/i18n-svelte';
  
  export function startTour() {
    const t = get(LL);
    const driverObj = driver({
      showProgress: true,
      nextBtnText: t.tour.btn_next(),
      prevBtnText: t.tour.btn_prev(),
      doneBtnText: t.tour.btn_done(),
      popoverClass: 'corebalance-tour-theme',
      onDestroyed: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'close-all' } }));
        }
      },
      steps: [
        {
          element: '#tour-welcome',
          popover: {
            title: t.tour.steps.welcome.title(),
            description: t.tour.steps.welcome.description(),
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '#tour-sync-auth',
          popover: {
            title: t.tour.steps.sync.title(),
            description: t.tour.steps.sync.description(),
            side: "bottom",
            align: 'end'
          }
        },
        {
          element: '#tour-global-summary',
          popover: {
            title: t.tour.steps.summary.title(),
            description: t.tour.steps.summary.description(),
            side: "bottom",
            align: 'center'
          },
          onHighlightStarted: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'assets' } }));
            }
          }
        },
        {
          element: '#tour-portfolio-categories',
          popover: {
            title: t.tour.steps.categories.title(),
            description: t.tour.steps.categories.description(),
            side: "top",
            align: 'center'
          },
          onHighlightStarted: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'assets' } }));
            }
          }
        },
        {
          element: '#tour-rebalance',
          popover: {
            title: t.tour.steps.rebalance.title(),
            description: t.tour.steps.rebalance.description(),
            side: "top",
            align: 'center'
          },
          onHighlightStarted: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'rebalance' } }));
            }
          }
        },
        {
          element: '#tour-projections',
          popover: {
            title: t.tour.steps.projections.title(),
            description: t.tour.steps.projections.description(),
            side: "top",
            align: 'center'
          },
          onHighlightStarted: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'rebalance' } }));
            }
          }
        },
        {
          element: '#tour-crisis',
          popover: {
            title: t.tour.steps.crisis.title(),
            description: t.tour.steps.crisis.description(),
            side: "top",
            align: 'center'
          },
          onHighlightStarted: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'rebalance' } }));
            }
          }
        },
        {
          element: '#tour-manage-btn',
          popover: {
            title: t.tour.steps.manage_btn.title(),
            description: t.tour.steps.manage_btn.description(),
            side: "bottom",
            align: 'end'
          }
        },
        {
          element: '#tour-add-asset',
          popover: {
            title: t.tour.steps.add_asset.title(),
            description: t.tour.steps.add_asset.description(),
            side: "top",
            align: 'center'
          },
          onHighlightStarted: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'manage' } }));
            }
          }
        },
        {
          element: '#tour-ledger',
          popover: {
            title: t.tour.steps.ledger.title(),
            description: t.tour.steps.ledger.description(),
            side: "bottom",
            align: 'center'
          },
          onHighlightStarted: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'manage' } }));
            }
          }
        },
        {
          element: '#tour-import-csv',
          popover: {
            title: t.tour.steps.import_csv.title(),
            description: t.tour.steps.import_csv.description(),
            side: "top",
            align: 'center'
          },
          onHighlightStarted: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'manage' } }));
            }
          }
        }
      ]
    });
    
    driverObj.drive();
  }

  onMount(() => {
    // Solo iniciar automáticamente la primera vez
    if (localStorage.getItem('corebalance_tour_seen')) return;

    // El retraso deja que la app acabe de cargar, pero abre una ventana peligrosa: un
    // visitante que entra directo a /dashboard sin cartera es devuelto a la landing en
    // ese intervalo, y driver.js monta su overlay en `document.body`, fuera del árbol
    // de Svelte. Sin las dos guardas de abajo el tutorial se abría sobre la landing y
    // además quemaba el flag, así que ya no volvía a salir en el dashboard de verdad.
    const timer = setTimeout(() => {
      if (!window.location.pathname.startsWith('/dashboard')) return;
      startTour();
      localStorage.setItem('corebalance_tour_seen', 'true');
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

