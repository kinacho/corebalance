import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';
import type { Asset, Transaction } from '$lib/types';

loadLocale('es');
setLocale('es');

/**
 * ⚠️ **Los componentes grandes de este repo no llevan pruebas de render por
 * norma, y esta es la cuarta excepción — con su motivo, como las otras tres.**
 *
 * El motivo aquí es que el defecto **está en el cableado reactivo del propio
 * componente**, que es justo lo que ningún módulo puro puede cubrir: el
 * formulario de alta se cerraba solo y borraba lo escrito cada vez que el store
 * recalculaba, porque el `$effect` que lo reinicia dependía de la *identidad*
 * del prop `asset` en vez de del *valor* del ticker. Y `asset` llega por una
 * cadena de getters (`asset` ← `position.asset` ← la fuente del `{#each}`), así
 * que se invalidaba en cada sondeo de precios aunque el activo fuera el mismo
 * objeto.
 *
 * `rerender()` con un objeto nuevo y el mismo ticker reproduce exactamente esa
 * situación: es el control negativo de la corrección.
 */

/*
 * `instrumentType` va declarado a propósito en los tres: de él depende quién puede
 * traspasar a quién, y dejarlo a la deducción por el nombre haría que estas pruebas
 * midieran el clasificador en vez del formulario. `instrument-type.test.ts` es quien
 * cubre la deducción.
 */
const ACTIVO: Asset = {
	ticker: 'IE00BYX5NX33.SG',
	name: 'Fidelity MSCI World Index Fund',
	isin: 'IE00BYX5NX33',
	targetWeight: 0.6,
	color: '#3b82f6',
	icon: '🌐',
	ter: 0.0012,
	category: 'core',
	instrumentType: 'fund'
};

const OTRO_ACTIVO: Asset = {
	...ACTIVO,
	ticker: 'IE00B4L5Y983',
	name: 'iShares Core MSCI World',
	isin: 'IE00B4L5Y983'
};

/** El caso que separa un traspaso de un reembolso: mismo índice, otro envoltorio. */
const UN_ETF: Asset = {
	...ACTIVO,
	ticker: 'IWDA.AS',
	name: 'iShares Core MSCI World UCITS ETF',
	isin: 'IE00B4L5Y983',
	instrumentType: 'etf'
};

/**
 * Un tercer fondo, y hace falta para que una prueba pueda fallar.
 *
 * ⚠️ El caso «al cambiar de activo no queda el destino del anterior» **no se puede
 * comprobar cambiando al fondo que era el destino**: ahí el ticker filtrado coincide
 * con el origen nuevo, `candidatos` lo excluye y el destino saldría vacío por la
 * razón equivocada — verde con el defecto delante. Con un tercero, un destino que
 * sobreviviera sigue estando entre los candidatos y se ve.
 */
const TERCER_FONDO: Asset = {
	...ACTIVO,
	ticker: 'LU0996182563',
	name: 'Amundi Index MSCI Emerging Markets',
	isin: 'LU0996182563'
};

/** Una acción: desde aquí un traspaso no existe, así que no se ofrece. */
const UNA_ACCION: Asset = {
	...ACTIVO,
	ticker: 'AAPL',
	name: 'Apple Inc',
	isin: 'US0378331005',
	instrumentType: 'equity'
};

const MOVIMIENTO: Transaction = {
	id: 'tx-1',
	ticker: ACTIVO.ticker,
	type: 'buy',
	// Fecha fija: con `Date.now()` la prueba dependería del día en que se ejecuta.
	date: new Date(2026, 3, 1).getTime(),
	shares: 1.035,
	price: 12.19,
	currency: 'EUR',
	fees: 0,
	fxRate: 1
};

