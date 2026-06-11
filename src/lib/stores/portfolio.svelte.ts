import { get } from 'svelte/store';
import { LL } from '$lib/i18n/i18n-svelte';
import { DEFAULT_CORE_ASSETS, DEFAULT_SATELLITE_ASSETS, DEFAULT_STOCK_ASSETS, STORAGE_KEY_HOLDINGS, STORAGE_KEY_CONTRIBUTION, STORAGE_KEY_ASSETS, STORAGE_KEY_PRICES } from '$lib/constants';
import type { Asset, AssetCategory, HoldingData, HoldingsMap, PortfolioPosition, PortfolioState, PriceData, RebalanceResult, Transaction } from '$lib/types';
import { calculatePortfolioState, calculateRebalance } from '$lib/rebalance';
import { storageProvider } from '$lib/db';
import { formatDate, resolveAssetIcon } from '$lib/utils';
import { ui } from '$lib/stores/ui.svelte';
import { goto } from '$app/navigation';
import { detectSparklineChange, applyTerUpdates } from '$lib/stores/priceUtils';

export interface User { uid: string; displayName?: string | null; photoURL?: string | null; email?: string | null; }

interface PortfolioBackup {
	holdings: HoldingsMap;
	coreAssets: Asset[];
	satelliteAssets: Asset[];
	stockAssets: Asset[];
	contribution: number;
	transactions: Transaction[];
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
	history = $state<{ date: string; value: number }[]>([]);
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
	ledgerHoldings = $derived.by(() => {
		const result: Record<string, { shares: number; avgCost: number; totalCostRaw: number; totalCostBase: number; accruedInterest: number; lastTxDate: number | null }> = {};
		const sorted = [...this.transactions].sort((a, b) => a.date - b.date);
		for (const t of sorted) {
			if (!result[t.ticker]) {
				result[t.ticker] = { shares: 0, avgCost: 0, totalCostRaw: 0, totalCostBase: 0, accruedInterest: 0, lastTxDate: null };
			}
			const pos = result[t.ticker];

			// Calcular interés acumulado hasta la fecha de esta transacción
			const asset = this.coreAssets.find(a => a.ticker === t.ticker) ||
			              this.satelliteAssets.find(a => a.ticker === t.ticker) ||
			              this.stockAssets.find(a => a.ticker === t.ticker);
			const rate = asset?.manualInterestRate || 0;

			if (pos.lastTxDate !== null && pos.shares > 0 && rate > 0) {
				const diffTime = Math.max(0, t.date - pos.lastTxDate);
				const diffDays = diffTime / (1000 * 60 * 60 * 24);
				pos.accruedInterest += pos.shares * (rate / 365) * diffDays;
			}
			pos.lastTxDate = t.date;

			if (t.type === 'buy' || t.type === 'initial_balance' || t.type === 'transfer') {
				if (t.shares > 0) {
					const txCostRaw = (t.shares * t.price) + (t.fees || 0); 
					const txCostBase = txCostRaw * (t.fxRate || 1);
					const newTotalCostRaw = pos.totalCostRaw + txCostRaw;
					const newTotalCostBase = pos.totalCostBase + txCostBase;
					const newShares = pos.shares + t.shares;
					pos.avgCost = newShares > 0 ? newTotalCostRaw / newShares : 0;
					pos.shares = newShares;
					pos.totalCostRaw = newTotalCostRaw;
					pos.totalCostBase = newTotalCostBase;
				}
			} else if (t.type === 'sell') {
				if (pos.shares > 0) {
					const ratio = Math.min(1, t.shares / pos.shares);
					pos.totalCostRaw -= pos.totalCostRaw * ratio;
					pos.totalCostBase -= pos.totalCostBase * ratio;
					pos.shares = Math.max(0, pos.shares - t.shares);
				}
			} else if (t.type === 'dividend') {
				const divAmountRaw = (t.shares * t.price) - (t.fees || 0);
				const divAmountBase = divAmountRaw * (t.fxRate || 1);
				pos.totalCostRaw -= divAmountRaw;
				pos.totalCostBase -= divAmountBase;
				pos.avgCost = pos.shares > 0 ? pos.totalCostRaw / pos.shares : 0;
			}
		}

		const today = Date.now();
		for (const ticker in result) {
			const pos = result[ticker];
			const asset = this.coreAssets.find(a => a.ticker === ticker) ||
			              this.satelliteAssets.find(a => a.ticker === ticker) ||
			              this.stockAssets.find(a => a.ticker === ticker);
			const rate = asset?.manualInterestRate || 0;

			if (pos.lastTxDate !== null && pos.shares > 0 && rate > 0) {
				const diffTime = Math.max(0, today - pos.lastTxDate);
				const diffDays = diffTime / (1000 * 60 * 60 * 24);
				pos.accruedInterest += pos.shares * (rate / 365) * diffDays;
			}

			pos.shares = Math.round(pos.shares * 1000) / 1000;
			pos.avgCost = Math.round(pos.avgCost * 1000) / 1000;
			pos.totalCostBase = Math.round(pos.totalCostBase * 1000) / 1000;
			pos.accruedInterest = Math.round(pos.accruedInterest * 1000) / 1000;
		}
		return result;
	});

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

