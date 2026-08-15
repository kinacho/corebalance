<script lang="ts">
	import { compararAcumulacionDistribucion } from '$lib/acumulacion-vs-distribucion';

	/**
	 * La calculadora de acumulación vs distribución, embebible.
	 *
	 * ⚠️ Existe como componente y no como copia dentro de la lección por el motivo que este
	 * repo documenta media docena de veces: una funcionalidad escrita dos veces se arregla
	 * en una copia. La página `/herramientas/acumulacion-vs-distribucion` y la lección 5 del
	 * primer curso pintan **esto mismo**; si mañana cambia la escala del ahorro, cambia en
	 * un sitio.
	 *
	 * `compacta` quita el desglose y deja solo el resultado: dentro de una lección el
	 * lector viene leyendo, y una tabla de cuatro filas le rompe el hilo. En la página de
	 * la herramienta sí interesa el detalle, porque ahí el objetivo es el número.
	 */
	let { compacta = false }: { compacta?: boolean } = $props();

	let capital = $state(50_000);
	let anios = $state(20);
	let rentabilidad = $state(7);
	let dividendo = $state(2);

	const r = $derived(
		compararAcumulacionDistribucion({
			capital,
			anios,
			rentabilidad: rentabilidad / 100,
			dividendo: dividendo / 100
		})
	);

	const eur = (n: number) =>
		n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
</script>

<div class="calc" class:compacta>
	<div class="campos">
		<label>
			<span>Capital</span>
			<input type="number" bind:value={capital} min="0" step="1000" />
		</label>
		<label>
			<span>Años</span>
			<input type="number" bind:value={anios} min="0" max="60" step="1" />
		</label>
		<label>
			<span>Rentabilidad %</span>
			<input type="number" bind:value={rentabilidad} min="-20" max="20" step="0.1" />
		</label>
		<label>
			<span>Dividendo %</span>
			<input
				type="number"
				bind:value={dividendo}
				min="0"
				max={Math.max(0, rentabilidad)}
				step="0.1"
			/>
		</label>
	</div>

	<div class="salida">
		<p class="etiqueta">Ventaja de acumular</p>
		<p class="cifra">{eur(r.diferencia)}</p>
		<p class="pie">
			{(r.diferenciaPct * 100).toFixed(1)} % más en el bolsillo, tras vender y pagar. Escala del
			ahorro de {r.anioFiscal}.
		</p>
	</div>

	{#if !compacta}
		<table>
			<thead>
				<tr><th></th><th>Acumulación</th><th>Distribución</th></tr>
			</thead>
			<tbody>
				<tr>
					<th scope="row">Valor a los {anios} años</th>
					<td>{eur(r.acumulacion.valorFinal)}</td>
					<td>{eur(r.distribucion.valorFinal)}</td>
				</tr>
				<tr>
					<th scope="row">Impuestos por el camino</th>
					<td>{eur(r.acumulacion.impuestoPorDividendos)}</td>
					<td>{eur(r.distribucion.impuestoPorDividendos)}</td>
				</tr>
				<tr>
					<th scope="row">Impuestos al vender</th>
					<td>{eur(r.acumulacion.impuestoAlVender)}</td>
					<td>{eur(r.distribucion.impuestoAlVender)}</td>
				</tr>
				<tr class="total">
					<th scope="row">Neto final</th>
					<td>{eur(r.acumulacion.neto)}</td>
					<td>{eur(r.distribucion.neto)}</td>
				</tr>
			</tbody>
		</table>
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
	.campos {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.8rem;
		margin-bottom: 1.25rem;
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
		font-variant-numeric: tabular-nums;
		width: 100%;
	}
	.salida {
		text-align: center;
		padding: 1rem 0 0.4rem;
		border-top: 1px solid var(--border-subtle);
	}
	.etiqueta {
		margin: 0 0 0.25rem;
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}
	.cifra {
		margin: 0 0 0.35rem;
		font-size: clamp(1.9rem, 6vw, 2.6rem);
		font-weight: 800;
		color: var(--accent-green-ink);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.pie {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 1.25rem;
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		padding: 0.6rem 0.4rem;
		text-align: right;
		border-bottom: 1px solid var(--border-subtle);
		font-size: 0.86rem;
	}
	thead th,
	tbody th {
		text-align: left;
		color: var(--text-muted);
		font-weight: 600;
	}
	thead th:not(:first-child) {
		text-align: right;
		color: var(--text-primary);
		font-weight: 700;
	}
	tr.total th,
	tr.total td {
		font-weight: 800;
		color: var(--text-primary);
		border-bottom: none;
	}
</style>
