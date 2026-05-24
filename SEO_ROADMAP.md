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
    - [x] Títulos y descripciones únicas implementadas.
    - [x] Configurado `og:image` y Twitter Cards.
- [x] **Schema.org (JSON-LD):** Añadido `SoftwareApplication` en la página principal.
- [x] **Optimización de Core Web Vitals:** Verificado el uso de `@vercel/speed-insights`.
- [x] **Privacidad como Valor:** Enfatizado el enfoque *local-first* y "sin registro" en las meta-descripciones.

## 🚀 Fase 2: Landing Page & Conversión (Semanas 2-4)
*Enfoque: Convertir la landing page en un imán de keywords y confianza.*

- [x] **Estructura de Encabezados (H1-H3):** H1 optimizado: *"Rebalancea tu cartera de ETFs y fondos indexados"*.
- [x] **Footer Minimalista:** Eliminación de ruido (redes sociales) para centrar la atención en el producto y el soporte vía email.
- [x] **Contenido Educativo:** Añadida sección "Inversión Inteligente" explicando por qué rebalancear carteras.
- [x] **FAQ con Marcado Schema:** Implementada sección de preguntas frecuentes con JSON-LD `FAQPage` para mejorar la visibilidad en Google.
- [x] **Herramienta de Captación:** Implementado modo "Probar Demo" con cartera pre-configurada (80/10/10) para reducir la fricción y demostrar valor instantáneo.

## 📢 Fase 3: Visibilidad & Autoridad (Meses 2-3)
*Enfoque: Generar autoridad inicial a través de enlaces externos y comunidad.*

- [ ] **Directorios de SaaS/Apps:** Listar en *AlternativeTo* (como alternativa a Portfolio Performance), *BetaList*, *Microlaunch*.
- [ ] **Product Hunt Launch:** Preparar un lanzamiento oficial enfocado en la privacidad y la simplicidad.
- [ ] **Comunidades (Reddit/Foros):** Participar de forma orgánica en `r/eupersonalfinance`, `r/bolsa`, Rankia y Finect destacando que es una herramienta *open-source* y gratuita.
- [ ] **GitHub SEO:** Optimizar el README del repositorio con enlaces directos a la app y palabras clave técnicas.

## ✍️ Fase 4: Especialización (Meses 3-6)
*Enfoque: Dominar las búsquedas específicas sobre gestión de carteras.*

- [ ] **Guías Rápidas:** Crear mini-guías de configuración para carteras populares (Bogleheads 2-3 fondos, 90/10, etc.).
- [ ] **Contenido Programático:** Páginas de utilidad sobre TER y solapamiento de fondos.
- [ ] **Foco en Privacidad:** Posicionar CoreBalance como la alternativa privada a herramientas que requieren vincular cuentas bancarias.

## 🤖 Fase 5: GEO - Generative Engine Optimization (Meses 6-12)
*Enfoque: Aparecer en las respuestas de IAs (ChatGPT, Perplexity, AI Overviews).*

- [ ] **Respuesta a IAs:** Estructurar el contenido para responder preguntas directas como "¿Cómo rebalancear mi cartera de MyInvestor gratis?".
- [ ] **Archivo `llms.txt`:** Implementar `/llms.txt` para guiar a los crawlers de LLMs sobre las capacidades de CoreBalance.
- [ ] **Datos Estructurados Avanzados:** Usar `HowTo` Schema para guiar sobre el proceso de rebalanceo manual.

---

*Última actualización: 24 de Mayo, 2026 (v1.6.0)*
