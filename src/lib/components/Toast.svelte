<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import { fly, fade } from 'svelte/transition';
</script>

<div class="toast-container">
	{#each ui.toasts as toast (toast.id)}
		<div
			class="toast {toast.type}"
			in:fly={{ y: 50, duration: 300 }}
			out:fade={{ duration: 200 }}
			role="alert"
		>
			{#if toast.type === 'success'}
				<span class="icon">✓</span>
			{:else if toast.type === 'error'}
				<span class="icon">⚠️</span>
			{:else}
				<span class="icon">ℹ️</span>
			{/if}
			<span class="message">{toast.message}</span>
			<button class="close-btn" onclick={() => ui.removeToast(toast.id)}>✕</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 9999;
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: rgba(18, 18, 35, 0.95);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: white;
		font-size: 0.85rem;
		font-weight: 600;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
		min-width: 250px;
		max-width: 90vw;
	}

	.toast.success {
		border-color: rgba(16, 185, 129, 0.3);
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(18, 18, 35, 0.95));
	}

	.toast.error {
		border-color: rgba(239, 68, 68, 0.3);
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(18, 18, 35, 0.95));
	}

	.icon {
		font-size: 1rem;
	}

	.message {
		flex: 1;
	}

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0.2rem;
		border-radius: 4px;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}
</style>
