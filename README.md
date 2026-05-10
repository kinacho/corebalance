# ⚖️ CoreBalance Portfolio Dashboard

Dashboard profesional, premium y responsivo (PWA) para el seguimiento, rebalanceo y control histórico de carteras de inversión complejas. **Privado por defecto y local-first.**

## 🚀 Características Principales

- **Privacidad Total (Local-First)**: Tus datos no se envían a ningún servidor por defecto. Se almacenan de forma segura en tu propio navegador usando IndexedDB.
- **Sincronización P2P por QR**: Sincroniza tus datos entre el PC y el móvil de forma directa y encriptada (Peer-to-Peer) escaneando un código QR. Sin necesidad de cuentas ni nubes.
- **Backups Manuales**: Exporta e importa tu configuración y datos históricos en archivos JSON con un solo clic.
- **Diseño Premium & Glassmorphism**: Interfaz moderna, elegante y fluida con transiciones suaves, diseño adaptativo (mobile-first a large-desktop) y secciones plegables inteligentes.
- **Progressive Web App (PWA)**: Instalable como una aplicación nativa en iOS y Android, con soporte offline y funcionamiento a pantalla completa.
- **Soporte Multi-Cartera & Multi-Divisa**: 
  - Gestión de activos en **EUR, USD y CAD** con tipos de cambio en tiempo real.
  - Seguimiento de ETFs, Acciones y Cripto (BTC/ETH).
- **Métricas Avanzadas**: 
  - Cotizaciones en tiempo real via API.
  - Cálculo de YTD (Year-To-Date) automático.
  - Gráficos interactivos de distribución y evolución histórica del patrimonio.
- **Motor de Rebalanceo**: Calculadora inteligente que optimiza tus nuevas aportaciones para mantener tu estrategia objetivo.

## 🛠️ Stack Tecnológico

- **Framework**: [SvelteKit](https://svelte.dev/) (Svelte 5 con Runes)
- **Base de Datos Local**: [Dexie.js](https://dexie.org/) (IndexedDB)
- **Comunicación P2P**: [PeerJS](https://peerjs.com/) (WebRTC)
- **Gráficos**: [Chart.js](https://www.chartjs.org/)
- **API de Mercados**: Yahoo Finance

## 📦 Instalación y Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/kinacho/Rebalanceador-90-5-5.git
   cd CoreBalance
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Variables de Entorno (Opcional)**:
   CoreBalance funciona de forma local sin configuración. Si deseas habilitar la persistencia opcional en la nube con Firebase, renombra `.env.example` a `.env` y configura tus credenciales:
   ```env
   PUBLIC_USE_FIREBASE=false  # Cambia a true para usar Firebase
   VITE_FIREBASE_API_KEY="..."
   # ... otras variables de Firebase
   ```

4. **Entorno de Desarrollo**:
   ```bash
   npm run dev
   ```

## 🔄 Cómo sincronizar dispositivos

1. En tu ordenador, pulsa el icono de **Sincronización** (Monitor + Móvil) en la cabecera.
2. Ve a la pestaña **Código QR**.
3. Abre la cámara de tu móvil y escanea el código generado.
4. El móvil se conectará directamente a tu ordenador y descargará tus datos de forma segura.

## 🛡️ Seguridad y Privacidad

- **Modo Privado**: Oculta los valores de tu cartera con un clic para poder usar la app en lugares públicos.
- **Bloqueo Biométrico**: (Opcional) Activa el acceso mediante FaceID o Huella dactilar si tu dispositivo lo soporta.
- **Cero Rastreadores**: No hay analíticas ni telemetría. Tus datos son tuyos.

---
*Desarrollado para uso personal. Este software no proporciona asesoramiento financiero. Úsalo bajo tu propia responsabilidad.*
