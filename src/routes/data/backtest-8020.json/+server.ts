import backtest from '$lib/data/backtest-8020.json';
import type { RequestHandler } from './$types';

export const prerender = true;

/**
 * Sirve el dataset del backtest 80/20 en una URL pública y estable.
 *
 * Sin esto el schema `Dataset` de los artículos sería un `Dataset` sin
 * `distribution`: se declara que existen unos datos pero no se puede acceder a
 * ellos, que es justo lo que un verificador descarta. Aquí el número deja de ser
 * una tabla en un HTML y pasa a ser un fichero citable y comprobable.
 *
 * La fuente única sigue siendo `src/lib/data/backtest-8020.json`, que genera
 * `npm run backtest`: este endpoint sólo lo expone.
 */
export const GET: RequestHandler = async () => {
	return new Response(JSON.stringify(backtest, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'max-age=3600',
			// Para que cualquiera pueda leerlo desde otra web al citarlo.
			'Access-Control-Allow-Origin': '*'
		}
	});
};
