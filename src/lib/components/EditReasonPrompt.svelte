<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import type { EditReason, HoldingEdit } from '$lib/history/types';
	import { formatShares, formatDate } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { ui } from '$lib/stores/ui.svelte';

	/**
	 * La pregunta de un clic.
	 *
	 * Editar 500 participaciones a 200 es ambiguo y ningún cálculo puede
	 * desambiguarlo, porque falta información: puede ser una venta o un dato mal
	 * tecleado. Esta es la única forma de saberlo, y se pregunta en el momento en
	 * que la respuesta es barata.
	 */
	interface Props {
		edit: HoldingEdit;
		compact?: boolean;
	}

	let { edit, compact = false }: Props = $props();

	let showDate = $state(false);
	/**
	 * `null` hasta que el usuario toca el campo, para que la fecha por defecto
	 * siga a `edit` si el aviso pasa a describir otro cambio del mismo activo.
	 */
	let userDate = $state<string | null>(null);
	const dateValue = $derived(userDate ?? formatDate(new Date(edit.date)));

	const delta = $derived(edit.sharesAfter - edit.sharesBefore);
	const movedShares = $derived(formatShares(Math.abs(delta)));
	const today = formatDate();

	function classify(reason: EditReason) {
		const parsed = showDate ? Date.parse(`${dateValue}T00:00:00Z`) : NaN;
		portfolio.classifyEdit(edit.id, reason, {
			date: Number.isFinite(parsed) ? parsed : undefined
		});
		ui.addToast($LL.edits.classified(), 'success');
	}
</script>

<div class="edit-prompt" class:compact>
	<p class="question">
		{$LL.edits.title({
			before: formatShares(edit.sharesBefore),
			after: formatShares(edit.sharesAfter),
			ticker: edit.ticker
		})}
	</p>

	<div class="actions">
		{#if delta < 0}
			<button class="choice sale" onclick={() => classify('sale')}>
				{$LL.edits.btn_sold({ shares: movedShares })}
			</button>
			<button class="choice" onclick={() => classify('correction')}>
				{$LL.edits.btn_correction()}
			</button>
			<button class="choice" onclick={() => classify('transfer')}>
				{$LL.edits.btn_transfer()}
			</button>
		{:else}
			<button class="choice purchase" onclick={() => classify('purchase')}>
				{$LL.edits.btn_bought({ shares: movedShares })}
			</button>
			<button class="choice" onclick={() => classify('correction')}>
				{$LL.edits.btn_correction()}
			</button>
		{/if}
	</div>

	{#if showDate}
		<label class="date-field">
			<span>{$LL.edits.date_label()}</span>
			<input
				type="date"
				value={dateValue}
				max={today}
				oninput={(e) => (userDate = e.currentTarget.value)}
			/>
		</label>
	{:else}
		<button class="date-toggle" onclick={() => (showDate = true)}>
			{$LL.edits.date_toggle()}
		</button>
	{/if}

	<p class="why">{$LL.edits.why_it_matters()}</p>
</div>

<style>
	.edit-prompt {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.85rem;
		margin-top: 0.75rem;
		border-radius: 14px;
		background: rgba(99, 102, 241, 0.08);
		border: 1px solid rgba(99, 102, 241, 0.25);
	}

	.edit-prompt.compact {
		padding: 0.65rem;
		gap: 0.45rem;
	}

	.question {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.35;
		color: var(--text-primary);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.choice {
		padding: 0.4rem 0.7rem;
		border-radius: 9px;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		transition: all 0.15s ease;
	}

	.choice:hover {
		background: rgba(255, 255, 255, 0.14);
		transform: translateY(-1px);
	}

	.choice.sale {
		background: rgba(245, 158, 11, 0.16);
		border-color: rgba(245, 158, 11, 0.4);
	}

	.choice.purchase {
		background: rgba(16, 185, 129, 0.16);
		border-color: rgba(16, 185, 129, 0.4);
	}

	.date-toggle {
		align-self: flex-start;
		background: transparent;
		border: none;
		padding: 0;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
		text-decoration: underline;
		cursor: pointer;
	}

	.date-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.date-field input {
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.25rem 0.45rem;
		color: var(--text-primary);
		font-size: 0.72rem;
		font-family: inherit;
	}

	.why {
		margin: 0;
		font-size: 0.68rem;
		line-height: 1.4;
		color: var(--text-muted);
	}
</style>
