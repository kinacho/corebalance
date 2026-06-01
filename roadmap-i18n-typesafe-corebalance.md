# Roadmap i18n — CoreBalance.app con typesafe-i18n

> Stack: SvelteKit 5 · TypeScript (strict) · Vercel · Sin rutas `/es` o `/en` en la URL.  
> Idiomas iniciales: `es` (base) + `en`.  
> Detección automática por idioma del navegador (`Accept-Language`). Selector manual con preferencia guardada en cookie.

---

## Fase 0 — Instalación y configuración base ✅

### 1. Instalar dependencias ✅

```bash
npm install -D typesafe-i18n npm-run-all
```

- `typesafe-i18n`: la librería principal y su generador de tipos.
- `npm-run-all`: necesario para correr el watcher de i18n y el servidor de Vite en paralelo durante el desarrollo.

### 2. Ejecutar el setup automático ✅

```bash
npx typesafe-i18n --setup-auto
```

Esto genera el archivo `.typesafe-i18n.json` en la raíz del proyecto. Ábrelo y añade `outputPath` y `adapter`:

**.typesafe-i18n.json**
```json
{
  "adapter": "svelte",
  "baseLocale": "es",
  "outputPath": "./src/lib/i18n/",
  "$schema": "https://unpkg.com/typesafe-i18n/schema/typesafe-i18n.json"
}
```

> **Importante**: `baseLocale` debe ser `"es"` si el español es tu idioma principal en CoreBalance. El archivo `es/index.ts` será el contrato de tipos del que derivarán el resto de traducciones.

### 3. Actualizar `package.json` ✅

Modifica el script `dev` para arrancar el generador de tipos en paralelo al servidor:

```json
"scripts": {
  "dev": "npm-run-all --parallel vite:dev typesafe-i18n",
  "vite:dev": "vite dev",
  "typesafe-i18n": "typesafe-i18n",
  "build": "vite build",
  "preview": "vite preview"
}
```

### 4. Primer `npm run dev` ✅

Al arrancar, el generador creará automáticamente esta estructura dentro de `src/lib/i18n/`:

```
src/lib/i18n/
├── es/
│   └── index.ts          ← tus traducciones base en español
├── en/
│   └── index.ts          ← traducciones en inglés
├── custom-types.ts       ← tipos personalizados (editable)
├── formatters.ts         ← formatters de fecha, número, moneda (editable)
├── i18n-types.ts         ← tipos generados automáticamente (NO editar)
├── i18n-util.async.ts    ← carga async de locales (NO editar)
├── i18n-util.sync.ts     ← carga sync (NO editar)
└── i18n-util.ts          ← utilidades generadas (NO editar)
```

---

## Fase 1 — Definir los diccionarios de traducción ✅

### Estructura del archivo base (`es/index.ts`) ✅

Este es el contrato. Todo lo que pongas aquí **debe** existir también en `en/index.ts`.

```typescript
// src/lib/i18n/es/index.ts
import type { BaseTranslation } from '../i18n-types';

const es = {
  // Landing
  landing: {
    hero_title: 'Controla tu cartera de inversiones',
    hero_subtitle: 'Gestiona tus activos, sigue tu rentabilidad y rebalancea con claridad.',
    cta_primary: 'Empezar gratis',
    cta_secondary: 'Ver demo',
  },
  // ... (ver archivo para lista completa de claves)
} satisfies BaseTranslation;

export default es;
```

### Archivo de inglés (`en/index.ts`) ✅

```typescript
// src/lib/i18n/en/index.ts
import type { Translation } from '../i18n-types';

const en: Translation = {
  landing: {
    hero_title: 'Control your investment portfolio',
    hero_subtitle: 'Manage your assets, track your performance and rebalance with clarity.',
    cta_primary: 'Get started for free',
    cta_secondary: 'See demo',
  },
  // ... (ver archivo para lista completa de claves)
};

export default en;
```

> **Flujo de trabajo**: cada vez que añadas o cambies una clave en `es/index.ts`, el generador recomputará `i18n-types.ts`. TypeScript te mostrará error en `en/index.ts` hasta que completes la clave. Así nunca hay una traducción "olvidada".

---

## Fase 2 — Detección de idioma en el servidor ✅

### Actualizar `src/app.d.ts` ✅

Añade `locale` a los `locals` de SvelteKit para que esté disponible en toda la cadena SSR:

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      locale: import('$lib/i18n/i18n-types').Locales;
    }
  }
}
export {};
```

### Crear / actualizar `src/hooks.server.ts` ✅

Este hook detecta el idioma del usuario en cada request: primero mira la cookie `lang`, luego el header `Accept-Language`, y por defecto usa `es`.

```typescript
// src/hooks.server.ts (Implementado)
```

---

## Fase 3 — Cargar el locale en el layout ✅

### `src/routes/+layout.server.ts` ✅

Pasa el locale desde el servidor al cliente:

```typescript
// src/routes/+layout.server.ts (Implementado)
```

### `src/routes/+layout.ts` ✅

Inicializa el locale en el cliente (hidratación después del SSR):

```typescript
// src/routes/+layout.ts (Implementado)
```

---

## Fase 4 — Selector de idioma (componente) ✅

Crea un componente reutilizable que permita cambiar el idioma y guardar la preferencia en una cookie:

```svelte
<!-- src/lib/components/LanguageSwitcher.svelte -->
<!-- Implementado e integrado en LandingNavBar.svelte -->
```

---

## Fase 5 — Usar traducciones en componentes (Landing Completa) ✅

En cualquier `.svelte`, importa `$LL` y úsalo directamente:

```svelte
<!-- Ejemplo: src/lib/components/Hero.svelte -->
<script lang="ts">
  import { LL } from '$lib/i18n/i18n-svelte';
