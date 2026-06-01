import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';

export const ssr = false;

export const load: LayoutLoad = async ({ data }) => {
	const locale = data.locale;

	if (browser) {
		await loadLocaleAsync(locale);
		setLocale(locale);
	}

	return data;
};
