<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import EditReasonPrompt from './EditReasonPrompt.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';

	/**
	 * Lista de cambios que nadie clasificó: importaciones de CSV, sincronizaciones
	 * desde otro dispositivo o preguntas que el usuario ignoró. Mientras estén
	 * aquí cuentan como correcciones, así que el gráfico no inventa pérdidas, pero
	 * conviene poder repasarlos.
	 */
	let expanded = $state(false);

	const pending = $derived(portfolio.unclassifiedEdits);
</script>

{#if pending.length > 0}
	<div class="pending-panel">
		<div class="panel-head">
			<div class="head-text">
				<span class="count">
					{pending.length === 1
						? $LL.edits.pending_one()
						: $LL.edits.pending_many({ count: pending.length })}
				</span>
				<span class="hint">{$LL.edits.pending_hint()}</span>
			</div>
			<button class="toggle" onclick={() => (expanded = !expanded)}>
				{expanded ? $LL.edits.pending_close() : $LL.edits.pending_open()}
			</button>
		</div>

		{#if expanded}
			<div class="panel-list">
				{#each pending as edit (edit.id)}
					<EditReasonPrompt {edit} compact />
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.pending-panel {
		border-radius: 16px;
		padding: 0.9rem 1rem;
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.25);
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.head-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.count {
		font-size: 0.82rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.hint {
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--text-muted);
	}

	.toggle {
		flex-shrink: 0;
		padding: 0.4rem 0.8rem;
		border-radius: 9px;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.14);
		color: var(--text-primary);
		transition: all 0.15s ease;
	}

	.toggle:hover {
		background: rgba(255, 255, 255, 0.16);
	}

	.panel-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
</style>
