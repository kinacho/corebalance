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
		try {
			const key = `rl:${config.prefix}:${ip}`;
			const count = await redis.incr(key);
			if (count === 1) {
				await redis.expire(key, config.windowSeconds);
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
