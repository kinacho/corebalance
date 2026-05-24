# 💎 CoreBalance — Portfolio Dashboard & Rebalance

[![Svelte 5](https://img.shields.io/badge/Svelte-5_Runes-FF3E00?logo=svelte)](https://svelte.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-00a8cc?logo=pwa)](https://vite-pwa-org.netlify.app/)
[![Redis](https://img.shields.io/badge/Cache-Upstash_Redis-ED1C24?logo=redis)](https://upstash.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**CoreBalance** es una herramienta profesional de gestión de carteras de inversión diseñada bajo la filosofía *local-first* y escalada para el mundo real. Permite visualizar, analizar y rebalancear tu patrimonio con una estética premium, manteniendo el control total de tus datos y la máxima velocidad de respuesta.

![CoreBalance Preview](https://github.com/kinacho/Rebalanceador-90-5-5/raw/main/static/pwa-512x512.png)

## ✨ Características Principales

- **Visualización Avanzada**: Gráficos interactivos de tarta y evolución histórica (Chart.js) con leyendas persistentes y efectos de glassmorphism.
- **Motor de Rebalanceo**: Calculadora inteligente que optimiza tus nuevas aportaciones para mantener tu estrategia objetivo de forma automática.
- **Simulador de Crisis**: Módulo interactivo para proyectar caídas históricas reales sobre tu cartera actual y evaluar tu tolerancia al riesgo.
- **Privacidad Total**: Almacenamiento 100% local en tu navegador. Tus datos financieros nunca salen de tu dispositivo.
- **PWA (Progressive Web App)**: Instalación nativa en móvil y escritorio con soporte offline completo.

## 🛠️ Stack Tecnológico

- **Frontend**: [Svelte 5](https://svelte.dev/) (Runes) + Vite.
- **Almacenamiento Local**: [Dexie.js](https://dexie.org/) (IndexedDB).
- **Cache de Datos**: [Upstash Redis](https://upstash.com/) para una gestión de precios escalable y global.
- **Datos en Tiempo Real**: API híbrida (Yahoo Finance + Financial Times) con sistema de redundancia.

## 🛡️ Seguridad y Privacidad

CoreBalance está diseñado para ser seguro y transparente:

- **Local-First**: Todos los cálculos y el almacenamiento se realizan en el cliente (IndexedDB).
- **Sin Registro**: No necesitas crear una cuenta ni ceder tus datos para usar la herramienta.
- **Cache de Precios**: Optimización de peticiones API para servir cotizaciones en tiempo real sin comprometer la identidad del usuario.
- **Aviso Legal**: Integración de disclaimers financieros para cumplimiento normativo básico.

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

3. **Configuración de Entorno**:
   Renombra `.env.example` a `.env` y añade tus credenciales (si deseas usar el backend de precios):
   ```env
   # Redis (Recomendado para producción)
   KV_REST_API_URL=...
   KV_REST_API_TOKEN=...
   ```

4. **Entorno de Desarrollo**:
   ```bash
   npm run dev
   ```

---
*Desarrollado con ❤️ para la comunidad inversora por [kinacho](https://github.com/kinacho). **CoreBalance** es una herramienta informativa; no constituye asesoramiento financiero. Invierte siempre bajo tu propia responsabilidad.*
