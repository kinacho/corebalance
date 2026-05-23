# Roadmap de SEO & Visibilidad - CoreBalance

Este documento detalla la estrategia de SEO y visibilidad para posicionar **CoreBalance** como la herramienta de referencia para inversores en fondos indexados y ETFs.

## Resumen Ejecutivo
- **Objetivo:** Atraer tráfico orgánico cualificado (inversores) y posicionar la marca en comunidades de finanzas.
- **Fases:** 5 fases incrementales.
- **Presupuesto:** 0€ (basado en herramientas gratuitas y ejecución propia).
- **Tiempo estimado para resultados:** ~9 meses.

---

## 🎯 Keywords Objetivo (Español)

| Keyword | Volumen Estimado | Intención |
| :--- | :--- | :--- |
| **rebalanceo cartera ETF** | Medio | Transaccional/Herramienta |
| **calculadora rebalanceo fondos** | Medio | Transaccional/Herramienta |
| **solapamiento ETF MSCI World** | Medio | Informacional |
| **comparar ETF S&P500 MSCI World** | Alto | Informacional/Comparativa |
| **cartera indexada MyInvestor** | Medio | Específica de plataforma |
| **gestión cartera inversión app** | Alto | Comercial |
| **portfolio tracker ETF gratis** | Alto | Comercial/Herramienta |
| **estrategia 3 fondos indexados** | Medio | Informacional |
| **alternativa Portfolio Performance** | Bajo | Comparativa/Competencia |
| **TER fondos índice España** | Bajo | Informacional |

---

## 🛠 Fase 1: Fundamentos Técnicos (Semana 1-2)
*Enfoque: Asegurar que Google pueda rastrear e indexar el sitio correctamente.*

- [x] **Google Search Console (GSC):** Preparado el terreno para verificación.
- [x] **Sitemap.xml & robots.txt:** Configurado con `vite-plugin-sitemap`. Generación automática en cada build.
- [x] **Meta Tags & Open Graph:**
    - [x] Títulos y descripciones únicas implementadas en `/` y `/sync`.
    - [x] Configurado `og:image` y Twitter Cards.
- [x] **Schema.org (JSON-LD):** Añadido `SoftwareApplication` en la página principal.
- [x] **Optimización de Core Web Vitals:** Verificado el uso de `@vercel/speed-insights`.

## 🚀 Fase 2: Landing Page Optimizada (Semanas 2-4)
*Enfoque: Convertir la landing page en un imán de keywords.*

- [ ] **Estructura de Encabezados (H1-H3):** Asegurar que el H1 contenga la keyword principal: *"Rebalancea tu cartera de ETFs y fondos indexados"*.
- [ ] **URLs Limpias:** Mantener rutas descriptivas (ej: `/herramientas/calculadora-rebalanceo`).
- [ ] **Contenido Educativo:** Añadir una sección "¿Qué es el rebalanceo de cartera?" en la landing para capturar tráfico informacional.
- [ ] **FAQ con Marcado Schema:** Implementar una sección de preguntas frecuentes con JSON-LD `FAQPage`.
- [ ] **Herramienta Pública:** Crear una versión simplificada del rebalanceador que sea accesible sin login para atraer backlinks y tráfico inicial.

## 📢 Fase 3: Visibilidad Externa & Link Building (Meses 2-3)
*Enfoque: Generar autoridad inicial a través de enlaces externos.*

- [ ] **Directorios de SaaS/Apps:** Listar en *AlternativeTo* (como alternativa a Portfolio Performance), *BetaList*, *Microlaunch*.
- [ ] **Product Hunt Launch:** Preparar un lanzamiento oficial para obtener un backlink de alta autoridad y tráfico masivo inicial.
- [ ] **Comunidades (Reddit/Foros):** Participar de forma orgánica en `r/eupersonalfinance`, `r/bolsa`, Rankia y Finect.
- [ ] **Newsletters de Finanzas:** Contactar con autores de newsletters en español para posibles reseñas o menciones.
- [ ] **GitHub SEO:** Optimizar el README del repositorio con enlaces directos a la app.

## ✍️ Fase 4: Autoridad de Contenido (Meses 3-6)
*Enfoque: Dominar las búsquedas long-tail mediante contenido especializado.*

- [ ] **Blog de Artículos Pilar:** Escribir 4-6 artículos profundos (>1500 palabras) sobre estrategias de inversión y rebalanceo.
- [ ] **Contenido Programático:** Crear páginas de comparación automática (ej: `/comparar/msci-world-vs-sp500`) y fichas de ETFs.
- [ ] **Build in Public:** Compartir actualizaciones en Twitter/X y LinkedIn para generar tráfico referral y autoridad de marca.
- [ ] **Enlazado Interno:** Conectar el blog con la herramienta principal usando textos de ancla optimizados.

## 🤖 Fase 5: GEO - Generative Engine Optimization (Meses 6-12)
*Enfoque: Aparecer en las respuestas de IAs (ChatGPT, Perplexity, AI Overviews).*

- [ ] **Aparecer en AI Overviews:** Estructurar el contenido para responder preguntas directas de forma concisa.
- [ ] **Archivo `llms.txt`:** Implementar `/llms.txt` para guiar a los crawlers de LLMs sobre qué hace CoreBalance.
- [ ] **Datos Estructurados Avanzados:** Usar `HowTo` Schema para guiar sobre cómo rebalancear carteras.
- [ ] **Fomentar el UGC:** Incentivar a los usuarios a mencionar la herramienta en foros públicos, ya que las IAs usan estas fuentes para sus recomendaciones.

---

*Última actualización: Mayo 2026*
