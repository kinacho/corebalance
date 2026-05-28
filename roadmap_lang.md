# Roadmap de internacionalización de CoreBalance con **svelte‑i18n**

> Objetivo: traducir **corebalance.app** (SvelteKit 5 + TypeScript) a múltiples idiomas (es/en), usando **svelte‑i18n**, sin prefijos `/es` o `/en` en la URL, con idioma por defecto el del navegador y un selector manual de idioma.[web:10][web:80][file:50]

---

## 0. Decisiones iniciales

1. **Idiomas objetivo**
   - Corto plazo: `es` (actual) + `en`.
   - `fallbackLocale`: `es`.

2. **Estrategia de URLs**
   - Mantener las rutas actuales sin idioma:
     - `/`, `/privacy`, `/terms`, `/cookies`, `/dashboard`, etc.[file:50]
   - El idioma se decide por configuración interna (locale de svelte‑i18n), no por el path.[web:80]

3. **Detección de idioma**
   - Orden de prioridad:
     - Elección previa del usuario (guardada en store / localStorage).
     - Idioma del navegador vía `getLocaleFromNavigator()`.[web:82]
     - `fallbackLocale` (`es`).

4. **Alcance de traducción (fases)**
   - **Fase 1**: landing pública (`src/routes/+page.svelte` + `src/lib/components/landing/*`).[file:50]
   - **Fase 2**: páginas legales (`/privacy`, `/terms`, `/cookies`).[file:50]
   - **Fase 3**: UI de la app (`/dashboard` y componentes en `src/lib/components`).[file:50]
   - **Fase 4**: textos de backend / emails (si los generas desde el servidor).

---

## 1. Infraestructura base de svelte‑i18n

### 1.1 Instalar la librería

En la raíz del proyecto:

```bash
npm i svelte-i18n
```

svelte‑i18n es una librería runtime, ligera, pensada para integrarse directamente con Svelte y SvelteKit.[web:82][web:83]

### 1.2 Estructura de archivos de i18n

Crea la siguiente estructura:

```text
src/
  lib/
    i18n/
      index.ts
      locales/
        en.json
        es.json
```

#### `src/lib/i18n/locales/es.json`

```jsonc
{
  "landing": {
    "title": "CoreBalance — Rebalancea tu cartera de ETFs y Fondos Indexados",
    "metaDescription": "La herramienta definitiva para el inversor indexado. Calcula tu rebalanceo en segundos, optimiza tu cartera y mantén tu estrategia bajo control.",
    "hero": {
      "title": "Rebalancea tu cartera sin complicarte",
      "subtitle": "Importa tus posiciones, define tu objetivo y deja que CoreBalance calcule el rebalanceo perfecto.",
      "cta": "Empezar gratis"
    }
  }
}
```

#### `src/lib/i18n/locales/en.json`

```jsonc
{
  "landing": {
    "title": "CoreBalance — Rebalance your ETF & index fund portfolio",
    "metaDescription": "The definitive tool for index investors. Calculate your rebalancing in seconds, optimize your portfolio and stay on strategy.",
    "hero": {
      "title": "Rebalance your portfolio without the hassle",
      "subtitle": "Import your positions, define your target and let CoreBalance compute the perfect rebalance.",
      "cta": "Get started for free"
    }
  }
}
```

Puedes ir ampliando estos JSON a medida que migres secciones (features, FAQs, etc.).

### 1.3 Configuración de svelte‑i18n

`src/lib/i18n/index.ts`:

```ts
import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

const FALLBACK_LOCALE = 'es';

register('es', () => import('./locales/es.json'));
register('en', () => import('./locales/en.json'));

let initialized = false;

export function setupI18n(initialLocale?: string) {
  if (initialized) return;
  initialized = true;

  init({
    fallbackLocale: FALLBACK_LOCALE,
    initialLocale: initialLocale || getLocaleFromNavigator() || FALLBACK_LOCALE
  });
}
```

- `register` carga las traducciones de forma lazy.[web:80]
- `getLocaleFromNavigator()` usa el idioma del navegador como base.[web:82]

---

## 2. Integración en el layout raíz

Tu layout raíz es `src/routes/+layout.svelte`.[file:50]

### 2.1 Inicializar i18n en `+layout.svelte`

En el `<script>` del layout:

```svelte
<script lang="ts">
  import { setupI18n } from '$lib/i18n';
  import { waitLocale } from 'svelte-i18n';

  const i18nPromise = (async () => {
    setupI18n();
    await waitLocale();
  })();
</script>
```

Y envolver el contenido en un `await`:

```svelte
{#await i18nPromise}
  <!-- Loading mínimo o nada -->
  <div></div>
{:then}
  <slot />
{/await}
```

- Esto asegura que, cuando se renderiza la página, ya se ha decidido un locale inicial (navegador o fallback).[web:80]

### 2.2 Flags de SSR / prerender

