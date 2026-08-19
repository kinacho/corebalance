<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { bloquearScroll, desbloquearScroll } from '$lib/modal-lock';
	import { LL } from '$lib/i18n/i18n-svelte';

	let { onClose }: { onClose: () => void } = $props();

	onMount(() => bloquearScroll());
	onDestroy(() => desbloquearScroll());

	/**
	 * Las entradas del changelog están escritas en markdown ligero (`**negrita**`
	 * y `código`) pero se pintan con `{@html}`, así que hasta ahora los asteriscos
	 * y las comillas invertidas salían literales en las catorce versiones. Esto los
	 * convierte a etiquetas.
	 *
	 * El texto viene de los diccionarios de traducción de la app, nunca de entrada
	 * del usuario, y ya pasaba por `{@html}` tal cual: esto no añade superficie.
	 */
	function renderInlineMarkdown(text: string): string {
		return text
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/`([^`]+)`/g, '<code>$1</code>');
	}

	// Mapeo dinámico desde el diccionario de traducciones
	const releaseVersions = [
		'v1_19_0',
		'v1_18_0',
		'v1_17_3',
		'v1_17_2',
		'v1_17_1',
		'v1_17_0',
		'v1_16_0',
		'v1_15_0',
		'v1_14_0',
		'v1_13_0',
		'v1_12_1',
		'v1_12_0',
		'v1_11_0',
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
		/**
		 * ⚠️ **Un badge se mide contra su propio tinte, no contra la página**: pinta
		 * `color: X` sobre `background: X20`, o sea el mismo tono al 12,5 % encima de la
		 * superficie del modal. Y hay que mirarlo en los **dos temas**, porque tirar
		 * hacia uno hunde el otro: no existe ningún color que llegue a 4,5 en ambos, así
		 * que la vara real aquí es la del teal de abajo — su peor lado, 3,23.
		 *
		 * Medido: `#8b5cf6` da **4,01 en oscuro y 3,63 en claro**, que es el mejor peor
		 * caso de los violetas probados. El primer candidato fue `#7e22ce` y se cayó por
		 * la razón de siempre al elegir un color a ojo: sobre blanco lucía bien (5,67) y
		 * en oscuro daba **2,57**, por debajo del peor caso de la referencia.
		 */
		/**
		 * Medido igual que el de abajo, contra su propio tinte y en los dos temas:
		 * **3,76 en oscuro y 3,85 en claro**, el mejor peor caso de todos los tonos
		 * probados (el teal de referencia se queda en 3,23) y sin parecerse al violeta
		 * de la 1.17.1, que va justo debajo.
		 *
		 * ⚠️ Este repo rechaza `#e11d48` en otro sitio, y **ahí no aplica**: se descartó
		 * como color del par de tendencia de `HistoryChart`, donde tiene que convivir
		 * con un verde y cae a ΔE 5,8 bajo deuteranopía. Eso es una restricción de
		 * marcas de datos que compiten en un lienzo; aquí es la chapa de una entrada de
		 * changelog, sola en su fila y sin ningún dato al lado.
		 *
		 * ⚠️ De paso, medido: **el ámbar de la 1.16.0 (1,95) y el cielo de la 1.15.0
		 * (2,44) no llegan en tema claro.** Vienen de antes de que existiera el tema
		 * claro y no se tocan aquí para no meter ruido en este PR.
		 */
		/* Medido igual que los de abajo: 3,36 en oscuro y 4,34 en claro sobre su propio
		   tinte — el mejor peor caso de los tonos probados, y sin parecerse al rosa de
		   la 1.17.2, que va justo debajo. */
		/* Medido como los de abajo, contra su propio tinte y en los dos temas:
		   **3,71 en oscuro y 3,91 en claro**, el mejor peor caso de los doce tonos
		   probados —por encima del 3,35/4,33 del azul de la 1.17.3, que va justo
		   debajo, y del 3,23 del teal que hace de vara—. El modelo de medida se
		   contrastó reproduciendo la cifra que este fichero ya anota para la 1.17.3. */
		/*
		 * Medido con el mismo modelo que los de abajo —`color: X` sobre `X20` encima de
		 * la superficie del modal, en los dos temas—: **3,47 en oscuro y 4,22 en claro**,
		 * o sea peor caso 3,47, por encima del 3,23 del teal que hace de vara. El modelo
		 * se calibró reproduciendo la cifra que este fichero ya anota para la 1.17.3
		 * (#2563eb, 3,35/4,33; el cálculo da 3,37/4,33).
		 *
		 * Ámbar oscuro y no el `#f59e0b` de la 1.16.0, que este mismo fichero anota como
		 * 1,95 en tema claro. Y se elige cálido a propósito: sus dos vecinas son el
		 * magenta de la 1.18.0 y el azul de la 1.17.3.
		 */
		v1_19_0: '#b45309',
		v1_18_0: '#c026d3',
		v1_17_3: '#2563eb',
		v1_17_2: '#e11d48',
		v1_17_1: '#8b5cf6',
		// Teal del logo: 3,4:1 sobre blanco y 5,4:1 sobre oscuro, así que vale en los dos temas.
		v1_17_0: '#0d9488',
		v1_16_0: '#f59e0b',
		v1_15_0: '#0ea5e9',
		v1_14_0: '#047857',
		v1_13_0: '#a855f7',
		v1_12_1: '#10b981',
		v1_12_0: '#f59e0b',
		v1_11_0: '#10b981',
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
				version: v.replace(/_/g, '.'),
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
				<h2 id="changelog-title" class="changelog-title">{$LL.changelog_modal.title()}</h2>
			</div>
			<button class="close-btn" onclick={onClose} aria-label={$LL.changelog_modal.close_aria()}>✕</button>
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
										{@html renderInlineMarkdown(change)}
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<footer class="changelog-footer">
			<button class="btn-primary" onclick={onClose}>{$LL.changelog_modal.btn_understand()}</button>
		</footer>
	</div>
</div>

<style>
	.changelog-backdrop {
		position: fixed;
		inset: 0;
		background: var(--bg-scrim);
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
		background: var(--bg-overlay);
		backdrop-filter: blur(24px) saturate(200%);
		-webkit-backdrop-filter: blur(24px) saturate(200%);
		border: 1px solid var(--border-subtle);
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
		border-bottom: 1px solid var(--border-subtle);
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
		color: var(--text-primary);
		margin: 0;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-faint);
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
		color: var(--text-primary);
		background: var(--bg-card-hover);
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
		background: var(--bg-card-hover);
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
		color: var(--text-primary);
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
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		padding: 1rem;
		transition: all 0.2s;
	}

	.timeline-content-card:hover {
		background: var(--bg-card);
		border-color: var(--border-subtle);
	}

	.card-header {
		margin-bottom: 0.75rem;
	}

	.release-date {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-faint);
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
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.changes-list li :global(strong) {
		font-weight: 700;
		color: var(--text-primary);
	}

	.changes-list li :global(code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.92em;
		padding: 0.05rem 0.3rem;
		border-radius: 5px;
		background: var(--bg-card-hover);
		color: var(--text-primary);
	}

	.changelog-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		justify-content: flex-end;
		background: var(--bg-scrim);
	}

	.btn-primary {
		padding: 0.55rem 1.25rem;
		background: var(--accent-blue);
		color: var(--text-on-accent);
		border: none;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
	}

	.btn-primary:hover {
		background: var(--accent-blue);
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