const store = {
	holdings: {
		[ACTIVO.ticker]: { shares: 121.505, avgCost: 12.33, useLedger: true },
		[OTRO_ACTIVO.ticker]: { shares: 10, avgCost: 100, useLedger: true },
		// Los cuatro en modo libro: sin `useLedger` el modal enseña el aviso de modo
		// manual y no monta la sección, así que ni el alta ni el traspaso existen.
		[UN_ETF.ticker]: { shares: 5, avgCost: 90, useLedger: true },
		[TERCER_FONDO.ticker]: { shares: 20, avgCost: 40, useLedger: true },
		[UNA_ACCION.ticker]: { shares: 3, avgCost: 150, useLedger: true }
	} as Record<string, { shares: number; avgCost: number; useLedger: boolean }>,
	prices: {
		[ACTIVO.ticker]: { price: 13.88, currency: 'EUR', name: ACTIVO.name, change: 0 },
		[OTRO_ACTIVO.ticker]: { price: 95, currency: 'EUR', name: OTRO_ACTIVO.name, change: 0 }
	} as Record<string, unknown>,
	transactions: [MOVIMIENTO] as Transaction[],
	ledgerHoldings: {
		[ACTIVO.ticker]: { shares: 121.505, avgCost: 12.33 },
		[OTRO_ACTIVO.ticker]: { shares: 10, avgCost: 100 }
	} as Record<string, { shares: number; avgCost: number }>,
	addTransaction: vi.fn(),
	updateTransaction: vi.fn(),
	removeTransaction: vi.fn(),
	toggleLedger: vi.fn(),

	// Lo que necesita el formulario de traspaso.
	coreAssets: [ACTIVO, OTRO_ACTIVO, TERCER_FONDO, UN_ETF] as Asset[],
	satelliteAssets: [] as Asset[],
	stockAssets: [UNA_ACCION] as Asset[],
	effectiveHoldings: {
		[ACTIVO.ticker]: { shares: 121.505, avgCost: 12.33, useLedger: true },
		[OTRO_ACTIVO.ticker]: { shares: 10, avgCost: 100, useLedger: true },
		[UN_ETF.ticker]: { shares: 5, avgCost: 90, useLedger: true },
		[TERCER_FONDO.ticker]: { shares: 20, avgCost: 40, useLedger: true },
		[UNA_ACCION.ticker]: { shares: 3, avgCost: 150, useLedger: true }
	} as Record<string, { shares: number; avgCost: number; useLedger: boolean }>,
	pricesWithFx: {
		[ACTIVO.ticker]: { price: 13.88, currency: 'EUR' },
		[OTRO_ACTIVO.ticker]: { price: 95, currency: 'EUR' },
		[UN_ETF.ticker]: { price: 95, currency: 'EUR' },
		[TERCER_FONDO.ticker]: { price: 45, currency: 'EUR' },
		[UNA_ACCION.ticker]: { price: 200, currency: 'EUR' }
	} as Record<string, { price: number; currency: string }>,
	registrarTraspaso: vi.fn(),
	seedLedgerFromManual: vi.fn(),
	removeTransferPair: vi.fn(),

	/*
	 * Lo que necesita la pestaña de ficha, que se monta al abrir el modal. Se
	 * declara vacío a propósito: lo que este fichero comprueba es el cableado del
	 * libro, y la ficha tiene su propia suite.
	 */
	perShareBase: {} as Record<string, number>,
	lookThrough: null,
	concentracion: null,
	fundamentals: {} as Record<string, unknown>,
	posicionDe: () => undefined,
	asegurarFundamentales: vi.fn()
};

vi.mock('$lib/stores/portfolio.svelte', () => ({
	get portfolio() {
		return store;
	}
}));

/**
 * ⚠️ **El modal abre en la pestaña «Ficha» desde que existe**, así que llegar al
 * libro es ahora un clic más. Se cambia el ayudante en vez de la aserción porque
 * lo que este fichero decide sigue siendo lo mismo; lo que cambió es el camino.
 */
async function irAlLibro(container: HTMLElement) {
	const pestanas = [...container.querySelectorAll('.pestana')] as HTMLButtonElement[];
	const libro = pestanas.find((p) => p.textContent?.trim() === 'Libro');
	if (!libro) throw new Error('no hay pestaña de libro');
	await fireEvent.click(libro);
}

/** Abre el formulario de alta y devuelve el campo de participaciones ya escrito. */
async function abrirFormularioConDatos(container: HTMLElement, participaciones: string) {
	await irAlLibro(container);
	const botonAnadir = container.querySelector('.add-tx-btn') as HTMLButtonElement;
	await fireEvent.click(botonAnadir);

	const campo = container.querySelector('#tx-shares') as HTMLInputElement;
	expect(campo).not.toBeNull();
	await fireEvent.input(campo, { target: { value: participaciones } });
	return campo;
}

/**
 * ⚠️ Se lee del **botón**, no de si `.add-tx-form` está en el DOM. El formulario
 * sale con `transition:slide`, así que al cerrarse su nodo sigue montado hasta
 * que acaba la animación: comprobar presencia mide la transición y no el estado.
 * La etiqueta del botón es `showAddForm` directamente — «Cancelar» si está
 * abierto, «+ Añadir» si no.
 */
const formularioAbierto = (container: HTMLElement) =>
	(container.querySelector('.add-tx-btn') as HTMLButtonElement).textContent?.trim() === 'Cancelar';

