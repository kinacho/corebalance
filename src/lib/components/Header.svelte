<script lang="ts">
	import { TARGET_LABEL } from '$lib/constants';
	import { portfolio } from '$lib/stores/portfolio.svelte';

	interface Props {
		timestamp: string | null;
		loading: boolean;
		onRefresh: () => void;
		isPrivate: boolean;
		onTogglePrivacy: () => void;
	}

	let { timestamp, loading, onRefresh, isPrivate, onTogglePrivacy }: Props = $props();

	let showUserMenu = $state(false);

	const formattedTime = $derived(
		timestamp ? new Date(timestamp).toLocaleString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		}) : ''
	);

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.auth-group')) {
			showUserMenu = false;
		}
	}
</script>

<header class="dashboard-header">
	<div class="header-left">
		<div class="logo-group">
			<div class="logo-icon">⚖️</div>
			<div>
				<h1 class="logo-title">Balanceador</h1>
				<p class="logo-subtitle">{TARGET_LABEL}</p>
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

		<div class="auth-group">
			{#if portfolio.user}
				<button 
					class="profile-btn" 
					onclick={() => showUserMenu = !showUserMenu}
					aria-label="Menú de usuario"
				>
					{#if portfolio.user.photoURL}
						<img src={portfolio.user.photoURL} alt="Usuario" class="user-avatar" />
					{:else}
						<div class="user-initials">{portfolio.user.displayName?.charAt(0) || 'U'}</div>
					{/if}
				</button>

				{#if showUserMenu}
					<button 
						class="user-menu-backdrop" 
						onclick={() => showUserMenu = false}
						aria-label="Cerrar menú"
					></button>
					<div class="user-menu">
						<div class="user-menu-header">
							{#if portfolio.user.photoURL}
								<img src={portfolio.user.photoURL} alt="Avatar" class="menu-avatar" />
							{:else}
								<div class="menu-avatar-fallback">{portfolio.user.displayName?.charAt(0) || 'U'}</div>
							{/if}
							<div class="menu-user-info">
								<span class="menu-user-name">{portfolio.user.displayName}</span>
								<span class="menu-user-email">{portfolio.user.email}</span>
							</div>
						</div>
						<div class="user-menu-divider"></div>
						
						<button class="user-menu-item logout-item" onclick={() => { showUserMenu = false; portfolio.logout(); }}>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
								<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
								<polyline points="16 17 21 12 16 7" />
								<line x1="21" y1="12" x2="9" y2="12" />
							</svg>
							Cerrar sesión
						</button>
					</div>
				{/if}
			{:else}
				<button class="login-btn" onclick={() => portfolio.login()} title="Iniciar sesión con Google">
					<svg viewBox="0 0 24 24" width="18" height="18" class="google-icon">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					<span class="login-text">Entrar</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Loading Bar -->
	{#if loading}
		<div class="loading-bar"></div>
	{/if}
</header>

<style>
	.dashboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		background: rgba(10, 10, 20, 0.4);
		backdrop-filter: blur(30px) saturate(180%);
		-webkit-backdrop-filter: blur(30px) saturate(180%);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		position: sticky;
		top: 0;
		z-index: 50;
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

	/* Profile Button & Avatar */
	.profile-btn {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1.5px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
		padding: 0;
		cursor: pointer;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		-webkit-tap-highlight-color: transparent;
	}

	.profile-btn:hover {
		transform: scale(1.05);
		border-color: rgba(59, 130, 246, 0.5);
		box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
	}

	.user-avatar {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-initials {
		font-size: 0.9rem;
		font-weight: 700;
		color: #3b82f6;
		text-transform: uppercase;
	}

	/* Login Button */
	.login-btn {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 1rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1.5px solid rgba(59, 130, 246, 0.2);
		border-radius: 12px;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.login-btn:hover {
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.4);
		transform: translateY(-1px);
	}

	.login-btn:active {
		transform: translateY(0);
	}

	.login-text {
		display: none;
	}

	@media (min-width: 480px) {
		.login-text { display: inline; }
	}

	/* User Menu Dropdown */
	.auth-group {
		display: flex;
		align-items: center;
		position: relative;
	}

	.user-menu-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 90;
		background: transparent;
		border: none;
		width: 100%;
		height: 100%;
		cursor: default;
	}

	.user-menu {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		background: rgba(20, 20, 40, 0.95);
		backdrop-filter: blur(24px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		padding: 0.75rem;
		min-width: 220px;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
		z-index: 100;
		animation: menuFadeIn 0.15s ease;
	}

	@keyframes menuFadeIn {
		from {
			opacity: 0;
			transform: translateY(-6px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.user-menu-header {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.4rem 0.35rem;
	}

	.menu-avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 2px solid rgba(59, 130, 246, 0.3);
		flex-shrink: 0;
	}

	.menu-avatar-fallback {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: rgba(59, 130, 246, 0.1);
		border: 2px solid rgba(59, 130, 246, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #3b82f6;
		font-weight: 700;
		flex-shrink: 0;
	}

	.menu-user-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.menu-user-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #f0f0ff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.menu-user-email {
		font-size: 0.7rem;
		color: rgba(160, 160, 200, 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-menu-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.06);
		margin: 0.5rem 0;
	}

	.user-menu-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.6rem 0.5rem;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: rgba(200, 200, 220, 0.8);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.user-menu-item:active {
		background: rgba(255, 255, 255, 0.08);
	}

	.logout-item {
		color: #fca5a5;
	}

	.logout-item:active {
		background: rgba(239, 68, 68, 0.15);
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
