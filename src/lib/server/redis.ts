import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

// Soporte para variables con y sin prefijo
const redisUrl = env.KV_REST_API_URL || (env as any).corebalance_KV_REST_API_URL;
const redisToken = env.KV_REST_API_TOKEN || (env as any).corebalance_KV_REST_API_TOKEN;

export const redis = (redisUrl && redisToken)
	? new Redis({ url: redisUrl, token: redisToken })
	: null;
