<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db, googleProvider } from '$lib/firebase';
	import { signInWithPopup } from 'firebase/auth';
	import { doc, getDoc } from 'firebase/firestore';
	import { localDB } from '$lib/db/LocalDBStorage';
	import { goto } from '$app/navigation';

	let status = $state('Esperando acción...');
	let loading = $state(false);

	async function migrateData() {
		if (!auth || !db || !localDB) {
			status = 'Error: Firebase o LocalDB no están inicializados.';
			return;
		}

		try {
			loading = true;
			status = 'Iniciando sesión en Firebase...';
			const result = await signInWithPopup(auth, googleProvider);
			const user = result.user;
			
			status = `Sesión iniciada como ${user.email}. Descargando datos...`;
			
			// 1. Obtener User Data
			const userDataSnap = await getDoc(doc(db, 'user_data', user.uid));
			let userDataToSave: any = { id: 'local_user' };
			
			if (userDataSnap.exists()) {
				const data = userDataSnap.data();
				userDataToSave = {
					...userDataToSave,
					holdings: data.holdings || {},
					contribution: data.contribution || 0,
					isPrivate: data.isPrivate || false,
					coreAssets: data.coreAssets || [],
					satelliteAssets: data.satelliteAssets || [],
					stockAssets: data.stockAssets || [],
					updatedAt: data.updatedAt
				};
				status = 'Datos principales descargados.';
			} else {
				status = 'No se encontraron datos principales en Firebase.';
			}

			// 2. Obtener Historial
			status = 'Descargando historial...';
			const historySnap = await getDoc(doc(db, 'user_history', user.uid));
			let historyPoints: any[] = [];
			
			if (historySnap.exists()) {
				historyPoints = historySnap.data().points || [];
				status = `Historial descargado (${historyPoints.length} puntos).`;
			}

			// 3. Guardar en Dexie (LocalDB)
			status = 'Guardando en la base de datos local (IndexedDB)...';
			
			await localDB.userData.put(userDataToSave);
			await localDB.history.put({ id: 'local_user', points: historyPoints });

			status = '¡Migración completada con éxito! Redirigiendo al dashboard en 3 segundos...';
			
			setTimeout(() => {
				goto('/');
			}, 3000);

		} catch (error: any) {
			console.error(error);
			status = `Error: ${error.message}`;
		} finally {
			loading = false;
		}
	}
</script>

<div class="migrate-container">
	<div class="card">
		<h1>Herramienta de Migración</h1>
		<p>Esto copiará tus datos desde Firebase (en la nube) hacia tu almacenamiento local del navegador (IndexedDB).</p>
		
		<div class="status-box">
			<strong>Estado:</strong> {status}
		</div>

		<button class="btn-migrate" onclick={migrateData} disabled={loading}>
			{#if loading}
				Migrando...
			{:else}
				Iniciar Migración desde Firebase
			{/if}
		</button>
	</div>
</div>

<style>
	.migrate-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: #0a0a14;
		color: white;
	}

	.card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 2rem;
		border-radius: 16px;
		max-width: 500px;
		width: 100%;
		text-align: center;
	}

	h1 {
		margin-top: 0;
		font-size: 1.5rem;
		color: #3b82f6;
	}

	p {
		color: #a0a0c8;
		font-size: 0.95rem;
		margin-bottom: 2rem;
	}

	.status-box {
		background: rgba(0, 0, 0, 0.3);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		font-family: monospace;
		font-size: 0.85rem;
		color: #10b981;
		word-break: break-all;
	}

	.btn-migrate {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: bold;
		border-radius: 8px;
		cursor: pointer;
		width: 100%;
		transition: background 0.2s;
	}

	.btn-migrate:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-migrate:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
