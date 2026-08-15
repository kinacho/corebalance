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
		class="install-popup fixed bottom-4 right-4 md:right-8 z-50 w-[300px] md:w-80 panel-tema backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
		transition:fly={{ y: 20, duration: 400 }}
	>
		<button class="absolute top-3 right-3 cierre-tema" onclick={dismiss} aria-label={$LL.common.close()}>✕</button>
		
		<div class="flex items-center gap-3">
			<div class="text-3xl">🚀</div>
			<div>
				<h3 class="font-bold text-sm titulo-tema">{$LL.db.pwa_install_title()}</h3>
				<p class="text-xs mt-1 apoyo-tema">{$LL.db.pwa_install_desc()}</p>
			</div>
		</div>

		<div class="flex gap-2">
			<button class="flex-1 accion-tema font-bold text-sm py-2 rounded-lg transition" onclick={installApp}>
				{$LL.db.pwa_install_btn()}
			</button>
			<button class="flex-1 secundario-tema text-sm font-medium py-2 rounded-lg transition" onclick={dismiss}>
				{$LL.db.pwa_install_later()}
			</button>
		</div>
	</div>
{/if}

<style>
	/*
	 * ⚠️ Los colores salen de tokens y no de utilidades de Tailwind, que es lo que
	 * hace que este aviso exista en tema claro. Antes era `bg-slate-900/95` con
	 * `text-white`: un panel negro sobre página clara, con un botón `bg-white/5`
	 * que sobre blanco no era nada. Las utilidades de forma y espaciado se quedan.
	 */
	.panel-tema {
		background: var(--bg-overlay);
		border: 1px solid var(--border-subtle);
		box-shadow: var(--card-shadow);
	}
	.titulo-tema {
		color: var(--text-primary);
	}
	.apoyo-tema {
		color: var(--text-muted);
	}
	.cierre-tema {
		color: var(--text-muted);
	}
	.cierre-tema:hover {
		color: var(--text-primary);
	}
	.accion-tema {
		background: var(--accent-blue);
		color: var(--text-on-accent);
	}
	.accion-tema:hover {
		filter: brightness(1.12);
	}
	.secundario-tema {
		background: var(--bg-card-hover);
		color: var(--text-primary);
	}
	.secundario-tema:hover {
		border-color: var(--border-strong);
	}
</style>
