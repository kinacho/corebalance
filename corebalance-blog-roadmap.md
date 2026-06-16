# Roadmap del Blog de CoreBalance.app

**Versión:** 1.0 — Junio 2026  
**Objetivo:** Crear un blog product-led orientado al inversor indexado hispanohablante que atraiga tráfico orgánico cualificado y lo convierta en usuarios de CoreBalance.

---

## Análisis Previo de la Web

CoreBalance es una calculadora de rebalanceo de carteras de ETFs y fondos indexados. Su posicionamiento actual se apoya en tres pilares: **gratuita, privada (local-first) y diseñada para el inversor pasivo español**. La landing ya contiene señales SEO relevantes: guía de rebalanceo con MyInvestor, explicación del diferimiento fiscal en traspasos y comparativa frente a Excel/Portfolio Performance.

La ruta `/blog` no tiene contenido propio aún — redirige al home.

### Público objetivo detectado

- Inversores pasivos con cartera en MyInvestor, DeGiro o Interactive Brokers
- Usuarios de estrategias de asset allocation (MSCI World + Emerging + Small Cap)
- Personas que buscan alternativa a hojas de cálculo o Portfolio Performance
- Mercado hispanohablante (España principalmente, con versión EN disponible)

### Oportunidades SEO identificadas en la landing

| Tema ya presente en la web | Keyword potencial de blog |
|---|---|
| Rebalanceo de cartera | "cómo rebalancear cartera indexada" |
| MyInvestor + traspasos | "rebalancear fondos myinvestor sin pagar impuestos" |
| Asset allocation 80/20 | "qué porcentaje poner en msci world" |
| Simulador de crisis | "qué pasa con mi cartera si cae el mercado un 30%" |
| Alternativa a Excel | "hoja de excel para rebalanceo fondos indexados" |
| TER y costes | "qué es el ter en fondos indexados" |

---

## Objetivos del Blog

1. **Tráfico orgánico cualificado:** Capturar búsquedas informacionales de inversores pasivos en español.
2. **Conversión product-led:** Cada artículo enlaza de forma natural a una funcionalidad concreta de CoreBalance.
3. **Autoridad de dominio:** Aumentar los backlinks entrantes y la señal E-E-A-T (experiencia, expertise, autoridad, confianza) del dominio.
4. **Top-of-funnel amplio:** Alcanzar a personas que aún no conocen CoreBalance pero tienen el problema que resuelve.

---

## Fase 0 — Infraestructura (Semanas 1–2)

Antes de publicar cualquier contenido, la base técnica debe estar lista.

### Arquitectura de URLs

- Usar `/blog/[slug]` como ruta canónica (ej. `/blog/como-rebalancear-cartera-myinvestor`).
- Asegurarse de que el blog está en el mismo dominio (`corebalance.app/blog`) y **no** en un subdominio (`blog.corebalance.app`). Un subdominio no hereda la autoridad del dominio principal.

### Decisiones técnicas clave

- **SSG vs SSR:** Dado que el stack actual parece ser Svelte/SvelteKit + Vercel, usar **SvelteKit con rutas estáticas** (`prerender = true`) para el blog. Esto genera HTML estático por artículo, maximizando el rendimiento e indexabilidad.
- **CMS o Markdown:** Para un blog pequeño, **archivos Markdown locales en `/src/content/blog/`** con un parser como `mdsvex` es suficiente y mantiene todo en Git. A escala mayor, se puede migrar a un headless CMS (Contentful, Sanity, Notion como CMS).
- **i18n:** Dado que la app tiene versión EN, preparar la estructura de URLs para soportar `/en/blog/[slug]` desde el principio.

### Checklist técnico mínimo

- [ ] Ruta `/blog` funcional con listado de artículos
- [ ] Ruta dinámica `/blog/[slug]` con SSG
- [ ] `sitemap.xml` actualizado automáticamente con cada nuevo post
- [ ] `robots.txt` correcto (no bloquear `/blog`)
- [ ] Open Graph tags (og:title, og:description, og:image) por artículo
- [ ] Structured data `Article` schema (JSON-LD) por post
- [ ] Canonical URL por artículo
- [ ] Tiempo de carga < 1.5s por artículo (Core Web Vitals: LCP, CLS)
- [ ] Breadcrumb de navegación: Home > Blog > Artículo

---

## Fase 1 — Contenido Fundacional (Semanas 3–8)

El objetivo de esta fase es publicar los **10 artículos pillar** que cubren las búsquedas con más volumen e intención directamente alineada con CoreBalance. Cada artículo debe tener entre 1.200 y 2.500 palabras, ser exhaustivo en su tema y contener al menos un CTA contextual hacia la app.

### Clúster 1: Rebalanceo (core del producto)

