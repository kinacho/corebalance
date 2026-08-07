/**
 * Comprobación de producción: ¿está el sitio realmente en pie?
 *
 * Existe por un incidente del 6-ago-2026 que ninguna de las guardias del repo
 * podía ver, y merece la pena entender por qué. `corebalance.app` servía la
 * página «Sin conexión» a un usuario con conexión perfecta. La causa no estaba
 * en el código: los nameservers del registrador (`launch1/launch2.spaceship.net`)
 * pasaron un rato firmando la zona con una clave que no encajaba con el DS
 * publicado en el registro de `.app`, así que **todos** los resolvers que validan
 * DNSSEC —Google, Cloudflare, Quad9, OpenDNS— devolvían SERVFAIL mientras los
 * autoritativos, preguntados a pelo, respondían de maravilla. Para el navegador
 * eso es indistinguible de no tener red: la navegación falla, el service worker
 * hace lo que le toca y sirve su fallback offline.
 *
 * De ahí las dos lecciones que dan forma a este script:
 *
 *  1. **El build puede estar perfecto y el sitio estar caído.** CI comprueba
 *     tipos, tests, build y SEO sobre el HTML *construido*; ni una de esas cosas
 *     mira la URL pública. Un dominio que no resuelve, un rewrite de Vercel que
 *     se cayó del `vercel.json` o un despliegue que no llegó a promocionarse dan
 *     CI verde y sitio roto.
 *  2. **Hay que preguntar dos veces al DNS, validando y sin validar.** Una sola
 *     consulta que falla no distingue «el dominio no existe» de «el dominio
 *     existe y su DNSSEC está roto», y son problemas con arreglos opuestos. Si
 *     la consulta normal falla y la de `cd=1` responde, el fallo es de DNSSEC y
 *     hay que decirlo con ese nombre: es lo único que apunta al panel del
 *     registrador en vez de al código.
 *  3. **Y hay que preguntárselo a varios resolvers.** Añadida el 7-ago-2026: esa
 *     firma de «DNSSEC roto» —validando falla, `cd=1` responde— la produce
 *     igualita un validador que en ese instante no logra traerse el DNSKEY. Con
 *     un solo resolver, un rojo falso es indistinguible del bueno. Ver
 *     `RESOLVERS` y la regla de mayoría de la comprobación `dns`.
 *
 * Cubre además la pieza que `CLAUDE.md` declara imposible de verificar en local:
 * el rewrite `/offline` → `/offline.html` es de Vercel, así que `vite preview` no
 * lo aplica y sólo producción puede decir si sigue en pie. Sin él Workbox no
 * puede precachear su propia entrada `offline` y se cae el `install` del service
 * worker entero.
 *
 * Uso:
 *   npm run smoke:prod                     (contra https://corebalance.app)
 *   npm run smoke:prod -- --base <url>      (contra un preview)
 *   npm run smoke:prod -- --json            (salida legible por máquina)
 *
 * Código de salida 1 si hay errores. Los avisos no rompen.
 *
 * ⚠️ Sin shebang, a propósito: `prod-smoke.test.ts` lo importa y Vitest
 * transforma el fichero; cuando decide que el import es CJS iza un shim a la
 * línea 1, que caería *antes* del shebang y rompería el fichero entero al
 * recolectar. Está documentado en los Gotchas de `CLAUDE.md`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOST = 'corebalance.app';
export const BASE = `https://${HOST}`;

/**
 * Marca estable de la página offline.
 *
 * Se comprueba por este atributo y no por el texto visible a propósito: el copy
 * de esa página se reescribió justo después de este incidente (decía «Comprueba
 * tu red», que manda al usuario a mirar donde no está el problema), y una
 * comprobación anclada al copy se rompe cada vez que alguien mejora una frase.
 * Un atributo no lo lee nadie, así que nadie lo va a reescribir por estilo.
 */
export const MARCA_OFFLINE = 'data-offline-fallback';

/** Tipos de registro DNS que devuelve la API JSON de DoH. */
const TIPO_A = 1;
const TIPO_CNAME = 5;

