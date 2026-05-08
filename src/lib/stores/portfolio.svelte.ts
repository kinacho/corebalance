import { DEFAULT_CORE_ASSETS, DEFAULT_SATELLITE_ASSETS, DEFAULT_STOCK_ASSETS, STORAGE_KEY_HOLDINGS, STORAGE_KEY_CONTRIBUTION, STORAGE_KEY_ASSETS } from '$lib/constants';
import type { Asset, HoldingData, HoldingsMap, PortfolioState, PriceData, RebalanceResult } from '$lib/types';
import { calculatePortfolioState, calculateRebalance } from '$lib/rebalance';
import { auth, db, googleProvider } from '$lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export class PortfolioStore {
	// --- State (Runes) ---
	holdings = $state<HoldingsMap>({});
	prices = $state<Record<string, PriceData>>({});
	contribution = $state(0);
	loading = $state(false);
	error = $state<string | null>(null);
	timestamp = $state<string | null>(null);
	user = $state<User | null>(null);
	isPrivate = $state(false);
	isInitialized = $state(false);
	history = $state<{ date: string; value: number }[]>([]);
	dailyChange = $state({ value: 0, percent: 0 });

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

	convertedPrices: Record<string, PriceData> = $derived.by(() => {
		const res: Record<string, PriceData> = {};
		for (const [ticker, data] of Object.entries(this.prices)) {
			let price = data.price;
			if (data.currency === 'USD') price /= this.eurUsd;
			if (data.currency === 'CAD') price /= this.eurCad;
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
		const days = 7;
		const historyPoints: { date: string, value: number }[] = [];
		
		// Inicializar puntos con fechas reales (hace 7 días hasta hoy)
		for (let i = 0; i < days; i++) {
			const d = new Date();
			d.setDate(d.getDate() - (days - 1 - i));
			const dateStr = d.toISOString().split('T')[0];
			historyPoints.push({ date: dateStr, value: 0 });
		}

		let hasData = false;
		const allAssets = [...this.portfolioState.positions, ...this.satelliteState.positions, ...this.stockState.positions];

		allAssets.forEach(pos => {
			const spark = pos.sparkline || [];
			if (spark.length > 0) hasData = true;
			
			// Sumar la contribución de este activo a cada uno de los 7 días
			for (let i = 0; i < days; i++) {
				const priceAtDay = spark[spark.length - days + i] || pos.unitPrice;
				historyPoints[i].value += pos.holdings * priceAtDay;
			}
		});

		// Si no hay datos de sparklines, devolvemos lo que tengamos en Firebase
		if (!hasData) return this.history;

		// Si tenemos datos en Firebase que son más largos, priorizamos Firebase
		if (this.history.length >= days) return this.history;

		// Si no, devolvemos la reconstrucción
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

	constructor() {
		this.loadFromStorage();
		this.initAuth();
		this.initPolling();
	}

	// --- Private Methods ---
	private initAuth() {
		if (typeof window === 'undefined' || !auth) return;
		onAuthStateChanged(auth, async (user) => {
			this.user = user;
			if (user) await this.loadFromCloud();
		});
	}

	private initPolling() {
		if (typeof window === 'undefined') return;
		
		// Fetch inicial
		this.fetchPrices();

		// Polling cada 60 segundos si la pestaña está activa
		setInterval(() => {
			if (document.visibilityState === 'visible' && !this.loading) {
				this.fetchPrices();
			}
		}, 60000);
	}

	private async saveToCloud() {
		if (!this.user || !db) return;
		try {
			const dataToSave = {
				holdings: this.holdings,
				contribution: this.contribution,
				isPrivate: this.isPrivate,
				// Guardar la configuración de activos del usuario
				coreAssets: this.coreAssets,
				satelliteAssets: this.satelliteAssets,
				stockAssets: this.stockAssets,
				updatedAt: new Date().toISOString()
			};
			await setDoc(doc(db, 'user_data', this.user.uid), dataToSave);
		} catch (e) {
			console.error('Firestore save error:', e);
		}
	}

	private async loadFromCloud() {
		if (!this.user || !db) return;
		try {
			const docSnap = await getDoc(doc(db, 'user_data', this.user.uid));
			if (docSnap.exists()) {
				const data = docSnap.data();
				this.holdings = data.holdings || {};
				this.contribution = data.contribution || 0;
				this.isPrivate = data.isPrivate ?? this.isPrivate;
				// Cargar activos personalizados si existen
				if (data.coreAssets && Array.isArray(data.coreAssets)) {
					this.coreAssets = data.coreAssets;
				}
				if (data.satelliteAssets && Array.isArray(data.satelliteAssets)) {
					this.satelliteAssets = data.satelliteAssets;
				}
				if (data.stockAssets && Array.isArray(data.stockAssets)) {
					this.stockAssets = data.stockAssets;
				}
			} else if (Object.keys(this.holdings).length > 0) {
				await this.saveToCloud();
			}
			
			// Cargar historial después de los datos de la cartera
			await this.loadHistory();
			
			// Re-fetch precios con los nuevos tickers del usuario
			this.fetchPrices();
		} catch (e) {
			console.error('Firestore load error:', e);
		}
	}



	private async loadHistory() {
		if (!this.user || !db) return;
		try {
			const historyRef = doc(db, 'user_history', this.user.uid);
			const snap = await getDoc(historyRef);
			
			if (snap.exists()) {
				const data = snap.data();
				this.history = data.points || [];
				this.calculateDailyChange();
			}
		} catch (e) {
			console.error('History load error:', e);
		}
	}

	private async updateHistoryPoints() {
		if (!this.user || !db || this.globalCapital === 0) return;
		
		// Evitar race conditions: si el historial está vacío, intentamos cargarlo 
		// antes de añadir el punto de hoy para no sobreescribir datos antiguos.
		if (this.history.length === 0) {
			await this.loadHistory();
		}

		const d = new Date();
		const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		const currentPoint = { date: today, value: this.globalCapital };
		
		let newHistory = [...this.history];
		const index = newHistory.findIndex(p => p.date === today);
		
		if (index >= 0) {
			// Si ya existe el punto de hoy, lo actualizamos si ha cambiado significativamente
			// (o simplemente lo actualizamos siempre para tener el último valor del día)
			if (Math.abs(newHistory[index].value - currentPoint.value) < 0.01) return;
			newHistory[index] = currentPoint;
		} else {
			newHistory.push(currentPoint);
		}

		// Ordenar por fecha y limitar a los últimos 30 días
		newHistory.sort((a, b) => a.date.localeCompare(b.date));
		if (newHistory.length > 30) newHistory = newHistory.slice(-30);

		this.history = newHistory;
		
		try {
			await setDoc(doc(db, 'user_history', this.user.uid), { points: newHistory }, { merge: true });
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
			percent: (last - prev) / prev
		};
	}

	private saveToStorage() {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(STORAGE_KEY_HOLDINGS, JSON.stringify(this.holdings));
		localStorage.setItem(STORAGE_KEY_CONTRIBUTION, this.contribution.toString());
		localStorage.setItem('balanceador_privacy', this.isPrivate.toString());
		// Guardar configuración de activos en localStorage
		localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify({
			coreAssets: this.coreAssets,
			satelliteAssets: this.satelliteAssets,
			stockAssets: this.stockAssets
		}));
		this.saveToCloud();
	}

	private loadFromStorage() {
		if (typeof localStorage === 'undefined') return;
		
		// Cargar configuración de activos guardada
		const savedAssets = localStorage.getItem(STORAGE_KEY_ASSETS);
		if (savedAssets) {
			try {
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
			} catch (e) {
				console.error('Asset config parse error:', e);
			}
		}

		const savedHoldings = localStorage.getItem(STORAGE_KEY_HOLDINGS);
		if (savedHoldings) {
			try {
				const parsed = JSON.parse(savedHoldings);
				if (Object.keys(parsed).length > 0) {
					this.holdings = parsed;
				} else {
					this.setDemoData();
				}
			} catch (e) {
				console.error('Local storage parse error:', e);
				this.setDemoData();
			}
		} else {
			this.setDemoData();
		}

		const savedContribution = localStorage.getItem(STORAGE_KEY_CONTRIBUTION);
		if (savedContribution) {
			this.contribution = parseFloat(savedContribution) || 0;
		}

		this.isPrivate = localStorage.getItem('balanceador_privacy') === 'true';
	}

	// --- Public Actions ---
	async login() {
		if (!auth) return;
		try {
			await signInWithPopup(auth, googleProvider);
		} catch (e) {
			console.error('Login error:', e);
		}
	}

	async logout() {
		if (!auth) return;
		try {
			await signOut(auth);
			this.user = null;
			this.holdings = {};
			this.contribution = 0;
			this.isPrivate = false;
			// Resetear activos a defaults
			this.coreAssets = [...DEFAULT_CORE_ASSETS];
			this.satelliteAssets = [...DEFAULT_SATELLITE_ASSETS];
			this.stockAssets = [...DEFAULT_STOCK_ASSETS];
			localStorage.removeItem(STORAGE_KEY_HOLDINGS);
			localStorage.removeItem(STORAGE_KEY_CONTRIBUTION);
			localStorage.removeItem('balanceador_privacy');
			localStorage.removeItem(STORAGE_KEY_ASSETS);
			this.setDemoData();
		} catch (e) {
			console.error('Logout error:', e);
		}
	}

	async fetchPrices() {
		// No mostramos el spinner de "loading" global para refrescos automáticos
		// para no molestar al usuario mientras edita, a menos que sea el primer fetch
		const isInitial = Object.keys(this.prices).length === 0;
		if (isInitial) this.loading = true;
		
		this.error = null;
		try {
			const tickerList = this.allUserTickers.join(',');
			const response = await fetch(`/api/prices?tickers=${encodeURIComponent(tickerList)}&t=${Date.now()}`, { cache: 'no-store' });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();
			this.prices = data.prices;
			this.timestamp = data.timestamp;

			// Una vez tenemos precios, actualizamos historia si el usuario está logueado
			if (this.user) {
				await this.updateHistoryPoints();
			}
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			if (isInitial) {
				this.loading = false;
				// Pequeño retardo para asegurar que el contenido esté renderizado antes de quitar el splash
				setTimeout(() => {
					this.isInitialized = true;
				}, 800);
			}
		}
	}

	updateHolding(ticker: string, data: Partial<HoldingData>) {
		const current = this.holdings[ticker] ?? { shares: 0, avgCost: 0 };
		this.holdings = {
			...this.holdings,
			[ticker]: { ...current, ...data }
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

	setDemoData() {
		// Solo ponemos datos demo si no hay usuario logueado
		// para no pisar datos reales accidentalmente durante la inicialización
		if (this.user) return;

		// Cargamos holdings demo para los activos por defecto
		const defaultHoldings: Record<string, { shares: number, avgCost: number }> = {
			[DEFAULT_CORE_ASSETS[0].ticker]: { shares: 850.5, avgCost: 10.25 },
			[DEFAULT_CORE_ASSETS[1].ticker]: { shares: 120.3, avgCost: 9.80 },
			[DEFAULT_CORE_ASSETS[2].ticker]: { shares: 1540.0, avgCost: 5.45 },
			[DEFAULT_SATELLITE_ASSETS[0].ticker]: { shares: 1.2, avgCost: 1005.30 },
			[DEFAULT_SATELLITE_ASSETS[1].ticker]: { shares: 180.0, avgCost: 12.15 },
			[DEFAULT_STOCK_ASSETS[0].ticker]: { shares: 2500, avgCost: 0.45 },
			[DEFAULT_STOCK_ASSETS[1].ticker]: { shares: 15000, avgCost: 0.025 }
		};

		this.holdings = defaultHoldings;
		this.contribution = 500;
	}
}

export const portfolio = new PortfolioStore();
