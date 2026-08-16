import { describe, it, expect } from 'vitest';
import { clipNoticeFor, isRangeRedundant, rangeStartDate, type RangeId } from './range';

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

/**
 * Los rangos que no pueden enseñar nada distinto de «Todo».
 *
 * ⚠️ **Esta función nació de una queja de uso, no de un cálculo mal hecho**: *«le doy
 * a 1M, 3M, YTD y a veces no hay reacción»*. Medido en el navegador con historial
 * parcial, la cola de rangos colapsa siempre en la misma vista, y el aviso no lo
 * tapaba porque `ALL` no avisa nunca por diseño. Los casos de abajo son las
 * profundidades que se midieron, con los rangos que allí resultaron sinónimos.
 */
describe('isRangeRedundant', () => {
	const TODOS: RangeId[] = ['1M', '3M', 'YTD', '1Y', 'ALL'];

	/** Los rangos apagados con un historial que empieza en `primerDia`. */
	const apagados = (primerDia: string, oldestKnownDate: string | null = null) =>
		TODOS.filter((range) =>
			isRangeRedundant({ range, firstShownDate: primerDia, oldestKnownDate, today: HOY })
		);

	// HOY es 2026-08-10. 45 días atrás ≈ 2026-06-26: sobrepasan 3M, YTD y 1A.
	it('con ~45 días de historial sobran tres de los cinco botones', () => {
		expect(apagados('2026-06-26')).toEqual(['3M', 'YTD', '1Y']);
	});

	/**
	 * ⚠️ **Estar dentro del año en curso no salva a `YTD`.** Con el primer día en
	 * enero, `YTD` arranca el 1 de enero —antes— así que enseña todo lo que hay, o
	 * sea lo mismo que «Todo», y se apaga. La primera versión de este caso esperaba
	 * lo contrario por confundir «hay datos de este año» con «el año cabe entero».
	 */
	it('con el historial empezando en enero, YTD también sobra', () => {
		expect(apagados('2026-01-22')).toEqual(['YTD', '1Y']);
	});

	// Primer día en noviembre del año anterior: YTD (1-ene) sí queda por detrás.
	it('cruzando el fin de año, YTD se salva y solo sobra «1A»', () => {
		expect(apagados('2025-11-01')).toEqual(['1Y']);
	});

	it('con más de un año no sobra ninguno', () => {
		expect(apagados('2024-03-01')).toEqual([]);
	});

	/**
	 * ⚠️ **`ALL` no se apaga jamás, y sin esto la interfaz se queda sin salida.** Es el
	 * rango al que caen los demás cuando son redundantes; apagarlo dejaría los cinco
	 * botones muertos justo en la cartera más nueva, que es donde más se nota.
	 */
	it('«Todo» nunca es redundante, ni con un solo día de historial', () => {
		expect(
			isRangeRedundant({
				range: 'ALL',
				firstShownDate: '2026-08-10',
				oldestKnownDate: null,
				today: HOY
			})
		).toBe(false);
		expect(apagados('2026-08-10')).not.toContain('ALL');
	});

	/**
	 * ⚠️ **`capped` se queda encendido, y es la distinción que da sentido a todo esto.**
	 * Ahí sí hay historial más viejo que la reconstrucción no alcanza: el botón no es
	 * redundante, es que no llega — y apagarlo escondería un mensaje distinto. Mismo
	 * primer día que el primer caso, y el resultado se invierte solo por existir un
	 * snapshot anterior.
	 */
	it('un rango recortado por falta de reconstrucción NO se apaga', () => {
		expect(apagados('2026-06-26', '2023-05-01')).toEqual([]);
	});

	/**
	 * ⚠️ **El borde que separa esta función de `clipNoticeFor`, y el caso corriente.**
	 * Sin libro de operaciones la ventana son 30 días clavados y `1M` pide 30: no
	 * falta ningún día —así que no hay nada que advertir— pero dibuja exactamente lo
	 * mismo que «Todo». La primera versión delegaba en `clipNoticeFor` y dejaba este
	 * botón encendido y muerto; lo cazó el e2e comparando píxeles, no esta suite.
	 */
	it('un rango que cubre la serie EXACTA sobra, aunque no haya nada que advertir', () => {
		const opciones = {
			range: '1M' as const,
			// HOY − 29 días: justo lo que pide «1M», ni un día más.
			firstShownDate: '2026-07-12',
			oldestKnownDate: null,
			today: HOY
		};
		expect(clipNoticeFor(opciones), 'no falta ningún día, así que no debe avisar').toBeNull();
		expect(isRangeRedundant(opciones), 'y aun así enseña lo mismo que «Todo»').toBe(true);
	});

	it('sin puntos no se apaga nada: no hay nada que comparar', () => {
		expect(
			TODOS.filter((range) =>
				isRangeRedundant({ range, firstShownDate: null, oldestKnownDate: null, today: HOY })
			)
		).toEqual([]);
	});
});
