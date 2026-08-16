<script lang="ts">
	/**
	 * La comprobación: el lector elige **antes** de que se lo expliquen.
	 *
	 * ⚠️ **No es un test ni un juego, y la diferencia está en dónde va.** Al final de la
	 * lección esto es un examen y se salta; antes de la explicación es un compromiso, y ahí
	 * está su valor: intentar responder y fallar retiene más que leer la explicación dos
	 * veces. Por eso no hay puntuación, ni racha, ni «¡correcto!» — nada que convierta
	 * pensar en marcar.
	 *
	 * ⚠️ **El `porque` de cada opción es la mitad del contenido**, incluidas las falsas: es
	 * donde se dice por qué la intuición equivocada es razonable y en qué se rompe.
	 *
	 * ⚠️ **Y por eso está en el HTML desde el primer render, no inyectado al responder.**
	 * Se oculta con CSS y `aria-hidden`, nunca quitándolo del DOM. Si se inyectara, unas
	 * 150 palabras por lección no existirían ni para Google ni para quien no hidrata — este
	 * repo ya tiene tres soft 404 y un `noindex` ilegible por confiar en contenido que solo
	 * aparecía después. El `<noscript>` de abajo cierra la otra mitad: sin JavaScript no hay
	 * nada que pulsar, así que las razones se enseñan todas de entrada en vez de quedarse
	 * recortadas a cero de alto.
	 *
	 * ⚠️ **Es UNA parada de tabulación**, no una por opción. `role="radiogroup"` con
	 * tabindex rotatorio: se entra una vez, las flechas mueven el foco y Espacio elige. El
	 * spec E2E tabula 60 veces desde el principio de la lección y tiene que llegar al CTA
	 * del ejercicio; cuatro botones sueltos gastarían cuatro paradas de ese presupuesto.
	 *
	 * La selección **no** sigue al foco, que es lo contrario de lo que hace un grupo de
	 * radios normal: aquí elegir revela la respuesta, así que pasar por encima con la flecha
	 * no puede destriparla.
	 */
	interface Opcion {
		texto: string;
		correcta: boolean;
		/** Por qué lo es o por qué no. Se lee incluso si el lector acierta. */
		porque: string;
	}

	interface Props {
		pregunta: string;
		/** Entre dos y cuatro. Con más, se lee la lista en vez de pensarla. */
		opciones: Opcion[];
		/** Una línea antes de las opciones, si la pregunta necesita contexto. */
		pista?: string;
	}

	let { pregunta, opciones, pista }: Props = $props();

	let elegida = $state<number | null>(null);
	let foco = $state(0);
	let botones: HTMLButtonElement[] = [];

	const acertada = $derived(elegida !== null && opciones[elegida].correcta);

	function elegir(i: number) {
		// Solo la primera respuesta cuenta: dejar cambiarla convierte la comprobación en
		// «prueba hasta que se ponga verde», que es justo el hábito contrario.
		if (elegida !== null) return;
		elegida = i;
		foco = i;
	}

	function teclas(e: KeyboardEvent, i: number) {
		const n = opciones.length;
		let destino = -1;
		if (e.key === 'ArrowDown' || e.key === 'ArrowRight') destino = (i + 1) % n;
		else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') destino = (i - 1 + n) % n;
		else if (e.key === 'Home') destino = 0;
		else if (e.key === 'End') destino = n - 1;
		if (destino < 0) return;
		e.preventDefault();
		foco = destino;
		botones[destino]?.focus();
	}
</script>

