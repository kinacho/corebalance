<script lang="ts">
	interface Props {
		data: number[] | undefined;
		color?: string;
		width?: number;
		height?: number;
	}

	let { data, color = 'auto', width = 50, height = 20 }: Props = $props();

	// Calculate SVG path
	const pathData = $derived.by(() => {
		if (!data || data.length < 2) return '';
		
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1; 
		
		const xStep = width / (data.length - 1);
		
		let d = '';
		data.forEach((val, i) => {
			const x = i * xStep;
			const padding = 2;
			const innerHeight = height - padding * 2;
			const normalizedY = ((val - min) / range);
			const y = height - padding - (normalizedY * innerHeight);
			
			if (i === 0) d += `M ${x} ${y}`;
			else d += ` L ${x} ${y}`;
		});
		return d;
	});

	const isPositive = $derived(data && data.length > 1 ? data[data.length - 1] >= data[0] : true);
	const sparkColor = $derived(color === 'auto' ? (isPositive ? '#10b981' : '#fca5a5') : color);
</script>

{#if data && data.length >= 2}
	<svg {width} {height} class="sparkline" viewBox="0 0 {width} {height}" fill="none">
		<path d={pathData} stroke={sparkColor} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{/if}

<style>
	.sparkline {
		display: block;
		overflow: visible;
		opacity: 0.8;
	}
</style>