	convertedPrices: Record<string, PriceData> = $derived.by(() => {
		const res: Record<string, PriceData> = {};
		const base = ui.baseCurrency;
		for (const [ticker, data] of Object.entries(this.prices)) {
			let price = data.price;
			const fromCurrency = data.currency || 'EUR';
			let fxRate = 1;
			if (fromCurrency !== base) {
				const fromRateToEur = this.getExchangeRateToEur(fromCurrency);
				const priceInEur = price / fromRateToEur;
				if (base === 'EUR') {
					price = priceInEur;
					fxRate = 1 / fromRateToEur;
				} else {
					const baseRateToEur = this.getExchangeRateToEur(base);
					price = priceInEur * baseRateToEur;
					fxRate = baseRateToEur / fromRateToEur;
				}
			}
			res[ticker] = { ...data, price, fxRate };
		}
		return res;
	});

	portfolioState: PortfolioState = $derived(calculatePortfolioState(this.coreAssets, this.effectiveHoldings, this.convertedPrices));
	satelliteState: PortfolioState = $derived(calculatePortfolioState(this.satelliteAssets, this.effectiveHoldings, this.convertedPrices));
	stockState: PortfolioState = $derived(calculatePortfolioState(this.stockAssets, this.effectiveHoldings, this.convertedPrices));
	globalCapital = $derived(this.portfolioState.totalCapital + this.satelliteState.totalCapital + this.stockState.totalCapital);
	globalProfit = $derived(this.portfolioState.totalProfit + this.satelliteState.totalProfit + this.stockState.totalProfit);
	globalInvested = $derived(this.portfolioState.totalInvested + this.satelliteState.totalInvested + this.stockState.totalInvested);
	globalProfitPercent = $derived(this.globalInvested > 0 ? this.globalProfit / this.globalInvested : 0);
	globalAnnualCost = $derived(this.portfolioState.totalAnnualCost + this.satelliteState.totalAnnualCost + this.stockState.totalAnnualCost);
	globalWeightedAverageTer = $derived(this.globalCapital > 0 ? this.globalAnnualCost / this.globalCapital : 0);
	globalDailyChangeValue = $derived(this.portfolioState.dailyChangeValue + this.satelliteState.dailyChangeValue + this.stockState.dailyChangeValue);
	globalDailyChangePercent = $derived(this.globalCapital > 0 ? this.globalDailyChangeValue / this.globalCapital : 0);

	sparklineVersion = $state(0); // Incrementa solo cuando cambian los sparklines de la API

	reconstructedHistory = $derived.by(() => {
		// Dependencia explícita para forzar recalculo solo cuando cambian los sparklines
		this.sparklineVersion; 
		
		const days = 30;
		const historyPoints: { date: string; total: number; core: number; stocks: number; satellite: number; }[] = [];
		for (let i = 0; i < days; i++) {
			const d = new Date();
			d.setDate(d.getDate() - (days - 1 - i));
			historyPoints.push({ date: formatDate(d), total: 0, core: 0, stocks: 0, satellite: 0 });
		}

		const processPositions = (positions: PortfolioPosition[], key: 'core' | 'stocks' | 'satellite') => {
			positions.forEach(pos => {
				if (pos.holdings <= 0 || pos.unitPrice <= 0) return;
				const spark = pos.sparkline || [];
				for (let i = 0; i < days; i++) {
					const sparkIndex = spark.length - days + i;
					const priceAtDay = (sparkIndex >= 0 && sparkIndex < spark.length) ? spark[sparkIndex] : pos.unitPrice;
					const val = pos.holdings * priceAtDay;
					historyPoints[i][key] += val;
					historyPoints[i].total += val;
				}
			});
		};

		processPositions(this.portfolioState.positions, 'core');
		processPositions(this.stockState.positions, 'stocks');
		processPositions(this.satelliteState.positions, 'satellite');

		// Si tenemos historia real que cubra más tiempo, la usamos
		if (this.history.length >= days) {
			return this.history.map(h => ({ date: h.date, total: h.value, core: h.value, stocks: 0, satellite: 0 }));
		}

		// Si tenemos historia real corta, sobreescribimos los puntos correspondientes para mayor precisión
		if (this.history.length > 0) {
			this.history.forEach(h => {
				const idx = historyPoints.findIndex(p => p.date === h.date);
				if (idx >= 0) {
					historyPoints[idx].total = h.value;
					historyPoints[idx].core = h.value;
				}
			});
		}

		return historyPoints;
	});


