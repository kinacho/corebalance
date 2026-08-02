import { describe, it, expect } from 'vitest';
import { mergeHoldingEdits } from './merge';
import type { EditReason, HoldingEdit } from './types';

function edit(id: string, date: number, reason: EditReason = 'unclassified'): HoldingEdit {
	return {
		id,
		ticker: 'VWCE',
		date,
		sharesBefore: 500,
		sharesAfter: 200,
		reason,
		createdAt: date
	};
}

describe('mergeHoldingEdits', () => {
	it('conserva las ediciones que solo existen en el otro dispositivo', () => {
		const merged = mergeHoldingEdits([edit('a', 1)], [edit('b', 2)]);
		expect(merged.map((e) => e.id)).toEqual(['a', 'b']);
	});

	it('en conflicto de id gana la versión local', () => {
		const merged = mergeHoldingEdits(
			[edit('a', 1, 'sale')],
			[edit('a', 1, 'unclassified')]
		);
		expect(merged).toHaveLength(1);
		expect(merged[0].reason).toBe('sale');
	});

	it('nunca inventa una edición que no estaba en ninguna de las dos listas', () => {
		const merged = mergeHoldingEdits([edit('a', 1)], [edit('a', 1)]);
		expect(merged).toHaveLength(1);
	});

	it('ordena por fecha y luego por orden de registro', () => {
		const late = { ...edit('c', 5), createdAt: 99 };
		const early = { ...edit('d', 5), createdAt: 1 };
		const merged = mergeHoldingEdits([late, edit('a', 2)], [early]);
		expect(merged.map((e) => e.id)).toEqual(['a', 'd', 'c']);
	});

	it('con listas vacías devuelve una lista vacía', () => {
		expect(mergeHoldingEdits([], [])).toEqual([]);
	});
});
