<script lang="ts">
	/**
	 * Comparación de magnitudes con etiqueta directa.
	 *
	 * ⚠️ **Es HTML y CSS, no SVG, y es una decisión medida.** La regla del proyecto para los
	 * mapas dice que un `<text>` de SVG «ni se ajusta ni se recorta solo», y por eso el
	 * treemap arrastra `approximateTextWidth`, `truncateToWidth` y un `clipPath` por celda.
	 * Aquí las etiquetas son prosa española —«Mercados emergentes», «Gestión activa»— y
	 * dentro de un `viewBox` habría que resolver otra vez ese problema entero para no
	 * repetir «ACCIONES INDIVIDUALE». Con texto normal, el navegador lo ajusta y no hay nada
	 * que medir. La barra es un `div` con un ancho en porcentaje, que es exactamente lo que
	 * ya hace `CompositionBars`.
	 *
	 * ⚠️ **Etiqueta directa siempre, leyenda nunca.** Con tres barras una leyenda obliga a
	 * ir y volver, y además es lo que hace legal el tercer color: el validador marca
	 * verde↔ámbar como aviso de daltonismo, permitido solo con codificación secundaria.
	 * Aquí el nombre está pegado a su barra, así que el color no carga con nada.
	 *
	 * `escala`:
	 * - `categorica` — hasta tres series distintas. Azul y ámbar son el par por defecto
	 *   (ΔE 32,3 en protanopia contra la superficie `#0d0d12`); el verde solo entra de
	 *   tercero. Una cuarta categoría no se pinta: se agrupa o se parte en dos gráficos.
	 * - `rampa` — una sola magnitud ordenada (los tramos del IRPF, los pesos por región).
	 *   Un único azul de oscuro a claro, **no** la categórica: cinco tramos de una misma
	 *   escala no son cinco entidades.
	 */
	interface Serie {
		etiqueta: string;
		valor: number;
		/** Solo en `categorica`. Por orden: azul, ámbar, verde. */
		tono?: 'a' | 'b' | 'c';
		/** Se pinta bajo la barra, en pequeño. Para el «de los cuales…». */
		matiz?: string;
	}

	interface Props {
		series: Serie[];
		/** `%`, `€`, `pp`… Se escribe junto a cada valor. */
		unidad?: string;
		/** El techo del eje. Por defecto, el mayor de la serie. Ponlo a 100 en porcentajes. */
		max?: number;
		escala?: 'categorica' | 'rampa';
		/** Qué se está comparando. Va arriba, en pequeño. */
		titulo?: string;
		/** Obligatoria: un dato dibujado parece más autoritativo que el mismo en prosa. */
		fuente: string;
		/** La fecha **del dato**. */
		fecha: string;
		/** Una línea de contexto bajo el gráfico. */
		nota?: string;
	}

	let {
		series,
		unidad = '',
		max,
		escala = 'categorica',
		titulo,
		fuente,
		fecha,
		nota
	}: Props = $props();

	// El `|| 1` va entre paréntesis a propósito: sin ellos es un error de sintaxis, y
	// evita además dividir entre cero si todas las series valen cero.
	const techo = $derived(max ?? (Math.max(...series.map((s) => s.valor), 0) || 1));

	// Una barra de valor diminuto tiene que seguir viéndose como una barra: sin suelo,
	// el 0,20 % de un TER frente al 1,5 % desaparece y el gráfico pierde justo la
	// comparación que existe para hacer.
	const ancho = (valor: number) => Math.max(1.5, (Math.abs(valor) / techo) * 100);

	const TONOS = { a: 'var(--accent-blue)', b: 'var(--accent-orange)', c: 'var(--accent-green)' };

	function color(s: Serie, i: number): string {
		if (escala === 'rampa') {
			/**
			 * Rampa de un solo tono, de menos a más según la posición.
			 *
			 * ⚠️ **Se mezcla entre dos extremos, NO contra la superficie.** Mezclar el
			 * acento con el fondo resta contraste por definición —en oscuro tira hacia
			 * negro y en claro hacia blanco—, así que el peldaño más flojo caía por
			 * debajo del 3:1 que WCAG 1.4.11 pide a un objeto gráfico hiciera lo que
			 * hiciera con el suelo de la mezcla: medido a 62, 72 y 80 % dio
			 * **2,90 · 2,76 · 2,86**. No era cuestión de afinar el número, era la
			 * dirección de la mezcla. Antes iba contra `#0d0d12` escrito a fuego, que
			 * además dejaba la rampa fija al tema oscuro.
			 *
			 * Una barra que no se ve es el dato que la lección existe para enseñar.
			 *
			 * `--ramp-from` y `--ramp-to` los define cada tema en `layout.css`, y la
			 * dirección se invierte: en claro va de azul marino a azul medio.
			 */
			const paso = series.length > 1 ? i / (series.length - 1) : 1;
			const mezcla = Math.round(paso * 100);
			return `color-mix(in oklab, var(--ramp-to) ${mezcla}%, var(--ramp-from))`;
		}
		return TONOS[s.tono ?? (['a', 'b', 'c'][i % 3] as 'a' | 'b' | 'c')];
	}

	const num = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
</script>

<figure class="barras">
	{#if titulo}<figcaption class="titulo">{titulo}</figcaption>{/if}

	<div class="lista">
		{#each series as s, i (s.etiqueta)}
			<div class="fila">
				<div class="cabeza">
					<span class="etiqueta">{s.etiqueta}</span>
					<span class="valor">{num(s.valor)}{unidad}</span>
				</div>
				<div class="carril">
					<div class="barra" style="width:{ancho(s.valor)}%; background:{color(s, i)}"></div>
				</div>
				{#if s.matiz}<span class="matiz">{s.matiz}</span>{/if}
			</div>
		{/each}
	</div>

	{#if nota}<p class="nota">{nota}</p>{/if}
	<p class="procedencia">{fuente} · {fecha}</p>
</figure>

<style>
	.barras {
		margin: 2rem 0;
		padding: 1.3rem 1.4rem 1.1rem;
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		background: var(--bg-card);
	}
	.titulo {
		margin: 0 0 1.1rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	.lista {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.cabeza {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.8rem;
		margin-bottom: 0.4rem;
	}
	.etiqueta {
		font-size: 0.88rem;
		line-height: 1.35;
		color: var(--text-primary);
	}
	.valor {
		flex-shrink: 0;
		font-size: 0.88rem;
		font-weight: 800;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}
	.carril {
		height: 10px;
		border-radius: 5px;
		background: var(--bg-card-hover);
		overflow: hidden;
	}
	.barra {
		height: 100%;
		border-radius: 5px;
	}
	.matiz {
		display: block;
		margin-top: 0.35rem;
		font-size: 0.74rem;
		color: var(--text-muted);
	}
	.nota {
		margin: 1.1rem 0 0;
		font-size: 0.8rem;
		line-height: 1.55;
		color: var(--text-muted);
	}
	.procedencia {
		margin: 0.7rem 0 0;
		font-size: var(--text-micro);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
</style>
