// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	/** Versión de package.json, inyectada por Vite (ver `define` en vite.config.ts). */
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		interface Locals {
			locale: import('$lib/i18n/i18n-types').Locales;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
