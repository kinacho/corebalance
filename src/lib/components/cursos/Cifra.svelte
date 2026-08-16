<script lang="ts">
	/**
	 * Una cifra: magnitud, unidad, qué es y el matiz que la hace significar algo.
	 *
	 * Va siempre dentro de `<Cifras>`, que es quien pone la procedencia — una fila de tres
	 * números del mismo origen no necesita repetir la fuente tres veces.
	 *
	 * ⚠️ `tono` es **estado, no identidad**: `bien`/`mal` solo cuando el número tiene un
	 * signo (una diferencia a favor, una caída), nunca para distinguir dos series. Esa es
	 * la regla que este repo documenta como «el color de un estado y el de una entidad son
	 * capas distintas», y el color va siempre acompañado de la palabra que ya lo dice.
	 */
	interface Props {
		/** El número, ya formateado en `es-ES`. Sin unidad. */
		valor: string;
		/** `€`, `%`, `pp`… Se pinta más pequeño, pegado al número. */
		unidad?: string;
		/** Qué es este número. Una línea corta. */
		etiqueta: string;
		/** El matiz que lo hace significar algo. Opcional y breve. */
		matiz?: string;
		tono?: 'neutro' | 'bien' | 'mal';
	}

	let { valor, unidad, etiqueta, matiz, tono = 'neutro' }: Props = $props();
</script>

<div class="cifra tono-{tono}">
	<p class="valor">{valor}{#if unidad}<span class="unidad">{unidad}</span>{/if}</p>
	<p class="etiqueta">{etiqueta}</p>
	{#if matiz}<p class="matiz">{matiz}</p>{/if}
</div>

<style>
	.cifra {
		padding: 1rem 1.1rem;
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		background: var(--bg-card);
		/* Nivel objeto. En claro la sombra es lo que despega la tarjeta de una página
		   casi blanca, donde el borde cargaba solo; en oscuro `--card-shadow` es negro
		   sobre casi negro y no se ve, que es lo correcto: ahí eleva el relleno. */
		box-shadow: var(--card-shadow);
	}
	.valor {
		margin: 0 0 0.3rem;
		font-size: clamp(1.6rem, 5vw, 2.1rem);
		font-weight: 800;
		line-height: 1;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}
	.unidad {
		margin-left: 0.15em;
		font-size: 0.55em;
		font-weight: 700;
		color: var(--text-muted);
	}
	.tono-bien .valor {
		color: var(--state-positive);
	}
	.tono-mal .valor {
		color: var(--state-negative);
	}
	.etiqueta {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 600;
		line-height: 1.35;
		color: var(--text-primary);
	}
	.matiz {
		margin: 0.35rem 0 0;
		font-size: 0.76rem;
		line-height: 1.45;
		color: var(--text-muted);
	}
</style>