Estos artículos atacan búsquedas directamente relacionadas con la funcionalidad principal.

| # | Título sugerido | Keyword principal | Intención | CTA natural |
|---|---|---|---|---|
| 1 | Cómo rebalancear tu cartera indexada paso a paso | "rebalancear cartera indexada" | Informacional | "Calcula tu rebalanceo gratis en CoreBalance" |
| 2 | Cuándo rebalancear: por calendario vs. por umbral de desviación | "cuando rebalancear cartera" | Informacional | "Configura tu umbral en CoreBalance" |
| 3 | Rebalanceo en MyInvestor: guía completa sin pagar impuestos | "rebalanceo myinvestor" | Transaccional | "Usa la calculadora de CoreBalance con MyInvestor" |
| 4 | Rebalanceo en DeGiro con ETFs: cómo hacerlo bien | "rebalanceo degiro etfs" | Transaccional | "Importa tus operaciones de DeGiro en CoreBalance" |

### Clúster 2: Asset Allocation (pre-producto)

Personas que aún están diseñando su cartera — serán usuarios futuros.

| # | Título sugerido | Keyword principal | Intención | CTA natural |
|---|---|---|---|---|
| 5 | La cartera MSCI World + Emerging Markets: el 80/20 explicado | "cartera msci world emerging markets porcentaje" | Informacional | "Simula tu cartera 80/20 en CoreBalance" |
| 6 | Qué es el asset allocation y cómo elegir el tuyo | "qué es asset allocation" | Informacional | "Define tu estrategia y empieza a seguirla" |
| 7 | Fondos indexados vs ETFs: diferencias prácticas para el inversor español | "fondos indexados vs etfs españa" | Comparativa | "CoreBalance funciona con ambos" |

### Clúster 3: Fiscalidad (diferenciador clave en España)

El diferimiento fiscal de traspasos es uno de los puntos más fuertes de CoreBalance para el mercado español.

| # | Título sugerido | Keyword principal | Intención | CTA natural |
|---|---|---|---|---|
| 8 | Traspasos de fondos en España: la guía fiscal del inversor indexado | "traspasos fondos indexados hacienda" | Informacional | "CoreBalance optimiza el orden de tus compras y traspasos" |
| 9 | Cómo rebalancear sin pagar impuestos: la ventaja de los fondos en España | "rebalancear sin pagar impuestos españa" | Informacional | "Calcula el rebalanceo fiscal-óptimo con CoreBalance" |

### Clúster 4: Herramientas (SEO de comparativas)

Captura usuarios que buscan alternativas a herramientas existentes.

| # | Título sugerido | Keyword principal | Intención | CTA natural |
|---|---|---|---|---|
| 10 | Las mejores alternativas a Portfolio Performance en español | "alternativas portfolio performance" | Comparativa | "CoreBalance: la alternativa gratuita y privada" |

### Criterios de calidad por artículo

- **Experiencia propia demostrada:** Incluir capturas reales de CoreBalance, ejemplos numéricos concretos (con euros, no genéricos), y reflexiones del creador como inversor.
- **E-E-A-T:** Firmar con el perfil de "kinacho", añadir fecha de publicación y fecha de última actualización.
- **Enlazado interno:** Cada artículo enlaza a otros 2–3 artículos relacionados del blog y a la página de características relevante de la app.
- **Enlazado externo:** Citar fuentes de autoridad: Bogleheads.org, documentación de MyInvestor, CNMV, Morningstar.
- **CTA contextual:** No al final del artículo como coda genérica, sino integrado donde el lector acaba de entender el problema que CoreBalance resuelve.

---

## Fase 2 — Autoridad y Long-Tail (Semanas 9–20)

Con los pilares publicados, el objetivo de esta fase es ampliar el contenido con artículos más específicos y herramientas gratuitas que generen backlinks.

### Tipos de contenido a añadir

**Artículos long-tail de alta conversión**

Búsquedas muy concretas con poco volumen pero alta intención de uso:
- "calculadora rebalanceo cartera excel gratis" → Artículo + enlace a CoreBalance como alternativa
- "qué pasa si no rebalanceo mi cartera" → Educacional con simulación de escenarios
- "cartera bogle para principiantes spain" → Artículo de audiencia nueva
- "cómo seguir dividendos etfs degiro" → Long-tail con funcionalidad de seguimiento
- "mejor etf msci world acc vs dis" → Comparativa técnica frecuente entre principiantes

**Herramientas/recursos gratuitos embebidos**
Publicar mini-herramientas en páginas del blog que puedan recibir backlinks:
- Calculadora de TER total de cartera (embebible o enlazada a la app)
- Plantilla Markdown/notion de seguimiento de cartera básica (descargable)
- Checklist "¿Es hora de rebalancear?" (interactivo)

