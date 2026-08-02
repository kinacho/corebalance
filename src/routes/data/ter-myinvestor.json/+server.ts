import ter from '$lib/data/ter-myinvestor.json';
import type { RequestHandler } from './$types';

export const prerender = true;

/**
 * Sirve la tabla de gastos corrientes de los indexados de MyInvestor en una URL
 * pública y estable, igual que `/data/backtest-8020.json`.
 *
 * Mismo motivo: un schema `Dataset` sin `distribution` declara que existen unos
 * datos pero no deja llegar a ellos, que es justo lo que un verificador descarta.
 *
 * ⚠️ A diferencia del backtest, **este dataset no lo genera ningún script**: los
 * gastos corrientes no están en ninguna API pública fiable y se copian a mano de
 * los DFI/KID de cada gestora. La fuente única es
 * `src/lib/data/ter-myinvestor.json` y se actualiza editándolo, subiendo la fecha
 * `kidDate` de la fila que cambie y `compiledAt`.
 */
export const GET: RequestHandler = async () => {
	return new Response(JSON.stringify(ter, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'max-age=3600',
			// Para que cualquiera pueda leerlo desde otra web al citarlo.
			'Access-Control-Allow-Origin': '*'
		}
	});
};
