<script lang="ts">
	import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { absoluteUrl } from '$lib/i18n/routing';
	import { consultarAntiaplicacion, type TipoAntiaplicacion } from '$lib/antiaplicacion';

	/** Española por la misma razón que la otra: la regla que aplica es del IRPF. */

	let tipo = $state<TipoAntiaplicacion>('fondo');
	let fechaVenta = $state('');
	let fechaRecompra = $state('');

	const r = $derived(consultarAntiaplicacion({ tipo, fechaVenta, fechaRecompra }));

	const fecha = (iso: string) =>
		new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: '¿Cuándo puedo recomprar sin perder la compensación?',
		applicationCategory: 'FinanceApplication',
		operatingSystem: 'Web',
		url: absoluteUrl('/herramientas/cuando-puedo-recomprar'),
		inLanguage: 'es',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' }
	};
</script>

<SeoHead
	title="¿Cuándo puedo recomprar tras vender con pérdidas?"
	description="Calcula gratis la regla de antiaplicación del IRPF: 2 meses para ETFs y acciones, 12 para participaciones de fondos. Con la fecha exacta a partir de la cual puedes recomprar."
	path="/herramientas/cuando-puedo-recomprar"
	lang="es"
	bilingual={false}
	{jsonLd}
/>

<LandingNavBar />

<main class="tool">
	<header>
		<p class="eyebrow">Herramienta gratuita</p>
		<h1>Vendiste con pérdidas. ¿Cuándo puedes recomprar?</h1>
		<p class="intro">
			Si recompras algo homogéneo demasiado pronto, esa pérdida <strong>no se integra</strong> en la
			base de este ejercicio. La ventana no es la misma para un fondo que para un ETF, y ahí está
			el error más repetido de internet.
		</p>
	</header>

	<section class="campos">
		<fieldset>
			<legend>Qué vendiste</legend>
			<label class="radio">
				<input type="radio" bind:group={tipo} value="fondo" />
				<span>Participaciones de un fondo de inversión</span>
			</label>
			<label class="radio">
				<input type="radio" bind:group={tipo} value="etf" />
				<span>Un ETF o acciones</span>
			</label>
		</fieldset>

		<label>
			<span>Fecha de la venta con pérdidas</span>
			<input type="date" bind:value={fechaVenta} />
		</label>
		<label>
			<span>Recompra que estás considerando (opcional)</span>
			<input type="date" bind:value={fechaRecompra} />
		</label>
	</section>

	{#if !r}
		<p class="espera">Pon la fecha de la venta para ver la respuesta.</p>
	{:else}
		<section class="resultado" class:mal={r.bloqueada}>
			<p class="etiqueta">Ventana de antiaplicación: {r.ventanaMeses} meses</p>
			<p class="cifra">{fecha(r.seguroDesde)}</p>
			<p class="pie">
				A partir de esa fecha puedes recomprar sin que la pérdida quede bloqueada. Son
				{r.diasDeEspera} días desde la venta.
			</p>

			{#if r.conRecompra}
				<p class="veredicto">
					{#if r.bloqueada}
						⚠️ Con esa recompra, la pérdida <strong>queda bloqueada</strong> en este ejercicio.
					{:else}
						Con esa recompra, la pérdida <strong>sí se puede compensar</strong>.
					{/if}
				</p>
			{/if}
		</section>
	{/if}

	<section class="letra">
		<h2>Las tres cosas que casi nadie dice</h2>
		<ul>
			<li>
				<strong>Un fondo son 12 meses, no 2.</strong> Los dos meses son para valores admitidos a
				negociación (art. 33.5.f LIRPF). Las participaciones de un fondo no cotizan: se
				suscriben y reembolsan con la gestora, así que caen en la letra g) y la ventana es de un
				año. Hay guías que aplican dos meses a todo, y es el error cómodo.
			</li>
			<li>
				<strong>La pérdida no se pierde: se difiere.</strong> Se declara igual en el ejercicio en
				que se generó; lo que no hace es integrarse en la base de ese año. Se integrará cuando
				transmitas definitivamente lo recomprado.
			</li>
			<li>
				<strong>La ventana mira hacia los dos lados.</strong> Comprar <em>antes</em> de vender
				bloquea exactamente igual que comprar después. Es el caso que se da al rebalancear, y el
				que nadie contempla.
			</li>
			<li>Es una estimación, no asesoramiento fiscal. Los artículos citados son comprobables.</li>
		</ul>
	</section>

	<section class="siguiente">
		<p>
			Esta calculadora es el ejercicio de la lección 5 del curso gratuito
			<a href="/cursos/mueve-tu-dinero-sin-pagar-de-mas">Mueve tu dinero sin pagar de más</a>. Y si
			lo que quieres es no llegar a vender, mira
			<a href="/blog/rebalancear-sin-pagar-impuestos-espana">
				cómo rebalancear sin pagar impuestos en España</a
			>.
		</p>
	</section>
</main>

<LandingFooter />

<style>
	.tool {
		max-width: 800px;
		margin: 0 auto;
		padding: 5.5rem 1.25rem 4rem;
	}
	.eyebrow {
		margin: 0 0 0.8rem;
		font-size: var(--text-micro);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-green-ink);
	}
	h1 {
		margin: 0 0 1rem;
		font-size: clamp(1.9rem, 5vw, 2.7rem);
		line-height: 1.12;
		color: var(--text-primary);
	}
	.intro {
		margin: 0 0 2.5rem;
		max-width: 62ch;
		line-height: 1.65;
		color: var(--text-muted);
	}
	.campos {
		display: grid;
		gap: 1.25rem;
		margin-bottom: 2rem;
	}
	fieldset {
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 1rem 1.15rem;
		display: grid;
		gap: 0.6rem;
	}
	legend {
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		padding: 0 0.4rem;
	}
	.radio {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
	}
	.radio span {
		font-size: 0.92rem;
		color: var(--text-primary);
		text-transform: none;
		letter-spacing: 0;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	label > span {
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}
	input[type='date'] {
		padding: 0.7rem 0.85rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: var(--bg-card);
		color: var(--text-primary);
		font-size: 1rem;
		max-width: 260px;
	}
	.espera {
		color: var(--text-muted);
		font-size: 0.9rem;
	}
	.resultado {
		padding: 1.5rem;
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-card);
	}
	.etiqueta {
		margin: 0 0 0.4rem;
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}
	.cifra {
		margin: 0 0 0.5rem;
		font-size: clamp(1.6rem, 4.5vw, 2.2rem);
		font-weight: 800;
		color: var(--accent-green-ink);
	}
	.resultado.mal .cifra {
		color: var(--accent-orange-ink);
	}
	.pie {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.9rem;
		line-height: 1.6;
	}
	.veredicto {
		margin: 1rem 0 0;
		padding-top: 1rem;
		border-top: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 0.95rem;
	}
	.letra,
	.siguiente {
		margin-top: 2.5rem;
		font-size: 0.88rem;
		color: var(--text-muted);
		line-height: 1.75;
	}
	.letra h2 {
		font-size: 0.95rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0 0 0.75rem;
	}
	.letra ul {
		margin: 0;
		padding-left: 1.1rem;
	}
	.letra li + li {
		margin-top: 0.6rem;
	}
	a {
		color: var(--accent-blue-ink);
	}
</style>
