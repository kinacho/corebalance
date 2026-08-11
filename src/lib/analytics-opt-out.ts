/**
 * Excluir las visitas propias de las métricas de Vercel.
 *
 * El panel de Analytics no distingue al autor de un usuario, y con estos volúmenes eso
 * no es un detalle: medido el 11-ago-2026, 158 visitantes en ocho días con un 78 % de
 * tráfico directo. Decidir sobre esas cifras sin poder descontarse a uno mismo es
 * decidir a ciegas.
 *
 * ⚠️ **Vercel deduplica visitantes por día**, así que el autor nunca infla más de un
 * visitante diario — lo que sí infla, y mucho, son las **páginas vistas** y por tanto el
 * ratio páginas/visitante. Esto arregla las dos.
 *
 * Cómo se activa, una vez por navegador:
 *
 *   https://corebalance.app/?notrack=1     ← deja de contar
 *   https://corebalance.app/?notrack=0     ← vuelve a contar
 *
 * ⚠️ **La regla de oro de este fichero: ante la duda, contar.** Un fallo aquí no da
 * error en ninguna parte — deja las métricas a cero, que se lee exactamente igual que
 * «no ha entrado nadie». Es la misma forma de fallo que este repo persigue en la capa 0:
 * un guardián que no puede dispararse. Por eso la decisión es una función pura con sus
 * tests, y por eso **cualquier valor inesperado devuelve «cuenta»** en vez de «excluye».
 *
 * La clave vive aquí y no en `constants.ts` a propósito: aquel fichero es el de la
 * cartera y los gráficos, este módulo es el único que la lee o la escribe, y una clave
 * con un solo dueño es una clave que no se puede desincronizar.
 */

/** La marca en `localStorage`. Con prefijo del proyecto, como el resto de claves. */
export const NO_TRACK_KEY = 'corebalance_no_track';

/** El parámetro de la URL que la enciende o la apaga. */
export const NO_TRACK_PARAM = 'notrack';

export interface DecisionExclusion {
	/** Si esta visita **no** debe contarse. */
	excluido: boolean;
	/**
	 * Qué guardar en `localStorage`, o `null` para no tocar nada.
	 *
	 * Se separa de `excluido` porque leer y escribir son cosas distintas: la mayoría de
	 * las visitas deciden sin escribir, y solo las que traen el parámetro persisten.
	 */
	guardar: string | null;
}

/**
 * Decide si contar esta visita, a partir de la query y de lo que hubiera guardado.
 *
 * Pura y sin `window`: es lo que la hace testeable, y lo que permite pinchar el caso
 * que importa —el de «se cuenta»— sin un navegador.
 *
 * @param search La query tal cual (`location.search`), con o sin `?`.
 * @param guardado El valor de `localStorage`, o `null` si no hay.
 */
export function resolverExclusion(search: string, guardado: string | null): DecisionExclusion {
	const parametro = new URLSearchParams(search).get(NO_TRACK_PARAM);

	// El parámetro manda sobre lo guardado, y persiste para las siguientes visitas.
	if (parametro === '1') return { excluido: true, guardar: '1' };
	if (parametro === '0') return { excluido: false, guardar: '0' };

	// ⚠️ Sin parámetro reconocible, solo excluye la marca **exacta**. Cualquier otra cosa
	// —vacío, basura, un `notrack=si` de alguien improvisando— cuenta la visita. Es la
	// dirección segura del fallo: perder una exclusión se nota mirando el panel, perder
	// todas las visitas no se nota nunca.
	return { excluido: guardado === '1', guardar: null };
}
