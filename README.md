# CoreBalance — Gestión y rebalanceo de carteras de fondos indexados y ETFs

**Gestiona y rebalancea tu cartera indexada, gratis y sin registro.** Define tu *asset allocation* objetivo, importa tus operaciones (MyInvestor, DEGIRO, Trading 212, Interactive Brokers o cualquier CSV), sigue tu coste medio, dividendos, intereses de cuentas remuneradas y TER, y CoreBalance calcula exactamente cuánto comprar de cada activo — priorizando las nuevas aportaciones para que no tengas que vender ni tributar. Sin cuentas bancarias enlazadas y con los datos guardados sólo en tu navegador.

🔗 **[corebalance.app](https://corebalance.app)** · 🇬🇧 **[English version](https://corebalance.app/en)** · 📖 **[Blog](https://corebalance.app/blog)**

[![Svelte 5](https://img.shields.io/badge/Svelte-5_Runes-FF3E00?logo=svelte)](https://svelte.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-00a8cc?logo=pwa)](https://vite-pwa-org.netlify.app/)
[![Redis](https://img.shields.io/badge/Cache-Upstash_Redis-ED1C24?logo=redis)](https://upstash.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![CoreBalance](https://github.com/kinacho/Rebalanceador-90-5-5/raw/main/static/og/landing-es.png)

---

## ¿Qué problema resuelve?

Si inviertes en fondos indexados o ETFs con una estrategia pasiva (Bogleheads, cartera de 3 fondos, 80/20 MSCI World + Emerging Markets…), tu cartera se desvía de los pesos objetivo cada vez que los mercados se mueven. Rebalancearla a mano en una hoja de cálculo es tedioso, se rompe cuando fallan las APIs de precios y es fácil equivocarse con los porcentajes.

CoreBalance hace ese cálculo en segundos y, sobre todo, **prioriza rebalancear con las aportaciones nuevas en lugar de vendiendo**, que es lo que evita realizar plusvalías y pagar impuestos antes de tiempo.

## Características

- **Rebalanceo por aportación (*cash-flow rebalancing*)** — reparte tu aportación mensual entre los activos infraponderados para corregir la desviación sin vender nada.
- **Cálculo de desviación por bandas** — cuánto se ha ido cada activo de su peso objetivo y cuánto hay que mover para volver.
- **Importación CSV de brókers** — MyInvestor, DEGIRO, Trading 212, Interactive Brokers y un formato genérico. El parser agrupa transacciones y calcula el precio medio ponderado.
- **Ledger de transacciones** — compras, ventas, dividendos y traspasos por activo, con coste medio ponderado.
- **Precios en tiempo real** — valor actual, P&L no realizado y evolución de la cartera.
- **Simulador de crisis** — proyecta caídas históricas reales sobre tu cartera para medir tu tolerancia al riesgo.
- **Calculadora de TER** — TER medio ponderado y cuánto te ahorras a 30 años frente a fondos activos.
- **100% local y sin registro** — los datos viven en IndexedDB, en tu navegador. Nada sale de tu dispositivo.
- **PWA instalable** con soporte offline, en español e inglés.

## Herramientas y guías

| | |
|---|---|
| 🧮 [Calculadora de TER](https://corebalance.app/herramientas/calculadora-ter) | TER ponderado y simulación de comisiones a largo plazo |
| ✅ [¿Toca rebalancear?](https://corebalance.app/herramientas/checklist-rebalanceo) | Cuestionario de 4 preguntas con recomendación |
| 📊 [vs Excel / Google Sheets](https://corebalance.app/comparativas/corebalance-vs-excel) | Comparativa frente a las hojas de cálculo |
| 🤖 [vs Indexa Capital](https://corebalance.app/comparativas/corebalance-vs-indexa-capital) | Comparativa frente a un robo-advisor |
| 🖥️ [vs Portfolio Performance](https://corebalance.app/comparativas/corebalance-vs-portfolio-performance) | Comparativa frente a la app de escritorio |

Guías destacadas del blog: [cómo rebalancear una cartera indexada](https://corebalance.app/blog/como-rebalancear-cartera-indexada) · [rebalancear sin pagar impuestos en España](https://corebalance.app/blog/rebalancear-sin-pagar-impuestos-espana) · [traspasos de fondos indexados y Hacienda](https://corebalance.app/blog/traspasos-fondos-indexados-hacienda) · [IWDA vs VWCE](https://corebalance.app/blog/iwda-vs-vwce-comparativa) · [fondos indexados vs ETFs](https://corebalance.app/blog/fondos-indexados-vs-etfs-espana)

## Stack

- **Frontend**: [Svelte 5](https://svelte.dev/) (runes) + SvelteKit + Vite
- **Almacenamiento local**: [Dexie.js](https://dexie.org/) sobre IndexedDB
- **Caché de precios**: [Upstash Redis](https://upstash.com/)
- **Datos de mercado**: API híbrida (Yahoo Finance + Financial Times) con redundancia
- **Contenido**: [mdsvex](https://mdsvex.pngwn.io/) — el blog son markdown prerenderizados
- **Despliegue**: Vercel

## Privacidad

- **Local-first**: el cálculo y el almacenamiento ocurren en el cliente.
- **Sin registro**: no hace falta cuenta para usar la calculadora. La sincronización en la nube es opcional y sólo para quien inicia sesión.
- **Sin enlazar cuentas bancarias**: los datos entran a mano o por CSV.

## Desarrollo

```bash
git clone https://github.com/kinacho/Rebalanceador-90-5-5.git
cd Rebalanceador-90-5-5
cp .env.example .env    # necesario: ver abajo
npm install
npm run dev
```

**Copia `.env.example` a `.env` aunque no vayas a rellenarlo.** SvelteKit genera los tipos de `$env/static/public` a partir de las variables que existen, así que sin ese fichero `npm run check` falla con `Module '"$env/static/public"' has no exported member 'PUBLIC_USE_FIREBASE'`. Con el ejemplo vacío basta para que compile.

Los valores sólo hacen falta para funcionalidades concretas: `KV_REST_API_URL` y `KV_REST_API_TOKEN` para la caché de precios en Redis (sin ellos degrada a memoria por proceso), `VITE_FIREBASE_*` para la sincronización opcional en la nube, y `RESEND_API_KEY` para el formulario de soporte. La calculadora funciona sin ninguno.

### Scripts útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo + regeneración de tipos i18n |
| `npm run build` | Build de producción (lanza antes `prebuild`: iconos, OG images y `llms.txt`) |
| `npm run check` | `svelte-check` sobre todo el proyecto |
| `npm test` | Tests unitarios (Vitest) |
| `npm run seo:audit` | Audita el HTML construido: metadatos duplicados, `hreflang`, JSON-LD, imágenes OG y enlaces rotos (requiere `npm run build` antes) |
| `npm run icons` | Regenera los iconos de `static/` desde los masters de `assets/` |
| `npm run og` | Regenera todas las imágenes Open Graph |
| `npm run llms` | Regenera `llms.txt` y `llms-es.txt` desde las plantillas |
| `npm run indexnow` | Avisa a IndexNow de las URLs modificadas |

## Contribuir

Los *issues* son bienvenidos y son la mejor forma de aportar: fallos, cálculos que no cuadran, CSV de un bróker que no se detecta bien. Si encuentras un error de cálculo, incluye los pesos objetivo y los importes con los que lo reproduces.

Los *pull requests* también, con dos peticiones para que no acabemos perdiendo el tiempo ninguno de los dos:

- **Para una funcionalidad nueva, abre antes una issue** y hablamos del enfoque. Un PR grande sin acuerdo previo es difícil de aceptar.
- Correcciones de fallos, documentación y traducciones: adelante directamente.

CoreBalance lo mantiene **una sola persona en su tiempo libre**. Leo todo, pero no hay compromiso de plazo de respuesta ni garantía de que una propuesta acabe integrándose.

### Datos de prueba

`training/` está ignorado por completo porque contiene exports reales de bróker con datos personales. Las suites que dependen de esos ficheros hacen `skip` cuando no están, así que un clon limpio pasa la batería entera. Si quieres ejecutarlas, mira `training/README.md`.

## Seguridad

Si encuentras una vulnerabilidad, no abras una issue pública: escribe a `kino166@gmail.com`. Ver [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE). Puedes usar, modificar y distribuir el código, incluso comercialmente, conservando el aviso de copyright.

---

Hecho para la comunidad inversora por [kinacho](https://github.com/kinacho).

**CoreBalance es una herramienta de cálculo con fines informativos. No constituye asesoramiento financiero ni una recomendación de compra o venta de ningún producto. Invierte siempre bajo tu propia responsabilidad.**
