<script lang="ts">
	import { page } from '$app/stores';
	import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';

	let isEs = $derived($page.data.locale === 'es');
</script>

<svelte:head>
	<title>{$page.status === 404 ? (isEs ? 'Página no encontrada' : 'Page not found') : (isEs ? 'Error' : 'Error')} — CoreBalance</title>
	<!--
		El status ya es autoritativo para un 404, así que esto es cinturón y tirantes:
		cubre los errores que se sirven con otro código y sigue la doctrina que el
		proyecto ya aplicó a `/dashboard` (cabecera en `hooks.server.ts`) y a
		`static/offline.html` — declarar `noindex` y **dejar rastrear**, porque una URL
		bloqueada en `robots.txt` nunca se rastrea y por tanto su estado no cambia nunca.
		El canonical autorreferencial que esta página emitía lo quita `+layout.svelte`.
	-->
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<div class="error-page">
	<LandingNavBar onStart={() => window.location.href = '/'} />

	<main class="error-content">
		<div class="container text-center">
			<div class="error-badge">{$page.status}</div>
			{#if $page.status === 404}
				<h1>{isEs ? 'Página no encontrada' : 'Page not found'}</h1>
				<p>{isEs ? 'Lo sentimos, la página que buscas no existe o ha sido movida.' : 'Sorry, the page you are looking for does not exist or has been moved.'}</p>
			{:else}
				<h1>{isEs ? 'Ha ocurrido un error' : 'An error occurred'}</h1>
				<p>{$page.error?.message || (isEs ? 'Ha ocurrido un error inesperado.' : 'An unexpected error occurred.')}</p>
			{/if}
			
			<div class="actions">
				<a href="/" class="btn btn-primary">{isEs ? 'Volver al inicio' : 'Back to home'}</a>
			</div>
		</div>
	</main>

	<LandingFooter />
</div>

<style>
	.error-page {
		background: var(--bg-primary);
		color: var(--text-primary);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.error-content {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 120px 1.5rem 80px;
		text-align: center;
	}

	.container {
		max-width: 600px;
		margin: 0 auto;
	}

	.error-badge {
		font-size: 6rem;
		font-weight: 900;
		background: linear-gradient(135deg, var(--accent-blue-ink), var(--accent-green-ink));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		line-height: 1;
		margin-bottom: 1.5rem;
		letter-spacing: -0.05em;
	}

	h1 {
		font-size: 2.2rem;
		font-weight: 800;
		margin-bottom: 1rem;
		letter-spacing: -0.02em;
	}

	p {
		color: var(--text-secondary);
		font-size: 1.1rem;
		margin-bottom: 2rem;
		line-height: 1.5;
	}

	.actions {
		display: flex;
		justify-content: center;
	}

	.btn {
		display: inline-block;
		padding: 0.8rem 2rem;
		border-radius: 12px;
		font-weight: 700;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: var(--accent-blue);
		color: var(--text-on-accent);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.btn-primary:hover {
		background: #60a5fa;
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
	}
</style>
