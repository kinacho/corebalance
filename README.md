# 💎 CoreBalance — Portfolio Dashboard & Rebalance

[![Svelte 5](https://img.shields.io/badge/Svelte-5_Runes-FF3E00?logo=svelte)](https://svelte.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-00a8cc?logo=pwa)](https://vite-pwa-org.netlify.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**CoreBalance** es una herramienta avanzada de gestión de carteras de inversión diseñada bajo la filosofía *local-first*. Permite visualizar, analizar y rebalancear tu patrimonio con una estética de terminal financiera premium, manteniendo el control total de tus datos.

![CoreBalance Preview](https://github.com/kinacho/Rebalanceador-90-5-5/raw/main/static/pwa-512x512.png)

## ✨ Características Principales

- **Visualización Avanzada**: Gráficos interactivos de tarta y evolución histórica (Chart.js) con leyendas persistentes.
- **Modo Rendimiento vs Valor**: Alterna instantáneamente entre ver tu evolución en euros o en porcentaje de rentabilidad.
- **Motor de Rebalanceo**: Calculadora inteligente que optimiza tus nuevas aportaciones para mantener tu estrategia objetivo.
- **Privacidad "On-the-fly"**: Oculta todos los valores monetarios con un solo clic para entornos públicos.
- **Sincronización P2P por QR**: Transfiere toda tu cartera entre dispositivos sin pasar por ningún servidor, mediante compresión nativa (Deflate).
- **PWA (Progressive Web App)**: Instálalo en tu escritorio o móvil como una aplicación nativa, con soporte offline.

## 🛠️ Stack Tecnológico

- **Frontend**: [Svelte 5](https://svelte.dev/) (Runes) + Vite.
- **Almacenamiento Local**: [Dexie.js](https://dexie.org/) (IndexedDB) para una persistencia robusta en el navegador.
- **Persistencia en la Nube (Opcional)**: Integración lista para [Firebase](https://firebase.google.com/) (Auth + Firestore).
- **Gráficos**: [Chart.js](https://www.chartjs.org/) con configuraciones personalizadas de glassmorphism.
- **Datos en Tiempo Real**: API híbrida (Yahoo Finance + Financial Times Scraping) para máxima fiabilidad.

## 🛡️ Seguridad y Robustez (Producción Ready)

Tras una auditoría exhaustiva, CoreBalance incorpora:

- **Rate Limiting**: Endpoints de API protegidos contra abusos mediante limitación de peticiones por IP.
- **Validación Estricta**: Sanitización de tickers y validación de esquemas JSON/QR antes de cualquier importación.
- **Aislamiento de Memoria**: Sistema de gestión de caché con límites automáticos para prevenir fugas de recursos.
- **Arquitectura Local-First**: Tus datos financieros viven en tu dispositivo. Solo viajan a la nube si habilitas explícitamente Firebase.

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

3. **Configuración (Opcional)**:
   CoreBalance funciona de forma local por defecto. Si deseas habilitar la persistencia en Firebase, renombra `.env.example` a `.env` y activa:
   ```env
   PUBLIC_USE_FIREBASE=true
   ```

4. **Entorno de Desarrollo**:
   ```bash
   npm run dev
   ```

## 🔄 Sincronización sin Servidores

1. En el dispositivo de origen, pulsa el icono de **Sincronización** en la cabecera.
2. Selecciona la pestaña **Código QR (P2P)**.
3. Escanea el código con tu móvil: el sistema detectará el hash comprimido e importará los datos al instante.

---
*Desarrollado con ❤️ para inversores inconformistas. Este software no proporciona asesoramiento financiero. Úsalo bajo tu propia responsabilidad.*
