import { describe, it, expect } from 'vitest';
// @ts-expect-error - módulo .mjs sin tipos propios; la firma está en su JSDoc
import { runSmoke, MARCA_OFFLINE } from './prod-smoke.mjs';

/**
 * Un comprobador de producción roto y un sitio sano se leen exactamente igual:
 * «0 errores». Es el defecto recurrente de este repo —una comprobación que no
 * puede fallar— y aquí sería especialmente caro, porque este script es lo único
 * que mira la URL pública.
 *
 * Por eso `runSmoke` recibe los transportes inyectados y este fichero le da
 * escenarios de mentira: uno sano, y uno por cada fallo que tiene que cazar. El
 * caso que justifica el script entero es `dnssec-roto`, que reproduce el
 * incidente del 6-ago-2026 (validando SERVFAIL, sin validar responde) y exige
 * que se diagnostique con ese nombre y no como «el dominio no resuelve»: son
 * problemas con arreglos distintos y sólo uno apunta al registrador.
 */

const VERSION = '9.9.9';
const HOST = 'corebalance.app';
const BASE = `https://${HOST}`;

const PORTADA =
	`<html><head><title>CoreBalance</title>` +
	`<script type="application/ld+json">{"@type":"SoftwareApplication","softwareVersion":"${VERSION}"}</script>` +
	`</head><body>portada</body></html>`;

const OFFLINE = `<html><body ${MARCA_OFFLINE}><h1>Sin conexión</h1></body></html>`;

/** Un `sw.js` con las cuatro marcas que el script exige, en el mismo formato minificado que sirve Vercel. */
const SW_SANO =
	`define(["./workbox-5a77362e"],function(l){"use strict";l.precacheAndRoute([` +
	`{url:"/_app/immutable/nodes/0.abc.js",revision:null},{url:"offline",revision:"090007e7"},` +
	`{url:"manifest.webmanifest",revision:"deadbeef"}]),` +
	`l.registerRoute(({request:l,url:s})=>"navigate"===l.mode&&s.pathname.startsWith("/dashboard"),` +
	`new l.NetworkFirst({cacheName:"corebalance-dashboard-shell",networkTimeoutSeconds:3,` +
	`plugins:[new l.PrecacheFallbackPlugin({fallbackURL:"/offline"})]}),"GET"),` +
	`l.registerRoute(({request:l})=>"navigate"===l.mode,` +
	`new l.NetworkOnly({plugins:[new l.PrecacheFallbackPlugin({fallbackURL:"/offline"})]}),"GET")});`;

/** El stub autodesregistrante que vivía en `static/sw.js` y sobreescribía al worker real. */
const SW_STUB = `self.addEventListener('install',()=>self.skipWaiting());self.registration.unregister();`;

type Respuesta = { status: number; headers: Record<string, string>; body: string };
const ok = (body: string): Respuesta => ({ status: 200, headers: {}, body });

function respuestasSanas(): Map<string, Respuesta> {
	return new Map<string, Respuesta>([
		['/', ok(PORTADA)],
		['/en', ok('<html><body>home</body></html>')],
		['/blog', ok('<html><body>blog</body></html>')],
		['/dashboard', ok('<html><body>app</body></html>')],
		['/offline', ok(OFFLINE)],
		['/sw.js', ok(SW_SANO)],
		[
			'/manifest.webmanifest',
			ok(JSON.stringify({ start_url: '/', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] }))
		],
		['/_app/version.json', ok('{"version":"1754500000000"}')]
	]);
}

type RespuestaDns = { Status: number; AD?: boolean; Answer?: Array<{ type: number; data: string }> };

function dnsSano(): Record<string, { normal: RespuestaDns; cd: RespuestaDns }> {
	const apex: RespuestaDns = { Status: 0, AD: true, Answer: [{ type: 1, data: '216.198.79.1' }] };
	return {
		[HOST]: { normal: apex, cd: { ...apex, AD: false } },
		[`www.${HOST}`]: {
			normal: { Status: 0, AD: true, Answer: [{ type: 5, data: 'cname.vercel-dns.com.' }] },
			cd: { Status: 0, Answer: [{ type: 5, data: 'cname.vercel-dns.com.' }] }
		}
	};
}

