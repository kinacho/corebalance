import { get } from 'svelte/store';
import { LL } from '$lib/i18n/i18n-svelte';
import { DEFAULT_CORE_ASSETS, DEFAULT_SATELLITE_ASSETS, DEFAULT_STOCK_ASSETS, STORAGE_KEY_HOLDINGS, STORAGE_KEY_CONTRIBUTION, STORAGE_KEY_ASSETS, STORAGE_KEY_PRICES, STORAGE_KEY_EDITS } from '$lib/constants';
import type { Asset, AssetCategory, HoldingData, HoldingsMap, PortfolioPosition, PortfolioState, PriceData, RebalanceResult, Transaction } from '$lib/types';
import { calculatePortfolioState, calculateRebalance } from '$lib/rebalance';
import { calculateLedgerHoldings, type LedgerHoldings } from '$lib/ledger';
import { assignAssetColors, nextAssetColor } from '$lib/asset-colors';
import type { EditReason, HoldingEdit, PerformanceSeries, PositionTimeline } from '$lib/history/types';
import {
	alignPriceSeries,
	alignPriceSeriesWithProxy,
	buildPerformanceSeries,
	buildTimelineFromEdits,
	buildTimelineFromLedger,
	DAY_MS,
	mergeHoldingEdits,
	overlaySnapshots,
	reconstructDailySeries,
	startOfUTCDay
} from '$lib/history';
import { storageProvider } from '$lib/db';
import { SYNC_PAYLOAD_VERSION, type SyncPayload } from '$lib/sync-payload';
import type { HistoryPoint } from '$lib/db/types';
import { formatDate, resolveAssetIcon } from '$lib/utils';
import { ui } from '$lib/stores/ui.svelte';
import { goto } from '$app/navigation';
import { detectSparklineChange, applyTerUpdates } from '$lib/stores/priceUtils';
import { resolveInstrumentType, tipoCorregidoPorMigracion } from '$lib/instrument-type';
import { calculateLookThrough } from '$lib/lookthrough';
import { resolveIndexKey, priceProxyOf } from '$lib/lookthrough';
import { calculateTaxAwareRebalance } from '$lib/traspaso';

/**
 * Rellena los campos que las carteras guardadas antes de que existieran no
 * traen: el icono, el tipo de instrumento y el índice replicado.
 *
 * Se aplica en los **dos** caminos de carga —local y nube— porque una cartera
 * que entra por Firestore no pasa por `loadFromStorage` y se quedaría sin
 * migrar, con el rebalanceo fiscal mudo justo para los usuarios registrados.
 *
 * Sin destruir lo que el usuario haya corregido a mano: solo escribe donde hay
 * hueco.
 *
 * ⚠️ **Con una excepción, y es una reparación, no un relleno.**
 * `tipoCorregidoPorMigracion()` va delante del valor guardado porque el valor guardado es
 * precisamente lo que está mal: los activos importados antes del arreglo del regex `0P`
 * tienen `other` o `equity` **fijados en disco**, y como `instrumentTypeOf()` prefiere lo
 * guardado, arreglar la deducción no los alcanzaba. Se queda un fondo con el panel fiscal
 * apagado y sin nada que lo avise.
 *
 * Solo actúa sobre tickers `0P…` con sufijo de mercado —la forma exacta que el regex
 * viejo no casaba— así que no puede tocar ningún activo al que no le afectara el defecto.
 * El razonamiento completo, y el coste asumido, están en su docblock.
 */
function normalizeAssets(assets: Asset[]): Asset[] {
	return assets.map((a) => ({
		...a,
		icon: a.icon || resolveAssetIcon(a.ticker, a.name),
		instrumentType:
			tipoCorregidoPorMigracion(a) ??
			a.instrumentType ??
			(a.manualInterestRate !== undefined
				? 'cash'
				: resolveInstrumentType(a.ticker, a.name, '', a.isin)),
		indexKey: a.indexKey ?? resolveIndexKey(a.ticker, a.name)
	}));
}

export interface User { uid: string; displayName?: string | null; photoURL?: string | null; email?: string | null; }

interface PortfolioBackup {
	holdings: HoldingsMap;
	coreAssets: Asset[];
	satelliteAssets: Asset[];
	stockAssets: Asset[];
	contribution: number;
	transactions: Transaction[];
	holdingEdits: HoldingEdit[];
}

export class PortfolioStore {
	// --- State (Runes) ---
	holdings = $state<HoldingsMap>({});
	transactions = $state<Transaction[]>([]);
	prices = $state<Record<string, PriceData>>({});
	contribution = $state(0);
	loading = $state(true);
	error = $state<string | null>(null);
	timestamp = $state<string | null>(null);
	user = $state<User | null>(null);
	isPrivate = $state(false);
	isInitialized = $state(false);
	history = $state<HistoryPoint[]>([]);
	/**
	 * Log de cambios manuales en las participaciones. Es el libro mayor implícito
	 * del modo manual: sin él, editar 500 a 200 no se distingue de una venta y el
	 * gráfico de rentabilidad se inventa un desplome.
	 */
	holdingEdits = $state<HoldingEdit[]>([]);
	authLoading = $state(false);
	authReady = $state(false);
	isDemo = $state(false);

	// --- User-Configurable Assets ---
	coreAssets = $state<Asset[]>([...DEFAULT_CORE_ASSETS]);
	satelliteAssets = $state<Asset[]>([...DEFAULT_SATELLITE_ASSETS]);
	stockAssets = $state<Asset[]>([...DEFAULT_STOCK_ASSETS]);

	// --- Internal Backup for Demo Mode ---
	private _backup: PortfolioBackup | null = null;

	// --- Derived State ---
	/**
	 * La contabilidad del ledger vive en `$lib/ledger`, no aquí.
	 *
	 * Estaba escrita dentro de este `$derived.by()` y salió de aquí por dos motivos que el
	 * mutation testing puso en números: leía `Date.now()` por dentro —así que el devengo de
	 * intereses no se podía fijar en un test— y tenía dos predicados duplicados que hacían
	 * que 26 de sus 43 mutantes supervivientes fueran el *mismo* mutante contado dos veces.
	 *
	 * El store sigue exponiendo `ledgerHoldings` con la misma forma, así que la suite de
	 * `ledgerHoldings.test.ts` no cambió ni una línea al extraerlo.
	 */
	ledgerHoldings: LedgerHoldings = $derived.by(() =>
		calculateLedgerHoldings(
			this.transactions,
			[...this.coreAssets, ...this.satelliteAssets, ...this.stockAssets],
			Date.now()
		)
	);

	effectiveHoldings: HoldingsMap = $derived.by(() => {
		const merged: HoldingsMap = { ...this.holdings };
		for (const ticker in this.ledgerHoldings) {
			if (this.holdings[ticker]?.useLedger) {
				merged[ticker] = {
					shares: this.ledgerHoldings[ticker].shares,
					avgCost: this.ledgerHoldings[ticker].avgCost,
					totalCostBase: this.ledgerHoldings[ticker].totalCostBase,
					useLedger: true,
					accruedInterest: this.ledgerHoldings[ticker].accruedInterest
				};
			}
		}
		return merged;
	});

	targetLabel = $derived.by(() => {
		const weights = this.coreAssets.map(a => {
			const val = a.targetWeight * 100;
			return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
		});
		return weights.join(' / ') || 'Custom';
	});

	allUserTickers = $derived.by(() => {
		const tickers = new Set<string>();
		for (const a of this.coreAssets) tickers.add(a.ticker);
		for (const a of this.satelliteAssets) tickers.add(a.ticker);
		for (const a of this.stockAssets) tickers.add(a.ticker);
		return [...tickers];
	});

	/**
	 * Los ETF de referencia de los índices que replica la cartera, para poder reconstruir el
	 * patrimonio de los días sin valor liquidativo del fondo. Ver `priceProxyOf`.
	 *
	 * Son **por índice y no por activo**, así que tres fondos World comparten una sola
	 * petición y una sola entrada de caché. Y se piden aparte de `allUserTickers` a propósito:
	 * un proxy no es una posición y no debe aparecer en la cartera — sólo su precio entra en el
	 * mapa, que es inocuo porque las posiciones se construyen desde los activos.
	 */
	proxyTickers = $derived.by(() => {
		const proxies = new Set<string>();
		for (const a of [...this.coreAssets, ...this.satelliteAssets, ...this.stockAssets]) {
			const p = priceProxyOf(a);
			if (p && !this.allUserTickers.includes(p)) proxies.add(p);
		}
		return [...proxies];
	});

