import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import HeroSummary from './HeroSummary.svelte';
import { loadLocale } from '$lib/i18n/i18n-util.sync';
import { setLocale } from '$lib/i18n/i18n-svelte';

loadLocale('es');
setLocale('es');

/**
 * Las cifras de los tres bloques **suman exactamente** las de la cabecera, y eso no es
 * decoración del fixture: es la propiedad que el cajón promete al enseñarlas debajo.
 *
 *   capital   7000 + 2000 + 1000 = 10.000
 *   aportado  6500 + 1900 + 1100 =  9.500
 *   ganancia   500 +  100 -  100 =    500
 *   hoy         60 +   30 +   10 =    100
 */
// Mock the global portfolio store to avoid Firebase and environment variable issues
// ⚠️ El ayudante va **dentro** de la factoría: `vi.mock` se iza al principio del
// fichero, así que una variable de nivel superior no existe todavía cuando corre.
vi.mock('$lib/stores/portfolio.svelte', () => {
	const posicion = (
		ticker: string,
		name: string,
		color: string,
		dailyChangeValue: number,
		dailyChangePercent: number,
		currentWeight: number
	) => ({ asset: { ticker, name, color }, holdings: 10, dailyChangeValue, dailyChangePercent, currentWeight });

	return {
		portfolio: {
			globalCapital: 10000,
			globalProfit: 500,
			globalProfitPercent: 0.05,
			globalInvested: 9500,
			globalDailyChangeValue: 100,
			globalDailyChangePercent: 0.01,
			globalAnnualCost: 50,
			globalWeightedAverageTer: 0.005,
			loading: false,
			isPrivate: false,
			targetLabel: 'Objetivo',
			hasAnyHoldings: true,
			/** Lo que no se puede valorar. `undefined` = todo tiene precio. */
			globalUnpriced: undefined,
			/**
			 * ⚠️ Los tres estados llevan `positions`, y hace falta: el cajón de «hoy» los
			 * recorre para ordenar lo que más mueve el día. Si el store dejara de
			 * publicarlas, esto revienta — que es lo que tiene que pasar, igual que con
			 * `performanceSeries` más abajo.
			 *
			 * El orden natural del array (12, −80, 40) **no** es el orden correcto y el
			 * mayor en magnitud es un negativo: así el test del orden no puede pasar por
			 * accidente ni con el `sort` quitado ni con el signo sin valor absoluto.
			 */
			portfolioState: {
				totalCapital: 7000,
				totalInvested: 6500,
				totalProfit: 500,
				totalProfitPercent: 0.0769,
				dailyChangeValue: 60,
				dailyChangePercent: 0.0086,
				positions: [posicion('IWDA.AS', 'iShares Core MSCI World UCITS ETF', '#2563eb', 12, 0.002, 0.7)]
			},
			stockState: {
				totalCapital: 2000,
				totalInvested: 1900,
				totalProfit: 100,
				totalProfitPercent: 0.0526,
				dailyChangeValue: 30,
				dailyChangePercent: 0.015,
				positions: [posicion('AAPL', 'Apple Inc', '#f59e0b', -80, -0.03, 0.2)]
			},
			satelliteState: {
				totalCapital: 1000,
				totalInvested: 1100,
				totalProfit: -100,
				totalProfitPercent: -0.0909,
				dailyChangeValue: 10,
				dailyChangePercent: 0.01,
				positions: [posicion('IE00B4L5Y983', 'Vanguard Euro Government Bond Index', '#a21caf', 40, 0.01, 0.1)]
			},
			/**
			 * Las cajas de «Invertido» y «Rentabilidad» dibujan una sparkline con
			 * estas series. El mock no las traía y el componente reventaba al
			 * añadirlas — que es justo lo que tiene que pasar: si el store deja de
			 * publicar `performanceSeries`, esto se entera.
			 */
			performanceSeries: {
				invested: [9000, 9200, 9350, 9500],
				gain: [100, 260, 380, 500]
			},
			prices: { 'AAPL': {} } // Just to pass the `Object.keys(portfolio.prices).length > 0` condition
		}
	};
});

