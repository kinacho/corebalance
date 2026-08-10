import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { imagetools } from 'vite-imagetools';
import { visualizer } from 'rollup-plugin-visualizer';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
	// La versión viaja al schema SoftwareApplication de la landing; leerla de
	// package.json evita que se quede desfasada en un literal.
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	plugins: [
		tailwindcss(),
		imagetools(),
		sveltekit(),
		...(process.env.ANALYZE === 'true' ? [visualizer({ emitFile: true, filename: 'stats.html' })] : []),
		SvelteKitPWA({
			// ⚠️ `prompt`, no `autoUpdate`, y no es una preferencia estética.
			//
			// Con `autoUpdate` el módulo virtual recarga la pestaña **sin preguntar** en
			// cuanto el service worker nuevo toma el control (escucha `controlling` y
			// llama a `location.reload()`). En una app cuyo estado vive en el cliente eso
			// es pérdida de datos: un despliegue en mitad de un import de CSV, de una
			// edición en Gestionar activos o del panel fiscal se lleva el trabajo por
			// delante y el usuario no ha pedido nada. Y `onNeedRefresh` **no se invoca**
			// en modo `autoUpdate`, así que no hay forma de avisar sin cambiar de modo.
			//
			// En `prompt` el worker nuevo espera; quien decide recargar es el usuario
			// desde `UpdatePrompt.svelte`.
			registerType: 'prompt',
			// `false` a propósito: el registro es explícito en `+layout.svelte` (ver el
			// comentario de allí). Con `'auto'` el plugin generaba y desplegaba un
			// `registerSW.js` que nunca insertaba en el HTML — un fichero muerto servido
			// con 200 que además hacía creer que la PWA estaba registrada.
			injectRegister: false,
			/**
			 * ⚠️ **Sin estas dos líneas el service worker sólo se registraba en la raíz y en
			 * las rutas de primer nivel.** Por defecto el módulo virtual compila
			 * `new Workbox('./sw.js', { scope: './' })` —comprobado leyendo el bundle— y una
			 * URL relativa se resuelve contra el directorio de la página: en
			 * `/en/herramientas` pide `/en/sw.js`, en `/blog/importar-csv-degiro` pide
			 * `/blog/sw.js`, y las dos son 404. Sólo `/` y las rutas de un nivel
			 * (`/herramientas`, `/blog`) acertaban, porque su directorio ya es la raíz.
			 *
			 * Medido en producción el 10-ago-2026 renderizando con Chromium: dos errores de
			 * consola —404 del script y `TypeError` al registrar, con el scope delatando la
			 * carpeta— en las 35 URLs inglesas, los 24 posts del blog, las cuatro
			 * herramientas y las comparativas individuales. Cero errores en `/`.
			 *
			 * O sea que la PWA que se arregló para que «por fin existiera» seguía sin existir
			 * para quien entra por un post desde Google, que es el caso normal: precache,
			 * modo offline y `beforeinstallprompt` sólo funcionaban entrando por la home.
			 * Es el mismo patrón que este repo ya tiene documentado dos veces en la PWA —un
			 * fallo silencioso que deja la impresión de estar resuelto—, y salió mirando la
			 * consola de una página `/en/*`, no leyendo el código.
			 *
			 * El scope tiene que ser `/` para que el worker controle todo el sitio, no sólo
			 * la carpeta desde la que se registró.
			 */
			base: '/',
			scope: '/',
			devOptions: {
				enabled: true,
				// ⚠️ En desarrollo el `globDirectory` de Workbox es `dev-dist/`, no el output
				// del build, y ahí no hay nada que precachear **por diseño**: el service
				// worker de dev existe para poder probar el registro, no para cachear. Así
				// que cada patrón de `globPatterns` imprimía un «doesn't match any files» en
				// cada arranque de `npm run dev` — cinco avisos por proceso desde que la
				// lista es explícita, uno cuando era un solo patrón de brocha gorda.
				//
				// Es ruido sobre un directorio que no es el que se despliega, y silenciarlo
				// no tapa nada del build: los avisos de `npm run build` siguen saliendo.
				suppressWarnings: true
			},
			// Usamos modifyURLPrefix para que @vite-pwa/sveltekit salte su buildGlobPatterns
			// interna (que siempre inyecta prerendered/**). Con este flag activo, el plugin
			// delega el control de los patrones completamente al usuario. Precacheamos sólo
			// los assets del cliente: el HTML público lo prerenderiza el build y lo sirve la CDN.
			workbox: {
				// ⚠️ **Lista explícita, y la razón es que el patrón de brocha gorda que
				// había aquí precacheaba 281 ficheros y 15,7 MB en la primera visita.**
				//
				// Era `client/**/*.{js,css,html,ico,png,webp,woff2,svg,json,webmanifest}`,
				// que barre todo el output de cliente: 122 PNG y 13 MB de ellos son las
				// tarjetas OG (`og/`, 28 ficheros) y las imágenes del blog (`blog/`, 42),
				// que solo existen para que las pinte Twitter o LinkedIn — nadie las abre
				// desde la app y jamás hacen falta sin red. Y el `install` de Workbox es
				// todo-o-nada: cuantos más ficheros, más probable que uno falle y se caiga
				// el service worker entero (que es exactamente lo que pasaba con
				// `/offline`, ver abajo).
				//
				// Se precachea el esqueleto de la SPA y nada más: JS, CSS, la tipografía
				// latina, los iconos y la página offline. ~135 ficheros, ~2,4 MB.
				//
				// Dos exclusiones que importan y no se ven:
				//   · `_app/version.json` — SvelteKit lo pide con `no-cache` para detectar
				//     despliegues nuevos; servirlo del precache lo congelaría en la
				//     versión vieja y `updated.current` nunca se pondría a `true`.
				//   · `.well-known/assetlinks.json` y `llms*.txt` — los leen Android y los
				//     crawlers, nunca la app.
				globPatterns: [
					'client/_app/immutable/**/*.{js,css}',
					'client/fonts/fonts.css',
					// Solo los subconjuntos latinos: los cirílicos y vietnamitas son 150 KB
					// de glifos que esta app, en español e inglés, no pinta nunca.
					'client/fonts/*-latin-*.woff2',
					'client/offline.html',
					// El logo entra porque ahora el dashboard **sí** funciona sin red, y son
					// 20 KB: sin él, la cabecera de una app que arranca offline sale con el
					// hueco de una imagen rota.
					'client/logo.{png,webp}',
					// El webmanifest **no** se lista: el plugin ya lo mete en el precache por
					// su cuenta, como `manifest.webmanifest` sin barra inicial, y añadirlo
					// aquí lo dejaba dos veces (la copia con barra y la suya).
					'client/{favicon.ico,favicon.png,apple-touch-icon.png,pwa-192x192.png,pwa-512x512.png}'
				],
				globIgnores: ['server/**'],
				modifyURLPrefix: { 'client/': '/' },
				/**
				 * ⚠️ **`?v=` tiene que ignorarse o el logo no existe sin red.**
				 *
				 * Cinco componentes piden `/logo.png?v=2` —un rompecachés a mano anterior al
				 * service worker— y en el precache la entrada es `/logo.png`. Workbox solo
				 * ignora `utm_*` y `fbclid` por defecto, así que el `?v=2` no casaba con nada y
				 * la única petición que fallaba sin red en producción era el logo de la
				 * cabecera. Se vio en el sitio real, no en `vite preview`: el spec de offline
				 * comprobaba que la app arranca, no que sus imágenes carguen.
				 *
				 * Se ignora el parámetro en vez de quitar el `?v=2` de los cinco sitios porque
				 * ese rompecachés sigue haciendo su trabajo para quien no tenga service worker.
				 */
				ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
				// Fallback offline. Aquí había `navigateFallback: '/offline.html'` y no
				// funcionaba por dos razones independientes:
				//
				//   1. El plugin reescribe las entradas .html del manifest a rutas limpias,
				//      así que la página aparece como `offline` —sin barra ni extensión— y
				//      `createHandlerBoundToURL('/offline.html')` no encontraba nada.
				//   2. `navigateFallback` registra una NavigationRoute que atiende TODAS las
				//      navegaciones. Como el HTML prerenderizado no se precachea a propósito,
				//      llegó a servir la página offline estando online.
				//
				// El patrón correcto para "solo cuando falla la red" es NetworkOnly con
				// `precacheFallback`: la red manda siempre y la página offline solo entra
				// cuando la petición falla.
				//
				// `navigateFallback: null` es imprescindible: si se omite la clave,
				// @vite-pwa/sveltekit inyecta su propia `NavigationRoute` apuntando a `/`, y
				// como Workbox resuelve por orden de registro esa ruta gana y sirve el
				// esqueleto precacheado en TODAS las navegaciones, también online.
				navigateFallback: null,
				// ⚠️ El orden importa: Workbox resuelve por orden de registro y atiende la
				// primera ruta que casa. La del dashboard tiene que ir antes que la
				// genérica de navegación, o nunca se llega a ella.
				//
				// (Aquí vivía un comentario que describía un `manifestTransforms` que se
				// probó, se quitó del código y sobrevivió en prosa. Afirmaba que el
				// manifest tenía «una única entrada sin barra inicial» y que el build
				// rompía si no la encontraba: no había transform alguno, y las entradas
				// sin barra eran nueve. Un comentario huérfano miente con más
				// credibilidad que ningún otro sitio.)
				runtimeCaching: [
					{
						/**
						 * ⚠️ **El payload de datos del dashboard, sin el cual el esqueleto
						 * cacheado no sirve para nada.**
						 *
						 * Al hidratar, el cliente de SvelteKit pide `/dashboard/__data.json`
						 * para los `load` del servidor. Sin red esa petición falla y el router
						 * **cae en su página de error**: «500 Ha ocurrido un error». Es decir,
						 * cachear el esqueleto por sí solo dejaba el dashboard offline igual de
						 * inútil que antes, solo con otro mensaje.
						 *
						 * Lo cazó el spec `e2e/offline.spec.ts` a la primera ejecución, un día
						 * después de dar por arreglado lo del esqueleto. Ningún test unitario
						 * puede ver esto: hace falta un service worker de verdad y una red
						 * caída de verdad.
						 */
						urlPattern: ({ url }) =>
							url.pathname.startsWith('/dashboard') && url.pathname.endsWith('__data.json'),
						handler: 'NetworkFirst',
						options: {
							cacheName: 'corebalance-dashboard-data',
							networkTimeoutSeconds: 3,
							expiration: { maxEntries: 4 }
						}
					},
					{
						// ⚠️ `/dashboard` sin red servía la página offline **teniendo la
						// cartera entera en local**, que es justo lo contrario de lo que la
						// app promete: los datos viven en IndexedDB y no necesitan conexión.
						// La causa era tener una sola ruta `NetworkOnly` para todas las
						// navegaciones: no distingue una página pública, que sin red no se
						// puede pintar, de una SPA que solo necesita su esqueleto.
						//
						// `NetworkFirst` deja la red como fuente de verdad —estando online
						// nunca se sirve un esqueleto viejo— y guarda una copia con la que
						// arrancar sin conexión. El `precacheFallback` cubre el único caso
						// que queda: no haber entrado nunca al dashboard con red, y por
						// tanto no tener copia que servir.
						//
						// Es caché de runtime y no una entrada del precache porque el
						// esqueleto **no existe como fichero**: `/dashboard` es `ssr = false`
						// sin `prerender`, así que lo genera la función serverless.
						urlPattern: ({ request, url }) =>
							request.mode === 'navigate' && url.pathname.startsWith('/dashboard'),
						handler: 'NetworkFirst',
						options: {
							cacheName: 'corebalance-dashboard-shell',
							// Con red mala no se espera indefinidamente: a los 3 s entra la
							// copia local, que es lo que el usuario quiere ver.
							networkTimeoutSeconds: 3,
							expiration: { maxEntries: 4 },
							precacheFallback: { fallbackURL: '/offline' }
						}
					},
					{
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'NetworkOnly',
						options: {
							// ⚠️ `/offline`, sin extensión, y **no es un descuido**: es la
							// convención del plugin y hay que servirla.
							//
							// `createManifestTransform()` de @vite-pwa/sveltekit reescribe toda
							// entrada `.html` quitándole la barra inicial y la extensión, así que
							// `client/offline.html` acaba en el precache como `offline`. Eso
							// asume que las URLs limpias se sirven —cierto para una página
							// prerenderizada de SvelteKit, falso para un fichero de `static/`—,
							// y `/offline` devolvía 404. Workbox no podía precachear esa entrada
							// y con ella se caía el `install` entero del service worker.
							//
							// Se arregla sirviendo `/offline`, con un rewrite en `vercel.json`,
							// en lugar de convertir la página en una ruta: es autocontenida
							// —estilos en línea, sin JS de la app— y eso es exactamente lo que
							// debe ser un fallback offline. Como ruta arrastraría el bundle.
							//
							// ⚠️ El rewrite es de Vercel, así que `vite preview` **no** lo aplica:
							// esta pieza solo se puede verificar en producción.
							precacheFallback: { fallbackURL: '/offline' }
						}
					}
				]
			},
			// ⚠️ Sin `includeAssets`, y no es un descuido. Su único efecto es añadir
			// ficheros al precache, y lo hacía **sin el prefijo `client/`**, así que
			// `modifyURLPrefix` no los reescribía y acababan en el manifest sin barra
			// inicial: el precache llevaba `/favicon.ico` *y* `favicon.ico`, los dos, siete
			// iconos duplicados y el webmanifest dos veces. Los iconos entran por
			// `globPatterns`, que es donde se ve lo que se precachea y en qué forma. Los
			// iconos del manifest se declaran aparte, en `manifest.icons`, y no dependen
			// de esto.
			manifest: {
				name: 'CoreBalance — Finanzas e Inversión',
				short_name: 'CoreBalance',
				description: 'Dashboard de inversión personalizable con rebalanceo automático',
				id: '/',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				orientation: 'portrait',
				categories: ['finance'],
				theme_color: '#0a0a16',
				background_color: '#0a0a16',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			}
		})
	],
	build: {
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				// vite.config.ts - manualChunks simplificado
				manualChunks: (id) => {
					if (!id.includes('node_modules')) return undefined;
					if (id.includes('firebase')) return 'firebase';
					if (id.includes('@sveltejs') || id.includes('svelte')) return 'vendor-svelte';
					return 'vendor';
				}
			}
		}
	}
});
