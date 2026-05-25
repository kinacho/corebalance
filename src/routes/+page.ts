import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { portfolio } from '$lib/stores/portfolio.svelte';

export const load = async () => {
	return {};
};
