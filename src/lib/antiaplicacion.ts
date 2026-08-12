import { antiApplicationWindowMonths, checkAntiApplicationRule } from './fiscal';
import type { Transaction } from './types';

/**
 * «Vendí con pérdidas. ¿Cuándo puedo recomprar sin perder la compensación?»
 *
 * La pregunta tiene respuesta exacta y casi nadie la da bien. `fiscal.ts` ya resuelve la
 * regla sobre el libro de operaciones de una cartera; esto la envuelve para la consulta
 * suelta, con dos fechas y un tipo, que es como llega la duda de verdad.
 *
 * ⚠️ **No se reimplementa nada.** La ventana y la comprobación salen de
 * `antiApplicationWindowMonths()` y `checkAntiApplicationRule()`, que ya están probadas
 * y que llevan escrito el porqué de los plazos. Duplicar aquí «2 meses o 12» sería
 * garantizar que una de las dos copias se quede vieja el día que cambie el criterio.
 *
 * Los dos matices que la divulgación se salta, y que van en pantalla:
 *
 * - **12 meses para participaciones de fondos**, no 2. Los dos meses son para valores
 *   admitidos a negociación (art. 33.5.f); las participaciones de un fondo no cotizan y
 *   caen en la letra g). Hay guías que aplican dos meses a todo, y es el error cómodo:
 *   le difiere al lector una pérdida que creía compensada.
 * - **La pérdida no se pierde, se difiere.** Se declara igual; lo que no hace es
 *   integrarse en la base de ese ejercicio. Decir «no la puedes deducir» asusta de más.
 */

export type TipoAntiaplicacion = 'fondo' | 'etf';

export interface ConsultaAntiaplicacion {
	tipo: TipoAntiaplicacion;
	/** Fecha de la venta con pérdidas, en ISO (`AAAA-MM-DD`). */
	fechaVenta: string;
	/** Fecha de la recompra que se está considerando. Opcional. */
	fechaRecompra?: string | null;
}

export interface RespuestaAntiaplicacion {
	ventanaMeses: number;
	/** Si la recompra indicada bloquea la compensación de la pérdida. */
	bloqueada: boolean;
	/** Primer día en que recomprar ya no bloquea nada, en ISO. */
	seguroDesde: string;
	/** Días que faltan desde la venta hasta esa fecha. */
	diasDeEspera: number;
	/** True si la consulta traía una fecha de recompra que se pudo interpretar. */
	conRecompra: boolean;
}

/** ⚠️ Una fecha ilegible devuelve `null`, nunca «hoy»: inventar una fecha aquí cambia la respuesta. */
function aMilis(iso: string | null | undefined): number | null {
	if (!iso) return null;
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
	if (!m) return null;
	const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	return Number.isFinite(t) ? t : null;
}

function aIso(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

const DIA = 24 * 60 * 60 * 1000;

export function consultarAntiaplicacion(
	consulta: ConsultaAntiaplicacion
): RespuestaAntiaplicacion | null {
	const venta = aMilis(consulta.fechaVenta);
	if (venta === null) return null;

	const tipo = consulta.tipo === 'etf' ? 'etf' : 'fund';
	const ventanaMeses = antiApplicationWindowMonths(tipo);
	// El mismo mes medio que usa `fiscal.ts`, para que las dos den la misma frontera.
	const seguroDesdeMs = venta + Math.ceil(ventanaMeses * 30.44) * DIA;

	const recompra = aMilis(consulta.fechaRecompra);
	let bloqueada = false;

	if (recompra !== null) {
		// Se construye una operación de compra sintética y se pregunta a la función real:
		// así la frontera exacta la decide `fiscal.ts` y no una réplica de su aritmética.
		// Sin `as`: si el tipo `Transaction` gana un campo que la regla mire, esto tiene que
		// fallar la compilación y no seguir pasando una operación a medias.
		const operaciones: Transaction[] = [
			{
				id: 'consulta',
				ticker: 'CONSULTA',
				type: 'buy',
				date: recompra,
				shares: 1,
				price: 1,
				fees: 0,
				currency: 'EUR',
				fxRate: 1
			}
		];
		bloqueada = checkAntiApplicationRule(operaciones, 'CONSULTA', tipo, venta).blocked;
	}

	return {
		ventanaMeses,
		bloqueada,
		seguroDesde: aIso(seguroDesdeMs),
		diasDeEspera: Math.round((seguroDesdeMs - venta) / DIA),
		conRecompra: recompra !== null
	};
}