async function ejecutar(
	ajustes: {
		respuestas?: Map<string, Respuesta>;
		dns?: Record<string, { normal: RespuestaDns; cd: RespuestaDns }>;
		getRevienta?: string;
	} = {}
) {
	const respuestas = ajustes.respuestas ?? respuestasSanas();
	const dns = ajustes.dns ?? dnsSano();

	const get = async (url: string): Promise<Respuesta> => {
		const ruta = new URL(url).pathname;
		if (ajustes.getRevienta === ruta) throw new Error('socket colgado');
		const respuesta = respuestas.get(ruta);
		if (!respuesta) throw new Error(`el escenario no define ${ruta}`);
		return respuesta;
	};

	const doh = async (nombre: string, _tipo: string, opts: { cd?: boolean } = {}) => {
		const entrada = dns[nombre];
		if (!entrada) throw new Error(`el escenario no define DNS para ${nombre}`);
		return opts.cd ? entrada.cd : entrada.normal;
	};

	return runSmoke({ get, doh, versionEsperada: VERSION, base: BASE, host: HOST });
}

/** Texto de los errores de una comprobación concreta, para afirmar sobre el diagnóstico y no sólo sobre el recuento. */
const textoDe = (
	lista: Array<{ comprobacion: string; mensaje: string }>,
	comprobacion?: string
) =>
	lista
		.filter((e) => comprobacion === undefined || e.comprobacion === comprobacion)
		.map((e) => e.mensaje)
		.join('\n');

