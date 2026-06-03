## 1. Carga Inicial y Splash Screen

### Problema — Doble splash con bloqueo de render

El fichero `app.html` implementa un splash screen estático con una barra de progreso animada, y `+layout.svelte` añade un segundo componente `<SplashScreen>`. Ambos coexisten y se gestionan con lógica en el cliente. La barra de progreso usa `setInterval` a 150 ms actualizando el DOM **antes de que cargue el JS principal de SvelteKit**, lo que genera pintura extra y puede causar **Layout Shifts** si el splash no se elimina de forma limpia.

```js
// app.html — problema: interval corriendo ANTES de que hidrate Svelte
const interval = setInterval(() => {
  progress += Math.random() * 10;
  ...
  if (bar) bar.style.width = progress + '%';
}, 150);
```

### Problema — Fuentes preloadeadas en exceso

Se precargan **5 variantes de peso** de Plus Jakarta Sans (400, 500, 600, 700, 800) en el `<head>`, lo que genera 5 peticiones de red en paralelo en la ruta crítica de render. El navegador bloquea el renderizado hasta que las fuentes declaradas como `preload` están disponibles, incrementando el LCP.

```html
<!-- 5 preloads de fuente = 5 peticiones en ruta crítica -->
<link rel="preload" href="/fonts/plus-jakarta-sans-latin-400-normal.woff2" .../>
<link rel="preload" href="/fonts/plus-jakarta-sans-latin-500-normal.woff2" .../>
<link rel="preload" href="/fonts/plus-jakarta-sans-latin-600-normal.woff2" .../>
<link rel="preload" href="/fonts/plus-jakarta-sans-latin-700-normal.woff2" .../>
<link rel="preload" href="/fonts/plus-jakarta-sans-latin-800-normal.woff2" .../>
```

### Recomendaciones

- **Reducir preloads a 1-2 pesos** (400 y 700 son suficientes; 500/600/800 se pueden cargar de forma diferida).
- Usar `font-display: optional` o `swap` para las variantes no críticas.
- **Fusionar ambos splashes** en uno solo controlado desde Svelte; eliminar el interval del `app.html` y sustituirlo por una animación CSS pura (`animation: progress 3s linear forwards`), sin tocar el DOM en cada tick.
- Considerar `preload` sólo para la fuente 400 (lectura) y cargar el resto como stylesheet normal.

---

## 2. Background Mesh — Animación CSS con `filter: blur` en GPU

### Problema — Animación cara en móvil

El `.background-mesh` aplica `filter: blur(80px)` y usa `@keyframes` con `transform: scale()` + `translate()`. La combinación de `filter: blur` con `transform` fuerza **capas compuestas independientes por frame** en algunos motores de render, lo que puede disparar el uso de GPU en dispositivos de gama media/baja. En móvil, el blur se reduce a 40px pero la animación de `scale(1.15)` sigue activa durante 25 segundos en bucle infinito.

```css
@keyframes meshFlow {
  33% { transform: scale(1.15) translate(3%, 5%); }  /* repaint costoso */
}
```

Además, el valor de las variables CSS del mesh se recalcula en cada render reactivo de Svelte (depende de `portfolio.globalDailyChangePercent`), lo que puede forzar re-estilos síncronos si el precio cambia mientras se está ejecutando la animación.

### Recomendaciones

- **Añadir `will-change: transform` al `.background-mesh`** para promover el elemento a su propia capa GPU desde el inicio.
- En móvil (`@media (max-width: 768px)`), **pausar la animación** con `animation-play-state: paused` o reducir la duración a 0 usando `@media (prefers-reduced-motion: reduce)`.
- Separar la actualización de variables CSS del ciclo de animación: actualizar las variables de color del mesh en un debounce de 500 ms, no en cada tick reactivo.

```css
/* Recomendado */
.background-mesh {
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .background-mesh { animation: none; }
}
```

---

## 3. API de Precios — Chunking secuencial y latencia acumulada

### Problema — Bucle `for` secuencial entre chunks

El endpoint `/api/prices` divide los tickers en chunks de 3 y los procesa **en serie** con un bucle `for`:

