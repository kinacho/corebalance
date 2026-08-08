<script lang="ts">
	import { STATE_POSITIVE, STATE_NEGATIVE } from '$lib/constants';

	/**
	 * ⚠️ **El color entra por atributo de presentación, así que aquí no vale
	 * `var(--state-positive)`.** `stroke="var(…)"` no resuelve de forma fiable en
	 * un atributo SVG —sí dentro de `style`—, así que el tono se importa de
	 * `constants.ts`, que es el mismo valor que el token de CSS. Es el único
	 * sitio del repo donde el color de estado hace falta como cadena de JS fuera
	 * de un lienzo de Chart.js.
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
		color === 'auto' ? (isPositive ? STATE_POSITIVE : STATE_NEGATIVE) : color
	);
	/** Id propio por instancia: dos degradados con el mismo id colisionan en el documento. */
	const gradientId = `spark-${Math.random().toString(36).slice(2, 9)}`;
</script>

{#if geometry}
	<svg {width} {height} class="sparkline" viewBox="0 0 {width} {height}" fill="none">
		{#if filled}
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={sparkColor} stop-opacity="0.28" />
					<stop offset="100%" stop-color={sparkColor} stop-opacity="0" />
				</linearGradient>
			</defs>
			<path d={geometry.area} fill="url(#{gradientId})" />
		{/if}
		<path
			d={geometry.line}
			stroke={sparkColor}
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
</style>
