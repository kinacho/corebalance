<script lang="ts">
	import { untrack } from 'svelte';

	/**
	 * Un solo control que mueve un solo número.
	 *
	 * ⚠️ **Arranca con un valor por defecto realista y la lección se entiende sin tocarlo.**
	 * Es la condición que separa esto de la decoración: quien todavía no ha contratado nada
	 * no conoce su TER ni su banda, y un widget que exige un dato que el lector no tiene
	 * enseña únicamente que no está preparado. Se toca si quiere; si no, ya dice algo.
	 *
	 * ⚠️ **Y el resultado tiene que cambiar de verdad con el control.** Un mando cuya
	 * conclusión no se mueve es coste de hidratación a cambio de nada.
	 *
	 * No sustituye a `CalculadoraAccDist` ni a `CalculadoraRecompra`: aquellas comparten su
	 * aritmética fiscal con `/herramientas/*` y la regla del proyecto es que ese cálculo no
	 * existe en dos copias. Esto es para lo que hoy no tiene calculadora.
	 *
	 * Una parada de tabulación: un `input type="range"` es un único elemento focalizable y
	 * las flechas ya lo mueven.
	 */
	interface Props {
		/** Qué se está moviendo. */
		etiqueta: string;
		min: number;
		max: number;
		paso?: number;
		/** El valor de partida. Realista, no el mínimo. */
		inicial: number;
		/** Lo que se escribe junto al valor del control (` %`, ` años`…). */
		unidad?: string;
		/** Qué responde el número grande. */
		etiquetaResultado: string;
		/** Del valor del control al resultado, ya formateado. */
		calcular: (valor: number) => string;
		/** Una línea bajo el resultado: el supuesto, la fuente o la advertencia. */
		nota?: string;
	}

	let {
		etiqueta,
		min,
		max,
		paso = 1,
		inicial,
		unidad = '',
		etiquetaResultado,
		calcular,
		nota
	}: Props = $props();

	// `untrack` y no `inicial` a secas: es el valor de partida, no un vínculo. Sin él el
	// compilador avisa de que solo se está capturando el valor inicial — que es
	// exactamente lo que se quiere, así que se dice en el código en vez de convivir con
	// un aviso que mañana tape a otro de verdad.
	let valor = $state(untrack(() => inicial));
	const resultado = $derived(calcular(valor));
</script>

<div class="mando">
	<label>
		<span class="cabeza">
			<span class="etiqueta">{etiqueta}</span>
			<span class="actual">{valor.toLocaleString('es-ES')}{unidad}</span>
		</span>
		<input type="range" {min} {max} step={paso} bind:value={valor} />
	</label>

	<div class="salida">
		<p class="etiqueta-resultado">{etiquetaResultado}</p>
		<p class="resultado" aria-live="polite">{resultado}</p>
		{#if nota}<p class="nota">{nota}</p>{/if}
	</div>
</div>

<style>
	.mando {
		margin: 2rem 0;
		padding: 1.3rem 1.4rem;
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		background: var(--bg-card);
	}
	label {
		display: block;
	}
	.cabeza {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.8rem;
		margin-bottom: 0.6rem;
	}
	.etiqueta {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	.actual {
		font-size: 1rem;
		font-weight: 800;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}
	/*
	 * El carril se estiliza a mano porque el nativo hereda el acento del sistema
	 * operativo, que en este tema oscuro puede salir en cualquier color.
	 */
	/*
	 * ⚠️ 44 px de alto, no los 22 del pulgar: el elemento **es** el objetivo de toque, y
	 * medido en un móvil de 390 px salía a 22 px, por debajo del suelo de 40 que vigila
	 * `auditar-movil.mjs`. El carril sigue viéndose de 6 px; lo que crece es la zona
	 * agarrable, que es invisible y es justo la que se olvida.
	 */
	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 44px;
		background: transparent;
		cursor: pointer;
	}
	input[type='range']::-webkit-slider-runnable-track {
		height: 6px;
		border-radius: 3px;
		background: var(--track);
	}
	input[type='range']::-moz-range-track {
		height: 6px;
		border-radius: 3px;
		background: var(--track);
	}
	/* 22 px de pulgar: por debajo no se agarra con el dedo. */
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 22px;
		height: 22px;
		margin-top: -8px;
		border: none;
		border-radius: 50%;
		background: var(--accent-blue);
	}
	input[type='range']::-moz-range-thumb {
		width: 22px;
		height: 22px;
		border: none;
		border-radius: 50%;
		background: var(--accent-blue);
	}
	input[type='range']:focus-visible {
		outline: 2px solid var(--accent-blue);
		outline-offset: 4px;
	}

	.salida {
		margin-top: 1.1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-subtle);
		text-align: center;
	}
	.etiqueta-resultado {
		margin: 0 0 0.3rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
	.resultado {
		margin: 0;
		font-size: clamp(1.7rem, 5.5vw, 2.2rem);
		font-weight: 800;
		line-height: 1;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}
	.nota {
		margin: 0.7rem 0 0;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--text-muted);
	}
</style>
