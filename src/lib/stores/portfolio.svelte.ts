import { DEFAULT_CORE_ASSETS, DEFAULT_SATELLITE_ASSETS, DEFAULT_STOCK_ASSETS, STORAGE_KEY_HOLDINGS, STORAGE_KEY_CONTRIBUTION, STORAGE_KEY_ASSETS, STORAGE_KEY_PRICES } from '$lib/constants';
import type { Asset, AssetCategory, HoldingData, HoldingsMap, PortfolioState, PriceData, RebalanceResult, Transaction } from '$lib/types';
import { calculatePortfolioState, calculateRebalance } from '$lib/rebalance';
import { storageProvider } from '$lib/db';
import { formatDate, resolveAssetIcon } from '$lib/utils';
import { ui } from '$lib/stores/ui.svelte';
import { goto } from '$app/navigation';

export interface User { uid: string; displayName?: string | null; photoURL?: string | null; email?: string | null; }

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
	dailyChange = $state({ value: 0, percent: 0 });
	authLoading = $state(false);
	authReady = $state(false);
	isDemo = $state(false);

	// --- User-Configurable Assets ---
	coreAssets = $state<Asset[]>([...DEFAULT_CORE_ASSETS]);
	satelliteAssets = $state<Asset[]>([...DEFAULT_SATELLITE_ASSETS]);
	stockAssets = $state<Asset[]>([...DEFAULT_STOCK_ASSETS]);

	// --- Internal Backup for Demo Mode ---
	private _backup: any = null;

	// --- Derived State ---
	ledgerHoldings = $derived.by(() => {
		const result: Record<string, { shares: number; avgCost: number; totalCostRaw: number }> = {};
		const sorted = [...this.transactions].sort((a, b) => a.date - b.date);
		for (const t of sorted) {
			if (!result[t.ticker]) result[t.ticker] = { shares: 0, avgCost: 0, totalCostRaw: 0 };
			const pos = result[t.ticker];
			if (t.type === 'buy' || t.type === 'initial_balance' || t.type === 'transfer') {
				if (t.shares > 0) {
					const txCostRaw = (t.shares * t.price) + (t.fees || 0); 
					const newTotalCostRaw = pos.totalCostRaw + txCostRaw;
					const newShares = pos.shares + t.shares;
					pos.avgCost = newShares > 0 ? newTotalCostRaw / newShares : 0;
					pos.shares = newShares;
					pos.totalCostRaw = newTotalCostRaw;
				}
			} else if (t.type === 'sell') {
				if (pos.shares > 0) {
					const ratio = Math.min(1, t.shares / pos.shares);
					pos.totalCostRaw -= pos.totalCostRaw * ratio;
					pos.shares -= t.shares;
				}
			} else if (t.type === 'dividend') {
				const divAmountRaw = (t.shares * t.price) - (t.fees || 0);
				pos.totalCostRaw -= divAmountRaw;
				pos.avgCost = pos.shares > 0 ? pos.totalCostRaw / pos.shares : 0;
			}
		}
		for (const ticker in result) {
			result[ticker].shares = Math.round(result[ticker].shares * 1000) / 1000;
			result[ticker].avgCost = Math.round(result[ticker].avgCost * 1000) / 1000;
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
					useLedger: true
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

	reconstructedHistory = $derived.by(() => {
		const days = 30;
		const historyPoints: any[] = [];
		for (let i = 0; i < days; i++) {
			const d = new Date();
			d.setDate(d.getDate() - (days - 1 - i));
			historyPoints.push({ date: formatDate(d), total: 0, core: 0, stocks: 0, satellite: 0 });
		}

		const processPositions = (positions: any[], key: 'core' | 'stocks' | 'satellite') => {
			positions.forEach(pos => {
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
		if (!storageProvider.onAuthStateChanged) {
			this.loadFromStorage();
			if (this.hasAnyHoldings) {
				await this.fetchPrices();
			}
			this.isInitialized = true;
			this.loading = false;
			return;
		}
		if (!storageProvider.isLocal) {
			try {
				const { auth } = await import('$lib/firebase');
				if (auth) {
					const { getRedirectResult } = await import('firebase/auth');
					await getRedirectResult(auth);
				}
			} catch (e) { console.error('Redirect result error:', e); }
		}
		this.loadFromStorage();
		this.authUnsubscribe = storageProvider.onAuthStateChanged(async (user) => {
			this.authLoading = false;
			this.user = user;
			if (user) {
				await this.loadFromCloud();
			} else {
				if (this.hasAnyHoldings) {
					await this.fetchPrices();
				}
			}
			this.isInitialized = true;
			this.loading = false;
			this.authReady = true;
		}) as (() => void) | undefined;
		setTimeout(() => {
			if (!this.isInitialized) {
				this.loadFromStorage();
				if (this.hasAnyHoldings) {
					this.fetchPrices();
				}
				this.isInitialized = true;
				this.loading = false;
				this.authReady = true;
			}
		}, 8000);
	}

	private pollingIntervalId: ReturnType<typeof setInterval> | undefined;
	private visibilityHandler: (() => void) | undefined;
	private authUnsubscribe: (() => void) | undefined;
	private isFetching = false;

	private initPolling() {
		if (typeof window === 'undefined') return;
		if (this.hasAnyHoldings) {
			this.fetchPrices();
		}
		this.pollingIntervalId = setInterval(() => { 
			if (document.visibilityState === 'visible' && !this.loading && this.hasAnyHoldings) {
				this.fetchPrices(); 
			}
		}, 30000);
		this.visibilityHandler = () => { 
			if (document.visibilityState === 'visible' && !this.loading && this.hasAnyHoldings) {
				this.fetchPrices(); 
			}
		};
		document.addEventListener('visibilitychange', this.visibilityHandler);
	}

	private cleanupPolling() {
		if (this.pollingIntervalId) clearInterval(this.pollingIntervalId);
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
		} catch (e) { console.error('Storage save error:', e); }
	}

	private async loadFromCloud() {
		if (!this.user) return;
		try {
			const data = await storageProvider.loadUserData(this.user.uid);
			if (data) {
				this.holdings = this.sanitizeHoldings(data.holdings || {});
				this.contribution = data.contribution || 0;
				this.isPrivate = data.isPrivate ?? this.isPrivate;
				if (data.coreAssets && Array.isArray(data.coreAssets)) this.coreAssets = data.coreAssets;
				if (data.satelliteAssets && Array.isArray(data.satelliteAssets)) this.satelliteAssets = data.satelliteAssets;
				if (data.stockAssets && Array.isArray(data.stockAssets)) this.stockAssets = data.stockAssets;
			} else if (Object.keys(this.holdings).length > 0 || this.coreAssets.length > 0 || this.satelliteAssets.length > 0 || this.stockAssets.length > 0) {
				await this.saveToCloud();
			}
			if (storageProvider.loadTransactions) this.transactions = await storageProvider.loadTransactions(this.user.uid);
			await this.loadHistory();
			await this.fetchPrices();
		} catch (e) { console.error('Storage load error:', e); }
	}

	private async loadHistory() {
		if (!this.user) return;
		try {
			const points = await storageProvider.loadHistory(this.user.uid);
			if (points.length > 0) {
				this.history = points;
				this.calculateDailyChange();
			} else {
				const { localDB } = await import('$lib/db/LocalDBStorage');
				if (localDB) {
					const localHistory = await localDB.history.get('local_user');
					if (localHistory && localHistory.points.length > 0) {
						this.history = localHistory.points;
						this.calculateDailyChange();
						await storageProvider.saveHistory(this.user.uid, this.history);
					}
				}
			}
		} catch (e) { console.error('History load error:', e); }
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
		try { await storageProvider.saveHistory(this.user.uid, newHistory); this.calculateDailyChange(); } catch (e) { console.error('Update history error:', e); }
	}

	private calculateDailyChange() {
		if (this.history.length < 2) return;
		const last = this.history[this.history.length - 1].value;
		const prev = this.history[this.history.length - 2].value;
		this.dailyChange = { value: last - prev, percent: prev > 0 ? (last - prev) / prev : 0 };
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
		} catch (e) { console.error('Error durante el login:', e); } finally { this.authLoading = false; }
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
			this.prices = data.prices || {};
			this.timestamp = data.timestamp || new Date().toISOString();
			let assetsUpdated = false;
			const updateAssetTers = (assets: Asset[]): Asset[] => {
				return assets.map(asset => {
					const priceInfo = this.prices[asset.ticker];
					if (priceInfo && priceInfo.ter !== undefined && priceInfo.ter > 0 && asset.ter === 0) {
						assetsUpdated = true;
						return { ...asset, ter: priceInfo.ter };
					}
					return asset;
				});
			};
			this.coreAssets = updateAssetTers(this.coreAssets);
			this.satelliteAssets = updateAssetTers(this.satelliteAssets);
			this.stockAssets = updateAssetTers(this.stockAssets);
			if (assetsUpdated) this.saveToStorage();
			if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_PRICES, JSON.stringify(this.prices));
			if (this.user) await this.updateHistoryPoints();
		} catch (e) { console.error('Fetch prices error:', e); this.error = e instanceof Error ? e.message : 'Error de conexión'; } finally { this.isFetching = false; }
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
		ui.addToast('Cartera exportada correctamente', 'success');
	}

	reset() {
		if (confirm('¿Seguro que quieres borrar toda la cartera?')) {
			this.holdings = {};
			this.transactions = [];
			this.contribution = 0;
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.removeItem('bypassLanding');
			}
			this.saveToStorage();
		}
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
			{ ticker: 'CASH-DEMO', name: 'Cuenta Remunerada (Demo)', isin: '', targetWeight: 0, category: 'satellite', color: '#6366f1', icon: resolveAssetIcon('CASH-DEMO', 'Cuenta Remunerada (Demo)'), ter: 0 }
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

	async deleteAccount() {
		if (!confirm('¿ESTÁS SEGURO? Esta acción es irreversible y borrará todos tus activos e historial definitivamente.')) return;
		this.authLoading = true;
		try {
			if (storageProvider.deleteAccount) {
				await storageProvider.deleteAccount();
				window.location.reload();
			}
		} catch (e: any) { alert(e.message || 'Error al eliminar la cuenta'); } finally { this.authLoading = false; }
	}
}

export const portfolio = new PortfolioStore();
