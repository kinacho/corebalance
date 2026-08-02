import type { HoldingEdit } from './types';

/**
 * Une dos listas de ediciones por `id`.
 *
 * Deliberadamente **no** es last-write-wins como el resto de la sincronización:
 * si dos dispositivos se resolvieran comparando estados, un merge desafortunado
 * convertiría la diferencia en una venta que nunca ocurrió. Uniendo por id, un
 * dispositivo puede reclasificar sus propias ediciones y nunca puede inventar ni
 * borrar las de otro.
 *
 * En conflicto de id gana la versión local, que es la que el usuario acaba de
 * tocar. El precio de esta decisión es que borrar una edición no se propaga; a
 * cambio, ninguna desaparece por accidente.
 */
export function mergeHoldingEdits(local: HoldingEdit[], remote: HoldingEdit[]): HoldingEdit[] {
	const byId = new Map<string, HoldingEdit>();
	for (const edit of remote) byId.set(edit.id, edit);
	for (const edit of local) byId.set(edit.id, edit);

	return [...byId.values()].sort((a, b) => a.date - b.date || a.createdAt - b.createdAt);
}
