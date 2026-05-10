<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { storageProvider } from '$lib/db';
	import { browser } from '$app/environment';

	let status = $state('Esperando para sincronizar...');
	let error = $state<string | null>(null);
	let success = $state(false);
	let isScanning = $state(false);
	let html5QrCode: any = null;

	async function startSync(targetPeerId: string) {
		status = 'Conectando al servidor de señalización P2P...';
		error = null;

		try {
			const { Peer } = await import('peerjs');
			const peer = new Peer();

			peer.on('open', () => {
				status = `Conectando con el otro dispositivo...`;
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
							status = '¡Datos sincronizados con éxito!';
							setTimeout(() => {
								peer.destroy();
								goto('/');
							}, 1500);
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
	}

	async function startScanner() {
		if (!browser) return;
		isScanning = true;
		status = 'Iniciando cámara...';
		
		try {
			const { Html5Qrcode } = await import('html5-qrcode');
			html5QrCode = new Html5Qrcode("reader");
			
			const qrCodeSuccessCallback = (decodedText: string) => {
				// El QR contiene una URL como: .../sync?peer=ID
				try {
					const url = new URL(decodedText);
					const peerId = url.searchParams.get('peer');
					if (peerId) {
						stopScanner();
						startSync(peerId);
					} else {
						error = 'El código QR no parece ser un identificador válido.';
					}
				} catch (e) {
					error = 'El código escaneado no es una URL válida.';
				}
			};

			const config = { fps: 10, qrbox: { width: 250, height: 250 } };
			await html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
			status = 'Escanea el código QR del otro dispositivo';
		} catch (err: any) {
			error = `Error al acceder a la cámara: ${err.message}`;
			isScanning = false;
		}
	}

	function stopScanner() {
		if (html5QrCode && html5QrCode.isScanning) {
			html5QrCode.stop().then(() => {
				html5QrCode.clear();
				isScanning = false;
			});
		} else {
			isScanning = false;
		}
	}

	onMount(async () => {
		const targetPeerId = $page.url.searchParams.get('peer');
		if (targetPeerId) {
			startSync(targetPeerId);
		} else {
			// Si no hay ID en la URL, asumimos que el usuario quiere escanear
			startScanner();
		}
	});

	onDestroy(() => {
		if (html5QrCode && html5QrCode.isScanning) {
			html5QrCode.stop();
		}
	});
</script>

<svelte:head>
	<title>Sincronizando... | CoreBalance</title>
</svelte:head>

<div class="sync-container">
	<div class="card" class:scanning={isScanning}>
		<div class="icon" class:success class:error={!!error} class:spinning={!error && !success && !isScanning}>
			{#if error}
				❌
			{:else if success}
				✅
			{:else if isScanning}
				📷
			{:else}
				⏳
			{/if}
		</div>
		
		<h1>Sincronización P2P</h1>
		
		{#if error}
			<div class="error-msg">{error}</div>
			<div class="btn-group">
				<button class="btn primary" onclick={startScanner}>Reintentar Escaneo</button>
				<button class="btn secondary" onclick={() => goto('/')}>Cancelar</button>
			</div>
		{:else}
			<div class="status-msg" class:success>{status}</div>
			
			{#if isScanning}
				<div id="reader" class="scanner-viewport"></div>
				<button class="btn secondary" onclick={() => goto('/')}>Cancelar</button>
			{:else}
				<div class="progress">
					<div class="progress-bar" class:done={success}></div>
				</div>
			{/if}
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
		background: rgba(20, 20, 35, 0.8);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 3rem 2rem;
		border-radius: 32px;
		max-width: 450px;
		width: 100%;
		text-align: center;
		box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.7);
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.card.scanning {
		max-width: 500px;
		padding: 2rem;
	}

	.icon {
		font-size: 3.5rem;
		margin-bottom: 1.5rem;
		line-height: 1;
	}

	.icon.spinning {
		animation: rotate 2s linear infinite;
	}

	@keyframes rotate {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.icon.success { filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.5)); }
	.icon.error { filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.5)); }

	h1 {
		margin: 0 0 1rem 0;
		font-size: 1.75rem;
		font-weight: 800;
		background: linear-gradient(135deg, #fff 0%, #a0a0ff 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.status-msg {
		color: rgba(160, 160, 255, 0.8);
		font-weight: 500;
		margin-bottom: 1.5rem;
		font-size: 0.95rem;
	}

	.status-msg.success {
		color: #10b981;
	}

	.error-msg {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: #ef4444;
		padding: 1rem;
		border-radius: 16px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.scanner-viewport {
		width: 100%;
		max-width: 350px;
		margin: 0 auto 1.5rem;
		overflow: hidden;
		border-radius: 20px;
		border: 2px solid rgba(59, 130, 246, 0.3);
		background: #000;
	}

	:global(#reader video) {
		border-radius: 18px;
	}

	.progress {
		height: 6px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 3px;
		overflow: hidden;
		margin: 1rem 0;
	}

	.progress-bar {
		height: 100%;
		width: 30%;
		background: linear-gradient(90deg, #3b82f6, #60a5fa);
		box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
		animation: loading 1.5s ease-in-out infinite alternate;
	}

	.progress-bar.done {
		width: 100%;
		background: #10b981;
		animation: none;
	}

	@keyframes loading {
		0% { width: 10%; transform: translateX(0); }
		100% { width: 50%; transform: translateX(100%); }
	}

	.btn-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.btn {
		padding: 0.85rem 1.5rem;
		border-radius: 14px;
		cursor: pointer;
		font-weight: 700;
		font-size: 0.95rem;
		transition: all 0.2s;
		border: 1px solid transparent;
		width: 100%;
	}

	.btn.primary {
		background: #3b82f6;
		color: white;
		box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
	}

	.btn.primary:hover {
		background: #2563eb;
		transform: translateY(-2px);
	}

	.btn.secondary {
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.7);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.btn.secondary:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}
</style>
