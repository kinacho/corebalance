<script lang="ts">
	import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { AUTHOR } from '$lib/seo/author';
	import { absoluteUrl, SITE_URL } from '$lib/i18n/routing';
	import { cursoOgImage } from '$lib/seo/og';
	import { ARQUETIPO_ETIQUETA, PROMESA_GRATIS } from '$lib/cursos';

	let { data } = $props();

	const l = $derived(data.leccion);
	const c = $derived(data.curso);
	const ruta = $derived(`/cursos/${c.slug}/${l.slug}`);
	const Contenido = $derived(l.content);

	// La card es la del curso, compartida por sus lecciones: ver `cursoOgImage`.
	const cardSocial = $derived(cursoOgImage(c.slug));

	/**
	 * `Course` + `LearningResource` + migas + preguntas, sobre el `@graph` de la lección.
	 *
	 * ⚠️ Un bloque JSON-LD por URL, nunca dos: dos compiten y Search Console acaba
	 * eligiendo. Es la misma regla que ya siguen las páginas de herramientas — y por eso
	 * lo que se añade cuelga de este `@graph` en vez de abrir un `<script>` nuevo.
	 *
	 * ⚠️ El `FAQPage` solo se emite si hay preguntas de verdad. `remarkFaq` las saca de los
	 * encabezados que acaban en `?` y del texto que les sigue, así que **lo marcado es
	 * literalmente lo que el lector ve**: nada de marcar contenido que no esté en la
	 * página, que es lo que Google penaliza y lo que hace que un rich result se retire.
	 */
	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Cursos', item: absoluteUrl('/cursos') },
					{
						'@type': 'ListItem',
						position: 2,
						name: c.titulo,
						item: absoluteUrl(`/cursos/${c.slug}`)
					},
					{ '@type': 'ListItem', position: 3, name: l.titulo, item: absoluteUrl(ruta) }
				]
			},
			...(l.faq?.length
				? [
						{
							'@type': 'FAQPage',
							mainEntity: l.faq.map((f) => ({
								'@type': 'Question',
								name: f.question,
								acceptedAnswer: { '@type': 'Answer', text: f.answer }
							}))
						}
					]
				: []),
			{
				'@type': 'Course',
				name: c.titulo,
				description: c.descripcion,
				url: absoluteUrl(`/cursos/${c.slug}`),
				inLanguage: 'es',
				isAccessibleForFree: true,
				provider: { '@type': 'Organization', name: 'CoreBalance', url: absoluteUrl('/') },
				// Sin esto Google marca el `Course` como incompleto: quiere saber en qué
				// formato se imparte y qué cuesta.
				hasCourseInstance: {
					'@type': 'CourseInstance',
					courseMode: 'online',
					courseWorkload: `PT${l.minutos}M`
				},
				offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR', category: 'Free' }
			},
			{
				'@type': 'LearningResource',
				name: l.titulo,
				description: l.descripcion,
				url: absoluteUrl(ruta),
				inLanguage: 'es',
				isAccessibleForFree: true,
				learningResourceType: 'Lesson',
				position: l.orden,
				timeRequired: `PT${l.minutos}M`,
				// Absoluta, como en las comparativas: el JSON-LD no resuelve rutas relativas.
				image: `${SITE_URL}${cardSocial}`,
				author: { '@type': 'Person', name: AUTHOR.name, url: absoluteUrl('/autor/kinacho') }
			}
		]
	});
</script>

<SeoHead
	title={l.titulo}
	description={l.descripcion}
	path={ruta}
	lang="es"
	ogType="article"
	bilingual={false}
	image={cardSocial}
	{jsonLd}
/>

<LandingNavBar />

