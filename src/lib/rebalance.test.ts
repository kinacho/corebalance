import { describe, it, expect } from 'vitest';
import { calculatePortfolioState, calculateRebalance } from './rebalance';
import type { Asset, HoldingsMap, PriceData } from './types';

// --- Shared test fixtures ---
const assets: Asset[] = [
	{ ticker: 'AAPL', name: 'Apple', isin: 'US0378331005', targetWeight: 0.6, ter: 0.002, color: '#ff0000', icon: '🍎', category: 'core' },
	{ ticker: 'MSFT', name: 'Microsoft', isin: 'US5949181045', targetWeight: 0.4, ter: 0.001, color: '#00ff00', icon: '💻', category: 'core' }
];

const holdings: HoldingsMap = {
	'AAPL': { shares: 10, avgCost: 100 },
	'MSFT': { shares: 10, avgCost: 50 }
};

const prices: Record<string, PriceData> = {
	'AAPL': { price: 150, change: 1.5, currency: 'USD', name: 'Apple Inc.' },
	'MSFT': { price: 100, change: -1, currency: 'USD', name: 'Microsoft Corp.' }
};

// --- Tests ---
describe('rebalance.ts', () => {

	describe('calculatePortfolioState', () => {
		it('calculates total capital and profit correctly', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			// AAPL: 10 * 150 = 1500, cost = 1000
			// MSFT: 10 * 100 = 1000, cost = 500
			expect(state.totalCapital).toBe(2500);
			expect(state.totalInvested).toBe(1500);
			expect(state.totalProfit).toBe(1000);
			expect(state.totalProfitPercent).toBeCloseTo(0.6667, 4);
		});

		it('calculates weights and deviations correctly', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			expect(state.positions[0].currentWeight).toBe(0.6);
			expect(state.positions[0].deviation).toBe(0);
			expect(state.positions[1].currentWeight).toBe(0.4);
			expect(state.positions[1].deviation).toBe(0);
		});

		it('handles empty holdings gracefully', () => {
			const state = calculatePortfolioState(assets, {}, prices);
			expect(state.totalCapital).toBe(0);
			expect(state.totalInvested).toBe(0);
			expect(state.totalProfit).toBe(0);
			expect(state.positions.every(p => p.currentWeight === 0)).toBe(true);
		});

		it('handles missing prices gracefully', () => {
			const state = calculatePortfolioState(assets, holdings, {});
			expect(state.totalCapital).toBe(0);
			expect(state.totalInvested).toBe(1500);
			expect(state.totalProfit).toBe(-1500);
		});

		it('calculates TER costs correctly', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			// AAPL: 1500 * 0.002 = 3
			// MSFT: 1000 * 0.001 = 1
			expect(state.totalAnnualCost).toBe(4);
			expect(state.weightedAverageTer).toBeCloseTo(4 / 2500, 6);
		});

		it('calculates daily change values', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			// AAPL: 1500 * (1.5/100) = 22.5
			// MSFT: 1000 * (-1/100) = -10
			expect(state.dailyChangeValue).toBeCloseTo(12.5);
		});
	});

	describe('calculateRebalance', () => {
		it('returns zero allocations with 0 contribution', () => {
			const result = calculateRebalance(assets, holdings, prices, 0);
			expect(result.allocations[0].amountToInvest).toBe(0);
			expect(result.allocations[1].amountToInvest).toBe(0);
			expect(result.totalContribution).toBe(0);
		});

		it('distributes according to target weights when balanced', () => {
			const result = calculateRebalance(assets, holdings, prices, 1000);
			expect(result.allocations[0].amountToInvest).toBe(600);
			expect(result.allocations[1].amountToInvest).toBe(400);
			expect(result.newTotalCapital).toBe(3500);
		});

		it('distributes to correct deficits when unbalanced', () => {
			const unbalancedHoldings: HoldingsMap = {
				'AAPL': { shares: 10, avgCost: 100 }, // value 1500
				'MSFT': { shares: 5, avgCost: 50 }    // value 500
			};
			const result = calculateRebalance(assets, unbalancedHoldings, prices, 1000);
			expect(result.allocations[0].amountToInvest).toBeCloseTo(300);
			expect(result.allocations[1].amountToInvest).toBeCloseTo(700);
		});

		it('handles assets with targetWeight = 0', () => {
			const assetsWithZero: Asset[] = [
				{ ...assets[0], targetWeight: 1.0 },
				{ ...assets[1], targetWeight: 0 }
			];
			const result = calculateRebalance(assetsWithZero, holdings, prices, 1000);
			// All contribution should go to AAPL
			expect(result.allocations[0].amountToInvest).toBeCloseTo(1000);
			expect(result.allocations[1].amountToInvest).toBe(0);
		});

		it('calculates sharesToBuy correctly', () => {
			const result = calculateRebalance(assets, holdings, prices, 1000);
			// AAPL: 600 / 150 = 4.000
			expect(result.allocations[0].sharesToBuy).toBeCloseTo(4, 3);
			// MSFT: 400 / 100 = 4.000
			expect(result.allocations[1].sharesToBuy).toBeCloseTo(4, 3);
		});

		it('handles empty portfolio with contribution', () => {
			const result = calculateRebalance(assets, {}, prices, 10000);
			// Should distribute by target weights: 6000 / 4000
			expect(result.allocations[0].amountToInvest).toBeCloseTo(6000);
			expect(result.allocations[1].amountToInvest).toBeCloseTo(4000);
		});

		it('produces resulting weights that match targets', () => {
			const result = calculateRebalance(assets, {}, prices, 10000);
			expect(result.allocations[0].resultingWeight).toBeCloseTo(0.6, 2);
			expect(result.allocations[1].resultingWeight).toBeCloseTo(0.4, 2);
		});

		it('handles very small contribution correctly', () => {
			const result = calculateRebalance(assets, holdings, prices, 1);
			const totalAllocated = result.allocations.reduce((s, a) => s + a.amountToInvest, 0);
			expect(totalAllocated).toBeCloseTo(1, 1);
		});

		it('handles three assets with different deviations', () => {
			const threeAssets: Asset[] = [
				{ ticker: 'A', name: 'A', isin: '', targetWeight: 0.5, ter: 0, color: '', icon: '', category: 'core' },
				{ ticker: 'B', name: 'B', isin: '', targetWeight: 0.3, ter: 0, color: '', icon: '', category: 'core' },
				{ ticker: 'C', name: 'C', isin: '', targetWeight: 0.2, ter: 0, color: '', icon: '', category: 'core' }
			];
			const h: HoldingsMap = {
				'A': { shares: 10, avgCost: 10 }, // value 100
				'B': { shares: 5, avgCost: 10 },  // value 50
				'C': { shares: 0, avgCost: 0 }     // value 0
			};
			const p: Record<string, PriceData> = {
				'A': { price: 10, change: 0, currency: 'EUR', name: 'A' },
				'B': { price: 10, change: 0, currency: 'EUR', name: 'B' },
				'C': { price: 10, change: 0, currency: 'EUR', name: 'C' }
			};
			const result = calculateRebalance(threeAssets, h, p, 150);
			// New total: 300. Targets: A=150, B=90, C=60
			// Deficits: A=50, B=40, C=60. Total=150
			expect(result.allocations[0].amountToInvest).toBeCloseTo(50);
			expect(result.allocations[1].amountToInvest).toBeCloseTo(40);
			expect(result.allocations[2].amountToInvest).toBeCloseTo(60);
		});

		it('handles fxRate correctly in calculatePortfolioState', () => {
			const usdAsset: Asset[] = [{ ticker: 'USD', name: 'USD Asset', isin: '', targetWeight: 1, ter: 0, color: '', icon: '', category: 'core' }];
			const usdHoldings: HoldingsMap = { 'USD': { shares: 10, avgCost: 100 } };
			const usdPrices: Record<string, PriceData> = { 'USD': { price: 150, change: 0, currency: 'USD', name: 'USD', fxRate: 1.10 } };

			const state = calculatePortfolioState(usdAsset, usdHoldings, usdPrices);
			// Total capital in base currency: 10 * 150 * 1.10 = 1650
			expect(state.totalCapital).toBeCloseTo(1650, 2);
			// Total invested in base currency: 10 * 100 * 1.10 = 1100
			expect(state.totalInvested).toBeCloseTo(1100, 2);
			expect(state.totalProfit).toBeCloseTo(550, 2);
		});

		/**
		 * El contrato es «precio en divisa del activo × fxRate». Estos casos fijan
		 * las dos direcciones del cambio porque el error de aplicarlo dos veces
		 * tiene signo distinto según el tipo: infravalora cuando el tipo es mayor
		 * que 1 (USD) y sobrevalora cuando es menor que 1 (GBP), así que un solo
		 * caso podía parecer correcto por casualidad.
		 */
		it('aplica el tipo de cambio una sola vez con tipo mayor que 1', () => {
			const asset: Asset[] = [{ ticker: 'MSFT', name: 'Microsoft', isin: '', targetWeight: 1, ter: 0, color: '', icon: '', category: 'stocks' }];
			const h: HoldingsMap = { 'MSFT': { shares: 15, avgCost: 320.5 } };
			// EURUSD 1,08 → un dólar son 1/1,08 euros.
			const p: Record<string, PriceData> = {
				'MSFT': { price: 415.2, change: 0, currency: 'USD', name: 'Microsoft', fxRate: 1 / 1.08 }
			};

			const state = calculatePortfolioState(asset, h, p);

			expect(state.totalCapital).toBeCloseTo((15 * 415.2) / 1.08, 2); // 5766,67 €
			expect(state.totalInvested).toBeCloseTo((15 * 320.5) / 1.08, 2); // 4451,39 €
			expect(state.totalProfit).toBeCloseTo(1315.28, 2);
			// El precio unitario se queda en divisa del activo, sin tocar.
			expect(state.positions[0].unitPrice).toBe(415.2);
		});

		it('aplica el tipo de cambio una sola vez con tipo menor que 1', () => {
			const asset: Asset[] = [{ ticker: 'ULVR.L', name: 'Unilever', isin: '', targetWeight: 1, ter: 0, color: '', icon: '', category: 'stocks' }];
			const h: HoldingsMap = { 'ULVR.L': { shares: 100, avgCost: 40 } };
			// EURGBP 0,85 → una libra son 1/0,85 euros, más de un euro.
			const p: Record<string, PriceData> = {
				'ULVR.L': { price: 45, change: 0, currency: 'GBP', name: 'Unilever', fxRate: 1 / 0.85 }
			};

			const state = calculatePortfolioState(asset, h, p);

			expect(state.totalCapital).toBeCloseTo((100 * 45) / 0.85, 2); // 5294,12 €
			expect(state.totalInvested).toBeCloseTo((100 * 40) / 0.85, 2); // 4705,88 €
		});

		it('devuelve targetHoldings en participaciones, no en divisa base', () => {
			const asset: Asset[] = [{ ticker: 'MSFT', name: 'Microsoft', isin: '', targetWeight: 1, ter: 0, color: '', icon: '', category: 'stocks' }];
			const h: HoldingsMap = { 'MSFT': { shares: 15, avgCost: 320.5 } };
			const p: Record<string, PriceData> = {
				'MSFT': { price: 415.2, change: 0, currency: 'USD', name: 'Microsoft', fxRate: 1 / 1.08 }
			};

			const state = calculatePortfolioState(asset, h, p);

			// Con peso objetivo 100 %, el objetivo son las participaciones que ya hay.
			expect(state.positions[0].targetHoldings).toBeCloseTo(15, 6);
		});

		it('suma el sparkline de sección en divisa base', () => {
			const mixed: Asset[] = [
				{ ticker: 'EUR.AS', name: 'Euro fund', isin: '', targetWeight: 0.5, ter: 0, color: '', icon: '', category: 'core' },
				{ ticker: 'USD.US', name: 'Dollar fund', isin: '', targetWeight: 0.5, ter: 0, color: '', icon: '', category: 'core' }
			];
			const h: HoldingsMap = { 'EUR.AS': { shares: 10, avgCost: 1 }, 'USD.US': { shares: 10, avgCost: 1 } };
			const p: Record<string, PriceData> = {
				'EUR.AS': { price: 100, change: 0, currency: 'EUR', name: 'Euro fund', sparkline: new Array(7).fill(100), fxRate: 1 },
				'USD.US': { price: 100, change: 0, currency: 'USD', name: 'Dollar fund', sparkline: new Array(7).fill(100), fxRate: 0.5 }
			};

			const state = calculatePortfolioState(mixed, h, p);

			// 10×100×1 + 10×100×0,5 = 1500, no 2000.
			expect(state.sparkline?.[0]).toBeCloseTo(1500, 6);
			expect(state.sparkline?.[0]).toBeCloseTo(state.totalCapital, 6);
		});

		it('uses manualInterestRate instead of daily change if present', () => {
			const fund: Asset[] = [{ ticker: 'FUND', name: 'Money Market', isin: '', targetWeight: 1, ter: 0, color: '', icon: '', category: 'core', manualInterestRate: 0.0365 }];
			const h: HoldingsMap = { 'FUND': { shares: 1000, avgCost: 1 } };
			const p: Record<string, PriceData> = { 'FUND': { price: 1, change: 0.5, currency: 'EUR', name: 'FUND' } };
			
			const state = calculatePortfolioState(fund, h, p);
			// manualInterestRate (0.0365) / 365 = 0.0001 (0.01%)
			expect(state.positions[0].dailyChangePercent).toBeCloseTo(0.0001, 6);
		});

		it('handles price 0 gracefully in calculateRebalance by ignoring the asset', () => {
			const zeroPrice: Record<string, PriceData> = {
				'AAPL': { price: 0, change: 0, currency: 'USD', name: 'Apple' },
				'MSFT': { price: 100, change: 0, currency: 'USD', name: 'Microsoft' }
			};
			const result = calculateRebalance(assets, holdings, zeroPrice, 1000);
			expect(result.allocations[0].amountToInvest).toBe(0); // Price 0
			expect(result.allocations[1].amountToInvest).toBe(1000); // All to the other one that has price
		});

		it('handles total targetWeight < 1 correctly', () => {
			const partialAssets: Asset[] = [
				{ ...assets[0], targetWeight: 0.5 },
				{ ...assets[1], targetWeight: 0.3 }
			];
			const result = calculateRebalance(partialAssets, {}, prices, 1000);
			// Should distribute 500 and 300, 200 remains unallocated
			expect(result.allocations[0].amountToInvest).toBe(500);
			expect(result.allocations[1].amountToInvest).toBe(300);
			expect(result.totalContribution).toBe(1000);
		});
	});
});