**Páginas de comparativas de producto**
No son posts del blog, sino páginas independientes, pero se crean en esta fase:
- `/comparativas/corebalance-vs-portfolio-performance`
- `/comparativas/corebalance-vs-excel`
- `/comparativas/corebalance-vs-indexa-capital`

Estas páginas tienen alta intención transaccional y rankean bien.

### Cadencia recomendada

- Fase 1 (semanas 3–8): 1–2 artículos por semana. Total: 10 artículos fundacionales.
- Fase 2 (semanas 9–20): 1 artículo por semana + 1 herramienta/recurso al mes. Total: +12 artículos, 3 comparativas, 2–3 recursos.

---

## Fase 3 — Internacionalización y Escala (Mes 6+)

Una vez que el blog en español tenga tracción medible (>500 visitas/mes orgánicas), escalar al inglés.

### Prioridades en inglés

- Traducir los 5 artículos con más tráfico orgánico en español.
- Crear artículos propios para el mercado internacional: "How to rebalance an ETF portfolio", "IWDA vs VWCE: which one for your portfolio", "How to track ETFs without sharing your data".
- Diferente audiencia: usuarios de Interactive Brokers, mercado UK/IE, Degiro Europa.

### Señales de madurez del blog (KPIs a medir)

| KPI | Objetivo a 3 meses | Objetivo a 6 meses |
|---|---|---|
| Artículos publicados | 10 | 22+ |
| Visitas orgánicas/mes | 300 | 1.500+ |
| Posiciones en top 10 Google ES | 5 | 20+ |
| Backlinks externos obtenidos | 5 | 20+ |
| Conversiones blog → registro app | 5% de visitas | 7–10% |
| Tiempo en página medio | > 2 min | > 2.5 min |

---

## Consideraciones de Implementación Técnica

### Stack recomendado (SvelteKit)

```text
src/
  content/
    blog/
      es/
        como-rebalancear-cartera-indexada.md
        cuando-rebalancear-cartera.md
      en/
        how-to-rebalance-an-etf-portfolio.md
  routes/
    blog/
      +page.svelte          ← listado de posts
      [slug]/
        +page.svelte        ← post individual
        +page.ts            ← prerender + load markdown
```

### Frontmatter por artículo (campos obligatorios)

```yaml
---
title: "Cómo rebalancear tu cartera indexada paso a paso"
description: "Guía práctica para calcular el rebalanceo de una cartera de ETFs sin fórmulas complejas."
publishDate: 2026-07-01
updatedDate: 2026-07-01
author: kinacho
tags: [rebalanceo, cartera, etfs, fondos-indexados]
lang: es
canonical: https://corebalance.app/blog/como-rebalancear-cartera-indexada
ogImage: /blog/og/como-rebalancear-cartera-indexada.jpg
---
```

### SEO técnico por artículo

- `<title>`: Keyword principal + "| CoreBalance" (< 60 caracteres)
- `<meta description>`: Beneficio claro + acción (< 155 caracteres)
- Heading H1 único por página, alineado con el título SEO
- Imágenes con `alt` descriptivo; capturas de pantalla de la app son especialmente valiosas (demuestran experiencia propia)
- URL: solo keywords, sin stopwords, con guiones: `/blog/rebalanceo-myinvestor-sin-impuestos`

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Contenido generado con IA sin revisión (penalización EEAT) | Alta | Alto | Revisar y personalizar siempre con ejemplos propios y datos reales de CoreBalance |
| Blog en subdominio (pierde autoridad) | Media | Alto | Confirmar ruta `/blog` en el dominio principal desde el inicio |
| Canibalización de keywords entre posts | Media | Medio | Mapa de keywords antes de escribir; 1 keyword principal por post |
| Falta de tiempo para mantener el blog | Alta | Medio | Empezar con 1 artículo/semana; calidad > cantidad |
| Competidores con más recursos (Finect, MyInvestor blog) | Alta | Medio | Hiperespecializarse en rebalanceo y privacidad; CoreBalance tiene ventaja de producto en ese nicho |

---

## Resumen de Fases

| Fase | Duración | Entregables clave |
|---|---|---|
| **Fase 0 — Infraestructura** | Semanas 1–2 | Rutas `/blog`, SSG, sitemap, OG tags, schema Article |
| **Fase 1 — Contenido Fundacional** | Semanas 3–8 | 10 artículos pillar en 4 clústeres temáticos |
| **Fase 2 — Autoridad y Long-Tail** | Semanas 9–20 | +12 artículos, 3 páginas comparativas, 2–3 herramientas gratuitas |
| **Fase 3 — Internacionalización** | Mes 6+ | Blog en inglés, traducción de los 5 top posts |

