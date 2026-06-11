import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { imagetools } from 'vite-imagetools';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
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
			// Glob patterns explícitos: excluimos prerendered/** porque la app es 100% SSR
			// sin rutas prerendeadas, lo que evita el warning de Workbox en el build.
			workbox: {
				globPatterns: ['client/**/*.{js,css,html,ico,png,webp,woff2,svg,json}'],
				navigateFallback: null
			},
			includeAssets: ['favicon.png', 'logo.webp', 'pwa-192x192.png', 'pwa-512x512.png'],
			manifest: {
				name: 'CoreBalance — Portfolio Dashboard',
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
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
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
