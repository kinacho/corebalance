<script lang="ts">
	/**
	 * ⚠️ **El color viene del token de CSS, y eso es un arreglo del tema claro, no
	 * una limpieza.**
	 *
	 * Antes importaba `STATE_POSITIVE` de `constants.ts` con esta razón escrita:
	 * `stroke="var(…)"` no resuelve como atributo de presentación SVG. Cierto —
	 * pero sí resuelve **dentro de `style`**, que es la salida que la propia nota
	 * mencionaba y no se tomaba. Importar la constante congelaba el tono: medido
	 * con el validador de `dataviz`, `STATE_POSITIVE` (`#34d399`) sobre blanco da
	 * **1,92:1** y falla la banda de luminosidad, o sea que en tema claro la línea
	 * verde de cada sparkline era prácticamente invisible.
	 *
	 * Pasando por el token, el valor lo resuelve el tema: `#34d399` en oscuro,
	 * `#03714f` en claro (5,7:1). El color se inyecta como variable en el `<svg>` y
	 * el CSS de abajo la aplica a `stroke` y a `stop-color`, que en CSS sí son
	 * propiedades. `color` sigue aceptando una cadena para quien pase un tono
	 * concreto.
	 */

	interface Props {
		data: number[] | undefined;
		color?: string;
		width?: number;
		height?: number;
		/** Relleno bajo la línea. Para las cajas del hero, donde da cuerpo al trazo. */
		filled?: boolean;
	}

	let { data, color = 'auto', width = 50, height = 20, filled = false }: Props = $props();

	const geometry = $derived.by(() => {
		if (!data || data.length < 2) return null;

		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;
		const padding = 2;
		const innerHeight = height - padding * 2;
		const xStep = width / (data.length - 1);

		const coords = data.map((val, i) => ({
			x: i * xStep,
			y: height - padding - ((val - min) / range) * innerHeight
		}));

		const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
		const area = `${line} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

		return { line, area };
	});

	const isPositive = $derived(data && data.length > 1 ? data[data.length - 1] >= data[0] : true);
	const sparkColor = $derived(
		color === 'auto'
			? isPositive
				? 'var(--state-positive)'
				: 'var(--state-negative)'
			: color
	);
	/** Id propio por instancia: dos degradados con el mismo id colisionan en el documento. */
	const gradientId = `spark-${Math.random().toString(36).slice(2, 9)}`;
</script>

{#if geometry}
	<svg
		{width}
		{height}
		class="sparkline"
		viewBox="0 0 {width} {height}"
		fill="none"
		style="--spark: {sparkColor}"
	>
		{#if filled}
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-opacity="0.28" />
					<stop offset="100%" stop-opacity="0" />
				</linearGradient>
			</defs>
			<path class="area" d={geometry.area} fill="url(#{gradientId})" />
		{/if}
		<path
			class="linea"
			d={geometry.line}
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
{/if}

<style>
	.sparkline {
		display: block;
		overflow: visible;
	}

	/*
	 * `stroke` y `stop-color` como propiedades de CSS, no como atributos de
	 * presentación: es lo que permite que el valor sea un `var()` y por tanto que
	 * lo resuelva el tema. Ver la nota de arriba.
	 */
	.sparkline .linea {
		stroke: var(--spark);
	}

	.sparkline stop {
		stop-color: var(--spark);
	}
</style>
