<script lang="ts">
	import { security } from '$lib/security.svelte';
	import { fade } from 'svelte/transition';

	async function handleUnlock() {
		const success = await security.authenticate();
		if (success) security.unlock();
	}
</script>

{#if security.isLocked}
	<div class="lock-screen" transition:fade>
		<div class="lock-content">
			<div class="lock-icon">🔒</div>
			<h1>App Bloqueada</h1>
			<p>Usa tu huella o cara para acceder al Balanceador</p>
			<button class="unlock-btn" onclick={handleUnlock}>
				Desbloquear con Biometría
			</button>
		</div>
	</div>
{/if}

<style>
	.lock-screen {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: #0a0a16;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.lock-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
	}

	.lock-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
	}

	p {
		color: rgba(160, 160, 200, 0.6);
		max-width: 250px;
		margin: 0;
	}

	.unlock-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 1rem 2rem;
		border-radius: 14px;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.unlock-btn:active {
		transform: scale(0.95);
	}
</style>
