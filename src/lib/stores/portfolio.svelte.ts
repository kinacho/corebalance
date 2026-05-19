import { DEFAULT_CORE_ASSETS, DEFAULT_SATELLITE_ASSETS, DEFAULT_STOCK_ASSETS, STORAGE_KEY_HOLDINGS, STORAGE_KEY_CONTRIBUTION, STORAGE_KEY_ASSETS, STORAGE_KEY_PRICES } from '$lib/constants';
import type { Asset, AssetCategory, HoldingData, HoldingsMap, PortfolioState, PriceData, RebalanceResult } from '$lib/types';
import { calculatePortfolioState, calculateRebalance } from '$lib/rebalance';
import { storageProvider } from '$lib/db';
import { formatDate } from '$lib/utils';
import { ui } from '$lib/stores/ui.svelte';

export interface User { uid: string; displayName?: string | null; photoURL?: string | null; email?: string | null; }

export class PortfolioStore {
	// --- State (Runes) ---
	holdings = $state<HoldingsMap>({});
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



	// --- User-Configurable Assets ---
	coreAssets = $state<Asset[]>([...DEFAULT_CORE_ASSETS]);
	satelliteAssets = $state<Asset[]>([...DEFAULT_SATELLITE_ASSETS]);
	stockAssets = $state<Asset[]>([...DEFAULT_STOCK_ASSETS]);

	// --- Derived State ---


	/** Label dinámico basado en los pesos reales del Core */
	targetLabel = $derived.by(() => {
		const weights = this.coreAssets.map(a => Math.round(a.targetWeight * 100));
		return weights.join(' / ') || 'Custom';
	});

