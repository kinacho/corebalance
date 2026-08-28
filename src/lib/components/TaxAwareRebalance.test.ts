import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';
import { calculateTaxAwareRebalance } from '$lib/traspaso';
import type { InstrumentType, PortfolioPosition } from '$lib/types';

loadLocale('es');
setLocale('es');

/**
 * Los motores de `traspaso.ts` y `fiscal.ts` ya tienen sus propias pruebas. Esto
 * cubre el tramo que falta y que no cubre ninguna otra: que el plan calculado
 * llegue a la pantalla. La cartera de la demo viene justo en objetivo, así que
 * en el navegador este componente siempre dice «nada que mover» y el camino con
 * movimientos no se ejercitaba en ningún sitio.
 */

function makePositions(
	specs: { ticker: string; name: string; type: InstrumentType; value: number; target: number }[]
): PortfolioPosition[] {
	const total = specs.reduce((sum, s) => sum + s.value, 0);
	return specs.map((spec) => ({
		asset: {
			ticker: spec.ticker,
			name: spec.name,
			isin: '',
			targetWeight: spec.target,
			color: '#3b82f6',
			icon: '🛡️',
			ter: 0,
			category: 'core' as const,
			instrumentType: spec.type
		},
		holdings: spec.value / 100,
		avgCost: 100,
		totalCost: spec.value,
		unitPrice: 100,
		totalValue: spec.value,
		currentWeight: spec.value / total,
		deviation: spec.value / total - spec.target,
		targetValue: total * spec.target,
		targetHoldings: (total * spec.target) / 100,
		profit: 0,
		profitPercent: 0,
		dailyChangeValue: 0,
		dailyChangePercent: 0
	}));
}

const EMPTY_STATE = { positions: [] as PortfolioPosition[] };

/** Cartera 60/40 que se ha ido a 70/30, los dos fondos: traspaso gratis. */
const DEVIATED = makePositions([
	{ ticker: 'WORLD', name: 'Vanguard Global Stock Index', type: 'fund', value: 7000, target: 0.6 },
	{ ticker: 'BONDS', name: 'Vanguard Global Bond Index', type: 'fund', value: 3000, target: 0.4 }
]);

const store = {
	prices: { WORLD: { price: 100, currency: 'EUR', name: 'World', change: 0 } } as Record<
		string,
		unknown
	>,
	transactions: [] as unknown[],
	contribution: 0,
	/*
	 * `holdings` decide si «apuntar este traspaso en el libro» aparece: exige el
	 * origen en modo libro, porque de ahí sale el coste heredado. Vacío por defecto,
	 * así que el botón no sale — lo que este fichero mide es el plan, y el botón tiene
	 * su propio caso más abajo.
	 */
	holdings: {} as Record<string, { shares: number; avgCost: number; useLedger?: boolean }>,
	effectiveHoldings: {} as Record<string, { shares: number; avgCost: number }>,
	pricesWithFx: { WORLD: { price: 100, currency: 'EUR' } } as Record<
		string,
		{ price: number; currency: string }
	>,
	registrarTraspaso: vi.fn(),
	seedLedgerFromManual: vi.fn(),
	taxAwareRebalance: calculateTaxAwareRebalance(
		[{ category: 'core', positions: DEVIATED }],
		[],
		{}
	),
	portfolioState: { positions: DEVIATED },
	satelliteState: EMPTY_STATE,
	stockState: EMPTY_STATE
};

vi.mock('$lib/stores/portfolio.svelte', () => ({
	get portfolio() {
		return store;
	}
}));

/**
 * El panel ya no decide si está abierto: la columna abre **una herramienta a la vez**, así
 * que `abierto` y `onAlternar` vienen del padre. Se renderiza abierto porque lo que este
 * fichero comprueba es su contenido.
 */
const ABIERTO = { props: { abierto: true, onAlternar: () => {} } };

