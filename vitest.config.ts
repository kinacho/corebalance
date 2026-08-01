import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/setupTest.ts'],
		env: {
			SSR: ''
		},
		resolveSnapshotPath: (testPath, snapExtension) => testPath + snapExtension,
	},
	resolve: {
		conditions: ['mode=browser', 'browser']
	}
});
