<script lang="ts">
	import type { ReadingItem } from '$lib/seo/related-reading';
	import type { Locales } from '$lib/i18n/i18n-types';

	/**
	 * Bloque de lectura relacionada para las comparativas y las herramientas.
	 *
	 * Enlaza hacia los artículos, que es la dirección que faltaba: estas páginas son
	 * las que concentran autoridad y no repartían nada hacia el blog.
	 */
	let { items = [], lang = 'es' }: { items?: ReadingItem[]; lang?: Locales } = $props();

	const isEs = $derived(lang === 'es');
	const t = $derived(
		isEs
			? { title: 'Para profundizar', subtitle: 'Guías del blog sobre lo que acabas de leer' }
			: { title: 'Go deeper', subtitle: 'Blog guides on what you have just read' }
	);

	const readTime = (min?: number) =>
		isEs ? `${min ?? 3} min de lectura` : `${min ?? 3} min read`;
</script>

{#if items.length > 0}
	<section class="related-reading" aria-labelledby="related-reading-heading">
		<h2 id="related-reading-heading">{t.title}</h2>
		<p class="subtitle">{t.subtitle}</p>
		<ul>
			{#each items as item}
				<li>
					<a href={`/blog/${item.slug}`}>
						<span class="item-title">{item.title}</span>
						<span class="item-desc">{item.description}</span>
						<span class="item-meta">{readTime(item.readingMinutes)}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.related-reading {
		max-width: 900px;
		margin: 0 auto 4rem;
		padding: 0 1.5rem;
	}

	h2 {
		font-size: 1.4rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin: 0 0 0.35rem;
	}

	.subtitle {
		color: var(--text-muted);
		font-size: 0.92rem;
		margin: 0 0 1.5rem;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1rem;
	}

	a {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		height: 100%;
		padding: 1.25rem;
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-card);
		text-decoration: none;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	a:hover {
		transform: translateY(-3px);
		border-color: rgba(59, 130, 246, 0.28);
		background: var(--bg-card);
	}

	.item-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.4;
	}

	.item-desc {
		font-size: 0.85rem;
		line-height: 1.55;
		color: var(--text-muted);
		flex-grow: 1;
	}

	.item-meta {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--accent-blue-ink);
	}
</style>