	moodColor = $derived.by(() => {
		if (this.globalDailyChangePercent > 0.005) return '#10b981';
		if (this.globalDailyChangePercent > 0) return '#34d399';
		if (this.globalDailyChangePercent < -0.005) return '#f43f5e';
		if (this.globalDailyChangePercent < 0) return '#f59e0b';
		return '#6366f1';
	});

	rebalanceResult: RebalanceResult | null = $derived(this.contribution > 0 && Object.keys(this.prices).length > 0 ? calculateRebalance(this.coreAssets, this.effectiveHoldings, this.convertedPrices, this.contribution) : null);
	hasAnyHoldings = $derived(Object.values(this.effectiveHoldings).some((h) => h.shares > 0));

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
		if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
		if (this.authUnsubscribe) this.authUnsubscribe();
	}

	private async saveToCloud() {
		if (!this.user) return;
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
			if (storageProvider.saveTransactions) await storageProvider.saveTransactions(this.user.uid, $state.snapshot(this.transactions));
		} catch (e) {
			console.error('Storage save error:', e);
			ui.addToast(get(LL).toasts.save_error(), 'error');
		}
	}

	private async loadFromCloud() {
		if (!this.user) return;
		try {
			// Paralelizamos la carga de todos los datos del usuario
			const [userData, transactions, history] = await Promise.all([
				storageProvider.loadUserData(this.user.uid),
				storageProvider.loadTransactions ? storageProvider.loadTransactions(this.user.uid) : Promise.resolve([]),
				storageProvider.loadHistory ? storageProvider.loadHistory(this.user.uid) : Promise.resolve([])
			]);

			if (userData) {
				this.holdings = this.sanitizeHoldings(userData.holdings || {});
				this.contribution = userData.contribution || 0;
				this.isPrivate = userData.isPrivate ?? this.isPrivate;
				if (userData.coreAssets && Array.isArray(userData.coreAssets)) this.coreAssets = userData.coreAssets;
				if (userData.satelliteAssets && Array.isArray(userData.satelliteAssets)) this.satelliteAssets = userData.satelliteAssets;
				if (userData.stockAssets && Array.isArray(userData.stockAssets)) this.stockAssets = userData.stockAssets;
			} else if (Object.keys(this.holdings).length > 0 || this.coreAssets.length > 0 || this.satelliteAssets.length > 0 || this.stockAssets.length > 0) {
				await this.saveToCloud();
			}

			if (transactions) this.transactions = transactions;
			
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
		const currentPoint = { date: today, value: this.globalCapital };
		let newHistory = [...$state.snapshot(this.history)];
		const index = newHistory.findIndex(p => p.date === today);
		if (index >= 0) {
			if (Math.abs(newHistory[index].value - currentPoint.value) < 0.01) return;
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

	private saveToStorage() {
		if (this.isDemo) return;
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
			localStorage.setItem(STORAGE_KEY_PRICES, JSON.stringify(this.prices));
		} catch (e) { console.warn('Storage save failed:', e); }
		this.saveToCloud();
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
				const ensureIcons = (assets: Asset[]) => assets.map(a => ({
					...a,
					icon: a.icon || resolveAssetIcon(a.ticker, a.name)
				}));

				if (parsed.coreAssets && Array.isArray(parsed.coreAssets)) this.coreAssets = ensureIcons(parsed.coreAssets);
				if (parsed.satelliteAssets && Array.isArray(parsed.satelliteAssets)) this.satelliteAssets = ensureIcons(parsed.satelliteAssets);
				if (parsed.stockAssets && Array.isArray(parsed.stockAssets)) this.stockAssets = ensureIcons(parsed.stockAssets);
			}
			const savedHoldings = localStorage.getItem(STORAGE_KEY_HOLDINGS);

			if (savedHoldings) {
				const parsed = JSON.parse(savedHoldings);
				this.holdings = this.sanitizeHoldings(parsed || {});
			} else this.holdings = {};
			const savedTransactions = localStorage.getItem('corebalance_transactions');
			if (savedTransactions) this.transactions = JSON.parse(savedTransactions) || [];
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
			const tickerList = this.allUserTickers.join(',');
			if (!tickerList) { this.isFetching = false; return; }
			const response = await fetch(`/api/prices?tickers=${encodeURIComponent(tickerList)}&t=${Date.now()}`, { cache: 'no-store' });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const data = await response.json();

			if (detectSparklineChange(this.prices, data.prices)) {
				this.sparklineVersion++;
			}

			this.prices = data.prices || {};
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
	removeTransaction(id: string) { this.transactions = this.transactions.filter(t => t.id !== id); this.saveToStorage(); }
	updateTransaction(id: string, updates: Partial<Transaction>) { this.transactions = this.transactions.map(t => t.id === id ? { ...t, ...updates } : t); this.saveToStorage(); }
	toggleLedger(ticker: string, enabled: boolean) { this.updateHolding(ticker, { useLedger: enabled }); }
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
			transactions: $state.snapshot(this.transactions)
		};

		this.isDemo = true;
		this.loading = true;
		this.isInitialized = true;
		
		this.coreAssets = [
			{ ticker: 'IWDA.AS', name: 'iShares Core MSCI World', isin: 'IE00B4L5Y983', targetWeight: 0.8, category: 'core', color: '#3b82f6', ter: 0.002, icon: resolveAssetIcon('IWDA.AS', 'iShares Core MSCI World') },
			{ ticker: 'ZPRV.DE', name: 'SPDR MSCI USA Small Cap Value', isin: 'IE00BS166D92', targetWeight: 0.1, category: 'core', color: '#10b981', ter: 0.003, icon: resolveAssetIcon('ZPRV.DE', 'SPDR MSCI USA Small Cap Value') },
			{ ticker: 'EMIM.AS', name: 'iShares Core MSCI EM IMI', isin: 'IE00BKM4GZ66', targetWeight: 0.1, category: 'core', color: '#f59e0b', ter: 0.0018, icon: resolveAssetIcon('EMIM.AS', 'iShares Core MSCI EM IMI') }
		];

		this.stockAssets = [
			{ ticker: 'MSFT', name: 'Microsoft Corp', isin: 'US5949181045', targetWeight: 0, category: 'stocks', color: '#00a4ef', icon: resolveAssetIcon('MSFT', 'Microsoft Corp'), ter: 0 },
			{ ticker: 'AAPL', name: 'Apple Inc', isin: 'US0378331005', targetWeight: 0, category: 'stocks', color: '#555555', icon: resolveAssetIcon('AAPL', 'Apple Inc'), ter: 0 },
			{ ticker: 'AMZN', name: 'Amazon.com Inc', isin: 'US0231351067', targetWeight: 0, category: 'stocks', color: '#ff9900', icon: resolveAssetIcon('AMZN', 'Amazon.com Inc'), ter: 0 },
			{ ticker: 'GOOGL', name: 'Alphabet Inc', isin: 'US02079K3059', targetWeight: 0, category: 'stocks', color: '#4285f4', icon: resolveAssetIcon('GOOGL', 'Alphabet Inc'), ter: 0 },
			{ ticker: 'TSLA', name: 'Tesla, Inc.', isin: 'US88160R1014', targetWeight: 0, category: 'stocks', color: '#e81010', icon: resolveAssetIcon('TSLA', 'Tesla, Inc.'), ter: 0 }
		];

		this.satelliteAssets = [
			{ ticker: 'CASH-DEMO', name: 'Cuenta Remunerada (Demo)', isin: '', targetWeight: 0, category: 'satellite', color: '#6366f1', icon: resolveAssetIcon('CASH-DEMO', 'Cuenta Remunerada (Demo)'), ter: 0, manualInterestRate: 0.03 }
		];

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
