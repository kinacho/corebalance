# 🔍 Auditoría SEO Completa — CoreBalance (corebalance.app)

> Auditoría técnica y de contenido del proyecto SvelteKit 5 + TypeScript desplegado en Vercel.  
> Fecha: 18 de Junio de 2026 · Solo diagnóstico, sin fixes.

---

## ✅ CORRECTO — Lo que ya está bien implementado

| # | Área | Detalle |
|---|------|---------|
| 1 | **`app.html`** | `charset`, `viewport` con `viewport-fit=cover`, `theme-color`, PWA metas — todo correcto |
| 2 | **`lang` dinámico** | `<html lang="%lang%">` se inyecta dinámicamente desde el layout (`%lang%`) |
| 3 | **Canonical URL** | [+layout.svelte](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/routes/+layout.svelte#L32-L33) genera `<link rel="canonical">` dinámico para TODAS las páginas |
| 4 | **Hreflang base** | Layout raíz tiene `hreflang="es"` y `hreflang="x-default"` apuntando a `corebalance.app` |
| 5 | **Sitemap dinámico** | [sitemap.xml/+server.ts](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/routes/sitemap.xml/+server.ts) existe, es `prerender: true`, incluye todas las páginas estáticas, blog con hreflang ES/EN/x-default por par |
| 6 | **Robots.txt** | [robots.txt](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/static/robots.txt) bloquea `/api/` y `/dashboard/`, referencia `Sitemap:`, permite rastreo de todo lo público |
| 7 | **JSON-LD Landing** | [LandingPage.svelte](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/lib/components/landing/LandingPage.svelte#L16-L48): Schema `SoftwareApplication` + `Organization` con `@graph` |
| 8 | **JSON-LD FAQ** | [EducationalFAQ.svelte](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/lib/components/landing/EducationalFAQ.svelte#L29-L43): Schema `FAQPage` con las 4 preguntas |
| 9 | **JSON-LD HowTo** | [HowToRebalance.svelte](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/lib/components/landing/HowToRebalance.svelte#L27-L39): Schema `HowTo` con 4 pasos y `totalTime` |
| 10 | **JSON-LD Blog** | [BlogPost.svelte](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/lib/components/blog/BlogPost.svelte#L32-L59): Schema `BlogPosting` + `BreadcrumbList` con `publisher.logo` |
| 11 | **JSON-LD Breadcrumb** | Herramientas ([calculadora-ter](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/routes/herramientas/calculadora-ter/+page.svelte#L141-L149), [checklist](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/routes/herramientas/checklist-rebalanceo/+page.svelte#L201-L209)) tienen `BreadcrumbList` JSON-LD |
| 12 | **Meta tags por página** | Landing, blog, cookies, privacy, terms, herramientas y comparativas — todas tienen `<title>` y `<meta name="description">` únicos |
| 13 | **OG tags Landing** | `og:title`, `og:description`, `og:image` presentes en [LandingPage.svelte](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/lib/components/landing/LandingPage.svelte#L57-L60) |
| 14 | **OG tags Blog** | `og:title`, `og:description`, `og:image`, `og:type=article`, `og:url` completos en [BlogPost.svelte](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/lib/components/blog/BlogPost.svelte#L70-L75) |
| 15 | **Fuentes self-hosted** | Todas las fuentes Plus Jakarta Sans están en `/fonts/` como `.woff2` con `preload` — no hay llamadas a Google Fonts externas |
| 16 | **`font-display: swap`** | Todas las `@font-face` en [fonts.css](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/static/fonts/fonts.css) usan `font-display: swap` |
| 17 | **URLs limpias** | Todas las rutas públicas son legibles, en minúsculas y sin parámetros dinámicos innecesarios |
| 18 | **Blog bilingüe** | 17+ artículos en ES y EN con slugs diferenciados y hreflang en sitemap |
| 19 | **`llms.txt` completo** | [llms.txt](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/static/llms.txt) excelente — 157 líneas con: problema que resuelve, features, audiencia, comparativa, guía paso a paso, glosario de conceptos, contenido del sitio, info técnica |
| 20 | **Footer con links** | [LandingFooter.svelte](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/lib/components/landing/LandingFooter.svelte) tiene grid de links a Producto, Legal y Comunidad |
| 21 | **CTAs de engagement** | Landing tiene múltiples CTAs (demo interactiva, empezar gratis, cómo funciona), herramientas interactivas y blog con CTA al final de cada post |
| 22 | **Catch-all → redirect** | [`[...path]/+page.ts`](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/routes/%5B...path%5D/+page.ts) redirige 307 a `/` (evita 404s vacíos) |
| 23 | **Vercel Analytics** | Inyectados `@vercel/analytics` y `@vercel/speed-insights` en [+layout.svelte](file:///c:/Users/Kino/Github/Rebalanceador-90-5-5/src/routes/+layout.svelte#L60-L61) |

---

## ❌ CRÍTICO — Prioridad Alta

### 1. No hay página `+error.svelte` personalizada

**`[src/routes/+error.svelte]`** → **No existe.**

El catch-all `[...path]` redirige a `/` con un 307, lo que significa que Google nunca ve un código 404 real. Esto es **terrible para SEO**: Google interpreta que todas las URLs no existentes devuelven contenido (soft 404). Necesitas un `+error.svelte` que devuelva un **HTTP 404** con contenido útil para el usuario.

**Impacto:** Google puede indexar miles de URLs basura y penalizar por soft 404s masivos.

---

### 2. OG image de la landing (`og-image-landing.png`) NO EXISTE en `/static/`

**`[src/lib/components/landing/LandingPage.svelte:60]`** → Referencia `https://corebalance.app/og-image-landing.png` pero el archivo **no existe** en `static/`.

Igual ocurre con `og-image.png` referenciado en el dashboard. Ni `og-image-landing.png` ni `og-image.png` están en la carpeta `static/`.

**Impacto:** Cuando alguien comparte la URL en redes sociales, Twitter/LinkedIn/WhatsApp muestran una tarjeta sin imagen — drástica pérdida de CTR social.

---

### 3. Landing page sin `og:type`, `og:url` ni Twitter Cards

**`[src/lib/components/landing/LandingPage.svelte]`** → Falta:
- `og:type` (debería ser `website`)
- `og:url` (debería ser `https://corebalance.app`)
- `twitter:card` (`summary_large_image`)
- `twitter:title`, `twitter:description`, `twitter:image`

Solo el dashboard tiene Twitter Cards; la landing (la página más importante para SEO) no las tiene.

**Impacto:** Preview roto en Twitter/X y compartidos sociales incompletos en la página más importante.

---

### 4. Las 3 páginas de comparativas no tienen OG tags, Twitter Cards ni schema

**`[comparativas/corebalance-vs-excel]`**, **`[comparativas/corebalance-vs-indexa-capital]`**, **`[comparativas/corebalance-vs-portfolio-performance]`** → Solo tienen `<title>` y `<meta description>`. Les falta:
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`)
- Twitter Cards
- Schema JSON-LD (no tienen `BreadcrumbList` ni ningún schema)
- Breadcrumb visual de navegación

**Impacto:** Estas páginas son landing pages de keywords de alto valor competitivo y están infraoptimizadas. Sin OG tags pierden viralidad social, sin schema pierden riqueza en SERPs.

---

### 5. Las comparativas están solo en español — sin i18n

**`[comparativas/*]`** → Todo el copy está hardcodeado en español directamente en el `.svelte`. No usan el sistema i18n (`$LL`). Esto significa:
- Un usuario inglés ve la comparativa en español
- Google no puede indexar versiones EN de estas páginas de alto valor

**Impacto:** Pierdes todo el mercado de habla inglesa para keywords como "CoreBalance vs Portfolio Performance" o "CoreBalance vs Excel".

---

### 6. Las páginas legales (`/privacy`, `/terms`, `/cookies`) NO tienen `noindex`

**`[privacy/+page.svelte]`**, **`[terms/+page.svelte]`**, **`[cookies/+page.svelte]`** → Tienen title y meta description indexables, y están en el sitemap con `priority: 0.3`. No tienen `<meta name="robots" content="noindex">`.

**Impacto:** Bajo. Google las indexará, consumiendo crawl budget sin valor SEO. Al estar en el sitemap, Google recibe señales confusas de que estas páginas son relevantes. No es bloqueante pero es una mala práctica de crawl budget.

---

### 7. La `meta description` de `app.html` es genérica y se queda como fallback

**`[src/app.html:11]`** → `"Dashboard de inversión personalizable con rebalanceo automático"` — esta description de fallback se queda activa si alguna página no define la suya en `<svelte:head>`. Además, no contiene la keyword principal ("fondos indexados").

**Impacto:** Si alguna ruta nueva olvida poner su `<meta description>`, Google indexa esta genérica.

---

### 8. Exceso de preloads de fuentes (10 archivos `preload`)

**`[src/app.html:12-21]`** → Se precargan **10 archivos de fuente** con `preload`. Cada `preload` compite por ancho de banda con recursos críticos del render. La mayoría de variantes (`latin-ext`, pesos 500/600/800) deberían ser `prefetch` o cargarse por CSS normal.

**Impacto:** Afecta LCP (Largest Contentful Paint) al saturar las conexiones iniciales con fuentes no críticas.

---

## ⚠️ MEJORABLE — Prioridad Media

### 9. robots.txt no bloquea bots de scraping de IA

**`[static/robots.txt]`** → Solo tiene `User-agent: *`. No bloquea:
- `GPTBot` (OpenAI)
- `ClaudeBot` (Anthropic)
- `CCBot` (Common Crawl para LLMs)
- `PerplexityBot`
- `Google-Extended` (Gemini training data)

El `LLMs-txt` está comentado (`# LLMs-txt:`) — debería descomentarse.

---

### 10. El `<h1>` de la landing no contiene la keyword principal

**`[Hero.svelte:13-15]`** → El H1 es dinámico via i18n: `"Rebalancea tu cartera de ETFs y Fondos Indexados"`. Es bueno pero no incluye la keyword principal target: **"fondos indexados España"** ni **"gestión cartera fondos indexados"**.

El H1 está bien para branding pero podría optimizarse para la keyword exacta target sin perder naturalidad.

---

### 11. Blog index (`/blog`) no tiene `<title>` ni `<meta description>` propios

**`[src/routes/blog/+page.svelte]`** → Solo renderiza `<BlogList>` sin `<svelte:head>`. Hereda el fallback genérico de `app.html`. La página `/blog` debería tener su propio title como `"Blog de Inversión Indexada | CoreBalance"`.

---

### 12. Sitemap: `lastmod` siempre es fecha de build (no fecha real)

**`[sitemap.xml/+server.ts:9]`** → Para las páginas estáticas, `lastmod` es `new Date().toISOString()` (fecha de build). Esto significa que Google ve que TODAS las páginas se modificaron "hoy" en cada deploy, lo cual diluye la señal de `lastmod`. Para los posts sí usa fecha real del post.

---

### 13. No hay `WebSite` schema con `SearchAction` (Sitelinks Search Box)

**`[Landing]`** → Falta el schema `WebSite` con `potentialAction: SearchAction`. Esto permite que Google muestre un cuadro de búsqueda directamente en las SERPs para tu dominio.

---

### 14. Herramientas y comparativas sin OG tags ni Twitter Cards

**`[herramientas/calculadora-ter]`**, **`[herramientas/checklist-rebalanceo]`** → Tienen title, description y BreadcrumbList pero **no tienen OG tags ni Twitter Cards**.

---

### 15. Footer no tiene links a blog, herramientas ni comparativas

**`[LandingFooter.svelte]`** → El footer tiene links a:
- Producto: Features, Cómo funciona, Por qué CB, Novedades
- Legal: Privacy, Terms, Cookies
- Comunidad: Bug report, PayPal, Contacto

**Falta:** Blog, Calculadora TER, Checklist Rebalanceo, Comparativas. Estos son links SEO internos de alto valor que deberían estar en el footer.

---

### 16. La `+page.svelte` de la home NO tiene `<svelte:head>` propio

**`[src/routes/+page.svelte]`** → La page raíz delega todo el SEO a `LandingPage.svelte` (componente hijo). Esto funciona pero es frágil: si el componente no se renderiza (ej. usuario con datos → se redirige), la home queda sin meta tags hasta que SvelteKit hidrate. Google bot puede ver la página sin title ni description.

---

### 17. Imágenes del splash/logo sin atributos explícitos `width`/`height` en `app.html`

**`[src/app.html:74]`** → La imagen del logo en el splash tiene estilos inline (`width: 80px; height: 80px`) pero no atributos HTML `width`/`height`, lo que puede causar CLS menor.

---

### 18. Trailing slash inconsistente

SvelteKit por defecto usa `trailingSlash: 'never'` (sin barra final), pero no hay configuración explícita en `svelte.config.js`. Esto es correcto por defecto, pero vale la pena verificar que no hay links internos con trailing slash que generen redirects 308.

---

## 💡 OPORTUNIDADES — Prioridad Baja / Futuro

### 19. Crear landing pages dedicadas a keywords long tail

No existen rutas como:
- `/rebalancear-cartera` — keyword "cómo rebalancear mi cartera"
- `/fondos-indexados-espana` — keyword "fondos indexados España"
- `/app-seguimiento-cartera` — keyword "app seguimiento cartera fondos"

Estas podrían ser **landing pages programáticas** que capturen tráfico orgánico específico.

---

### 20. No hay estrategia de `Dataset` schema para GEO

El `llms.txt` es excelente, pero los datos estructurados no incluyen un schema `Dataset` que describa la información financiera que la app maneja. Esto ayudaría a LLMs a citar CoreBalance como fuente de datos.

---

### 21. Blog sin tabla de contenidos (ToC) auto-generada

Los posts del blog no tienen una tabla de contenidos con anchor links. Esto mejora el time on page, reduce bounce rate y permite que Google genere **jump-to links** en los SERPs.

---

### 22. No hay `<meta name="author">` ni perfil verificable

Falta un `<meta name="author">` y no hay vínculo a un perfil verificable (LinkedIn, GitHub personal). Para E-E-A-T (Experience, Expertise, Authority, Trust), especialmente en nicho financiero, esto es relevante.

---

### 23. El `llms.txt` podría incluir una sección de "Claims citables"

Añadir un bloque de afirmaciones concretas con datos verificables que los LLMs puedan citar directamente. Ejemplo: *"CoreBalance ha sido utilizada por más de X inversores indexados"*, *"El 95% de las carteras españolas de inversión pasiva usan entre 2 y 4 fondos"*, etc.

---

### 24. No existe `vercel.json` para headers de caché/compresión

No hay `vercel.json` en la raíz. Vercel aplica compresión (brotli/gzip) automáticamente, pero no hay configuración de cache headers para assets estáticos (`Cache-Control: immutable`), ni headers de seguridad (`X-Content-Type-Options`, `X-Frame-Options`).

---

### 25. Páginas de comparativas sin contenido suficiente para SEO profundo

Las 3 comparativas tienen ~450 líneas de Svelte pero el contenido textual visible es relativamente corto (~300 palabras). Para keywords competitivas como "CoreBalance vs Indexa Capital", sería beneficioso ampliar con:
- Sección FAQ específica de la comparativa
- Caso de uso real con cifras
- Embed de la calculadora

---

### 26. Considerar `prerender` para las comparativas y herramientas

Las comparativas y herramientas son contenido estático puro. No requieren datos dinámicos del servidor. Podrían ser `prerender: true` para mejorar TTFB y dar a Google HTML estático instantáneo.

---

## 📊 PUNTUACIÓN ESTIMADA

| Categoría | Puntuación | Notas |
|-----------|:----------:|-------|
| **SEO técnico** | **7/10** | Canonical, sitemap, robots bien. Falta `+error.svelte` (crítico), OG images rotas, comparativas sin meta completa |
| **SEO de contenido** | **8/10** | Blog extenso bilingüe, keywords en H1, FAQ, HowTo. Falta optimización del H1 principal para keyword exacta, blog index sin meta tags, y comparativas sin i18n |
| **Core Web Vitals** | **7/10** | Fuentes preloaded con `swap`, self-hosted, sin JS externo bloqueante. Penalización por 10 preloads de fuentes y splash screen pesada |
| **Schema / datos estructurados** | **8/10** | Excelente cobertura: `SoftwareApplication`, `FAQPage`, `HowTo`, `BlogPosting`, `BreadcrumbList`. Falta `WebSite` con `SearchAction` y schema en comparativas |
| **GEO / visibilidad en IA** | **8/10** | `llms.txt` es de los más completos que he visto. Falta descomentarlo en robots.txt, bloquear scrapers IA selectivamente, y añadir claims citables |

### Puntuación global: **7.6 / 10**

> [!IMPORTANT]
> Los 3 problemas **más urgentes** a resolver son:
> 1. **Crear `+error.svelte`** con HTTP 404 real y eliminar/ajustar el catch-all redirect
> 2. **Crear y subir las OG images** (`og-image.png` y `og-image-landing.png`)  
> 3. **Añadir OG + Twitter Cards** a la landing y las comparativas

---

**¿Quieres que proceda a corregir alguna sección específica?** Puedo empezar por los CRÍTICOS, los MEJORABLES, o la sección que prefieras.