Tu `src/routes/+layout.ts` actual:[file:50]

```ts
export const ssr = false;
export const prerender = true;
```

Para no tocar nada sensible, puedes dejarlo así de momento. svelte‑i18n funciona bien en modo client‑side también; más adelante, si quieres SSR para SEO, se puede ajustar.

---

## 3. Selector de idioma global (sin cambiar la URL)

### 3.1 Componente `LanguageSwitcher.svelte`

Crea `src/lib/components/LanguageSwitcher.svelte`:

```svelte
<script lang="ts">
  import { locale, getLocaleFromNavigator } from 'svelte-i18n';
  import { onMount } from 'svelte';

  const availableLocales = ['es', 'en'] as const;
  let current = 'es';

  onMount(() => {
    const navLocale = getLocaleFromNavigator();
    if (navLocale?.startsWith('en')) current = 'en';
    else current = 'es';
  });

  function switchLocale(newLocale: string) {
    if (newLocale === current) return;
    current = newLocale;
    locale.set(newLocale);
    // Opcional: persistencia manual
    // localStorage.setItem('locale', newLocale);
  }
</script>

<div class="language-switcher" aria-label="Language">
  {#each availableLocales as code}
    <button
      type="button"
      class:active={code === current}
      on:click={() => switchLocale(code)}
    >
      {code.toUpperCase()}
    </button>
  {/each}
</div>

<style>
  .language-switcher {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .language-switcher button {
    font-size: 0.875rem;
    opacity: 0.6;
  }
  .language-switcher button.active {
    opacity: 1;
    font-weight: 600;
    text-decoration: underline;
  }
</style>
```

### 3.2 Usarlo en la landing

En `src/lib/components/landing/LandingNavBar.svelte`:[file:50]

```svelte
<script lang="ts">
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  // otros imports
</script>

<nav>
  <!-- logo, enlaces, CTA... -->

  <LanguageSwitcher />
</nav>
```

- El cambio de idioma afecta a toda la app, porque `locale` es un store global.[web:82]

---

## 4. Internacionalizar la landing

### 4.1 Meta tags en `LandingPage.svelte`

1. Mueve `<title>` y `meta description` a `locales/*` (como en 1.2).
2. En `src/lib/components/landing/LandingPage.svelte`:[file:50]

```svelte
<script lang="ts">
  import LandingNavBar from './LandingNavBar.svelte';
  import Hero from './Hero.svelte';
  import Features from './Features.svelte';
  // ...

  import { _ } from 'svelte-i18n';
  const $t = _;

  const schemaData = { /* tu JSON-LD actual */ };
  const schemaString = JSON.stringify(schemaData);
</script>

<svelte:head>
  <title>{$t('landing.title')}</title>
  <meta name="description" content={$t('landing.metaDescription')} />

  <!-- puedes añadir og:title/og:description usando las mismas claves si quieres -->

  {@html `<script type="application/ld+json">${schemaString}</script>`}
</svelte:head>
```

- `_` es el store de svelte‑i18n que devuelve la función de traducción.[web:82]

### 4.2 `Hero.svelte`

Ejemplo de migración:

Antes (aprox.):

```svelte
<h1>Rebalancea tu cartera sin complicarte</h1>
<p>Importa tus posiciones, define tu objetivo y deja que CoreBalance calcule el rebalanceo perfecto.</p>
<button>Empezar gratis</button>
```

Después:

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  const $t = _;
</script>

