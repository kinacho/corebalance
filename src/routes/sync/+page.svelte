<script lang="ts">
	import { onMount } from 'svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { decodeSyncPayload, describeSyncPayload, type SyncPayload } from '$lib/sync-payload';
	import { LL } from '$lib/i18n/i18n-svelte';

	/**
	 * El receptor del traspaso por QR — la mitad que no se había escrito nunca.
	 *
	 * `SyncModal` generaba `https://corebalance.app/sync#<payload>` y esta ruta no
	 * existía: escanear el código llevaba a un 404. Ver el porqué completo y las
	 * medidas en `$lib/sync-payload.ts`.
	 *
	 * ⚠️ **Nunca importa solo.** `importAllData()` borra las cuatro tablas y escribe lo
	 * que le des, así que aceptar un QR *reemplaza* la cartera de este dispositivo. Este
	 * repo ya tiene documentado lo que cuesta aplicar una restauración sin que se vea
	 * (`importAllData({history: []})` vaciando la cartera con una recarga 1,5 s después),
	 * así que aquí se enseña qué trae y se pide confirmación. El paso 3 de las
	 * instrucciones del QR dice exactamente eso: que pedirá confirmación.
	 */
	type Estado = 'leyendo' | 'listo' | 'vacio' | 'invalido' | 'importando' | 'hecho' | 'error';

	let estado = $state<Estado>('leyendo');
	let error = $state('');
	let payload = $state<SyncPayload | null>(null);

	const resumen = $derived(payload ? describeSyncPayload(payload) : null);

	onMount(async () => {
		const fragmento = window.location.hash;
		if (!fragmento || fragmento === '#') {
			estado = 'vacio';
			return;
		}

		try {
			// `decodeSyncPayload` ya rechaza lo que no sea un traspaso: descomprime,
			// parsea y comprueba la forma. Si algo de eso falla, lanza.
			payload = await decodeSyncPayload(fragmento);
			estado = 'listo';
		} catch {
			estado = 'invalido';
		}
	});

	function importar() {
		if (!payload) return;
		estado = 'importando';
		try {
			/**
			 * ⚠️ **Al store, no a `storageProvider.importAllData()`.** Con
			 * `PUBLIC_USE_FIREBASE=true` eso último lanza «Debes iniciar sesión para
			 * importar datos» —medido en el navegador—, así que el traspaso no habría
			 * funcionado para quien no ha iniciado sesión. El store guarda en este
			 * navegador y, si hay sesión, sube a la nube él solo por el camino de siempre.
			 */
			portfolio.applyTransfer(payload);
			estado = 'hecho';
			/**
			 * ⚠️ El billete de un solo uso que usa la landing en «Empezar gratis».
			 *
			 * El portero del dashboard echa a la portada a quien no tenga sesión ni
			 * activos, y lo evalúa en cuanto el store se declara inicializado — que puede
			 * ser **antes** de que la carga desde el almacenamiento haya terminado. Sin
			 * esto, quien escanea el QR en un móvil nuevo acaba en la portada justo
			 * después de haber importado su cartera, y parece que no se ha importado nada.
			 * Se consume solo, así que no deja la puerta abierta.
			 */
			sessionStorage.setItem('bypassLanding', 'true');
			/**
			 * Navegación completa y no `goto()`: la cartera se lee del almacenamiento al
			 * arrancar el store, así que hace falta que la app se monte de nuevo. Es lo
			 * mismo que hace el respaldo por fichero con su `location.reload()`.
			 *
			 * Y se limpia el fragmento por el camino: dejar la cartera entera en la barra
			 * de direcciones —y en el historial del navegador— no aporta nada una vez
			 * importada.
			 */
			setTimeout(() => {
				window.location.href = '/dashboard';
			}, 1200);
		} catch (e: any) {
			error = e?.message ?? String(e);
			estado = 'error';
		}
	}
</script>

<svelte:head>
	<title>{$LL.sync.receive_title()}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="pantalla">
	<div class="tarjeta">
		<h1>{$LL.sync.receive_title()}</h1>

		{#if estado === 'leyendo'}
			<p class="estado">{$LL.sync.receive_reading()}</p>
		{:else if estado === 'vacio'}
			<p class="estado">{$LL.sync.receive_empty()}</p>
			<a class="boton secundario" href="/dashboard">{$LL.sync.receive_cancel()}</a>
		{:else if estado === 'invalido'}
			<p class="estado error">{$LL.sync.receive_invalid()}</p>
			<a class="boton secundario" href="/dashboard">{$LL.sync.receive_cancel()}</a>
		{:else if estado === 'listo' && resumen}
			<ul class="resumen">
				<li>
					<span>{$LL.sync.receive_label_assets()}</span>
					<strong>{resumen.assets}</strong>
				</li>
				<li>
					<span>{$LL.sync.receive_label_transactions()}</span>
					<strong>{resumen.transactions}</strong>
				</li>
				<li>
					<span>{$LL.sync.receive_label_edits()}</span>
					<strong>{resumen.edits}</strong>
				</li>
			</ul>

			<p class="aviso">
				{@html $LL.sync.receive_warning({
					bold: `<strong>${$LL.sync.receive_warning_bold()}</strong>`
				})}
			</p>

			<div class="acciones">
				<button class="boton" onclick={importar}>{$LL.sync.receive_confirm()}</button>
				<a class="boton secundario" href="/dashboard">{$LL.sync.receive_cancel()}</a>
			</div>
		{:else if estado === 'importando'}
			<p class="estado">{$LL.sync.receive_importing()}</p>
		{:else if estado === 'hecho'}
			<p class="estado exito">{$LL.sync.receive_done()}</p>
		{:else if estado === 'error'}
			<p class="estado error">{$LL.sync.receive_error({ error })}</p>
			<a class="boton secundario" href="/dashboard">{$LL.sync.receive_cancel()}</a>
		{/if}
	</div>
</main>

<style>
	.pantalla {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
	}

	.tarjeta {
		width: 100%;
		max-width: 460px;
		padding: 1.75rem;
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	h1 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.estado {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--text-muted);
	}

	.estado.error {
		color: var(--state-negative);
	}

	.estado.exito {
		color: var(--state-positive);
	}

	.resumen {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.resumen li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-subtle);
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.resumen strong {
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	/* El aviso es lo único irreversible de esta pantalla, así que lleva color de
	   estado y no el gris de los textos de apoyo. */
	.aviso {
		margin: 0;
		padding: 0.85rem 1rem;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 14px;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--state-negative);
	}

	.acciones {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.boton {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0.7rem 1rem;
		border-radius: 14px;
		border: 1px solid transparent;
		background: var(--accent-blue);
		/*
		 * Blanco y no `#05050a`: sobre el azul del acento el texto oscuro da 3,93:1
		 * y el blanco 5,17, y en tema claro 6,70 sobre `#1d4ed8`. Un botón de acción
		 * principal no puede ser lo peor contrastado de la pantalla.
		 */
		color: #ffffff;
		font: inherit;
		font-weight: 700;
		font-size: 0.85rem;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
	}

	.boton.secundario {
		background: transparent;
		border-color: var(--border-subtle);
		color: var(--text-muted);
	}
</style>
