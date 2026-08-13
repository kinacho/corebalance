/**
 * Lector de frontmatter para los scripts de `prebuild`.
 *
 * Deliberadamente minúsculo y sin dependencia de YAML: los scripts corren en Node antes
 * de que Vite lea `static/`, y lo único que necesitan del frontmatter son escalares de una
 * línea (`titulo`, `descripcion`, `orden`). No baja a listas ni a objetos anidados —
 * `accion:`, `lecturas:` y `fuentes:` de una lección quedan fuera a propósito.
 *
 * ⚠️ **Vivía duplicado byte a byte en `generate-og.mjs` y en `generate-llms.mjs`.** Se
 * saca aquí al añadir un tercer consumidor (`cursos.mjs`), porque la tercera copia es
 * donde esta clase de función empieza a divergir: el repo ya tiene documentado ese patrón
 * con `ft-assets.ts`, que estuvo implementado cuatro veces a mano y estaba mal justo en la
 * copia que importaba.
 */

/**
 * Devuelve los campos escalares del frontmatter de un markdown.
 * @param {string} raw Contenido completo del fichero.
 * @returns {Record<string, string>} Campos leídos, sin comillas envolventes.
 */
export function readFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	/** @type {Record<string, string>} */
	const fields = {};
	for (const line of match[1].split(/\r?\n/)) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (!kv) continue;
		let value = kv[2].trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		fields[kv[1]] = value;
	}
	return fields;
}