<div class="comprueba" class:respondida={elegida !== null}>
	<p class="eyebrow">Antes de seguir</p>
	<p class="pregunta" id="comprueba-pregunta">{pregunta}</p>
	{#if pista}<p class="pista">{pista}</p>{/if}

	<div class="opciones" role="radiogroup" aria-labelledby="comprueba-pregunta">
		{#each opciones as o, i (o.texto)}
			<div class="opcion" class:elegida={elegida === i} class:correcta={o.correcta}>
				<button
					bind:this={botones[i]}
					type="button"
					role="radio"
					aria-checked={elegida === i}
					tabindex={i === foco ? 0 : -1}
					disabled={elegida !== null}
					onclick={() => elegir(i)}
					onkeydown={(e) => teclas(e, i)}
				>
					<span class="marca" aria-hidden="true">
						{#if elegida !== null}{o.correcta ? '✓' : '✕'}{/if}
					</span>
					<span class="texto">{o.texto}</span>
				</button>

				<!--
					Siempre en el HTML, nunca inyectado. Ver el docblock: sin esto se pierden
					las razones para Google y para quien no hidrata.
				-->
				<p class="porque comprueba-porque" aria-hidden={elegida === null}>{o.porque}</p>
			</div>
		{/each}
	</div>

	<p class="veredicto" aria-live="polite">
		{#if elegida !== null}
			{acertada ? 'Eso es.' : 'No, y es el error habitual.'}
		{/if}
	</p>
</div>

<noscript>
	<!--
		Sin JavaScript no hay nada que pulsar, así que las razones se enseñan enteras en vez
		de quedarse recortadas a cero de alto. `!important` porque la regla con ámbito de
		Svelte (`.porque.svelte-xxx`) tiene más especificidad que esta clase suelta.
	-->
	<style>
		.comprueba-porque {
			max-height: none !important;
			opacity: 1 !important;
			margin-top: 0.5rem !important;
		}
	</style>
</noscript>

<style>
	/*
	 * ⚠️ **El tinte iba a fuego y estaba calibrado solo para fondo oscuro.**
	 *
	 * `rgba(37,99,235,0.05)` sobre negro es un panel encendido; sobre el `#f4f4f9` del
	 * tema claro, medido, daba **1,07 de fondo y 1,47 de borde** — o sea la caja que
	 * más veces se ve en todo el área (una por lección, las 34) era un rectángulo casi
	 * blanco. Es el mismo defecto que ya se arregló para el aviso y el resumen cuando
	 * nacieron `--tint-warn` y `--tint-ok`; este se quedó fuera por estar dentro de un
	 * componente en vez de en la página.
	 */
	.comprueba {
		margin: 2.5rem 0;
		padding: 1.4rem 1.5rem;
		border: 1px solid var(--tint-info-line);
		border-radius: 16px;
		background: var(--tint-info);
	}
	.eyebrow {
		margin: 0 0 0.6rem;
		font-size: var(--text-micro);
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--accent-blue-ink);
	}
	.pregunta {
		margin: 0 0 1rem;
		font-size: 1.02rem;
		font-weight: 700;
		line-height: 1.5;
		color: var(--text-primary);
	}
	.pista {
		margin: -0.6rem 0 1rem;
		font-size: 0.84rem;
		line-height: 1.55;
		color: var(--text-muted);
	}
	.opciones {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	button {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
		width: 100%;
		/* 44 px de alto mínimo: es un objetivo de toque, no un enlace de texto. */
		min-height: 44px;
		padding: 0.7rem 0.9rem;
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--bg-card);
		color: var(--text-primary);
		font: inherit;
		font-size: 0.92rem;
		line-height: 1.45;
		text-align: left;
		cursor: pointer;
	}
	/* Blanco al 28 % era hover solo en oscuro: sobre fondo claro no pasaba nada. */
	button:hover:not(:disabled) {
		border-color: var(--border-strong);
	}
	button:disabled {
		cursor: default;
	}
	.marca {
		flex-shrink: 0;
		width: 1.1em;
		font-weight: 800;
		color: var(--text-muted);
	}
	/*
	 * El color va siempre con el símbolo al lado, nunca solo: `--state-positive` y
	 * `--state-negative` son texto con signo, no relleno, y esa es la condición con la que
	 * este par pasa la validación de daltonismo.
	 */
	.opcion.correcta .marca {
		color: var(--state-positive);
	}
	.opcion:not(.correcta) .marca {
		color: var(--state-negative);
	}
	.respondida .opcion.correcta button {
		border-color: rgba(52, 211, 153, 0.4);
		background: var(--state-positive-soft);
	}
	.respondida .opcion.elegida:not(.correcta) button {
		border-color: rgba(244, 63, 94, 0.4);
		background: var(--state-negative-soft);
	}
	/*
	 * Lo que no se eligió y era falso se apaga: la atención va a la razón, no al error.
	 *
	 * ⚠️ **Se apaga bajando un peldaño de la escala, NO con `opacity`.** La opacidad se
	 * compone con lo que haya detrás, así que el mismo token acaba midiendo distinto en
	 * cada sitio y ninguno de esos valores es el que se validó — es exactamente lo que
	 * `layout.css` tiene escrito sobre por qué la escala es hex sólido. Aquí el texto de
	 * la opción es `--text-primary` y bajo `opacity: 0.55` caía por debajo de AA en tema
	 * claro. `--text-muted` es el peldaño de al lado y está medido entero.
	 *
	 * ⚠️ Y no lo cazaba ninguna guarda: `contraste.mjs` es estático y no modela
	 * `opacity`, y el barrido en vivo no llega al estado «respondida» porque solo existe
	 * después de un clic.
	 */
	.respondida .opcion:not(.elegida):not(.correcta) button {
		color: var(--text-muted);
		background: transparent;
	}

	.porque {
		max-height: 0;
		margin: 0 0 0 0.3rem;
		overflow: hidden;
		opacity: 0;
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--text-muted);
		transition:
			max-height 0.25s ease,
			opacity 0.25s ease,
			margin 0.25s ease;
	}
	.respondida .porque {
		max-height: 20rem;
		margin: 0.5rem 0 0.2rem 0.3rem;
		opacity: 1;
	}
	@media (prefers-reduced-motion: reduce) {
		.porque {
			transition: none;
		}
	}

	.veredicto {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.respondida .veredicto {
		margin-top: 1rem;
	}
</style>
