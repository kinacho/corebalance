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

	// QR Sync State
	let qrStatus = $state('');
	let qrCodeUrl = $state<string | null>(null);
	let qrState = $state<'idle' | 'generating' | 'ready' | 'error'>('idle');

	function switchTab(tab: 'file' | 'p2p' | 'security') {
		activeTab = tab;
		if (tab === 'p2p' && qrState === 'idle') {
			generateSyncQR();
		}
	}

	async function compressAndEncode(json: string): Promise<string> {
		const blob = new Blob([json]);
		const cs = new CompressionStream('deflate');
		const compressed = await new Response(blob.stream().pipeThrough(cs)).blob();
		const buffer = await compressed.arrayBuffer();
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
		return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}

	async function generateSyncQR() {
		qrState = 'generating';
		qrStatus = 'Preparando datos...';
		qrCodeUrl = null;

		try {
			if (!storageProvider.getAllData) throw new Error('Exportación no soportada.');

			const data = await storageProvider.getAllData();
			const json = JSON.stringify(data);
			const encoded = await compressAndEncode(json);
			const syncUrl = `${window.location.origin}/sync#${encoded}`;

			if (syncUrl.length > 2500) {
				qrState = 'error';
				qrStatus = `Datos muy grandes (${(json.length / 1024).toFixed(1)} KB). Usa "Archivo JSON" en su lugar.`;
				return;
			}

			qrCodeUrl = await QRCode.toDataURL(syncUrl, {
				width: 280,
				margin: 2,
				color: { dark: '#000000', light: '#ffffff' }
			});

			qrState = 'ready';
			qrStatus = 'Escanea este QR con la cámara de tu móvil.';
		} catch (e: any) {
			qrState = 'error';
			qrStatus = `Error: ${e.message}`;
		}
	}

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
			<button class="tab-btn" class:active={activeTab === 'file'} onclick={() => switchTab('file')}>
				Archivo JSON
			</button>
			<button class="tab-btn" class:active={activeTab === 'p2p'} onclick={() => switchTab('p2p')}>
				Código QR (P2P)
			</button>
			<button class="tab-btn" class:active={activeTab === 'security'} onclick={() => switchTab('security')}>
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
					<p class="section-desc">Transfiere tus datos a otro dispositivo al instante. Sin servidores, sin esperas.</p>
					
					<div class="qr-container">
						{#if qrCodeUrl}
							<img src={qrCodeUrl} alt="QR Code" class="qr-image" transition:fade />
						{:else if qrState === 'error'}
							<div class="qr-skeleton">⚠️</div>
						{:else}
							<div class="qr-skeleton">Generando...</div>
						{/if}
					</div>

					{#if qrState === 'ready'}
						<div class="qr-instructions">
							<div class="qr-step">
								<span class="step-num">1</span>
								<span>Abre la <strong>cámara</strong> de tu móvil</span>
							</div>
							<div class="qr-step">
								<span class="step-num">2</span>
								<span>Apunta al código QR de arriba</span>
							</div>
							<div class="qr-step">
								<span class="step-num">3</span>
								<span>Toca el enlace — se abrirá la app y se importará solo</span>
							</div>
						</div>
					{/if}

					<div class="p2p-status" class:success={qrState === 'ready'} class:error={qrState === 'error'}>
						{#if qrState === 'generating'}
							<span class="pulse-dot"></span>
						{/if}
						{qrStatus}
					</div>

					{#if qrState === 'error'}
						<div class="p2p-actions">
							<button class="action-btn retry-btn" onclick={generateSyncQR}>
								Reintentar
							</button>
						</div>
					{/if}

					<div class="p2p-actions">
						<div class="divider"><span>o también</span></div>
						<button class="action-btn receive-btn" onclick={() => window.location.href = '/sync'}>
							<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
								<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
								<circle cx="12" cy="13" r="4"></circle>
							</svg>
							Escanear desde este dispositivo
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

	.p2p-status.success {
		color: #10b981;
		background: rgba(16, 185, 129, 0.1);
	}

	.p2p-status.error {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
		animation: pulse-dot 1s infinite;
	}

	@keyframes pulse-dot {
		0%, 100% { transform: scale(1); opacity: 1; }
		50% { transform: scale(1.5); opacity: 0.5; }
	}

	.p2p-actions {
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

	.qr-instructions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.qr-step {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		text-align: left;
	}

	.qr-step strong {
		color: #3b82f6;
	}

	.step-num {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		background: #3b82f6;
		color: white;
		border-radius: 50%;
		font-size: 0.7rem;
		font-weight: 800;
	}

	.p2p-status.success {
		color: #10b981;
		background: rgba(16, 185, 129, 0.1);
	}

	.p2p-status.error {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
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
