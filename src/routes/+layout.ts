import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';

export const load: LayoutLoad = async ({ data }) => {
	const locale = data.locale;

	if (browser) {
		// No await here to prevent blocking the UI
		loadLocaleAsync(locale).then(() => setLocale(locale));
	}

	return data;
};