```ts
// +server.ts — antipatrón: await dentro de for sequencial
for (let i = 0; i < chunks.length; i++) {
  const chunkResults = await Promise.allSettled(chunk.map(...));
  results.push(...chunkResults);
  if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 200));
}
```

Para 50 tickers (el máximo permitido), esto implica **17 iteraciones × 200 ms de delay = ~3.4 segundos de espera** solo por los sleeps, más el tiempo real de cada chunk. Este delay se paga incluyendo cuando Redis ya tiene la caché para todos los tickers.

### Problema — Caché por ticker pero verificación síncrona dentro del loop

La comprobación de caché (`getCachedHistory`) se hace dentro del `Promise.allSettled` de cada chunk, lo que significa que si hay 3 tickers en un chunk, se hacen 3 llamadas Redis en paralelo. Sin embargo, la estructura secuencial entre chunks impide que los tickers del chunk 2 empiecen a verificar su caché mientras el chunk 1 aún procesa datos nuevos.

### Recomendaciones

- **Pre-verificar la caché en paralelo para TODOS los tickers** antes de hacer cualquier petición a Yahoo Finance. Los tickers con caché válida se resuelven instantáneamente; solo los "miss" pasan a la fase de chunking.
- Reducir el sleep entre chunks o eliminarlo cuando todos los tickers de un chunk procedieron de caché.
- Considerar usar `Promise.all` con un limitador de concurrencia (p.ej. `p-limit`) en lugar de chunking manual.

```ts
// Patrón recomendado
import pLimit from 'p-limit';
const limit = pLimit(3); // máx 3 peticiones Yahoo en paralelo
const results = await Promise.allSettled(
  missTickers.map(ticker => limit(() => fetchYahooHistory(ticker)))
);
```

---

## 4. Rate Limiting en Memoria — Memory Leak en Serverless

### Problema — `rateLimitMap` en memoria de proceso

El rate limiter usa un `Map` en el módulo del servidor:

```ts
const rateLimitMap = new Map<string, number[]>();
```

En Vercel (entorno serverless), cada invocación de la función puede correr en una instancia diferente, por lo que el mapa **no persiste entre peticiones** y el rate limiting no funciona correctamente bajo carga distribuida. Además, la lógica de limpieza (`if (rateLimitMap.size > 1000)`) solo se ejecuta cuando se supera 1000 entradas, lo que puede generar un pico de consumo de memoria antes de la limpieza.

### Recomendación

Mover el rate limiting a **Redis/Upstash** (que ya está configurado en el proyecto), usando un contador con TTL:

