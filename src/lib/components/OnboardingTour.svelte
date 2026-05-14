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
      steps: [
        {
          element: '#tour-welcome',
          popover: {
            title: '¡Bienvenido a CoreBalance! 🚀',
            description: 'Tu nuevo centro de mandos financiero. Vamos a dar un paseo rápido de 1 minuto para que saques el máximo partido a la herramienta.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '#tour-sync-auth',
          popover: {
            title: 'Tus datos, siempre contigo',
            description: 'Sincroniza tus dispositivos escaneando un QR o inicia sesión con Google para guardar tu cartera en la nube de forma segura.',
            side: "bottom",
            align: 'end'
          }
        },
        {
          element: '#tour-global-summary',
          popover: {
            title: 'Visión Global',
            description: 'Aquí verás el valor total de tu patrimonio, cuánto has aportado históricamente y el beneficio neto. Simple y directo.',
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
          element: '#tour-rebalance',
          popover: {
            title: 'La Calculadora Mágica ✨',
            description: 'Dinos cuánto dinero nuevo quieres invertir. CoreBalance calculará matemáticamente qué activos comprar para mantener tu cartera perfectamente equilibrada.',
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
            title: 'Simulador de Crisis 📉',
            description: 'Descubre qué pasaría con tu cartera si el mercado se desploma. Ajusta la caída y mira cómo tus aportaciones regulares (DCA) pueden salvarte y acelerar la recuperación.',
            side: "top",
            align: 'center'
          },
          onHighlightStarted: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'rebalance' } }));
              // Asegurarnos de que el panel se ve abriéndolo si no está abierto. El usuario puede verlo.
            }
          }
        },

        {
          element: '#tour-manage-btn',
          popover: {
            title: 'A tu medida',
            description: 'Añade tus propios fondos, ETFs o acciones, cambia los porcentajes objetivo y crea tu propia estrategia financiera.',
            side: "bottom",
            align: 'end'
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

