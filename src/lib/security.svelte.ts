import { portfolio } from './stores/portfolio.svelte';

export class SecurityStore {
	isEnabled = $state(false);
	isLocked = $state(false);
	isSupported = $state(false);

	constructor() {
		if (typeof window !== 'undefined') {
			this.checkSupport().then(() => {
				this.loadSettings();
			});
		}
	}

	private async checkSupport() {
		// Verificar si el navegador soporta WebAuthn y biometría de plataforma
		if (window.PublicKeyCredential) {
			try {
				this.isSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
			} catch (e) {
				this.isSupported = false;
			}
		}
	}

	private loadSettings() {
		const saved = localStorage.getItem('corebalance_security_enabled');
		this.isEnabled = saved === 'true';
		// Si está activado, empezamos bloqueados
		if (this.isEnabled) {
			this.isLocked = true;
		}
	}

	async toggle() {
		if (this.isEnabled) {
			this.isEnabled = false;
			this.isLocked = false;
			localStorage.setItem('corebalance_security_enabled', 'false');
		} else {
			// Activar requiere una prueba inicial
			const success = await this.authenticate();
			if (success) {
				this.isEnabled = true;
				this.isLocked = false;
				localStorage.setItem('corebalance_security_enabled', 'true');
			}
		}
	}

	async authenticate(): Promise<boolean> {
		if (!this.isSupported) {
			console.warn('Biometría no soportada en este dispositivo.');
			return true; // No bloqueamos si no hay soporte
		}

		try {
			// Creamos un desafío para disparar el UI nativo (FaceID/Huella)
			const challenge = new Uint8Array(32);
			window.crypto.getRandomValues(challenge);

			// En una app real sin backend, podemos usar un flujo de "Silent Auth" 
			// simplemente intentando crear una credencial ficticia o pidiendo verificación.
			// Para esta demo PWA, usaremos la verificación de usuario requerida.
			
			const options: any = {
				publicKey: {
					challenge,
					timeout: 60000,
					userVerification: 'required',
					rp: { name: 'CoreBalance' },
					user: {
						id: new Uint8Array(16),
						name: 'usuario@corebalance.app',
						displayName: 'Usuario CoreBalance'
					},
					pubKeyCredParams: [{ alg: -7, type: 'public-key' }]
				}
			};

			// Disparar el diálogo del sistema (esto pedirá FaceID/TouchID/PIN)
			// Nota: Usamos 'create' como "falsa" validación si no tenemos DB de llaves.
			// Si el usuario cancela o falla, lanza error.
			await navigator.credentials.create(options);
			
			this.isLocked = false;
			return true;
		} catch (e) {
			console.error('Error de autenticación biométrica:', e);
			// Si es un error de "NotAllowedError", el usuario canceló
			return false;
		}
	}

	unlock() {
		this.isLocked = false;
	}

	lock() {
		if (this.isEnabled) {
			this.isLocked = true;
		}
	}
}

export const security = new SecurityStore();
