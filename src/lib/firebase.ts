import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Estas variables deben configurarse en Vercel y en un archivo .env local
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicialización segura para que no rompa la app si no hay keys
let app;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;

if (firebaseConfig.apiKey) {
	try {
		app = initializeApp(firebaseConfig);
		auth = getAuth(app);
		
		// Configurar persistencia local
		setPersistence(auth, browserLocalPersistence).catch(err => {
			console.error('Error al configurar persistencia:', err);
		});

		db = getFirestore(app);
		googleProvider = new GoogleAuthProvider();
		// Forzar a Google a mostrar el selector de cuentas al hacer login
		googleProvider.setCustomParameters({
			prompt: 'select_account'
		});
	} catch (e) {
		console.error('Error al inicializar Firebase:', e);
	}
} else {
	console.warn('Firebase API Key no configurada. La sincronización en la nube estará desactivada.');
}

export { auth, db, googleProvider };
