<script lang="ts">
	import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { absoluteUrl } from '$lib/i18n/routing';
	import { compararAcumulacionDistribucion } from '$lib/acumulacion-vs-distribucion';

	/**
	 * ⚠️ Solo en español, y fuera del árbol `[[lang=locale]]`.
	 *
	 * La escala del ahorro que aplica esto es española: un `/en/` de esta calculadora
	 * sería una página fina sobre una ley que no aplica a quien la lee en inglés — el
	 * mismo tipo de página que Search Console reportó como *soft 404* en agosto. Vive
	 * fuera del árbol bilingüe igual que los posts del blog, así que no entra en
	 * `BILINGUAL_ROUTES` ni emite `hreflang`.
	 */

	let capital = $state(50_000);
	let anios = $state(20);
	let rentabilidad = $state(7);
	let dividendo = $state(2);

	const r = $derived(
		compararAcumulacionDistribucion({
			capital,
			anios,
			rentabilidad: rentabilidad / 100,
			dividendo: dividendo / 100
		})
	);

	const eur = (n: number) =>
		n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Calculadora de acumulación vs distribución',
		applicationCategory: 'FinanceApplication',
		operatingSystem: 'Web',
		url: absoluteUrl('/herramientas/acumulacion-vs-distribucion'),
		inLanguage: 'es',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' }
	};
</script>

<SeoHead
	title="Calculadora: acumulación vs distribución | CoreBalance"
	description="Calcula gratis cuánto te cuesta cobrar los dividendos en vez de acumularlos, con la escala del ahorro española. Sin registro."
	path="/herramientas/acumulacion-vs-distribucion"
	lang="es"
	bilingual={false}
	{jsonLd}
/>

<LandingNavBar />

<main class="tool">
	<header>
		<p class="eyebrow">Herramienta gratuita</p>
		<h1>¿Cuánto te cuesta cobrar los dividendos?</h1>
		<p class="intro">
			Un fondo de acumulación no evita el impuesto: lo aplaza. Y lo aplazado sigue componiendo.
			Esto calcula cuánto vale ese aplazamiento con tus cifras, aplicando la escala del ahorro
			de {r.anioFiscal}.
		</p>
	</header>

	<section class="campos">
		<label>
			<span>Capital invertido</span>
			<input type="number" bind:value={capital} min="0" step="1000" />
		</label>
		<label>
			<span>Años invertido</span>
			<input type="number" bind:value={anios} min="0" max="60" step="1" />
		</label>
		<label>
			<span>Rentabilidad anual total (%)</span>
			<input type="number" bind:value={rentabilidad} min="-20" max="20" step="0.1" />
		</label>
		<label>
			<span>De la cual, dividendo (%)</span>
			<input type="number" bind:value={dividendo} min="0" max={Math.max(0, rentabilidad)} step="0.1" />
		</label>
	</section>

	<section class="resultado">
		<div class="tarjeta destacada">
			<p class="etiqueta">Ventaja de acumular</p>
			<p class="cifra">{eur(r.diferencia)}</p>
			<p class="pie">
				{(r.diferenciaPct * 100).toFixed(1)} % más en el bolsillo, después de vender y pagar.
			</p>
		</div>

		<table>
			<thead>
				<tr><th></th><th>Acumulación</th><th>Distribución</th></tr>
			</thead>
			<tbody>
				<tr>
					<th scope="row">Valor a los {anios} años</th>
					<td>{eur(r.acumulacion.valorFinal)}</td>
					<td>{eur(r.distribucion.valorFinal)}</td>
				</tr>
				<tr>
					<th scope="row">Impuestos por el camino</th>
					<td>{eur(r.acumulacion.impuestoPorDividendos)}</td>
					<td>{eur(r.distribucion.impuestoPorDividendos)}</td>
				</tr>
				<tr>
					<th scope="row">Impuestos al vender</th>
					<td>{eur(r.acumulacion.impuestoAlVender)}</td>
					<td>{eur(r.distribucion.impuestoAlVender)}</td>
				</tr>
				<tr class="total">
					<th scope="row">Neto final</th>
					<td>{eur(r.acumulacion.neto)}</td>
					<td>{eur(r.distribucion.neto)}</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section class="letra">
		<h2>Qué hace y qué no hace este cálculo</h2>
		<ul>
			<li>
				Aplica la escala progresiva del ahorro de {r.anioFiscal} año a año, no un tipo fijo: un
				dividendo de 300 € y otro de 30.000 € no pagan lo mismo.
			</li>
			<li>
				Supone que <strong>reinviertes el dividendo neto</strong>. Si te lo gastas, no hay
				comparación posible: son dos cosas distintas.
			</li>
			<li>
				Cuenta que el dividendo reinvertido <strong>sube tu base de coste</strong> y por tanto no
				vuelve a tributar al vender. Olvidarlo es el error habitual, y exagera la ventaja de
				acumular.
			</li>
			<li>
				<strong>No</strong> modela las retenciones que soporta el propio fondo sobre los
				dividendos que cobra: las pagan las dos versiones por igual y viven en la <em
					>tracking difference</em
				>, no en tu declaración.
			</li>
			<li>Es una estimación, no asesoramiento fiscal.</li>
		</ul>
	</section>

	<section class="siguiente">
		<p>
			Esta calculadora es el ejercicio de la lección 5 del curso gratuito
			<a href="/cursos/de-cero-a-tu-primera-aportacion">De cero a tu primera aportación</a>. Si
			quieres el razonamiento completo, empieza por ahí. Y si prefieres el detalle del producto,
			está en <a href="/blog/msci-world-acc-vs-dist">MSCI World Acc vs Dist</a>.
		</p>
	</section>
</main>

<LandingFooter />

<style>
	.tool {
		max-width: 820px;
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
		font-size: clamp(1.9rem, 5vw, 2.8rem);
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
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	label span {
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}
	input {
		padding: 0.7rem 0.85rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: var(--bg-card);
		color: var(--text-primary);
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}
	.destacada {
		padding: 1.5rem;
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-card);
		margin-bottom: 1.5rem;
	}
	.etiqueta {
		margin: 0 0 0.4rem;
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}
	.cifra {
		margin: 0 0 0.4rem;
		font-size: clamp(2rem, 6vw, 2.8rem);
		font-weight: 800;
		color: var(--accent-green-ink);
		font-variant-numeric: tabular-nums;
	}
	.pie {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.9rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		padding: 0.7rem 0.5rem;
		text-align: right;
		border-bottom: 1px solid var(--border-subtle);
		font-size: 0.9rem;
	}
	thead th,
	tbody th {
		text-align: left;
		color: var(--text-muted);
		font-weight: 600;
	}
	thead th:not(:first-child) {
		text-align: right;
		color: var(--text-primary);
		font-weight: 700;
	}
	tr.total th,
	tr.total td {
		font-weight: 800;
		color: var(--text-primary);
		border-bottom: none;
	}
	.letra,
	.siguiente {
		margin-top: 2.5rem;
		font-size: 0.88rem;
		color: var(--text-muted);
		line-height: 1.7;
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
	a {
		color: var(--accent-blue-ink);
	}
</style>
