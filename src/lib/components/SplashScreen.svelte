<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	interface Props {
		loading?: boolean;
		title?: string;
		subtitle?: string;
	}

	let { loading = true, title = 'CoreBalance', subtitle = 'Portfolio Dashboard' }: Props = $props();
	
	let show = $state(true);
	let progress = $state(0);

	onMount(() => {
		const interval = setInterval(() => {
			if (progress < 90) {
				progress += Math.random() * 15;
			}
		}, 200);

		return () => clearInterval(interval);
	});

	$effect(() => {
		if (!loading) {
			progress = 100;
			setTimeout(() => {
				show = false;
			}, 400);
		}
	});
</script>

{#if show}
	<div 
		class="splash-screen" 
		transition:fade={{ duration: 600 }}
	>
		<!-- Background mesh for style consistency -->
		<div class="splash-mesh"></div>
		
		<div class="splash-content">
			<div class="logo-container">
				<div class="logo-glow"></div>
				<img src="/pwa-512x512.png" alt="CoreBalance Logo" class="logo-img" />
			</div>
			
			<div class="text-container">
				<h1 class="splash-title">{title}</h1>
				<p class="splash-subtitle">{subtitle}</p>
			</div>

			<div class="loading-container">
				<div class="loading-track">
					<div class="loading-bar" style="width: {progress}%"></div>
				</div>
				<span class="loading-text">{loading ? 'Sincronizando mercados...' : 'Listo'}</span>
			</div>
		</div>

		<div class="splash-footer">
			<p>&copy; {new Date().getFullYear()} CoreBalance Pro</p>
		</div>
	</div>
{/if}

<style>
	.splash-screen {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: #05050a;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.splash-mesh {
		position: absolute;
		inset: 0;
		background: 
			radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.25) 0, transparent 50%), 
			radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.15) 0, transparent 50%),
			radial-gradient(at 50% 50%, rgba(139, 92, 246, 0.1) 0, transparent 70%);
		filter: blur(60px);
		opacity: 0.8;
		animation: mesh-pulse 10s ease-in-out infinite alternate;
	}

	@keyframes mesh-pulse {
		0% { transform: scale(1); opacity: 0.6; }
		100% { transform: scale(1.2); opacity: 0.9; }
	}

	.splash-content {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2.5rem;
		width: 100%;
		max-width: 320px;
		padding: 2rem;
	}

	.logo-container {
		position: relative;
		width: 100px;
		height: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: float 4s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}

	.logo-glow {
		position: absolute;
		width: 140%;
		height: 140%;
		background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
		border-radius: 50%;
		animation: pulse-glow 3s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%, 100% { transform: scale(1); opacity: 0.3; }
		50% { transform: scale(1.3); opacity: 0.6; }
	}

	.logo-img {
		width: 80px;
		height: 80px;
		object-fit: contain;
		filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
	}

	.text-container {
		text-align: center;
	}

	.splash-title {
		font-size: 2.25rem;
		font-weight: 900;
		color: #fff;
		margin: 0;
		letter-spacing: -0.04em;
		background: linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.4) 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.splash-subtitle {
		font-size: 0.85rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.4);
		margin: 0.5rem 0 0 0;
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}

	.loading-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.loading-track {
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.03);
	}

	.loading-bar {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6, #60a5fa, #10b981);
		border-radius: 10px;
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
	}

	.loading-text {
		font-size: 0.7rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.3);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.splash-footer {
		position: absolute;
		bottom: 3rem;
		text-align: center;
		opacity: 0.3;
	}

	.splash-footer p {
		font-size: 0.7rem;
		font-weight: 600;
		color: #fff;
		letter-spacing: 0.05em;
	}
</style>