describe('prod-smoke', () => {
	it('no inventa nada cuando todo está en pie', async () => {
		const { errores, avisos } = await ejecutar();
		expect(textoDe(errores)).toBe('');
		expect(textoDe(avisos)).toBe('');
	});

	describe('DNS', () => {
		it('diagnostica el fallo de DNSSEC del 6-ago como DNSSEC, no como «no resuelve»', async () => {
			const dns = dnsSano();
			// Exactamente lo medido aquel día: SERVFAIL en los validadores, los
			// autoritativos respondiendo bien cuando se salta la validación.
			dns[HOST].normal = { Status: 2 };
			const { errores } = await ejecutar({ dns });

			expect(errores.map((e) => e.comprobacion)).toContain('dns-dnssec');
			const mensaje = textoDe(errores, 'dns-dnssec');
			expect(mensaje).toContain('DNSSEC roto');
			// La parte útil del diagnóstico: hacia dónde mirar.
			expect(mensaje).toContain('panel del registrador');
			// Y la IP que sí responde, que es lo que descarta que el dominio no exista.
			expect(mensaje).toContain('216.198.79.1');
		});

		it('distingue el dominio que no resuelve de nada, sin culpar a DNSSEC', async () => {
			const dns = dnsSano();
			dns[HOST].normal = { Status: 2 };
			dns[HOST].cd = { Status: 2 };
			const { errores } = await ejecutar({ dns });

			const mensaje = textoDe(errores, 'dns');
			expect(mensaje).toContain('no resuelve');
			expect(textoDe(errores)).not.toContain('DNSSEC roto');
		});

		it('detecta una zona que resuelve sin ningún registro A', async () => {
			const dns = dnsSano();
			dns[HOST].normal = { Status: 0, AD: true, Answer: [] };
			const { errores } = await ejecutar({ dns });
			expect(textoDe(errores, 'dns')).toContain('no devuelve ningún registro A');
		});

		it('avisa —sin romper— si la zona deja de venir autenticada', async () => {
			const dns = dnsSano();
			dns[HOST].normal = { ...dns[HOST].normal, AD: false };
			const { errores, avisos } = await ejecutar({ dns });
			expect(textoDe(errores)).toBe('');
			expect(textoDe(avisos, 'dns-dnssec')).toContain('AD=false');
		});

		it('avisa —sin romper— si www no resuelve', async () => {
			const dns = dnsSano();
			dns[`www.${HOST}`].normal = { Status: 2 };
			const { errores, avisos } = await ejecutar({ dns });
			expect(textoDe(errores)).toBe('');
			expect(textoDe(avisos, 'dns-www')).toContain('no resuelve');
		});
	});

	describe('el fallback offline, que sólo producción puede verificar', () => {
		it('detecta que se cayó el rewrite de vercel.json', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/offline', { status: 404, headers: {}, body: 'not found' });
			const { errores } = await ejecutar({ respuestas });
			const mensaje = textoDe(errores, 'offline');
			expect(mensaje).toContain('vercel.json');
			expect(mensaje).toContain('install del service worker');
		});

		it('detecta que /offline responde 200 pero sirviendo otra página', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/offline', ok('<html><body>portada cualquiera</body></html>'));
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, 'offline')).toContain('se está sirviendo otra página');
		});
	});

	describe('service worker', () => {
		it('detecta el stub que sobreescribe al worker real', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/sw.js', ok(SW_STUB));
			const { errores } = await ejecutar({ respuestas });
			const mensaje = textoDe(errores, 'service worker');
			expect(mensaje).toContain('no contiene precacheAndRoute');
			expect(mensaje).toContain('static/');
		});

		it('detecta que falta la entrada `offline` del precache', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/sw.js', ok(SW_SANO.replace('{url:"offline",revision:"090007e7"},', '')));
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, 'service worker')).toContain('entrada `offline`');
		});

		it('detecta que falta el precacheFallback hacia /offline', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/sw.js', ok(SW_SANO.replaceAll('fallbackURL:"/offline"', 'fallbackURL:"/otra"')));
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, 'service worker')).toContain('precacheFallback');
		});

		it('detecta que falta la ruta propia del dashboard', async () => {
			const respuestas = respuestasSanas();
			respuestas.set(
				'/sw.js',
				ok(SW_SANO.replace('corebalance-dashboard-shell', 'corebalance-otra-cosa'))
			);
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, 'service worker')).toContain('IndexedDB');
		});
	});

	describe('la página offline servida donde no toca', () => {
		it('detecta la portada sirviendo el fallback offline', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/', ok(OFFLINE));
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, 'portada')).toContain('sirviendo la página offline');
		});

		it('detecta el dashboard sirviendo el fallback offline', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/dashboard', ok(OFFLINE));
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, 'ruta /dashboard')).toContain('sirviendo la página offline');
		});
	});

	describe('que el despliegue sea el de este commit', () => {
		it('detecta producción sirviendo una versión anterior', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/', ok(PORTADA.replace(VERSION, '1.0.0')));
			const { errores } = await ejecutar({ respuestas });
			const mensaje = textoDe(errores, 'version');
			expect(mensaje).toContain('1.0.0');
			expect(mensaje).toContain(VERSION);
		});

		it('avisa —sin romper— si la portada ya no lleva softwareVersion', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/', ok('<html><body>portada sin schema</body></html>'));
			const { errores, avisos } = await ejecutar({ respuestas });
			expect(textoDe(errores)).toBe('');
			expect(textoDe(avisos, 'version')).toContain('softwareVersion');
		});
	});

	describe('rutas y manifest', () => {
		it.each([['/en'], ['/blog'], ['/dashboard']])('detecta %s caída', async (ruta) => {
			const respuestas = respuestasSanas();
			respuestas.set(ruta, { status: 500, headers: {}, body: 'boom' });
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, `ruta ${ruta}`)).toContain('responde 500');
		});

		it('detecta un manifest sin iconos', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/manifest.webmanifest', ok(JSON.stringify({ start_url: '/' })));
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, 'manifest')).toContain('no declara iconos');
		});

		it('detecta un manifest que no parsea', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/manifest.webmanifest', ok('<html>404</html>'));
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, 'manifest')).toContain('no parsea como JSON');
		});

		it('detecta version.json ausente, que deja muda la aviso de actualización', async () => {
			const respuestas = respuestasSanas();
			respuestas.set('/_app/version.json', { status: 404, headers: {}, body: '' });
			const { errores } = await ejecutar({ respuestas });
			expect(textoDe(errores, 'version.json')).toContain('responde 404');
		});
	});

	it('una comprobación que revienta no se lleva las demás por delante', async () => {
		// El transporte falla sólo en /sw.js: tiene que salir ese error y ninguno más.
		const { errores } = await ejecutar({ getRevienta: '/sw.js' });
		expect(textoDe(errores, 'service worker')).toContain('no pudo ejecutarse');
		expect(errores.map((e) => e.comprobacion)).toEqual(['service worker']);
	});
});
