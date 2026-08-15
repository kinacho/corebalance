<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { storageProvider } from '$lib/db';
	import { onMount, onDestroy } from 'svelte';
	import { bloquearScroll, desbloquearScroll } from '$lib/modal-lock';
	import * as QRCode from 'qrcode';
	import { MAX_SYNC_URL_LENGTH, encodeSyncPayload, syncUrl } from '$lib/sync-payload';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { formatDate, validateImportData } from '../utils';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	onMount(() => bloquearScroll());
	onDestroy(() => desbloquearScroll());

	let activeTab = $state<'file' | 'p2p'>('file');
	
	// File Export/Import
	let fileInput = $state<HTMLInputElement | null>(null);
	let fileStatus = $state('');

	// QR Sync State
	let qrStatus = $state('');
	let qrCodeUrl = $state<string | null>(null);
	let qrState = $state<'idle' | 'generating' | 'ready' | 'error'>('idle');

	function switchTab(tab: 'file' | 'p2p') {
		activeTab = tab;
		if (tab === 'p2p' && qrState === 'idle') {
			generateSyncQR();
		}
	}

	/**
	 * ⚠️ El códec vivía aquí dentro y **no tenía pareja**: el QR apuntaba a `/sync`, una
	 * ruta que no existía, y nada en el repo descomprimía ese fragmento. Ahora los dos
	 * extremos comparten `$lib/sync-payload.ts`, que es la única forma de que emisor y
	 * receptor no se separen; y el traspaso deja fuera el historial de snapshots, sin lo
	 * cual el QR no cabía nunca (6.423 caracteres medidos contra un límite de 2.000).
	 */
	async function generateSyncQR() {
		qrState = 'generating';
		qrStatus = $LL.sync.qr_preparing();
		qrCodeUrl = null;

		try {
			/**
			 * ⚠️ La cartera se pide **al store**, no a `storageProvider.getAllData()`.
			 * Con `PUBLIC_USE_FIREBASE=true` —el entorno que se publica— eso último es
			 * `FirebaseStorage`, que lanza «Debes iniciar sesión para exportar datos»: la
			 * pestaña entera estaba muerta para quien no ha iniciado sesión, que es el
			 * usuario por defecto de esta app. Comprobado en pantalla antes de tocarlo.
			 */
			const payload = portfolio.snapshotForTransfer();
			const json = JSON.stringify(payload);
			const encoded = await encodeSyncPayload(payload);
			const url = syncUrl(window.location.origin, encoded);

			if (url.length > MAX_SYNC_URL_LENGTH) {
				qrState = 'error';
				qrStatus = $LL.sync.qr_too_large({ size: (json.length / 1024).toFixed(1) });
				return;
			}

			qrCodeUrl = await QRCode.toDataURL(url, {
				width: 400, // Higher resolution for better clarity
				margin: 4,  // More quiet zone
				errorCorrectionLevel: 'L', // Lower density dots
				color: { dark: '#000000', light: '#ffffff' }
			});

			qrState = 'ready';
			qrStatus = $LL.sync.qr_scanned();
		} catch (e: any) {
			qrState = 'error';
			qrStatus = $LL.sync.qr_error({ error: e.message });
		}
	}

	// File Handling
	async function handleExport() {
		if (!storageProvider.getAllData) {
			fileStatus = $LL.sync.status_export_not_supported();
			return;
		}
		try {
			const data = await storageProvider.getAllData();
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `corebalance_backup_${formatDate()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			fileStatus = $LL.sync.status_export_success();
		} catch (e: any) {
			fileStatus = $LL.sync.status_export_error({ error: e.message });
		}
	}

	async function handleImport(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		fileStatus = $LL.sync.status_reading();
		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const content = e.target?.result as string;
				const data = JSON.parse(content);
				
				if (!validateImportData(data)) {
					throw new Error($LL.sync.status_invalid_format());
				}
				
				if (!storageProvider.importAllData) {
					throw new Error($LL.sync.status_not_supported());
				}
				
				await storageProvider.importAllData(data);
				fileStatus = $LL.sync.status_success_reload();
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			} catch (err: any) {
				fileStatus = $LL.sync.status_import_error({ error: err.message });
			}
		};
		reader.readAsText(file);
	}
	onMount(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div 
	class="modal-backdrop" 
	transition:fade={{ duration: 200 }} 
	onclick={(e) => e.target === e.currentTarget && onClose()}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && onClose()}
	role="button"
	tabindex="0"
	aria-label={$LL.common.close()}
>
	<div 
		class="modal-content" 
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="presentation"
	>
		<button class="close-btn" onclick={onClose} aria-label={$LL.common.close()}>
			<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>
		
		<h2 class="modal-title">{$LL.sync.title()}</h2>
		<p class="modal-subtitle">{$LL.sync.subtitle()}</p>
 
		<div class="tabs">
			<button class="tab-btn" class:active={activeTab === 'file'} onclick={() => switchTab('file')}>
				{$LL.sync.tab_json()}
			</button>
			<button class="tab-btn" class:active={activeTab === 'p2p'} onclick={() => switchTab('p2p')}>
				{$LL.sync.tab_qr()}
			</button>
		</div>

		<div class="tab-content">
			{#if activeTab === 'file'}
				<div class="file-section" in:slide={{ duration: 200 }}>
					<p class="section-desc">{$LL.sync.desc_json()}</p>
					
					<div class="actions-grid">
						<button class="action-btn export-btn" onclick={handleExport}>
							<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
								<polyline points="7 10 12 15 17 10"></polyline>
								<line x1="12" y1="15" x2="12" y2="3"></line>
							</svg>
							{$LL.sync.btn_download()}
						</button>
 
						<button class="action-btn import-btn" onclick={() => fileInput?.click()}>
							<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
								<polyline points="17 8 12 3 7 8"></polyline>
								<line x1="12" y1="3" x2="12" y2="15"></line>
							</svg>
							{$LL.sync.btn_restore()}
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
					<p class="section-desc">{$LL.sync.desc_p2p()}</p>
					
					<div class="qr-container">
						{#if qrCodeUrl}
							<img src={qrCodeUrl} alt="QR Code" class="qr-image" transition:fade />
						{:else if qrState === 'error'}
							<div class="qr-skeleton">⚠️</div>
						{:else}
							<div class="qr-skeleton">{$LL.common.loading()}</div>
						{/if}
					</div>

					{#if qrState === 'ready'}
						<div class="qr-instructions">
							<div class="qr-step">
								<span class="step-num">1</span>
								<span>{@html $LL.sync.step_1({ bold: `<strong>${$LL.sync.step_1_bold()}</strong>` })}</span>
							</div>
							<div class="qr-step">
								<span class="step-num">2</span>
								<span>{$LL.sync.step_2()}</span>
							</div>
							<div class="qr-step">
								<span class="step-num">3</span>
								<span>{$LL.sync.step_3()}</span>
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
								{$LL.common.retry()}
							</button>
						</div>
					{/if}

					<!--
						⚠️ Aquí había un botón «Escanear desde este dispositivo» que hacía
						`window.location.href = '/sync'`. Dos cosas mal a la vez: prometía un
						lector de códigos que la app no tiene —`qrcode` los genera, no los lee— y
						navegaba a una ruta que no existía, así que sacaba al usuario de la app a
						un 404. Borrado en vez de arreglado: la ruta ahora existe, pero es la que
						*recibe* un enlace escaneado con la cámara, no un escáner.

						En su sitio, decir qué lleva el QR: es lo que explica por qué cabe.
					-->
					{#if qrState === 'ready'}
						<p class="qr-note">{$LL.sync.qr_note_history()}</p>
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
		align-items: flex-start;
		justify-content: center;
		padding: 1rem;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	.modal-content {
		background: #13131f;
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		width: 100%;
		max-width: 500px;
		padding: 2rem;
		position: relative;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		margin-top: auto;
		margin-bottom: auto;
	}

	@media (max-width: 480px) {
		.modal-content {
			padding: 1.5rem 1.5rem 3rem 1.5rem;
			border-radius: 28px 28px 0 0;
			margin-top: 2rem;
			margin-bottom: 0;
			min-height: calc(100% - 2rem);
		}

		.close-btn {
			top: 1rem !important;
			right: 1rem !important;
			width: 36px !important;
			height: 36px !important;
		}

		.modal-title {
			font-size: 1.25rem !important;
			margin-top: 0.5rem;
		}
	}

	.close-btn {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		background: var(--bg-card-hover);
		border: none;
		color: var(--text-muted);
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
		color: var(--text-secondary);
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
		color: var(--text-secondary);
		font-weight: 600;
		font-size: 0.9rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab-btn.active {
		background: var(--accent-blue);
		color: var(--text-on-accent);
		box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
	}

	.tab-content {
		min-height: 250px;
	}

	.section-desc {
		font-size: 0.9rem;
		color: var(--text-secondary);
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
		color: var(--accent-green-ink);
		border-color: rgba(16, 185, 129, 0.2);
	}

	.export-btn:hover {
		background: rgba(16, 185, 129, 0.2);
	}

	.import-btn {
		background: rgba(59, 130, 246, 0.1);
		color: var(--accent-blue-ink);
		border-color: rgba(59, 130, 246, 0.2);
	}

	.import-btn:hover {
		background: rgba(59, 130, 246, 0.2);
	}

	.status-msg {
		margin-top: 1.5rem;
		padding: 1rem;
		background: var(--bg-card-hover);
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
		min-height: 280px;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 480px) {
		.qr-container {
			min-height: 240px;
			padding: 0.75rem;
		}
	}

	.qr-image {
		width: 100%;
		max-width: 320px;
		height: auto;
		border-radius: 4px;
		image-rendering: pixelated;
		display: block;
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
		color: var(--accent-blue-ink);
		background: rgba(59, 130, 246, 0.1);
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.p2p-status.success {
		color: var(--accent-green-ink);
		background: rgba(16, 185, 129, 0.1);
	}

	.p2p-status.error {
		color: var(--state-negative);
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


	/* `.divider` y `.receive-btn` vivían aquí, y eran el separador «o también» y el
	   botón de escanear que se han quitado del marcado: sin ellos son CSS muerto. */

	.qr-note {
		margin: 0 0 1.25rem;
		font-size: 0.72rem;
		line-height: 1.5;
		color: var(--text-muted);
		text-align: left;
	}

	.qr-instructions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
	}

	.qr-step {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
		text-align: left;
	}

	.step-num {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		background: var(--accent-blue);
		color: var(--text-on-accent);
		border-radius: 50%;
		font-size: 0.7rem;
		font-weight: 800;
	}

	.p2p-status.success {
		color: var(--accent-green-ink);
		background: rgba(16, 185, 129, 0.1);
	}

	.p2p-status.error {
		color: var(--state-negative);
		background: rgba(239, 68, 68, 0.1);
	}

	.retry-btn {
		background: rgba(239, 68, 68, 0.1);
		color: var(--state-negative);
		border: 1px solid rgba(239, 68, 68, 0.2);
		margin-bottom: 1rem;
	}

	.retry-btn:hover {
		background: rgba(239, 68, 68, 0.2);
	}


</style>