/**
 * El mock es un objeto compartido y varios tests lo mutan, así que los del cajón
 * reponen lo que necesitan. Sin esto el orden de ejecución decide si las cajas son
 * pulsables —«oculta el desglose» deja los otros dos bloques a cero— y un test que
 * depende del orden es un test que pasa por casualidad.
 */
async function sembrarTresBloques() {
	const { portfolio } = await import('$lib/stores/portfolio.svelte');
	portfolio.loading = false;
	portfolio.prices = { 'AAPL': { price: 150, currency: 'EUR', name: 'Apple Inc', change: 1.5 } };
	portfolio.globalProfit = 500;
	portfolio.globalDailyChangeValue = 100;
	portfolio.portfolioState.totalCapital = 7000;
	portfolio.stockState.totalCapital = 2000;
	portfolio.satelliteState.totalCapital = 1000;
	return portfolio;
}

/**
 * ⚠️ **Svelte pone `inert` como propiedad del DOM, no como atributo**, y en jsdom la
 * propiedad no se refleja al atributo. La primera versión de estos tests preguntaba por
 * `hasAttribute('inert')`: dos fallaban y —lo peor— el de «abre Rentabilidad» pasaba
 * afirmando `false` sobre un atributo que nunca existe, o sea que no podía fallar.
 */
function inerte(container: HTMLElement): boolean {
	const wrapper = container.querySelector('.cajon-wrapper');
	if (!wrapper) throw new Error('no hay envoltorio del cajón');
	return (wrapper as HTMLElement).inert;
}

/** La caja cuyo rótulo es este texto. */
function caja(container: HTMLElement, etiqueta: string): HTMLElement {
	const cajas = [...container.querySelectorAll('.metric-card')];
	const encontrada = cajas.find((c) => c.querySelector('.metric-label')?.textContent?.trim() === etiqueta);
	if (!encontrada) throw new Error(`no hay caja con el rótulo «${etiqueta}»`);
	return encontrada as HTMLElement;
}

/**
 * Lee un importe ya formateado por la interfaz. Se compara lo de la pantalla contra lo
 * de la pantalla —las dos cifras pasan por el mismo formateador—, así que la prueba no
 * depende de acertar el formato de `es-ES`.
 */
function leerEuros(texto: string | null | undefined): number {
	const limpio = (texto ?? '')
		.replace(/−/g, '-')
		.replace(/[^\d,.+-]/g, '')
		.replace(/\./g, '')
		.replace(',', '.');
	const valor = Number.parseFloat(limpio);
	if (Number.isNaN(valor)) throw new Error(`no se pudo leer un importe de «${texto}»`);
	return valor;
}

