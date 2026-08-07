import { redis } from './redis';

// Fallback en memoria para desarrollo local
const memoryLimits = new Map<string, number[]>();

export interface RateLimitConfig {
	limit: number;
	windowSeconds: number;
	prefix: string;
}

/**
 * Comprueba si la IP ha superado el rate limit establecido.
 * Utiliza Redis si está configurado; de lo contrario, recurre a un fallback en memoria.
 */
export async function checkRateLimit(ip: string, config: RateLimitConfig): Promise<boolean> {
	if (redis) {
		const key = `rl:${config.prefix}:${ip}`;
		try {
			const count = await redis.incr(key);
			if (count === 1) {
				/**
				 * ⚠️ `incr` y `expire` son dos peticiones HTTP distintas contra Upstash, y
				 * si la primera funciona y la segunda no, la clave queda **sin caducidad**:
				 * el contador ya no se reinicia nunca, sigue creciendo con cada visita y en
				 * cuanto pasa del límite esa IP queda bloqueada **para siempre**. Basta un
				 * blip de red entre las dos llamadas.
				 *
				 * Antes esto vivía dentro del `try` general, así que el fallo se tragaba
				 * como cualquier otro y se devolvía «pasa» — el problema no se veía hasta
				 * que un usuario dejaba de poder usar la app, sin nada en los logs que lo
				 * relacionara. Ahora se borra la clave: perder el contador de esta ventana
				 * es infinitamente más barato que dejar una clave inmortal.
				 */
				try {
					await redis.expire(key, config.windowSeconds);
				} catch (e) {
					console.error(`No se pudo caducar la clave de rate limit ${key}:`, e);
					await redis.del(key).catch(() => {});
					return true;
				}
			}
			return count <= config.limit;
		} catch (e) {
			console.error(`Error en Redis rate limit para ${config.prefix}:`, e);
			return true; // Fallback permisivo ante errores del servidor de Redis
		}
	}

	// Fallback local en memoria para desarrollo
	const now = Date.now();
	const key = `${config.prefix}:${ip}`;
	const requests = memoryLimits.get(key) || [];
	const recent = requests.filter(t => now - t < config.windowSeconds * 1000);
	
	if (recent.length >= config.limit) return false;
	
	recent.push(now);
	memoryLimits.set(key, recent);

	// Limpieza periódica para evitar fugas de memoria
	if (memoryLimits.size > 1000) {
		for (const [k, times] of memoryLimits) {
			if (times.every(t => now - t > config.windowSeconds * 1000)) {
				memoryLimits.delete(k);
			}
		}
	}
	return true;
}