/**
 * A quién se le pregunta, y por qué son varios.
 *
 * ⚠️ Este script preguntaba a **un solo resolver** (`dns.google`), y eso era un
 * generador de rojos falsos. Un validador que en ese instante no consigue traerse
 * el DNSKEY devuelve SERVFAIL mientras la consulta con `cd=1` sigue respondiendo:
 * **exactamente la misma firma que una zona rota**. Pasó el 7-ago-2026 durante una
 * revisión —dos consultas seguidas a Cloudflare fallando, cuarenta muestras
 * inmediatamente después impecables— y con un único resolver eso habría disparado
 * el error duro «DNSSEC roto», con toda su prosa señalando al panel del
 * registrador, por un hipo ajeno a la zona.
 *
 * Y una guardia que se pone roja al azar acaba ignorada, que es peor que no
 * tenerla. De ahí la regla de mayoría de más abajo: un resolver no puede
 * distinguir su propio fallo del de la zona, tres sí.
 *
 * Los tres están elegidos midiendo, no por fama. El criterio fue que sirvieran
 * JSON, aceptaran `cd=1` y —lo que de verdad importa— que **detectaran de verdad
 * una zona rota**: los tres devuelven SERVFAIL para `dnssec-failed.org` y
 * responden a la misma consulta con `cd=1`. Quad9 (`:5053`) y `doh.sb` quedaron
 * fuera porque no devuelven JSON utilizable.
 *
 * `reportaAd` existe porque AdGuard **valida pero no marca el bit AD** en su JSON:
 * incluirlo en la comprobación de autenticidad daría un aviso permanente y falso.
 * Vota sobre el Status, no sobre el AD.
 */
export const RESOLVERS = [
	{ id: 'google', nombre: 'dns.google', endpoint: 'https://dns.google/resolve', reportaAd: true },
	{
		id: 'cloudflare',
		nombre: 'cloudflare-dns.com',
		endpoint: 'https://cloudflare-dns.com/dns-query',
		reportaAd: true
	},
	{
		id: 'adguard',
		nombre: 'dns.adguard-dns.com',
		endpoint: 'https://dns.adguard-dns.com/resolve',
		reportaAd: false
	}
];

/**
 * El corazón del script, y a propósito **sin nada de red dentro**: recibe los
 * dos transportes (`get` para HTTP, `doh` para DNS) inyectados.
 *
 * No es purismo. Un comprobador de producción roto y un sitio sano se leen
 * exactamente igual —«0 errores»—, que es el defecto recurrente de este repo. Con
 * los transportes inyectados, `prod-smoke.test.ts` puede reproducir el fallo de
 * DNSSEC del 6-ago y exigir que se detecte, sin depender de que el mundo real
 * esté roto en el momento de correr los tests.
 *
 * @param {object} opciones
 * @param {(url: string) => Promise<{status: number, headers: Record<string,string>, body: string}>} opciones.get
 * @param {(nombre: string, tipo: string, opts?: {cd?: boolean, resolver?: string}) => Promise<any>} opciones.doh
 * @param {string} opciones.versionEsperada Versión de `package.json` del commit desplegado.
 * @param {string} [opciones.base]
 * @param {string} [opciones.host]
 * @returns {Promise<{errores: Array<{comprobacion: string, mensaje: string}>, avisos: Array<{comprobacion: string, mensaje: string}>}>}
 */
