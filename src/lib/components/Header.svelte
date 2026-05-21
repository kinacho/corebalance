<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { onMount } from 'svelte';
	import { formatDateTime } from '$lib/utils';
	import SyncModal from './SyncModal.svelte';


	interface Props {
		timestamp: string | null;
		onTogglePrivacy: () => void;
		onManageAssets: () => void;
	}

	let { timestamp, onTogglePrivacy, onManageAssets }: Props = $props();

	let loading = $derived(portfolio.loading);
	let authLoading = $derived(portfolio.authLoading);
	let authReady = $derived(portfolio.authReady);
	let isPrivate = $derived(portfolio.isPrivate);
	let showUserMenu = $state(false);
	let showSyncModal = $state(false);
	let scrolled = $state(false);
	let authNotification = $state<{ type: 'success' | 'info', message: string } | null>(null);
	let imgError = $state(false);

	function onRefresh() {
		portfolio.fetchPrices();
	}

	function toggleUserMenu(event: MouseEvent) {
		event.stopPropagation();
		showUserMenu = !showUserMenu;
	}

	function showNotification(message: string, type: 'success' | 'info' = 'success') {
		authNotification = { message, type };
		setTimeout(() => {
			authNotification = null;
		}, 3000);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') showUserMenu = false;
	}

	// Reaccionar a cambios de usuario para notificaciones
	let lastUserUid = $state<string | null>(null);
	$effect(() => {
		// Wait until splash screen is done to show notifications
		if (!portfolio.isInitialized) return;

		const currentUserUid = portfolio.user?.uid || null;
		if (lastUserUid === null && currentUserUid) {
			showNotification(`¡Bienvenido de nuevo!`);
			imgError = false;
		} else if (lastUserUid && currentUserUid === null) {
			showNotification(`Sesión cerrada correctamente`, 'info');
		}
		lastUserUid = currentUserUid;
	});

	onMount(() => {
		const handleScroll = () => {
			scrolled = window.scrollY > 20;
		};
		const handleClick = () => {
			showUserMenu = false;
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('click', handleClick);
		window.addEventListener('keydown', handleKeyDown);
		
		handleScroll();
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('click', handleClick);
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	const formattedTime = $derived(
		timestamp ? formatDateTime(timestamp) : ''
	);

	function getUserColor(email: string) {
		const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];
		let hash = 0;
		for (let i = 0; i < email.length; i++) {
			hash = email.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	}
</script>

<header class="dashboard-header" class:scrolled={scrolled}>
	<div class="header-left">
		<img src="/favicon.png" alt="CoreBalance Logo" class="logo-img" />
		<div class="logo-group">
			<h1 class="logo-title">CoreBalance</h1>
			<p class="logo-subtitle">{portfolio.targetLabel}</p>
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
			id="tour-manage-btn"
			class="action-btn"
			onclick={onManageAssets}

			title="Configuración de Cartera"
			aria-label="Configuración de Cartera"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="4" y1="21" x2="4" y2="14" />
				<line x1="4" y1="10" x2="4" y2="3" />
				<line x1="12" y1="21" x2="12" y2="12" />
				<line x1="12" y1="8" x2="12" y2="3" />
				<line x1="20" y1="21" x2="20" y2="16" />
				<line x1="20" y1="12" x2="20" y2="3" />
				<line x1="1" y1="14" x2="7" y2="14" />
				<line x1="9" y1="8" x2="15" y2="8" />
				<line x1="17" y1="16" x2="23" y2="16" />
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

		<div id="tour-sync-auth" class="user-zone">
			{#if !authReady}
				<div class="auth-skeleton"></div>
			{:else}
				<div class="user-container" in:scale={{ duration: 300, start: 0.9 }}>
					<button 
						class="action-btn user-btn" 
						class:auth-loading={authLoading}
						onclick={toggleUserMenu}
						title="Configuración de la App"
					>
						{#if portfolio.user?.photoURL && !imgError}
							<img 
								src={portfolio.user.photoURL} 
								alt="User" 
								class="user-avatar" 
								referrerpolicy="no-referrer"
								onerror={() => imgError = true}
							/>
						{:else if portfolio.user?.email}
							<div class="user-initial-circle" style="background: {getUserColor(portfolio.user.email)}">
								{portfolio.user.email[0].toUpperCase()}
							</div>
						{:else}
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="3" />
								<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
							</svg>
						{/if}
						
						{#if authLoading}
							<div class="user-loading-overlay" transition:fade>
								<div class="mini-spinner"></div>
							</div>
						{/if}
					</button>

					{#if showUserMenu}
						<div 
							class="user-dropdown" 
							role="menu" 
							tabindex="-1"
							in:scale={{ duration: 200, start: 0.95 }}
							out:fade={{ duration: 150 }}
							onkeydown={(e) => e.key === 'Escape' && (showUserMenu = false)}
							onclick={(e) => e.stopPropagation()}
						>
							<div class="dropdown-header">
								<span class="user-name">{portfolio.user ? (portfolio.user.displayName || 'Inversor') : 'Configuración'}</span>
								{#if portfolio.user?.email}
									<span class="user-email">{portfolio.user.email}</span>
								{/if}
							</div>
							<div class="dropdown-divider"></div>
							
							<div class="dropdown-setting">
								<label for="currency-select" class="setting-label">Moneda Base</label>
								<select 
									id="currency-select" 
									class="currency-select"
									value={ui.baseCurrency}
									onchange={(e) => {
										ui.setBaseCurrency((e.target as HTMLSelectElement).value as any);
										portfolio.fetchPrices(); // Refresh to apply conversion
									}}
								>
									<option value="EUR">€ EUR</option>
									<option value="USD">$ USD</option>
									<option value="GBP">£ GBP</option>
								</select>
							</div>

							<div class="dropdown-divider"></div>
							<button 
								class="dropdown-item" 
								role="menuitem"
								onclick={() => { portfolio.exportJSON(); showUserMenu = false; }}
							>
								<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
								</svg>
								Exportar JSON (Offline)
							</button>

							<div class="dropdown-divider"></div>
							{#if portfolio.user}
								<button 
									class="dropdown-item logout" 
									role="menuitem"
									disabled={authLoading}
									onclick={() => { portfolio.logout(); showUserMenu = false; }}
								>
									<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none">
										<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
										<polyline points="16 17 21 12 16 7"></polyline>
										<line x1="21" y1="12" x2="9" y2="12"></line>
									</svg>
									Cerrar sesión
								</button>

								{#if !portfolio.isLocal}
									<div class="dropdown-divider"></div>
									<button 
										class="dropdown-item delete-account" 
										role="menuitem"
										disabled={authLoading}
										onclick={() => { portfolio.deleteAccount(); showUserMenu = false; }}
									>
										<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none">
											<polyline points="3 6 5 6 21 6"></polyline>
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
											<line x1="10" y1="11" x2="10" y2="17"></line>
											<line x1="14" y1="11" x2="14" y2="17"></line>
										</svg>
										Eliminar mi cuenta
									</button>
								{/if}
							{:else}
								<button 
									class="dropdown-item" 
									role="menuitem"
									disabled={authLoading}
									onclick={() => { portfolio.login(); showUserMenu = false; }}
									style="color: #3b82f6;"
								>
									<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none">
										<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
									</svg>
									Iniciar sesión (Nube)
								</button>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Loading Bar -->
	{#if loading}
		<div class="loading-bar"></div>
	{/if}

	<!-- Notificación de Auth -->
	{#if authNotification}
		<div class="auth-notification" in:fly={{ y: -20, duration: 400 }} out:fade>
			<div class="notif-content" class:success={authNotification.type === 'success'}>
				{#if authNotification.type === 'success'}
					<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="3">
						<path d="M20 6L9 17l-5-5" />
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="3">
						<circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
					</svg>
				{/if}
				<span>{authNotification.message}</span>
			</div>
		</div>
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
		gap: 0.75rem;
		min-width: 0;
		flex: 1;
	}

	.logo-group {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.logo-img {
		width: 32px;
		height: 32px;
		flex-shrink: 0;
	}

	.logo-title {
		font-size: 1.15rem;
		font-weight: 800;
		color: #fff;
		margin: 0;
		letter-spacing: -0.02em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 1;
	}

	.logo-subtitle {
		font-size: 0.65rem;
		color: rgba(160, 160, 200, 0.6);
		font-weight: 500;
		letter-spacing: 0.05em;
		margin: 0;
		display: none; /* Ocultar por defecto en móvil */
	}

	@media (min-width: 400px) {
		.logo-subtitle {
			display: block;
		}
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
		width: 34px; /* Un poco más pequeños en móvil */
		height: 34px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(160, 160, 200, 0.8);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
		flex-shrink: 0;
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

	.user-initial-circle {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 800;
		font-size: 1rem;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.user-zone {
		margin-left: 0.25rem;
		min-width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.auth-skeleton {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
		animation: pulse-skeleton 2s ease-in-out infinite;
	}

	@keyframes pulse-skeleton {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 0.2; }
	}


	.user-btn {
		overflow: hidden;
		padding: 0;
		border-color: rgba(59, 130, 246, 0.3);
		background: rgba(59, 130, 246, 0.1);
	}

	.user-avatar {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* User Dropdown */
	.user-container {
		position: relative;
	}

	.user-dropdown {
		position: absolute;
		top: calc(100% + 12px);
		right: 0;
		width: 220px;
		background: rgba(15, 15, 30, 0.85);
		backdrop-filter: blur(24px) saturate(200%);
		-webkit-backdrop-filter: blur(24px) saturate(200%);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
		z-index: 1000;
		padding: 0.5rem;
		transform-origin: top right;
		animation: dropdownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes dropdownFade {
		from { opacity: 0; transform: scale(0.95) translateY(-10px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	.dropdown-header {
		padding: 0.75rem 0.75rem 0.5rem;
		display: flex;
		flex-direction: column;
	}

	.dropdown-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.08);
		margin: 0.5rem 0;
	}

	.dropdown-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border: none;
		background: transparent;
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.9rem;
		font-weight: 600;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.dropdown-item:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #ffffff;
	}

	.dropdown-item.logout {
		color: #ef4444;
	}

	.dropdown-item.logout:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
	}

	.dropdown-item.delete-account {
		color: rgba(239, 68, 68, 0.6);
		font-size: 0.75rem;
	}

	.dropdown-item.delete-account:hover {
		background: #ef4444;
		color: white;
	}

	.dropdown-setting {
		padding: 0.5rem 0.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.setting-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
	}

	.currency-select {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 0.3rem 0.5rem;
		font-size: 0.8rem;
		font-weight: 700;
		color: #ffffff;
		cursor: pointer;
		outline: none;
	}

	/* Auth Notifications */
	.auth-notification {
		position: absolute;
		top: calc(100% + 15px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 1000;
		pointer-events: none;
	}

	.notif-content {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 1rem;
		background: rgba(30, 41, 59, 0.95);
		backdrop-filter: blur(10px);
		border-radius: 100px;
		color: #fff;
		font-size: 0.8rem;
		font-weight: 700;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		white-space: nowrap;
	}

	.notif-content.success {
		border-color: rgba(16, 185, 129, 0.3);
		color: #10b981;
	}

	/* Spinners */
	.mini-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}



	.user-loading-overlay {
		position: absolute;
		inset: 0;
		background: rgba(10, 10, 20, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 5;
	}


	/* User Dropdown Enhancements */
	.user-name {
		font-size: 0.95rem;
		font-weight: 800;
		color: #ffffff;
		margin-bottom: 0.1rem;
		display: block;
	}

	.user-email {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		word-break: break-all;
		font-weight: 500;
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

		.logo-img { width: 40px; height: 40px; }
		.logo-title { font-size: 1.5rem; }

		.header-right { gap: 0.75rem; }
		
		.action-btn {
			width: 40px;
			height: 40px;
		}
		


		.timestamp {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			font-size: 0.78rem;
			color: rgba(160, 160, 200, 0.6);
		}
	}
</style>