describe('HeroSummary.svelte', () => {
	it('renders total capital formatted', async () => {
	        const { container } = render(HeroSummary);
	        // The formatted currency uses the local format.
	        expect(container.textContent).toMatch(/10\.?000/);
	});

	it('does not render main section when loading and no prices', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = true;
	        portfolio.prices = {};
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.hero-summary')).toBeNull();
	});

	it('shows negative class when globalProfit < 0', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = false;
	        portfolio.globalProfit = -100;
	        portfolio.prices = { 'AAPL': { price: 150, currency: 'USD', name: 'Apple Inc', change: 1.5 } };
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.negative')).not.toBeNull();
	});

	it('shows positive class when globalProfit > 0', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = false;
	        portfolio.globalProfit = 100;
	        portfolio.prices = { 'AAPL': { price: 150, currency: 'USD', name: 'Apple Inc', change: 1.5 } };
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.positive')).not.toBeNull();
	});

	it('shows breakdown when satellite or stocks have capital', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.satelliteState.totalCapital = 500;
	        portfolio.stockState.totalCapital = 500;
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.capital-breakdown')).not.toBeNull();
	});

	it('hides breakdown when satellite and stocks are zero', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.satelliteState.totalCapital = 0;
	        portfolio.stockState.totalCapital = 0;
	        const { container } = render(HeroSummary);
	        expect(container.querySelector('.capital-breakdown')).toBeNull();
	});

	it('dibuja una sparkline en las dos cajas que tienen serie, y solo en ésas', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = false;
	        portfolio.prices = { 'AAPL': { price: 150, currency: 'USD', name: 'Apple Inc', change: 1.5 } };
	        const { container } = render(HeroSummary);
	        // Cuatro cajas, dos líneas: «Cambio hoy» y el TER son cifras de un
	        // instante y no tienen historia que dibujar.
	        expect(container.querySelectorAll('.metric-card').length).toBe(4);
	        expect(container.querySelectorAll('.metric-spark svg').length).toBe(2);
	});

	it('no dibuja la sparkline cuando la serie es plana', async () => {
	        const { portfolio } = await import('$lib/stores/portfolio.svelte');
	        portfolio.loading = false;
	        portfolio.prices = { 'AAPL': { price: 150, currency: 'USD', name: 'Apple Inc', change: 1.5 } };
	        portfolio.performanceSeries = {
	                ...portfolio.performanceSeries,
	                invested: [9500, 9500, 9500, 9500],
	                gain: [500, 500, 500, 500]
	        };
	        const { container } = render(HeroSummary);
	        expect(container.querySelectorAll('.metric-spark svg').length).toBe(0);
	});
});

