import { calculateSavingsTax, SAVINGS_TAX_YEAR } from './fiscal';

/**
 * Cuánto cuesta cobrar los dividendos en vez de acumularlos.
 *
 * La diferencia entre un fondo de acumulación y uno de distribución no es el impuesto:
 * es **cuándo** se paga. El de distribución te reparte el dividendo, tributa ese año en
 * la base del ahorro, y lo que se lleva Hacienda deja de componer. El de acumulación lo
 * reinvierte dentro y difiere el impuesto hasta que vendes.
 *
 * ⚠️ La escala sale de `fiscal.ts` (`SAVINGS_TAX_BRACKETS`, año `SAVINGS_TAX_YEAR`), que
 * es la misma que usa el motor de traspasos. **No se duplica aquí**: esas tarifas han
 * cambiado tres veces en una década y tener dos copias garantiza que una se quede vieja.
 *
 * Lo que este modelo NO hace, dicho antes de que alguien lo lea como una promesa:
 *
 * - No modela retenciones en origen sobre los dividendos que cobra el propio fondo. Eso
 *   lo soportan las dos versiones por igual y vive en la *tracking difference*, no en tu
 *   declaración.
 * - No modela aportaciones periódicas. La pregunta que resuelve es la de un capital ya
 *   invertido; meter aportaciones añade un parámetro y no cambia el sentido del
 *   resultado.
 * - Supone que reinviertes el dividendo neto. Si te lo gastas no hay comparación posible:
 *   son dos cosas distintas, no dos formas de la misma.
 */

export interface EntradaComparacion {
	/** Capital invertido hoy, en euros. */
	capital: number;
	/** Años que queda invertido. */
	anios: number;
	/** Rentabilidad total anual, dividendos incluidos. En tanto por uno (0,07 = 7 %). */
	rentabilidad: number;
	/** Parte de esa rentabilidad que llega como dividendo. En tanto por uno. */
	dividendo: number;
}

export interface ResultadoVersion {
	/** Valor de la posición al final, antes de vender. */
	valorFinal: number;
	/** Lo que has ido pagando por los dividendos durante el camino. */
	impuestoPorDividendos: number;
	/** Lo que pagas al vender al final. */
	impuestoAlVender: number;
	/** En el bolsillo después de vender y pagar. */
	neto: number;
}

export interface Comparacion {
	acumulacion: ResultadoVersion;
	distribucion: ResultadoVersion;
	/** Lo que te llevas de más eligiendo acumulación. Puede ser 0. */
	diferencia: number;
	/** Esa diferencia como porcentaje del neto de la distribución. */
	diferenciaPct: number;
	/** El año de la escala aplicada, para poder decirlo en pantalla. */
	anioFiscal: number;
}

/** Ni negativos ni infinitos: la entrada viene de campos que el usuario teclea. */
function saneado(n: number, min: number, max: number): number {
	if (!Number.isFinite(n)) return min;
	return Math.min(max, Math.max(min, n));
}

export function compararAcumulacionDistribucion(entrada: EntradaComparacion): Comparacion {
	const capital = saneado(entrada.capital, 0, 100_000_000);
	const anios = Math.round(saneado(entrada.anios, 0, 60));
	const rentabilidad = saneado(entrada.rentabilidad, -0.5, 0.5);
	// El dividendo no puede superar a la rentabilidad total: sería un fondo que reparte
	// más de lo que gana, que es una situación real pero no la que esto compara.
	const dividendo = saneado(entrada.dividendo, 0, Math.max(0, rentabilidad));

	// ── Acumulación: todo compone, el impuesto espera al final.
	const valorAcc = capital * Math.pow(1 + rentabilidad, anios);
	const impuestoVentaAcc = calculateSavingsTax(Math.max(0, valorAcc - capital));

	// ── Distribución: cada año se reparte el dividendo, tributa, y se reinvierte el neto.
	//
	// El coste fiscal se acumula año a año en vez de aplicarse como un tipo fijo porque la
	// escala es progresiva: un dividendo de 300 € y otro de 30.000 € no pagan lo mismo.
	let valorDist = capital;
	// La base de coste sube con cada dividendo neto reinvertido: ese dinero ya tributó y
	// no puede volver a tributar al vender. Olvidarlo es el error clásico de estas
	// comparaciones, y hace parecer la distribución mucho peor de lo que es.
	let baseCoste = capital;
	let impuestoDividendos = 0;

	for (let i = 0; i < anios; i++) {
		const bruto = valorDist * dividendo;
		const impuesto = calculateSavingsTax(bruto);
		impuestoDividendos += impuesto;
		// El precio sube solo por la parte que no se reparte, y luego se reinvierte el neto.
		valorDist = valorDist * (1 + rentabilidad - dividendo) + (bruto - impuesto);
		baseCoste += bruto - impuesto;
	}

	const impuestoVentaDist = calculateSavingsTax(Math.max(0, valorDist - baseCoste));

	const netoAcc = valorAcc - impuestoVentaAcc;
	const netoDist = valorDist - impuestoVentaDist;
	const diferencia = netoAcc - netoDist;

	return {
		acumulacion: {
			valorFinal: valorAcc,
			impuestoPorDividendos: 0,
			impuestoAlVender: impuestoVentaAcc,
			neto: netoAcc
		},
		distribucion: {
			valorFinal: valorDist,
			impuestoPorDividendos: impuestoDividendos,
			impuestoAlVender: impuestoVentaDist,
			neto: netoDist
		},
		diferencia,
		diferenciaPct: netoDist > 0 ? diferencia / netoDist : 0,
		anioFiscal: SAVINGS_TAX_YEAR
	};
}
