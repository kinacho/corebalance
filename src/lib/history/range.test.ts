import { describe, it, expect } from 'vitest';
import { clipNoticeFor, rangeStartDate } from './range';

/**
 * Fecha fija, como todo en esta suite: los rangos son aritmética de fechas y un test
 * contra el reloj real pasa hoy y falla en enero — que es justo cuando `YTD` importa.
 */
const HOY = new Date('2026-08-10T12:00:00Z');

describe('rangeStartDate', () => {
	/**
	 * Un rango de N días es **hoy y los N−1 anteriores**, igual que el `slice` de los
	 * últimos N puntos que dibuja el gráfico. Si aquí se restaran N días completos, la
	 * fecha pedida caería un día por detrás del primer punto de una ventana llena y «1M»
	 * avisaría siempre de estar recortado.
	 */
	it('resuelve los rangos de días contando hacia atrás, hoy incluido', () => {
		expect(rangeStartDate('1M', HOY)).toBe('2026-07-12');
		expect(rangeStartDate('3M', HOY)).toBe('2026-05-13');
		expect(rangeStartDate('1Y', HOY)).toBe('2025-08-11');
	});

	it('resuelve YTD por fecha y no por número de días', () => {
		expect(rangeStartDate('YTD', HOY)).toBe('2026-01-01');
		// En enero YTD son días, no un año: es lo que lo distingue de «1A».
		expect(rangeStartDate('YTD', new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-01');
	});

	it('«Todo» no tiene fecha de inicio', () => {
		expect(rangeStartDate('ALL', HOY)).toBeNull();
	});
});

describe('clipNoticeFor', () => {
	/** La ventana reconstruible: 30 días hasta hoy. */
	const PRIMER_DIA = '2026-07-12';

	it('no avisa de nada cuando el rango cabe entero', () => {
		expect(
			clipNoticeFor({ range: '1M', firstShownDate: PRIMER_DIA, oldestKnownDate: PRIMER_DIA, today: HOY })
		).toBeNull();
	});

	/**
	 * ⚠️ El defecto que motivó extraer esto: `ALL` e `YTD` tienen `days: null`, y el
	 * predicado anterior (`days !== null && points.length < days`) se los saltaba, así que
	 * **el rango por defecto enseñaba 30 días llamándolos «Todo» sin decir una palabra**,
	 * aunque hubiera años de snapshots guardados.
	 */
	it('avisa en «Todo» cuando hay historial anterior que no se puede reconstruir', () => {
		expect(
			clipNoticeFor({
				range: 'ALL',
				firstShownDate: PRIMER_DIA,
				oldestKnownDate: '2024-01-15',
				today: HOY
			})
		).toBe('capped');
	});

	it('en «Todo» no avisa si no hay nada anterior: entonces sí es todo', () => {
		expect(
			clipNoticeFor({
				range: 'ALL',
				firstShownDate: PRIMER_DIA,
				oldestKnownDate: PRIMER_DIA,
				today: HOY
			})
		).toBeNull();
	});

	it('avisa en YTD, que antes tampoco decía nada', () => {
		expect(
			clipNoticeFor({ range: 'YTD', firstShownDate: PRIMER_DIA, oldestKnownDate: null, today: HOY })
		).toBe('short');
	});

	/**
	 * Los dos avisos no son intercambiables: `short` afirma que no hay más datos, y eso es
	 * falso cuando existen snapshots anteriores. Distinguirlos es media reparación.
	 */
	it('distingue «no llevas tanto tiempo» de «hay historial que no cabe»', () => {
		const sinHistorial = clipNoticeFor({
			range: '1Y',
			firstShownDate: PRIMER_DIA,
			oldestKnownDate: null,
			today: HOY
		});
		const conHistorial = clipNoticeFor({
			range: '1Y',
			firstShownDate: PRIMER_DIA,
			oldestKnownDate: '2023-05-01',
			today: HOY
		});

		expect(sinHistorial).toBe('short');
		expect(conHistorial).toBe('capped');
	});

	it('sin puntos no hay nada que advertir', () => {
		expect(
			clipNoticeFor({ range: 'ALL', firstShownDate: null, oldestKnownDate: '2024-01-01', today: HOY })
		).toBeNull();
	});

	/**
	 * Un snapshot del mismo día que el primer punto no es historial anterior. El `<` es
	 * estricto a propósito: con `<=` cualquier cartera con un snapshot de hoy avisaría
	 * siempre, que es la clase de aviso permanente que este repo ya aprendió a no emitir.
	 */
	it('un snapshot del mismo primer día no cuenta como anterior', () => {
		expect(
			clipNoticeFor({
				range: 'ALL',
				firstShownDate: PRIMER_DIA,
				oldestKnownDate: PRIMER_DIA,
				today: HOY
			})
		).toBeNull();
	});
});