	getExchangeRateToEur(currency: string): number {
		if (currency === 'EUR') return 1;
		const pair = `EUR${currency}=X`;
		if (this.prices[pair]?.price) return this.prices[pair].price;
		if (currency === 'USD') return this.prices['EURUSD=X']?.price || 1.10;
		if (currency === 'CAD') return this.prices['EURCAD=X']?.price || 1.50;
		if (currency === 'GBP') return this.prices['EURGBP=X']?.price || 0.85;
		if (currency === 'CHF') return this.prices['EURCHF=X']?.price || 0.95;
		if (currency === 'AUD') return this.prices['EURAUD=X']?.price || 1.65;
		if (currency === 'JPY') return this.prices['EURJPY=X']?.price || 160;
		return 1;
	}

	/**
	 * Precios **en la divisa del activo** más el multiplicador a divisa base.
	 *
	 * Deliberadamente no convierte `price`. El contrato de `calculatePortfolioState`
	 * es «precio crudo × fxRate», el mismo que usa para el coste
	 * (`avgCost × fxRate`, y `avgCost` está guardado en divisa del activo). Cuando
	 * esto devolvía el precio ya convertido *y además* el multiplicador, la función
	 * aplicaba el cambio dos veces: una posición en dólares aparecía un 7,4 % por
	 * debajo de su valor y una en libras un 17,6 % por encima. El coste salía bien,
	 * así que el error se concentraba entero en el beneficio (−32,5 % en el caso de
	 * MSFT de la demo).
	 *
	 * Si alguna vez hace falta el precio ya convertido, multiplícalo por `fxRate`
	 * en el punto de uso; no lo conviertas aquí.
	 */
	pricesWithFx: Record<string, PriceData> = $derived.by(() => {
		const res: Record<string, PriceData> = {};
		const base = ui.baseCurrency;
		for (const [ticker, data] of Object.entries(this.prices)) {
			const fromCurrency = data.currency || 'EUR';
			let fxRate = 1;
			if (fromCurrency !== base) {
				const fromRateToEur = this.getExchangeRateToEur(fromCurrency);
				fxRate = base === 'EUR'
					? 1 / fromRateToEur
					: this.getExchangeRateToEur(base) / fromRateToEur;
			}
			res[ticker] = { ...data, fxRate };
		}
		return res;
	});

	portfolioState: PortfolioState = $derived(calculatePortfolioState(this.coreAssets, this.effectiveHoldings, this.pricesWithFx));
	satelliteState: PortfolioState = $derived(calculatePortfolioState(this.satelliteAssets, this.effectiveHoldings, this.pricesWithFx));
	stockState: PortfolioState = $derived(calculatePortfolioState(this.stockAssets, this.effectiveHoldings, this.pricesWithFx));
	globalCapital = $derived(this.portfolioState.totalCapital + this.satelliteState.totalCapital + this.stockState.totalCapital);
	globalProfit = $derived(this.portfolioState.totalProfit + this.satelliteState.totalProfit + this.stockState.totalProfit);
	globalInvested = $derived(this.portfolioState.totalInvested + this.satelliteState.totalInvested + this.stockState.totalInvested);
	globalProfitPercent = $derived(this.globalInvested > 0 ? this.globalProfit / this.globalInvested : 0);
	globalAnnualCost = $derived(this.portfolioState.totalAnnualCost + this.satelliteState.totalAnnualCost + this.stockState.totalAnnualCost);
	globalWeightedAverageTer = $derived(this.globalCapital > 0 ? this.globalAnnualCost / this.globalCapital : 0);
	globalDailyChangeValue = $derived(this.portfolioState.dailyChangeValue + this.satelliteState.dailyChangeValue + this.stockState.dailyChangeValue);
	globalDailyChangePercent = $derived(this.globalCapital > 0 ? this.globalDailyChangeValue / this.globalCapital : 0);

	sparklineVersion = $state(0); // Incrementa solo cuando cambian los sparklines de la API


	/**
	 * Días que cubre la reconstrucción **como mínimo**, y techo de lo que se llega a pedir.
	 *
	 * ⚠️ Esto era una sola constante de 30 que decía «limitado por lo que da el sparkline de
	 * Yahoo», y era falso: `/api/prices` ya pedía a Yahoo desde el 20 de diciembre del año
	 * anterior —entre 160 y 250 cierres— y los tiraba con un `slice(-30)`. Lo limitaba el
	 * endpoint, no la fuente.
	 */
	static readonly HISTORY_DAYS = 30;
	/** 550 ≈ 18 meses, el mismo techo que sirve el endpoint (`SPARKLINE_DIAS_MAX`). */
	static readonly HISTORY_DAYS_MAX = 550;

	/**
	 * Hasta dónde tiene sentido reconstruir, decidido por **el dato y no por una constante**.
	 *
	 * La reconstrucción multiplica participaciones por el precio de cada día, y las
	 * participaciones de una fecha pasada salen del libro de operaciones o del log de
	 * ediciones. Sin ninguno de los dos, `sharesAt()` devuelve las de hoy para todo el pasado
	 * y lo marca `estimated`: ampliar la ventana ahí no añade historia, **agranda el tramo
	 * inventado**. Y ese tramo es justo el que se excluyó del cálculo de rentabilidades por
	 * contaminarlas.
	 *
	 * Así que se pide tanto histórico como respalde el dato más antiguo que se conoce, con el
	 * mínimo de 30 días de siempre para quien no lleva libro. El otro límite —hasta dónde
	 * llega la serie de precios de cada activo— no se puede saber desde aquí y lo resuelve la
	 * propia reconstrucción marcando `paddedBefore`: medido, Yahoo tiene 229 cierres de un
	 * fondo indexado corriente y 515 de un ETF, así que varía por activo.
	 */
	ventanaHistorica: number = $derived.by(() => {
		const fechas: number[] = [];
		for (const t of this.transactions) fechas.push(t.date);
		for (const e of this.holdingEdits) fechas.push(e.date);
		if (fechas.length === 0) return PortfolioStore.HISTORY_DAYS;

		const masAntigua = Math.min(...fechas);
		const dias = Math.ceil((startOfUTCDay(new Date()) - startOfUTCDay(new Date(masAntigua))) / DAY_MS) + 1;
		return Math.min(Math.max(dias, PortfolioStore.HISTORY_DAYS), PortfolioStore.HISTORY_DAYS_MAX);
	});

	/** A qué categoría pertenece cada ticker, sin depender de `asset.category`. */
	private categoryByTicker = $derived.by(() => {
		const map: Record<string, AssetCategory> = {};
		for (const a of this.coreAssets) map[a.ticker] = 'core';
		for (const a of this.satelliteAssets) map[a.ticker] = 'satellite';
		for (const a of this.stockAssets) map[a.ticker] = 'stocks';
		return map;
	});

	private allPositions: PortfolioPosition[] = $derived([
		...this.portfolioState.positions,
		...this.satelliteState.positions,
		...this.stockState.positions
	]);