/**
 * Casos que salen del **mutation testing**, no de leer el código.
 *
 * ⚠️ Este módulo tenía 97,19 % de cobertura de sentencias y un mutation score de
 * **61,92 %**: 89 mutantes sobrevivían, es decir, se podía cambiar el comportamiento de
 * la mitad de sus decisiones y ningún test se quejaba. La cobertura mide qué líneas se
 * ejecutan; esto mide si alguien comprueba el resultado. En el módulo que reparte el
 * dinero del usuario, la diferencia importa.
 *
 * Cada bloque de aquí abajo mata un grupo concreto de supervivientes y dice cuál.
 */
describe('rebalance.ts · casos que el mutation testing dejó al descubierto', () => {
	const activoDe = (extra: Partial<Asset> = {}): Asset => ({
		ticker: 'X',
		name: 'Activo',
		isin: '',
		targetWeight: 1,
		ter: 0,
		color: '',
		icon: '',
		category: 'core',
		...extra
	});
	const precioDe = (extra: Partial<PriceData> = {}): PriceData => ({
		price: 100,
		change: 0,
		currency: 'EUR',
		name: 'Activo',
		...extra
	});

	/**
	 * Cuentas remuneradas y depósitos: el activo con `manualInterestRate` y el interés
	 * acumulado que viene del ledger.
	 *
	 * Sobrevivían 16 mutantes en las líneas 41-48 —toda la rama de interés manual— y el
	 * único test que había solo miraba `dailyChangePercent`. Con eso, cambiar
	 * `totalValueBase + accruedInterest` por una resta pasaba en verde: el saldo de un
	 * depósito podía salir mal y ningún test se enteraba.
	 */
	describe('activos con interés manual', () => {
		const deposito = [activoDe({ ticker: 'CASH', manualInterestRate: 0.0365 })];
		const precioCash = { CASH: precioDe({ price: 1, name: 'Depósito' }) };

		it('el interés acumulado del ledger suma al valor y ES el beneficio', () => {
			const h: HoldingsMap = {
				CASH: { shares: 1000, avgCost: 1, totalCostBase: 1000, accruedInterest: 36.5 }
			};
			const state = calculatePortfolioState(deposito, h, precioCash);
			const pos = state.positions[0];

			// Valor = principal + intereses; el beneficio es exactamente el interés.
			expect(pos.totalValue).toBeCloseTo(1036.5, 6);
			expect(pos.profit).toBeCloseTo(36.5, 6);
			expect(pos.totalCost).toBeCloseTo(1000, 6);
			// Y el porcentaje se calcula contra el coste, no contra el valor.
			expect(pos.profitPercent).toBeCloseTo(36.5 / 1000, 6);
		});

		it('sin interés del ledger, el depósito no inventa beneficio', () => {
			// Rama de respaldo: sin `accruedInterest`, el coste se iguala al valor para que
			// no aparezca un beneficio que no se ha calculado. Cambiar eso hacía que un
			// depósito recién añadido mostrara ganancias falsas.
			const h: HoldingsMap = { CASH: { shares: 1000, avgCost: 1 } };
			const state = calculatePortfolioState(deposito, h, precioCash);
			const pos = state.positions[0];

			const interesDiario = 1000 * ((0.0365 * 100) / 365 / 100); // 0,1 €
			expect(pos.totalValue).toBeCloseTo(1000 + interesDiario, 6);
			expect(pos.totalCost).toBeCloseTo(pos.totalValue, 6);
			expect(pos.profit).toBe(0);
			expect(pos.profitPercent).toBe(0);
		});

		it('un depósito sin interés del ledger iguala coste y valor, incluso con `totalCostBase`', () => {
			// Combinación que en la práctica no se da —los dos campos salen del ledger a la
			// vez— pero queda fijada porque es contraintuitiva: la rama de respaldo iguala el
			// coste al valor para no inventar beneficio, y al hacerlo **pisa** el coste que
			// venía precalculado. Si algún día se separan esos dos campos, este test avisa.
			const h: HoldingsMap = { CASH: { shares: 1000, avgCost: 1, totalCostBase: 950 } };
			const state = calculatePortfolioState(deposito, h, precioCash);
			expect(state.positions[0].totalCost).toBeCloseTo(state.positions[0].totalValue, 6);
			expect(state.positions[0].totalCost).not.toBe(950);
		});

		it('en un activo normal, `totalCostBase` manda sobre participaciones × coste medio', () => {
			// Con ledger el coste exacto viene precalculado en divisa base; recalcularlo a
			// mano da otro número en cuanto hay divisa o compras a precios distintos —aquí,
			// 10 × 100 ÷ 1,08 = 925,93 frente a los 1.200 que dice el ledger—.
			const activo = [activoDe({ ticker: 'MSFT' })];
			const h: HoldingsMap = { MSFT: { shares: 10, avgCost: 100, totalCostBase: 1200 } };
			const p = { MSFT: precioDe({ price: 150, currency: 'USD', fxRate: 1 / 1.08 }) };

			const state = calculatePortfolioState(activo, h, p);

			expect(state.positions[0].totalCost).toBe(1200);
			// Y el beneficio se mide contra ese coste, no contra el recalculado.
			expect(state.positions[0].profit).toBeCloseTo((10 * 150) / 1.08 - 1200, 6);
		});

		it('el rendimiento anual del depósito se publica sin reescalar', () => {
			// `ytdChangePercent` llega de Yahoo en porcentaje (2,5 = 2,5 %) y se divide por
			// 100; un tipo manual ya viene en tanto por uno y **no** se toca. Mezclarlos
			// daba un 3,65 % pintado como 365 %.
			const h: HoldingsMap = { CASH: { shares: 1000, avgCost: 1 } };
			const state = calculatePortfolioState(deposito, h, precioCash);
			expect(state.positions[0].ytdChangePercent).toBeCloseTo(0.0365, 6);
		});
	});

	/**
	 * Las tres series de rendimiento que vienen de Yahoo en porcentaje.
	 *
	 * Sobrevivían los mutantes que cambian `/ 100` por `* 100` en `mtd` y `oneMonth`:
	 * nadie comprobaba la escala, así que un 3 % podía llegar a la interfaz como 300 %.
	 */
	it('divide por cien las series de rendimiento de Yahoo, y solo cuando existen', () => {
		const activo = [activoDe({ ticker: 'ETF' })];
		const h: HoldingsMap = { ETF: { shares: 1, avgCost: 100 } };
		const conSeries = {
			ETF: precioDe({ ytdChangePercent: 12.5, mtdChangePercent: 3, oneMonthChangePercent: -2.5 })
		};

		const state = calculatePortfolioState(activo, h, conSeries);
		const pos = state.positions[0];
		expect(pos.ytdChangePercent).toBeCloseTo(0.125, 6);
		expect(pos.mtdChangePercent).toBeCloseTo(0.03, 6);
		expect(pos.oneMonthChangePercent).toBeCloseTo(-0.025, 6);

		// Y si no vienen, quedan indefinidas en vez de convertirse en un cero que la
		// interfaz pintaría como «0 %», que no es lo mismo que «no hay dato».
		const sinSeries = calculatePortfolioState(activo, h, { ETF: precioDe() });
		expect(sinSeries.positions[0].ytdChangePercent).toBeUndefined();
		expect(sinSeries.positions[0].mtdChangePercent).toBeUndefined();
		expect(sinSeries.positions[0].oneMonthChangePercent).toBeUndefined();
	});

	/**
	 * Las divisiones protegidas: `x > 0 ? a / x : 0`.
	 *
	 * Son 28 mutantes repartidos por todo el módulo (`>` por `>=`, la condición fijada a
	 * `true`…). Ninguno moría porque **ningún test llegaba con el denominador a cero**, y
	 * ése es justo el caso que la protección existe para cubrir: una cartera vacía, o un
	 * activo sin precio.
	 */
	describe('divisiones con denominador cero', () => {
		it('una posición con coste cero no explota en el porcentaje de beneficio', () => {
			// Participaciones regaladas o importadas sin coste: valor sin coste.
			const activo = [activoDe({ ticker: 'FREE' })];
			const h: HoldingsMap = { FREE: { shares: 10, avgCost: 0 } };
			const state = calculatePortfolioState(activo, h, { FREE: precioDe({ price: 50 }) });
			const pos = state.positions[0];

			expect(pos.totalCost).toBe(0);
			expect(pos.profit).toBe(500);
			// Sin protección esto sería Infinity, y la interfaz pintaría «∞ %».
			expect(pos.profitPercent).toBe(0);
			expect(Number.isFinite(pos.profitPercent)).toBe(true);
		});

		it('una cartera sin capital deja en cero los agregados que dividen por él', () => {
			const activo = [activoDe({ ticker: 'Z' })];
			const state = calculatePortfolioState(activo, { Z: { shares: 0, avgCost: 0 } }, {
				Z: precioDe({ price: 0 })
			});

			expect(state.totalCapital).toBe(0);
			expect(state.totalInvested).toBe(0);
			expect(state.totalProfitPercent).toBe(0);
			expect(state.weightedAverageTer).toBe(0);
			expect(state.dailyChangePercent).toBe(0);
			// Y sin precio no hay participaciones objetivo que calcular.
			expect(state.positions[0].targetHoldings).toBe(0);
			for (const valor of [
				state.totalProfitPercent,
				state.weightedAverageTer,
				state.dailyChangePercent,
				state.positions[0].targetHoldings
			]) {
				expect(Number.isFinite(valor)).toBe(true);
			}
		});
	});

	/**
	 * El sparkline de sección: siete días, y el índice que los recorta.
	 *
	 * `sp.length - MAX_DAYS + i` con `index >= 0 ? sp[index] : sp[0]` tenía 14 mutantes
	 * vivos. El único test que existía usaba series de exactamente siete valores, que es
	 * el caso en el que ese cálculo da lo mismo hagas lo que hagas.
	 */
	describe('sparkline de sección', () => {
		const activo = [activoDe({ ticker: 'S' })];
		const h: HoldingsMap = { S: { shares: 2, avgCost: 1 } };

		it('de una serie más larga que la ventana se queda con los siete últimos días', () => {
			const sparkline = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const state = calculatePortfolioState(activo, h, { S: precioDe({ sparkline }) });
			// Últimos siete: 4…10, por dos participaciones.
			expect(state.sparkline).toEqual([8, 10, 12, 14, 16, 18, 20]);
		});

		it('de una serie más corta rellena por delante con el primer precio', () => {
			// Un fondo con tres días de histórico: los cuatro huecos iniciales toman `sp[0]`
			// en vez de quedarse a cero, que en un gráfico se lee como una caída a cero.
			const state = calculatePortfolioState(activo, h, { S: precioDe({ sparkline: [10, 20, 30] }) });
			expect(state.sparkline).toEqual([20, 20, 20, 20, 20, 40, 60]);
		});

		it('sin sparkline en los precios no se inventa una serie de ceros', () => {
			const state = calculatePortfolioState(activo, h, { S: precioDe() });
			expect(state.sparkline).toBeUndefined();
		});

		it('una serie vacía tampoco cuenta como serie', () => {
			const state = calculatePortfolioState(activo, h, { S: precioDe({ sparkline: [] }) });
			expect(state.sparkline).toBeUndefined();
		});
	});

	/**
	 * El reparto de la aportación cuando **no llega para todos**.
	 *
	 * Es el hueco más grave que encontró el mutation testing: los tres tests de reparto
	 * que existían caían todos en `totalDeficit === contribution`, o sea `factor = 1`. La
	 * rama que prorratea —la normal en una cartera de verdad, donde el déficit siempre es
	 * mayor que la aportación del mes— no se ejercitaba en ningún sitio, y con ella
	 * sobrevivían los mutantes de la línea del factor y de las once de `sharesToBuy`.
	 */
	describe('aportación menor que el déficit total', () => {
		const dos = [
			activoDe({ ticker: 'A', targetWeight: 0.5 }),
			activoDe({ ticker: 'B', targetWeight: 0.5 })
		];
		const p = { A: precioDe({ price: 100 }), B: precioDe({ price: 100 }) };

		it('reparte proporcionalmente al déficit y no se pasa de la aportación', () => {
			// A vale 1000, B vale 0. Con 100 € de aportación: capital futuro 1100, objetivos
			// 550 y 550 → déficit de A 0, de B 550. El déficit (550) supera la aportación
			// (100), así que el factor es 100/550 y B se lleva los 100 enteros.
			const h: HoldingsMap = { A: { shares: 10, avgCost: 100 }, B: { shares: 0, avgCost: 0 } };
			const result = calculateRebalance(dos, h, p, 100);

			expect(result.allocations[0].amountToInvest).toBe(0);
			expect(result.allocations[1].amountToInvest).toBe(100);
			const repartido = result.allocations.reduce((s, a) => s + a.amountToInvest, 0);
			expect(repartido).toBeCloseTo(100, 2);
		});

		it('con dos déficits desiguales, cada uno recibe su proporción exacta', () => {
			// A vale 100 y B 300, los dos al 50 %. Aportación 100 → capital futuro 500,
			// objetivos 250 y 250: déficit de A 150, de B 0... así que se busca el caso con
			// los dos en déficit: pesos 0,7 y 0,3 sobre 500 → 350 y 150.
			const desiguales = [
				activoDe({ ticker: 'A', targetWeight: 0.7 }),
				activoDe({ ticker: 'B', targetWeight: 0.3 })
			];
			const h: HoldingsMap = { A: { shares: 1, avgCost: 100 }, B: { shares: 1, avgCost: 100 } };
			// A vale 100, B vale 100. Futuro = 300. Objetivos 210 y 90 → déficits 110 y 0.
			const result = calculateRebalance(desiguales, h, p, 100);
			expect(result.allocations[0].amountToInvest).toBe(100);
			expect(result.allocations[1].amountToInvest).toBe(0);
		});

		it('el peso resultante se calcula sobre el capital futuro, no sobre el actual', () => {
			const h: HoldingsMap = { A: { shares: 10, avgCost: 100 }, B: { shares: 0, avgCost: 0 } };
			const result = calculateRebalance(dos, h, p, 100);
			// B pasa a valer 100 sobre un capital futuro de 1100.
			expect(result.allocations[1].resultingWeight).toBeCloseTo(100 / 1100, 6);
		});
	});

	/**
	 * De euros a participaciones: el tipo de cambio y el redondeo.
	 *
	 * `amountToInvest / (price * fxRate)` tenía once mutantes vivos en una línea y seis en
	 * la otra, y el redondeo a tres decimales otros dos. Nadie probaba `calculateRebalance`
	 * con divisa extranjera, que es el caso de cualquiera con acciones estadounidenses:
	 * dividir por el precio sin el cambio compra un 8 % más de títulos de los que caben en
	 * el dinero aportado.
	 */
	describe('conversión a participaciones', () => {
		it('aplica el tipo de cambio al convertir el importe en títulos', () => {
			const usd = [activoDe({ ticker: 'MSFT' })];
			// 415,2 $ con EURUSD 1,08 → 384,44 € por título.
			const p = { MSFT: precioDe({ price: 415.2, currency: 'USD', fxRate: 1 / 1.08 }) };
			const result = calculateRebalance(usd, {}, p, 1000);

			const esperado = 1000 / (415.2 / 1.08);
			expect(result.allocations[0].sharesToBuy).toBeCloseTo(
				Math.round(esperado * 1000) / 1000,
				3
			);
			// Sin el cambio saldrían 2,409 títulos en vez de 2,601: un 8 % de más.
			expect(result.allocations[0].sharesToBuy).not.toBeCloseTo(1000 / 415.2, 3);
		});

		it('redondea las participaciones a tres decimales y el importe a dos', () => {
			// Tres decimales porque los fondos se compran en fracciones; el euro, a céntimo.
			const activo = [activoDe({ ticker: 'F' })];
			const p = { F: precioDe({ price: 33.333333 }) };
			const result = calculateRebalance(activo, {}, p, 100.005);

			const titulos = result.allocations[0].sharesToBuy;
			expect(titulos).toBe(Math.round(titulos * 1000) / 1000);
			expect(String(titulos).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3);

			const importe = result.allocations[0].amountToInvest;
			expect(importe).toBe(Math.round(importe * 100) / 100);
		});

		it('un tipo de cambio a cero no produce participaciones infinitas', () => {
			// Defensa contra un `fxRate` corrupto llegado del backend: mejor cero títulos que
			// un Infinity que la interfaz pintaría como una orden de compra.
			const activo = [activoDe({ ticker: 'RARO' })];
			const p = { RARO: precioDe({ price: 100, fxRate: 0 }) };
			const result = calculateRebalance(activo, {}, p, 1000);
			expect(result.allocations[0].sharesToBuy).toBe(0);
			expect(Number.isFinite(result.allocations[0].sharesToBuy)).toBe(true);
		});
	});

	/**
	 * La puerta de entrada: `contribution <= 0`.
	 *
	 * Tres mutantes vivos, incluido el que la cambia por `< 0`. Con aportación cero el
	 * test que existía pasaba igual con la puerta abierta —los déficits se reparten a cero—
	 * pero una aportación **negativa** sí cambia el resultado: sin la puerta, reparte
	 * importes negativos, o sea propone vender, que es exactamente lo que este algoritmo
	 * existe para no hacer.
	 */
	it('una aportación negativa no propone vender nada', () => {
		const result = calculateRebalance(assets, holdings, prices, -500);

		expect(result.totalContribution).toBe(0);
		expect(result.newTotalCapital).toBe(0);
		for (const asignacion of result.allocations) {
			expect(asignacion.amountToInvest).toBe(0);
			expect(asignacion.sharesToBuy).toBe(0);
			expect(asignacion.resultingWeight).toBe(0);
		}
		// Y devuelve una asignación por activo: la interfaz las recorre esperando todas.
		expect(result.allocations).toHaveLength(assets.length);
	});
});
