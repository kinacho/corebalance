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
			injectRegister: 'script-defer',
			devOptions: {
				enabled: true
			},
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
				manualChunks: (id) => {
					if (id.includes('node_modules')) {
						if (id.includes('firebase')) return 'firebase';
						if (id.includes('@sveltejs') || id.includes('svelte')) return 'vendor-svelte';
						if (id.includes('chart') || id.includes('d3') || id.includes('recharts')) return 'vendor-charts';
						return 'vendor';
					}
					if (id.includes('/routes/(landing)') || id.includes('/routes/+page')) return 'landing';
					if (id.includes('/routes/dashboard')) return 'dashboard';
				}
			}
		}
	}
});