```ts
async function checkRateLimit(ip: string): Promise<boolean> {
  if (!redis) return true; // fallback permisivo en dev
  const key = `rl:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count <= RATE_LIMIT;
}
```

---

## 5. Store de Portfolio — Derivaciones en Cadena Costosas

### Problema — `reconstructedHistory` recalculado en cada tick de precio

`reconstructedHistory` es un `$derived.by()` que itera 30 días × N posiciones, interpolando valores históricos desde sparklines. Este derivado depende de `portfolioState.positions`, `stockState.positions` y `satelliteState.positions`, que a su vez dependen de `convertedPrices`. Cada vez que llega una actualización de precios (cada 30 segundos), se recalcula esta cadena completa.

```ts
// portfolio.svelte.ts — re-evaluado en cada tick de precio (cada 30s)
reconstructedHistory = $derived.by(() => {
  const days = 30;
  // itera todas las posiciones × 30 días
  processPositions(this.portfolioState.positions, 'core');
  processPositions(this.stockState.positions, 'stocks');
  ...
});
```

Para carteras con muchos activos, esto puede bloquear el hilo principal durante varios ms en cada actualización, causando **INP elevado** (Interaction to Next Paint).

### Problema — `convertedPrices` se recalcula completamente para todos los tickers

`convertedPrices` itera `Object.entries(this.prices)` incluyendo los pares de divisas (7 pares de FX), lo que añade trabajo innecesario para activos en EUR.

### Recomendaciones

- Memoizar `reconstructedHistory` usando `$derived.by` con una clave de versión que solo cambie cuando cambien los sparklines (no en cada tick de precio regular):

```ts
sparklineVersion = $state(0); // solo aumenta cuando llegan nuevos sparklines
reconstructedHistory = $derived.by(() => {
  this.sparklineVersion; // dependencia explícita
  return computeHistory(/* sparklines sin precio actual */);
});
```

- Calcular el valor del día actual (el último punto del historial) por separado usando los precios en tiempo real, y sobreescribir solo el último punto en el render del componente `HistoryChart`.
- Filtrar divisas de `convertedPrices` para no procesarlas en el cálculo de conversión de posiciones.

---

## 6. SSR Desactivado Globalmente — Oportunidades Perdidas

### Situación actual

```ts
// +layout.ts
export const ssr = false;
```

Esto convierte la app en una SPA pura, lo que tiene sentido para el dashboard (datos privados del usuario), pero **penaliza la landing page y las páginas estáticas** (privacy, terms, cookies) que no necesitan datos del cliente.

La landing (`/`) carga el bundle JS completo antes de renderizar, incrementando el LCP para usuarios nuevos. El SEO también se ve afectado: aunque los crawlers modernos ejecutan JS, el tiempo de render por la spider puede ser mayor.

### Recomendaciones

- Habilitar SSR/prerenderizado selectivamente para las rutas estáticas:

```ts
// routes/privacy/+page.ts, routes/terms/+page.ts, routes/cookies/+page.ts
export const prerender = true;
```

```ts
// routes/+page.ts (landing)
export const ssr = true;
export const prerender = false; // o true si el contenido es estático
```

- Mantener `ssr = false` solo en `routes/dashboard/+layout.ts` (o similar), no en el layout raíz.
- Esto puede reducir el LCP de la landing en **1-2 segundos** para primera visita.

---

## 7. CSS Global — Animaciones Globales y `transition: all`

### Problema — `transition: all` en elementos interactivos

```css
/* layout.css */
button, .asset-card, .tab-btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

`transition: all` anima cualquier propiedad CSS que cambie, incluyendo propiedades costosas como `width`, `height`, `font-size`, `border-radius`. Si un botón cambia de tamaño por contenido dinámico (p.ej. al cargar precios), el navegador animará el reflow. Esto puede causar **jank visible** y aumentar el tiempo de renderizado de frames.

### Problema — `shimmer-flow` infinito en elementos cargando

El efecto shimmer usa `animation: shimmer-flow 1.5s infinite` y el gradiente ocupa `background-size: 200% 100%`. Si hay múltiples elementos en estado de carga simultáneamente (p.ej. varias `AssetCard` mientras se obtienen precios), se animan múltiples gradientes en paralelo, lo que puede causar **composite layer thrashing** en GPUs con poca memoria.

### Recomendaciones

- Reemplazar `transition: all` por propiedades específicas:

