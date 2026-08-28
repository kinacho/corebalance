<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import type { Asset, Transaction, TransactionType } from '$lib/types';
	import { formatEUR, formatCurrency, formatDate } from '$lib/utils';
	import { fade, slide, fly } from 'svelte/transition';
	import { onMount, onDestroy, untrack } from 'svelte';
	import { bloquearScroll, desbloquearScroll } from '$lib/modal-lock';
	import { focusTrap } from '$lib/actions/focusTrap';
	import FichaDelActivo from './FichaDelActivo.svelte';
	import { LL, locale } from '$lib/i18n/i18n-svelte';
	import { canBeTransferred, classifyMove, instrumentTypeOf } from '$lib/instrument-type';
	/*
	 * El icono sale de `asset.icon` y no de `resolveAssetIcon()`: ese campo **es** la
	 * caché de esa función, y `normalizeAssets()` lo recalcula en cada carga
	 * precisamente para que no se congele el resultado de una versión vieja. Llamarla
	 * aquí otra vez sería una segunda fuente de verdad para lo mismo.
	 */
	import { descriptiveAssetLabel } from '$lib/asset-label';
	import { planificarTraspaso, meritaApuntar, type CuantoTraspasar } from '$lib/traspaso-libro';

	interface Props {
		asset: Asset;
		onClose: () => void;
	}

	let { asset, onClose }: Props = $props();

	/**
	 * ⚠️ Aquí había un `onDestroy` **vacío**, con un comentario explicando que no
	 * había que soltar el bloqueo porque `ManageAssets` sigue detrás. Cierto solo
	 * en uno de los tres sitios desde los que se abre este modal: desde
	 * `AssetCard` y `CompactAssetRow` no hay nada detrás, así que al cerrarlo el
	 * `body` se quedaba con `overflow: hidden; height: 100vh` y el dashboard sin
	 * scroll y recortado. Ahora se cuenta, ver `modal-lock.ts`.
	 */
	onMount(() => bloquearScroll());
	onDestroy(() => desbloquearScroll());

	// --- State ---
	let useLedger = $state(false);
	
	// Sincronizar useLedger con el prop asset de forma reactiva
	$effect(() => {
		useLedger = portfolio.holdings[asset.ticker]?.useLedger ?? false;
	});

	let transactions = $derived(portfolio.transactions.filter(t => t.ticker === asset.ticker).sort((a, b) => b.date - a.date));
	
	let showAddForm = $state(false);
	
	let showDatePicker = $state(false);
	let pickerStep = $state<'day' | 'month' | 'year'>('day');
	let pickerViewDate = $state(new Date());

	function openDatePicker() {
		pickerViewDate = new Date(newTx.date || Date.now());
		pickerStep = 'day';
		showDatePicker = true;
	}

	/**
	 * ⚠️ **El calendario se cierra con un listener en `window`, no con una capa.**
	 *
	 * Antes había un `.date-picker-backdrop` con `position: fixed; inset: 0` y
	 * `z-index: 10` viviendo *dentro* del panel. No hay ningún ancestro con
	 * `transform`/`filter` que lo acote, así que eran los 100vw × 100vh de verdad,
	 * por encima de todo el modal: con el calendario abierto lo **único** clicable
	 * de la pantalla era el propio calendario. El primer clic en «Guardar
	 * Transacción», en cualquier campo o en el fondo del modal no hacía más que
	 * cerrar el calendario, y hacía falta un segundo clic para todo lo demás.
	 *
	 * Es el patrón que este repo ya resuelve bien en `Header.svelte` con el menú de
	 * usuario, y en `Toast.svelte` con `pointer-events: none`. `pointerdown` va
	 * antes que `click`, así que el calendario se cierra **y** el clic llega a su
	 * destino. La guarda de `#tx-date` evita que el propio campo lo cierre y lo
	 * vuelva a abrir en el mismo gesto.
	 */
	function cerrarCalendarioFuera(e: PointerEvent) {
		if (!showDatePicker) return;
		const destino = e.target as HTMLElement | null;
		if (destino?.closest('.date-picker') || destino?.closest('#tx-date')) return;
		showDatePicker = false;
	}

	/**
	 * Escape, que este modal era el único de los cinco en no tener.
	 *
	 * ⚠️ Con precedencia: primero el calendario y **solo** el calendario. Los
	 * handlers de `window` no se consumen entre sí, así que sin este `return` un
	 * único Escape cerraría los tres niveles apilados (`ManageAssets` → este modal
	 * → el calendario). Por el otro lado, la guarda `!showLedger` de
	 * `ManageAssets` —que hasta ahora era inerte, porque aquí no había Escape— es
	 * la que evita que este cierre arrastre también al panel de gestión.
	 */
	function alPulsarTecla(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		if (showDatePicker) {
			showDatePicker = false;
			return;
		}
		onClose();
	}

	function selectYear(y: number) {
		pickerViewDate = new Date(y, pickerViewDate.getMonth(), 1);
		pickerStep = 'month';
	}

	function selectMonth(m: number) {
		pickerViewDate = new Date(pickerViewDate.getFullYear(), m, 1);
		pickerStep = 'day';
	}

	function selectDay(d: number) {
		newTx.date = new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth(), d).getTime();
		showDatePicker = false;
	}

	function getDaysInMonth(year: number, month: number) {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfWeek(year: number, month: number) {
		return (new Date(year, month, 1).getDay() + 6) % 7;
	}
	
	// Usar $derived para que los valores por defecto del formulario reaccionen al cambio de activo
	const defaultPrice = $derived(portfolio.prices[asset.ticker]?.price || 0);
	const defaultCurrency = $derived(portfolio.prices[asset.ticker]?.currency || ui.baseCurrency);

	let editingTxId = $state<string | null>(null);

	let newTx = $state<Partial<Transaction>>({
		type: 'buy',
		date: Date.now(),
		shares: 0,
		price: 0,
		currency: '',
		fees: 0,
		fxRate: 1,
		notes: ''
	});

	/**
	 * ⚠️ **Este efecto reinicia el formulario, así que solo puede dispararse cuando
	 * de verdad cambia el activo — y durante meses se disparó en cada sondeo de
	 * precios, cerrando el formulario y borrando lo que estabas escribiendo.**
	 *
	 * El comentario anterior decía que el `untrack()` de abajo impedía justo eso.
	 * Es falso, y en la dirección peor: `untrack()` protege los *valores* que se
	 * leen dentro (`defaultPrice`, `defaultCurrency`), no la dependencia del prop
	 * `asset`. Y `asset` no es un objeto suelto, es el final de esta cadena:
	 *
	 *   asset  ←  AssetCard position.asset  ←  {#each portfolioState.positions}
	 *
	 * O sea que la dependencia real del efecto es la fuente del `{#each}`, no el
	 * objeto `Asset`. Cada recálculo de `portfolioState` escribe un `position`
	 * nuevo ahí y el efecto vuelve a correr, aunque `position.asset` sea
	 * exactamente el mismo objeto. `fetchPrices()` lo recalcula cada 30 s.
	 *
	 * La guarda es por **valor**, entonces: solo se reinicia si el ticker cambió.
	 * Con eso el formulario queda inmune a cualquier recálculo del store, no solo
	 * al que se identificó. `tickerMostrado` no es `$state` a propósito — nadie lo
	 * pinta, y como estado reactivo leerlo y escribirlo aquí sería un ciclo.
	 *
	 * Sigue haciendo falta reiniciar de verdad: desde `ManageAssets` este modal
	 * cambia de activo sin remontarse (allí el prop es un `$state` local), que es
	 * también la razón de que el fallo solo se viera desde la tarjeta y la fila.
	 */
	let tickerMostrado = untrack(() => asset.ticker);

	/**
	 * Dos pestañas, y **«ficha» por defecto**: entender qué tienes sirve a
	 * cualquiera que abra esto, mientras que el libro solo lo usa quien lleva
	 * registro de sus compras. Antes lo primero que veías al abrir un activo era el
	 * interruptor de modo libro, que para la mayoría no significa nada.
	 */
	type Pestana = 'ficha' | 'libro';
	let pestana = $state<Pestana>('ficha');

	$effect(() => {
		const ticker = asset.ticker;
		if (ticker === tickerMostrado) return;
		tickerMostrado = ticker;
		// ⚠️ La pestaña se reinicia aquí por el mismo motivo que el formulario: desde
		// `ManageAssets` este modal cambia de activo sin remontarse, así que un
		// estado que no entre en este bloque se queda con lo del activo anterior.
		pestana = 'ficha';
		editingTxId = null;
		showAddForm = false;
		/*
		 * ⚠️ El formulario de traspaso **también**, y aquí es peor que en el resto: un
		 * destino que sobreviviera al cambio de activo enseñaría el origen de uno con
		 * el destino del anterior. Es decir, rompería exactamente lo que este
		 * formulario existe para dejar claro.
		 */
		showTransferForm = false;
		resetTransferForm();
		newTx = {
			type: 'buy',
			date: Date.now(),
			shares: 0,
			price: untrack(() => defaultPrice),
			currency: untrack(() => defaultCurrency),
			fees: 0,
			fxRate: 1,
			notes: ''
		};
	});

	$effect(() => {
		if (showAddForm && !editingTxId) {
			newTx.price = untrack(() => defaultPrice);
			newTx.currency = untrack(() => defaultCurrency);
		}
	});

	const ledgerSummary = $derived(portfolio.ledgerHoldings[asset.ticker] || { shares: 0, avgCost: 0 });

	function toggleMode() {
		useLedger = !useLedger;
		portfolio.toggleLedger(asset.ticker, useLedger);
		ui.hapticFeedback('medium');
	}

	function cancelForm() {
		showAddForm = false;
		editingTxId = null;
		newTx = {
			type: 'buy',
			date: Date.now(),
			shares: 0,
			price: defaultPrice,
			currency: defaultCurrency,
			fees: 0,
			fxRate: 1,
			notes: ''
		};
	}

	function submitTransaction() {
		if (!newTx.shares || newTx.shares <= 0) {
			ui.addToast($LL.toasts.shares_greater_than_zero(), 'error');
			return;
		}

		if (editingTxId) {
			portfolio.updateTransaction(editingTxId, {
				type: newTx.type as TransactionType,
				date: newTx.date || Date.now(),
				shares: newTx.shares || 0,
				price: newTx.price || 0,
				currency: newTx.currency || 'EUR',
				fees: newTx.fees || 0,
				fxRate: newTx.fxRate || 1,
				notes: newTx.notes
			});
			ui.addToast($LL.toasts.transaction_updated(), 'success');
		} else {
			const tx: Transaction = {
				id: crypto.randomUUID(),
				ticker: asset.ticker,
				type: newTx.type as TransactionType,
				date: newTx.date || Date.now(),
				shares: newTx.shares || 0,
				price: newTx.price || 0,
				currency: newTx.currency || 'EUR',
				fees: newTx.fees || 0,
				fxRate: newTx.fxRate || 1,
				notes: newTx.notes
			};

			portfolio.addTransaction(tx);
			ui.addToast($LL.toasts.transaction_added(), 'success');
		}

		showAddForm = false;
		editingTxId = null;
		ui.hapticFeedback('medium');

		// Reset form a valores por defecto reactivos
		newTx = {
			type: 'buy',
			date: Date.now(),
			shares: 0,
			price: defaultPrice,
			currency: defaultCurrency,
			fees: 0,
			fxRate: 1,
			notes: ''
		};
	}

	function startEdit(tx: Transaction) {
		editingTxId = tx.id;
		newTx = {
			type: tx.type,
			date: tx.date,
			shares: tx.shares,
			price: tx.price,
			currency: tx.currency,
			fees: tx.fees,
			fxRate: tx.fxRate,
			notes: tx.notes || ''
		};
		showAddForm = true;
		ui.hapticFeedback('light');
	}

	function removeTx(id: string) {
		const tx = portfolio.transactions.find((t) => t.id === id);

		/*
		 * ⚠️ Borrar una sola pata deja la cartera **descuadrada en silencio**:
		 * desaparecen las participaciones de un lado y se quedan las del otro. Así que
		 * se pregunta por las dos, nombrando el otro fondo — sin eso, «¿eliminar las
		 * dos?» no dice de qué segunda transacción está hablando.
		 */
		if (tx?.transferId) {
			const otro = contraparteDe(tx);
			const nombre = otro ? descriptiveAssetLabel(otro) : tx.ticker;
			if (confirm($LL.ledger.confirm_delete_par({ fondo: nombre }))) {
				portfolio.removeTransferPair(tx.transferId);
				if (editingTxId === id) cancelForm();
				ui.addToast($LL.toasts.transaction_deleted(), 'info');
			}
			return;
		}

		if (confirm($LL.ledger.confirm_delete())) {
			portfolio.removeTransaction(id);
			if (editingTxId === id) {
				cancelForm();
			}
			ui.addToast($LL.toasts.transaction_deleted(), 'info');
		}
	}

	const typeLabels = $derived<Record<TransactionType, string>>({
		buy: $LL.ledger.type_buy(),
		sell: $LL.ledger.type_sell(),
		dividend: $LL.ledger.type_dividend(),
		transfer_in: $LL.ledger.type_transfer_in(),
		transfer_out: $LL.ledger.type_transfer_out(),
		transfer: $LL.ledger.type_transfer(),
		initial_balance: $LL.ledger.type_initial_balance()
	});

	/*
	 * ⚠️ **Las dos patas de un traspaso comparten hue, y es a propósito.** Un
	 * traspaso es **un** evento; dos colores dirían que son dos hechos sin relación,
	 * que es justo lo que este cambio viene a arreglar. La dirección la llevan la
	 * flecha y el signo de las participaciones — codificación redundante, y ninguna
	 * de las dos depende de distinguir tonos.
	 */
	const typeColors: Record<TransactionType, string> = {
		buy: '#10b981',
		sell: '#ef4444',
		dividend: '#f59e0b',
		transfer_in: '#3b82f6',
		transfer_out: '#3b82f6',
		transfer: '#3b82f6',
		initial_balance: '#a78bfa'
	};

	// ------------------------------------------------------------------
	// Traspaso a otro fondo
	// ------------------------------------------------------------------

	/**
	 * ⚠️ **Todo este estado entra en el `$effect` guardado por ticker de arriba.**
	 * Desde `ManageAssets` el modal cambia de activo **sin remontarse**, así que un
	 * destino que sobreviviera al cambio enseñaría el traspaso de un activo bajo el
	 * nombre de otro — origen de uno y destino del anterior, que es exactamente la
	 * claridad que este formulario existe para dar.
	 */
	let showTransferForm = $state(false);
	let destinoTicker = $state<string | null>(null);
	let modoCuanto = $state<'todo' | 'importe' | 'participaciones'>('todo');
	let importePedido = $state(0);
	let participacionesPedidas = $state(0);
	let fechaTraspaso = $state(Date.now());
	let mostrarPrecios = $state(false);
	let precioOrigenManual = $state<number | null>(null);

	/**
	 * ⚠️ **Cómo queda el destino, escrito por el usuario, y `null` mientras no lo
	 * toque.** El `null` no es un cero disfrazado: distingue «acepto lo que has
	 * estimado» de «te corrijo con lo que dice mi banco», y es lo que permite
	 * precargar sin que el precargado se quede pegado cuando cambian el importe o el
	 * destino.
	 */
	let destinoParticipacionesManual = $state<number | null>(null);
	let destinoCosteMedioManual = $state<number | null>(null);

	function resetTransferForm() {
		destinoTicker = null;
		modoCuanto = 'todo';
		importePedido = 0;
		participacionesPedidas = 0;
		fechaTraspaso = Date.now();
		mostrarPrecios = false;
		precioOrigenManual = null;
		destinoParticipacionesManual = null;
		destinoCosteMedioManual = null;
	}

	/**
	 * ⚠️ **El traspaso solo se ofrece desde un fondo, y esto se vio abriendo la
	 * pantalla, no leyendo el código.**
	 *
	 * Abierto el libro de una acción, los cinco candidatos caían bajo «esto sería un
	 * reembolso y tributa»: correcto en el fondo —desde una acción nada está exento—
	 * pero el rótulo mentía, porque desde una acción no es un reembolso, es una
	 * **venta**. Y sobre todo, ofrecía una operación que ahí no existe: el
	 * diferimiento del art. 94 es entre IIC. Desde una acción mover dinero es vender
	 * y comprar, que es lo que el formulario normal ya hace.
	 *
	 * Con el origen restringido a fondos, los dos grupos de la lista dicen
	 * exactamente lo que son: traspaso o reembolso.
	 */
	const puedeTraspasar = $derived(canBeTransferred(asset));

	/** Todos los activos de la cartera menos el propio origen. */
	const candidatos = $derived(
		[...portfolio.coreAssets, ...portfolio.satelliteAssets, ...portfolio.stockAssets].filter(
			(a) => a.ticker !== asset.ticker
		)
	);

	/**
	 * Los candidatos partidos por trato fiscal, y **eso es la interfaz**.
	 *
	 * Un desplegable plano con un aviso *después* de elegir te deja descubrir la
	 * consecuencia cuando ya has decidido. Agrupar la pone delante, en el momento de
	 * elegir, sin regañar a nadie: elegir un ETF sigue siendo legítimo, solo tiene
	 * otro precio.
	 */
	const candidatosSinTributar = $derived(
		candidatos.filter((a) => classifyMove(asset, a).taxFree)
	);
	const candidatosQueTributan = $derived(
		candidatos.filter((a) => !classifyMove(asset, a).taxFree)
	);

	const destino = $derived(candidatos.find((a) => a.ticker === destinoTicker) ?? null);

	/** Precio unitario en divisa base, que es lo que pide `planificarTraspaso`. */
	function precioBaseDe(ticker: string): number {
		const p = portfolio.pricesWithFx[ticker];
		return p?.price ?? 0;
	}

	const precioOrigen = $derived(precioOrigenManual ?? precioBaseDe(asset.ticker));

	const participacionesOrigen = $derived(
		portfolio.effectiveHoldings[asset.ticker]?.shares ?? 0
	);

	const cuanto = $derived<CuantoTraspasar>(
		modoCuanto === 'todo'
			? { modo: 'todo' }
			: modoCuanto === 'importe'
				? { modo: 'importe', importe: importePedido }
				: { modo: 'participaciones', participaciones: participacionesPedidas }
	);

	/** Lo que el destino tiene ahora, que es de lo que se resta para saber qué entra. */
	const destinoAntes = $derived.by(() => {
		if (!destino) return { participaciones: 0, costeTotalBase: 0 };
		const h = portfolio.effectiveHoldings[destino.ticker];
		const participaciones = h?.shares ?? 0;
		/*
		 * `totalCostBase` es el coste exacto en divisa base cuando existe —lo precalcula
		 * el libro—, y si no, se reconstruye del coste medio. No se puede dar por hecho:
		 * un activo en modo manual no lo tiene.
		 */
		return {
			participaciones,
			costeTotalBase: h?.totalCostBase ?? participaciones * (h?.avgCost ?? 0)
		};
	});

	const entradaComun = $derived(
		destino
			? {
					origen: asset,
					destino,
					transacciones: portfolio.transactions,
					participacionesOrigen,
					precioOrigen,
					precioDestinoHoy: precioBaseDe(destino.ticker),
					cuanto,
					destinoAntes,
					fecha: fechaTraspaso
				}
			: null
	);

	/**
	 * El plan **sin declarar nada**, que es de donde sale la estimación con la que se
	 * precargan los dos campos del destino.
	 *
	 * ⚠️ Va antes que `planTraspaso` y no se puede fusionar con él: leer la estimación
	 * del plan final sería una dependencia circular —el plan necesita el estado y el
	 * estado necesita el plan—, y reconstruirla en el componente sería una segunda
	 * copia de la misma aritmética. Con esto la estimación tiene un único sitio: el
	 * módulo la resuelve y la devuelve en `destinoResultante`.
	 */
	const planEstimado = $derived(entradaComun ? planificarTraspaso(entradaComun) : null);

	/** Lo que se pinta en los dos campos: lo escrito, o la estimación. */
	const destinoResultante = $derived({
		participaciones:
			destinoParticipacionesManual ?? planEstimado?.destinoResultante.participaciones ?? 0,
		costeMedio: destinoCosteMedioManual ?? planEstimado?.destinoResultante.costeMedio ?? 0
	});

	const estadoDeclarado = $derived(
		destinoParticipacionesManual !== null || destinoCosteMedioManual !== null
	);

	/*
	 * Con nada declarado el plan es el estimado tal cual: una sola llamada. En cuanto
	 * el usuario toca un campo se recalcula con lo que ha puesto, y entonces el módulo
	 * puede además comparar las dos cifras y devolver el descuadre.
	 */
	const planTraspaso = $derived(
		!entradaComun
			? null
			: !estadoDeclarado
				? planEstimado
				: planificarTraspaso({ ...entradaComun, destinoResultante })
	);

	/** Si el destino sigue en modo manual, apuntarle el traspaso exige sembrarlo. */
	const destinoEnManual = $derived(
		destino ? !(portfolio.holdings[destino.ticker]?.useLedger ?? false) : false
	);

	function valorDe(ticker: string): number {
		return (portfolio.effectiveHoldings[ticker]?.shares ?? 0) * precioBaseDe(ticker);
	}

	function participacionesDe(ticker: string): number {
		return portfolio.effectiveHoldings[ticker]?.shares ?? 0;
	}

	function confirmarTraspaso() {
		const plan = planTraspaso;
		if (!plan || !meritaApuntar(plan)) return;

		// Sembrar antes de escribir: si no, el `transfer_in` cae en un activo cuyo
		// libro nadie mira y no cambia nada visible.
		if (destinoEnManual && destino) {
			portfolio.seedLedgerFromManual(destino.ticker, plan.fecha);
		}

		portfolio.registrarTraspaso(plan);
		ui.addToast($LL.ledger.toast_traspaso_hecho(), 'success');
		ui.hapticFeedback('medium');
		showTransferForm = false;
		resetTransferForm();
	}

	/** El otro fondo de un traspaso, para poder nombrarlo en la fila. */
	function contraparteDe(tx: Transaction): Asset | null {
		if (!tx.transferId) return null;
		const otra = portfolio.transactions.find(
			(t) => t.transferId === tx.transferId && t.ticker !== tx.ticker
		);
		if (!otra) return null;
		return (
			[...portfolio.coreAssets, ...portfolio.satelliteAssets, ...portfolio.stockAssets].find(
				(a) => a.ticker === otra.ticker
			) ?? null
		);
	}
</script>

<svelte:window onkeydown={alPulsarTecla} onpointerdown={cerrarCalendarioFuera} />

<div class="ledger-overlay" transition:fade={{ duration: 150 }}>
	<button class="ledger-backdrop" onclick={onClose} aria-label={$LL.common.close()}></button>

	<!--
		⚠️ `use:focusTrap` va en el **panel**, no en el overlay, igual que en
		`ImportModal`: el fondo de cierre es un `<button>` y en el overlay sería el
		primer elemento enfocable, o sea que abrir el modal dejaría el foco sobre
		«cerrar». Limitación conocida de la acción, común a los cinco modales:
		fotografía los elementos enfocables al montar, así que el formulario de alta
		—que aparece después— queda fuera del ciclo de tabulación.
	-->
	<div
		class="ledger-panel"
		transition:fly={{ y: 20, duration: 200 }}
		use:focusTrap
		role="dialog"
		aria-modal="true"
		aria-labelledby="ledger-title"
	>
		<div class="ledger-header" style="--accent: {asset.color}">
			<div class="asset-brand">
				<span class="asset-icon">{asset.icon}</span>
				<div>
					<h2 class="asset-name" id="ledger-title">{asset.name}</h2>
					<p class="asset-ticker">{asset.ticker}</p>
				</div>
			</div>
			<button class="close-btn" onclick={onClose}>✕</button>
		</div>

		<div class="pestanas" role="tablist">
			<button
				class="pestana"
				class:activa={pestana === 'ficha'}
				role="tab"
				aria-selected={pestana === 'ficha'}
				onclick={() => (pestana = 'ficha')}
			>
				{$LL.ficha.tab_ficha()}
			</button>
			<button
				class="pestana"
				class:activa={pestana === 'libro'}
				role="tab"
				aria-selected={pestana === 'libro'}
				onclick={() => (pestana = 'libro')}
			>
				{$LL.ficha.tab_libro()}
			</button>
		</div>

		<div class="ledger-body">
			{#if pestana === 'ficha'}
				<FichaDelActivo {asset} onVerLibro={() => (pestana = 'libro')} />
			{:else}
			<!-- Ledger Toggle -->
			<div class="mode-selector" class:active={useLedger}>
				<div class="mode-info">
					<span class="mode-title">{useLedger ? '✅ ' + $LL.ledger.active() : '⚪ ' + $LL.ledger.manual()}</span>
					<p class="mode-desc">
						{#if useLedger}
							{$LL.ledger.desc_active()}
						{:else}
							{$LL.ledger.desc_manual()}
						{/if}
					</p>
				</div>
				<button class="toggle-btn" onclick={toggleMode}>
					{useLedger ? $LL.ledger.btn_deactivate() : $LL.ledger.btn_activate()}
				</button>
			</div>

			{#if useLedger}
				<div class="stats-grid" in:slide>
					<div class="stat-card">
						<span class="stat-label">{$LL.ledger.label_shares()}</span>
						<span class="stat-value">{ledgerSummary.shares.toLocaleString()}</span>
					</div>
					<div class="stat-card">
						<span class="stat-label">{$LL.dashboard.avg_cost()}</span>
						<span class="stat-value">{formatCurrency(ledgerSummary.avgCost, defaultCurrency)}</span>
					</div>
					<div class="stat-card">
						<span class="stat-label">{$LL.dashboard.value_total()}</span>
						<span class="stat-value">{formatCurrency(ledgerSummary.shares * defaultPrice, defaultCurrency)}</span>
					</div>
				</div>

				<div class="transactions-section">
					<div class="section-header">
						<h3>{$LL.ledger.title_history()}</h3>
						<div class="section-actions">
							{#if puedeTraspasar}
								<button class="transfer-btn" onclick={() => { if (showTransferForm) { showTransferForm = false; resetTransferForm(); } else { showTransferForm = true; showAddForm = false; } }}>
									{showTransferForm ? $LL.common.cancel() : $LL.ledger.btn_traspasar()}
								</button>
							{/if}
							<button class="add-tx-btn" onclick={() => { if (showAddForm) { cancelForm(); } else { showAddForm = true; showTransferForm = false; } }}>
								{showAddForm ? $LL.common.cancel() : $LL.ledger.btn_add_tx()}
							</button>
						</div>
					</div>

					{#if showTransferForm && puedeTraspasar}
						<!--
							⚠️ **Los dos fondos son la pieza central, no dos etiquetas de campo.**
							La forma evidente —un formulario con un campo rotulado «destino»— deja
							el origen *implícito*: solo lo dice la cabecera del modal, arriba y
							fuera del formulario, mientras el usuario mira el campo. Aquí origen y
							destino son dos filas con icono, nombre y posición, y la flecha entre
							ellas lleva el importe.
						-->
						<div class="transfer-form" transition:slide>
							<h4 class="form-title">{$LL.ledger.title_traspaso()}</h4>

							<div class="ruta">
								<div class="ruta-lado">
									<span class="ruta-rotulo">{$LL.ledger.label_desde()}</span>
									<!--
										El origen es de solo lectura: has abierto el libro de ese fondo.
										Ofrecerlo como un `<select>` de una opción sugeriría que se puede
										cambiar y volvería ambiguo lo que ahora es obvio.
									-->
									<div class="ruta-activo">
										<span class="ruta-icono" aria-hidden="true">{asset.icon}</span>
										<div class="ruta-texto">
											<span class="ruta-nombre">{descriptiveAssetLabel(asset)}</span>
											<span class="ruta-posicion privacy-blur">
												{$LL.ledger.tienes_participaciones({
													shares: participacionesOrigen.toLocaleString($locale === 'es' ? 'es-ES' : 'en-US'),
													valor: formatEUR(valorDe(asset.ticker))
												})}
											</span>
										</div>
									</div>
								</div>

								<div class="ruta-flecha" aria-hidden="true">
									<span class="flecha-glifo">↓</span>
									{#if planTraspaso && planTraspaso.importe > 0}
										<span class="flecha-importe privacy-blur">{formatEUR(planTraspaso.importe)}</span>
									{/if}
								</div>

								<div class="ruta-lado">
									<span class="ruta-rotulo">{$LL.ledger.label_hacia()}</span>
									{#if destino}
										<div class="ruta-activo">
											<span class="ruta-icono" aria-hidden="true">{destino.icon}</span>
											<div class="ruta-texto">
												<span class="ruta-nombre">{descriptiveAssetLabel(destino)}</span>
												<span class="ruta-posicion privacy-blur">
													{$LL.ledger.tienes_participaciones({
														shares: participacionesDe(destino.ticker).toLocaleString($locale === 'es' ? 'es-ES' : 'en-US'),
														valor: formatEUR(valorDe(destino.ticker))
													})}
												</span>
											</div>
										<button class="ruta-cambiar" onclick={() => { destinoTicker = null; destinoParticipacionesManual = null; destinoCosteMedioManual = null; }}>
												{$LL.ledger.cambiar_destino()}
											</button>
										</div>

										<!--
											⚠️ **El estado final del destino, y sustituye a pedir un «precio de
											entrada».** En un traspaso los dos valores liquidativos —el de reembolso
											y el de suscripción— se fijan días después de dar la orden, así que el
											usuario no los sabe: pedírselos convertía dos cifras que tiene delante
											en el extracto en dos que tiene que adivinar, y cualquier error ahí
											descuadra las dos posiciones al céntimo sin forma de cerrarlo luego.

											Lo que sí sabe es cuántas participaciones tiene en el fondo destino y a
											qué coste medio. De ahí sale lo que entra, por resta y sin dividir por
											ningún precio. Y se cuadra por construcción: al declarar el final no
											queda residuo.

											Van precargados con la estimación de la app, así que en el caso fácil
											se aceptan y en el real se escribe encima.
										-->
										<div class="estado-destino">
											<span class="grupo-rotulo">{$LL.ledger.label_como_queda()}</span>
											<div class="form-row">
												<div class="form-group">
													<label for="tr-dp">{$LL.ledger.label_participaciones_totales()}</label>
													<input
														id="tr-dp"
														type="number"
														step="0.001"
														min="0"
														value={destinoResultante.participaciones}
														onchange={(e) => {
															const v = Number((e.currentTarget as HTMLInputElement).value);
															destinoParticipacionesManual = Number.isFinite(v) && v >= 0 ? v : null;
														}}
													/>
												</div>
												<div class="form-group">
													<label for="tr-dc">{$LL.ledger.label_coste_medio_final()}</label>
													<input
														id="tr-dc"
														type="number"
														step="0.0001"
														min="0"
														value={destinoResultante.costeMedio}
														onchange={(e) => {
															const v = Number((e.currentTarget as HTMLInputElement).value);
															destinoCosteMedioManual = Number.isFinite(v) && v >= 0 ? v : null;
														}}
													/>
												</div>
											</div>
											<p class="estado-nota">{$LL.ledger.nota_como_queda()}</p>
										</div>
									{:else}
										<!--
											La consecuencia fiscal va en la ESTRUCTURA de la lista, no en un
											aviso posterior: agrupada, se lee antes de elegir.
										-->
										<div class="destino-lista" role="group" aria-label={$LL.ledger.elegir_destino()}>
											{#if candidatosSinTributar.length > 0}
												<span class="destino-grupo">{$LL.ledger.grupo_sin_tributar()}</span>
												{#each candidatosSinTributar as cand (cand.ticker)}
													<button class="destino-op" data-ticker={cand.ticker} onclick={() => (destinoTicker = cand.ticker)}>
														<span class="ruta-icono" aria-hidden="true">{cand.icon}</span>
														<span class="destino-nombre">{descriptiveAssetLabel(cand)}</span>
														<span class="destino-tipo">{$LL.ficha[`tipo_${instrumentTypeOf(cand)}`]()}</span>
														<span class="destino-valor privacy-blur">{formatEUR(valorDe(cand.ticker))}</span>
													</button>
												{/each}
											{/if}
											{#if candidatosQueTributan.length > 0}
												<span class="destino-grupo destino-grupo-tributa">{$LL.ledger.grupo_tributa()}</span>
												{#each candidatosQueTributan as cand (cand.ticker)}
													<button class="destino-op" data-ticker={cand.ticker} onclick={() => (destinoTicker = cand.ticker)}>
														<span class="ruta-icono" aria-hidden="true">{cand.icon}</span>
														<span class="destino-nombre">{descriptiveAssetLabel(cand)}</span>
														<span class="destino-tipo">{$LL.ficha[`tipo_${instrumentTypeOf(cand)}`]()}</span>
														<span class="destino-valor privacy-blur">{formatEUR(valorDe(cand.ticker))}</span>
													</button>
												{/each}
											{/if}
										</div>
									{/if}
								</div>
							</div>

							{#if destino}
								<div class="form-group">
									<span class="grupo-rotulo">{$LL.ledger.label_cuanto()}</span>
									<!-- «Todo» es el caso mayoritario, y así no hay ninguna cuenta que hacer. -->
									<div class="cuanto-switch">
										<button class:active={modoCuanto === 'todo'} onclick={() => (modoCuanto = 'todo')}>{$LL.ledger.cuanto_todo()}</button>
										<button class:active={modoCuanto === 'importe'} onclick={() => (modoCuanto = 'importe')}>{$LL.ledger.cuanto_importe()}</button>
										<button class:active={modoCuanto === 'participaciones'} onclick={() => (modoCuanto = 'participaciones')}>{$LL.ledger.cuanto_participaciones()}</button>
									</div>
								</div>

								{#if modoCuanto === 'importe'}
									<div class="form-group">
										<label for="tr-importe">{$LL.ledger.cuanto_importe()}</label>
										<input id="tr-importe" type="number" step="0.01" min="0" bind:value={importePedido} />
									</div>
								{:else if modoCuanto === 'participaciones'}
									<div class="form-group">
										<label for="tr-part">{$LL.ledger.cuanto_participaciones()}</label>
										<input id="tr-part" type="number" step="0.001" min="0" bind:value={participacionesPedidas} />
									</div>
								{/if}

								<div class="form-group">
									<label for="tr-fecha">{$LL.ledger.label_date()}</label>
									<input
										id="tr-fecha"
										type="date"
										value={new Date(fechaTraspaso).toISOString().slice(0, 10)}
										onchange={(e) => { const v = (e.currentTarget as HTMLInputElement).value; if (v) fechaTraspaso = new Date(v).getTime(); }}
									/>
								</div>

							<!--
									Plegado, y **solo el del origen**. El de entrada ya no se pide: lo
									sustituye el estado final del destino de arriba. Este sigue existiendo
									porque es lo que valora *cuánto* sale cuando se pide por importe, y
									porque el valor liquidativo de reembolso también puede no ser el de hoy.
								-->
								<button class="precios-toggle" onclick={() => (mostrarPrecios = !mostrarPrecios)}>
									{mostrarPrecios ? '▾' : '▸'} {$LL.ledger.ajustar_precios()}
								</button>
								{#if mostrarPrecios}
									<div class="form-group" transition:slide>
										<label for="tr-po">{$LL.ledger.label_precio_salida()}</label>
										<input id="tr-po" type="number" step="0.0001" min="0" value={precioOrigen} onchange={(e) => (precioOrigenManual = Number((e.currentTarget as HTMLInputElement).value) || null)} />
									</div>
								{/if}

								{#if planTraspaso && meritaApuntar(planTraspaso)}
									<!-- Tres frases, tres preguntas distintas: qué pasa con mis
									     participaciones, qué debo, y qué pasa con mi historia. -->
									<div class="resumen">
										<p class="resumen-linea">
											{$LL.ledger.resumen_participaciones({
												salen: planTraspaso.participacionesOrigen.toLocaleString($locale === 'es' ? 'es-ES' : 'en-US'),
												origen: descriptiveAssetLabel(asset),
												entran: planTraspaso.participacionesDestino.toLocaleString($locale === 'es' ? 'es-ES' : 'en-US'),
												destino: descriptiveAssetLabel(destino)
											})}
										</p>
										<p class="resumen-linea" class:resumen-tributa={!planTraspaso.sinTributar}>
											{#if planTraspaso.sinTributar}
												{$LL.ledger.resumen_sin_tributar()}
											{:else if planTraspaso.trato === 'reembolso'}
												{$LL.ledger.resumen_reembolso()}
											{:else}
												{$LL.ledger.resumen_venta()}
											{/if}
										</p>
										<!-- Los tres estados del coste se ramifican por estado, nunca
										     comparando contra cero: un 0 € se lee como «no arrastras nada»
										     cuando lo que pasa es que no se sabe. -->
										<p class="resumen-linea resumen-coste">
											{#if planTraspaso.estadoCoste === 'sin-libro'}
												{$LL.ledger.resumen_sin_libro()}
											{:else if planTraspaso.estadoCoste === 'parcial'}
												{$LL.ledger.resumen_parcial({ coste: formatEUR(planTraspaso.costeHeredado ?? 0) })}
											{:else}
												{$LL.ledger.resumen_coste_heredado({
													coste: formatEUR(planTraspaso.costeHeredado ?? 0),
													// `formatDate` de utils devuelve ISO, que no es para leer. Aquí la
													// fecha la lee una persona, así que va en su locale.
													fecha: new Date(
														planTraspaso.fechaLoteHeredado ?? planTraspaso.fecha
													).toLocaleDateString($locale === 'es' ? 'es-ES' : 'en-US', {
														day: 'numeric',
														month: 'short',
														year: 'numeric'
													})
												})}
										{/if}
										</p>
										<!--
											⚠️ **Aquí había un aviso de «descuadre» y se ha quitado, no movido.**
											Comparaba lo declarado contra los lotes del origen dando por hecho que
											las dos cifras eran la misma cosa. No lo son —una es el importe
											suscrito y la otra el valor de adquisición— así que difieren por la
											plusvalía latente **por construcción**: era un aviso permanente sobre
											datos correctos, que es la forma de fallo que este repo persigue.

											Lo que sí hay que decir es que son dos cifras y por qué, porque si no
											el usuario compara el coste medio de la app con el de su banco, no
											cuadran, y da la app por rota. Solo cuando de verdad hay dos números.
										-->
										{#if planTraspaso.costeHeredado !== null && planTraspaso.costeSuscripcion !== null && Math.abs(planTraspaso.costeSuscripcion - planTraspaso.costeHeredado) >= 1}
											<p class="resumen-linea resumen-dos-costes">
												{$LL.ledger.resumen_dos_costes({
													suscrito: formatEUR(planTraspaso.costeSuscripcion),
													fiscal: formatEUR(planTraspaso.costeHeredado)
												})}
											</p>
										{/if}
									</div>

									{#if destinoEnManual}
										<p class="aviso-manual">
											{$LL.ledger.aviso_destino_manual({ destino: descriptiveAssetLabel(destino) })}
										</p>
									{/if}

									<!-- El importe va en el rótulo: no se puede confirmar sin haber leído
									     lo que se va a apuntar. -->
									<button class="submit-tx-btn" onclick={confirmarTraspaso}>
										{$LL.ledger.btn_confirmar_traspaso({ importe: formatEUR(planTraspaso.importe) })}
									</button>
								{/if}
							{/if}
						</div>
					{/if}

					{#if showAddForm}
						<div class="add-tx-form" transition:slide>
							{#if editingTxId}
								<h4 class="form-title">{$LL.ledger.title_edit_tx()}</h4>
							{/if}
							<div class="form-row">
								<div class="form-group">
									<label for="tx-type">{$LL.ledger.label_type()}</label>
									<select id="tx-type" bind:value={newTx.type}>
										<option value="buy">{$LL.ledger.type_buy()}</option>
										<option value="sell">{$LL.ledger.type_sell()}</option>
										<option value="dividend">{$LL.ledger.type_dividend()}</option>
										<option value="initial_balance">{$LL.ledger.type_initial_balance()}</option>
										<option value="transfer">{$LL.ledger.type_transfer()}</option>
									</select>
								</div>
								<div class="form-group" style="position: relative;">
									<label for="tx-date">{$LL.ledger.label_date()}</label>
									<input
										id="tx-date"
										type="text"
										readonly
										value={new Date(newTx.date || Date.now()).toLocaleDateString($locale === 'es' ? 'es-ES' : 'en-US')}
										onclick={openDatePicker}
										style="cursor: pointer;"
									/>

									{#if showDatePicker}
										<div class="date-picker">

											{#if pickerStep === 'day'}
												<div class="picker-header">
													<button onclick={() => { pickerViewDate = new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() - 1, 1); }}>‹</button>
													<button class="picker-title" onclick={() => pickerStep = 'month'}>
														{pickerViewDate.toLocaleDateString($locale === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
													</button>
													<button onclick={() => { pickerViewDate = new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() + 1, 1); }}>›</button>
												</div>
												<div class="picker-weekdays">
													{#each ($locale === 'es' ? ['L','M','X','J','V','S','D'] : ['M','T','W','T','F','S','S']) as d}<span>{d}</span>{/each}
												</div>
												<div class="picker-days">
													{#each Array(getFirstDayOfWeek(pickerViewDate.getFullYear(), pickerViewDate.getMonth())).fill(null) as _}
														<span></span>
													{/each}
													{#each Array(getDaysInMonth(pickerViewDate.getFullYear(), pickerViewDate.getMonth())).fill(0).map((_, i) => i + 1) as day}
														<button
															class="day-btn"
															class:selected={new Date(newTx.date || 0).toDateString() === new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth(), day).toDateString()}
															onclick={() => selectDay(day)}
														>{day}</button>
													{/each}
												</div>

											{:else if pickerStep === 'month'}
												<div class="picker-header">
													<button onclick={() => { pickerViewDate = new Date(pickerViewDate.getFullYear() - 1, pickerViewDate.getMonth(), 1); }}>‹</button>
													<button class="picker-title" onclick={() => pickerStep = 'year'}>{pickerViewDate.getFullYear()}</button>
													<button onclick={() => { pickerViewDate = new Date(pickerViewDate.getFullYear() + 1, pickerViewDate.getMonth(), 1); }}>›</button>
												</div>
												<div class="picker-months">
													{#each ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'] as m, i}
														<button
															class="month-btn"
															class:selected={pickerViewDate.getMonth() === i}
															onclick={() => selectMonth(i)}
														>{m}</button>
													{/each}
												</div>

											{:else if pickerStep === 'year'}
												<div class="picker-header">
													<span class="picker-title">Selecciona año</span>
												</div>
												<div class="picker-years">
													{#each Array(12).fill(0).map((_, i) => new Date().getFullYear() - 5 + i) as year}
														<button
															class="year-btn"
															class:selected={pickerViewDate.getFullYear() === year}
															onclick={() => selectYear(year)}
														>{year}</button>
													{/each}
												</div>
											{/if}

										</div>
									{/if}
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="tx-shares">{$LL.ledger.label_shares()}</label>
									<input id="tx-shares" type="number" step="0.001" bind:value={newTx.shares} />
								</div>
								<div class="form-group">
									<label for="tx-price">{$LL.ledger.label_price()}</label>
									<input id="tx-price" type="number" step="0.0001" bind:value={newTx.price} />
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="tx-fees">{$LL.ledger.label_fees()}</label>
									<input id="tx-fees" type="number" step="0.01" bind:value={newTx.fees} />
								</div>
								<div class="form-group">
									<label for="tx-currency">{$LL.ledger.label_currency()}</label>
									<div class="fx-group">
										<input id="tx-currency" type="text" class="currency-input" bind:value={newTx.currency} maxlength="3" disabled title={$LL.ledger.title_currency_from_asset()} />
										<input type="number" step="0.0001" class="fx-input" bind:value={newTx.fxRate} title={$LL.ledger.title_fx_rate()} />
									</div>
								</div>
							</div>

							<button class="submit-tx-btn" onclick={submitTransaction}>
								{editingTxId ? $LL.ledger.btn_save_changes() : $LL.ledger.btn_save_tx()}
							</button>
						</div>
					{/if}

					<div class="tx-list">
						{#if transactions.length === 0}
							<div class="empty-state">{$LL.ledger.empty_history()}</div>
						{:else}
							{#each transactions as tx (tx.id)}
								{@const contraparte = contraparteDe(tx)}
								{@const esSalida = tx.type === 'transfer_out' || tx.type === 'sell'}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="tx-item" class:tx-item-editing={editingTxId === tx.id} onclick={() => startEdit(tx)} in:slide>
									<div class="tx-type-dot" style="background: {typeColors[tx.type]}"></div>
									<div class="tx-main">
										<span class="tx-type-label">{typeLabels[tx.type]}</span>
										<!--
											El otro fondo, nombrado con su flecha: así abras el libro que abras
											sigue estando claro de dónde a dónde fue el dinero.
										-->
										{#if contraparte}
											<span class="tx-contraparte">
												{esSalida
													? $LL.ledger.hacia_fondo({ fondo: descriptiveAssetLabel(contraparte) })
													: $LL.ledger.desde_fondo({ fondo: descriptiveAssetLabel(contraparte) })}
											</span>
										{/if}
										<span class="tx-date">{new Date(tx.date).toLocaleDateString()}</span>
									</div>
									<div class="tx-details">
										<!--
											⚠️ Dos defectos en esta línea, los dos vistos en pantalla.
											Imprimía `+` en **todas** las filas, ventas incluidas, así que la
											dirección no se leía en ninguna parte salvo el rótulo. Y el número iba
											crudo, o sea con punto decimal: `334.922` participaciones se leen como
											trescientas mil en español, un factor mil en una app de dinero.
										-->
										<span class="tx-shares">{esSalida ? '−' : '+'}{tx.shares.toLocaleString($locale === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 3 })}</span>
										<span class="tx-price">{formatCurrency(tx.price, tx.currency)}</span>
									</div>
									<button class="tx-delete" onclick={(e) => { e.stopPropagation(); removeTx(tx.id); }}>✕</button>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{:else}
				<div class="manual-notice">
					<div class="notice-icon">ℹ️</div>
					<p>{@html $LL.ledger.notice_manual({ bold: `<b>${$LL.ledger.notice_manual_bold()}</b>` })}</p>
					<p class="notice-sub">{@html $LL.ledger.notice_manual_sub({ bold: `<b>${$LL.ledger.notice_manual_sub_bold()}</b>` })}</p>
				</div>
			{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.ledger-overlay {
		position: fixed;
		inset: 0;
		z-index: 300;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.ledger-backdrop {
		position: absolute;
		inset: 0;
		background: var(--bg-scrim);
		backdrop-filter: blur(4px);
		border: none;
		width: 100%;
		height: 100%;
	}

	.ledger-panel {
		position: relative;
		width: 100%;
		max-width: 500px;
		background: var(--bg-overlay);
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		overflow: hidden;
		box-shadow: 0 30px 60px rgba(0,0,0,0.8);
		display: flex;
		flex-direction: column;
		max-height: 90vh;
	}

	.ledger-header {
		padding: 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: linear-gradient(to bottom right, rgba(255,255,255,0.02), transparent);
		border-top: 4px solid var(--accent);
	}

	.asset-brand {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.asset-icon {
		font-size: 2rem;
	}

	.asset-name {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.asset-ticker {
		font-size: 0.8rem;
		color: var(--text-faint);
		margin: 0;
		font-family: monospace;
	}

	.close-btn {
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		width: 32px;
		height: 32px;
		border-radius: 8px;
		cursor: pointer;
	}

	.pestanas {
		display: flex;
		gap: 0.25rem;
		padding: 0 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
		/* No se encoge: es el control que decide qué se ve debajo. */
		flex-shrink: 0;
	}

	.pestana {
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 0.7rem 0.9rem;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
	}

	.pestana:hover {
		color: var(--text-secondary);
	}

	/*
	 * La pestaña activa se marca con el subrayado **y** con el color del texto: dos
	 * canales, porque solo con el color quedaría a merced de la discriminación de
	 * tono, que es la regla que este proyecto aplica en los gráficos.
	 */
	.pestana.activa {
		color: var(--text-primary);
		border-bottom-color: var(--accent-blue);
	}

	.ledger-body {
		padding: 1.5rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.mode-selector {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		transition: all 0.3s;
	}

	.mode-selector.active {
		background: rgba(16, 185, 129, 0.05);
		border-color: rgba(16, 185, 129, 0.2);
	}

	.mode-title {
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--text-primary);
		display: block;
	}

	.mode-desc {
		font-size: 0.75rem;
		color: var(--text-faint);
		margin: 0.2rem 0 0;
	}

	.toggle-btn {
		background: var(--accent-blue);
		color: var(--text-on-accent);
		border: none;
		padding: 0.5rem 0.8rem;
		border-radius: 10px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.stat-card {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		padding: 0.75rem;
		border-radius: 12px;
		text-align: center;
	}

	.stat-label {
		display: block;
		font-size: 0.65rem;
		color: var(--text-faint);
		text-transform: uppercase;
		margin-bottom: 0.2rem;
	}

	.stat-value {
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.transactions-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-header h3 {
		font-size: 0.9rem;
		margin: 0;
		color: var(--text-primary);
	}

	.section-actions {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	/* El borde era `rgba(255,255,255,0.2)` a mano, que sobre una superficie clara no
	   es nada: el mismo defecto que dejó las tarjetas de métricas sin caja. */
	.add-tx-btn {
		background: var(--bg-card-hover);
		border: 1px dashed var(--border-subtle);
		color: var(--text-primary);
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.transfer-btn {
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	/* ---------------- Traspaso a otro fondo ---------------- */

	.transfer-form {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	/*
	 * La tarjeta de la ruta: los dos fondos apilados con la flecha en medio. Es lo
	 * primero y lo más grande del formulario a propósito — el requisito es que se vea
	 * de qué fondo a qué fondo, y eso no lo cumple un campo rotulado «destino».
	 */
	.ruta {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 0.75rem;
	}

	.ruta-lado {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		/* Un hijo flex nace con `min-width: auto`, y sin esto los nombres largos
		   ensanchan la tarjeta en vez de truncarse. */
		min-width: 0;
	}

	.ruta-rotulo {
		font-size: var(--text-micro);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
		font-weight: 700;
	}

	.ruta-activo {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}

	.ruta-icono {
		font-size: 1.15rem;
		flex-shrink: 0;
		line-height: 1;
	}

	.ruta-texto {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.ruta-nombre {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ruta-posicion {
		font-size: var(--text-micro);
		color: var(--text-muted);
	}

	.ruta-cambiar {
		background: none;
		border: none;
		color: var(--accent-blue-ink);
		font-size: var(--text-micro);
		font-weight: 700;
		cursor: pointer;
		flex-shrink: 0;
		padding: 0.25rem;
	}

	.ruta-flecha {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.15rem 0;
	}

	.flecha-glifo {
		color: var(--text-muted);
		font-size: 1rem;
		line-height: 1;
	}

	/* El importe vive en la flecha: es la respuesta a «cuánto muevo» justo donde ya
	   estás mirando la dirección. */
	.flecha-importe {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.destino-lista {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		max-height: 220px;
		overflow-y: auto;
	}

	.destino-grupo {
		font-size: var(--text-micro);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-green-ink);
		padding: 0.4rem 0.2rem 0.15rem;
	}

	.destino-grupo-tributa {
		color: var(--accent-orange-ink);
	}

	.destino-op {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.45rem 0.55rem;
		cursor: pointer;
		text-align: left;
		min-width: 0;
	}

	.destino-op:hover {
		border-color: var(--border-strong);
	}

	.destino-nombre {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-primary);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.destino-tipo {
		font-size: var(--text-micro);
		color: var(--text-faint);
		flex-shrink: 0;
	}

	.destino-valor {
		font-size: var(--text-micro);
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.grupo-rotulo {
		font-size: 0.7rem;
		color: var(--text-faint);
		font-weight: 600;
	}

	.cuanto-switch {
		display: flex;
		gap: 0.25rem;
	}

	.cuanto-switch button {
		flex: 1;
		min-width: 0;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		color: var(--text-muted);
		border-radius: 8px;
		padding: 0.45rem 0.3rem;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.cuanto-switch button.active {
		background: var(--accent-blue);
		border-color: var(--accent-blue);
		color: var(--text-on-accent);
	}

	.precios-toggle {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		align-self: flex-start;
		padding: 0.2rem 0;
	}

	/* Tres frases y no una tabla: cada línea contesta a algo distinto. */
	.resumen {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 0.7rem 0.8rem;
	}

	.resumen-linea {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.resumen-tributa {
		color: var(--accent-orange-ink);
		font-weight: 600;
	}

	.resumen-coste {
		color: var(--text-muted);
	}

	.resumen-dos-costes {
		color: var(--accent-orange-ink);
	}

	/* Va dentro de la tarjeta de la ruta, pegado a la fila del destino, porque es lo
	   que declara ese fondo y no un campo suelto del formulario. */
	.estado-destino {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.5rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border-subtle);
	}

	.estado-nota {
		margin: 0;
		font-size: var(--text-micro);
		line-height: 1.45;
		color: var(--text-muted);
	}

	.aviso-manual {
		margin: 0;
		font-size: var(--text-micro);
		line-height: 1.45;
		color: var(--accent-orange-ink);
		background: var(--tint-warn);
		border: 1px solid var(--tint-warn-line);
		border-radius: 10px;
		padding: 0.5rem 0.7rem;
	}

	.tx-contraparte {
		font-size: var(--text-micro);
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.add-tx-form {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent-blue-ink);
		margin: 0 0 0.25rem 0;
	}

	/*
	 * ⚠️ `minmax(0, 1fr)` y no `1fr`, que es `minmax(auto, 1fr)`: el mínimo `auto` de un
	 * elemento de rejilla es su tamaño de contenido mínimo, y un `input[type=number]`
	 * tiene un ancho intrínseco de ~150 px que **no encoge**. Dos de ellos más el hueco
	 * no caben en un contenedor estrecho y la fila se sale.
	 *
	 * Estaba así desde siempre y no se veía porque estas filas colgaban directamente
	 * del formulario, que es ancho; se destapó al anidar una dentro de la tarjeta de la
	 * ruta, que tiene su propio relleno. Lo cazó el e2e de 390 px midiendo cada elemento
	 * contra su contenedor: `right: 431` contra un límite de `349`.
	 */
	.form-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		/* La otra mitad del arreglo de arriba: sin esto el propio grupo tampoco encoge. */
		min-width: 0;
	}

	.form-group label {
		font-size: 0.7rem;
		color: var(--text-faint);
		font-weight: 600;
	}

	.form-group input, .form-group select {
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.5rem;
		color: var(--text-primary);
		font-size: 0.85rem;
		/*
		 * Que el campo ocupe su columna en vez de su ancho intrínseco, y `border-box`
		 * para que el relleno y el borde no lo saquen de ella. `.currency-input` lleva su
		 * ancho con `!important` y sigue ganando.
		 */
		width: 100%;
		box-sizing: border-box;
		min-width: 0;
	}

	.fx-group {
		display: flex;
		gap: 0.25rem;
	}

	.currency-input { width: 45px !important; text-align: center; }
	.fx-input { flex: 1; }

	.submit-tx-btn {
		background: var(--surface-green);
		color: var(--text-on-accent);
		border: none;
		padding: 0.75rem;
		border-radius: 10px;
		font-weight: 700;
		cursor: pointer;
		margin-top: 0.5rem;
	}

	.tx-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tx-item {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tx-item:hover {
		background: var(--bg-card-hover);
		border-color: rgba(255,255,255,0.15);
	}

	.tx-item.tx-item-editing {
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.4);
	}

	.tx-type-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.tx-main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.tx-type-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.tx-date {
		font-size: 0.65rem;
		color: var(--text-faint);
	}

	.tx-details {
		text-align: right;
		display: flex;
		flex-direction: column;
	}

	.tx-shares {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.tx-price {
		font-size: 0.7rem;
		color: var(--text-faint);
	}

	.tx-delete {
		background: transparent;
		border: none;
		color: var(--state-negative);
		cursor: pointer;
		padding: 0.5rem;
	}

	.tx-delete:hover { color: var(--state-negative); }

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--text-faint);
		font-size: 0.85rem;
		font-style: italic;
	}

	.manual-notice {
		text-align: center;
		padding: 2rem 1rem;
		background: var(--bg-card);
		border-radius: 20px;
		border: 1px dashed rgba(255,255,255,0.1);
	}

	.notice-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.manual-notice p {
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.notice-sub {
		font-size: 0.75rem !important;
		color: var(--text-faint) !important;
		margin-top: 1rem;
	}

	.date-picker {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 11;
		background: var(--bg-overlay);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 12px;
		padding: 0.75rem;
		width: 240px;
		box-shadow: 0 8px 32px rgba(0,0,0,0.6);
	}
	.picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
	.picker-header button {
		background: none;
		border: none;
		color: var(--text-primary);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		font-size: 1rem;
	}
	.picker-header button:hover { background: var(--bg-card-hover); }
	.picker-title { font-weight: 600; font-size: 0.85rem; text-transform: capitalize; flex: 1; text-align: center; }
	.picker-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-size: 0.65rem;
		color: var(--text-faint);
		margin-bottom: 0.25rem;
	}
	.picker-days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}
	.day-btn {
		aspect-ratio: 1;
		border-radius: 6px;
		font-size: 0.75rem;
		color: var(--text-secondary);
		background: none;
		border: none;
		cursor: pointer;
	}
	.day-btn:hover { background: rgba(255,255,255,0.1); }
	.day-btn.selected { background: var(--accent-blue); color: var(--text-on-accent); font-weight: 700; }
	.picker-months, .picker-years {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
	}
	.month-btn, .year-btn {
		padding: 0.4rem;
		border-radius: 6px;
		font-size: 0.8rem;
		color: var(--text-secondary);
		background: none;
		border: none;
		cursor: pointer;
		text-align: center;
	}
	.month-btn:hover, .year-btn:hover { background: rgba(255,255,255,0.1); }
	.month-btn.selected, .year-btn.selected { background: var(--accent-blue); color: var(--text-on-accent); font-weight: 700; }
</style>