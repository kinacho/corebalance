import { PORTFOLIO_ASSETS, SATELLITE_ASSETS, STOCK_ASSETS, STORAGE_KEY_HOLDINGS, STORAGE_KEY_CONTRIBUTION } from '$lib/constants';
import type { HoldingData, HoldingsMap, PortfolioState, PriceData, RebalanceResult } from '$lib/types';
import { calculatePortfolioState, calculateRebalance } from '$lib/rebalance';
import { auth, db, googleProvider } from '$lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AUTHORIZED_EMAIL = import.meta.env.VITE_AUTHORIZED_EMAIL;

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
	history = $state<{ date: string; value: number }[]>([]);
	dailyChange = $state({ value: 0, percent: 0 });

	// --- Derived State ---
	eurUsdRate = $derived(this.prices['EURUSD=X']?.price || 1.1);
	eurCadRate = $derived(this.prices['EURCAD=X']?.price || 1.5);

	convertedPrices: Record<string, PriceData> = $derived.by(() => {
		const res: Record<string, PriceData> = {};
		for (const [ticker, data] of Object.entries(this.prices)) {
			let price = data.price;
			if (data.currency === 'USD') price /= this.eurUsdRate;
			if (data.currency === 'CAD') price /= this.eurCadRate;
			res[ticker] = { ...data, price };
		}
		return res;
	});

	portfolioState: PortfolioState = $derived(
		calculatePortfolioState(PORTFOLIO_ASSETS, this.holdings, this.convertedPrices)
	);

	satelliteState: PortfolioState = $derived(
		calculatePortfolioState(SATELLITE_ASSETS, this.holdings, this.convertedPrices)
	);

	stockState: PortfolioState = $derived(
		calculatePortfolioState(STOCK_ASSETS, this.holdings, this.convertedPrices)
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

	rebalanceResult: RebalanceResult | null = $derived(
		this.contribution > 0 && Object.keys(this.prices).length > 0
			? calculateRebalance(PORTFOLIO_ASSETS, this.holdings, this.convertedPrices, this.contribution)
			: null
	);

	hasAnyHoldings = $derived(
		Object.values(this.holdings).some((h) => h.shares > 0)
	);

	btcPrice = $derived(this.prices['BTC-EUR']?.price || 0);

	constructor() {
		this.loadFromStorage();
		this.initAuth();
		this.initPolling();
	}

	// --- Private Methods ---
	private initAuth() {
		if (typeof window === 'undefined' || !auth) return;
		onAuthStateChanged(auth, async (user) => {
			if (user && user.email !== AUTHORIZED_EMAIL) {
				console.warn('Unauthorized user:', user.email);
				alert('Acceso denegado. Solo el administrador puede iniciar sesión.');
				await signOut(auth);
				this.user = null;
				return;
			}
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
			} else if (Object.keys(this.holdings).length > 0) {
				await this.saveToCloud();
			}
			
			// Cargar historial después de los datos de la cartera
			await this.loadHistory();
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
		this.saveToCloud();
	}

	private loadFromStorage() {
		if (typeof localStorage === 'undefined') return;
		
		const savedHoldings = localStorage.getItem(STORAGE_KEY_HOLDINGS);
		if (savedHoldings) {
			try {
				this.holdings = JSON.parse(savedHoldings);
			} catch (e) {
				console.error('Local storage parse error:', e);
			}
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
			localStorage.removeItem(STORAGE_KEY_HOLDINGS);
			localStorage.removeItem(STORAGE_KEY_CONTRIBUTION);
			localStorage.removeItem('balanceador_privacy');
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
			const response = await fetch(`/api/prices?t=${Date.now()}`, { cache: 'no-store' });
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
			if (isInitial) this.loading = false;
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
}

export const portfolio = new PortfolioStore();
