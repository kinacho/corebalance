// El load vive compartido: las páginas con lectura relacionada usan el mismo.
// Es de servidor a propósito, para que el glob de los markdown no acabe en el
// bundle del cliente. Ver src/lib/seo/related-reading.server.ts.
export { load } from '$lib/seo/related-reading.server';
