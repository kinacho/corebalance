import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
import type { Locales } from '$lib/i18n/i18n-types';

export const load: LayoutLoad = async ({ data, url }) => {
	let locale = data?.locale;

	const isEnglishRoute = url.pathname.startsWith('/en/') || url.pathname === '/en';
	if (isEnglishRoute) {
		locale = 'en';
	} else if (browser) {
		// 1. Mirar localStorage (prioridad cliente)
		const saved = localStorage.getItem('lang');
		if (saved && (saved === 'es' || saved === 'en')) {
			locale = saved as Locales;
		} else {
			// 2. Mirar cookie si no hay localStorage
			const match = document.cookie.match(/lang=(en|es)/);
			if (match) locale = match[1] as Locales;
		}
	}

	if (!locale) locale = 'es'; // Fallback final

	await loadLocaleAsync(locale as Locales);
	setLocale(locale as Locales);

	return { ...data, locale };
};
