/**
 * Registro de activos que NO existen en Yahoo Finance pero sí en Financial Times.
 * La clave es el ISIN del fondo, que también se usa como "ticker" interno en la app.
 *
 * Para añadir un nuevo fondo que Yahoo no encuentra:
 *   1. Averigua su ISIN en ft.com, morningstar.es, etc.
 *   2. Verifica que existe en https://markets.ft.com/data/funds/tearsheet/summary?s=<ISIN>:EUR
 *   3. Añade una nueva entrada aquí. El resto del sistema lo detectará automáticamente.
 */
export interface FtAssetEntry {
	/** Nombre largo del fondo para mostrar en la UI */
	name: string;
	/** Divisa de cotización */
	currency: string;
	/** Tipo de activo para el buscador */
	type: string;
	/** Alias de búsqueda (nombre del gestor, fondo, etc.) para el autocompletado */
	searchAliases: string[];
}

export const FT_ONLY_ASSETS: Record<string, FtAssetEntry> = {
	'IE00B2NXKW18': {
		name: 'Seilern World Growth EUR U R',
		currency: 'EUR',
		type: 'Fondo',
		searchAliases: ['seilern', 'world growth']
	}
	// Ejemplo para añadir otro fondo en el futuro:
	// 'LU0552385295': {
	//   name: 'Fundsmith Equity Fund T EUR Acc',
	//   currency: 'EUR',
	//   type: 'Fondo',
	//   searchAliases: ['fundsmith', 'fundsmith equity']
	// }
};

/** Comprueba si un ISIN está registrado como activo exclusivo de FT */
export function isFtOnlyAsset(isin: string): boolean {
	return isin.toUpperCase() in FT_ONLY_ASSETS;
}

/**
 * Devuelve los activos FT-only que coinciden con una query de búsqueda.
 *
 * ⚠️ Coincide por **principio de palabra, y con todos los términos**, no por
 * subcadena suelta. La comparación va en el sentido contrario al que uno espera —no
 * es que la consulta contenga el nombre del fondo, es que el nombre lo contenga a
 * él—, así que con `includes()` buscar `ow` casaba con «Gr**ow**th» y colaba un
 * fondo boutique en una búsqueda que no tenía nada que ver. Exigir todos los
 * términos es lo que además permite que el alias declarado «world growth» funcione
 * como alias y que «seilern» seguido de otra cosa deje de casar.
 *
 * El ISIN se compara por prefijo, que es como se teclea o se pega desde un extracto.
 */
export function searchFtAssets(query: string): Array<{ isin: string } & FtAssetEntry> {
	const terminos = query
		.toLowerCase()
		.split(/[^a-z0-9]+/i)
		.filter(Boolean);
	if (terminos.length === 0) return [];

	return Object.entries(FT_ONLY_ASSETS)
		.filter(([isin, entry]) => {
			// El ISIN por prefijo tiene la última palabra: es una señal inequívoca.
			if (isin.toLowerCase().startsWith(terminos.join(''))) return true;

			const palabras = [entry.name, ...entry.searchAliases]
				.join(' ')
				.toLowerCase()
				.split(/[^a-z0-9]+/i)
				.filter(Boolean);

			return terminos.every((t) => palabras.some((p) => p.startsWith(t)));
		})
		.map(([isin, entry]) => ({ isin, ...entry }));
}
