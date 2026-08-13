import { describe, it, expect } from 'vitest';
import { todasLasLecciones } from './cursos-paneles';
import { getLeccion } from './cursos';

/**
 * Que las parejas panel→lección apunten a lecciones que existen y digan su título real.
 *
 * ⚠️ **Este test es la contrapartida de una duplicación deliberada.** `cursos-paneles.ts`
 * no puede importar `$lib/cursos` —el glob eager arrastraría los 34 markdown y el kit
 * didáctico al bundle de cliente del dashboard—, así que el título de cada lección está
 * escrito dos veces. Un título duplicado a mano se queda desfasado en silencio: el enlace
 * seguiría funcionando y solo prometería otra cosa, que es exactamente el defecto que estos
 * enlaces vienen a arreglar en la dirección contraria.
 *
 * Aquí sí se puede importar `$lib/cursos`: es un test, el bundle no existe.
 */
describe('lecciones de los paneles del dashboard', () => {
	const parejas = todasLasLecciones();

	it('hay parejas que comprobar', () => {
		// Si el mapa se vaciara, todo lo de abajo pasaría por recorrer una lista vacía.
		expect(parejas.length).toBeGreaterThan(0);
	});

	it.each(parejas)('%s · la ruta existe y el título coincide', (_panel, leccion) => {
		const partes = leccion.ruta.split('/').filter(Boolean);
		expect(partes[0], `${leccion.ruta} no empieza por /cursos/`).toBe('cursos');
		expect(partes, `${leccion.ruta} no tiene curso y lección`).toHaveLength(3);

		const real = getLeccion(partes[1], partes[2]);
		expect(real, `no existe la lección ${leccion.ruta}`).toBeDefined();
		expect(real!.titulo, `el título del mapa no es el de la lección`).toBe(leccion.titulo);
	});

	it('ninguna pareja se repite: dos paneles no mandan a la misma lección', () => {
		// No sería un error de código, pero sí una señal de que uno de los dos paneles no
		// tiene explicación propia y conviene decidirlo en vez de heredarlo.
		const rutas = parejas.map(([, l]) => l.ruta);
		expect(new Set(rutas).size).toBe(rutas.length);
	});
});
