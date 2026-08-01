<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { LL } from '$lib/i18n/i18n-svelte';

	let { onClose }: { onClose: () => void } = $props();

	onMount(() => {
		document.body.classList.add('modal-open');
	});

	onDestroy(() => {
		document.body.classList.remove('modal-open');
	});

	// Mapeo dinámico desde el diccionario de traducciones
	const releaseVersions = [
		'v1_10_0',
		'v1_9_0',
		'v1_8_1',
		'v1_8_0',
		'v1_7_0',
		'v1_6_1',
		'v1_6_0',
		'v1_5_0',
		'v1_4_0',
		'v1_3_0',
		'v1_2_0',
		'v1_1_0',
		'v1_0_0'
	] as const;

	const badgeColors: Record<string, string> = {
		v1_10_0: '#f59e0b',
		v1_9_0: '#a855f7',
		v1_8_1: '#10b981',
		v1_8_0: '#3b82f6',
		v1_7_0: '#3b82f6',
		v1_6_1: '#10b981',
		v1_6_0: '#8b5cf6',
		v1_5_0: '#eab308',
		v1_4_0: '#a855f7',
		v1_3_0: '#10b981',
		v1_2_0: '#3b82f6',
		v1_1_0: '#3b82f6',
		v1_0_0: '#8b5cf6'
	};

	const releases = $derived(
		releaseVersions.map((v) => {
			const releaseData = $LL.changelog_modal.releases[v];
			// 'changes' es un objeto directo, no una función (según i18n-types)
			const changesObj = releaseData.changes;
			const changes = Object.keys(changesObj)
				.sort((a, b) => Number(a) - Number(b))
				.map((key) => (changesObj as any)[key]());

			return {
				version: v.replace('_', '.'),
				date: releaseData.date(),
				badge: releaseData.badge(),
				badgeColor: badgeColors[v],
				changes
			};
		})
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal Backdrop -->
<div class="changelog-backdrop" onclick={onClose} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }} role="presentation">
	<!-- Modal Content Container -->
	<div class="changelog-container" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="changelog-title" tabindex="-1">
		<header class="changelog-header">
			<div class="title-group">
				<span class="changelog-icon">🚀</span>
				<h2 id="changelog-title" class="changelog-title">Historial de Cambios</h2>
			</div>
			<button class="close-btn" onclick={onClose} aria-label="Cerrar modal">✕</button>
		</header>

		<div class="changelog-body">
			<div class="timeline">
				{#each releases as release}
					<div class="timeline-item">
						<div class="timeline-badge-column">
							<span class="version-label">{release.version}</span>
							<span class="version-badge" style="background: {release.badgeColor}20; color: {release.badgeColor}; border: 1px solid {release.badgeColor}40;">
								{release.badge}
							</span>
							<span class="timeline-dot" style="background: {release.badgeColor}; box-shadow: 0 0 8px {release.badgeColor};"></span>
						</div>
						<div class="timeline-content-card">
							<div class="card-header">
								<span class="release-date">{release.date}</span>
							</div>
							<ul class="changes-list">
								{#each release.changes as change}
									<li>
										{@html change}
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<footer class="changelog-footer">
			<button class="btn-primary" onclick={onClose}>Entendido</button>
		</footer>
	</div>
</div>

<style>
	.changelog-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(10, 10, 20, 0.75);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		padding: 1rem;
		animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.changelog-container {
		width: 100%;
		max-width: 600px;
		max-height: 80vh;
		background: rgba(18, 18, 35, 0.95);
		backdrop-filter: blur(24px) saturate(200%);
		-webkit-backdrop-filter: blur(24px) saturate(200%);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.05);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes scaleUp {
		from { transform: scale(0.9) translateY(20px); opacity: 0; }
		to { transform: scale(1) translateY(0); opacity: 1; }
	}

	.changelog-header {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.changelog-icon {
		font-size: 1.3rem;
	}

	.changelog-title {
		font-size: 1.2rem;
		font-weight: 800;
		color: #fff;
		margin: 0;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		font-size: 1.2rem;
		cursor: pointer;
		transition: all 0.2s;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: #fff;
		background: rgba(255, 255, 255, 0.05);
		transform: rotate(90deg);
	}

	.changelog-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Timeline styles */
	.timeline {
		position: relative;
		padding-left: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	.timeline::before {
		content: '';
		position: absolute;
		left: 153px;
		top: 8px;
		bottom: 8px;
		width: 2px;
		background: rgba(255, 255, 255, 0.06);
	}

	.timeline-item {
		display: grid;
		grid-template-columns: 135px 1fr;
		gap: 2.25rem;
		position: relative;
	}

	.timeline-badge-column {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.35rem;
		text-align: right;
		position: relative;
	}

	.version-label {
		font-size: 1.15rem;
		font-weight: 800;
		color: #fff;
	}

	.version-badge {
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.15rem 0.4rem;
		border-radius: 100px;
	}

	.timeline-dot {
		position: absolute;
		right: -24px;
		top: 8px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		z-index: 2;
	}

	.timeline-content-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 14px;
		padding: 1rem;
		transition: all 0.2s;
	}

	.timeline-content-card:hover {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.06);
	}

	.card-header {
		margin-bottom: 0.75rem;
	}

	.release-date {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
	}

	.changes-list {
		margin: 0;
		padding-left: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.changes-list li {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.4;
	}

	.changelog-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		justify-content: flex-end;
		background: rgba(14, 14, 28, 0.5);
	}

	.btn-primary {
		padding: 0.55rem 1.25rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
	}

	.btn-primary:hover {
		background: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
	}

	.btn-primary:active {
		transform: translateY(0);
	}

	/* Responsive tweaks */
	@media (max-width: 580px) {
		.timeline::before {
			display: none;
		}

		.timeline-item {
			grid-template-columns: 1fr;
			gap: 0.5rem;
			padding-bottom: 0.5rem;
			border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
		}

		.timeline-item:last-child {
			border-bottom: none;
		}

		.timeline-badge-column {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			text-align: left;
		}

		.timeline-dot {
			display: none;
		}
	}
</style>