describe('HeroSummary — el cajón por cartera', () => {
	it('arranca cerrado, inerte y con las dos cajas sin desplegar', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		expect(container.querySelector('.hero-cajon.cerrado')).not.toBeNull();
		expect(inerte(container)).toBe(true);
		for (const boton of container.querySelectorAll('button.metric-card')) {
			expect(boton.getAttribute('aria-expanded')).toBe('false');
		}
	});

	it('abre «Rentabilidad» con una fila por cartera y su nombre largo', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Rentabilidad'));

		expect(container.querySelector('.hero-cajon.cerrado')).toBeNull();
		expect(inerte(container)).toBe(false);
		expect(container.querySelectorAll('.cajon-bloque').length).toBe(3);

		const titulos = [...container.querySelectorAll('.bloque-titulo')].map((t) => t.textContent?.trim());
		expect(titulos).toEqual(['Cartera Principal', 'Acciones Individuales', 'Cartera Conservadora']);
	});

	it('⚠️ las tres cifras del cajón suman la de la cabecera, que es lo que lo convierte en un desglose', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Rentabilidad'));
		const cabecera = leerEuros(caja(container, 'Rentabilidad').querySelector('.metric-value')?.textContent);
		const suma = [...container.querySelectorAll('.bloque-cifra')]
			.map((c) => leerEuros(c.textContent))
			.reduce((a, b) => a + b, 0);
		expect(suma).toBeCloseTo(cabecera, 2);

		await fireEvent.click(caja(container, 'Cambio Hoy'));
		const cabeceraHoy = leerEuros(caja(container, 'Cambio Hoy').querySelector('.metric-value')?.textContent);
		const sumaHoy = [...container.querySelectorAll('.bloque-cifra')]
			.map((c) => leerEuros(c.textContent))
			.reduce((a, b) => a + b, 0);
		expect(sumaHoy).toBeCloseTo(cabeceraHoy, 2);
	});

	it('solo hay un cajón abierto a la vez', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Rentabilidad'));
		await fireEvent.click(caja(container, 'Cambio Hoy'));

		const abiertas = [...container.querySelectorAll('button.metric-card')].filter(
			(b) => b.getAttribute('aria-expanded') === 'true'
		);
		expect(abiertas.length).toBe(1);
		expect(abiertas[0].querySelector('.metric-label')?.textContent?.trim()).toBe('Cambio Hoy');
	});

	it('volver a tocar la misma caja lo cierra', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Rentabilidad'));
		await fireEvent.click(caja(container, 'Rentabilidad'));

		expect(container.querySelector('.hero-cajon.cerrado')).not.toBeNull();
		expect(inerte(container)).toBe(true);
	});

	it('Escape cierra el cajón', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Cambio Hoy'));
		expect(container.querySelector('.hero-cajon.cerrado')).toBeNull();

		await fireEvent.keyDown(caja(container, 'Cambio Hoy'), { key: 'Escape' });
		expect(container.querySelector('.hero-cajon.cerrado')).not.toBeNull();
	});

	it('un bloque sin capital no sale, y con uno solo la caja deja de ser pulsable', async () => {
		const portfolio = await sembrarTresBloques();
		portfolio.satelliteState.totalCapital = 0;
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Rentabilidad'));
		expect(container.querySelectorAll('.cajon-bloque').length).toBe(2);

		// Con un único bloque el desglose repetiría la cabecera, así que no se abre.
		portfolio.stockState.totalCapital = 0;
		const solo = render(HeroSummary).container;
		expect(solo.querySelector('button.metric-card')).toBeNull();
		expect(caja(solo, 'Rentabilidad').tagName).toBe('DIV');
	});

	it('«hoy» ordena lo que más lo mueve por valor absoluto, no por signo ni por el orden del array', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Cambio Hoy'));

		const nombres = [...container.querySelectorAll('.mover-nombre')].map((n) => n.textContent?.trim());
		// El array llega como 12, −80, 40: el mayor en magnitud es el negativo y va primero.
		expect(nombres[0]).toBe('AAPL');
		expect(nombres[1]).not.toBe('IWDA.AS');
		expect(nombres.length).toBe(3);
	});

	it('un fondo no se rotula con su ISIN', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Cambio Hoy'));

		const nombres = [...container.querySelectorAll('.mover-nombre')].map((n) => n.textContent?.trim());
		expect(nombres).not.toContain('IE00B4L5Y983');
	});

	it('el cajón de rentabilidad enseña lo aportado y el de hoy no', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Rentabilidad'));
		expect(container.querySelectorAll('.bloque-aportado').length).toBe(3);
		expect(container.querySelector('.cajon-movers')).toBeNull();

		await fireEvent.click(caja(container, 'Cambio Hoy'));
		expect(container.querySelectorAll('.bloque-aportado').length).toBe(0);
		expect(container.querySelector('.cajon-movers')).not.toBeNull();
	});

	/**
	 * ⚠️ Lo que solo se ve midiendo: a 390 × 844 el cajón de «hoy» acababa en el píxel
	 * 947 y la lista de movers quedaba entera fuera de pantalla. En jsdom todos los
	 * rectángulos son cero, así que hay que fabricar el desbordamiento; lo que se
	 * comprueba es la decisión, no la geometría del navegador.
	 */
	it('si el cajón se abriría por debajo de la ventana, lo asoma', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
		const rect = vi
			.spyOn(Element.prototype, 'getBoundingClientRect')
			.mockReturnValue({ bottom: 947 } as DOMRect);
		const scrollBy = vi.mocked(window.scrollBy);
		scrollBy.mockClear();

		await fireEvent.click(caja(container, 'Cambio Hoy'));

		expect(scrollBy).toHaveBeenCalledTimes(1);
		// Lo que sobra (103) más el margen de aire.
		expect(scrollBy.mock.calls[0][0]).toMatchObject({ top: 115 });

		rect.mockRestore();
		vi.restoreAllMocks();
	});

	it('y no lo asoma cuando ya cabe: en escritorio no se mueve nada', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(950);
		const rect = vi
			.spyOn(Element.prototype, 'getBoundingClientRect')
			.mockReturnValue({ bottom: 700 } as DOMRect);
		const scrollBy = vi.mocked(window.scrollBy);
		scrollBy.mockClear();

		await fireEvent.click(caja(container, 'Cambio Hoy'));

		expect(scrollBy).not.toHaveBeenCalled();

		rect.mockRestore();
		vi.restoreAllMocks();
	});

	/**
	 * ⚠️ El aviso va pegado al capital global y **no** dentro del cajón: con un solo
	 * bloque con capital las cajas no llegan a ser botones, así que ahí el aviso sería
	 * inalcanzable justo en la cartera más simple. El test lo comprueba con las cajas
	 * abribles y sin abrir ninguna.
	 */
	it('avisa de lo que no ha podido valorar, sin necesidad de abrir nada', async () => {
		const portfolio = await sembrarTresBloques();
		portfolio.globalUnpriced = { count: 2, cost: 10000 };
		const { container } = render(HeroSummary);

		const aviso = container.querySelector('.aviso-sin-precio');
		expect(aviso).not.toBeNull();
		expect(aviso?.textContent).toContain('2');
		// El importe va tapado en modo privado, como toda cifra de dinero.
		expect(container.querySelector('.aviso-coste')?.classList.contains('privacy-blur')).toBe(true);
		expect(leerEuros(container.querySelector('.aviso-coste')?.textContent)).toBe(10000);
		// Y está fuera del cajón, que sigue cerrado.
		expect(aviso?.closest('.hero-cajon')).toBeNull();
		expect(container.querySelector('.hero-cajon.cerrado')).not.toBeNull();

		portfolio.globalUnpriced = undefined;
	});

	/**
	 * ⚠️ Una posición sin cotizar tiene `currentWeight` 0, así que su píldora decía
	 * «0,00 %» — la misma cifra inventada que el arreglo quita de la rentabilidad, y
	 * encima la que se lee como «de esto no tienes nada».
	 */
	it('la píldora de peso de un activo sin cotizar no se dibuja', async () => {
		const portfolio = await sembrarTresBloques();
		const original = portfolio.portfolioState.positions;
		portfolio.portfolioState.positions = [
			...original,
			{
				asset: {
					ticker: 'SXR8',
					name: 'iShares Core S&P 500',
					color: '#f59e0b',
					isin: '',
					targetWeight: 0,
					icon: '',
					ter: 0.002,
					category: 'core' as const
				},
				holdings: 20,
				avgCost: 400,
				totalCost: 8000,
				unitPrice: 0,
				// El valor y el beneficio a cero son lo que `calculatePortfolioState` deja
				// cuando no hay precio: el coste sí se conserva.
				totalValue: 0,
				profit: 0,
				profitPercent: 0,
				dailyChangeValue: 0,
				dailyChangePercent: 0,
				currentWeight: 0,
				deviation: 0,
				targetValue: 0,
				targetHoldings: 0,
				priceMissing: true
			}
		];
		const { container } = render(HeroSummary);

		// Dos posiciones en el bloque principal, una sola píldora.
		expect(container.querySelectorAll('.asset-pill').length).toBe(1);
		// Y tampoco entra en lo que más mueve el día, porque no mueve nada.
		await fireEvent.click(caja(container, 'Cambio Hoy'));
		const nombres = [...container.querySelectorAll('.mover-nombre')].map((n) => n.textContent?.trim());
		expect(nombres).not.toContain('SXR8');

		portfolio.portfolioState.positions = original;
	});

	it('y no dice nada cuando todo tiene precio', async () => {
		const portfolio = await sembrarTresBloques();
		portfolio.globalUnpriced = undefined;
		const { container } = render(HeroSummary);
		expect(container.querySelector('.aviso-sin-precio')).toBeNull();
	});

	it('toda cifra de dinero del cajón va tapada en modo privado', async () => {
		await sembrarTresBloques();
		const { container } = render(HeroSummary);

		await fireEvent.click(caja(container, 'Rentabilidad'));
		for (const cifra of container.querySelectorAll('.bloque-cifra, .bloque-aportado-valor')) {
			expect(cifra.classList.contains('privacy-blur')).toBe(true);
		}

		await fireEvent.click(caja(container, 'Cambio Hoy'));
		for (const cifra of container.querySelectorAll('.mover-valor')) {
			expect(cifra.classList.contains('privacy-blur')).toBe(true);
		}
	});
});
