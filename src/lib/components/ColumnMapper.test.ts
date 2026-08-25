import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { analyzeColumns, suggestMappingFromAnalysis } from '$lib/importers/csv-utils';
import ColumnMapper from './ColumnMapper.svelte';

loadLocale('es');
setLocale('es');

/**
 * ⚠️ **El mapeo de columnas se sugería desde un `$effect` que se leía a sí mismo,
 * y por eso el usuario no podía desasignar una columna.**
 *
 * `mapping.*` era dependencia y destino del mismo efecto
 * (`if (mapping.isin === -1) mapping.isin = …`), y `-1` no es un estado
 * transitorio: es una **opción elegible** en los ocho desplegables. Elegir «No
 * disponible» en un campo con sugerencia auto-disparaba el efecto, que veía
 * `=== -1` y volvía a meter la sugerencia. El desplegable rebotaba solo.
 *
 * Es el importador, o sea la vía por la que entra la mayoría de las carteras
 * reales, y es la misma familia del defecto del formulario del libro: estado que
 * el usuario ha escrito, pisado por un efecto sin que cambiara nada relevante.
 */

/** CSV con cabeceras que el analizador reconoce, para que haya sugerencia que pisar. */
const HEADERS = ['ISIN', 'Producto', 'Cantidad', 'Precio', 'Divisa'];
const ROWS = [
	['IE00B4L5Y983', 'iShares Core MSCI World', '12', '104.18', 'EUR'],
	['IE00B3RBWM25', 'Vanguard FTSE All-World', '25', '118.40', 'EUR']
];

const PROPS = {
	headers: HEADERS,
	rows: ROWS,
	onConfirm: () => {},
	onBack: () => {}
};

describe('ColumnMapper.svelte', () => {
	/*
	 * Guarda del fixture: si el analizador dejara de sugerir el ISIN, la prueba de
	 * abajo pasaría sin poder fallar —no habría nada que rebotara—. Que el fixture
	 * sirve para lo que se escribió se comprueba, no se supone.
	 */
	it('el fixture tiene sugerencia para el ISIN, que es lo que la prueba necesita', () => {
		const sugerencia = suggestMappingFromAnalysis(analyzeColumns(HEADERS, ROWS));
		expect(sugerencia.isin).toBe(0);
	});

	it('deja desasignar una columna que el analizador había sugerido', async () => {
		const { container } = render(ColumnMapper, { props: PROPS });

		const isin = container.querySelector('#col-isin') as HTMLSelectElement;
		// Arranca con la sugerencia puesta: la columna 0.
		expect(isin.value).toBe('0');

		await fireEvent.change(isin, { target: { value: '-1' } });

		// Y se queda ahí. Con el efecto antiguo volvía a '0' él solo.
		expect(isin.value).toBe('-1');
	});

	it('respeta el mapeo guardado por encima de la sugerencia', () => {
		const { container } = render(ColumnMapper, {
			props: { ...PROPS, initialMapping: { isin: 3 } }
		});

		expect((container.querySelector('#col-isin') as HTMLSelectElement).value).toBe('3');
	});
});