export async function runSmoke({
	get,
	doh,
	versionEsperada,
	base = BASE,
	host = HOST,
	versionBlanda = false
}) {
	const errores = [];
	const avisos = [];
	const fallo = (comprobacion, mensaje) => errores.push({ comprobacion, mensaje });
	const aviso = (comprobacion, mensaje) => avisos.push({ comprobacion, mensaje });

	/**
	 * Cada comprobación va aislada: si una revienta —el propio DoH caído, un
	 * timeout— se anota y las demás siguen. Un script que aborta a la primera
	 * excepción sólo informa del primer problema, y aquí el interesante suele ser
	 * el segundo.
	 */
	const aislada = async (comprobacion, fn) => {
		try {
			await fn();
		} catch (error) {
			fallo(comprobacion, `la comprobación no pudo ejecutarse: ${error.message}`);
		}
	};

	// ── DNS ───────────────────────────────────────────────────────────────────
	await aislada('dns', async () => {
		const registros = (respuesta) =>
			(respuesta.Answer ?? []).filter((r) => r.type === TIPO_A).map((r) => r.data);

		/**
		 * Se pregunta a los tres a la vez, y un resolver que revienta **se abstiene**
		 * en vez de contar como SERVFAIL. La distinción es la que sostiene todo lo
		 * demás: que el endpoint de AdGuard esté caído no dice absolutamente nada
		 * sobre la zona de `corebalance.app`, y contarlo como voto de fallo sería
		 * fabricar la evidencia que este bloque existe para pesar.
		 */
		const votos = await Promise.all(
			RESOLVERS.map(async (resolver) => {
				try {
					return { resolver, respuesta: await doh(host, 'A', { resolver: resolver.id }) };
				} catch (error) {
					return { resolver, error };
				}
			})
		);

		const nombres = (lista) => lista.map((v) => v.resolver.nombre).join(', ');
		const opinaron = votos.filter((v) => v.respuesta);
		const mudos = votos.filter((v) => !v.respuesta);

		if (opinaron.length === 0) {
			fallo(
				'dns',
				`ningún resolver DoH pudo responder (${nombres(mudos)}): no se ha podido comprobar si ${host} ` +
					`resuelve. Esto no dice nada sobre la zona; lo más probable es que sea la red desde la que corre ` +
					`esta comprobación.`
			);
			return;
		}

		const fallaron = opinaron.filter((v) => v.respuesta.Status !== 0);
		const sanos = opinaron.filter((v) => v.respuesta.Status === 0);

		if (fallaron.length > 0) {
			// La segunda pregunta, sin validar, al mismo resolver que falló: es lo único
			// que separa «el dominio no existe» de «existe y su DNSSEC está roto», que
			// son problemas con arreglos opuestos.
			const sinValidar = await doh(host, 'A', { cd: true, resolver: fallaron[0].resolver.id });
			const respondeSinValidar = sinValidar.Status === 0 && registros(sinValidar).length > 0;

			/**
			 * Mayoría estricta de los que opinaron, y **mínimo dos opiniones** para
			 * declarar nada roto. Con un solo voto no se puede distinguir el fallo del
			 * validador del fallo de la zona, que es justamente el error que este
			 * bloque viene a corregir: en ese caso se avisa y no se rompe.
			 */
			const mayoria = fallaron.length * 2 > opinaron.length;
			const concluyente = opinaron.length >= 2 && mayoria;
			const reparto =
				`${fallaron.length} de ${opinaron.length} validadores fallan (${nombres(fallaron)})` +
				(sanos.length > 0 ? ` y ${nombres(sanos)} responde${sanos.length > 1 ? 'n' : ''} bien` : '') +
				(mudos.length > 0 ? `; sin respuesta: ${nombres(mudos)}` : '');

			if (respondeSinValidar && concluyente) {
				fallo(
					'dns-dnssec',
					`DNSSEC roto en ${host}: ${reparto}, mientras la misma consulta sin validar (cd=1) responde ` +
						`${registros(sinValidar).join(', ')}. El dominio es invisible para todo resolver que valide, ` +
						`aunque los autoritativos contesten bien, y el navegador no lo distingue de no tener red: el ` +
						`service worker sirve la página offline. Se arregla en el panel del registrador (DS del ` +
						`registro vs. DNSKEY de la zona), no en este repo.`
				);
				return;
			}

			if (respondeSinValidar) {
				aviso(
					'dns-dnssec',
					`Fallo de validación **no concluyente** en ${host}: ${reparto}. Sin validar (cd=1) responde ` +
						`${registros(sinValidar).join(', ')}. Un validador que en ese momento no logra traerse el ` +
						`DNSKEY produce exactamente esta firma sin que la zona tenga nada malo, así que con este dato ` +
						`no se declara rota. Si se repite en varias ejecuciones seguidas, entonces sí mira el registrador.`
				);
			} else if (concluyente) {
				fallo(
					'dns',
					`${host} no resuelve: ${reparto}, y sin validar (cd=1) tampoco responde (Status ` +
						`${sinValidar.Status}). Que fallen las dos apunta a la delegación o a la zona, no a DNSSEC.`
				);
				return;
			} else {
				aviso(
					'dns',
					`Resolución inestable en ${host}: ${reparto}, y sin validar tampoco responde (Status ` +
						`${sinValidar.Status}). No hay mayoría suficiente para darlo por caído.`
				);
			}
		}

		if (sanos.length === 0) return;

		if (registros(sanos[0].respuesta).length === 0) {
			fallo('dns', `${host} resuelve pero no devuelve ningún registro A.`);
			return;
		}

		// Sólo votan aquí los que marcan el bit AD, y hace falta que **todos** ellos lo
		// nieguen: un único resolver que no lo marque no es evidencia de que la zona
		// haya dejado de estar firmada.
		const conAd = sanos.filter((v) => v.resolver.reportaAd);
		if (conAd.length > 0 && conAd.every((v) => v.respuesta.AD !== true)) {
			aviso(
				'dns-dnssec',
				`${host} resuelve, pero la respuesta no viene autenticada (AD=false) en ${nombres(conAd)}: la zona ` +
					`ha dejado de estar firmada o el DS ya no está publicado. No rompe nada hoy, y quita la ` +
					`protección que sí había.`
			);
		}
	});

	// `www` no aparece en ninguna parte del repo —el canónico es el apex— así que
	// su ausencia es un hueco, no un fallo: aviso y no error.
	await aislada('dns-www', async () => {
		const respuesta = await doh(`www.${host}`, 'A');
		const tiene = (respuesta.Answer ?? []).some(
			(r) => r.type === TIPO_A || r.type === TIPO_CNAME
		);
		if (respuesta.Status !== 0 || !tiene) {
			aviso(
				'dns-www',
				`www.${host} no resuelve (Status ${respuesta.Status}). Quien lo escriba con www ve un error del ` +
					`navegador. El canónico es el apex, así que no rompe el sitio; se arregla con un CNAME en el registrador.`
			);
		}
	});

	// ── La portada, y que sea *este* despliegue ───────────────────────────────
	await aislada('portada', async () => {
		const respuesta = await get(`${base}/`);
		if (respuesta.status !== 200) {
			fallo('portada', `${base}/ responde ${respuesta.status} en vez de 200.`);
			return;
		}
		if (respuesta.body.includes(MARCA_OFFLINE)) {
			fallo('portada', `${base}/ está sirviendo la página offline.`);
			return;
		}

		/**
		 * La versión viaja al schema `SoftwareApplication` de la landing (viene de
		 * `__APP_VERSION__`, que `vite.config.ts` lee de `package.json`), así que
		 * comparar esa cadena con la del commit desplegado es la forma más directa
		 * de saber si el despliegue llegó a promocionarse. Un CI verde sobre un
		 * commit que nunca salió a producción es un final feliz falso.
		 */
		const servida = respuesta.body.match(/"softwareVersion"\s*:\s*"([^"]+)"/)?.[1];
		if (!servida) {
			aviso('version', `no se encontró "softwareVersion" en la portada; no se pudo comparar la versión.`);
		} else if (servida !== versionEsperada) {
			/**
			 * ⚠️ En las ejecuciones por cron esto es un aviso, no un error, y la
			 * distinción nació al bajar el cron a media hora. La comprobación de
			 * versión existe para cazar **un despliegue que no llegó a promocionarse**,
			 * y eso sólo tiene sentido preguntárselo al evento que acompaña a un
			 * despliegue. Un cron que cae en los dos o tres minutos entre el merge de
			 * una release y el final del build de Vercel ve legítimamente la versión
			 * anterior: con 48 ejecuciones al día eso es un rojo falso por release, y
			 * el rojo falso es justo lo que este script acaba de dejar de producir por
			 * el otro lado. En `deployment_status` sigue siendo error.
			 */
			const mensaje =
				`producción sirve la versión ${servida} y el commit desplegado es la ${versionEsperada}: ` +
				`el despliegue no llegó, o la CDN está sirviendo HTML viejo.`;
			if (versionBlanda) {
				aviso(
					'version',
					`${mensaje} Esta ejecución no acompaña a ningún despliegue, así que puede ser sencillamente ` +
						`un build de Vercel en curso; si sigue apareciendo en las ejecuciones siguientes, entonces ` +
						`no llegó de verdad.`
				);
			} else {
				fallo('version', mensaje);
			}
		}
	});

	// ── Rutas que tienen que existir ──────────────────────────────────────────
	for (const ruta of ['/en', '/blog', '/dashboard']) {
		await aislada(`ruta ${ruta}`, async () => {
			const respuesta = await get(`${base}${ruta}`);
			if (respuesta.status !== 200) {
				fallo(`ruta ${ruta}`, `${ruta} responde ${respuesta.status} en vez de 200.`);
				return;
			}
			// ⚠️ El caso que de verdad importa en `/dashboard`: la cartera vive en
			// IndexedDB, así que servirle la página offline a quien tiene sus datos
			// en la máquina es justo lo contrario de lo que promete la app.
			if (respuesta.body.includes(MARCA_OFFLINE)) {
				fallo(`ruta ${ruta}`, `${ruta} está sirviendo la página offline.`);
			}
		});
	}

	// ── El fallback offline, que sólo producción puede verificar ───────────────
	await aislada('offline', async () => {
		const respuesta = await get(`${base}/offline`);
		if (respuesta.status !== 200) {
			fallo(
				'offline',
				`/offline responde ${respuesta.status}. Es el rewrite de \`vercel.json\` hacia /offline.html: sin él ` +
					`Workbox no puede precachear la entrada \`offline\` y se cae el install del service worker completo. ` +
					`\`vite preview\` no aplica ese rewrite, así que esto sólo se ve aquí.`
			);
			return;
		}
		if (!respuesta.body.includes(MARCA_OFFLINE)) {
			fallo(
				'offline',
				`/offline responde 200 pero su HTML no lleva ${MARCA_OFFLINE}: se está sirviendo otra página.`
			);
		}
	});

	// ── El service worker ─────────────────────────────────────────────────────
	await aislada('service worker', async () => {
		const respuesta = await get(`${base}/sw.js`);
		if (respuesta.status !== 200) {
			fallo('service worker', `/sw.js responde ${respuesta.status} en vez de 200.`);
			return;
		}
		const sw = respuesta.body;

		// El stub autodesregistrante de `static/sw.js` pesaba 424 bytes y sobreescribía
		// al worker real de 21 KB. Está borrado, y `CLAUDE.md` explica por qué no debe
		// volver; esto lo caza si vuelve.
		if (!sw.includes('precacheAndRoute')) {
			fallo(
				'service worker',
				`/sw.js (${sw.length} bytes) no contiene precacheAndRoute: no es el worker generado por Workbox. ` +
					`El sospechoso habitual es un fichero en \`static/\` sobreescribiendo el generado.`
			);
			return;
		}

		// La entrada del precache va **sin barra y sin extensión** (`offline`): así la
		// reescribe `createManifestTransform()` de @vite-pwa/sveltekit. Si falta, el
		// `precacheFallback` no tiene nada que servir.
		if (!/url:\s*"offline"/.test(sw)) {
			fallo(
				'service worker',
				`el manifest de precache no lleva la entrada \`offline\`: el fallback offline no tiene qué servir.`
			);
		}
		if (!sw.includes('fallbackURL:"/offline"') && !/fallbackURL:\s*"\/offline"/.test(sw)) {
			fallo('service worker', `no hay ninguna ruta con precacheFallback hacia /offline.`);
		}
		// La ruta propia del dashboard tiene que ir registrada: sin ella una sola regla
		// `NetworkOnly` atiende todas las navegaciones y sirve la página offline a quien
		// ya tiene la cartera en local.
		if (!sw.includes('corebalance-dashboard-shell')) {
			fallo(
				'service worker',
				`falta la caché \`corebalance-dashboard-shell\`: sin ella el dashboard sin red cae en la página offline ` +
					`teniendo los datos en IndexedDB.`
			);
		}
	});

	// ── El manifest de la PWA ─────────────────────────────────────────────────
	await aislada('manifest', async () => {
		const respuesta = await get(`${base}/manifest.webmanifest`);
		if (respuesta.status !== 200) {
			fallo('manifest', `/manifest.webmanifest responde ${respuesta.status} en vez de 200.`);
			return;
		}
		let manifest;
		try {
			manifest = JSON.parse(respuesta.body);
		} catch (error) {
			fallo('manifest', `/manifest.webmanifest no parsea como JSON: ${error.message}`);
			return;
		}
		if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
			fallo('manifest', `el manifest no declara iconos: no se puede instalar la PWA.`);
		}
		if (!manifest.start_url) {
			fallo('manifest', `el manifest no declara start_url.`);
		}
	});

	// SvelteKit pide este fichero con `no-cache` para detectar despliegues nuevos; si
	// no se sirve, `UpdatePrompt.svelte` nunca puede avisar de una versión nueva.
	await aislada('version.json', async () => {
		const respuesta = await get(`${base}/_app/version.json`);
		if (respuesta.status !== 200) {
			fallo('version.json', `/_app/version.json responde ${respuesta.status} en vez de 200.`);
			return;
		}
		try {
			JSON.parse(respuesta.body);
		} catch (error) {
			fallo('version.json', `/_app/version.json no parsea como JSON: ${error.message}`);
		}
	});

	return { errores, avisos };
}

