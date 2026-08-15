<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import { fly } from 'svelte/transition';
	import { LL } from '$lib/i18n/i18n-svelte';

	/**
	 * Aviso de versión nueva.
	 *
	 * ⚠️ Existe porque el service worker estaba en `registerType: 'autoUpdate'`, y eso
	 * **recarga la pestaña sin preguntar** en cuanto se despliega: el módulo virtual
	 * escucha `controlling` y llama a `location.reload()`. En una app cuyos datos viven
	 * en el navegador eso es pérdida de trabajo silenciosa —un import de CSV a medias,
	 * una edición sin guardar— provocada por algo que el usuario no ha pedido.
	 *
	 * En modo `prompt` el worker nuevo se queda esperando y aquí se decide. Si se
	 * descarta, no se insiste: el worker entrará solo la próxima vez que se abra la app
	 * desde cero, que es el comportamiento estándar y no interrumpe nada.
	 */
	let dismissed = $state(false);
	let show = $derived(ui.swUpdateReady && !dismissed);

	function reload() {
		ui.applySwUpdate?.();
	}
</script>

{#if show}
	<div
		class="update-popup fixed bottom-4 left-4 md:left-8 z-50 w-[300px] md:w-80 panel-tema backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
		transition:fly={{ y: 20, duration: 400 }}
		role="status"
	>
		<button
			class="absolute top-3 right-3 cierre-tema"
			onclick={() => (dismissed = true)}
			aria-label={$LL.common.close()}>✕</button
		>

		<div class="flex items-center gap-3">
			<div class="text-3xl">✨</div>
			<div>
				<h3 class="font-bold text-sm titulo-tema">{$LL.db.pwa_update_title()}</h3>
				<p class="text-xs mt-1 apoyo-tema">{$LL.db.pwa_update_desc()}</p>
			</div>
		</div>

		<div class="flex gap-2">
			<button
				class="flex-1 accion-tema font-bold text-sm py-2 rounded-lg transition"
				onclick={reload}
			>
				{$LL.db.pwa_update_btn()}
			</button>
			<button
				class="flex-1 secundario-tema text-sm font-medium py-2 rounded-lg transition"
				onclick={() => (dismissed = true)}
			>
				{$LL.db.pwa_update_later()}
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
