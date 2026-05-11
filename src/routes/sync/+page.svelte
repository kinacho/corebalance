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
	let isSyncing = $state(false);
	let syncState = $state<'idle' | 'connecting' | 'negotiating' | 'requesting' | 'receiving' | 'saving' | 'done'>('idle');
	let html5QrCode: any = null;
	let peer: any = null;

	async function startSync(targetPeerId: string) {
		if (isSyncing) return;
		isSyncing = true;
		syncState = 'connecting';
		status = 'Conectando con el servidor P2P...';
		error = null;

		try {
			const { Peer } = await import('peerjs');
			console.log('[P2P] Librería cargada. Creando peer...');

			peer = new Peer({
				debug: 2,
				serialization: 'json',  // Must match host
				config: {
					iceServers: [
						{ urls: 'stun:stun.l.google.com:19302' },
						{ urls: 'stun:stun1.l.google.com:19302' },
						{ urls: 'stun:stun2.l.google.com:19302' },
						{ urls: 'stun:stun3.l.google.com:19302' }
					]
				}
			} as any);

			// Timeout for signaling server
			const signalTimeout = setTimeout(() => {
				if (syncState === 'connecting') {
					error = 'No se pudo conectar al servidor P2P. Comprueba tu conexión a internet.';
					isSyncing = false;
					if (peer) peer.destroy();
				}
			}, 12000);

			peer.on('open', () => {
				clearTimeout(signalTimeout);
				console.log('[P2P] Registrado en servidor. Conectando con PC...');
				status = 'Conectando con el PC...';
				syncState = 'negotiating';

				// Timeout for peer connection
				const connectTimeout = setTimeout(() => {
					if (syncState === 'negotiating') {
						error = 'No se pudo conectar con el PC. ¿Está el QR abierto?';
						isSyncing = false;
						if (peer) peer.destroy();
					}
				}, 15000);

				const conn = peer.connect(targetPeerId, { reliable: true });

				conn.on('open', () => {
					console.log('[P2P] Canal abierto. Esperando HOST_READY...');
				});

				conn.on('data', async (data: any) => {
					if (!data || !data.type) return;
					if (data.type === 'PING') { conn.send({ type: 'PONG' }); return; }

					console.log('[P2P] ←', data.type);

					if (data.type === 'HOST_READY') {
						clearTimeout(connectTimeout);
						status = 'PC listo. Solicitando datos...';
						syncState = 'requesting';
						setTimeout(() => conn.send({ type: 'REQUEST_DATA' }), 300);
					}

					if (data.type === 'SYNC_DATA') {
						syncState = 'receiving';
						status = 'Datos recibidos. Guardando...';
						try {
							if (!storageProvider.importAllData) {
								throw new Error('Importación no disponible.');
							}
							syncState = 'saving';
							status = 'Guardando en base de datos local...';
							await storageProvider.importAllData(data.payload);

							// Confirm reception to host
							conn.send({ type: 'ACK' });

							success = true;
							syncState = 'done';
							status = '¡Sincronización exitosa!';

							setTimeout(() => {
								if (peer) peer.destroy();
								goto('/');
							}, 2000);
						} catch (e: any) {
							error = `Error al guardar: ${e.message}`;
							isSyncing = false;
						}
					}
				});

				conn.on('close', () => {
					if (!success) {
						error = 'La conexión se cerró inesperadamente.';
						isSyncing = false;
					}
				});

				conn.on('error', (err: any) => {
					error = `Error de conexión: ${err.message}`;
					isSyncing = false;
				});
			});

			peer.on('error', (err: any) => {
				clearTimeout(signalTimeout);
				error = `Error P2P: ${err.message}`;
				isSyncing = false;
			});

		} catch (e: any) {
			error = `Error: ${e.message}`;
			isSyncing = false;
		}
	}


	async function startScanner() {
		if (!browser) return;
		isScanning = true;
		status = 'Iniciando cámara...';
		
		try {
			const { Html5Qrcode } = await import('html5-qrcode');
			html5QrCode = new Html5Qrcode("reader");
			
			const qrCodeSuccessCallback = async (decodedText: string) => {
				if (!isScanning) return;
				
				try {
					const url = new URL(decodedText);
					const peerId = url.searchParams.get('peer')?.trim();
					if (peerId) {
						console.log('P2P: QR detectado:', peerId);
						isScanning = false;
						status = 'Deteniendo escáner...';
						await stopScanner();
						// Esperar un momento para liberar recursos de red/cámara
						setTimeout(() => startSync(peerId), 800);
					}
				} catch (e) {
					console.error('Error al procesar QR:', e);
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

	async function stopScanner() {
		if (html5QrCode && html5QrCode.isScanning) {
			try {
				await html5QrCode.stop();
				await html5QrCode.clear();
				isScanning = false;
				console.log('P2P: Escáner detenido correctamente');
			} catch (e) {
				console.error('Error al detener escáner:', e);
				isScanning = false;
			}
		} else {
			isScanning = false;
		}
	}

	onMount(async () => {
		const targetPeerId = $page.url.searchParams.get('peer')?.trim();
		if (targetPeerId) {
			console.log('P2P: Iniciando sync desde URL con ID:', targetPeerId);
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
				<button class="btn primary" onclick={() => window.location.reload()}>Reintentar</button>
				<button class="btn secondary" onclick={() => goto('/')}>Cancelar</button>
			</div>
		{:else}
			<div class="status-msg" class:success>{status}</div>
			
			{#if isScanning}
				<div id="reader" class="scanner-viewport"></div>
				<button class="btn secondary" onclick={() => goto('/')}>Cancelar</button>
			{:else}
				<div class="sync-steps">
					<div class="step" class:active={syncState === 'connecting' || syncState === 'negotiating'} class:done={syncState !== 'idle' && syncState !== 'connecting' && syncState !== 'negotiating'}>
						<span class="step-icon">🤝</span>
						Conexión
					</div>
					<div class="step" class:active={syncState === 'requesting' || syncState === 'receiving'} class:done={syncState === 'saving' || syncState === 'done'}>
						<span class="step-icon">📥</span>
						Transferencia
					</div>
					<div class="step" class:active={syncState === 'saving'} class:done={syncState === 'done'}>
						<span class="step-icon">💾</span>
						Persistencia
					</div>
				</div>

				<div class="progress">
					<div class="progress-bar" class:done={success} class:error={!!error}></div>
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
		background-clip: text;
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
		0% { width: 10%; transform: translateX(-100%); }
		100% { width: 100%; transform: translateX(100%); }
	}

	.sync-steps {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.3);
		transition: all 0.3s;
	}

	.step-icon {
		font-size: 1.5rem;
		opacity: 0.3;
		filter: grayscale(1);
		transition: all 0.3s;
	}

	.step.active {
		color: #3b82f6;
		transform: scale(1.1);
	}

	.step.active .step-icon {
		opacity: 1;
		filter: grayscale(0);
		filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5));
	}

	.step.done {
		color: #10b981;
	}

	.step.done .step-icon {
		opacity: 1;
		filter: grayscale(0);
	}

	.progress-bar.error {
		background: #ef4444;
		width: 100%;
		animation: none;
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