// ─────────────────────────── Transportes reales y CLI ───────────────────────────

/** @type {(url: string) => Promise<{status: number, headers: Record<string,string>, body: string}>} */
async function getReal(url) {
	// `redirect: 'manual'` para que un 3xx inesperado se vea como lo que es en vez
	// de esconderse detrás del 200 del destino.
	const respuesta = await fetch(url, {
		redirect: 'manual',
		headers: { 'user-agent': 'corebalance-prod-smoke' }
	});
	return {
		status: respuesta.status,
		headers: Object.fromEntries(respuesta.headers),
		body: await respuesta.text()
	};
}

/**
 * DNS por HTTPS contra el resolver que se le pida —todos los de `RESOLVERS`
 * **validan DNSSEC**, que es lo que hace falta para reproducir el fallo del 6-ago—.
 * `cd=1` desactiva esa validación y devuelve lo que digan los autoritativos, y
 * comparar las dos respuestas es lo que separa «no existe» de «DNSSEC roto».
 *
 * Sin `resolver` cae en el primero de la lista: lo usa la comprobación de `www`,
 * que sólo genera avisos y no necesita votación.
 */
async function dohReal(nombre, tipo, opciones = {}) {
	const resolver = RESOLVERS.find((r) => r.id === opciones.resolver) ?? RESOLVERS[0];
	const url = new URL(resolver.endpoint);
	url.searchParams.set('name', nombre);
	url.searchParams.set('type', tipo);
	if (opciones.cd) url.searchParams.set('cd', '1');
	const respuesta = await fetch(url, { headers: { accept: 'application/dns-json' } });
	if (!respuesta.ok) throw new Error(`${resolver.nombre} respondió ${respuesta.status}`);
	return respuesta.json();
}

