/**
 * ⚠️ **`ssr = false` no es una preferencia de rendimiento: es la única forma de que
 * esto funcione.** La cartera viaja en el **fragmento** de la URL (`/sync#…`), y el
 * fragmento **no se envía al servidor**. En SSR ese dato no existe, así que la página
 * tiene que leerse en el cliente.
 *
 * Y eso es justo lo que hace que el traspaso sea privado: la cartera entera no pasa
 * por los registros de Vercel, que es lo que sí pasaría con una query.
 *
 * `prerender = false` por lo mismo — no hay nada que prerrenderizar, y prerrenderizarla
 * la metería en el sitemap.
 */
export const ssr = false;
export const prerender = false;
