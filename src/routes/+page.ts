import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { portfolio } from '$lib/stores/portfolio.svelte';

export const load = async () => {
	// CAPA 1: Redirección server-side (o client-side temprana)
	// Nota: En esta app SPA, el estado de portfolio se inicializa en el cliente.
	// La redirección principal ocurre en el $effect de +page.svelte para mayor fiabilidad con Firebase.
	
	if (browser) {
		const bypassLanding = sessionStorage.getItem('bypassLanding') === 'true';
		if (bypassLanding) {
			throw redirect(307, '/dashboard');
		}
	}

	return {};
};
