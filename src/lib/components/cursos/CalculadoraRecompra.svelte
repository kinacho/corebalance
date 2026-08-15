<script lang="ts">
	import { consultarAntiaplicacion, type TipoAntiaplicacion } from '$lib/antiaplicacion';

	/**
	 * La regla de antiaplicación, embebible dentro de una lección.
	 *
	 * Mismo criterio que la de acumulación vs distribución: un solo componente para la
	 * página de la herramienta y para la lección, porque la aritmética fiscal no puede
	 * existir dos veces. Ver `CalculadoraAccDist.svelte`.
	 */
	let { compacta = false }: { compacta?: boolean } = $props();

	let tipo = $state<TipoAntiaplicacion>('fondo');
	let fechaVenta = $state('');
	let fechaRecompra = $state('');

	const r = $derived(consultarAntiaplicacion({ tipo, fechaVenta, fechaRecompra }));

	const fecha = (iso: string) =>
		new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
</script>

<div class="calc" class:compacta>
	<div class="tipos" role="radiogroup" aria-label="Qué vendiste">
		<button
			type="button"
			class:activo={tipo === 'fondo'}
			role="radio"
			aria-checked={tipo === 'fondo'}
			onclick={() => (tipo = 'fondo')}>Fondo de inversión</button
		>
		<button
			type="button"
			class:activo={tipo === 'etf'}
			role="radio"
			aria-checked={tipo === 'etf'}
			onclick={() => (tipo = 'etf')}>ETF o acciones</button
		>
	</div>

	<div class="campos">
		<label>
			<span>Venta con pérdidas</span>
			<input type="date" bind:value={fechaVenta} />
		</label>
		<label>
			<span>Recompra (opcional)</span>
			<input type="date" bind:value={fechaRecompra} />
		</label>
	</div>

	{#if !r}
		<p class="espera">Pon la fecha de la venta para ver la respuesta.</p>
	{:else}
		<div class="salida" class:mal={r.bloqueada}>
			<p class="etiqueta">Ventana de {r.ventanaMeses} meses · puedes recomprar desde</p>
			<p class="cifra">{fecha(r.seguroDesde)}</p>
			<p class="pie">{r.diasDeEspera} días desde la venta.</p>
			{#if r.conRecompra}
				<p class="veredicto">
					{#if r.bloqueada}
						⚠️ Con esa recompra la pérdida <strong>queda bloqueada</strong> este ejercicio.
					{:else}
						Con esa recompra la pérdida <strong>sí se puede compensar</strong>.
					{/if}
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.calc {
		margin: 2rem 0;
		padding: 1.35rem;
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.025);
	}
	.tipos {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}
	.tipos button {
		flex: 1;
		min-width: 140px;
		padding: 0.6rem 0.8rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: transparent;
		color: var(--text-muted);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}
	.tipos button.activo {
		background: var(--accent-blue);
		border-color: var(--accent-blue);
		color: var(--text-on-accent);
	}
	.campos {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.8rem;
		margin-bottom: 1.1rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	label span {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}
	input {
		padding: 0.55rem 0.7rem;
		border-radius: 9px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: var(--bg-card);
		color: var(--text-primary);
		font-size: 0.95rem;
		width: 100%;
	}
	.espera {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.salida {
		text-align: center;
		padding-top: 1rem;
		border-top: 1px solid var(--border-subtle);
	}
	.etiqueta {
		margin: 0 0 0.3rem;
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}
	.cifra {
		margin: 0 0 0.3rem;
		font-size: clamp(1.35rem, 4.5vw, 1.9rem);
		font-weight: 800;
		color: var(--accent-green-ink);
		line-height: 1.15;
	}
	.salida.mal .cifra {
		color: var(--accent-orange-ink);
	}
	.pie {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.veredicto {
		margin: 0.9rem 0 0;
		padding-top: 0.9rem;
		border-top: 1px solid var(--border-subtle);
		font-size: 0.9rem;
		color: var(--text-primary);
	}
</style>
