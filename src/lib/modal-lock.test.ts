import { describe, it, expect, beforeEach } from 'vitest';
import {
	bloquearScroll,
	desbloquearScroll,
	modalesAbiertos,
	reiniciarBloqueoScroll
} from './modal-lock';

const bloqueado = () => document.body.classList.contains('modal-open');

describe('modal-lock', () => {
	beforeEach(() => reiniciarBloqueoScroll());

	it('bloquea al abrir y libera al cerrar', () => {
		bloquearScroll();
		expect(bloqueado()).toBe(true);
		desbloquearScroll();
		expect(bloqueado()).toBe(false);
	});

	/**
	 * El caso de `LedgerModal` sobre `ManageAssets`: cerrar el de arriba no puede
	 * devolver el scroll a una página que sigue tapada por el de abajo.
	 */
	it('anidado: cerrar el de encima no desbloquea al de debajo', () => {
		bloquearScroll(); // ManageAssets
		bloquearScroll(); // LedgerModal encima
		desbloquearScroll(); // se cierra el LedgerModal
		expect(bloqueado()).toBe(true);
		expect(modalesAbiertos()).toBe(1);
		desbloquearScroll(); // se cierra ManageAssets
		expect(bloqueado()).toBe(false);
	});

	/**
	 * El caso de `LedgerModal` desde una tarjeta: no hay nada detrás, así que
	 * cerrarlo tiene que devolver el scroll. Es el defecto que veía el usuario.
	 */
	it('suelto: cerrar el único modal devuelve el scroll', () => {
		bloquearScroll();
		desbloquearScroll();
		expect(bloqueado()).toBe(false);
		expect(modalesAbiertos()).toBe(0);
	});

	/**
	 * Un `desbloquearScroll()` de más no puede dejar el contador en negativo: el
	 * siguiente modal se abriría sin bloqueo efectivo.
	 */
	it('no baja de cero', () => {
		desbloquearScroll();
		desbloquearScroll();
		expect(modalesAbiertos()).toBe(0);
		bloquearScroll();
		expect(bloqueado()).toBe(true);
		desbloquearScroll();
		expect(bloqueado()).toBe(false);
	});

	it('tres anidados solo liberan con el último', () => {
		bloquearScroll();
		bloquearScroll();
		bloquearScroll();
		desbloquearScroll();
		desbloquearScroll();
		expect(bloqueado()).toBe(true);
		desbloquearScroll();
		expect(bloqueado()).toBe(false);
	});
});
