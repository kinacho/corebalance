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
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			devOptions: {
				enabled: true
			},
			// Usamos modifyURLPrefix para que @vite-pwa/sveltekit salte su buildGlobPatterns
			// interna (que siempre inyecta prerendered/**). Con este flag activo, el plugin
			// delega el control de los patrones completamente al usuario. Precacheamos sólo
			// los assets del cliente: el HTML público lo prerenderiza el build y lo sirve la CDN.
			workbox: {
				globPatterns: [
					'client/**/*.{js,css,html,ico,png,webp,woff2,svg,json,webmanifest}'
				],
				globIgnores: ['server/**'],
				modifyURLPrefix: { 'client/': '/' },
				navigateFallback: '/offline.html',
				navigateFallbackDenylist: [/^\/api\//]
			},
			includeAssets: ['favicon.png', 'logo.webp', 'pwa-192x192.png', 'pwa-512x512.png'],
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
