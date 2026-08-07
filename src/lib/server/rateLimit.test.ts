import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * El limitador es lo único que protege los cuatro endpoints de la API, y no tenía
 * ni un test. Tiene además dos ramas que no pueden convivir en un mismo módulo
 * cargado —Redis o memoria, según haya credenciales— así que cada escenario
 * reimporta el módulo con `./redis` mockeado a una cosa u otra. `vi.resetModules()`
 * es también lo que deja el `memoryLimits` global limpio entre tests: sin eso, el
 * contador de un caso contaminaría al siguiente.
 */
const cargar = async (redis: unknown) => {
	vi.resetModules();
	vi.doMock('./redis', () => ({ redis }));
	return (await import('./rateLimit')).checkRateLimit;
};

const CONFIG = { limit: 3, windowSeconds: 60, prefix: 'test' };

afterEach(() => {
	vi.doUnmock('./redis');
	vi.useRealTimers();
});

describe('con Redis configurado', () => {
	const nuevoRedis = () => {
		const cuentas = new Map<string, number>();
		return {
			cuentas,
			incr: vi.fn(async (k: string) => {
				const n = (cuentas.get(k) ?? 0) + 1;
				cuentas.set(k, n);
				return n;
			}),
			expire: vi.fn(async () => 1),
			del: vi.fn(async (k: string) => {
				cuentas.delete(k);
				return 1;
			})
		};
	};

	it('deja pasar hasta el límite y corta a partir de ahí', async () => {
		const redis = nuevoRedis();
		const checkRateLimit = await cargar(redis);

		for (let i = 0; i < CONFIG.limit; i++) {
			expect(await checkRateLimit('1.1.1.1', CONFIG)).toBe(true);
		}
		expect(await checkRateLimit('1.1.1.1', CONFIG)).toBe(false);
	});

	it('pone caducidad sólo en la primera petición de la ventana', async () => {
		const redis = nuevoRedis();
		const checkRateLimit = await cargar(redis);

		await checkRateLimit('2.2.2.2', CONFIG);
		await checkRateLimit('2.2.2.2', CONFIG);

		expect(redis.expire).toHaveBeenCalledTimes(1);
		expect(redis.expire).toHaveBeenCalledWith('rl:test:2.2.2.2', 60);
	});

	it('separa por IP y por prefijo, que es lo que evita que un endpoint agote a otro', async () => {
		const redis = nuevoRedis();
		const checkRateLimit = await cargar(redis);

		await checkRateLimit('3.3.3.3', CONFIG);
		await checkRateLimit('3.3.3.3', { ...CONFIG, prefix: 'otro' });

		expect([...redis.cuentas.keys()]).toEqual(['rl:test:3.3.3.3', 'rl:otro:3.3.3.3']);
	});

	/**
	 * Decisión deliberada que conviene tener fijada: si Redis falla, **se deja pasar**.
	 * Un limitador caído no puede convertirse en una caída del servicio; el precio es
	 * quedarse sin protección justo mientras dure la avería.
	 */
	it('si Redis se cae, deja pasar en vez de bloquear el servicio', async () => {
		const checkRateLimit = await cargar({
			incr: vi.fn(async () => {
				throw new Error('Upstash no responde');
			}),
			expire: vi.fn(),
			del: vi.fn()
		});

		expect(await checkRateLimit('4.4.4.4', CONFIG)).toBe(true);
	});

	/**
	 * ⚠️ El modo de fallo feo, y la razón de que exista `del` en el camino de error.
	 *
	 * `incr` y `expire` son dos peticiones HTTP distintas contra Upstash. Si la
	 * primera funciona y la segunda no, la clave queda **sin caducidad**: el contador
	 * ya no se reinicia nunca, sigue creciendo con cada visita y, en cuanto pasa el
	 * límite, esa IP queda bloqueada **para siempre**. No es hipotético: es un blip de
	 * red entre dos llamadas. Antes se tragaba la excepción y devolvía «pasa», con lo
	 * que el problema no se veía hasta que un usuario dejaba de poder usar la app.
	 */
	it('si falla al poner la caducidad, borra la clave en vez de dejarla inmortal', async () => {
		const cuentas = new Map<string, number>();
		const redis = {
			incr: vi.fn(async (k: string) => {
				const n = (cuentas.get(k) ?? 0) + 1;
				cuentas.set(k, n);
				return n;
			}),
			expire: vi.fn(async () => {
				throw new Error('blip de red');
			}),
			del: vi.fn(async (k: string) => {
				cuentas.delete(k);
				return 1;
			})
		};
		const checkRateLimit = await cargar(redis);

		expect(await checkRateLimit('5.5.5.5', CONFIG)).toBe(true);
		expect(redis.del).toHaveBeenCalledWith('rl:test:5.5.5.5');
		// Y la clave no se queda contando para siempre.
		expect(cuentas.has('rl:test:5.5.5.5')).toBe(false);
	});
});

describe('sin Redis, con el fallback en memoria', () => {
	beforeEach(() => {
		// Es aritmética de tiempo: contra el reloj real, la ventana se probaría sola y
		// mal. Fecha fija, como en el resto del repo.
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-07T12:00:00Z'));
	});

	it('deja pasar hasta el límite y corta a partir de ahí', async () => {
		const checkRateLimit = await cargar(null);

		for (let i = 0; i < CONFIG.limit; i++) {
			expect(await checkRateLimit('1.1.1.1', CONFIG)).toBe(true);
		}
		expect(await checkRateLimit('1.1.1.1', CONFIG)).toBe(false);
	});

	it('vuelve a dejar pasar cuando la ventana ha pasado', async () => {
		const checkRateLimit = await cargar(null);

		for (let i = 0; i < CONFIG.limit; i++) await checkRateLimit('1.1.1.1', CONFIG);
		expect(await checkRateLimit('1.1.1.1', CONFIG)).toBe(false);

		vi.setSystemTime(new Date('2026-08-07T12:01:01Z')); // 61 s después
		expect(await checkRateLimit('1.1.1.1', CONFIG)).toBe(true);
	});

	/**
	 * La ventana es deslizante, no un cubo que se vacía de golpe: a los 30 segundos
	 * las peticiones anteriores siguen contando. Sin este caso, un cambio a ventana
	 * fija pasaría desapercibido y multiplicaría por dos el tráfico admitido en el
	 * borde.
	 */
	it('la ventana desliza: a medio camino las peticiones antiguas siguen contando', async () => {
		const checkRateLimit = await cargar(null);

		for (let i = 0; i < CONFIG.limit; i++) await checkRateLimit('1.1.1.1', CONFIG);
		vi.setSystemTime(new Date('2026-08-07T12:00:30Z')); // 30 s, media ventana
		expect(await checkRateLimit('1.1.1.1', CONFIG)).toBe(false);
	});

	it('cada IP lleva su propia cuenta', async () => {
		const checkRateLimit = await cargar(null);

		for (let i = 0; i < CONFIG.limit; i++) await checkRateLimit('1.1.1.1', CONFIG);
		expect(await checkRateLimit('1.1.1.1', CONFIG)).toBe(false);
		expect(await checkRateLimit('9.9.9.9', CONFIG)).toBe(true);
	});

	it('cada endpoint lleva la suya, aunque sea la misma IP', async () => {
		const checkRateLimit = await cargar(null);

		for (let i = 0; i < CONFIG.limit; i++) await checkRateLimit('1.1.1.1', CONFIG);
		expect(await checkRateLimit('1.1.1.1', CONFIG)).toBe(false);
		expect(await checkRateLimit('1.1.1.1', { ...CONFIG, prefix: 'search' })).toBe(true);
	});
});