<h1>{$t('landing.hero.title')}</h1>
<p>{$t('landing.hero.subtitle')}</p>
<button>{$t('landing.hero.cta')}</button>
```

Con las claves definidas en `locales/es.json` y `locales/en.json`.[web:82]

### 4.3 Resto de componentes de landing

En esta fase, repite el mismo patrón para:

- `Features.svelte`
- `Comparison.svelte`
- `Cta.svelte`
- `WhyUs.svelte`
- `HowItWorks.svelte`
- `HowToRebalance.svelte`
- `EducationalFAQ.svelte`
- `LandingFooter.svelte`

Pasos:

1. Buscar strings literales (títulos, descripciones, bullets, CTA).
2. Crear claves en `locales/*` bajo `landing.features.*`, `landing.cta.*`, etc.
3. Sustituir por `$t('landing.features.xxx')`.

Prioriza primero lo que aparece en fold 1 (hero, CTA principal, resumen de valor) y luego el resto.

---

## 5. Páginas legales

Archivos relevantes:[file:50]

- `src/routes/privacy/+page.svelte`
- `src/routes/terms/+page.svelte`
- `src/routes/cookies/+page.svelte`

### 5.1 Definir textos en `locales/*`

Ejemplo en `es.json`:

```jsonc
"legal": {
  "privacy": {
    "title": "Política de privacidad",
    "intro": "En CoreBalance nos tomamos muy en serio tu privacidad..."
  },
  "terms": {
    "title": "Términos y condiciones"
  },
  "cookies": {
    "title": "Política de cookies"
  }
}
```

Y las traducciones correspondientes en `en.json`.

### 5.2 Usar `$t` en las páginas

En cada `+page.svelte` legal:

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  const $t = _;
</script>

<h1>{$t('legal.privacy.title')}</h1>
<p>{$t('legal.privacy.intro')}</p>
```

El resto del contenido se puede ir trasladando a claves, o dejar algunos bloques estáticos si solo quieres traducción parcial al principio.

---

## 6. Internacionalizar el dashboard

Archivos clave para la app logueada:[file:50]

- `src/routes/dashboard/+page.svelte`
- Componentes:
  - `src/lib/components/HeroSummary.svelte`
  - `src/lib/components/RebalancePanel.svelte`
  - `src/lib/components/PortfolioSection.svelte`
  - `src/lib/components/ImportModal.svelte`
  - `src/lib/components/ManageAssets.svelte`
  - `src/lib/components/SupportModal.svelte`
  - etc.

### 6.1 Namespaces para la app

En `locales/es.json`:

```jsonc
"app": {
  "nav": {
    "dashboard": "Panel",
    "import": "Importar datos",
    "settings": "Ajustes"
  },
  "rebalance": {
    "title": "Rebalanceo",
    "btnRun": "Calcular rebalanceo"
  },
  "import": {
    "title": "Importar cartera",
    "cta": "Subir CSV"
  }
}
```

Y en `en.json`:

```jsonc
"app": {
  "nav": {
    "dashboard": "Dashboard",
    "import": "Import data",
    "settings": "Settings"
  },
  "rebalance": {
    "title": "Rebalancing",
    "btnRun": "Run rebalance"
  },
  "import": {
    "title": "Import portfolio",
    "cta": "Upload CSV"
  }
}
```

### 6.2 Migrar componentes de app

En cada componente:

```svelte
<script lang="ts">
  import { _ } from 'svelte-i18n';
  const $t = _;
</script>

<h2>{$t('app.rebalance.title')}</h2>
<button>{$t('app.rebalance.btnRun')}</button>
```

Sustituye todos los textos visibles: títulos, labels de botones, tooltips, descripciones, etc.

### 6.3 Mensajes de error / validaciones

Revisa:

- `src/lib/utils.ts`
- `src/lib/importers/parsers.ts`
- Componentes como `ImportModal.svelte`, `SupportModal.svelte`.[file:50]

Cualquier mensaje como `"Error al importar el CSV"` → crea una clave `errors.import.csv` y úsala en el componente que muestra el error (no hace falta traducir en el propio código de lógica).

---

## 7. (Opcional) Detección en servidor para futuro SSR

Si más adelante quieres SSR con idioma correcto también en el HTML, puedes:

1. Leer `Accept-Language` en `hooks.server.ts` y guardar `locale` en `event.locals`.
2. En `+layout.server.ts`, devolver `locale` en el `load`.
3. Usar ese `locale` en `setupI18n(locale)` en vez de confiar solo en `getLocaleFromNavigator()`.

La guía oficial de svelte‑i18n para SvelteKit muestra este patrón con inicialización basada en datos del servidor.[web:80][web:14]

---

## 8. Testing y verificación

1. **Pruebas manuales**
   - Cambia el idioma del navegador entre ES/EN y recarga:
     - La landing debería iniciar en el idioma correspondiente.
   - Usa el `LanguageSwitcher`:
     - Comprueba que la landing y partes del dashboard cambian de idioma.

2. **Pruebas en Vercel**
   - Verifica que el build funciona sin errores tras introducir svelte‑i18n.
   - Revisa los tiempos de carga: los JSON de traducciones se cargan lazy.

3. **SEO básico**
   - Usa `view-source:` para ver `<title>` y `meta description` correctamente traducidos.
   - A medio plazo, plantéate reactivar SSR para la parte pública si quieres maximizar SEO internacional.

---

## 9. Orden recomendado de implementación

1. Instalar svelte‑i18n y crear estructura `src/lib/i18n` + `locales/en.json` y `locales/es.json`.
2. Integrar `setupI18n` + `waitLocale` en `src/routes/+layout.svelte`.
3. Crear `LanguageSwitcher.svelte` y usarlo en `LandingNavBar.svelte`.
4. Internacionalizar meta tags y hero en `LandingPage.svelte`.
5. Internacionalizar el resto de componentes de landing.
6. Internacionalizar páginas legales.
7. Internacionalizar componentes del dashboard.
8. Migrar mensajes de error y validaciones.
9. (Opcional) Añadir detección en servidor y SSR parcial para la landing.

Siguiendo estas fases puedes introducir i18n en CoreBalance de forma incremental y controlada, empezando por la landing y pasando después a la app, sin tocar tus URLs ni complicar el routing.[file:50][web:10][web:80]