<script lang="ts">
  import { onMount } from "svelte";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  
  export function startTour() {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Siguiente ➔',
      prevBtnText: '⬅ Anterior',
      doneBtnText: '¡Empezar!',
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
            title: '¡Bienvenido a CoreBalance! 🚀',
            description: 'Tu centro de mando para una inversión inteligente. Vamos a mostrarte cómo optimizar tu cartera en menos de 1 minuto.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '#tour-sync-auth',
          popover: {
            title: 'Sincronización Total',
            description: 'Mantén tus datos seguros y sincronizados entre dispositivos mediante Google Auth o exportación local cifrada.',
            side: "bottom",
            align: 'end'
          }
        },
        {
          element: '#tour-global-summary',
          popover: {
            title: 'Visión de Alto Nivel',
            description: 'Monitoriza tu Patrimonio Neto, Capital Invertido y Rentabilidad Total de un vistazo con datos actualizados en tiempo real.',
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
            title: 'Estrategia Multicartera 🏦',
            description: 'Gestiona tu estrategia Core (90%), Satélite (5%) y Efectivo (5%) de forma independiente pero integrada.',
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
            title: 'Inyección Óptima de Capital ✨',
            description: 'Nuestra calculadora matemática te indica exactamente qué activos comprar para restaurar tus pesos ideales, minimizando las desviaciones.',
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
            title: 'Proyecciones de Interés Compuesto',
            description: 'Simula el crecimiento de tu riqueza a largo plazo. Ahora puedes elegir entre usar tu capital real o uno personalizado para ver diferentes escenarios.',
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
            title: 'Simulador de Crisis Históricas 📉',
            description: 'Pon a prueba tu temple financiero. Analiza cómo se comportaría tu cartera en crisis reales como el 2008 o el COVID-19 y el impacto del DCA.',
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
            title: 'Configuración de Cartera',
            description: 'Ajusta tus objetivos con precisión decimal. Usa los candados para fijar activos y deja que el algoritmo autocompense el resto automáticamente.',
            side: "bottom",
            align: 'end'
          }
        },
        {
          element: '#tour-add-asset',
          popover: {
            title: 'Personaliza tus Activos',
            description: 'Añade fondos, ETFs o acciones. Puedes arrastrarlos para moverlos entre categorías (Core, Satélite o Acciones).',
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
            title: 'Libro de Transacciones (Ledger)',
            description: 'Activa el modo Ledger para llevar un registro real de tus compras y ventas. Calcularemos tu coste medio y plusvalías automáticamente.',
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
            title: 'Importación Inteligente 📥',
            description: 'No metas los datos a mano. Sube tus extractos de DEGIRO, MyInvestor o Trading 212 y nosotros haremos el trabajo sucio.',
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
    const hasSeenTour = localStorage.getItem('corebalance_tour_seen');
    if (!hasSeenTour) {
      setTimeout(() => {
        startTour();
        localStorage.setItem('corebalance_tour_seen', 'true');
      }, 1000); // Pequeño retraso para que la app cargue
    }
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