</script>

<section>
  <h1>{$LL.landing.hero_title()}</h1>
</section>
```

> **Estado**: La Landing Page pública (`Hero`, `Features`, `Comparison`, `HowItWorks`, `WhyUs`, `HowToRebalance`, `EducationalFAQ`, `CTA`, `Footer`) está 100% migrada.

---

## Fase 6 — Formatters (fechas, números, moneda)

Para CoreBalance son especialmente relevantes los formatters de número y moneda. Edita `src/lib/i18n/formatters.ts`:

```typescript
// src/lib/i18n/formatters.ts
import type { FormattersInitializer } from 'typesafe-i18n';
import type { Locales, Formatters } from './i18n-types';
import { date, number } from 'typesafe-i18n/formatters';

export const initFormatters: FormattersInitializer<Locales, Formatters> = (locale: Locales) => {
  const currencyCode = locale === 'es' ? 'EUR' : 'USD';

  const formatters: Formatters = {
    shortDate: date(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    percent: number(locale, { style: 'percent', minimumFractionDigits: 2 }),
    currency: number(locale, { style: 'currency', currency: currencyCode }),
    compactNumber: number(locale, { notation: 'compact', maximumFractionDigits: 1 }),
  };

  return formatters;
};
```

Luego úsalos en las claves de traducción:

```typescript
// es/index.ts
portfolio: {
  total_value: 'Valor total: {value:number|currency}',
  change_percent: 'Variación: {value:number|percent}',
}
```

---

## Fase 7 — Orden de migración de componentes

Prioriza por visibilidad pública y SEO primero, luego la app autenticada:

| Prioridad | Zona | Componentes | Estado |
|-----------|------|-------------|--------|
| 1 | Landing pública | `Hero.svelte`, `LandingNavBar.svelte`, meta tags | ✅ COMPLETADO |
| 2 | Landing pública | Features, Comparison, WhyUs, HowItWorks, Footer | ✅ COMPLETADO |
| 3 | Landing pública | Páginas legales (Privacy, Terms, Cookies) | ⏳ EN PROCESO (SEO OK) |
| 4 | App autenticada | Dashboard principal, KPIs | 📅 PENDIENTE |
| 5 | App autenticada | Formularios (añadir activo, importar, ledger) | 📅 PENDIENTE |
| 6 | App autenticada | Mensajes de error, estados vacíos, toasts | 📅 PENDIENTE |

---

## Fase 8 — Meta tags con i18n (SEO) ✅

En `+layout.svelte` o en cada `+page.svelte`, usa las claves i18n en las meta tags:

```svelte
<!-- src/routes/dashboard/LandingPage.svelte (Implementado) -->
```

---

## Fase 9 — Vercel (producción)

No hay ninguna configuración especial para Vercel. Al hacer `build`, typesafe-i18n genera los archivos de tipos y los bundles de traducción estáticos. El adapter de SvelteKit para Vercel los incluye automáticamente.

Verifica que el script `build` en `package.json` **no** incluya `typesafe-i18n` en el watch mode (solo en `dev`):

```json
"scripts": {
  "dev": "npm-run-all --parallel vite:dev typesafe-i18n",
  "vite:dev": "vite dev",
  "typesafe-i18n": "typesafe-i18n",
  "build": "vite build",
  "preview": "vite preview"
}
```

> En CI/CD de Vercel, `vite build` ya llama al compilador que incluye los archivos generados. El watcher de typesafe-i18n solo es necesario en desarrollo.

---

## Resumen de archivos a crear o modificar

| Archivo | Acción | Estado |
|---------|--------|--------|
| `.typesafe-i18n.json` | Crear (generado por setup, luego editar) | ✅ |
| `package.json` | Modificar scripts `dev` | ✅ |
| `src/app.d.ts` | Añadir `locale` a `App.Locals` | ✅ |
| `src/hooks.server.ts` | Crear o actualizar con detección de locale | ✅ |
| `src/routes/+layout.server.ts` | Crear/actualizar para pasar locale | ✅ |
| `src/routes/+layout.ts` | Crear/actualizar para hidratar locale en cliente | ✅ |
| `src/lib/i18n/es/index.ts` | Crear con traducciones base en español | ✅ |
| `src/lib/i18n/en/index.ts` | Crear con traducciones en inglés | ✅ |
| `src/lib/i18n/formatters.ts` | Editar con formatters de moneda/número | 📅 PENDIENTE |
| `src/lib/components/LanguageSwitcher.svelte` | Crear componente selector de idioma | ✅ |
| Todos los `.svelte` con texto | Migrar usando `$LL.<clave>()` | 📅 30% COMPLETADO (LANDING OK) |
