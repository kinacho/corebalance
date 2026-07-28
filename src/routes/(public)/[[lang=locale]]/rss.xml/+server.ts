import { getPosts, postOgImage } from '$lib/blog';
import { DEFAULT_LOCALE, SITE_URL, absoluteUrl, localizePath } from '$lib/i18n/routing';
import type { Locales } from '$lib/i18n/i18n-types';
import type { RequestHandler } from './$types';

export const prerender = true;

const CHANNEL = {
	es: {
		title: 'Blog de CoreBalance',
		description:
			'Guías y análisis sobre inversión pasiva, fondos indexados, ETFs y rebalanceo de carteras.'
	},
	en: {
		title: 'CoreBalance Blog',
		description:
			'Guides and analysis on passive investing, index funds, ETFs and portfolio rebalancing.'
	}
} as const;

/** Escapa los caracteres que romperían el XML. */
function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export const GET: RequestHandler = async ({ params }) => {
	const lang = ((params as { lang?: string }).lang as Locales | undefined) ?? DEFAULT_LOCALE;
	const channel = CHANNEL[lang];
	const posts = getPosts(lang);

	const feedUrl = absoluteUrl(localizePath('/', lang).replace(/\/$/, '') + '/rss.xml');
	const blogUrl = absoluteUrl(localizePath('/blog', lang));

	const lastBuildDate = posts.length
		? new Date(posts[0].updatedDate || posts[0].publishDate).toUTCString()
		: undefined;

	const items = posts
		.map((post) => {
			const url = absoluteUrl(`/blog/${post.slug}`);
			return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.publishDate).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(post.author)}</dc:creator>
${(post.tags ?? []).map((tag) => `      <category>${escapeXml(tag)}</category>`).join('\n')}
      <enclosure url="${SITE_URL}${postOgImage(post)}" type="image/png" length="0"/>
    </item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${blogUrl}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${lang}</language>
${lastBuildDate ? `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n` : ''}    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'max-age=3600'
		}
	});
};