	/** Todos los tickers del usuario (para enviar al API) */
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
		// Fallbacks si no se encontró el par live
		if (currency === 'USD') return this.prices['EURUSD=X']?.price || 1.10;
		if (currency === 'CAD') return this.prices['EURCAD=X']?.price || 1.50;
		if (currency === 'GBP') return this.prices['EURGBP=X']?.price || 0.85;
		if (currency === 'CHF') return this.prices['EURCHF=X']?.price || 0.95;
		if (currency === 'AUD') return this.prices['EURAUD=X']?.price || 1.65;
		if (currency === 'JPY') return this.prices['EURJPY=X']?.price || 160;
		return 1; // Fallback final
	}

	convertedPrices: Record<string, PriceData> = $derived.by(() => {
		const res: Record<string, PriceData> = {};
		const base = ui.baseCurrency;
		for (const [ticker, data] of Object.entries(this.prices)) {
			let price = data.price;
			const fromCurrency = data.currency || 'EUR';
			
			if (fromCurrency !== base) {
				const fromRateToEur = this.getExchangeRateToEur(fromCurrency);
				const priceInEur = price / fromRateToEur;
				
				if (base === 'EUR') {
					price = priceInEur;
				} else {
					const baseRateToEur = this.getExchangeRateToEur(base);
					price = priceInEur * baseRateToEur;
				}
			}

			res[ticker] = { ...data, price };
		}
		return res;
	});

	portfolioState: PortfolioState = $derived(
		calculatePortfolioState(this.coreAssets, this.holdings, this.convertedPrices)
	);

	satelliteState: PortfolioState = $derived(
		calculatePortfolioState(this.satelliteAssets, this.holdings, this.convertedPrices)
	);

	stockState: PortfolioState = $derived(
		calculatePortfolioState(this.stockAssets, this.holdings, this.convertedPrices)
	);

	globalCapital = $derived(this.portfolioState.totalCapital + this.satelliteState.totalCapital + this.stockState.totalCapital);
	globalProfit = $derived(this.portfolioState.totalProfit + this.satelliteState.totalProfit + this.stockState.totalProfit);
	globalInvested = $derived(this.portfolioState.totalInvested + this.satelliteState.totalInvested + this.stockState.totalInvested);
	globalProfitPercent = $derived(this.globalInvested > 0 ? this.globalProfit / this.globalInvested : 0);
	globalAnnualCost = $derived(this.portfolioState.totalAnnualCost + this.satelliteState.totalAnnualCost + this.stockState.totalAnnualCost);
	globalWeightedAverageTer = $derived(this.globalCapital > 0 ? this.globalAnnualCost / this.globalCapital : 0);

	globalDailyChangeValue = $derived(
		this.portfolioState.dailyChangeValue + 
		this.satelliteState.dailyChangeValue + 
		this.stockState.dailyChangeValue
	);
	globalDailyChangePercent = $derived(
		this.globalCapital > 0 ? this.globalDailyChangeValue / this.globalCapital : 0
	);

	// Reconstruir historia de los últimos 7 días usando los sparklines de los activos
	// (Fallback si la historia de Firebase está vacía o es insuficiente)
	reconstructedHistory = $derived.by(() => {
		const days = 30; // Mostrar hasta 30 días reconstruidos
		const historyPoints: { 
			date: string, 
			total: number,
			core: number,
			stocks: number,
			satellite: number
		}[] = [];
		
		// Inicializar puntos con fechas reales
		for (let i = 0; i < days; i++) {
			const d = new Date();
			d.setDate(d.getDate() - (days - 1 - i));
			historyPoints.push({ 
				date: formatDate(d), 
				total: 0,
				core: 0,
				stocks: 0,
				satellite: 0
			});
		}

		let hasData = false;
		
		const processPositions = (positions: any[], key: 'core' | 'stocks' | 'satellite') => {
			positions.forEach(pos => {
				const spark = pos.sparkline || [];
				if (spark.length > 0) hasData = true;
				
				for (let i = 0; i < days; i++) {
					const priceAtDay = spark[spark.length - days + i] || pos.unitPrice;
					const val = pos.holdings * priceAtDay;
					historyPoints[i][key] += val;
					historyPoints[i].total += val;
				}
			});
		};

		processPositions(this.portfolioState.positions, 'core');
		processPositions(this.stockState.positions, 'stocks');
		processPositions(this.satelliteState.positions, 'satellite');

		// Si no hay datos de sparklines o la historia real es más larga, devolvemos historia real adaptada
		if (!hasData || this.history.length >= days) {
			return this.history.map(h => ({
				date: h.date,
				total: h.value,
				core: h.value, // Fallback: todo al core si no hay breakdown real
				stocks: 0,
				satellite: 0
			}));
		}

		return historyPoints;
	});

	moodColor = $derived.by(() => {
		if (this.globalDailyChangePercent > 0.005) return '#10b981'; // Esmeralda (muy positivo)
		if (this.globalDailyChangePercent > 0) return '#34d399';    // Verde (positivo)
		if (this.globalDailyChangePercent < -0.005) return '#f43f5e'; // Rosa/Rojo (muy negativo)
		if (this.globalDailyChangePercent < 0) return '#f59e0b';    // Ámbar (negativo)
		return '#6366f1'; // Índigo (neutral)
	});

	rebalanceResult: RebalanceResult | null = $derived(
		this.contribution > 0 && Object.keys(this.prices).length > 0
			? calculateRebalance(this.coreAssets, this.holdings, this.convertedPrices, this.contribution)
			: null
	);

	hasAnyHoldings = $derived(
		Object.values(this.holdings).some((h) => h.shares > 0)
	);

	// Precios live para referencias rápidas en UI
	get btcPrice() { return this.prices['BTC-EUR']?.price || 0; }
	get ethPrice() { return this.prices['ETH-EUR']?.price || 0; }
	get eurUsd() { return this.prices['EURUSD=X']?.price || 1.10; }
	get eurCad() { return this.prices['EURCAD=X']?.price || 1.50; }
	get isLocal() { return storageProvider.isLocal; }

	constructor() {
		this.initAuth();
		this.initPolling();

	}

	// --- Private Methods ---
	private async initAuth() {
		if (typeof window === 'undefined') return;
		
		// Si no hay provider de autenticación, usar solo almacenamiento local
		if (!storageProvider.onAuthStateChanged) {
			this.loadFromStorage();
			await this.fetchPrices();
			await new Promise(resolve => setTimeout(resolve, 300));
			this.isInitialized = true;
			this.loading = false;
			return;
		}

		// Manejar el resultado de redirección (si venimos de un login por redirect)
		if (!storageProvider.isLocal) {
			try {
				const { auth } = await import('$lib/firebase');
				if (auth) {
					const { getRedirectResult } = await import('firebase/auth');
					await getRedirectResult(auth);
				}
			} catch (e) {
				console.error('Redirect result error:', e);
			}
		}

		// Carga inicial inmediata de caché local para evitar ceros (Offline-first)
		this.loadFromStorage();

		// Esperamos a saber quién es el usuario antes de quitar el splash screen
		this.authUnsubscribe = storageProvider.onAuthStateChanged(async (user) => {
			this.authLoading = false;
			this.user = user;
			
			if (user) {
				// El usuario está logueado, sincronizamos con la nube
				await this.loadFromCloud(); 
			} else {
				// No hay usuario, nos aseguramos de tener los últimos precios para los datos locales
				await this.fetchPrices();
			}
			
			// Retardo artificial para transición suave
			await new Promise(resolve => setTimeout(resolve, 400));
			
			this.isInitialized = true;
			this.loading = false;
			this.authReady = true;
		}) as (() => void) | undefined;

		// Salvaguarda extrema: Si Firebase o la red se cuelgan, liberamos la UI en 8s
		// Pero solo si no hemos terminado ya la inicialización
		setTimeout(() => {
			if (!this.isInitialized) {
				console.warn('CoreBalance: La inicialización ha tardado demasiado, forzando liberación de UI...');
				this.loadFromStorage();
				this.fetchPrices();
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
		
		// Fetch inicial
		this.fetchPrices();

		// Polling cada 30 segundos si la pestaña está activa
		this.pollingIntervalId = setInterval(() => {
			if (document.visibilityState === 'visible' && !this.loading) {
				this.fetchPrices();
			}
		}, 30000);

		// Refresco inmediato al volver a la pestaña
		this.visibilityHandler = () => {
			if (document.visibilityState === 'visible' && !this.loading) {
				this.fetchPrices();
			}
		};
		document.addEventListener('visibilitychange', this.visibilityHandler);
	}

	/** Limpia timers y listeners para evitar zombies tras logout */
	private cleanupPolling() {
		if (this.pollingIntervalId) {
			clearInterval(this.pollingIntervalId);
			this.pollingIntervalId = undefined;
		}
		if (this.visibilityHandler) {
			document.removeEventListener('visibilitychange', this.visibilityHandler);
			this.visibilityHandler = undefined;
		}
		if (this.authUnsubscribe) {
			this.authUnsubscribe();
			this.authUnsubscribe = undefined;
		}
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
		} catch (e) {
			console.error('Storage save error:', e);
		}
	}

	private async loadFromCloud() {
		if (!this.user) return;
		try {
			const data = await storageProvider.loadUserData(this.user.uid);
			if (data) {
				this.holdings = this.sanitizeHoldings(data.holdings || {});
				this.contribution = data.contribution || 0;
				this.isPrivate = data.isPrivate ?? this.isPrivate;
				
				if (data.coreAssets && Array.isArray(data.coreAssets)) {
					this.coreAssets = data.coreAssets;
				}
				if (data.satelliteAssets && Array.isArray(data.satelliteAssets)) {
					this.satelliteAssets = data.satelliteAssets;
				}
				if (data.stockAssets && Array.isArray(data.stockAssets)) {
					this.stockAssets = data.stockAssets;
				}
			} else if (
				Object.keys(this.holdings).length > 0 || 
				this.coreAssets.length > 0 || 
				this.satelliteAssets.length > 0 || 
				this.stockAssets.length > 0
			) {
				// MIGRACIÓN SILENCIOSA: La nube está vacía pero hay configuración local
				console.log('CoreBalance: Migrando configuración local a la nube...');
				await this.saveToCloud();
			}
			
			// Cargar historial después de los datos de la cartera
			await this.loadHistory();
			
			// Re-fetch precios con los nuevos tickers del usuario
			await this.fetchPrices();
		} catch (e) {
			console.error('Storage load error:', e);
		}
	}



	private async loadHistory() {
		if (!this.user) return;
		try {
			const points = await storageProvider.loadHistory(this.user.uid);
			if (points.length > 0) {
				this.history = points;
				this.calculateDailyChange();
			} else {
				// MIGRACIÓN DE HISTORIAL: Si no hay en la nube, mirar en la DB local
				const { localDB } = await import('$lib/db/LocalDBStorage');
				if (localDB) {
					const localHistory = await localDB.history.get('local_user');
					if (localHistory && localHistory.points.length > 0) {
						console.log('CoreBalance: Migrando historial local a la nube...');
						this.history = localHistory.points;
						this.calculateDailyChange();
						await storageProvider.saveHistory(this.user.uid, this.history);
					}
				}
			}
		} catch (e) {
			console.error('History load error:', e);
		}
	}

	private async updateHistoryPoints() {
		if (!this.user || this.globalCapital === 0) return;
		
		if (this.history.length === 0) {
			await this.loadHistory();
		}

		const today = formatDate();
		const currentPoint = { date: today, value: this.globalCapital };
		
		let newHistory = [...$state.snapshot(this.history)];
		const index = newHistory.findIndex(p => p.date === today);
		
		if (index >= 0) {
			if (Math.abs(newHistory[index].value - currentPoint.value) < 0.01) return;
			newHistory[index] = currentPoint;
		} else {
			newHistory.push(currentPoint);
		}

		newHistory.sort((a, b) => a.date.localeCompare(b.date));
		
		// Mantener hasta un año de historia diaria (365 puntos)
		if (newHistory.length > 365) newHistory = newHistory.slice(-365);

		this.history = newHistory;
		
		try {
			await storageProvider.saveHistory(this.user.uid, newHistory);
			this.calculateDailyChange();
		} catch (e) {
			console.error('Update history error:', e);
		}
	}

	private calculateDailyChange() {
		if (this.history.length < 2) return;
		
		const last = this.history[this.history.length - 1].value;
		const prev = this.history[this.history.length - 2].value;
		
		this.dailyChange = {
			value: last - prev,
			percent: prev > 0 ? (last - prev) / prev : 0
		};
	}

	private saveToStorage() {
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
			// Caché de precios para carga instantánea
			localStorage.setItem(STORAGE_KEY_PRICES, JSON.stringify(this.prices));
		} catch (e) {

			console.warn('Storage save failed (possibly incognito or quota full):', e);
		}
		this.saveToCloud();
	}

	private sanitizeHoldings(holdings: HoldingsMap): HoldingsMap {
		const sanitized: HoldingsMap = {};
		for (const ticker in holdings) {
			if (holdings[ticker]) {
				sanitized[ticker] = {
					shares: Math.round((holdings[ticker].shares ?? 0) * 1000) / 1000,
					avgCost: Math.round((holdings[ticker].avgCost ?? 0) * 1000) / 1000
				};
			}
		}
		return sanitized;
	}

	private loadFromStorage() {
		if (typeof localStorage === 'undefined') return;
		
		try {
			// Cargar configuración de activos guardada
			const savedAssets = localStorage.getItem(STORAGE_KEY_ASSETS);
			if (savedAssets) {
				const parsed = JSON.parse(savedAssets);
				if (parsed.coreAssets && Array.isArray(parsed.coreAssets)) {
					this.coreAssets = parsed.coreAssets;
				}
				if (parsed.satelliteAssets && Array.isArray(parsed.satelliteAssets)) {
					this.satelliteAssets = parsed.satelliteAssets;
				}
				if (parsed.stockAssets && Array.isArray(parsed.stockAssets)) {
					this.stockAssets = parsed.stockAssets;
				}
			}

			const savedHoldings = localStorage.getItem(STORAGE_KEY_HOLDINGS);
			if (savedHoldings) {
				const parsed = JSON.parse(savedHoldings);
				this.holdings = this.sanitizeHoldings(parsed || {});
			} else {
				this.holdings = {};
			}

			const savedContribution = localStorage.getItem(STORAGE_KEY_CONTRIBUTION);
			if (savedContribution) {
				this.contribution = parseFloat(savedContribution) || 0;
			}

			this.isPrivate = localStorage.getItem('corebalance_privacy') === 'true';

			// Cargar caché de precios
			const savedPrices = localStorage.getItem(STORAGE_KEY_PRICES);
			if (savedPrices) {
				this.prices = JSON.parse(savedPrices) || {};
			}
		} catch (e) {

			console.error('Storage access error (possibly incognito):', e);
		}
	}

	// --- Public Actions ---
	async login() {
		this.authLoading = true;
		try {
			if (storageProvider.login) {
				await storageProvider.login();
				// Forzar F5 tras login exitoso para asegurar estado limpio
				if (typeof window !== 'undefined') {
					window.location.reload();
				}
			}
		} catch (e) {
			console.error('Error durante el login:', e);
		} finally {
			this.authLoading = false;
		}
	}




	async logout() {
		this.authLoading = true;
		try {
			this.cleanupPolling();
			if (storageProvider.logout) {
				await storageProvider.logout();
			}
			
			// Limpiar localStorage para no dejar los datos de esta cuenta en el dispositivo
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY_HOLDINGS);
				localStorage.removeItem(STORAGE_KEY_ASSETS);
				localStorage.removeItem(STORAGE_KEY_CONTRIBUTION);
				localStorage.removeItem(STORAGE_KEY_PRICES);
			}

			// Forzar F5 tras logout exitoso para asegurar estado limpio
			if (typeof window !== 'undefined') {
				window.location.reload();
			}
		} catch (e) {
			console.error('Logout error:', e);
		} finally {
			this.authLoading = false;
		}
	}



	async fetchPrices() {
		// Bloquear si ya hay una petición en curso
		if (this.isFetching) return;

		this.isFetching = true;
		this.error = null;
		
		try {
			const tickerList = this.allUserTickers.join(',');
			if (!tickerList) {
				this.isFetching = false;
				return;
			}
			
			const response = await fetch(`/api/prices?tickers=${encodeURIComponent(tickerList)}&t=${Date.now()}`, { cache: 'no-store' });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();
			
			// Asegurar que prices no sea null
			this.prices = data.prices || {};
			this.timestamp = data.timestamp || new Date().toISOString();
			
			// Actualizar automáticamente los TERs de activos si vienen informados y están en 0 en la app
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

			if (assetsUpdated) {
				this.saveToStorage();
			}

			// Actualizar caché
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(STORAGE_KEY_PRICES, JSON.stringify(this.prices));
			}

			if (this.user) {
				await this.updateHistoryPoints();
			}
		} catch (e) {
			console.error('Fetch prices error:', e);
			this.error = e instanceof Error ? e.message : 'Error de conexión';
		} finally {
			this.isFetching = false;
		}
	}

	updateHolding(ticker: string, data: Partial<HoldingData>) {
		const current = this.holdings[ticker] ?? { shares: 0, avgCost: 0 };
		const merged = { ...current, ...data };
		
		// Enforce exactly 3 decimals maximum for shares and avgCost
		if (merged.shares !== undefined) {
			merged.shares = Math.round(merged.shares * 1000) / 1000;
		}
		if (merged.avgCost !== undefined) {
			merged.avgCost = Math.round(merged.avgCost * 1000) / 1000;
		}

		this.holdings = {
			...this.holdings,
			[ticker]: merged
		};
		this.saveToStorage();
	}

	updateContribution(value: number) {
		this.contribution = value;
		this.saveToStorage();
	}

	togglePrivacy() {
		this.isPrivate = !this.isPrivate;
		this.saveToStorage();
	}

	reset() {
		if (confirm('¿Seguro que quieres borrar toda la cartera?')) {
			this.holdings = {};
			this.contribution = 0;
			this.saveToStorage();
		}
	}

	// --- Asset Management ---

	/** Añadir un nuevo activo a una categoría */
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
		// Refrescar precios para incluir el nuevo ticker
		this.fetchPrices();
	}

	/** Eliminar un activo de la cartera */
	removeAsset(ticker: string) {
		this.coreAssets = this.coreAssets.filter(a => a.ticker !== ticker);
		this.satelliteAssets = this.satelliteAssets.filter(a => a.ticker !== ticker);
		this.stockAssets = this.stockAssets.filter(a => a.ticker !== ticker);
		// Eliminar holdings del activo
		const { [ticker]: _, ...rest } = this.holdings;
		this.holdings = rest;
		this.saveToStorage();
	}

	/** Actualizar un activo (peso, TER, nombre, color, etc.) */
	updateAsset(ticker: string, updates: Partial<Asset>) {
		const updateInList = (list: Asset[]) =>
			list.map(a => a.ticker === ticker ? { ...a, ...updates } : a);

		this.coreAssets = updateInList(this.coreAssets);
		this.satelliteAssets = updateInList(this.satelliteAssets);
		this.stockAssets = updateInList(this.stockAssets);
		this.saveToStorage();
	}

	/** Comprobar si un ticker ya existe en alguna categoría */
	hasAsset(ticker: string): boolean {
		return this.allUserTickers.includes(ticker);
	}

	/** Mover un activo a otra categoría */
	moveAsset(ticker: string, newCategory: AssetCategory) {
		// Buscar el activo en todas las listas
		const allAssets = [...this.coreAssets, ...this.satelliteAssets, ...this.stockAssets];
		const asset = allAssets.find(a => a.ticker === ticker);
		
		if (!asset || asset.category === newCategory) return;
		
		// Actualizar categoría y resetear target weight al cambiar
		const updatedAsset = { ...asset, category: newCategory, targetWeight: 0 };
		
		// Eliminar de todas las listas
		this.coreAssets = this.coreAssets.filter(a => a.ticker !== ticker);
		this.satelliteAssets = this.satelliteAssets.filter(a => a.ticker !== ticker);
		this.stockAssets = this.stockAssets.filter(a => a.ticker !== ticker);
		
		// Añadir a la nueva lista
		if (newCategory === 'core') {
			this.coreAssets = [...this.coreAssets, updatedAsset];
		} else if (newCategory === 'satellite') {
			this.satelliteAssets = [...this.satelliteAssets, updatedAsset];
		} else {
			this.stockAssets = [...this.stockAssets, updatedAsset];
		}
		
		this.saveToStorage();
	}

	/** Restaurar el estado completo de los activos (usado para cancelar edición) */
	restoreState(state: { core: Asset[], satellite: Asset[], stock: Asset[], holdings: HoldingsMap }) {
		this.coreAssets = [...state.core];
		this.satelliteAssets = [...state.satellite];
		this.stockAssets = [...state.stock];
		this.holdings = { ...state.holdings };
		this.saveToStorage();
	}

	/** Eliminar definitivamente la cuenta y todos los datos asociados */
	async deleteAccount() {
		if (!confirm('¿ESTÁS SEGURO? Esta acción es irreversible y borrará todos tus activos e historial definitivamente.')) return;
		
		this.authLoading = true;
		try {
			if (storageProvider.deleteAccount) {
				await storageProvider.deleteAccount();
				window.location.reload();
			}
		} catch (e: any) {
			alert(e.message || 'Error al eliminar la cuenta');
		} finally {
			this.authLoading = false;
		}
	}
}

export const portfolio = new PortfolioStore();
