<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { onMount } from 'svelte';
	import SyncModal from './SyncModal.svelte';

	interface Props {
		timestamp: string | null;
		loading: boolean;
		onRefresh: () => void;
		isPrivate: boolean;
		onTogglePrivacy: () => void;
		onManageAssets: () => void;
	}

	let { timestamp, loading, onRefresh, isPrivate, onTogglePrivacy, onManageAssets }: Props = $props();

	let scrolled = $state(false);
	let showSyncModal = $state(false);

	onMount(() => {
		const handleScroll = () => {
			scrolled = window.scrollY > 10;
		};
		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();
		return () => window.removeEventListener('scroll', handleScroll);
	});

	const formattedTime = $derived(
		timestamp ? new Date(timestamp).toLocaleString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		}) : ''
	);
</script>

<header class="dashboard-header" class:scrolled={scrolled}>
	<div class="header-left">
		<div class="logo-group">
			<div class="logo-icon">⚖️</div>
			<div>
				<h1 class="logo-title">CoreBalance</h1>
				<p class="logo-subtitle">{portfolio.targetLabel}</p>
			</div>
		</div>
	</div>

	<div class="header-right">
		{#if timestamp}
			<div class="timestamp">
				<span class="timestamp-dot" class:pulse={loading}></span>
				<span class="timestamp-text">
					{loading ? 'Cargando...' : formattedTime}
				</span>
			</div>
		{/if}
		
		<button
			class="action-btn"
			onclick={onManageAssets}
			title="Gestionar activos"
			aria-label="Gestionar activos"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="3" />
				<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
			</svg>
		</button>

		<button
			class="action-btn sync-btn"
			onclick={() => showSyncModal = true}
			title="Sincronizar Dispositivos"
			aria-label="Sincronizar Dispositivos"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
				<path d="M8 21h8"></path>
				<path d="M12 17v4"></path>
				<rect x="16" y="13" width="6" height="8" rx="1"></rect>
			</svg>
		</button>

		<button
			class="action-btn"
			onclick={onTogglePrivacy}
			title={isPrivate ? 'Mostrar valores' : 'Ocultar valores'}
			aria-label="Alternar privacidad"
		>
			{#if isPrivate}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
					<line x1="1" y1="1" x2="23" y2="23" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			{/if}
		</button>

		<button
			class="action-btn refresh-btn"
			class:loading={loading}
			onclick={onRefresh}
			disabled={loading}
			aria-label="Actualizar precios"
		>
			<svg
				class="refresh-icon"
				class:spinning={loading}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 2v6h-6" />
				<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
				<path d="M3 22v-6h6" />
				<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
			</svg>
		</button>

	</div>

	<!-- Loading Bar -->
	{#if loading}
		<div class="loading-bar"></div>
	{/if}
</header>

{#if showSyncModal}
	<SyncModal onClose={() => showSyncModal = false} />
{/if}

<style>
	.dashboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		background: rgba(10, 10, 20, 0.15);
		backdrop-filter: blur(24px) saturate(200%);
		-webkit-backdrop-filter: blur(24px) saturate(200%);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		position: sticky;
		top: 0;
		z-index: 100;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.dashboard-header.scrolled {
		background: rgba(10, 10, 20, 0.98);
		padding-top: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom-color: rgba(255, 255, 255, 0.15);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	}

	.header-left {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.logo-group {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.logo-icon {
		font-size: 1.5rem;
		line-height: 1;
	}

	.logo-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: #f0f0ff;
		letter-spacing: -0.02em;
		margin: 0;
		line-height: 1.2;
	}

	.logo-subtitle {
		font-size: 0.65rem;
		color: rgba(160, 160, 200, 0.6);
		font-weight: 500;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.timestamp {
		display: none;
	}

	.timestamp-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		flex-shrink: 0;
	}

	.timestamp-dot.pulse {
		animation: pulse-dot 1s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.action-btn {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(160, 160, 200, 0.8);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.15);
	}

	.action-btn:active {
		transform: scale(0.92);
		background: rgba(255, 255, 255, 0.12);
	}

	.action-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.sync-btn {
		color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.2);
	}

	.sync-btn:hover {
		background: rgba(59, 130, 246, 0.2);
		color: #60a5fa;
		border-color: rgba(59, 130, 246, 0.4);
	}

	.action-btn svg {
		width: 18px;
		height: 18px;
	}

	.refresh-icon.spinning {
		animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
		color: #3b82f6;
		filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.5));
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Loading Bar */
	.loading-bar {
		position: absolute;
		bottom: -1px;
		left: 0;
		height: 2px;
		background: linear-gradient(90deg, #3b82f6, #10b981, #f59e0b);
		width: 100%;
		animation: loading-slide 2s ease-in-out infinite;
		z-index: 100;
	}

	@keyframes loading-slide {
		0% { transform: translateX(-100%); }
		50% { transform: translateX(0); }
		100% { transform: translateX(100%); }
	}

	/* Desktop */
	@media (min-width: 768px) {
		.dashboard-header {
			padding: 1.25rem 2rem;
		}

		.logo-icon { font-size: 2rem; }
		.logo-title { font-size: 1.5rem; }

		.header-right { gap: 0.75rem; }

		.timestamp {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			font-size: 0.78rem;
			color: rgba(160, 160, 200, 0.6);
		}
	}
</style>
