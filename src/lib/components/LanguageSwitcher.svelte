<script lang="ts">
	import { setLocale, locale } from '$lib/i18n/i18n-svelte';
	import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
	import type { Locales } from '$lib/i18n/i18n-types';

	const LOCALES: { code: Locales; label: string; flag: string }[] = [
		{ code: 'es', label: 'ES', flag: '🇪🇸' },
		{ code: 'en', label: 'EN', flag: '🇬🇧' }
	];

	async function handleChange(newLocale: Locales) {
		await loadLocaleAsync(newLocale);
		setLocale(newLocale);
		// Guardar preferencia en cookie (1 año)
		document.cookie = `lang=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
	}
</script>

<div class="inline-flex items-center bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-inner gap-1">
	{#each LOCALES as { code, label, flag }}
		<button
			class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-1.5 cursor-pointer select-none {$locale === code ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}"
			onclick={() => handleChange(code)}
			aria-label="Cambiar idioma a {label}"
		>
			<span class="text-sm leading-none">{flag}</span>
			<span>{label}</span>
		</button>
	{/each}
</div>
