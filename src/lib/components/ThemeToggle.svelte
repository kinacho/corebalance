<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';

	/**
	 * El conmutador de tema.
	 *
	 * ⚠️ **Dos estados, y desde el 15-ago-2026 el store también tiene dos.** Antes
	 * guardaba un tercero, `'system'`, y el botón no lo ofrecía para no tener que
	 * explicar un «automático» en una barra de iconos donde no cabe explicar nada.
	 * Ahora el predeterminado es el oscuro y no depende del sistema, así que ese
	 * tercer estado ya no existe: el store solo distingue «no ha elegido» (que se
	 * pinta oscuro) de una elección guardada. Queda `theme.olvidar()`, sin
	 * interfaz por la misma razón que la tenía su antecesor.
	 *
	 * El icono muestra **el tema al que se va**, no en el que se está: un botón dice
	 * lo que hace, no dónde estás. Y el rótulo accesible lo dice con palabras, que
	 * es lo que impide que la distinción dependa de reconocer un sol frente a una
	 * luna.
	 */

	interface Props {
		/** Clase del contenedor donde se inserta, para heredar su tamaño de botón. */
		clase?: string;
	}

	let { clase = '' }: Props = $props();

	const vaAClaro = $derived(theme.resuelto === 'dark');
	const etiqueta = $derived(
		vaAClaro ? $LL.header.theme_to_light() : $LL.header.theme_to_dark()
	);
</script>

<button
	type="button"
	class="theme-toggle {clase}"
	onclick={() => theme.alternar()}
	title={etiqueta}
	aria-label={etiqueta}
>
	{#if vaAClaro}
		<!-- Sol: se va a claro. -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
		</svg>
	{:else}
		<!-- Luna: se va a oscuro. -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{/if}
</button>

<style>
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		padding: 0;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--bg-card);
		color: var(--text-muted);
		cursor: pointer;
	}

	.theme-toggle:hover {
		color: var(--text-primary);
		border-color: var(--border-strong);
	}

	.theme-toggle svg {
		/*
		 * Tamaño explícito. Un SVG sin `width` llena la caja que le den, y este botón
		 * cambia de tamaño en móvil por la regla de los 44 px de `layout.css` — que
		 * es exactamente cómo el icono del modo apilado del histórico acabó midiendo
		 * 88 px de ancho.
		 */
		width: 18px;
		height: 18px;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
