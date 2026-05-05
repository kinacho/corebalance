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
		background: rgba(10, 10, 22, 0.8);
		backdrop-filter: blur(40px) saturate(180%);
		-webkit-backdrop-filter: blur(40px) saturate(180%);
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
		padding: 3rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 40px;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
		max-width: 400px;
		width: 90%;
	}

	.lock-icon {
		font-size: 5rem;
		margin-bottom: 0.5rem;
		filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.4));
	}

	h1 {
		font-size: 2rem;
		font-weight: 800;
		color: #fff;
		margin: 0;
		letter-spacing: -0.02em;
	}

	p {
		color: rgba(160, 160, 200, 0.8);
		font-size: 1rem;
		line-height: 1.5;
		margin: 0;
	}

	.unlock-btn {
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		color: white;
		border: none;
		padding: 1.25rem 2.5rem;
		border-radius: 18px;
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
		width: 100%;
	}

	.unlock-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 15px 35px rgba(37, 99, 235, 0.4);
		filter: brightness(1.1);
	}

	.unlock-btn:active {
		transform: translateY(0) scale(0.98);
	}
</style>
