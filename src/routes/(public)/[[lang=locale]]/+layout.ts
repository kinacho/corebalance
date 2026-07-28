import type { LayoutLoad } from './$types';
import type { Locales } from '$lib/i18n/i18n-types';
import { DEFAULT_LOCALE } from '$lib/i18n/routing';

/**
 * Todo lo público es contenido estático: se prerenderiza una copia por idioma
 * (`/` en español, `/en` en inglés) para que Googlebot —que rastrea sin cookies
 * y normalmente sin Accept-Language— vea HTML servido en el idioma de la URL.
 */
export const prerender = true;

/**
 * El idioma sale del prefijo de la URL, pero **no se aplica aquí**: quien lo
 * aplica es el layout raíz, a partir de lo que ya resolvió `hooks.server.ts`
 * (que para estas rutas usa exactamente el mismo criterio: la URL).
 *
 * Este load sólo lo expone en `data` para que los componentes puedan leer
 * `$page.data.locale` sin depender del store global. Tener un único escritor es
 * lo que evita que la página quede a medio traducir.
 */
export const load: LayoutLoad = async ({ params }) => {
	const locale = ((params as { lang?: string }).lang as Locales | undefined) ?? DEFAULT_LOCALE;

	return { locale };
};