	/**
	 * Valor actual en divisa base de una participación de cada activo.
	 *
	 * Se deriva del valor que la app ya muestra (`totalValue / holdings`) en lugar
	 * de recalcular la conversión de divisa. Así el último punto del gráfico
	 * coincide por construcción con el patrimonio de cabecera y las dos cifras no
	 * pueden contradecirse.
	 */
	perShareBase: Record<string, number> = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const pos of this.allPositions) {
			map[pos.asset.ticker] =
				pos.holdings > 0
					? pos.totalValue / pos.holdings
					: pos.unitPrice * (this.pricesWithFx[pos.asset.ticker]?.fxRate ?? 1);
		}
		return map;
	});

	/**
	 * Una línea temporal por activo, con los tramos en los que las participaciones
	 * fueron constantes.
	 *
	 * El ledger y el log de ediciones producen la misma estructura: el resto del
	 * cálculo no distingue de dónde vino, así que el modo manual y el modo ledger
	 * comparten exactamente el mismo camino de código.
	 */
	positionTimelines: PositionTimeline[] = $derived.by(() => {
		return this.allUserTickers.map((ticker) =>
			this.holdings[ticker]?.useLedger
				? buildTimelineFromLedger(ticker, this.transactions)
				: buildTimelineFromEdits(ticker, this.effectiveHoldings[ticker]?.shares ?? 0, this.holdingEdits)
		);
	});

	/**
	 * Las tres series del gráfico más las dos rentabilidades.
	 *
	 * Reconstruye tramo a tramo en lugar de multiplicar las participaciones de hoy
	 * por los precios del pasado: eso último reescribía los 30 días cada vez que
	 * se editaba una posición.
	 */
	performanceSeries: PerformanceSeries = $derived.by(() => {
		// Dependencia explícita para recalcular solo cuando cambian los sparklines
		// y no en cada tick de precio.
		this.sparklineVersion;

		const days = this.ventanaHistorica;
		const priceSeries: Record<string, number[]> = {};
		const paddedBefore: Record<string, number> = {};

		/**
		 * El hueco inicial de cada activo se rellena con **la forma de su índice** cuando hay
		 * proxy, en vez de con una recta al primer precio conocido. El relleno plano afirmaba
		 * 0 % de variación en meses enteros; ver `alignPriceSeriesWithProxy`.
		 */
		let diasConProxy = 0;
		for (const pos of this.allPositions) {
			const proxyTicker = priceProxyOf(pos.asset);
			const aligned = alignPriceSeriesWithProxy(
				this.prices[pos.asset.ticker]?.sparkline,
				days,
				proxyTicker ? this.prices[proxyTicker]?.sparkline : undefined
			);
			priceSeries[pos.asset.ticker] = aligned.series;
			paddedBefore[pos.asset.ticker] = aligned.paddedBefore;
			diasConProxy = Math.max(diasConProxy, aligned.estimadoConProxy);
		}

		const reconstructed = reconstructDailySeries({
			timelines: this.positionTimelines,
			priceSeries,
			perShareBase: this.perShareBase,
			paddedBefore,
			categoryOf: this.categoryByTicker,
			days
		});

		const points = overlaySnapshots(
			reconstructed,
			this.history.map((h) => ({
				date: h.date,
				total: h.value,
				core: h.core,
				satellite: h.satellite,
				stocks: h.stocks
			}))
		);

		/**
		 * La fecha guardada más antigua, que puede quedar muy por detrás de la ventana:
		 * la reconstrucción llega hasta donde llega el sparkline (30 días) mientras los
		 * snapshots se acumulan indefinidamente. Sin este dato el gráfico no puede
		 * distinguir «no hay más historial» de «hay más y no cabe», y por eso sus rangos
		 * `YTD` y `Todo` no advertían nada.
		 */
		const oldestKnownDate = this.history.reduce<string | null>(
			(oldest, h) => (oldest === null || h.date < oldest ? h.date : oldest),
			null
		);

		return buildPerformanceSeries(points, this.globalInvested, oldestKnownDate, diasConProxy);
	});

	/** Cambios registrados que el usuario todavía no ha clasificado. */
	unclassifiedEdits: HoldingEdit[] = $derived(
		this.holdingEdits.filter((e) => e.reason === 'unclassified')
	);

	/** El cambio pendiente más reciente de cada activo, para el aviso de la tarjeta. */
	pendingEditByTicker: Record<string, HoldingEdit> = $derived.by(() => {
		const map: Record<string, HoldingEdit> = {};
		for (const edit of this.unclassifiedEdits) {
			const current = map[edit.ticker];
			if (!current || edit.createdAt > current.createdAt) map[edit.ticker] = edit;
		}
		return map;
	});


	moodColor = $derived.by(() => {
		if (this.globalDailyChangePercent > 0.005) return '#10b981';
		if (this.globalDailyChangePercent > 0) return '#34d399';
		if (this.globalDailyChangePercent < -0.005) return '#f43f5e';
		if (this.globalDailyChangePercent < 0) return '#f59e0b';
		return '#6366f1';
	});

	rebalanceResult: RebalanceResult | null = $derived(this.contribution > 0 && Object.keys(this.prices).length > 0 ? calculateRebalance(this.coreAssets, this.effectiveHoldings, this.pricesWithFx, this.contribution) : null);
	hasAnyHoldings = $derived(Object.values(this.effectiveHoldings).some((h) => h.shares > 0));

	/**
	 * Rebalanceo con su coste fiscal: qué se puede mover gratis por traspaso y
	 * qué obliga a vender.
	 *
	 * Se calcula por categoría porque es donde los pesos objetivo existen. La
	 * aportación configurada entra para poder comparar «corregir hoy» contra
	 * «corregir en N meses aportando».
	 */
	taxAwareRebalance = $derived.by(() =>
		calculateTaxAwareRebalance(
			[
				{ category: 'core' as const, positions: this.portfolioState.positions },
				{ category: 'satellite' as const, positions: this.satelliteState.positions },
				{ category: 'stocks' as const, positions: this.stockState.positions }
			],
			this.transactions,
			{ contribution: this.contribution }
		)
	);

	/**
	 * Exposición real por región y sector, y solapamiento entre posiciones.
	 *
	 * Sobre las tres categorías juntas: al usuario le da igual en qué cajón haya
	 * puesto su S&P 500, lo que quiere saber es cuánto EEUU tiene en total.
	 */
	lookThrough = $derived.by(() => calculateLookThrough(this.allPositions));

	get btcPrice() { return this.prices['BTC-EUR']?.price || 0; }
	get ethPrice() { return this.prices['ETH-EUR']?.price || 0; }
	get eurUsd() { return this.prices['EURUSD=X']?.price || 1.10; }
	get eurCad() { return this.prices['EURCAD=X']?.price || 1.50; }
	get isLocal() { return storageProvider.isLocal; }

	constructor() {
		this.initAuth();
		this.initPolling();
	}

	private async initAuth() {
		if (typeof window === 'undefined') return;
		
		// 1. Carga inmediata desde Storage (SWR approach)
		this.loadFromStorage();
		
		// 2. Si tenemos activos locales, disparamos fetch de precios de inmediato 
		// sin esperar a Firebase o Auth.
		if (this.hasAnyHoldings) {
			this.fetchPrices();
		}

		if (!storageProvider.onAuthStateChanged) {
			this.isInitialized = true;
			this.loading = false;
			return;
		}

		// Paralelizar getRedirectResult con el listener de auth
		if (!storageProvider.isLocal) {
			import('$lib/firebase').then(async ({ auth }) => {
				if (auth) {
					const { getRedirectResult } = await import('firebase/auth');
					getRedirectResult(auth).catch(e => console.error('Redirect result error:', e));
				}
			}).catch(e => console.error('Firebase load error:', e));
		}

		this.authUnsubscribe = storageProvider.onAuthStateChanged(async (user) => {
			this.authLoading = false;
			this.user = user;
			
			if (user) {
				await this.loadFromCloud();
			}

			this.isInitialized = true;
			this.loading = false;
			this.authReady = true;
		}) as (() => void) | undefined;

		// Reducimos el timeout de seguridad a 2s (era 4s)
		setTimeout(() => {
			if (!this.isInitialized) {
				this.isInitialized = true;
				this.loading = false;
				this.authReady = true;
			}
		}, 2000);
	}

	private pollingTimeoutId: ReturnType<typeof setTimeout> | undefined;
	private consecutiveErrors = 0;
	private basePollingInterval = 30000;
	private maxPollingInterval = 300000; // 5 minutos
	private visibilityHandler: (() => void) | undefined;
	private authUnsubscribe: (() => void) | undefined;
	private isFetching = false;
	/** Conjunto de tickers para el que ya se pidió el histórico largo. Ver `fetchPrices`. */
	private firmaHistorialPedido = '';

	// --- Cola de guardado en nube (evita race conditions) ---
	private _cloudSavePending = false;
	private _cloudSaveInProgress = false;
	private _cloudSaveDebounceTimer: ReturnType<typeof setTimeout> | undefined;

	private initPolling() {
		if (typeof window === 'undefined') return;
		
		const scheduleNext = (delay: number) => {
			if (this.pollingTimeoutId) clearTimeout(this.pollingTimeoutId);
			this.pollingTimeoutId = setTimeout(async () => {
				if (document.visibilityState === 'visible' && !this.loading && this.hasAnyHoldings) {
					await this.fetchPrices();
				}
				
				// Calcular siguiente delay basándose en errores
				let nextDelay = this.basePollingInterval;
				if (this.consecutiveErrors > 0) {
					nextDelay = Math.min(this.basePollingInterval * Math.pow(2, this.consecutiveErrors), this.maxPollingInterval);
				}
				scheduleNext(nextDelay);
			}, delay);
		};

		// Iniciar ciclo
		scheduleNext(this.basePollingInterval);

		this.visibilityHandler = () => { 
			if (document.visibilityState === 'visible') {
				// Al volver a la pestaña, si llevamos mucho esperando o hubo errores, forzamos un fetch inmediato
				if (!this.loading && this.hasAnyHoldings) {
					this.fetchPrices(); 
				}
			}
		};
		document.addEventListener('visibilitychange', this.visibilityHandler);
	}

	private cleanupPolling() {
		if (this.pollingTimeoutId) clearTimeout(this.pollingTimeoutId);
		if (this._cloudSaveDebounceTimer) clearTimeout(this._cloudSaveDebounceTimer);
		if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
		if (this.authUnsubscribe) this.authUnsubscribe();
	}

	/**
	 * Encola un guardado en la nube con debounce de 300ms.
	 * Garantiza que si se llaman múltiples guardados rápidamente (ej: añadir
	 * varias transacciones seguidas), solo se ejecuta UNO al final con el
	 * estado más reciente, evitando race conditions en Firestore.
	 */
	private scheduleCloudSave() {
		if (!this.user) return;
		this._cloudSavePending = true;
		if (this._cloudSaveDebounceTimer) clearTimeout(this._cloudSaveDebounceTimer);
		this._cloudSaveDebounceTimer = setTimeout(() => {
			this._flushCloudSave();
		}, 300);
	}

	private async _flushCloudSave(force = false) {
		if (!this.user) return;
		// Sin force, solo ejecutar si hay un guardado pendiente
		if (!force && !this._cloudSavePending) return;
		// Si ya hay una escritura en curso, reprogramamos para después
		if (this._cloudSaveInProgress) {
			if (!force) {
				if (this._cloudSaveDebounceTimer) clearTimeout(this._cloudSaveDebounceTimer);
				this._cloudSaveDebounceTimer = setTimeout(() => {
					this._flushCloudSave();
				}, 500);
			}
			return;
		}
		this._cloudSavePending = false;
		this._cloudSaveInProgress = true;
		try {
			const dataToSave = {
				holdings: $state.snapshot(this.holdings),
				contribution: this.contribution,
				isPrivate: this.isPrivate,
				coreAssets: $state.snapshot(this.coreAssets),
				satelliteAssets: $state.snapshot(this.satelliteAssets),
				stockAssets: $state.snapshot(this.stockAssets),
				updatedAt: new Date().toISOString()
			};
			await storageProvider.saveUserData(this.user.uid, dataToSave);
			if (storageProvider.saveTransactions) {
				await storageProvider.saveTransactions(this.user.uid, $state.snapshot(this.transactions));
			}
			// Si mientras guardábamos entró otro cambio, lo enviamos ahora
			if (this._cloudSavePending) {
				this._cloudSavePending = false;
				await this._flushCloudSave();
			}
		} catch (e) {
			console.error('Storage save error:', e);
			ui.addToast(get(LL).toasts.save_error(), 'error');
			// Reintentar si había un guardado pendiente
			if (this._cloudSavePending) {
				if (this._cloudSaveDebounceTimer) clearTimeout(this._cloudSaveDebounceTimer);
				this._cloudSaveDebounceTimer = setTimeout(() => this._flushCloudSave(), 3000);
			}
		} finally {
			this._cloudSaveInProgress = false;
		}
	}

	/** @deprecated Usar scheduleCloudSave() internamente. Mantenido para compatibilidad. */
	private saveToCloud() {
		this.scheduleCloudSave();
	}

	private async loadFromCloud() {
		if (!this.user) return;
		try {
			// Paralelizamos la carga de todos los datos del usuario
			const [userData, transactions, history, remoteEdits] = await Promise.all([
				storageProvider.loadUserData(this.user.uid),
				storageProvider.loadTransactions ? storageProvider.loadTransactions(this.user.uid) : Promise.resolve([]),
				storageProvider.loadHistory ? storageProvider.loadHistory(this.user.uid) : Promise.resolve([]),
				storageProvider.loadHoldingEdits ? storageProvider.loadHoldingEdits(this.user.uid) : Promise.resolve([])
			]);

			// El log de ediciones se une por id en lugar de resolverse por
			// last-write-wins: quedarse con la versión perdedora convertiría el
			// cambio de otro dispositivo en un escalón falso del gráfico.
			if (remoteEdits.length > 0 || this.holdingEdits.length > 0) {
				this.holdingEdits = mergeHoldingEdits(
					$state.snapshot(this.holdingEdits) as HoldingEdit[],
					remoteEdits
				);
				this.persistHoldingEdits();
			}

			let shouldLoadFromCloud = true;

			if (userData) {
				// Comparar timestamps: si el localStorage tiene datos MÁS RECIENTES
				// que Firestore (ej: guardado pendiente que no llegó a completarse),
				// subimos los datos locales en lugar de sobreescribirlos.
				const localTimestamp = localStorage.getItem('corebalance_updatedAt');
				const cloudTimestamp = userData.updatedAt;
				const localIsNewer = localTimestamp && cloudTimestamp
					? new Date(localTimestamp) > new Date(cloudTimestamp)
					: false;

				if (localIsNewer) {
					// Los datos locales son más recientes: subimos a la nube
					console.log('[Portfolio] localStorage más reciente que Firestore. Subiendo datos locales...');
					await this._flushCloudSave(true);
					shouldLoadFromCloud = false;
				} else {
					// Los datos de la nube son más recientes: los cargamos
					this.holdings = this.sanitizeHoldings(userData.holdings || {});
					this.contribution = userData.contribution || 0;
					this.isPrivate = userData.isPrivate ?? this.isPrivate;
					if (userData.coreAssets && Array.isArray(userData.coreAssets)) this.coreAssets = normalizeAssets(userData.coreAssets);
					if (userData.satelliteAssets && Array.isArray(userData.satelliteAssets)) this.satelliteAssets = normalizeAssets(userData.satelliteAssets);
					if (userData.stockAssets && Array.isArray(userData.stockAssets)) this.stockAssets = normalizeAssets(userData.stockAssets);

					// Sincronizar localStorage con los datos cargados de la nube
					this.syncLocalStorage();
				}
			} else if (Object.keys(this.holdings).length > 0 || this.coreAssets.length > 0 || this.satelliteAssets.length > 0 || this.stockAssets.length > 0) {
				// No hay datos en la nube pero sí locales: subimos los locales
				await this._flushCloudSave(true);
				shouldLoadFromCloud = false;
			}

			if (shouldLoadFromCloud) {
				// Cargar transacciones: usar las de la nube si hay más que las locales,
				// o las locales si son más recientes.
				const localTxJson = localStorage.getItem('corebalance_transactions');
				const localTxCount = localTxJson ? (JSON.parse(localTxJson) as unknown[]).length : 0;
				if (transactions && transactions.length >= localTxCount) {
					this.transactions = transactions;
					// Sincronizar localStorage con las transacciones de la nube
					try { localStorage.setItem('corebalance_transactions', JSON.stringify(transactions)); } catch (_) {}
				} else if (transactions && transactions.length > 0 && localTxCount === 0) {
					this.transactions = transactions;
				}
				// Si localTxCount > transactions.length, mantenemos las locales (ya cargadas en loadFromStorage)
				// y las subimos a la nube para sincronizar
				if (this.user && localTxCount > (transactions?.length ?? 0)) {
					console.log('[Portfolio] Más transacciones en local que en nube. Sincronizando...');
					this.scheduleCloudSave();
				}
			}
			
			// Si no venía historia en el primer bloque paralelo o está vacía, intentamos cargar/migrar
			if (history && history.length > 0) {
				this.history = history;
			} else {
				await this.loadHistory();
			}

			// Tras cargar los activos del usuario, refrescamos precios si han cambiado los activos
			await this.fetchPrices();
		} catch (e) {
			console.error('Storage load error:', e);
			ui.addToast(get(LL).toasts.load_error(), 'error');
		}
	}

	private async loadHistory() {
		if (!this.user) return;
		try {
			const points = await storageProvider.loadHistory(this.user.uid);
			if (points.length > 0) {
				this.history = points;
			} else {
				// Fallback a migración de historia local si no hay en nube
				const { localDB } = await import('$lib/db/LocalDBStorage');
				if (localDB) {
					const localHistory = await localDB.history.get('local_user');
					if (localHistory && localHistory.points.length > 0) {
						this.history = localHistory.points;
						await storageProvider.saveHistory(this.user.uid, this.history);
					}
				}
			}
		} catch (e) {
			console.error('History load error:', e);
			ui.addToast(get(LL).toasts.load_error(), 'error');
		}
	}

	private async updateHistoryPoints() {
		if (!this.user || this.globalCapital === 0) return;
		if (this.history.length === 0) await this.loadHistory();
		const today = formatDate();

		// El snapshot guarda el desglose por categoría y el flujo del día, no solo
		// el total: sin el flujo no hay forma de calcular la rentabilidad a
		// posteriori, y sin el desglose las líneas por categoría de días antiguos
		// tendrían que inventarse.
		const latest = this.performanceSeries.points[this.performanceSeries.points.length - 1];
		const currentPoint: HistoryPoint = {
			date: today,
			value: this.globalCapital,
			core: this.portfolioState.totalCapital,
			satellite: this.satelliteState.totalCapital,
			stocks: this.stockState.totalCapital,
			netFlow: latest?.date === today ? latest.netFlow : 0
		};

		let newHistory = [...$state.snapshot(this.history)];
		const index = newHistory.findIndex(p => p.date === today);
		if (index >= 0) {
			const existing = newHistory[index];
			const sameValue = Math.abs(existing.value - currentPoint.value) < 0.01;
			// Los puntos que guardaron versiones anteriores no traen desglose: aunque
			// el total no haya cambiado, hay que reescribirlos para completarlos.
			const alreadyDetailed = existing.core !== undefined && existing.netFlow !== undefined;
			if (sameValue && alreadyDetailed) return;
			newHistory[index] = currentPoint;
		} else newHistory.push(currentPoint);
		newHistory.sort((a, b) => a.date.localeCompare(b.date));
		if (newHistory.length > 365) newHistory = newHistory.slice(-365);
		this.history = newHistory;
		try {
			await storageProvider.saveHistory(this.user.uid, newHistory);
		} catch (e) {
			console.error('Update history error:', e);
			ui.addToast(get(LL).toasts.save_error(), 'error');
		}
	}

	/** Sincroniza el localStorage con el estado actual en memoria. */
	private syncLocalStorage() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY_HOLDINGS, JSON.stringify(this.holdings));
			localStorage.setItem(STORAGE_KEY_CONTRIBUTION, this.contribution.toString());
			localStorage.setItem('corebalance_privacy', this.isPrivate.toString());
			localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify({
				coreAssets: this.coreAssets,
				satelliteAssets: this.satelliteAssets,
				stockAssets: this.stockAssets
			}));
			localStorage.setItem('corebalance_transactions', JSON.stringify(this.transactions));
			localStorage.setItem(STORAGE_KEY_EDITS, JSON.stringify(this.holdingEdits));
			localStorage.setItem(STORAGE_KEY_PRICES, JSON.stringify(this.prices));
		} catch (e) { console.warn('LocalStorage sync failed:', e); }
	}

	private saveToStorage() {
		if (this.isDemo) return;
		if (typeof localStorage === 'undefined') return;
		// Guardar timestamp para comparar con la nube al recargar
		const now = new Date().toISOString();
		try { localStorage.setItem('corebalance_updatedAt', now); } catch (_) {}
		this.syncLocalStorage();
		this.scheduleCloudSave();
	}

	private sanitizeHoldings(holdings: HoldingsMap): HoldingsMap {
		const sanitized: HoldingsMap = {};
		for (const ticker in holdings) {
			if (holdings[ticker]) {
				sanitized[ticker] = {
					shares: Math.round((holdings[ticker].shares ?? 0) * 1000) / 1000,
					avgCost: Math.round((holdings[ticker].avgCost ?? 0) * 1000) / 1000,
					useLedger: holdings[ticker].useLedger ?? false
				};
			}
		}
		return sanitized;
	}

	private loadFromStorage() {
		if (typeof localStorage === 'undefined') return;
		try {
			const savedAssets = localStorage.getItem(STORAGE_KEY_ASSETS);
			if (savedAssets) {
				const parsed = JSON.parse(savedAssets);

				if (parsed.coreAssets && Array.isArray(parsed.coreAssets)) this.coreAssets = normalizeAssets(parsed.coreAssets);
				if (parsed.satelliteAssets && Array.isArray(parsed.satelliteAssets)) this.satelliteAssets = normalizeAssets(parsed.satelliteAssets);
				if (parsed.stockAssets && Array.isArray(parsed.stockAssets)) this.stockAssets = normalizeAssets(parsed.stockAssets);
			}
			const savedHoldings = localStorage.getItem(STORAGE_KEY_HOLDINGS);

			if (savedHoldings) {
				const parsed = JSON.parse(savedHoldings);
				this.holdings = this.sanitizeHoldings(parsed || {});
			} else this.holdings = {};
			const savedTransactions = localStorage.getItem('corebalance_transactions');
			if (savedTransactions) this.transactions = JSON.parse(savedTransactions) || [];
			const savedEdits = localStorage.getItem(STORAGE_KEY_EDITS);
			if (savedEdits) this.holdingEdits = JSON.parse(savedEdits) || [];
			const savedContribution = localStorage.getItem(STORAGE_KEY_CONTRIBUTION);
			if (savedContribution) this.contribution = parseFloat(savedContribution) || 0;
			this.isPrivate = localStorage.getItem('corebalance_privacy') === 'true';
			const savedPrices = localStorage.getItem(STORAGE_KEY_PRICES);
			if (savedPrices) this.prices = JSON.parse(savedPrices) || {};
		} catch (e) { console.error('Storage access error:', e); }
	}

	async login() {
		this.authLoading = true;
		try {
			if (storageProvider.login) {
				await storageProvider.login();
				if (typeof window !== 'undefined') window.location.reload();
			}
		} catch (e: unknown) {
			console.error('Error durante el login:', e);
			ui.addToast(get(LL).toasts.login_error(), 'error');
		} finally {
			this.authLoading = false;
		}
	}

	/**
	 * La cartera de este navegador, lista para viajar a otro dispositivo.
	 *
	 * ⚠️ **Vive aquí y no en el proveedor de almacenamiento a propósito.** `SyncModal`
	 * pedía los datos a `storageProvider.getAllData()`, y con `PUBLIC_USE_FIREBASE=true`
	 * —el entorno que se publica— eso es `FirebaseStorage`, que empieza con
	 * `if (!auth?.currentUser) throw`. Comprobado en pantalla: sin sesión, la pestaña
	 * del QR decía «Debes iniciar sesión para exportar datos» y no dibujaba nada, o sea
	 * que la función no existía para el usuario por defecto de una app cuyo argumento es
	 * que los datos son suyos y locales. El store sí los tiene, siempre.
	 *
	 * No lleva el historial de snapshots ni la caché de precios: el otro dispositivo los
	 * reconstruye, y meterlos es lo que sacaba el QR de su límite de tamaño.
	 */
	snapshotForTransfer(): SyncPayload {
		return {
			v: SYNC_PAYLOAD_VERSION,
			assets: {
				coreAssets: $state.snapshot(this.coreAssets) as Asset[],
				satelliteAssets: $state.snapshot(this.satelliteAssets) as Asset[],
				stockAssets: $state.snapshot(this.stockAssets) as Asset[]
			},
			holdings: $state.snapshot(this.holdings) as HoldingsMap,
			contribution: this.contribution,
			transactions: $state.snapshot(this.transactions) as Transaction[],
			holdingEdits: $state.snapshot(this.holdingEdits) as HoldingEdit[]
		};
	}

	/**
	 * Aplica un traspaso recibido: **reemplaza** la cartera de este dispositivo.
	 *
	 * Reemplazar y no fusionar es deliberado —fusionar dos carteras sin preguntar activo
	 * por activo produce posiciones duplicadas y participaciones sumadas que nadie
	 * tiene—, y por eso `/sync` lo dice con palabras y pide confirmación antes de llamar
	 * aquí. Los pesos objetivo se normalizan como en cualquier otra carga.
	 *
	 * Guarda por el camino de siempre, así que para quien ha iniciado sesión esto sube a
	 * la nube solo, sin que el traspaso tenga que saber nada de la nube.
	 */
	applyTransfer(payload: SyncPayload) {
		this.isDemo = false;
		this.coreAssets = normalizeAssets(payload.assets.coreAssets ?? []);
		this.satelliteAssets = normalizeAssets(payload.assets.satelliteAssets ?? []);
		this.stockAssets = normalizeAssets(payload.assets.stockAssets ?? []);
		this.holdings = this.sanitizeHoldings(payload.holdings ?? {});
		this.contribution = payload.contribution ?? 0;
		this.transactions = payload.transactions ?? [];
		this.holdingEdits = payload.holdingEdits ?? [];
		// El historial no viaja: el del dispositivo que recibe dejaría de corresponder a
		// esta cartera, así que se descarta y se reconstruye.
		this.history = [];
		this.saveToStorage();
	}

	async logout() {
		this.authLoading = true;
		try {
			this.cleanupPolling();
			if (storageProvider.logout) await storageProvider.logout();
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY_HOLDINGS);
				localStorage.removeItem(STORAGE_KEY_ASSETS);
				localStorage.removeItem(STORAGE_KEY_CONTRIBUTION);
				localStorage.removeItem(STORAGE_KEY_PRICES);
				localStorage.removeItem('corebalance_transactions');
				localStorage.removeItem('corebalance_updatedAt');
			}
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.removeItem('bypassLanding');
			}
			if (typeof window !== 'undefined') window.location.reload();
		} catch (e) { console.error('Logout error:', e); } finally { this.authLoading = false; }
	}

	async fetchPrices() {
		if (this.isFetching) return;
		this.isFetching = true;
		this.error = null;
		try {
			// Los proxies de índice viajan en la misma petición: son pocos, se comparten entre
			// activos del mismo índice y su precio en el mapa no crea ninguna posición.
			const tickerList = [...this.allUserTickers, ...this.proxyTickers].join(',');
			if (!tickerList) { this.isFetching = false; return; }

			/**
			 * El histórico largo se pide **una vez por conjunto de tickers**, no en cada
			 * sondeo. Ese array viaja en la respuesta de precios, que se pide cada 30 s: a
			 * 250 puntos por activo son ~20 KB extra por respuesta con nueve activos, o
			 * megabytes por hora de un dato que no se mueve durante la sesión.
			 */
			const quiereLargo = this.ventanaHistorica > PortfolioStore.HISTORY_DAYS;
			const pedirLargo = quiereLargo && this.firmaHistorialPedido !== tickerList;
			const paramHistorial = pedirLargo ? `&historyDays=${this.ventanaHistorica}` : '';

			const response = await fetch(`/api/prices?tickers=${encodeURIComponent(tickerList)}${paramHistorial}&t=${Date.now()}`, { cache: 'no-store' });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const data = await response.json();

			/**
			 * ⚠️ **Un sondeo corto no puede pisar la serie larga**, y esto no es una
			 * optimización: `this.prices = data.prices` reemplaza en bloque, así que sin esta
			 * fusión el histórico llegaba una vez y el siguiente sondeo —que pide 30 días para
			 * no inflar la respuesta— lo dejaba en 30 otra vez. El gráfico se habría encogido
			 * treinta segundos después de cargar, sin ningún error de por medio.
			 *
			 * Se conserva la más larga por activo. Los precios y todo lo demás vienen siempre
			 * de la respuesta nueva, que es la fresca.
			 */
			const recibidos: Record<string, PriceData> = data.prices || {};
			const fusionados: Record<string, PriceData> = {};
			for (const ticker in recibidos) {
				const nuevo = recibidos[ticker];
				const previo = this.prices[ticker];
				const conservarSparkline =
					!pedirLargo &&
					(previo?.sparkline?.length ?? 0) > (nuevo.sparkline?.length ?? 0);
				fusionados[ticker] = conservarSparkline
					? { ...nuevo, sparkline: previo.sparkline }
					: nuevo;
			}

			if (pedirLargo) this.firmaHistorialPedido = tickerList;

			if (detectSparklineChange(this.prices, fusionados)) {
				this.sparklineVersion++;
			}

			this.prices = fusionados;
			this.timestamp = data.timestamp || new Date().toISOString();

			// Resetear errores en éxito
			this.consecutiveErrors = 0;

			const core = applyTerUpdates(this.coreAssets, this.prices);
			const satellite = applyTerUpdates(this.satelliteAssets, this.prices);
			const stock = applyTerUpdates(this.stockAssets, this.prices);
			this.coreAssets = core.assets;
			this.satelliteAssets = satellite.assets;
			this.stockAssets = stock.assets;
			if (core.updated || satellite.updated || stock.updated) this.saveToStorage();
			if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_PRICES, JSON.stringify(this.prices));
			if (this.user) await this.updateHistoryPoints();
		} catch (e) { 
			console.error('Fetch prices error:', e); 
			this.error = e instanceof Error ? e.message : 'Error de conexión'; 
			// Incrementar errores para el backoff
			this.consecutiveErrors++;
		} finally { this.isFetching = false; }
	}


	updateHolding(ticker: string, data: Partial<HoldingData>) {
		const current = this.holdings[ticker] ?? { shares: 0, avgCost: 0, useLedger: false };
		const merged = { ...current, ...data };
		if (merged.shares !== undefined) merged.shares = Math.round(merged.shares * 1000) / 1000;
		if (merged.avgCost !== undefined) merged.avgCost = Math.round(merged.avgCost * 1000) / 1000;
		this.holdings = { ...this.holdings, [ticker]: merged };
		this.saveToStorage();
	}

	addTransaction(t: Transaction) { this.transactions = [...this.transactions, t]; this.saveToStorage(); }

	/**
	 * Alta en bloque, para la importación de un CSV con fechas.
	 *
	 * Existe por el coste: `addTransaction` guarda en cada llamada, así que un fichero de
	 * veinticinco lotes son veinticinco escrituras a IndexedDB y veinticinco recálculos de
	 * `ledgerHoldings` —que es un `$derived` sobre todo el array—. Aquí se escribe una vez.
	 */
	addTransactions(items: Transaction[]) {
		if (items.length === 0) return;
		this.transactions = [...this.transactions, ...items];
		this.saveToStorage();
	}
	removeTransaction(id: string) { this.transactions = this.transactions.filter(t => t.id !== id); this.saveToStorage(); }
	updateTransaction(id: string, updates: Partial<Transaction>) { this.transactions = this.transactions.map(t => t.id === id ? { ...t, ...updates } : t); this.saveToStorage(); }
	toggleLedger(ticker: string, enabled: boolean) { this.updateHolding(ticker, { useLedger: enabled }); }

	/**
	 * Valor base de una participación en una fecha pasada, vía el ratio del
	 * sparkline. Permite valorar correctamente un flujo que el usuario retrofecha
	 * en lugar de aplicarle el precio de hoy.
	 */
	private priceBaseAt(ticker: string, date: number): number {
		const base = this.perShareBase[ticker] ?? 0;
		if (!(base > 0)) return 0;

		const days = PortfolioStore.HISTORY_DAYS;
		const { series } = alignPriceSeries(this.prices[ticker]?.sparkline, days);
		const todayPrice = series[days - 1];
		const offset = Math.round((startOfUTCDay(new Date()) - startOfUTCDay(new Date(date))) / DAY_MS);
		const index = days - 1 - offset;
		const dayPrice = index >= 0 && index < days ? series[index] : 0;

		if (!(todayPrice > 0) || !(dayPrice > 0)) return base;
		return base * (dayPrice / todayPrice);
	}

	/**
	 * Registra un cambio de participaciones para que el gráfico pueda explicarlo.
	 *
	 * Debe llamarse al salir del campo, nunca en cada tecla: teclear "200" sobre
	 * "500" pasa por los estados 2 y 20, y anotarlos generaría flujos que no
	 * existieron.
	 *
	 * El cambio nace `unclassified`, que la reconstrucción trata como corrección.
	 * Es un sesgo deliberado: reescribir el pasado en silencio molesta menos que
	 * inventar una pérdida, y el usuario puede clasificarlo después.
	 */
	commitHoldingEdit(ticker: string, sharesBefore: number, sharesAfter: number, date?: number): HoldingEdit | null {
		if (this.isDemo) return null;
		// En modo ledger el cambio ya queda registrado como transacción.
		if (this.holdings[ticker]?.useLedger) return null;

		const before = Math.round(sharesBefore * 1000) / 1000;
		const after = Math.round(sharesAfter * 1000) / 1000;
		if (Math.abs(after - before) < 0.0001) return null;

		// Durante el alta inicial no hay pasado que explicar, así que no se pregunta.
		if (before === 0 && this.history.length === 0 && this.holdingEdits.length === 0) return null;

		const when = date ?? startOfUTCDay(new Date());
		const edit: HoldingEdit = {
			id: `${ticker}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			ticker,
			date: when,
			sharesBefore: before,
			sharesAfter: after,
			reason: 'unclassified',
			priceBase: this.priceBaseAt(ticker, when),
			origin: 'manual',
			createdAt: Date.now()
		};

		this.holdingEdits = [...this.holdingEdits, edit];
		this.persistHoldingEdits();
		return edit;
	}

	/** Clasifica un cambio pendiente, revalorando el flujo si cambia la fecha. */
	classifyEdit(id: string, reason: EditReason, options?: { date?: number }) {
		this.holdingEdits = this.holdingEdits.map((edit) => {
			if (edit.id !== id) return edit;
			const date = options?.date ?? edit.date;
			return { ...edit, reason, date, priceBase: this.priceBaseAt(edit.ticker, date) };
		});
		this.persistHoldingEdits();
	}

	/** Clasifica de golpe todos los cambios pendientes de un activo, o de todos. */
	classifyAllPending(reason: EditReason, ticker?: string) {
		this.holdingEdits = this.holdingEdits.map((edit) =>
			edit.reason === 'unclassified' && (!ticker || edit.ticker === ticker)
				? { ...edit, reason }
				: edit
		);
		this.persistHoldingEdits();
	}

	private persistHoldingEdits() {
		if (this.isDemo) return;
		const snapshot = $state.snapshot(this.holdingEdits) as HoldingEdit[];

		if (typeof localStorage !== 'undefined') {
			try { localStorage.setItem(STORAGE_KEY_EDITS, JSON.stringify(snapshot)); } catch (_) {}
		}
		if (this.user && storageProvider.saveHoldingEdits) {
			storageProvider
				.saveHoldingEdits(this.user.uid, snapshot)
				.catch((e) => console.error('Holding edits save error:', e));
		}
	}
	updateContribution(value: number) { this.contribution = value; this.saveToStorage(); }
	togglePrivacy() { this.isPrivate = !this.isPrivate; this.saveToStorage(); }

	exportJSON() {
		const data = {
			holdings: $state.snapshot(this.holdings),
			transactions: $state.snapshot(this.transactions),
			contribution: this.contribution,
			coreAssets: $state.snapshot(this.coreAssets),
			satelliteAssets: $state.snapshot(this.satelliteAssets),
			stockAssets: $state.snapshot(this.stockAssets),
			isPrivate: this.isPrivate,
			exportedAt: new Date().toISOString()
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `corebalance_export_${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		ui.addToast(get(LL).toasts.portfolio_exported(), 'success');
	}

	/** Resets all portfolio data. Confirmation must be handled by the calling component. */
	reset() {
		this.holdings = {};
		this.transactions = [];
		this.contribution = 0;
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.removeItem('bypassLanding');
		}
		this.saveToStorage();
	}

	addAsset(asset: Asset) {
		const category = asset.category;
		if (category === 'core') {
			if (this.coreAssets.some(a => a.ticker === asset.ticker)) return;
			this.coreAssets = [...this.coreAssets, asset];
		} else if (category === 'satellite') {
			if (this.satelliteAssets.some(a => a.ticker === asset.ticker)) return;
			this.satelliteAssets = [...this.satelliteAssets, asset];
		} else {
			if (this.stockAssets.some(a => a.ticker === asset.ticker)) return;
			this.stockAssets = [...this.stockAssets, asset];
		}
		this.saveToStorage();
		this.fetchPrices();
	}

	removeAsset(ticker: string) {
		this.coreAssets = this.coreAssets.filter(a => a.ticker !== ticker);
		this.satelliteAssets = this.satelliteAssets.filter(a => a.ticker !== ticker);
		this.stockAssets = this.stockAssets.filter(a => a.ticker !== ticker);
		const { [ticker]: _, ...rest } = this.holdings;
		this.holdings = rest;
		this.transactions = this.transactions.filter(t => t.ticker !== ticker);
		this.saveToStorage();
	}

	updateAsset(ticker: string, updates: Partial<Asset>) {
		const updateInList = (list: Asset[]) => list.map(a => a.ticker === ticker ? { ...a, ...updates } : a);
		this.coreAssets = updateInList(this.coreAssets);
		this.satelliteAssets = updateInList(this.satelliteAssets);
		this.stockAssets = updateInList(this.stockAssets);
		this.saveToStorage();
	}

	hasAsset(ticker: string): boolean { return this.allUserTickers.includes(ticker); }

	moveAsset(ticker: string, newCategory: AssetCategory) {
		const allAssets = [...this.coreAssets, ...this.satelliteAssets, ...this.stockAssets];
		const asset = allAssets.find(a => a.ticker === ticker);
		if (!asset || asset.category === newCategory) return;
		const updatedAsset = { ...asset, category: newCategory, targetWeight: 0 };
		this.coreAssets = this.coreAssets.filter(a => a.ticker !== ticker);
		this.satelliteAssets = this.satelliteAssets.filter(a => a.ticker !== ticker);
		this.stockAssets = this.stockAssets.filter(a => a.ticker !== ticker);
		if (newCategory === 'core') this.coreAssets = [...this.coreAssets, updatedAsset];
		else if (newCategory === 'satellite') this.satelliteAssets = [...this.satelliteAssets, updatedAsset];
		else this.stockAssets = [...this.stockAssets, updatedAsset];
		this.saveToStorage();
	}

	restoreState(state: { core: Asset[], satellite: Asset[], stock: Asset[], holdings: HoldingsMap, transactions?: Transaction[] }) {
		this.coreAssets = [...state.core];
		this.satelliteAssets = [...state.satellite];
		this.stockAssets = [...state.stock];
		this.holdings = { ...state.holdings };
		if (state.transactions) this.transactions = [...state.transactions];
		this.saveToStorage();
	}

	loadDemoData() {
		this._backup = {
			holdings: $state.snapshot(this.holdings),
			coreAssets: $state.snapshot(this.coreAssets),
			satelliteAssets: $state.snapshot(this.satelliteAssets),
			stockAssets: $state.snapshot(this.stockAssets),
			contribution: this.contribution,
			transactions: $state.snapshot(this.transactions),
			holdingEdits: $state.snapshot(this.holdingEdits) as HoldingEdit[]
		};

		this.isDemo = true;
		this.loading = true;
		this.isInitialized = true;
		
		// Sin `color`: lo reparte `assignAssetColors` unas líneas más abajo.
		type SinColor = Omit<Asset, 'color'>;

		const demoCore: SinColor[] = [
			{ ticker: 'IWDA.AS', name: 'iShares Core MSCI World', isin: 'IE00B4L5Y983', targetWeight: 0.8, category: 'core', ter: 0.002, icon: resolveAssetIcon('IWDA.AS', 'iShares Core MSCI World') },
			{ ticker: 'ZPRV.DE', name: 'SPDR MSCI USA Small Cap Value', isin: 'IE00BS166D92', targetWeight: 0.1, category: 'core', ter: 0.003, icon: resolveAssetIcon('ZPRV.DE', 'SPDR MSCI USA Small Cap Value') },
			{ ticker: 'EMIM.AS', name: 'iShares Core MSCI EM IMI', isin: 'IE00BKM4GZ66', targetWeight: 0.1, category: 'core', ter: 0.0018, icon: resolveAssetIcon('EMIM.AS', 'iShares Core MSCI EM IMI') }
		];

		const demoStocks: SinColor[] = [
			{ ticker: 'MSFT', name: 'Microsoft Corp', isin: 'US5949181045', targetWeight: 0, category: 'stocks', icon: resolveAssetIcon('MSFT', 'Microsoft Corp'), ter: 0 },
			{ ticker: 'AAPL', name: 'Apple Inc', isin: 'US0378331005', targetWeight: 0, category: 'stocks', icon: resolveAssetIcon('AAPL', 'Apple Inc'), ter: 0 },
			{ ticker: 'AMZN', name: 'Amazon.com Inc', isin: 'US0231351067', targetWeight: 0, category: 'stocks', icon: resolveAssetIcon('AMZN', 'Amazon.com Inc'), ter: 0 },
			{ ticker: 'GOOGL', name: 'Alphabet Inc', isin: 'US02079K3059', targetWeight: 0, category: 'stocks', icon: resolveAssetIcon('GOOGL', 'Alphabet Inc'), ter: 0 },
			{ ticker: 'TSLA', name: 'Tesla, Inc.', isin: 'US88160R1014', targetWeight: 0, category: 'stocks', icon: resolveAssetIcon('TSLA', 'Tesla, Inc.'), ter: 0 }
		];

		const demoSatellite: SinColor[] = [
			{ ticker: 'CASH-DEMO', name: 'Cuenta Remunerada (Demo)', isin: '', targetWeight: 0, category: 'satellite', icon: resolveAssetIcon('CASH-DEMO', 'Cuenta Remunerada (Demo)'), ter: 0, manualInterestRate: 0.03 }
		];

		/**
		 * ⚠️ **Los nueve activos del demo llevaban su color de marca a fuego**
		 * —`#00a4ef` de Microsoft, `#4285f4` de Google, `#555555` de Apple,
		 * `#ff9900` de Amazon— y como el demo es lo primero que ve cualquier
		 * visitante, la cartera de ejemplo se saltaba entera la paleta validada:
		 * tres azules casi idénticos en el mismo donut y un gris de activo que
		 * chocaba con el gris de «Otros», o sea dos porciones grises con
		 * significados distintos. Ahora reparte el mismo módulo que usa la app
		 * cuando añades un activo de verdad.
		 *
		 * ⚠️ **El reparto va sobre los tres bloques juntos, no por bloque**: por
		 * separado, la cartera principal y las acciones empezarían las dos por el
		 * primer tono y chocarían en el donut de detalle global, que los mezcla.
		 *
		 * Y el orden no es el de declaración sino el del **peso esperado**, porque
		 * `assignAssetColors` da los seis tonos distintos a los seis primeros: son
		 * los que el donut dibuja por separado antes de plegar la cola en «Otros».
		 * Con el orden de declaración, Alphabet caía séptimo, repetía el ámbar de
		 * IWDA y los dos salían juntos en pantalla.
		 */
		const porPesoEsperado = ['IWDA.AS', 'ZPRV.DE', 'AMZN', 'GOOGL', 'EMIM.AS', 'AAPL', 'MSFT', 'CASH-DEMO', 'TSLA'];
		const orden = (t: string) => {
			const i = porPesoEsperado.indexOf(t);
			return i === -1 ? porPesoEsperado.length : i;
		};
		const todos = [...demoCore, ...demoStocks, ...demoSatellite].sort(
			(a, b) => orden(a.ticker) - orden(b.ticker)
		);
		const coloreados = new Map(assignAssetColors(todos).map((a) => [a.ticker, a.color]));
		const pintar = (assets: SinColor[]): Asset[] =>
			assets.map((a) => ({ ...a, color: coloreados.get(a.ticker) ?? nextAssetColor([]) }));

		this.coreAssets = pintar(demoCore);
		this.stockAssets = pintar(demoStocks);
		this.satelliteAssets = pintar(demoSatellite);

		this.holdings = {
			'IWDA.AS': { shares: 450.5, avgCost: 72.4, useLedger: false },
			'ZPRV.DE': { shares: 120, avgCost: 45.2, useLedger: false },
			'EMIM.AS': { shares: 180, avgCost: 28.5, useLedger: false },
			'MSFT': { shares: 15, avgCost: 320.5, useLedger: false },
			'AAPL': { shares: 25, avgCost: 150.2, useLedger: false },
			'AMZN': { shares: 40, avgCost: 110.8, useLedger: false },
			'GOOGL': { shares: 30, avgCost: 125.4, useLedger: false },
			'TSLA': { shares: 10, avgCost: 185.2, useLedger: false },
			'CASH-DEMO': { shares: 5000, avgCost: 1, useLedger: false }
		};

		this.contribution = 1500;
		this.history = [];
		this.holdingEdits = [];
		this.prices = {
			'IWDA.AS': { name: 'iShares Core MSCI World', price: 88.45, currency: 'EUR', change: 0.85 },
			'ZPRV.DE': { name: 'SPDR MSCI USA Small Cap Value', price: 54.12, currency: 'EUR', change: -0.42 },
			'EMIM.AS': { name: 'iShares Core MSCI EM IMI', price: 32.18, currency: 'EUR', change: 0.12 },
			'MSFT': { name: 'Microsoft Corp', price: 415.20, currency: 'USD', change: 1.25 },
			'AAPL': { name: 'Apple Inc', price: 189.45, currency: 'USD', change: -0.85 },
			'AMZN': { name: 'Amazon.com Inc', price: 178.12, currency: 'USD', change: 2.15 },
			'GOOGL': { name: 'Alphabet Inc', price: 154.32, currency: 'USD', change: 0.45 },
			'TSLA': { name: 'Tesla, Inc.', price: 175.60, currency: 'USD', change: -3.20 },
			'CASH-DEMO': { name: 'Cuenta Remunerada (Demo)', price: 1, currency: 'EUR', change: 0 },
			'EURUSD=X': { name: 'EUR/USD', price: 1.08, currency: 'USD', change: 0 }
		};

		this.fetchPrices();
		this.loading = false;
	}

	exitDemo() {
		if (this._backup) {
			this.holdings = this._backup.holdings;
			this.coreAssets = this._backup.coreAssets;
			this.satelliteAssets = this._backup.satelliteAssets;
			this.stockAssets = this._backup.stockAssets;
			this.contribution = this._backup.contribution;
			this.transactions = this._backup.transactions;
			this.holdingEdits = this._backup.holdingEdits;
		}
		this.isDemo = false;
		this.loadFromStorage();
	}

	/** Deletes the account permanently. Confirmation must be handled by the calling component. */
	async deleteAccount() {
		this.authLoading = true;
		try {
			if (storageProvider.deleteAccount) {
				await storageProvider.deleteAccount();
				window.location.reload();
			}
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : get(LL).toasts.load_error();
			ui.addToast(msg, 'error');
		} finally { this.authLoading = false; }
	}
}

export const portfolio = new PortfolioStore();
