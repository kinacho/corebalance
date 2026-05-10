<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { storageProvider } from '$lib/db';

	let status = $state('Inicializando sistema...');
	let error = $state<string | null>(null);
	let success = $state(false);

	onMount(async () => {
		const targetPeerId = $page.url.searchParams.get('peer');
		if (!targetPeerId) {
			error = 'No se ha proporcionado un ID de conexión en la URL.';
			return;
		}

		status = 'Conectando al servidor de señalización P2P...';

		try {
			const { Peer } = await import('peerjs');
			const peer = new Peer();

			peer.on('open', () => {
				status = `Conectando directamente con el dispositivo origen...`;
				
				const conn = peer.connect(targetPeerId);

				conn.on('open', () => {
					status = '¡Conectado! Solicitando datos...';
					conn.send({ type: 'REQUEST_DATA' });
				});

				conn.on('data', async (data: any) => {
					if (data.type === 'SYNC_DATA') {
						status = 'Recibiendo datos...';
						try {
							if (!storageProvider.importAllData) {
								throw new Error('El almacenamiento actual no soporta importación local.');
							}
							
							await storageProvider.importAllData(data.payload);
							
							success = true;
							status = '¡Datos sincronizados con éxito! Redirigiendo...';
							
							setTimeout(() => {
								peer.destroy();
								goto('/');
							}, 2000);
						} catch (e: any) {
							error = `Error al guardar datos: ${e.message}`;
						}
					}
				});

				conn.on('error', (err: any) => {
					error = `Error en la conexión: ${err.message}`;
				});
			});

			peer.on('error', (err: any) => {
				error = `Error P2P: ${err.message}`;
			});

		} catch (e: any) {
			error = `Error al cargar librería: ${e.message}`;
		}
	});
</script>

<svelte:head>
	<title>Sincronizando... | Balanceador</title>
</svelte:head>

<div class="sync-container">
	<div class="card">
		<div class="icon" class:success class:error={!!error}>
			{#if error}
				❌
			{:else if success}
				✅
			{:else}
				⏳
			{/if}
		</div>
		
		<h1>Sincronización P2P</h1>
		
		{#if error}
			<div class="error-msg">{error}</div>
			<button class="btn" onclick={() => goto('/')}>Ir al inicio</button>
		{:else}
			<div class="status-msg" class:success>{status}</div>
			<div class="progress">
				<div class="progress-bar" class:done={success}></div>
			</div>
		{/if}
	</div>
</div>

<style>
	.sync-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: #0a0a14;
		color: white;
	}

	.card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 3rem 2rem;
		border-radius: 24px;
		max-width: 400px;
		width: 100%;
		text-align: center;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		animation: bounce 2s infinite;
	}

	.icon.success { animation: none; filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.5)); }
	.icon.error { animation: none; filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.5)); }

	@keyframes bounce {
		0%, 100% { transform: translateY(-10px); }
		50% { transform: translateY(0); }
	}

	h1 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		color: #f0f0ff;
	}

	.status-msg {
		color: #3b82f6;
		font-weight: 500;
		margin-bottom: 2rem;
	}

	.status-msg.success {
		color: #10b981;
	}

	.error-msg {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		padding: 1rem;
		border-radius: 12px;
		margin-bottom: 2rem;
		font-size: 0.9rem;
	}

	.progress {
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		width: 50%;
		background: #3b82f6;
		animation: loading 1.5s ease-in-out infinite alternate;
	}

	.progress-bar.done {
		width: 100%;
		background: #10b981;
		animation: none;
	}

	@keyframes loading {
		0% { width: 0%; transform: translateX(0); }
		100% { width: 50%; transform: translateX(100%); }
	}

	.btn {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		transition: background 0.2s;
	}

	.btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
