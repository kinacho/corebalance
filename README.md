# ⚖️ Balanceador Portfolio Dashboard

Dashboard profesional, premium y responsivo (PWA) para el seguimiento, rebalanceo y control histórico de carteras de inversión complejas.

## 🚀 Características Principales

- **Diseño Premium & Glassmorphism**: Interfaz moderna, elegante y fluida con transiciones suaves, diseño adaptativo (mobile-first a large-desktop) y secciones plegables inteligentes.
- **Soporte Multi-Cartera**: 
  - **Cartera Principal**: Estrategia 90/5/5 optimizada (MSCI World, Emergentes y Bitcoin ETP).
  - **Acciones Individuales**: Soporte para stock picking (ej. *AtlasClear Holdings*, *Quantum eMotion*).
  - **Cartera Conservadora**: Espacio para activos satélite o de renta fija.
- **Seguimiento en Tiempo Real**: Cotizaciones exactas y automáticas a través de una API propia conectada a Yahoo Finance.
- **Inteligencia Multi-Divisa**: Gestión nativa de **Euros (EUR)**, **Dólares (USD)** y **Dólares Canadienses (CAD)**. El sistema mantiene los precios nominales para referencia de mercado, pero unifica el capital global y los cálculos de rentabilidad a la moneda base (Euros) con tipos de cambio reales.
- **Gráficos Avanzados**:
  - Gráfico *Donut* para distribución actual vs objetivo.
  - Gráfico lineal interactivo de la evolución histórica del patrimonio.
- **Sincronización Cloud Segura**: Autenticación nativa con Google y almacenamiento persistente del histórico y configuración en Firebase Firestore.
- **Privacidad Total**: Modo "Blur" (ocultación de valores sensibles con un clic) y bloqueo de acceso mediante *whitelist* de email.
- **Motor de Rebalanceo**: Calculadora inteligente que indica exactamente cuánto y dónde invertir nuevas aportaciones para volver a cuadrar la estrategia según pesos objetivos.

## 🛠️ Stack Tecnológico

- **Framework**: [SvelteKit](https://svelte.dev/) (Runes / Svelte 5)
- **Lenguaje**: TypeScript
- **Estilos**: Vanilla CSS con variables avanzadas (CSS Modules approach)
- **Gráficos**: [Chart.js](https://www.chartjs.org/)
- **Backend/API**: Endpoints en SvelteKit usando `yahoo-finance2`
- **BaaS**: [Firebase](https://firebase.google.com/) (Auth, Firestore)

## 📦 Instalación y Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone <tu-repositorio>
   cd Balanceador
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Variables de Entorno**:
   Crea un archivo `.env` en la raíz basado en `.env.example`.
   ```env
   VITE_FIREBASE_API_KEY="tu-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="tu-domain"
   VITE_FIREBASE_PROJECT_ID="tu-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="tu-bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="tu-sender-id"
   VITE_FIREBASE_APP_ID="tu-app-id"
   VITE_AUTHORIZED_EMAIL="tu-email@gmail.com" # CRÍTICO para seguridad
   ```

4. **Entorno de Desarrollo**:
   ```bash
   npm run dev
   ```

5. **Producción (Vercel)**:
   El proyecto está optimizado para su despliegue directo en Vercel. Asegúrate de configurar las mismas variables de entorno en la sección *Settings > Environment Variables* del panel de Vercel.

## 🏗️ Arquitectura del Código

El proyecto ha sido recientemente refactorizado siguiendo los principios DRY:
- `src/routes/+page.svelte`: Controlador principal y esqueleto de la UI.
- `src/lib/components/`: Componentes modulares (`HeroSummary`, `PortfolioSection`, `AssetCard`, etc.).
- `src/lib/stores/portfolio.svelte.ts`: Estado global manejado con las nuevas runas de Svelte 5, orquestando el modelo de negocio, cálculos derivados y persistencia.
- `src/lib/constants.ts`: Configuración declarativa de los activos y sus pesos objetivos.

## 🛡️ Seguridad

El acceso a la app está restringido por partida doble:
1. **Frontend**: El cliente verifica que el email autenticado con Google coincide con `VITE_AUTHORIZED_EMAIL`.
2. **Backend (Firestore)**: Reglas de seguridad que impiden cualquier lectura/escritura a menos que el `request.auth.token.email` coincida con el autorizado.

---
*Desarrollado para uso personal. Este software no proporciona asesoramiento financiero. Úsalo bajo tu propia responsabilidad.*
