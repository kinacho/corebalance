<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Una fila de una a tres cifras, con su procedencia al pie.
	 *
	 * ⚠️ **Existe para sacar el número del párrafo.** Las cifras que sostienen una lección
	 * («45.991 € frente a 42.517 €», «93,6 % sobre un objetivo del 80») estaban dentro de
	 * un párrafo, con la misma tipografía que las conjunciones: el lector las leía como
	 * palabras, no como magnitudes, y no percibía que una diferencia de riesgo enorme venía
	 * a cambio de una diferencia de dinero modesta. Eso lo dice un objeto en 300 ms y la
	 * prosa no lo dice nunca.
	 *
	 * `fuente` y `fecha` son **obligatorias y no decorativas**: un dato dibujado parece más
	 * autoritativo que el mismo dato en prosa, así que sin procedencia es un pasivo mayor
	 * que dejarlo escrito. Al ser props requeridas, el compilador hace de auditor y no hace
	 * falta disciplina.
	 */
	interface Props {
		/** Cómo se cita el dato. Obligatoria: ver arriba. */
		fuente: string;
		/** La fecha **del dato**, no la de hoy. */
		fecha: string;
		/** Las `<Cifra>`. Entre una y tres; con cuatro dejan de compararse y se enumeran. */
		children: Snippet;
	}

	let { fuente, fecha, children }: Props = $props();
</script>

<div class="cifras">
	<div class="fila">
		{@render children()}
	</div>
	<p class="procedencia">{fuente} · {fecha}</p>
</div>

<style>
	.cifras {
		margin: 2rem 0;
	}
	.fila {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.9rem;
	}
	.procedencia {
		margin: 0.7rem 0 0;
		font-size: var(--text-micro);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
</style>