describe('TaxAwareRebalance.svelte', () => {
	it('muestra el traspaso y lo marca como exento', async () => {
		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance, ABIERTO);

		// Los dos extremos del movimiento y el importe exacto que hay que mover.
		expect(container.textContent).toContain('Vanguard Global Stock Index');
		expect(container.textContent).toContain('Vanguard Global Bond Index');
		expect(container.textContent).toMatch(/1\.?000/);
		expect(container.textContent).toContain('Sin coste fiscal');
		expect(container.textContent).toContain('Traspaso');

		/*
		 * Y la cifra de la cabecera dice que cuesta cero. `.cifra` es la clase compartida
		 * de `layout.css`: estaba escrita dos veces con tintes distintos —token en un panel
		 * y literales `rgba(...)` en el otro— y esa divergencia es lo que `a11y:contrast`
		 * pone rojo.
		 */
		const cifra = container.querySelector('.cifra');
		expect(cifra).not.toBeNull();
		expect(cifra?.classList.contains('libre')).toBe(true);
		/*
		 * ⚠️ Y lleva `privacy-blur`, que es el arreglo de verdad: este panel enseñaba
		 * **dinero sin difuminar** en modo privado, contra la convención del repo, y nadie
		 * lo comprobaba.
		 */
		expect(cifra?.classList.contains('privacy-blur')).toBe(true);
	});

	it('no ofrece la sección de ventas cuando todo es traspasable', async () => {
		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance, ABIERTO);
		expect(container.textContent).not.toContain('Obliga a vender');
	});

	it('pide una aportación para poder comparar las dos vías', async () => {
		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance, ABIERTO);
		// Sin aportación configurada no se puede decir «tardarías N meses».
		expect(container.textContent).toContain('Configura tu aportación mensual');
	});

	it('con aportación, compara contra los meses que tardaría aportando', async () => {
		store.contribution = 200;
		store.taxAwareRebalance = calculateTaxAwareRebalance(
			[{ category: 'core', positions: DEVIATED }],
			[],
			{ contribution: 200 }
		);

		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance, ABIERTO);

		expect(container.textContent).toContain('meses en llegar a lo mismo');
		// El veredicto de que esperar no ahorra impuestos, porque el plan es gratis.
		expect(container.textContent).toContain('esperar no te ahorra impuestos');
	});

	it('con un ETF en pérdidas y recompra reciente, saca el aviso de la regla', async () => {
		const DAY = 24 * 60 * 60 * 1000;
		const now = Date.now();
		const withEtf = makePositions([
			{ ticker: 'ETF', name: 'iShares Core MSCI World', type: 'etf', value: 7000, target: 0.6 },
			{ ticker: 'FUND', name: 'Vanguard Global Bond Index', type: 'fund', value: 3000, target: 0.4 }
		]);
		const transactions = [
			{
				id: '1',
				ticker: 'ETF',
				type: 'buy' as const,
				date: now - 300 * DAY,
				shares: 70,
				price: 200,
				currency: 'EUR',
				fees: 0,
				fxRate: 1
			},
			{
				id: '2',
				ticker: 'ETF',
				type: 'buy' as const,
				date: now - 10 * DAY,
				shares: 1,
				price: 100,
				currency: 'EUR',
				fees: 0,
				fxRate: 1
			}
		];

		store.contribution = 0;
		store.portfolioState = { positions: withEtf };
		store.taxAwareRebalance = calculateTaxAwareRebalance(
			[{ category: 'core', positions: withEtf }],
			transactions,
			{ now }
		);

		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance, ABIERTO);

		expect(container.textContent).toContain('Obliga a vender');
		expect(container.textContent).toContain('Esta pérdida no la podrías compensar todavía');
		expect(container.textContent).toContain('regla antiaplicación');
		// Y dice que la pérdida se difiere, no que se pierda: es la diferencia que
		// separa un aviso útil de un susto.
		expect(container.textContent).toContain('la pérdida no se pierde');
	});

	it('dice que no hay nada que hacer cuando la cartera está en objetivo', async () => {
		const balanced = makePositions([
			{ ticker: 'A', name: 'Fondo A', type: 'fund', value: 6000, target: 0.6 },
			{ ticker: 'B', name: 'Fondo B', type: 'fund', value: 4000, target: 0.4 }
		]);
		store.portfolioState = { positions: balanced };
		store.taxAwareRebalance = calculateTaxAwareRebalance(
			[{ category: 'core', positions: balanced }],
			[],
			{}
		);

		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance, ABIERTO);

		expect(container.textContent).toContain('ya está en su objetivo');
		expect(container.querySelector('.badge')).toBeNull();
	});

	it('avisa si todavía no hay precios, en vez de dar un plan sobre ceros', async () => {
		store.prices = {};
		const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
		const { container } = render(TaxAwareRebalance, ABIERTO);
		expect(container.textContent).toContain('Esperando precios');
		store.prices = { WORLD: { price: 100, currency: 'EUR', name: 'World', change: 0 } };
	});

	/**
	 * El plan se calculaba desde la 1.13 y **no se podía ejecutar**: había que abrir
	 * dos libros y apuntar dos movimientos a mano, con las participaciones sacadas a
	 * ojo. Estos dos casos fijan cuándo se ofrece hacerlo de un clic y cuándo no.
	 */
	describe('apuntar el traspaso en el libro', () => {
		function restaurarDesviada() {
			store.portfolioState = { positions: DEVIATED };
			store.taxAwareRebalance = calculateTaxAwareRebalance(
				[{ category: 'core', positions: DEVIATED }],
				[],
				{}
			);
		}

		it('no se ofrece si el origen no lleva libro: no habría coste que heredar', async () => {
			/*
			 * ⚠️ Y ese es el punto entero de la 1.22.0: sin lotes FIFO en el origen, el
			 * destino nacería contando desde el precio de hoy y su ficha diría
			 * «plusvalía 0 €». Mejor no ofrecerlo que apuntarlo mal.
			 */
			restaurarDesviada();
			store.holdings = {};

			const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
			const { container } = render(TaxAwareRebalance, ABIERTO);

			expect(container.querySelector('.apuntar-btn')).toBeNull();
		});

		it('se ofrece cuando el origen lleva libro, y escribe el par al pulsarlo', async () => {
			restaurarDesviada();
			store.holdings = { WORLD: { shares: 70, avgCost: 100, useLedger: true } };
			store.effectiveHoldings = { WORLD: { shares: 70, avgCost: 100 } };
			store.pricesWithFx = {
				WORLD: { price: 100, currency: 'EUR' },
				BONDS: { price: 100, currency: 'EUR' }
			};
			store.transactions = [
				{
					id: 'c1',
					ticker: 'WORLD',
					type: 'buy',
					// Fecha fija: el coste heredado arrastra su fecha, o sea aritmética de fechas.
					date: Date.UTC(2023, 2, 12),
					shares: 70,
					price: 60,
					currency: 'EUR',
					fees: 0,
					fxRate: 1
				}
			];
			store.registrarTraspaso.mockClear();

			const TaxAwareRebalance = (await import('./TaxAwareRebalance.svelte')).default;
			const { container } = render(TaxAwareRebalance, ABIERTO);

			const boton = container.querySelector('.apuntar-btn') as HTMLButtonElement;
			expect(boton).not.toBeNull();

			await fireEvent.click(boton);

			expect(store.registrarTraspaso).toHaveBeenCalledTimes(1);
			const plan = store.registrarTraspaso.mock.calls[0][0];
			expect(plan.origen.ticker).toBe('WORLD');
			expect(plan.destino.ticker).toBe('BONDS');
			expect(plan.sinTributar).toBe(true);
			// El coste y la fecha heredados, que es lo que hace honesta la ficha del destino.
			expect(plan.costeHeredado).toBeGreaterThan(0);
			expect(plan.fechaLoteHeredado).toBe(Date.UTC(2023, 2, 12));
			// El destino no lleva libro, así que hay que sembrarlo antes de escribir.
			expect(store.seedLedgerFromManual).toHaveBeenCalledWith('BONDS', expect.any(Number));

			store.transactions = [];
			store.holdings = {};
		});
	});
});
