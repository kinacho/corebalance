import { describe, it, expect } from 'vitest';
import { resolverExclusion, NO_TRACK_KEY, NO_TRACK_PARAM } from './analytics-opt-out';

/**
 * Lo que se prueba aquí no es la exclusión, es **que no se excluya de más**.
 *
 * Un fallo en este módulo no rompe nada visible: deja el panel de Vercel a cero, y eso
 * se lee igual que «no ha entrado nadie». Con 158 visitantes en ocho días, esa
 * confusión cuesta decisiones de producto. Así que la mayoría de los casos de abajo
 * comprueban el camino aburrido —la visita **sí** cuenta— que es el que tiene que
 * aguantar.
 */
describe('resolverExclusion · por defecto se cuenta', () => {
	it('una visita normal, sin query ni marca, cuenta', () => {
		expect(resolverExclusion('', null)).toEqual({ excluido: false, guardar: null });
	});

	it('una query cualquiera no excluye', () => {
		expect(resolverExclusion('?utm_source=telegram&ref=x', null).excluido).toBe(false);
	});

	it('⚠️ un valor guardado que no sea exactamente «1» cuenta', () => {
		// El caso que mata el módulo si se escribe con `!!guardado` o con `guardado !==
		// null`: cualquier resto en localStorage apagaría las métricas para siempre.
		for (const basura of ['', '0', 'true', 'si', 'null', 'undefined', ' 1']) {
			expect(resolverExclusion('', basura).excluido, `«${basura}» no debe excluir`).toBe(false);
		}
	});

	it('⚠️ un parámetro no reconocido cuenta, y no persiste nada', () => {
		// `?notrack` a secas, `?notrack=si`, `?notrack=true`: alguien improvisando de
		// memoria. Ninguno debe apagar las métricas ni escribir una marca a medias.
		for (const query of ['?notrack', '?notrack=si', '?notrack=true', '?notrack=2']) {
			expect(resolverExclusion(query, null), query).toEqual({ excluido: false, guardar: null });
		}
	});

	it('un parámetro no reconocido tampoco borra una exclusión ya puesta', () => {
		// Solo `notrack=0` la quita. Un `?notrack=xyz` no debe reactivar el conteo por
		// accidente: para eso está el valor explícito.
		expect(resolverExclusion('?notrack=xyz', '1')).toEqual({ excluido: true, guardar: null });
	});
});

describe('resolverExclusion · el interruptor', () => {
	it('`?notrack=1` excluye y lo persiste', () => {
		expect(resolverExclusion('?notrack=1', null)).toEqual({ excluido: true, guardar: '1' });
	});

	it('`?notrack=0` vuelve a contar y lo persiste', () => {
		expect(resolverExclusion('?notrack=0', '1')).toEqual({ excluido: false, guardar: '0' });
	});

	it('la marca guardada sobrevive a visitas posteriores sin parámetro', () => {
		// Es lo que hace que baste con activarlo una vez por navegador.
		expect(resolverExclusion('', '1')).toEqual({ excluido: true, guardar: null });
	});

	it('el parámetro manda sobre lo guardado, en los dos sentidos', () => {
		expect(resolverExclusion('?notrack=0', '1').excluido).toBe(false);
		expect(resolverExclusion('?notrack=1', '0').excluido).toBe(true);
	});

	it('funciona con la query mezclada con otros parámetros', () => {
		expect(resolverExclusion('?lang=es&notrack=1&x=2', null).excluido).toBe(true);
	});

	it('acepta la query sin la interrogación inicial', () => {
		// `location.search` la trae, pero quien llame desde un test o un script puede no.
		expect(resolverExclusion('notrack=1', null).excluido).toBe(true);
	});
});

describe('resolverExclusion · las constantes no se mueven solas', () => {
	it('la clave y el parámetro son los que documenta el módulo', () => {
		// Cambiarlos deja fuera a quien ya lo activó, sin que nada falle: volvería a
		// contarse sin enterarse. Si hay que cambiarlos, que sea a la vista.
		expect(NO_TRACK_KEY).toBe('corebalance_no_track');
		expect(NO_TRACK_PARAM).toBe('notrack');
	});
});
