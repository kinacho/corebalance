# CoreBalance — Gestión y rebalanceo de carteras de fondos indexados y ETFs

**Gestiona y rebalancea tu cartera indexada, gratis y sin registro.** Define tu *asset allocation* objetivo, importa tus operaciones (MyInvestor, DEGIRO, Trading 212, Interactive Brokers o cualquier CSV), sigue tu coste medio, dividendos, intereses de cuentas remuneradas y TER, y CoreBalance calcula exactamente cuánto comprar de cada activo — priorizando las nuevas aportaciones para que no tengas que vender ni tributar. Sin cuentas bancarias enlazadas y con los datos guardados sólo en tu navegador.

🔗 **[corebalance.app](https://corebalance.app)** · 🇬🇧 **[English version](https://corebalance.app/en)** · 📖 **[Blog](https://corebalance.app/blog)**

[![Svelte 5](https://img.shields.io/badge/Svelte-5_Runes-FF3E00?logo=svelte)](https://svelte.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-00a8cc?logo=pwa)](https://vite-pwa-org.netlify.app/)
[![Redis](https://img.shields.io/badge/Cache-Upstash_Redis-ED1C24?logo=redis)](https://upstash.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Apoya el proyecto](https://img.shields.io/badge/Apoya_el_proyecto-PayPal-0070ba?logo=paypal&logoColor=white)](#apoya-el-proyecto)

![CoreBalance](https://corebalance.app/og/landing-es.png)

---

## ¿Qué problema resuelve?

Si inviertes en fondos indexados o ETFs con una estrategia pasiva (Bogleheads, cartera de 3 fondos, 80/20 MSCI World + Emerging Markets…), tu cartera se desvía de los pesos objetivo cada vez que los mercados se mueven. Rebalancearla a mano en una hoja de cálculo es tedioso, se rompe cuando fallan las APIs de precios y es fácil equivocarse con los porcentajes.

CoreBalance hace ese cálculo en segundos y, sobre todo, **prioriza rebalancear con las aportaciones nuevas en lugar de vendiendo**, que es lo que evita realizar plusvalías y pagar impuestos antes de tiempo.

## Características

- **Rebalanceo por aportación (*cash-flow rebalancing*)** — reparte tu aportación mensual entre los activos infraponderados para corregir la desviación sin vender nada.
- **Rebalanceo por traspaso, con coste fiscal cero** — entre fondos de inversión mover dinero no tributa en España (diferimiento del art. 94 LIRPF), así que calcula el movimiento exacto hasta el objetivo sin generar plusvalía. Y cuando toca vender ETFs o acciones, te dice cuánto cuesta de verdad: plusvalía por FIFO desde tu ledger e impuesto por los tramos del ahorro, comparado contra los meses que tardaría la vía de solo aportar.
- **Aviso de la regla antiaplicación** — dos meses en cotizados, un año en participaciones de fondos. Antes de proponerte una venta con pérdidas, te avisa de si esa pérdida compensaría este ejercicio o quedaría diferida.
- **Cálculo de desviación por bandas** — cuánto se ha ido cada activo de su peso objetivo y cuánto hay que mover para volver.
- **Mapa de desviación y transparencia del subyacente** — la cartera en rectángulos, **seccionada por bloque de estrategia**: el bloque con objetivos se colorea por distancia a ellos y los que no los tienen llevan su propio tono, porque marcar como excepción a un activo que nunca tuvo objetivo no informa de nada. Y la exposición real por región y sector que hay dentro de tus fondos, con aviso cuando dos posiciones apuntan a las mismas empresas.
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
| 📉 [Simulador de crisis](https://corebalance.app/herramientas/simulador-crisis) | Proyecta caídas históricas reales sobre tu cartera |
| ➗ [Calculadora de precio medio](https://corebalance.app/herramientas/calculadora-precio-medio) | Coste medio ponderado de compras a distintos precios |
| ✅ [¿Toca rebalancear?](https://corebalance.app/herramientas/checklist-rebalanceo) | Cuestionario de 4 preguntas con recomendación |
| 📊 [vs Excel / Google Sheets](https://corebalance.app/comparativas/corebalance-vs-excel) | Comparativa frente a las hojas de cálculo |
| 🤖 [vs Indexa Capital](https://corebalance.app/comparativas/corebalance-vs-indexa-capital) | Comparativa frente a un robo-advisor |
| 🖥️ [vs Portfolio Performance](https://corebalance.app/comparativas/corebalance-vs-portfolio-performance) | Comparativa frente a la app de escritorio |
| 🌐 [vs JustETF](https://corebalance.app/comparativas/corebalance-vs-justetf) | Comparativa frente al buscador y cartera de JustETF |
| 🔓 [vs Ghostfolio](https://corebalance.app/comparativas/corebalance-vs-ghostfolio) | Comparativa frente a la alternativa autoalojable |

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

## Apoya el proyecto

Esa página de privacidad tan corta tiene una consecuencia: **no hay anuncios, ni analítica que te siga, ni plan de pago detrás de un botón, ni datos que vender** — difícilmente, cuando no se recoge ninguno. Lo que sí hay son costes que no desaparecen: el dominio, la caché de precios en Upstash, el despliegue y las horas de una sola persona en su tiempo libre.

<div align="center">

[![Donar 5 €](https://img.shields.io/badge/Donar-5%E2%82%AC-10b981?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/kinacho/5EUR)
[![Donar 10 €](https://img.shields.io/badge/Donar-10%E2%82%AC-10b981?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/kinacho/10EUR)
[![Donar 20 €](https://img.shields.io/badge/Donar-20%E2%82%AC-10b981?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/kinacho/20EUR)
[![Otro importe](https://img.shields.io/badge/Otro_importe-0070ba?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/kinacho)

</div>

Son los mismos importes que aparecen dentro de la app, y van al mismo sitio: [paypal.me/kinacho](https://paypal.me/kinacho).

Conviene decir la otra mitad: **esto no desbloquea nada**. No hay versión pro, no hay funciones reservadas, no hay recordatorios y la calculadora seguirá siendo gratuita y sin registro con donaciones y sin ellas. Si CoreBalance te ha ahorrado una tarde de hoja de cálculo, cinco euros lo dicen mejor que una estrella; y si no, úsala igual — para eso está.

## Desarrollo

```bash
git clone https://github.com/kinacho/corebalance.git
cd corebalance
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
| `npm run test:coverage` | Los mismos tests más los umbrales de cobertura por fichero de los módulos que calculan dinero. **Es lo que ejecuta CI**, así que si esto pasa, el pipeline pasa |
| `npm run test:e2e` | Tests de navegador (Playwright) sobre el build. Requiere `npm run build` antes |
| `npm run test:quality` | Busca tests que no pueden fallar: tautologías y tests sin ninguna aserción |
| `npm run docs:check` | Busca identificadores y rutas citados en `CLAUDE.md` que ya no existen en el código |
| `npm run test:mutation` | Mutation testing sobre los seis módulos de dinero: muta el código y comprueba si algún test se queja. Tarda ~18 min y no es una puerta de CI, es una auditoría (semanal). Se ejecuta con `npx`, no es una dependencia |
| `npm run seo:audit` | Audita el HTML construido: metadatos duplicados, `hreflang`, JSON-LD, imágenes OG y enlaces rotos (requiere `npm run build` antes) |
| `npm run icons` | Regenera los iconos de `static/` desde los masters de `assets/` |
| `npm run og` | Regenera todas las imágenes Open Graph |
| `npm run llms` | Regenera `llms.txt` y `llms-es.txt` desde las plantillas |
| `npm run indexnow` | Avisa a IndexNow de las URLs modificadas |
| `npm run preview` | Sirve el build de producción en local (necesario para `seo:audit`) |
| `npm run backtest` | Regenera el dataset histórico 80/20 desde datos reales de Yahoo |
| `npm run measure:filters` | Mide en móvil throttleado lo que cuestan el degradado, el ruido y los `backdrop-filter`. Imprime su propio suelo de ruido: léelo antes de creerte cualquier diferencia |

## Contribuir

Los *issues* son bienvenidos y son la mejor forma de aportar: fallos, cálculos que no cuadran, CSV de un bróker que no se detecta bien. Si encuentras un error de cálculo, incluye los pesos objetivo y los importes con los que lo reproduces.

Los *pull requests* también, con dos peticiones para que no acabemos perdiendo el tiempo ninguno de los dos:

- **Para una funcionalidad nueva, abre antes una issue** y hablamos del enfoque. Un PR grande sin acuerdo previo es difícil de aceptar.
- Correcciones de fallos, documentación y traducciones: adelante directamente.

Antes de abrir el PR, `npm run test:coverage` te dice si va a pasar CI. Dos cosas que sorprenden a quien no las espera:

- Los seis módulos que calculan dinero (`fiscal`, `traspaso`, `rebalance`, `lookthrough`, `treemap`, `instrument-type`) tienen **umbrales de cobertura por fichero**, puestos a la medida del día en que se escribieron. Solo pueden subir: código nuevo sin probar ahí rompe el pipeline.
- Un test **sin ninguna aserción, o con una tautología**, hace fallar la batería (`npm run test:quality`). Si de verdad no hay nada que afirmar, usa `it.skip` con el motivo: en el informe sale como omitido, que es la verdad.

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