describe('LedgerModal.svelte', () => {
	beforeEach(() => {
		store.addTransaction.mockClear();
		store.updateTransaction.mockClear();
	});

	it('no cierra ni borra el formulario cuando el activo cambia de identidad pero no de ticker', async () => {
		const LedgerModal = (await import('./LedgerModal.svelte')).default;
		const { container, rerender } = render(LedgerModal, {
			props: { asset: ACTIVO, onClose: () => {} }
		});

		await abrirFormularioConDatos(container, '123');
		expect(formularioAbierto(container)).toBe(true);

		/*
		 * Esto es lo que hace el sondeo de precios cada 30 s: `portfolioState` se
		 * recalcula, el `{#each}` escribe una `position` nueva y el prop `asset`
		 * cambia de identidad. El activo es el mismo — mismo ticker, mismos datos.
		 */
		await rerender({ asset: { ...ACTIVO }, onClose: () => {} });

		expect(formularioAbierto(container)).toBe(true);
		const campo = container.querySelector('#tx-shares') as HTMLInputElement;
		expect(campo.value).toBe('123');
	});

	/**
	 * ⚠️ Este caso pedía antes «el formulario se cierra» y ahora pide **además que
	 * la pestaña vuelva a la ficha**, que es lo que de verdad hay que fijar desde
	 * que el modal tiene dos.
	 *
	 * El motivo es el mismo que el del formulario y vale para cualquier estado que
	 * se añada aquí en el futuro: desde `ManageAssets` este modal **cambia de
	 * activo sin remontarse**, así que todo lo que no se reinicie en el efecto
	 * guardado por ticker se queda con lo del activo anterior. Con pestañas eso
	 * sería peor que antes: te enseñaría el libro de un activo bajo el nombre de
	 * otro.
	 */
	it('al cambiar de activo vuelve a la ficha y no arrastra el formulario', async () => {
		const LedgerModal = (await import('./LedgerModal.svelte')).default;
		const { container, rerender } = render(LedgerModal, {
			props: { asset: ACTIVO, onClose: () => {} }
		});

		await abrirFormularioConDatos(container, '123');
		expect(formularioAbierto(container)).toBe(true);

		// Pasa desde `ManageAssets`, que reusa el mismo modal para otro activo.
		await rerender({ asset: OTRO_ACTIVO, onClose: () => {} });

		const activa = container.querySelector('.pestana.activa');
		expect(activa?.textContent?.trim()).toBe('Ficha');
		// Y el libro ni siquiera está montado, así que no hay formulario que arrastrar.
		expect(container.querySelector('.add-tx-btn')).toBeNull();

		// Al volver al libro, lo escrito para el activo anterior no está.
		const campo = await abrirFormularioConDatos(container, '');
		expect(Number(campo.value)).toBe(0);
	});

	/**
	 * ⚠️ **Lo que este caso NO comprueba, y por qué está dicho aquí.** El defecto
	 * del calendario era una capa `position: fixed; inset: 0` que se tragaba el
	 * primer clic de toda la pantalla. Eso **no se puede probar en jsdom**: no hay
	 * disposición ni prueba de impacto, así que un elemento superpuesto no
	 * intercepta nada y un clic despachado sobre el botón le llega igual, con capa
	 * o sin ella. Escribirlo aquí habría sido una prueba incapaz de fallar.
	 *
	 * Lo que sí decide este caso es el mecanismo que sustituye a la capa: que el
	 * `pointerdown` de `window` cierre el calendario **fuera** y no **dentro**. La
	 * mitad que necesita un navegador de verdad —que el mismo clic llegue además a
	 * su destino— vive en `e2e/libro-de-operaciones.spec.ts`.
	 */
	it('el calendario se cierra al pulsar fuera y no al pulsar dentro', async () => {
		const LedgerModal = (await import('./LedgerModal.svelte')).default;
		const { container } = render(LedgerModal, {
			props: { asset: ACTIVO, onClose: () => {} }
		});

		await abrirFormularioConDatos(container, '5');
		await fireEvent.click(container.querySelector('#tx-date') as HTMLInputElement);
		expect(container.querySelector('.date-picker')).not.toBeNull();

		// Dentro: navegar por el calendario no puede cerrarlo.
		await fireEvent.pointerDown(container.querySelector('.picker-title') as HTMLElement);
		expect(container.querySelector('.date-picker')).not.toBeNull();

		// Fuera: se cierra, y el gesto sigue su curso hasta el botón de guardar.
		const guardar = container.querySelector('.submit-tx-btn') as HTMLButtonElement;
		await fireEvent.pointerDown(guardar);
		await fireEvent.click(guardar);

		expect(container.querySelector('.date-picker')).toBeNull();
		expect(store.addTransaction).toHaveBeenCalledTimes(1);
		expect(store.addTransaction.mock.calls[0][0]).toMatchObject({
			ticker: ACTIVO.ticker,
			shares: 5
		});
	});

	it('Escape cierra primero el calendario y solo después el modal', async () => {
		const LedgerModal = (await import('./LedgerModal.svelte')).default;
		const onClose = vi.fn();
		const { container } = render(LedgerModal, { props: { asset: ACTIVO, onClose } });

		await abrirFormularioConDatos(container, '5');
		await fireEvent.click(container.querySelector('#tx-date') as HTMLInputElement);
		expect(container.querySelector('.date-picker')).not.toBeNull();

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(container.querySelector('.date-picker')).toBeNull();
		// Un solo Escape no puede cerrar dos niveles: los handlers de `window` no se
		// consumen entre sí, y sin la precedencia se cerraría también el modal.
		expect(onClose).not.toHaveBeenCalled();

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	/**
	 * ⚠️ **Lo que guarda el requisito de este formulario: que en todo momento se vea
	 * de qué fondo a qué fondo.** No es aritmética —eso lo cubre
	 * `traspaso-libro.test.ts`—, es qué hay escrito en la pantalla, y por eso se
	 * prueba aquí y no en un módulo puro.
	 */
	describe('el formulario de traspaso', () => {
		async function abrirTraspaso(container: HTMLElement) {
			await irAlLibro(container);
			const boton = container.querySelector('.transfer-btn') as HTMLButtonElement;
			expect(boton).not.toBeNull();
			await fireEvent.click(boton);
			return container.querySelector('.transfer-form') as HTMLElement;
		}

		it('nombra los DOS fondos a la vez, no solo el destino', async () => {
			/*
			 * Es el caso central. La forma evidente —un campo rotulado «destino»— deja el
			 * origen implícito: solo lo dice la cabecera del modal, fuera del formulario.
			 */
			const LedgerModal = (await import('./LedgerModal.svelte')).default;
			const { container } = render(LedgerModal, {
				props: { asset: ACTIVO, onClose: () => {} }
			});

			const form = await abrirTraspaso(container);
			// Antes de elegir destino, el origen ya está nombrado dentro del formulario.
			expect(form.textContent).toContain('Fidelity MSCI World');

			const op = form.querySelector(
				`.destino-op[data-ticker="${OTRO_ACTIVO.ticker}"]`
			) as HTMLButtonElement;
			await fireEvent.click(op);

			// Y ahora los dos, en la misma tarjeta.
			const ruta = form.querySelector('.ruta') as HTMLElement;
			expect(ruta.textContent).toContain('Fidelity MSCI World');
			expect(ruta.textContent).toContain('iShares Core MSCI World');
		});

		it('el nombre conserva la gestora, que es lo que separa dos fondos del mismo índice', async () => {
			// `descriptiveAssetLabel` frente a `assetLabelCandidates()[1]`, que se
			// deduplica y devolvería «Core MSCI World» sin la gestora.
			const LedgerModal = (await import('./LedgerModal.svelte')).default;
			const { container } = render(LedgerModal, {
				props: { asset: ACTIVO, onClose: () => {} }
			});

			const form = await abrirTraspaso(container);
			const nombres = [...form.querySelectorAll('.destino-nombre')].map((n) =>
				n.textContent?.trim()
			);

			expect(nombres).toContain('iShares Core MSCI World');
			// Y no el ISIN, que es lo que devolvería `tickerLabel`.
			expect(nombres.join(' ')).not.toContain('IE00B4L5Y983');
		});

		it('el ETF va en el grupo que tributa, y el fondo del mismo índice en el que no', async () => {
			/*
			 * La consecuencia fiscal va en la ESTRUCTURA de la lista: agrupada se lee
			 * antes de elegir, no en un aviso que aparece cuando ya has decidido. El caso
			 * elegido es el que de verdad importa —el fondo y el ETF del **mismo
			 * índice**—, porque es donde la intuición falla: replican lo mismo y solo uno
			 * se puede traspasar sin tributar.
			 *
			 * ⚠️ Se empareja por `data-ticker` y **no por el texto**, y eso lo enseñó este
			 * mismo test: `descriptiveAssetLabel` quita la fontanería, así que «iShares
			 * Core MSCI World» y «iShares Core MSCI World UCITS ETF» se pintan **con el
			 * mismo rótulo**. En pantalla los distinguen su grupo y su columna de tipo;
			 * emparejar por substring no los distinguía y el test acusaba a la fila
			 * correcta.
			 */
			const LedgerModal = (await import('./LedgerModal.svelte')).default;
			const { container } = render(LedgerModal, {
				props: { asset: ACTIVO, onClose: () => {} }
			});

			const form = await abrirTraspaso(container);

			// Se recorre en orden de documento y se anota bajo qué grupo cae cada fila.
			let tributando = false;
			const grupoDe: Record<string, boolean> = {};
			for (const n of form.querySelectorAll('.destino-grupo, .destino-op')) {
				if (n.classList.contains('destino-grupo')) {
					tributando = n.classList.contains('destino-grupo-tributa');
					continue;
				}
				const tk = n.getAttribute('data-ticker');
				if (tk) grupoDe[tk] = tributando;
			}

			expect(grupoDe[OTRO_ACTIVO.ticker]).toBe(false);
			expect(grupoDe[UN_ETF.ticker]).toBe(true);
			expect(grupoDe[UNA_ACCION.ticker]).toBe(true);
		});

		it('desde una acción no se ofrece traspasar, porque ahí no existe', async () => {
			/*
			 * Visto abriendo la pantalla, no leyendo el código: con el origen en una
			 * acción los cinco candidatos caían bajo «esto sería un reembolso», que desde
			 * una acción es falso —es una venta— y encima ofrecía una operación que el
			 * art. 94 reserva a las IIC.
			 */
			const LedgerModal = (await import('./LedgerModal.svelte')).default;
			const { container } = render(LedgerModal, {
				props: { asset: UNA_ACCION, onClose: () => {} }
			});

			await irAlLibro(container);
			expect(container.querySelector('.transfer-btn')).toBeNull();
			// Pero el alta normal sigue estando: vender y comprar sí se puede apuntar.
			expect(container.querySelector('.add-tx-btn')).not.toBeNull();
		});

		it('⚠️ al cambiar de activo no queda el destino del anterior', async () => {
			/*
			 * El modo exacto en el que el `$effect` guardado por ticker rompería
			 * precisamente la claridad que este formulario da: desde `ManageAssets` el
			 * modal cambia de activo **sin remontarse**, así que un destino que
			 * sobreviviera enseñaría el origen de uno con el destino del otro.
			 */
			const LedgerModal = (await import('./LedgerModal.svelte')).default;
			const { container, rerender } = render(LedgerModal, {
				props: { asset: ACTIVO, onClose: () => {} }
			});

			const form = await abrirTraspaso(container);
			const op = form.querySelector(
				`.destino-op[data-ticker="${OTRO_ACTIVO.ticker}"]`
			) as HTMLButtonElement;
			await fireEvent.click(op);
			expect((container.querySelector('.ruta') as HTMLElement).textContent).toContain(
				'iShares Core MSCI World'
			);

			// A un TERCER fondo, no al que era el destino: ver el docblock de
			// `TERCER_FONDO`. Con el destino, este caso pasaría por el motivo equivocado.
			await rerender({ asset: TERCER_FONDO, onClose: () => {} });

			// Vuelve a la ficha, así que el formulario ni está montado.
			expect(container.querySelector('.transfer-form')).toBeNull();

			// Y al reabrirlo desde el activo nuevo, no hay destino heredado: la fila
			// «hacia» es otra vez el selector.
			await irAlLibro(container);
			const boton = container.querySelector('.transfer-btn') as HTMLButtonElement;
			await fireEvent.click(boton);
			const form2 = container.querySelector('.transfer-form') as HTMLElement;
			expect(form2.querySelector('.destino-lista')).not.toBeNull();
			expect(form2.querySelector('.ruta-cambiar')).toBeNull();
		});

		it('un traspaso a otro fondo se apunta como par, con su coste heredado', async () => {
			const LedgerModal = (await import('./LedgerModal.svelte')).default;
			const { container } = render(LedgerModal, {
				props: { asset: ACTIVO, onClose: () => {} }
			});

			const form = await abrirTraspaso(container);
			const op = form.querySelector(
				`.destino-op[data-ticker="${OTRO_ACTIVO.ticker}"]`
			) as HTMLButtonElement;
			await fireEvent.click(op);

			await fireEvent.click(form.querySelector('.submit-tx-btn') as HTMLButtonElement);

			expect(store.registrarTraspaso).toHaveBeenCalledTimes(1);
			const plan = store.registrarTraspaso.mock.calls[0][0];
			expect(plan.origen.ticker).toBe(ACTIVO.ticker);
			expect(plan.destino.ticker).toBe(OTRO_ACTIVO.ticker);
			expect(plan.sinTributar).toBe(true);
			// El destino ya está en modo libro, así que no hay que sembrarlo.
			expect(store.seedLedgerFromManual).not.toHaveBeenCalled();
		});
	});
});
