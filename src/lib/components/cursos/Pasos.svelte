<script lang="ts">
	/**
	 * El ejemplo trabajado y el procedimiento.
	 *
	 * ⚠️ **Existe por el efecto del ejemplo resuelto**: para quien está aprendiendo, ver un
	 * caso hecho con números enseña más que intentar resolverlo solo. Un procedimiento en
	 * prosa —«primero contrata, luego traspasa, y ojo con el orden»— obliga al lector a
	 * reconstruir la secuencia mientras la lee; aquí la secuencia **es** la forma.
	 *
	 * `aviso` es el paso que la gente se salta, y es lo más valioso de la pieza: marca
	 * dónde se rompe el procedimiento en la vida real, no dónde es complicado.
	 */
	interface Paso {
		titulo: string;
		detalle: string;
		/** El error habitual en este paso concreto. Se pinta en ámbar bajo el detalle. */
		aviso?: string;
	}

	interface Props {
		pasos: Paso[];
		/** Qué procedimiento es. Opcional: a veces el h2 de arriba ya lo dice. */
		titulo?: string;
	}

	let { pasos, titulo }: Props = $props();
</script>

<div class="pasos">
	{#if titulo}<p class="titulo">{titulo}</p>{/if}

	<ol>
		{#each pasos as p, i (p.titulo)}
			<li>
				<span class="numero" aria-hidden="true">{i + 1}</span>
				<div class="cuerpo">
					<p class="paso-titulo">{p.titulo}</p>
					<p class="detalle">{p.detalle}</p>
					{#if p.aviso}<p class="aviso">{p.aviso}</p>{/if}
				</div>
			</li>
		{/each}
	</ol>
</div>

<style>
	.pasos {
		margin: 2rem 0;
	}
	.titulo {
		margin: 0 0 1rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		position: relative;
		display: flex;
		gap: 0.9rem;
		padding-bottom: 1.4rem;
	}
	/*
	 * El raíl. Se dibuja desde el número hacia abajo y el último paso no lo lleva, para
	 * que la secuencia tenga final visible en vez de desvanecerse.
	 */
	li:not(:last-child)::before {
		content: '';
		position: absolute;
		left: 13px;
		top: 28px;
		bottom: 0;
		width: 1px;
		background: rgba(255, 255, 255, 0.12);
	}
	.numero {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 27px;
		height: 27px;
		border-radius: 50%;
		border: 1px solid rgba(37, 99, 235, 0.45);
		background: rgba(37, 99, 235, 0.12);
		color: var(--accent-blue-ink);
		font-size: 0.78rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.cuerpo {
		padding-top: 0.15rem;
	}
	.paso-titulo {
		margin: 0 0 0.25rem;
		font-size: 0.95rem;
		font-weight: 700;
		line-height: 1.4;
		color: var(--text-primary);
	}
	.detalle {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--text-muted);
	}
	.aviso {
		margin: 0.5rem 0 0;
		padding-left: 0.7rem;
		border-left: 2px solid rgba(217, 119, 6, 0.5);
		font-size: 0.85rem;
		line-height: 1.55;
		color: var(--text-muted);
	}
</style>