function leerVersion() {
	const aqui = path.dirname(fileURLToPath(import.meta.url));
	const paquete = JSON.parse(fs.readFileSync(path.join(aqui, '..', 'package.json'), 'utf8'));
	return paquete.version;
}

async function main() {
	const argv = process.argv.slice(2);
	const valorDe = (bandera) => {
		const i = argv.indexOf(bandera);
		return i === -1 ? undefined : argv[i + 1];
	};
	const base = (valorDe('--base') ?? BASE).replace(/\/$/, '');
	const comoJson = argv.includes('--json');
	// Lo pasa el workflow sólo en las ejecuciones por `schedule`. Ver el bloque de
	// la portada para por qué la versión no puede ser un error ahí.
	const versionBlanda = argv.includes('--version-aviso');
	const host = new URL(base).hostname;
	const versionEsperada = leerVersion();

	/**
	 * Reintentos, y no por nerviosismo: el disparador de este script es el
	 * `deployment_status` de Vercel, que llega cuando el despliegue está listo pero
	 * no garantiza que la CDN ya haya invalidado el HTML anterior en todas las
	 * regiones. Sin margen, la comprobación de versión sería intermitente — y una
	 * guardia que falla en verde a veces se acaba ignorando, que es peor que no
	 * tenerla.
	 */
	const INTENTOS = 3;
	const ESPERA_MS = 15_000;

	let resultado;
	for (let intento = 1; intento <= INTENTOS; intento++) {
		resultado = await runSmoke({
			get: getReal,
			doh: dohReal,
			versionEsperada,
			base,
			host,
			versionBlanda
		});
		if (resultado.errores.length === 0) break;
		if (intento < INTENTOS) {
			if (!comoJson) {
				console.log(
					`Intento ${intento}/${INTENTOS}: ${resultado.errores.length} error(es). ` +
						`Reintento en ${ESPERA_MS / 1000}s por si es propagación de la CDN…`
				);
			}
			await new Promise((r) => setTimeout(r, ESPERA_MS));
		}
	}

	const { errores, avisos } = resultado;

	if (comoJson) {
		console.log(JSON.stringify({ base, versionEsperada, errores, avisos }, null, 2));
	} else {
		console.log(`\nComprobación de producción — ${base} (versión esperada ${versionEsperada})\n`);
		for (const { comprobacion, mensaje } of errores) console.log(`  ✗ [${comprobacion}] ${mensaje}\n`);
		for (const { comprobacion, mensaje } of avisos) console.log(`  ! [${comprobacion}] ${mensaje}\n`);
		if (errores.length === 0 && avisos.length === 0) console.log('  ✓ todo en pie\n');
		console.log(`${errores.length} error(es), ${avisos.length} aviso(s)\n`);
	}

	process.exit(errores.length > 0 ? 1 : 0);
}

// Sólo corre como CLI: importado desde el test, no hace nada por su cuenta.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	await main();
}
