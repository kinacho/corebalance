import { env } from '$env/dynamic/public';
import { FirebaseStorage } from './FirebaseStorage';
import { LocalDBStorage } from './LocalDBStorage';
import type { StorageProvider } from './types';

// Comprueba la variable de entorno para decidir qué motor de almacenamiento usar.
// Si está en true, usamos Firebase. En caso contrario, usamos la base de datos local (Dexie).
export const storageProvider: StorageProvider = env.PUBLIC_USE_FIREBASE === 'true'
	? new FirebaseStorage()
	: new LocalDBStorage();
