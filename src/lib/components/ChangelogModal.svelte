<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';

	let { onClose }: { onClose: () => void } = $props();

	const releases = [
		{
			version: 'v1.4.0',
			date: '21 de Mayo, 2026',
			badge: 'Interactividad y Análisis',
			badgeColor: '#a855f7',
			changes: [
				'🔢 **Precisión Decimal y Redondeo Robusto (Proyecto B):** Soporte completo para pesos objetivos con decimales (ej. 7.5%) en sliders y entradas numéricas con compensación proporcional y redondeo robusto.',
				'📈 **Visualizador Comparativo de Pesos (Proyecto D.3):** Nuevo panel "Convergencia de Pesos" con barras comparativas antes/después y desviaciones dinámicas en el módulo de rebalanceo.',
				'📊 **Proyecciones con Base Personalizada (Proyecto D.2):** Selector dinámico de simulación con pildoras interactivas para alternar entre "Cartera Real" y "Capital Personalizado".',
				'📉 **Crisis Simulator Educativo e Histórico (Proyecto D.1):** Reemplazo de presets genéricos por 3 grandes crisis históricas reales (DotCom, Lehman, COVID) con tarjetas educativas de impacto DCA.',
				'🔒 **Candados y Avisos de Bloqueo:** Corrección de warnings ante bloqueos absolutos de compensación utilizando toasts nativos de tipo error.',
				'🐛 **Corrección de Sliders Dinámicos y A11y:** Resuelto el bug del simulador de crisis donde el capital inicial aumentaba al infinito al deslizar, y eliminadas advertencias del compilador.'
			]
		},
		{
			version: 'v1.3.0',
			date: '21 de Mayo, 2026',
			badge: 'Autonomía y Privacidad',
			badgeColor: '#10b981',
			changes: [
				'💾 **Exportación local segura en formato JSON (Proyecto A):** Descarga de la configuración completa de tu cartera en un archivo `.json` de forma offline y sin necesidad de registrarse.',
				'🕶️ **Privacidad Visual Total (Modo Pantalla Segura):** Ocultación instantánea bajo asteriscos (`****`) de los ejes del gráfico histórico y valores detallados de tooltips.',
				'⚙️ **Configuración Unificada:** Reestructuración de ajustes de cartera y app con selector de divisa base (EUR/USD/GBP) en caliente y menú superior de alta fidelidad.'
			]
		},
		{
			version: 'v1.2.0',
			date: '19 de Mayo, 2026',
			badge: 'Motor de Sliders',
			badgeColor: '#3b82f6',
			changes: [
				'🧠 **Sliders Autocompensados 100% (Proyecto B):** Algoritmo dinámico que autoajusta el resto de pesos proporcionalmente en tiempo real para clavar el 100% de la cartera principal.',
				'🔒 **Candados de Peso Objetivo (`Lock`):** Posibilidad de fijar el peso objetivo de activos específicos para que se mantengan inalterados mientras reajustas libremente el resto de la cartera.',
				'♻️ **Compensación de Activos Trasladados/Borrados:** Al eliminar o mover un activo a otra cartera, el peso restante se auto-reparte inteligentemente entre los activos libres del Core.'
			]
		},
		{
			version: 'v1.1.0',
			date: '14 de Mayo, 2026',
			badge: 'Estabilidad',
			badgeColor: '#3b82f6',
			changes: [
				'☁️ **Sincronización en la Nube:** Copias de seguridad automáticas y sincronización segura multi-dispositivo (silenciosa y ágil para nuevos usuarios).',
				'🔍 **Buscador de Activos con Yahoo Finance:** Resolución y búsqueda instantánea de ISINs, tickers y nombres de activos reales en caliente.',
				'📉 **Simulador de Crisis Históricos:** Integración visual interactiva para ver cómo afectaron drawdowns célebres (DotCom, 2008 Lehman, COVID) a tu cartera actual.',
				'🚀 **Onboarding Tour Guiado:** Tutorial interactivo paso a paso para guiar a los nuevos usuarios en la configuración inicial y rebalanceo.'
			]
		},
		{
			version: 'v1.0.0',
			date: '12 de Mayo, 2026',
			badge: 'Lanzamiento Inicial',
			badgeColor: '#8b5cf6',
			changes: [
				'📦 **Arquitectura Local-First:** Almacenamiento rápido en almacenamiento local (LocalDB) del navegador respetando al 100% la privacidad por defecto.',
				'⚖️ **Motor de Rebalanceo:** Cálculo exacto de aportaciones óptimas y compras necesarias para restaurar la cartera a tus pesos ideales.',
				'📊 **Gráficos en Tiempo Real:** Visualización interactiva mediante Chart.js de la evolución histórica y el reparto actual de activos.'
			]
		}
	];

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
		left: 140px;
		top: 8px;
		bottom: 8px;
		width: 2px;
		background: rgba(255, 255, 255, 0.06);
	}

	.timeline-item {
		display: grid;
		grid-template-columns: 120px 1fr;
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
		white-space: nowrap;
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
