<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import { fly } from 'svelte/transition';
	import { LL } from '$lib/i18n/i18n-svelte';

	let showPrompt = $state(false);

	// Usamos un effect para monitorear el prompt
	$effect(() => {
		const isDismissed = localStorage.getItem('install_prompt_dismissed');
		if (ui.deferredPrompt !== null && !isDismissed) {
			showPrompt = true;
		} else {
			showPrompt = false;
		}
	});

	function dismiss() {
		showPrompt = false;
		localStorage.setItem('install_prompt_dismissed', 'true');
	}

	async function installApp() {
		if (ui.deferredPrompt) {
			const promptEvent = ui.deferredPrompt;
			ui.deferredPrompt = null;
			await promptEvent.prompt();
			const { outcome } = await promptEvent.userChoice;
			if (outcome === 'accepted') {
				localStorage.setItem('install_prompt_dismissed', 'true');
			}
			showPrompt = false;
		}
	}
</script>

{#if showPrompt}
	<div 
		class="install-popup fixed bottom-4 right-4 md:right-8 z-50 w-[300px] md:w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
		transition:fly={{ y: 20, duration: 400 }}
	>
		<button class="absolute top-3 right-3 text-slate-400 hover:text-white" onclick={dismiss} aria-label={$LL.common.close()}>✕</button>
		
		<div class="flex items-center gap-3">
			<div class="text-3xl">🚀</div>
			<div>
				<h3 class="font-bold text-white text-sm">{$LL.db.pwa_install_title()}</h3>
				<p class="text-xs text-slate-400 mt-1">{$LL.db.pwa_install_desc()}</p>
			</div>
		</div>

		<div class="flex gap-2">
			<button class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2 rounded-lg transition" onclick={installApp}>
				{$LL.db.pwa_install_btn()}
			</button>
			<button class="flex-1 bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-2 rounded-lg transition" onclick={dismiss}>
				{$LL.db.pwa_install_later()}
			</button>
		</div>
	</div>
{/if}