```css
button, .asset-card, .tab-btn {
  transition:
    background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

- Limitar el número de elementos shimmer activos simultáneamente. Si el fetch de precios devuelve un batch, activar el shimmer en un componente padre hasta que el batch completo esté disponible.
- Añadir `contain: layout style` a las tarjetas de activos para aislar los reflows:

```css
.asset-card {
  contain: layout style;
}
```

---

## 8. Inicialización del Store — Timeout de Seguridad de 4 Segundos

### Problema — Fallback timeout innecesariamente largo

```ts
// portfolio.svelte.ts
setTimeout(() => {
  if (!this.isInitialized) {
    this.isInitialized = true;
    this.loading = false;
  }
}, 4000); // 4 segundos
```

Si Firebase Auth tarda en responder (o falla silenciosamente), el usuario ve el splash durante hasta 4 segundos. Esto es especialmente perjudicial en conexiones lentas o cuando el SDK de Firebase no carga correctamente.

### Problema — `getRedirectResult` bloquea `initAuth`

```ts
await getRedirectResult(auth); // await síncrono antes de onAuthStateChanged
```

`getRedirectResult` puede tardar varios segundos si hay un redirect pendiente de Google Auth. Esto retrasa el inicio de `onAuthStateChanged` y, por tanto, la inicialización completa del portfolio.

### Recomendaciones

- Reducir el timeout de seguridad a **2 segundos** (las conexiones modernas resuelven Firebase Auth en < 1 s en condiciones normales).
- Ejecutar `getRedirectResult` en paralelo con `onAuthStateChanged`, no secuencialmente:

```ts
private async initAuth() {
  this.loadFromStorage();
  if (this.hasAnyHoldings) this.fetchPrices();

  // Iniciar listener ANTES de resolver el redirect
  const unsubscribe = storageProvider.onAuthStateChanged(async (user) => { ... });
  
  // Redirect result en paralelo, sin bloquear el listener
  if (!storageProvider.isLocal) {
    import('firebase/auth').then(({ getRedirectResult }) => {
      getRedirectResult(auth).catch(console.error);
    });
  }
}
```

---

## 9. Métricas Adicionales y Observaciones Menores

### LocalStorage como fuente de verdad en app.html

El script inline de `app.html` lee `localStorage` de forma síncrona para decidir si mostrar el splash. Si `localStorage` está bloqueado (p.ej. Safari en modo privado, o navegadores con restricciones de terceros), la lectura lanza una excepción que ya está controlada con `try/catch`. Sin embargo, el `JSON.parse` en el `catch` silenciado puede ocultar errores de datos corruptos. Recomendado: validar el esquema mínimo del objeto parseado antes de usarlo.

### `DemoRibbon` siempre montado

El componente `DemoRibbon` se incluye en el markup del dashboard independientemente de si `portfolio.isDemo` es `true`. Aunque el componente probablemente haga un render condicional internamente, importarlo siempre en el bundle del dashboard añade peso. Recomendado: usar importación dinámica condicionada o renderizado condicional en el padre.

### Schema.org JSON-LD duplicado

El dashboard genera un `<script type="application/ld+json">` con `dashboardSchema`, pero la landing page (gestionada por `LandingPage.svelte`) probablemente también incluye metadatos similares. Conviene auditar que no haya schemas duplicados entre `+layout.svelte` y las páginas individuales, ya que Google puede ignorar el segundo bloque LD+JSON.

### Polling cada 30 segundos sin backoff

El intervalo de polling de precios es fijo a 30 segundos. En caso de errores repetidos (p.ej. API de Yahoo caída), el cliente seguirá intentando cada 30 s sin incrementar el intervalo. Añadir **exponential backoff** hasta un máximo de 5 minutos mejoraría la resiliencia y reduciría la carga en el servidor en casos de degradación.

---

## 10. Resumen de Prioridades

| Prioridad | Área | Impacto | Esfuerzo |
|-----------|------|---------|----------|
| 🔴 Alta | SSR en landing y páginas estáticas | LCP –1-2 s, SEO | Bajo |
| 🔴 Alta | Reducir preloads de fuentes (5 → 2) | LCP –300-500 ms | Muy bajo |
| 🔴 Alta | API prices: caché pre-check paralela + eliminar sleeps innecesarios | TTFB –2-3 s | Medio |
| 🟠 Media | `transition: all` → propiedades específicas | INP, jank móvil | Muy bajo |
| 🟠 Media | Rate limit a Redis/Upstash | Seguridad, corrección | Bajo |
| 🟠 Media | Timeout initAuth 4s → 2s + getRedirectResult en paralelo | Tiempo splash –2 s | Bajo |
| 🟡 Baja | `background-mesh` will-change + reduced-motion | GPU móvil | Muy bajo |
| 🟡 Baja | `reconstructedHistory` memoización por sparklineVersion | INP en carteras grandes | Medio |
| 🟡 Baja | Exponential backoff en polling | Resiliencia | Bajo |
| 🟡 Baja | `prerender = true` en /privacy, /terms, /cookies | Build size, TTFB | Muy bajo |

---

## Conclusión

CoreBalance es una aplicación bien estructurada con patrones reactivos modernos. Las mejoras de mayor impacto están concentradas en tres áreas: **habilitar SSR/prerender para rutas estáticas** (impacto inmediato en LCP y SEO), **optimizar el pipeline del endpoint de precios** eliminando el chunking secuencial artificial cuando la caché ya cubre los datos, y **reducir la presión de red en la carga inicial** recortando los preloads de fuentes. Estas tres acciones, de esfuerzo relativamente bajo, pueden mejorar los Core Web Vitals de forma medible en Vercel Analytics y en Lighthouse.