<main class="leccion">
	<nav class="miga" aria-label="Ruta">
		<a href="/cursos">Cursos</a>
		<span aria-hidden="true">·</span>
		<a href={`/cursos/${c.slug}`}>{c.titulo}</a>
	</nav>

	<article>
		<!--
			La portada de la lección. Es una placa y no texto suelto sobre la página
			porque una lección tenía la misma presencia que un párrafo cualquiera: tres
			líneas y una raya de 3 px.

			⚠️ **No lleva ni un elemento enfocable, y es deliberado.**
			`e2e/cursos-navegacion.spec.ts` exige alcanzar `.accion-cta` en 60
			tabulaciones desde el principio del documento; todo lo que se enfoque aquí
			arriba se come ese presupuesto. Los `span` del paso no cuestan nada. Y hay una
			segunda razón, medida: `--border-strong` —el color del anillo de foco global—
			da 2,77 sobre esta placa, por debajo del 3:1 de WCAG 1.4.11.
		-->
		<header class="cabecera">
			<!--
				⚠️ **«Lección N de M» se queda aquí, en texto.** `cursos-navegacion.spec.ts`
				lo usa como contador para comprobar que las lecciones encadenan y nunca
				saltan de curso, y es además lo único que dice la posición a quien no ve el
				numeral. Se probó a sustituirlo por «Curso 3 de 5» y el spec lo cazó: la
				posición en el catálogo es un dato más flojo que la posición en el curso.
			-->
			<p class="paso">
				<span class="paso-n">Lección {l.orden} de {data.total}</span>
				<span class="paso-sep" aria-hidden="true">·</span>
				<span>{l.minutos} min</span>
				<span class="paso-sep" aria-hidden="true">·</span>
				<!--
					El arquetipo. Es el dato que decide el orden de los tiempos de la lección
					—y por tanto lo que impide que las 34 se lean igual— y era el único que no
					se veía en ninguna parte. Puesto aquí, cada lección declara qué clase de
					rato va a ser.
				-->
				<span>{ARQUETIPO_ETIQUETA[l.arquetipo]}</span>
				<span class="paso-gratis">gratis</span>
			</p>
			<div class="titular">
				<!-- El ordinal como numeral y no como frase: da portada sin gastar color,
				     que es lo que la medición dejó fuera. `aria-hidden` porque el texto ya
				     lo dice en el `aria-label` de la barra de progreso. -->
				<p class="ordinal" aria-hidden="true">
					{String(l.orden).padStart(2, '0')}<span class="ordinal-total">/{String(data.total).padStart(2, '0')}</span>
				</p>
				<h1>{l.titulo}</h1>
			</div>
			<p class="gancho">{l.gancho}</p>

			<!--
				El progreso del curso, dibujado sin contar nada a nadie. Va como canto
				inferior de la placa en vez de flotando entre bloques: ahí era un elemento
				más de la pila y aquí cierra la portada.
			-->
			<div class="barra" role="img" aria-label={`Lección ${l.orden} de ${data.total}`}>
				<span style={`width:${(l.orden / data.total) * 100}%`}></span>
			</div>
		</header>

		<div class="markdown-body">
			<Contenido />
		</div>

		<!--
			El ejercicio. Es lo que separa un curso de siete artículos seguidos: cada
			lección deja algo hecho en la herramienta, no una idea en la cabeza.
		-->
		<section class="accion">
			<p class="accion-eyebrow">Hazlo ahora</p>
			<p class="accion-texto">{l.accion.texto}</p>
			<a class="accion-cta" href={l.accion.href}>{l.accion.cta}</a>
		</section>

		{#if l.lecturas?.length}
			<section class="extras">
				<h2>Para profundizar</h2>
				<ul>
					{#each l.lecturas as lectura}
						<li><a href={lectura.href}>{lectura.texto}</a></li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if l.fuentes?.length}
			<section class="extras fuentes">
				<h2>Fuentes</h2>
				<ul>
					{#each l.fuentes as fuente}
						<li>
							<a href={fuente.url} rel="noopener noreferrer nofollow" target="_blank"
								>{fuente.texto}</a
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<nav class="vecinas" aria-label="Navegación del curso">
			{#if data.anterior}
				<a class="vecina anterior" href={`/cursos/${c.slug}/${data.anterior.slug}`}>
					<span class="vecina-eyebrow">Anterior</span>
					<span class="vecina-titulo">{data.anterior.titulo}</span>
				</a>
			{:else}
				<span></span>
			{/if}

			{#if data.siguiente}
				<a class="vecina siguiente" href={`/cursos/${c.slug}/${data.siguiente.slug}`}>
					<span class="vecina-eyebrow">Siguiente</span>
					<span class="vecina-titulo">{data.siguiente.titulo}</span>
				</a>
			{:else}
				<a class="vecina siguiente" href={`/cursos/${c.slug}`}>
					<span class="vecina-eyebrow">Has terminado</span>
					<span class="vecina-titulo">Volver al índice del curso</span>
				</a>
			{/if}
		</nav>

		<aside class="gratis">
			<h2>{PROMESA_GRATIS.titulo}</h2>
			<ul>
				{#each PROMESA_GRATIS.puntos as punto}
					<li>{punto}</li>
				{/each}
			</ul>
			<p>{PROMESA_GRATIS.pie}</p>
		</aside>
	</article>
</main>

<LandingFooter />

<style>
	.leccion {
		max-width: 760px;
		margin: 0 auto;
		padding: 5.5rem 1.25rem 4rem;
	}

	.miga {
		display: flex;
		gap: 0.5rem;
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin-bottom: 2rem;
	}
	/*
	 * ⚠️ El relleno vertical es el objetivo de toque, no aire decorativo. Medido a 390 px
	 * sobre el build: estos enlaces salían a **17 px de alto**, muy por debajo del suelo de
	 * 40 que vigila `auditar-movil.mjs`. Es el tipo de defecto que una captura no enseña,
	 * porque se ve perfectamente y solo falla cuando lo intentas pulsar con el pulgar.
	 */
	.miga a {
		display: inline-block;
		/* 0,75rem y no 0,7: con 0,7 el enlace mide 39 px y el suelo son 40. Medido. */
		padding: 0.75rem 0;
		color: inherit;
		text-decoration: none;
	}
	.miga a:hover {
		color: var(--text-primary);
	}

	/* La placa. Ver el docblock de `--surface-quiet`: en oscuro sube y en claro baja,
	   que es lo que la separa de una tarjeta más en una página casi blanca. */
	.cabecera {
		position: relative;
		margin: 0 0 2.75rem;
		padding: 2.25rem 1.75rem 2.25rem;
		border: 1px solid var(--border-subtle);
		border-radius: 20px;
		background: var(--surface-quiet);
		overflow: hidden; /* recorta la barra contra la esquina redondeada */
	}

	.paso {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
		margin: 0 0 1rem;
		font-size: var(--text-micro);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		/* El conjunto se apaga y solo el ordinal es tinta: antes iba todo en azul,
		   incluidos «7 min» y «gratis», y tres cosas destacadas no destacan ninguna. */
		color: var(--text-muted);
	}
	.paso-n {
		color: var(--accent-blue-ink);
	}
	.paso-sep {
		color: var(--text-faint);
	}
	/* La promesa, como píldora: es lo que más se repite en todo el área y lo que más
	   vale decir, así que deja de ser una palabra más de la línea. */
	.paso-gratis {
		margin-left: auto;
		padding: 0.2rem 0.5rem;
		border: 1px solid var(--tint-ok-line);
		border-radius: 999px;
		background: var(--tint-ok);
		color: var(--accent-green-ink);
	}

	/* El numeral y el título comparten fila en escritorio y se apilan en móvil, donde
	   380 px no dan para una columna de cifra más un titular de dos líneas. */
	.titular {
		display: flex;
		align-items: baseline;
		gap: 1.1rem;
		margin: 0 0 0.9rem;
	}
	.ordinal {
		flex-shrink: 0;
		margin: 0;
		font-size: clamp(1.9rem, 5vw, 2.6rem);
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums;
		color: var(--text-faint);
	}
	.ordinal-total {
		font-size: 0.55em;
		font-weight: 700;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.95rem, 5vw, 2.75rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.025em;
		color: var(--text-primary);
	}

	.gancho {
		margin: 0;
		/* Entradilla, no pie de foto: sube de tamaño y sube un peldaño de la escala
		   (`--text-muted` daba 5,92 en claro; `--text-secondary`, 10,12). */
		font-size: clamp(1.1rem, 2.4vw, 1.22rem);
		line-height: 1.55;
		color: var(--text-secondary);
		max-width: 52ch;
	}

	.barra {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 3px;
		margin: 0;
		background: var(--border-subtle);
		overflow: hidden;
	}
	.barra span {
		display: block;
		height: 100%;
		/* Tinta y no marca: `--accent-blue` sobre la placa oscura da 3,22, que pasa el
		   3:1 de WCAG 1.4.11 sin ningún margen. `--accent-blue-ink` va holgado. */
		background: var(--accent-blue-ink);
	}

	/*
	 * Los dos bloques que se repiten en las 34 lecciones.
	 *
	 * ⚠️ Sin ellos, una lección es un muro de texto con dos títulos indistinguibles del
	 * resto: el lector no ve dónde está la advertencia ni dónde el resumen, que son
	 * justamente las dos partes que más se releen. El envoltorio se pone en el markdown
	 * (`<div class="bloque aviso">`) porque el CSS no puede seleccionar por el texto de un
	 * encabezado, y `:global` porque el contenido lo inyecta mdsvex.
	 */
	.leccion :global(.bloque) {
		margin: 2.5rem 0;
		padding: 1.4rem 1.5rem;
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
	}
	.leccion :global(.bloque h2) {
		margin: 0 0 0.9rem;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	.leccion :global(.bloque > :last-child) {
		margin-bottom: 0;
	}
	/*
	 * ⚠️ El espaciado se declara aquí y no se hereda del cuerpo del artículo: el `div`
	 * envolvente rompe la cadena de selectores del markdown, y sin esto los párrafos del
	 * aviso salen pegados unos a otros y la lista del resumen pierde las viñetas. Se vio
	 * mirando la captura, no leyendo el CSS.
	 */
	.leccion :global(.bloque p) {
		margin: 0 0 1rem;
		line-height: 1.7;
	}
	.leccion :global(.bloque ul) {
		margin: 0;
		padding-left: 1.2rem;
		list-style: disc;
	}
	.leccion :global(.bloque li) {
		margin-bottom: 0.45rem;
		line-height: 1.65;
	}
	.leccion :global(.bloque li::marker) {
		color: var(--text-faint);
	}

	/* La advertencia: ámbar, que es el color de «ojo con esto» en el resto de la app. */
	.leccion :global(.bloque.aviso) {
		background: var(--tint-warn);
		border-color: var(--tint-warn-line);
	}
	.leccion :global(.bloque.aviso h2) {
		color: var(--accent-orange-ink);
	}

	/* El resumen: cierra la lección, así que se lee como una ficha y no como más texto. */
	.leccion :global(.bloque.retener) {
		/* Tinte verde, a juego con su encabezado: en claro `--bg-card` es blanco puro
		   sobre una página casi blanca y la ficha de resumen dejaba de leerse como ficha. */
		background: var(--tint-ok);
		border-color: var(--tint-ok-line);
	}
	.leccion :global(.bloque.retener h2) {
		color: var(--accent-green-ink);
	}
	.leccion :global(.bloque.retener ul) {
		margin: 0;
		padding-left: 1.15rem;
		line-height: 1.85;
	}

	/* Pie de las calculadoras embebidas. */
	.leccion :global(.pie-calc) {
		margin: -1rem 0 2rem;
		font-size: 0.78rem;
		text-align: center;
		color: var(--text-muted);
	}

	/*
	 * Ritmo de lectura. Una lección de 900 palabras a una sola columna necesita que los
	 * encabezados respiren y que la medida no pase de unos 70 caracteres, o se lee como
	 * un documento y no como una lección.
	 */
	/*
	 * ⚠️ **La lección se leía más pequeña que un post del blog**, que va a `1.1rem/1.8`
	 * con `h2` a `1.6rem`. Siendo el contenido más trabajado del sitio, era la pieza
	 * con la tipografía más apretada — y buena parte de «se lee soso» era eso, no color.
	 */
	.leccion :global(.markdown-body) {
		font-size: 1.08rem;
		line-height: 1.78;
	}
	.leccion :global(.markdown-body h2) {
		margin: 3.25rem 0 1rem;
		font-size: clamp(1.4rem, 3vw, 1.55rem);
		font-weight: 750;
		line-height: 1.25;
		letter-spacing: -0.02em;
	}
	/*
	 * Los cinco que no tenían ninguna regla. El corpus no usa hoy `h3`, enlaces en el
	 * cuerpo, `hr` ni bloques de código, así que esto no cambia nada de lo que hay: es
	 * la red para el día que alguien los use. Sin ella, un enlace hereda el color del
	 * texto y sale **sin subrayar**, o sea indistinguible de la prosa; y un `hr` sale
	 * con el borde `inset` de 2 px del navegador.
	 *
	 * ⚠️ El enlace va en `--accent-blue-ink` (tinta) y no `--accent-blue` (marca): el
	 * segundo da 3,22 como texto, que es justo la migración que este repo tiene fichada
	 * por haber *bajado* el contraste en 33 sitios.
	 *
	 * ⚠️ Y un enlace en el cuerpo es **una parada de tabulación**: hoy hay cero, pero
	 * cuentan contra las 60 que `e2e/cursos-navegacion.spec.ts` da para llegar al
	 * ejercicio.
	 */
	.leccion :global(.markdown-body h3) {
		margin: 2.25rem 0 0.6rem;
		font-size: 1.18rem;
		font-weight: 700;
		line-height: 1.35;
		color: var(--text-primary);
	}
	.leccion :global(.markdown-body a) {
		color: var(--accent-blue-ink);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}
	.leccion :global(.markdown-body a:hover) {
		color: var(--text-primary);
		text-decoration-thickness: 2px;
	}
	.leccion :global(.markdown-body code) {
		padding: 0.12em 0.36em;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-card-hover);
		color: var(--text-primary);
		font-size: 0.9em;
	}
	.leccion :global(.markdown-body strong) {
		font-weight: 700;
		color: var(--text-primary);
	}
	.leccion :global(.markdown-body hr) {
		max-width: 68ch;
		height: 1px;
		margin: 3rem 0;
		border: 0;
		background: var(--border-subtle);
	}
	.leccion :global(.markdown-body p),
	.leccion :global(.markdown-body li) {
		max-width: 68ch;
	}
	/*
	 * ⚠️ **Sin esto los párrafos del cuerpo van pegados al siguiente**, y era la causa más
	 * literal de que una lección se leyera como un muro: el reset de Tailwind pone
	 * `margin: 0` en `p`, y aquí nunca se restauraba. Lo delator es que el bloque de aviso
	 * sí lo declara —con un comentario que dice exactamente «sin esto los párrafos salen
	 * pegados unos a otros»—, así que el defecto se arregló *dentro* del bloque y nadie
	 * miró fuera. Medido en el navegador sobre el build: `margin-top` y `margin-bottom` a
	 * 0 px en los seis párrafos del cuerpo, contra 16 px en los del aviso.
	 *
	 * ⚠️ Y van con `>`: los bloques de aviso y resumen viven dentro de `.markdown-body` y ya
	 * declaran su propio espaciado, así que sin el hijo directo estas reglas los pisarían
	 * por orden de aparición y habría que perseguir la diferencia en dos sitios.
	 */
	.leccion :global(.markdown-body > p) {
		margin: 0 0 1.15rem;
	}
	.leccion :global(.markdown-body > ul),
	.leccion :global(.markdown-body > ol) {
		margin: 0 0 1.15rem;
		padding-left: 1.2rem;
		list-style: disc;
	}
	.leccion :global(.markdown-body > ul li),
	.leccion :global(.markdown-body > ol li) {
		margin-bottom: 0.4rem;
	}
	.leccion :global(.markdown-body > ul li::marker) {
		color: var(--text-faint);
	}
	.leccion :global(.markdown-body table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.75rem 0;
		font-size: 0.9rem;
	}
	.leccion :global(.markdown-body th),
	.leccion :global(.markdown-body td) {
		padding: 0.6rem 0.7rem;
		border-bottom: 1px solid var(--border-subtle);
		text-align: left;
	}
	.leccion :global(.markdown-body thead th) {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}
	.leccion :global(.markdown-body blockquote) {
		margin: 1.75rem 0;
		padding: 0.2rem 0 0.2rem 1.2rem;
		border-left: 3px solid var(--accent-blue);
		font-size: 1.08rem;
		line-height: 1.6;
		color: var(--text-primary);
	}

	/*
	 * ⚠️ **El ejercicio sube de nivel: pide algo, no se mira.**
	 *
	 * La regla del área es que una pieza sube de nivel cuando **pide algo al lector**,
	 * no cuando es importante. Con ese criterio, azul = comprueba, ámbar = cuidado y
	 * verde = haz / retén. `.accion` iba sobre `--bg-card`, o sea al mismo nivel que
	 * una `Cifra`, cuando es —dice su propio comentario— «lo que separa un curso de
	 * siete artículos seguidos». Ahora lleva el verde que su eyebrow ya usaba.
	 */
	.accion {
		margin: 3.5rem 0 2rem;
		padding: 1.6rem 1.5rem;
		border: 1px solid var(--tint-ok-line);
		border-radius: 16px;
		background: var(--tint-ok);
	}
	.accion-eyebrow {
		margin: 0 0 0.6rem;
		font-size: var(--text-micro);
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-green-ink);
	}
	.accion-texto {
		margin: 0 0 1.1rem;
		/* Es la frase que se obedece: no puede ir al tamaño del cuerpo. */
		font-size: 1.08rem;
		line-height: 1.55;
		color: var(--text-primary);
	}
	.accion-cta {
		display: inline-block;
		padding: 0.7rem 1.15rem;
		border-radius: 12px;
		background: var(--accent-blue);
		color: var(--text-on-accent);
		font-weight: 700;
		font-size: 0.9rem;
		text-decoration: none;
	}

	.extras {
		margin: 2.5rem 0;
	}
	.extras h2 {
		font-size: 0.95rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin: 0 0 0.75rem;
	}
	.extras ul {
		margin: 0;
		padding-left: 1.1rem;
		line-height: 1.9;
	}
	/* Mismo motivo que la miga: 21 px medidos, y son enlaces que se pulsan con el dedo. */
	.extras li a {
		display: inline-block;
		padding: 0.6rem 0;
	}
	.fuentes {
		font-size: 0.85rem;
	}

	.vecinas {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin: 3rem 0 2rem;
	}
	/*
	 * Nivel objeto: tarjeta con fondo y sombra. Iba con borde y sin fondo, que era un
	 * cuarto nivel sin nombre. ⚠️ La sombra va en la regla **base** y no se anula en
	 * ninguna media query — es la inversa del defecto que este repo ya tiene fichado,
	 * sombras declaradas en base y puestas a `none` por encima de 1024 px, o sea
	 * invisibles justo donde se medía.
	 */
	.vecina {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 1rem 1.15rem;
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		background: var(--bg-card);
		box-shadow: var(--card-shadow);
		text-decoration: none;
		color: var(--text-primary);
		transition: border-color 0.18s ease, background 0.18s ease;
	}
	.vecina:hover {
		border-color: var(--border-strong);
		background: var(--bg-card-hover);
	}
	.vecina.siguiente {
		text-align: right;
	}
	.vecina-eyebrow {
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}
	.vecina-titulo {
		font-weight: 700;
		font-size: 0.9rem;
		line-height: 1.35;
	}

	.gratis {
		padding: 1.25rem 1.4rem;
		border: 1px dashed var(--border-subtle);
		border-radius: 14px;
		color: var(--text-muted);
		font-size: 0.85rem;
	}
	.gratis h2 {
		margin: 0 0 0.6rem;
		font-size: 0.9rem;
		color: var(--text-primary);
	}
	.gratis ul {
		margin: 0 0 0.7rem;
		padding-left: 1.1rem;
		line-height: 1.7;
	}
	.gratis p {
		margin: 0;
	}

	@media (max-width: 640px) {
		.cabecera {
			padding: 1.75rem 1.25rem;
		}
		/* El numeral encima del título: en 390 px una columna de cifra deja el titular
		   en un canal demasiado estrecho y parte palabras. */
		.titular {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.35rem;
		}
		/* La píldora de «gratis» deja de irse al extremo cuando la línea envuelve. */
		.paso-gratis {
			margin-left: 0;
		}

		.vecinas {
			grid-template-columns: 1fr;
		}
		.vecina.siguiente {
			text-align: left;
		}
	}
</style>
