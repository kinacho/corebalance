<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { storageProvider } from '$lib/db';
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import { security } from '$lib/security.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let activeTab = $state<'file' | 'p2p' | 'security'>('file');
	
	// File Export/Import
	let fileInput = $state<HTMLInputElement | null>(null);
	let fileStatus = $state('');

	// P2P State
	let peerId = $state<string | null>(null);
	let peerStatus = $state('Inicializando sistema P2P...');
	let p2pLogs = $state<string[]>([]);
	let p2pState = $state<'idle' | 'initializing' | 'waiting' | 'connected' | 'syncing' | 'done' | 'error'>('idle');
	let qrCodeUrl = $state<string | null>(null);
	let peer: any = null;

	function addLog(msg: string) {
		const time = new Date().toLocaleTimeString();
		p2pLogs = [...p2pLogs.slice(-4), `[${time}] ${msg}`];
		console.log(`P2P: ${msg}`);
	}

	onMount(() => {
		return () => {
			if (peer) {
				addLog('Destruyendo instancia Peer...');
				peer.destroy();
			}
		};
	});

	async function startP2PHost() {
		if (peer) {
			peer.destroy();
			peer = null;
		}
		
		p2pState = 'initializing';
		peerStatus = 'Conectando con el servidor de señalización...';
		addLog('Iniciando sistema P2P...');
		
		// ID más robusto para evitar colisiones en el servidor público de PeerJS
		const customId = `corebalance-${Math.random().toString(36).substring(2, 10)}`;
		
		try {
			const { Peer } = await import('peerjs');
			peer = new Peer(customId, {
				debug: 2, // Aumentamos log para ver qué pasa en consola
				config: {
					iceServers: [
						{ urls: 'stun:stun.l.google.com:19302' },
						{ urls: 'stun:stun1.l.google.com:19302' },
						{ urls: 'stun:stun2.l.google.com:19302' },
						{ urls: 'stun:stun3.l.google.com:19302' },
						{ urls: 'stun:stun4.l.google.com:19302' }
					]
				}
			});

			peer.on('open', async (id: string) => {
				peerId = id;
				p2pState = 'waiting';
				peerStatus = 'Esperando conexión desde el móvil...';
				addLog(`ID registrado: ${id}`);
				
				const syncUrl = `${window.location.origin}/sync?peer=${id}`;
				qrCodeUrl = await QRCode.toDataURL(syncUrl, {
					width: 250,
					margin: 2,
					color: { dark: '#000000', light: '#ffffff' }
				});
			});

			peer.on('connection', (conn: any) => {
				addLog('¡Conexión entrante detectada!');
				p2pState = 'connected';
				peerStatus = '¡Dispositivo conectado! Estableciendo canal...';
				
				conn.on('open', () => {
					addLog('Canal de datos establecido y seguro.');
					
					// Handshake: El host confirma que está listo
					conn.send({ type: 'HOST_READY' });

					const pingInterval = setInterval(() => {
						if (conn.open) conn.send({ type: 'PING' });
						else clearInterval(pingInterval);
					}, 3000);
				});

				conn.on('data', async (data: any) => {
					if (data.type === 'PING') return;
					
					addLog(`Mensaje recibido: ${data.type}`);
					
					if (data.type === 'REQUEST_DATA') {
						p2pState = 'syncing';
						peerStatus = 'Transfiriendo datos al móvil...';
						try {
							if (storageProvider.getAllData) {
								const allData = await storageProvider.getAllData();
								const cleanData = JSON.parse(JSON.stringify(allData));
								
								addLog('Enviando paquete de datos...');
								conn.send({ type: 'SYNC_DATA', payload: cleanData });
							}
						} catch (e: any) {
							p2pState = 'error';
							peerStatus = `Error al leer datos: ${e.message}`;
							addLog(`Error: ${e.message}`);
						}
					}

					if (data.type === 'SYNC_COMPLETE') {
						addLog('¡El móvil confirma recepción correcta!');
						p2pState = 'done';
						peerStatus = '¡Sincronización completada con éxito!';
					}
				});

				conn.on('close', () => {
					if (p2pState !== 'done') {
						addLog('La conexión se cerró inesperadamente.');
						p2pState = 'error';
						peerStatus = 'Conexión perdida. Inténtalo de nuevo.';
					}
				});
				
				conn.on('error', (err: any) => {
					addLog(`Error en conexión: ${err.message}`);
					p2pState = 'error';
					peerStatus = `Error: ${err.message}`;
				});
			});

			peer.on('error', (err: any) => {
				addLog(`Error de PeerJS: ${err.type}`);
				p2pState = 'error';
				if (err.type === 'unavailable-id') {
					peerStatus = 'El ID ya está en uso. Reintentando...';
					setTimeout(startP2PHost, 1000);
				} else {
					peerStatus = `Error: ${err.message}`;
				}
			});

			peer.on('disconnected', () => {
				addLog('Desconectado del servidor de señalización.');
				if (p2pState !== 'done') peer.reconnect();
			});

		} catch (e: any) {
			p2pState = 'error';
			peerStatus = `Error al iniciar P2P: ${e.message}`;
			addLog(`Error fatal: ${e.message}`);
		}
	}

	$effect(() => {
		if (activeTab === 'p2p' && !peerId && !peer) {
			startP2PHost();
		}
	});

	// File Handling
	async function handleExport() {
		if (!storageProvider.getAllData) {
			fileStatus = 'Exportación no soportada en este modo.';
			return;
		}
		try {
			const data = await storageProvider.getAllData();
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `corebalance_backup_${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			fileStatus = '¡Archivo descargado con éxito!';
		} catch (e: any) {
			fileStatus = `Error al exportar: ${e.message}`;
		}
	}

	async function handleImport(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		fileStatus = 'Leyendo archivo...';
		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const content = e.target?.result as string;
				const data = JSON.parse(content);
				
				if (!storageProvider.importAllData) {
					throw new Error('Importación no soportada en este modo.');
				}
				
				await storageProvider.importAllData(data);
				fileStatus = '¡Datos importados con éxito! Recargando...';
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			} catch (err: any) {
				fileStatus = `Error al importar: ${err.message}`;
			}
		};
		reader.readAsText(file);
	}
</script>

<div class="modal-backdrop" transition:fade={{ duration: 200 }}>
	<div class="modal-content">
		<button class="close-btn" onclick={onClose} aria-label="Cerrar">
			<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>
		
		<h2 class="modal-title">Sincronización Local</h2>
		<p class="modal-subtitle">Tus datos viven en este navegador. Elige cómo sincronizarlos.</p>

		<div class="tabs">
			<button class="tab-btn" class:active={activeTab === 'file'} onclick={() => activeTab = 'file'}>
				Archivo JSON
			</button>
			<button class="tab-btn" class:active={activeTab === 'p2p'} onclick={() => activeTab = 'p2p'}>
				Código QR (P2P)
			</button>
			<button class="tab-btn" class:active={activeTab === 'security'} onclick={() => activeTab = 'security'}>
				Seguridad
			</button>
		</div>

		<div class="tab-content">
			{#if activeTab === 'file'}
				<div class="file-section" in:slide={{ duration: 200 }}>
					<p class="section-desc">Exporta un archivo de respaldo o restaura uno existente de forma manual.</p>
					
					<div class="actions-grid">
						<button class="action-btn export-btn" onclick={handleExport}>
							<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
								<polyline points="7 10 12 15 17 10"></polyline>
								<line x1="12" y1="15" x2="12" y2="3"></line>
							</svg>
							Descargar Backup
						</button>

						<button class="action-btn import-btn" onclick={() => fileInput?.click()}>
							<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
								<polyline points="17 8 12 3 7 8"></polyline>
								<line x1="12" y1="3" x2="12" y2="15"></line>
							</svg>
							Restaurar Backup
						</button>
						<input 
							type="file" 
							accept=".json" 
							bind:this={fileInput} 
							onchange={handleImport} 
							style="display: none;" 
						/>
					</div>
					{#if fileStatus}
						<div class="status-msg" transition:fade>{fileStatus}</div>
					{/if}
				</div>
			{:else if activeTab === 'p2p'}
				<div class="p2p-section" in:slide={{ duration: 200 }}>
					<p class="section-desc">Escanea este código con la cámara de tu móvil para enviar los datos de forma segura, encriptada y directa.</p>
					
					<div class="qr-container">
						{#if qrCodeUrl}
							<div class="qr-wrapper" class:dim={p2pState === 'syncing' || p2pState === 'done'}>
								<img src={qrCodeUrl} alt="QR Code" class="qr-image" transition:fade />
								{#if p2pState === 'syncing'}
									<div class="qr-overlay">Transfiriendo...</div>
								{:else if p2pState === 'done'}
									<div class="qr-overlay success">¡Completado!</div>
								{/if}
							</div>
						{:else}
							<div class="qr-skeleton">Iniciando P2P...</div>
						{/if}
					</div>

					<div class="p2p-status" class:success={p2pState === 'done'} class:error={p2pState === 'error'}>
						{#if p2pState !== 'error' && p2pState !== 'done'}
							<span class="pulse-dot"></span>
						{/if}
						{peerStatus}
					</div>

					{#if p2pLogs.length > 0}
						<div class="p2p-debug-logs">
							{#each p2pLogs as log}
								<div class="log-line">{log}</div>
							{/each}
						</div>
					{/if}

					<div class="p2p-actions">
						{#if p2pState === 'error'}
							<button class="action-btn retry-btn" onclick={startP2PHost}>
								Reintentar Conexión
							</button>
						{/if}
						
						<div class="divider"><span>o también</span></div>
						<button class="action-btn receive-btn" onclick={() => window.location.href = '/sync'}>
							<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
								<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
								<circle cx="12" cy="13" r="4"></circle>
							</svg>
							Escanear de otro dispositivo
						</button>
					</div>
				</div>
			{:else if activeTab === 'security'}
				<div class="security-section" in:slide={{ duration: 200 }}>
					<p class="section-desc">Protege el acceso a tus datos financieros usando la biometría nativa de tu dispositivo (FaceID, Huella o PIN).</p>
					
					<div class="security-card">
						<div class="security-info">
							<div class="security-icon-large">{security.isEnabled ? '🔒' : '🔓'}</div>
							<div>
								<div class="security-label">Bloqueo Biométrico</div>
								<div class="security-status-text">
									{#if !security.isSupported}
										No soportado en este navegador
									{:else if security.isEnabled}
										Activado y Protegido
									{:else}
										Desactivado
									{/if}
								</div>
							</div>
						</div>
						
						<button 
							class="toggle-switch" 
							class:active={security.isEnabled}
							class:disabled={!security.isSupported}
							onclick={() => security.toggle()}
							disabled={!security.isSupported}
							aria-label="Alternar bloqueo biométrico"
						>
							<div class="switch-handle"></div>
						</button>
					</div>

					{#if security.isEnabled}
						<div class="security-hint" transition:fade>
							La aplicación se bloqueará automáticamente cada vez que la cierres o refresques.
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(10, 10, 20, 0.85);
		backdrop-filter: blur(8px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal-content {
		background: #13131f;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		width: 100%;
		max-width: 500px;
		padding: 2rem;
		position: relative;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.close-btn {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: none;
		color: rgba(255, 255, 255, 0.6);
		width: 32px;
		height: 32px;
		border-radius: 50%;
		font-size: 1.5rem;
		line-height: 0;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.close-btn svg {
		width: 18px;
		height: 18px;
		display: block;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.modal-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		color: white;
	}

	.modal-subtitle {
		font-size: 0.9rem;
		color: rgba(160, 160, 200, 0.7);
		margin: 0 0 2rem 0;
	}

	.tabs {
		display: flex;
		background: rgba(0, 0, 0, 0.2);
		padding: 0.35rem;
		border-radius: 12px;
		margin-bottom: 1.5rem;
	}

	.tab-btn {
		flex: 1;
		background: transparent;
		border: none;
		padding: 0.6rem;
		color: rgba(160, 160, 200, 0.8);
		font-weight: 600;
		font-size: 0.9rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab-btn.active {
		background: #3b82f6;
		color: white;
		box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
	}

	.tab-content {
		min-height: 250px;
	}

	.section-desc {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.5;
		margin-bottom: 1.5rem;
	}

	.actions-grid {
		display: grid;
		gap: 1rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		padding: 1rem;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid transparent;
	}

	.export-btn {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
		border-color: rgba(16, 185, 129, 0.2);
	}

	.export-btn:hover {
		background: rgba(16, 185, 129, 0.2);
	}

	.import-btn {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
		border-color: rgba(59, 130, 246, 0.2);
	}

	.import-btn:hover {
		background: rgba(59, 130, 246, 0.2);
	}

	.status-msg {
		margin-top: 1.5rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		font-size: 0.85rem;
		text-align: center;
		color: #a0a0c8;
	}

	.qr-container {
		background: white;
		padding: 1rem;
		border-radius: 16px;
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 250px;
		margin-bottom: 1.5rem;
	}

	.qr-image {
		width: 100%;
		max-width: 250px;
		height: auto;
		border-radius: 8px;
	}

	.qr-skeleton {
		color: rgba(0, 0, 0, 0.5);
		font-weight: 600;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.p2p-status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.p2p-receive-action {
		margin-top: 1.5rem;
	}

	.divider {
		display: flex;
		align-items: center;
		text-align: center;
		margin-bottom: 1.5rem;
		color: rgba(160, 160, 200, 0.4);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.divider::before, .divider::after {
		content: '';
		flex: 1;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.divider:not(:empty)::before { margin-right: 1rem; }
	.divider:not(:empty)::after { margin-left: 1rem; }

	.receive-btn {
		background: rgba(255, 255, 255, 0.03);
		color: rgba(255, 255, 255, 0.8);
		border: 1px dashed rgba(255, 255, 255, 0.15);
	}

	.receive-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-style: solid;
		color: white;
	}

	.p2p-status.success {
		color: #10b981;
		background: rgba(16, 185, 129, 0.1);
	}

	.p2p-status.error {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.p2p-debug-logs {
		background: rgba(0, 0, 0, 0.3);
		padding: 0.75rem;
		border-radius: 8px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.4);
		margin-bottom: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.log-line {
		margin-bottom: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.qr-wrapper {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.qr-wrapper.dim .qr-image {
		opacity: 0.2;
		filter: blur(4px);
	}

	.qr-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-weight: 800;
		color: #3b82f6;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 1.2rem;
		text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
	}

	.qr-overlay.success {
		color: #10b981;
		text-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
	}

	.retry-btn {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.2);
		margin-bottom: 1rem;
	}

	.retry-btn:hover {
		background: rgba(239, 68, 68, 0.2);
	}

	/* Security Styles */
	.security-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.security-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 1.25rem;
		border-radius: 16px;
	}

	.security-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.security-icon-large {
		font-size: 1.5rem;
	}

	.security-label {
		font-weight: 600;
		color: white;
		font-size: 1rem;
	}

	.security-status-text {
		font-size: 0.8rem;
		color: rgba(160, 160, 200, 0.6);
	}

	.security-hint {
		font-size: 0.8rem;
		color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
		padding: 0.75rem;
		border-radius: 10px;
		text-align: center;
	}

	/* Toggle Switch */
	.toggle-switch {
		width: 50px;
		height: 26px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		position: relative;
		cursor: pointer;
		border: none;
		transition: all 0.3s;
		padding: 0;
	}

	.toggle-switch.active {
		background: #3b82f6;
		box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
	}

	.toggle-switch.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.switch-handle {
		width: 20px;
		height: 20px;
		background: white;
		border-radius: 50%;
		position: absolute;
		top: 3px;
		left: 3px;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.toggle-switch.active .switch-handle {
		transform: translateX(24px);
	}
</style>
