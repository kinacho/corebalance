export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
	prompt(): Promise<void>;
}

class UIStore {
	toasts = $state<ToastMessage[]>([]);
	baseCurrency = $state<'EUR' | 'USD' | 'GBP'>('EUR');
	deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	
	// Support Modal State
	showSupportModal = $state(false);
	supportType = $state<'bug' | 'contact'>('contact');

	// Changelog Modal State
	showChangelog = $state(false);

	/**
	 * Actualización de la PWA pendiente de aceptar.
	 *
	 * ⚠️ Recargar **es** decisión del usuario, no del despliegue: el estado de esta app
	 * vive en el cliente, así que una recarga a traición en mitad de un import de CSV
	 * o de una edición se lleva el trabajo por delante. `applySwUpdate` la aplica
	 * (activa el worker nuevo y recarga) y la pone el propio registro del service
	 * worker en `+layout.svelte`.
	 */
	swUpdateReady = $state(false);
	applySwUpdate: (() => void) | null = null;

	constructor() {
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem('corebalance_currency');
			if (saved === 'USD' || saved === 'GBP') {
				this.baseCurrency = saved;
			}
		}
	}

	setBaseCurrency(currency: 'EUR' | 'USD' | 'GBP') {
		this.baseCurrency = currency;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('corebalance_currency', currency);
		}
	}

	addToast(message: string, type: ToastType = 'info', duration: number = 3000) {
		const id = Math.random().toString(36).substring(2, 9);
		this.toasts.push({ id, message, type, duration });
		
		if (duration > 0) {
			setTimeout(() => {
				this.removeToast(id);
			}, duration);
		}
	}

	removeToast(id: string) {
		this.toasts = this.toasts.filter(t => t.id !== id);
	}

	hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
		if (typeof navigator !== 'undefined' && navigator.vibrate) {
			switch (type) {
				case 'light': navigator.vibrate(10); break;
				case 'medium': navigator.vibrate(20); break;
				case 'heavy': navigator.vibrate([30, 50, 30]); break;
			}
		}
	}
}

export const ui = new UIStore();
