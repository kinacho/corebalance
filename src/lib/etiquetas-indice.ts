import type { TranslationFunctions } from './i18n/i18n-types';

/**
 * Los rótulos de las nueve regiones y los once sectores del dataset.
 *
 * Vivían dentro de `LookThroughMap.svelte` y salieron aquí en cuanto hizo falta
 * el segundo consumidor —la ficha del activo—, que es el momento exacto en que
 * este repo saca las cosas de un componente. Tenerlos escritos dos veces es la
 * forma de defecto que más veces se ha pagado aquí: una copia se arregla y la
 * otra no.
 *
 * ⚠️ **Se construyen como objetos y no como un `switch` con `default`**, y eso es
 * deliberado: el día que aparezca una clave nueva en `indices.json`, el test de
 * integridad del dataset la caza antes de que salga en pantalla como texto crudo.
 * Un `default` que devuelve la clave la dejaría pasar sin que nadie se entere.
 *
 * Reciben `LL` en lugar de importarlo para que sean funciones puras y probables
 * sin montar un componente.
 */

export function etiquetasDeRegion(LL: TranslationFunctions): Record<string, string> {
	return {
		us: LL.lookthrough.region_us(),
		canada: LL.lookthrough.region_canada(),
		eurozone: LL.lookthrough.region_eurozone(),
		uk: LL.lookthrough.region_uk(),
		europe_other: LL.lookthrough.region_europe_other(),
		japan: LL.lookthrough.region_japan(),
		pacific_ex_japan: LL.lookthrough.region_pacific_ex_japan(),
		emerging_asia: LL.lookthrough.region_emerging_asia(),
		emerging_other: LL.lookthrough.region_emerging_other()
	};
}

export function etiquetasDeSector(LL: TranslationFunctions): Record<string, string> {
	return {
		tech: LL.lookthrough.sector_tech(),
		financials: LL.lookthrough.sector_financials(),
		healthcare: LL.lookthrough.sector_healthcare(),
		consumer_disc: LL.lookthrough.sector_consumer_disc(),
		industrials: LL.lookthrough.sector_industrials(),
		communication: LL.lookthrough.sector_communication(),
		consumer_staples: LL.lookthrough.sector_consumer_staples(),
		energy: LL.lookthrough.sector_energy(),
		materials: LL.lookthrough.sector_materials(),
		utilities: LL.lookthrough.sector_utilities(),
		real_estate: LL.lookthrough.sector_real_estate()
	};
}
