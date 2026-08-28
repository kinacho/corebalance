<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { focusTrap } from '$lib/actions/focusTrap';
	import { LL, locale } from '$lib/i18n/i18n-svelte';
	import { importFromCSV, importWithMapping, generateCsvSignature, reduceTransactionsToPositions } from '$lib/importers';
	import type { ImportResult, ParsedPosition, MappingConfig, SkippedDetail } from '$lib/importers';
	import { planificarImportacion } from '$lib/importers/ledger-import';
	import {
		hayDireccionSupuesta,
		sugerirTraspasos,
		aplicarDireccion,
		resolverCostesHeredados,
		type ParejaSugerida
	} from '$lib/importers/direccion';
	import { formatCurrency, formatShares } from '$lib/utils';
	import { ASSET_ICONS } from '$lib/constants';
	import { nextAssetColor } from '$lib/asset-colors';
	import { resolveInstrumentType, canBeTransferred } from '$lib/instrument-type';
	import type { Asset, AssetCategory } from '$lib/types';
	import { resolveAssetIcon } from '$lib/asset-icon';
	import { onMount, onDestroy } from 'svelte';
	import { bloquearScroll, desbloquearScroll } from '$lib/modal-lock';
	import ColumnMapper from './ColumnMapper.svelte';

	interface Props { onClose: () => void; }
	let { onClose }: Props = $props();

	/**
	 * ⚠️ Quitaba el bloqueo **siempre**, y este modal solo se abre desde dentro de
	 * `ManageAssets`: al cerrarlo, la página de detrás volvía a moverse bajo el
	 * panel de gestión, que seguía abierto. Ver `modal-lock.ts`.
	 */
	onMount(() => bloquearScroll());
	onDestroy(() => desbloquearScroll());

	// --- State Machine ---
	type Step = 'upload' | 'mapping' | 'resolving' | 'direccion' | 'preview' | 'done';
	let step = $state<Step>('upload');
	let isDragging = $state(false);
	let rawFileContent = $state<string>('');
	let importResult = $state<ImportResult | null>(null);
	let resolvedMap = $state<Record<string, { ticker: string; name: string; type: string; exchange: string }>>({});
	let selectedPositions = $state<Set<string>>(new Set());
	let targetCategory = $state<AssetCategory>('stocks');
	let resolveError = $state<string | null>(null);
	let importedCount = $state(0);
	/** Cuántos activos han entrado con libro de operaciones, para decirlo al terminar. */
	let conLibro = $state(0);
	let activeSignature = $state<string>('');
	let savedMapping = $state<MappingConfig | undefined>(undefined);
	let showSkippedDetails = $state(false);
	const skippedDetails = $derived(importResult?.skippedDetails ?? []);

	/**
	 * ⚠️ **El paso de dirección, que existe porque hay exports donde una salida y una
	 * compra son literalmente la misma fila.** Ver `direccion.ts`: el de Órdenes de
	 * MyInvestor no trae columna de tipo, así que el parser tiene que suponer compra, y
	 * suponerlo en silencio dejaba el fondo con el **doble** de lo que salió sin un solo
	 * aviso. Solo aparece cuando hay algo que suponer.
	 */
	let salidasMarcadas = $state<Set<number>>(new Set());
	let traspasosConfirmados = $state<ParejaSugerida[]>([]);
	let traspasosSugeridos = $state<ParejaSugerida[]>([]);

	const operacionesCrudas = $derived(importResult?.transactions ?? []);

	/**
	 * Lo que se va a escribir, recalculado en cada clic.
	 *
	 * ⚠️ **La previsualización tiene que enseñar el mismo número que se escribe**, así
	 * que las posiciones del paso salen de la misma cadena que usa `confirmImport`:
	 * decidir → resolver el coste que viaja → agregar. Calcularlas por otro camino sería
	 * volver a tener dos aritméticas para la misma cifra.
	 */
	const operacionesDecididas = $derived(
		aplicarDireccion(operacionesCrudas, {
			salidas: salidasMarcadas,
			traspasos: traspasosConfirmados
		})
	);
	const costesHeredados = $derived(resolverCostesHeredados(operacionesDecididas));
	const recalculo = $derived(
		reduceTransactionsToPositions(operacionesDecididas)
	);
	const posicionesRecalculadas = $derived(recalculo.positions);
	/**
	 * ⚠️ **Los avisos del agregador se enseñan aquí y no solo en la previsualización.**
	 *
	 * Marcar una salida de más deja el fondo a cero, y una posición a cero **desaparece
	 * del listado**: sin el aviso, el usuario ve un fondo esfumarse de «cómo queda cada
	 * fondo» y no tiene nada que mirar — que es exactamente el defecto por el que
	 * `reduceTransactionsToPositions` devuelve avisos. Aquí es más importante que en la
	 * previsualización, porque este es el paso donde el usuario puede deshacerlo.
	 */
	const avisosDelRecalculo = $derived(recalculo.warnings);

	/**
	 * Las operaciones en orden de extracto, conservando su índice original.
	 *
	 * El índice es la identidad en todo este paso —las decisiones se guardan por índice—
	 * así que ordenar sin llevárselo detrás desalinearía cada clic con su fila.
	 */
	const ordenCronologico = $derived(
		operacionesCrudas
			.map((op, idx) => ({ idx, op }))
			.sort((a, b) => a.op.date.getTime() - b.op.date.getTime())
	);

	/** Índice → la pareja confirmada en la que participa, para pintar la fila. */
	const parejaDe = $derived.by(() => {
		const mapa = new Map<number, ParejaSugerida>();
		for (const p of traspasosConfirmados) {
			mapa.set(p.salida, p);
			mapa.set(p.entrada, p);
		}
		return mapa;
	});

	const esSalida = (idx: number) =>
		operacionesDecididas[idx]?.type === 'SELL' || operacionesDecididas[idx]?.type === 'TRANSFER_OUT';

	function alternarDireccion(idx: number) {
		// Una fila dentro de un traspaso confirmado no se voltea suelta: se deshace la pareja.
		if (parejaDe.has(idx)) return;
		const s = new Set(salidasMarcadas);
		s.has(idx) ? s.delete(idx) : s.add(idx);
		salidasMarcadas = s;
		ui.hapticFeedback('light');
	}

	function confirmarTraspaso(pareja: ParejaSugerida) {
		traspasosConfirmados = [...traspasosConfirmados, pareja];
		ui.hapticFeedback('medium');
	}

	function deshacerTraspaso(pareja: ParejaSugerida) {
		traspasosConfirmados = traspasosConfirmados.filter(
			(p) => !(p.salida === pareja.salida && p.entrada === pareja.entrada)
		);
	}

	const estaConfirmada = (pareja: ParejaSugerida) =>
		traspasosConfirmados.some((p) => p.salida === pareja.salida && p.entrada === pareja.entrada);

	/** El nombre de una operación tal y como se puede enseñar: el resuelto si lo hay. */
	function nombreDeOperacion(idx: number): string {
		const op = operacionesCrudas[idx];
		if (!op) return '';
		const resuelto = op.isin ? resolvedMap[op.isin] : undefined;
		return resuelto?.name || op.name || op.isin || '';
	}

	/**
	 * Día, mes y año con dos cifras el día y el mes.
	 *
	 * Sin `2-digit` sale «10/1/2026» junto a «15/3/2026»: en una columna de fechas que se
	 * lee de arriba abajo para localizar una operación, la anchura variable obliga a leer
	 * cada línea entera en vez de barrer.
	 */
	const fechaCorta = (d: Date) =>
		d.toLocaleDateString($locale === 'en' ? 'en-GB' : 'es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});

	/**
	 * Cierra el paso: lo decidido pasa a ser el resultado de la importación.
	 *
	 * Se rehace la selección entera porque las posiciones se han recalculado y sus
	 * índices no tienen por qué ser los de antes. `resolvedMap` sí sobrevive: va por
	 * ISIN, y los ISIN no cambian por marcar una salida.
	 */
	function cerrarPasoDeDireccion() {
		if (!importResult) return;
		importResult = {
			...importResult,
			positions: posicionesRecalculadas,
			transactions: operacionesDecididas,
			// Los del parseo más los que hayan salido de lo decidido, sin duplicar.
			warnings: [...new Set([...importResult.warnings, ...avisosDelRecalculo])]
		};
		selectedPositions = new Set(posicionesRecalculadas.map((_, i) => String(i)));
		step = 'preview';
	}

	// --- File Handling ---
	function handleDragOver(e: DragEvent) { e.preventDefault(); isDragging = true; }
	function handleDragLeave() { isDragging = false; }

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) processFile(file);
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) processFile(file);
	}

	function processFile(file: File) {
		if (!file.name.match(/\.(csv|txt|tsv)$/i)) {
			ui.addToast($LL.toasts.invalid_file_type(), 'error');
			return;
		}
		if (file.size > 1 * 1024 * 1024) {
			ui.addToast($LL.toasts.file_too_large(), 'error');
			return;
		}

		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result as string;
			if (!text) return;
			rawFileContent = text;
			
			// Obtenemos los datos crudos para el mapeo o importación directa
			const result = importFromCSV(text);
			importResult = result;

			if (result.broker.id !== 'generic' && result.broker.confidence >= 0.7) {
				// Bróker detectado correctamente, saltar el paso de mapeo
				ui.addToast($LL.toasts.broker_detected({ brokerName: result.broker.name }), 'success');
				startResolution(result);
			} else {
				// Bróker desconocido, requiere mapeo manual
				if (result.rawHeaders && result.rawRows) {
					activeSignature = generateCsvSignature(result.rawHeaders, result.rawRows);
					try {
						const saved = localStorage.getItem('csv_mapping_' + activeSignature);
						if (saved) {
							savedMapping = JSON.parse(saved);
							ui.addToast($LL.toasts.mapping_loaded(), 'success');
						} else {
							savedMapping = undefined;
						}
					} catch {
						savedMapping = undefined;
					}
				}
				step = 'mapping';
			}
		};
		reader.readAsText(file);
	}

	function handleManualMapping(mapping: MappingConfig) {
		if (activeSignature) {
			try {
				localStorage.setItem('csv_mapping_' + activeSignature, JSON.stringify(mapping));
			} catch {
				// Silencioso
			}
		}
		const result = importWithMapping(rawFileContent, mapping);
		importResult = result;
		startResolution(result);
	}

	function startResolution(result: ImportResult) {
		if (result.positions.length === 0) {
			ui.addToast($LL.toasts.no_positions_found(), 'error');
			step = 'upload';
			return;
		}
		// Select all by default
		selectedPositions = new Set(result.positions.map((_, i) => String(i)));
		resolveISINs(result.positions);
	}

	// --- ISIN Resolution ---
	async function resolveISINs(positions: ParsedPosition[]) {
		step = 'resolving';
		resolveError = null;

		const isins = positions.filter(p => p.isin).map(p => p.isin);
		const tickers = positions.filter(p => !p.isin && p.ticker).map(p => p.ticker!);

		try {
			const res = await fetch('/api/resolve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isins: [...new Set(isins)], tickers: [...new Set(tickers)] })
			});

			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();

			const map: typeof resolvedMap = {};
			for (const r of data.resolved || []) {
				if (r.ticker) {
					map[r.query] = { ticker: r.ticker, name: r.name || r.ticker, type: r.type || '', exchange: r.exchange || '' };
				}
			}
			resolvedMap = map;
			step = siguientePaso();
		} catch (e) {
			resolveError = e instanceof Error ? e.message : $LL.common.error_generic();
			step = siguientePaso(); // Still show what we have
		}
	}

	/**
	 * El paso de dirección se interpone **solo cuando hay algo que decidir**.
	 *
	 * Un fichero que dice el tipo de cada fila no tiene nada que preguntar, y meter una
	 * pantalla en medio del caso normal para cubrir el raro es cobrarle a todo el mundo
	 * el precio de un export concreto. Las sugerencias se calculan aquí, una vez, y no
	 * en un `$derived`: dependen de las operaciones crudas, que ya no cambian.
	 */
	function siguientePaso(): Step {
		const ops = importResult?.transactions ?? [];
		if (!hayDireccionSupuesta(ops)) return 'preview';
		traspasosSugeridos = sugerirTraspasos(ops, { esTraspasable });
		return 'direccion';
	}

	/**
	 * ⚠️ **Solo un fondo se traspasa, y esto se pregunta con la regla que ya existe.**
	 *
	 * `canBeTransferred()` es `instrumentTypeOf(...) === 'fund'`, que es la misma
	 * condición que `classifyMove()` exige en el origen y en el destino: un fondo que se
	 * reembolsa para comprar un ETF **tributa** aunque el origen sea un fondo. Escribirla
	 * aquí otra vez sería una regla fiscal en dos sitios, que es peor que un color
	 * repetido.
	 *
	 * El tipo de Yahoo (`MUTUALFUND`) es la señal limpia y llega en `resolvedMap`; sin
	 * resolución se cae a `resolveInstrumentType`, que decide por ticker, nombre e ISIN —
	 * y ante la duda devuelve `other`, que aquí significa no proponer nada.
	 */
	function esTraspasable(op: { isin?: string; ticker?: string; name: string }): boolean {
		const resuelto = resolvedMap[op.isin || ''] || resolvedMap[op.ticker || ''];
		return canBeTransferred({
			ticker: resuelto?.ticker || op.ticker || '',
			name: resuelto?.name || op.name,
			isin: op.isin || '',
			instrumentType: resolveInstrumentType(
				resuelto?.ticker || op.ticker || '',
				resuelto?.name || op.name,
				resuelto?.type || '',
				op.isin || ''
			)
		} as Asset);
	}

	// --- Import Logic ---
	function getResolvedTicker(pos: ParsedPosition): string | null {
		if (pos.isin && resolvedMap[pos.isin]) return resolvedMap[pos.isin].ticker;
		if (pos.ticker && resolvedMap[pos.ticker]) return resolvedMap[pos.ticker].ticker;
		if (pos.ticker) return pos.ticker;
		return null;
	}

	function getResolvedName(pos: ParsedPosition): string {
		if (pos.isin && resolvedMap[pos.isin]) return resolvedMap[pos.isin].name;
		if (pos.ticker && resolvedMap[pos.ticker]) return resolvedMap[pos.ticker].name;
		return pos.name;
	}

	function togglePosition(idx: string) {
		const s = new Set(selectedPositions);
		s.has(idx) ? s.delete(idx) : s.add(idx);
		selectedPositions = s;
	}

	function toggleAll() {
		if (!importResult) return;
		if (selectedPositions.size === importResult.positions.length) {
			selectedPositions = new Set();
		} else {
			selectedPositions = new Set(importResult.positions.map((_, i) => String(i)));
		}
	}

	/**
	 * ⚠️ **Esta función era la copia vieja y rota.** `AssetSearch.svelte` tenía la
	 * misma escrita a mano, se arregló allí el respaldo aleatorio
	 * (`ASSET_COLORS[Math.floor(Math.random() * …)]`, que puede devolver un tono
	 * ya presente en la cartera) y aquí se quedó como estaba — así que la ruta de
	 * importación de CSV, que es por donde entra una cartera entera de golpe,
	 * seguía repartiendo colores al azar en cuanto se pasaba de seis activos.
	 * Ahora las dos llaman a `$lib/asset-colors`, que es el único sitio con la
	 * regla y tiene sus tests.
	 */
	function getNextColor(): string {
		return nextAssetColor([
			...portfolio.coreAssets,
			...portfolio.satelliteAssets,
			...portfolio.stockAssets
		]);
	}

	async function confirmImport() {
		if (!importResult) return;

		// --- Validation FIX 5 ---
		const weightsByCategory: Record<AssetCategory, number> = {
			core: portfolio.coreAssets.reduce((sum, a) => sum + (a.targetWeight || 0), 0),
			satellite: portfolio.satelliteAssets.reduce((sum, a) => sum + (a.targetWeight || 0), 0),
			stocks: portfolio.stockAssets.reduce((sum, a) => sum + (a.targetWeight || 0), 0)
		};

		// Calcular pesos de los nuevos activos (siempre entran con targetWeight 0 según lógica actual,
		// pero por seguridad validamos la categoría destino si la lógica cambiara)
		// En este caso, el usuario solo elige UNA categoría para TODOS los nuevos activos.
		let newAssetsWeight = 0;
		// (Actualmente el código asigna targetWeight: 0 a los nuevos, pero validamos por si acaso)
		
		if (weightsByCategory[targetCategory] > 1.0001) {
			const catNames = { core: $LL.manage.option_core_short(), satellite: $LL.manage.option_satellite_short(), stocks: $LL.manage.option_stocks_short() };
			ui.addToast($LL.toasts.category_weight_limit({ catName: catNames[targetCategory], weight: (weightsByCategory[targetCategory] * 100).toFixed(0) }), 'error');
			return;
		}
		// --- End Validation ---

		let count = 0;

		/**
		 * ⚠️ Consolidar por ticker **antes** de escribir, no escribir una posición detrás de
		 * otra.
		 *
		 * `updateHolding` sustituye, no suma. Dentro de un mismo fichero eso significaba que
		 * dos posiciones que resuelven al mismo ticker de Yahoo —las dos clases de un fondo,
		 * o el ISIN viejo y el nuevo de un split— se pisaban: sobrevivía la última, mientras
		 * `importedCount` contaba las dos y le decía al usuario que había importado ambas.
		 * La invariante «dos posiciones con el mismo identificador se consolidan con coste
		 * medio ponderado» ya la aplican `aggregateParsedPositions` y
		 * `reduceTransactionsToPositions` dentro del parser; se perdía justo al escribir.
		 *
		 * Lo que **no** se ha cambiado, y es deliberado: importar un segundo CSV sobre un
		 * activo que ya existe sigue sustituyendo en vez de sumar. Sumar arreglaría el caso
		 * «el mismo fondo en dos brókeres» y rompería uno peor y más frecuente —reimportar
		 * el mismo fichero duplicaría la cartera—, y el badge «⟳ Actualizar» de la
		 * previsualización ya anuncia que esa fila reemplaza.
		 */
		const porTicker = new Map<string, { shares: number; totalCost: number; pos: ParsedPosition }>();
		for (const [idx, pos] of importResult.positions.entries()) {
			if (!selectedPositions.has(String(idx))) continue;

			const ticker = getResolvedTicker(pos);
			if (!ticker) continue;

			const previo = porTicker.get(ticker);
			if (previo) {
				previo.shares += pos.shares;
				previo.totalCost += pos.shares * pos.avgCost;
			} else {
				porTicker.set(ticker, { shares: pos.shares, totalCost: pos.shares * pos.avgCost, pos });
			}
		}

		/**
		 * Qué activos pueden entrar con **libro de operaciones**, decidido en
		 * `ledger-import.ts` porque es lo que determina si la cartera enseña el número
		 * correcto de participaciones. Un CSV con fechas trae la historia entera; sin
		 * libro, el panel de IRPF queda apagado y la reconstrucción del patrimonio no
		 * puede ir hacia atrás. Pero `effectiveHoldings` prefiere el libro a las
		 * participaciones manuales, así que se activa sólo cuando cuadra.
		 */
		const plan = planificarImportacion({
			posiciones: [...porTicker.entries()].map(([ticker, agrupado]) => ({
				ticker,
				posicion: agrupado.pos,
				shares: agrupado.shares,
				avgCost: agrupado.shares > 0 ? agrupado.totalCost / agrupado.shares : 0
			})),
			operaciones: importResult.transactions ?? [],
			tickerDe: (op) => {
				const porIsin = op.isin ? resolvedMap[op.isin]?.ticker : undefined;
				return porIsin ?? (op.ticker ? op.ticker.toUpperCase() : null) ?? null;
			},
			/*
			 * ⚠️ Se recalcula sobre `importResult.transactions`, que a estas alturas ya son
			 * las decididas: `cerrarPasoDeDireccion()` las ha escrito ahí. Volver a calcular
			 * en vez de arrastrar el `$derived` del paso es a propósito — el paso puede no
			 * haber existido (un fichero que sí dice el tipo trae sus traspasos de fábrica,
			 * y también heredan coste), así que este camino tiene que valer para los dos.
			 */
			costesHeredados: resolverCostesHeredados(importResult.transactions ?? [])
		});
		const planPorTicker = new Map(plan.map((p) => [p.ticker, p]));

		for (const [ticker, agrupado] of porTicker) {
			const pos = agrupado.pos;
			const shares = agrupado.shares;
			const avgCost = shares > 0 ? agrupado.totalCost / shares : 0;
			const suPlan = planPorTicker.get(ticker);

			/**
			 * El orden importa: primero las operaciones, después `useLedger`. Al revés,
			 * `ledgerHoldings` se recalcularía con el libro vacío y la posición pasaría por
			 * cero antes de aparecer, que es un parpadeo a cero en el patrimonio.
			 */
			if (suPlan?.conLibro) {
				portfolio.addTransactions(suPlan.operaciones);
			}

			if (portfolio.hasAsset(ticker)) {
				// Update holdings only
				portfolio.updateHolding(ticker, { shares, avgCost, useLedger: suPlan?.conLibro || undefined });
				count++;
				continue;
			}

			const resolved = resolvedMap[pos.isin] || resolvedMap[pos.ticker || ''];

			const asset: Asset = {
				ticker,
				name: getResolvedName(pos),
				isin: pos.isin || '',
				targetWeight: 0,
				color: getNextColor(),
				icon: resolveAssetIcon(ticker, getResolvedName(pos), resolved?.type || ''),
				ter: 0,
				category: targetCategory,
				/**
				 * ⚠️ El tipo de Yahoo llega en `resolved.type` y se estaba tirando aquí.
				 *
				 * `MUTUALFUND` es la señal más limpia que existe para «fondo», y esta línea
				 * es el **único** sitio de la ruta de importación por la que puede pasar: el
				 * activo se guardaba sin `instrumentType`, así que lo rellenaba
				 * `normalizeAssets()` con `resolveInstrumentType(..., '', ...)` —sin tipo de
				 * Yahoo— y además lo **persistía**, dejando el valor equivocado fijado para
				 * siempre. Un fondo entraba como `other` y ningún plan de traspaso lo
				 * proponía nunca, sin error en ninguna parte.
				 *
				 * El valor ya se calculaba dos líneas más arriba, con un `mapType()` que
				 * traducía el tipo de Yahoo a una etiqueta en castellano… y cuyo resultado no
				 * leía nadie. Código muerto que era justo el dato que faltaba, así que la
				 * función se ha borrado en lugar de dejarla ahí.
				 */
				instrumentType: resolveInstrumentType(
					ticker,
					getResolvedName(pos),
					resolved?.type || '',
					pos.isin || ''
				)
			};

			portfolio.addAsset(asset);
			portfolio.updateHolding(ticker, { shares, avgCost, useLedger: suPlan?.conLibro || undefined });
			count++;
		}

		conLibro = plan.filter((p) => p.conLibro).length;

		importedCount = count;
		step = 'done';
		ui.hapticFeedback('heavy');

		// Refresh prices for new tickers
		await portfolio.fetchPrices();
	}

	function handleKeydown(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }

	const selectedCount = $derived(selectedPositions.size);
	const resolvableCount = $derived(
		importResult?.positions.filter((p, i) => selectedPositions.has(String(i)) && getResolvedTicker(p)).length ?? 0
	);
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="import-overlay" role="dialog" aria-modal="true" aria-label={$LL.import.title()}>
	<button class="import-backdrop" onclick={onClose} aria-label={$LL.common.close()}></button>
	<div class="import-panel" use:focusTrap>
		<!-- Header -->
		<div class="import-header">
			<div>
				<h2 class="import-title">📥 {$LL.import.title()} <span class="beta-badge">Beta</span></h2>
				<p class="import-subtitle">
					{#if step === 'upload'}{$LL.import.subtitle_upload()}
					{:else if step === 'mapping'}{$LL.import.subtitle_mapping()}
					{:else if step === 'resolving'}{$LL.import.subtitle_resolving()}
					{:else if step === 'direccion'}{$LL.import.subtitle_direction()}
					{:else if step === 'preview'}{$LL.import.subtitle_preview()}
					{:else}{$LL.import.subtitle_done()}
					{/if}
				</p>
			</div>
			<button class="close-btn" onclick={onClose} aria-label={$LL.common.close()}>
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
			</button>
		</div>

		<div class="import-body">
			<!-- STEP 1: Upload -->
			{#if step === 'upload'}
				<div class="upload-zone" class:dragging={isDragging}
					ondragover={handleDragOver} ondragleave={handleDragLeave} ondrop={handleDrop}
					role="button" tabindex="0">
					<div class="upload-icon">📂</div>
					<p class="upload-title">{$LL.import.upload_title()}</p>
					<p class="upload-hint">{$LL.import.upload_hint()}</p>
					<input type="file" accept=".csv,.tsv,.txt" class="file-input" onchange={handleFileInput} />
				</div>
				<div class="broker-badges">
					<span class="broker-badge">CSV Universal ({$LL.import.subtitle_mapping()})</span>
				</div>

				<div class="import-guide">
					<h3 class="guide-title">{$LL.import.guide_title()}</h3>
					<p class="guide-text">{@html $LL.import.guide_text({ bold: `<strong>${$LL.import.guide_text_bold()}</strong>` })}</p>
					<ul class="guide-list">
						<li><strong>{$LL.import.guide_col_id()}</strong>{$LL.import.guide_col_id_desc()}</li>
						<li><strong>{$LL.import.guide_col_shares()}</strong>{$LL.import.guide_col_shares_desc()}</li>
						<li><strong>{$LL.import.guide_col_cost()}</strong>{$LL.import.guide_col_cost_desc()}</li>
					</ul>
					<p class="guide-note">{$LL.import.guide_note()}</p>
				</div>

				<p class="privacy-note">{$LL.import.privacy_note()}</p>

			<!-- STEP 2: Mapping -->
			{:else if step === 'mapping'}
				{#if importResult}
					<ColumnMapper 
						headers={importResult.rawHeaders || []} 
						rows={importResult.rawRows || []}
						onConfirm={handleManualMapping}
						onBack={() => step = 'upload'}
						initialMapping={savedMapping}
					/>
				{/if}

			<!-- STEP 3: Resolving -->
			{:else if step === 'resolving'}
				<div class="resolving-state">
					<div class="resolving-spinner"></div>
					<p>{$LL.import.resolving_count({ count: importResult?.positions.length ?? 0 })}</p>
					<p class="resolving-hint">{$LL.import.resolving_hint()}</p>
				</div>

			<!--
				STEP 3.5: Dirección.

				⚠️ Solo aparece cuando el fichero no puede decir si una orden entra o sale.
				Nada de aquí se aplica solo: lo que hace la pantalla es enseñar la
				suposición que el parser ya estaba haciendo en silencio, y darle al usuario
				la forma de corregirla **antes** de que se escriba nada. Ver `direccion.ts`.
			-->
			{:else if step === 'direccion'}
				<div class="dir-explica">
					<p class="dir-titulo">⚠️ {$LL.import.dir_title()}</p>
					<p class="dir-texto">{$LL.import.dir_explain()}</p>
					<p class="dir-texto dir-doble">{$LL.import.dir_explain_double()}</p>
				</div>

				{#each traspasosSugeridos as pareja (`${pareja.salida}-${pareja.entrada}`)}
					{@const confirmada = estaConfirmada(pareja)}
					{@const idTraspaso = operacionesDecididas[pareja.entrada]?.transferId}
					{@const heredado = idTraspaso ? costesHeredados.get(idTraspaso) : undefined}
					{@const salida = operacionesCrudas[pareja.salida]}
					{@const entrada = operacionesCrudas[pareja.entrada]}
					<div class="dir-sugerencia" class:confirmada>
						<p class="dir-sug-titulo">🔄 {$LL.import.dir_suggest_title()}</p>
						<p class="dir-sug-detalle">
							{$LL.import.dir_suggest_detail({
								amountOut: formatCurrency(salida.shares * salida.price, salida.currency),
								from: nombreDeOperacion(pareja.salida),
								dateOut: fechaCorta(salida.date),
								amountIn: formatCurrency(entrada.shares * entrada.price, entrada.currency),
								to: nombreDeOperacion(pareja.entrada),
								days: pareja.dias
							})}
						</p>
						{#if confirmada}
							<!--
								Que el destino herede el coste cambia lo que la app enseña frente a
								lo que enseña el banco, así que se dice aquí y no en una nota al pie:
								la casilla «invertido» del banco es el importe suscrito, y esta es la
								que tributará.
							-->
							{#if heredado?.coste != null}
								<p class="dir-sug-coste">
									{$LL.import.dir_suggest_cost({
										to: nombreDeOperacion(pareja.entrada),
										cost: formatCurrency(heredado.coste, entrada.currency)
									})}
								</p>
							{:else}
								<p class="dir-sug-coste dir-sug-sin-coste">
									{$LL.import.dir_suggest_no_cost({ from: nombreDeOperacion(pareja.salida) })}
								</p>
							{/if}
							<button class="dir-sug-btn deshacer" onclick={() => deshacerTraspaso(pareja)}>
								✓ {$LL.import.dir_suggest_undo()}
							</button>
						{:else}
							<button class="dir-sug-btn" onclick={() => confirmarTraspaso(pareja)}>
								{$LL.import.dir_suggest_confirm()}
							</button>
						{/if}
					</div>
				{/each}

				<div class="dir-lista">
					{#each ordenCronologico as { idx, op } (idx)}
						{@const enPareja = parejaDe.has(idx)}
						{@const fuera = esSalida(idx)}
						<div class="dir-fila" class:es-salida={fuera}>
							<span class="dir-fecha">{fechaCorta(op.date)}</span>
							<span class="dir-nombre">{nombreDeOperacion(idx)}</span>
							<span class="dir-importe">{formatCurrency(op.shares * op.price, op.currency)}</span>
							{#if enPareja}
								<!--
									La flecha no es decoración: las dos patas de un traspaso son dos
									filas idénticas salvo por la dirección, y sin ella el rótulo
									«Traspaso» dice lo mismo en las dos. Misma convención que el
									interruptor de al lado, ↑ sale y ↓ entra.
								-->
								<span class="dir-badge">
									{fuera ? '↑' : '↓'} {$LL.import.dir_transfer_badge()}
								</span>
							{:else}
								<button
									class="dir-toggle"
									class:fuera
									onclick={() => alternarDireccion(idx)}
									aria-pressed={fuera}
								>
									{fuera ? `↑ ${$LL.import.dir_row_out()}` : `↓ ${$LL.import.dir_row_in()}`}
								</button>
							{/if}
						</div>
					{/each}
				</div>

				<!--
					La reconciliación en vivo: es exactamente el gesto con el que se descubrió
					el defecto —mirar la posición de la app al lado de la del banco— así que la
					pantalla lo pone delante en vez de esperar a que alguien lo haga por su
					cuenta después de importar.
				-->
				<div class="dir-resultado">
					<p class="dir-res-titulo">{$LL.import.dir_result_title()}</p>
					{#each avisosDelRecalculo as aviso}
						<p class="dir-res-aviso">⚠️ {aviso}</p>
					{/each}
					{#each posicionesRecalculadas as pos (pos.isin || pos.name)}
						<div class="dir-res-fila">
							<span class="dir-res-nombre">{resolvedMap[pos.isin]?.name || pos.name}</span>
							<span class="dir-res-cifras">
								{$LL.import.dir_result_line({
									shares: formatShares(pos.shares),
									avgCost: formatCurrency(pos.avgCost, pos.currency)
								})}
							</span>
						</div>
					{/each}
					<p class="dir-res-pista">{$LL.import.dir_compare_hint()}</p>
				</div>

			<!-- STEP 3: Preview -->
			{:else if step === 'preview'}
				{#if importResult}
					<div class="preview-header-row">
						<div class="broker-detected">
							<span>📄</span>
							<span class="broker-name">{$LL.import.assets_identified()}</span>
						</div>
						<div class="category-picker">
							<label for="import-category">{$LL.import.add_to()}</label>
							<select id="import-category" bind:value={targetCategory}>
								<option value="core">{$LL.manage.title_core()}</option>
								<option value="satellite">{$LL.manage.title_satellite()}</option>
								<option value="stocks">{$LL.manage.title_stocks()}</option>
							</select>
						</div>
					</div>

					{#if resolveError}
						<div class="resolve-warning">⚠️ {resolveError} — {$LL.import.warnings_resolve()}</div>
					{/if}

					{#if importResult.warnings.length > 0}
						{#each importResult.warnings as warning}
							<div class="resolve-warning">⚠️ {warning}</div>
						{/each}
					{/if}

					{#if importResult.skippedRows > 0}
						<div class="import-summary-banner">
							ℹ️ {$LL.import.summary_banner({ positions: importResult.positions.length, skipped: importResult.skippedRows })}
							{#if skippedDetails.length > 0}
								<button class="skipped-toggle" onclick={() => showSkippedDetails = !showSkippedDetails}>
									{showSkippedDetails ? $LL.import.btn_hide_details() : $LL.import.btn_show_details()}
								</button>
							{/if}
						</div>
						{#if showSkippedDetails && skippedDetails.length > 0}
							<div class="skipped-panel">
								{#each skippedDetails.slice(0, 30) as detail}
									<div class="skipped-row">
										<span class="skipped-line">{$LL.import.skipped_line({ row: detail.rowNumber })}</span>
										<span class="skipped-preview">{detail.preview || '—'}</span>
										<span class="skipped-reason">{detail.reason}</span>
									</div>
								{/each}
								{#if skippedDetails.length > 30}
									<p class="skipped-more">{$LL.import.skipped_more({ count: skippedDetails.length - 30 })}</p>
								{/if}
							</div>
						{/if}
					{/if}

					<div class="select-all-row">
						<button class="select-all-btn" onclick={toggleAll}>
							{selectedPositions.size === importResult.positions.length ? '☑' : '☐'} {$LL.import.select_all()}
						</button>
						<span class="selected-count">{$LL.import.selected_count({ selected: selectedCount, total: importResult.positions.length })}</span>
					</div>

					<div class="positions-list">
						{#each importResult.positions as pos, idx (idx)}
							{@const ticker = getResolvedTicker(pos)}
							{@const isSelected = selectedPositions.has(String(idx))}
							{@const alreadyExists = ticker ? portfolio.hasAsset(ticker) : false}
							<div class="position-row-container">
								<button class="position-row" class:selected={isSelected} class:unresolved={!ticker}
									onclick={() => togglePosition(String(idx))}>
									<span class="pos-check">{isSelected ? '☑' : '☐'}</span>
									<div class="pos-info">
										<span class="pos-name">{getResolvedName(pos)}</span>
										<span class="pos-meta">
											{#if ticker}
												<span class="pos-ticker">{ticker}</span>
											{:else}
												<span class="pos-no-ticker">❌ {$LL.import.not_found()}</span>
											{/if}
											{#if pos.isin}<span class="pos-isin">{pos.isin}</span>{/if}
											{#if alreadyExists}<span class="pos-exists">⟳ {$LL.import.update_badge()}</span>{/if}
										</span>
									</div>
									<div class="pos-numbers">
										<span class="pos-shares">{pos.shares.toFixed(pos.shares % 1 === 0 ? 0 : 3)}</span>
										<span class="pos-cost">{pos.avgCost > 0 ? `${pos.avgCost.toFixed(2)} ${pos.currency}` : '—'}</span>
									</div>
								</button>
								{#if !ticker || isSelected}
									<div class="manual-ticker-edit">
										<input type="text" 
											placeholder={$LL.import.placeholder_ticker()}
											value={ticker || ''}
											onchange={(e) => {
												const val = (e.target as HTMLInputElement).value.toUpperCase().trim();
												if (val) {
													resolvedMap[pos.isin || pos.ticker || String(idx)] = {
														ticker: val,
														name: getResolvedName(pos),
														type: 'EQUITY',
														exchange: ''
													};
												}
											}}
										/>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

			<!-- STEP 4: Done -->
			{:else if step === 'done'}
				<div class="done-state">
					<div class="done-icon">✅</div>
					<p class="done-title">{$LL.import.done_title({ count: importedCount })}</p>
					<!-- Que el libro se haya activado tiene que verse: cambia de dónde salen las
					     participaciones, enciende el panel fiscal y da historia al patrimonio. -->
					{#if conLibro > 0}
						<p class="done-ledger">📖 {$LL.import.done_ledger({ count: conLibro })}</p>
					{/if}
					<p class="done-hint">{$LL.import.done_hint()}</p>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="import-footer">
			{#if step === 'direccion'}
				<button class="btn-import" onclick={cerrarPasoDeDireccion}>
					{$LL.import.btn_continue()}
				</button>
			{:else if step === 'preview'}
				<button class="btn-import" onclick={confirmImport} disabled={resolvableCount === 0}>
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
					{$LL.import.btn_import_assets({ count: resolvableCount })}
				</button>
			{:else if step === 'done'}
				<button class="btn-import" onclick={onClose}>
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
					{$LL.common.close()}
				</button>
			{:else if step === 'upload'}
				<button class="btn-cancel" onclick={onClose}>{$LL.common.cancel()}</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.import-overlay { position:fixed; inset:0; z-index:200; display:flex; align-items:flex-start; justify-content:center; padding-top:5vh; animation:fadeIn .15s ease; }
	@keyframes fadeIn { from{opacity:0} to{opacity:1} }
	.import-backdrop { position:fixed; inset:0; background: var(--bg-scrim); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:none; cursor:default; }
	.import-panel { position:relative; width:92%; max-width:620px; max-height:85vh; background: var(--bg-overlay); backdrop-filter:blur(40px) saturate(200%); -webkit-backdrop-filter:blur(40px) saturate(200%); border:1px solid rgba(255,255,255,.12); border-radius:24px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 25px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.05) inset; animation:slideUp .2s cubic-bezier(.34,1.56,.64,1); }
	@keyframes slideUp { from{transform:translateY(20px) scale(.97);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
	.import-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid rgba(255,255,255,.06); }
	.import-title { font-size:1.1rem; font-weight:700; color:var(--text-primary); margin:0; display:flex; align-items:center; }
	.beta-badge { font-size: 0.6rem; font-weight: 800; color: var(--accent-blue-ink); background: rgba(59, 130, 246, 0.12); padding: 0.15rem 0.45rem; border-radius: 6px; margin-left: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(59, 130, 246, 0.2); }
	.import-subtitle { font-size:.72rem; color:var(--text-muted); margin:0; }
	.close-btn { width:36px; height:36px; border-radius:10px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04); color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
	.close-btn:hover { background:rgba(255,255,255,.08); color:var(--text-primary); }
	.import-body { flex:1; overflow-y:auto; padding:1.25rem 1.5rem; display:flex; flex-direction:column; gap:1rem; }
	/*
	 * ⚠️ **Sin esto el contenido se sale de su propia caja en móvil, y solo en móvil.**
	 * Esto es un flex en columna dentro de un panel con `max-height: 85vh`, así que
	 * sus hijos se encogen por defecto para caber. `.upload-zone` tiene el `overflow`
	 * visible, o sea que al encogerse no recorta ni desplaza: **derrama**. Medido a
	 * 390×844 antes del arreglo, la zona renderizaba 100 px de los 166 que pide y
	 * «Arrastra tu archivo CSV aquí» acababa 68 px **por debajo** del borde punteado,
	 * encima de la insignia y de la guía; a 360 px son 92 px, porque el título parte
	 * en dos líneas. En escritorio da 218 de 214 y cabe: por eso no se veía.
	 *
	 * La regla va sobre todos los hijos y no solo sobre la zona de subida porque el
	 * cuerpo cambia de contenido en cada paso —subir, mapear, resolver, hecho— y el
	 * siguiente que no quepa se derramaría igual sin que nada lo dijera. Lo que tiene
	 * que ceder es el `overflow-y: auto` de arriba, que para eso está.
	 */
	.import-body > * { flex-shrink:0; }
	.import-body::-webkit-scrollbar { width:6px; }
	.import-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:3px; }

	/* Upload Zone */
	.upload-zone { position:relative; padding:3rem 2rem; border:2px dashed rgba(59,130,246,.25); border-radius:20px; text-align:center; cursor:pointer; transition:all .2s; background:rgba(59,130,246,.03); }
	.upload-zone:hover,.upload-zone.dragging { border-color:rgba(59,130,246,.5); background:rgba(59,130,246,.08); }
	.upload-icon { font-size:2.5rem; margin-bottom:.75rem; }
	.upload-title { font-size:1rem; font-weight:700; color:var(--text-primary); margin:0 0 .25rem; }
	.upload-hint { font-size:.75rem; color:var(--text-faint); margin:0; }
	.file-input { position:absolute; inset:0; opacity:0; cursor:pointer; }
	.broker-badges { display:flex; flex-wrap:wrap; gap:.4rem; justify-content:center; }
	.broker-badge { padding:.3rem .6rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; font-size:.65rem; color:var(--text-muted); font-weight:600; }
	.privacy-note { text-align:center; font-size:.65rem; color:var(--accent-green-ink); margin:0; font-weight:600; }

	/* Guide Section */
	.import-guide { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 1.25rem; margin: 0.5rem 0; }
	.guide-title { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem; }
	.guide-text { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.75rem; line-height: 1.4; }
	.guide-list { margin: 0 0 0.75rem; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem; }
	.guide-list li { font-size: 0.72rem; color: var(--text-muted); }
	.guide-list li strong { color: var(--text-secondary); }
	.guide-note { font-size: 0.7rem; color: var(--accent-blue-ink); margin: 0; font-weight: 600; }

	/* Skipped Rows Panel */
	.skipped-toggle { background: none; border: none; color: var(--accent-orange-ink); font-size: 0.65rem; font-weight: 700; cursor: pointer; padding: 0; margin-top: 0.35rem; display: block; }
	.skipped-toggle:hover { color: var(--accent-orange-ink); }
	.skipped-panel { background: var(--bg-card-hover); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 0.5rem; margin-top: 0.4rem; display: flex; flex-direction: column; gap: 0.2rem; max-height: 180px; overflow-y: auto; }
	.skipped-panel::-webkit-scrollbar { width: 4px; }
	.skipped-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px; }
	.skipped-row { display: grid; grid-template-columns: 3.5rem 1fr auto; gap: 0.4rem; align-items: baseline; padding: 0.2rem 0.3rem; border-radius: 6px; }
	.skipped-row:hover { background: rgba(255,255,255,.03); }
	.skipped-line { font-size: 0.6rem; color: var(--text-faint); font-family: 'Monaco','Menlo',monospace; flex-shrink: 0; }
	.skipped-preview { font-size: 0.62rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.skipped-reason { font-size: 0.6rem; color: var(--accent-orange-ink); font-style: italic; flex-shrink: 0; max-width: 130px; text-align: right; }
	.skipped-more { font-size: 0.6rem; color: var(--text-faint); margin: 0.25rem 0 0; text-align: center; }

	/*
	 * Paso de dirección.
	 *
	 * Todo va por tokens, como el resto del fichero: un literal aquí solo funcionaría en
	 * un tema, y `npm run a11y:contrast` lo rechaza en la hoja y —desde el 16-ago— también
	 * en el `style=` del marcado.
	 */
	.dir-explica { background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.15); border-radius:12px; padding:.75rem .9rem; }
	.dir-titulo { margin:0 0 .35rem; font-size:.82rem; font-weight:700; color:var(--accent-orange-ink); }
	.dir-texto { margin:0; font-size:.72rem; line-height:1.5; color:var(--text-secondary); }
	.dir-doble { margin-top:.4rem; font-weight:600; color:var(--text-primary); }

	.dir-sugerencia { background:var(--bg-card-hover); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:.75rem .9rem; display:flex; flex-direction:column; gap:.4rem; }
	.dir-sugerencia.confirmada { border-color:rgba(16,185,129,.35); background:rgba(16,185,129,.06); }
	.dir-sug-titulo { margin:0; font-size:.78rem; font-weight:700; color:var(--text-primary); }
	.dir-sug-detalle { margin:0; font-size:.72rem; line-height:1.5; color:var(--text-secondary); }
	.dir-sug-coste { margin:0; font-size:.68rem; line-height:1.5; color:var(--accent-green-ink); }
	.dir-sug-sin-coste { color:var(--accent-orange-ink); }
	.dir-sug-btn { align-self:flex-start; background:var(--accent-blue); color:var(--text-on-accent); border:none; border-radius:8px; padding:.35rem .7rem; font-size:.7rem; font-weight:700; cursor:pointer; }
	.dir-sug-btn.deshacer { background:transparent; color:var(--accent-green-ink); border:1px solid rgba(16,185,129,.3); }

	.dir-lista { display:flex; flex-direction:column; gap:.15rem; max-height:220px; overflow-y:auto; }
	.dir-lista::-webkit-scrollbar { width:4px; }
	.dir-lista::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08); border-radius:2px; }
	.dir-fila { display:grid; grid-template-columns:5rem 1fr auto auto; gap:.5rem; align-items:center; padding:.3rem .4rem; border-radius:8px; }
	.dir-fila:hover { background:rgba(255,255,255,.03); }
	.dir-fila.es-salida { background:rgba(251,191,36,.06); }
	.dir-fecha { font-size:.62rem; color:var(--text-faint); font-family:'Monaco','Menlo',monospace; }
	.dir-nombre { font-size:.7rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
	.dir-importe { font-size:.7rem; font-weight:600; color:var(--text-primary); }
	.dir-badge { font-size:.58rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--accent-green-ink); border:1px solid rgba(16,185,129,.3); border-radius:6px; padding:.1rem .35rem; }
	/* 44 px de alto mínimo: es un objetivo táctil, y el barrido móvil mide por debajo de 40. */
	.dir-toggle { min-width:4.5rem; min-height:1.9rem; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); border-radius:8px; color:var(--text-secondary); font-size:.65rem; font-weight:700; cursor:pointer; padding:.25rem .45rem; }
	.dir-toggle.fuera { background:rgba(251,191,36,.12); border-color:rgba(251,191,36,.3); color:var(--accent-orange-ink); }

	.dir-resultado { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:.6rem .8rem; display:flex; flex-direction:column; gap:.25rem; }
	.dir-res-titulo { margin:0 0 .2rem; font-size:.7rem; font-weight:700; color:var(--text-primary); }
	.dir-res-fila { display:flex; justify-content:space-between; align-items:baseline; gap:.6rem; }
	.dir-res-nombre { font-size:.7rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
	.dir-res-cifras { font-size:.7rem; font-weight:600; color:var(--text-primary); white-space:nowrap; }
	.dir-res-aviso { margin:0 0 .3rem; font-size:.66rem; line-height:1.45; color:var(--accent-orange-ink); }
	.dir-res-pista { margin:.35rem 0 0; font-size:.65rem; line-height:1.45; color:var(--text-muted); }

	/* Resolving */
	.resolving-state { text-align:center; padding:3rem 1rem; }
	.resolving-spinner { width:40px; height:40px; border:3px solid rgba(59,130,246,.15); border-top-color:var(--accent-blue); border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 1rem; }
	@keyframes spin { to{transform:rotate(360deg)} }
	.resolving-state p { margin:0; color:var(--text-primary); font-weight:600; }
	.resolving-hint { font-size:.75rem; color:var(--text-muted) !important; font-weight:400 !important; margin-top:.35rem !important; }

	/* Preview */
	.preview-header-row { display:flex; justify-content:space-between; align-items:center; gap:.75rem; flex-wrap:wrap; }
	.broker-detected { display:flex; align-items:center; gap:.4rem; font-size:.8rem; font-weight:700; color:var(--text-primary); }
	.category-picker { display:flex; align-items:center; gap:.4rem; font-size:.7rem; color:var(--text-muted); }
	.category-picker select { background: var(--bg-card-hover); border:1px solid rgba(255,255,255,.1); border-radius:8px; color:var(--text-primary); padding:.3rem .5rem; font-size:.7rem; font-weight:600; outline:none; cursor:pointer; }
	.resolve-warning { font-size:.7rem; color:var(--accent-orange-ink); background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.15); border-radius:10px; padding:.5rem .75rem; }
	.import-summary-banner { font-size:.72rem; color:var(--text-secondary); background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:.5rem .75rem; line-height:1.4; }
	.select-all-row { display:flex; justify-content:space-between; align-items:center; }
	.select-all-btn { background:none; border:none; color:var(--text-secondary); font-size:.75rem; font-weight:600; cursor:pointer; padding:.25rem 0; }
	.selected-count { font-size:.65rem; color:var(--text-faint); }

	/* Position rows */
	.positions-list { display:flex; flex-direction:column; gap:.3rem; max-height:40vh; overflow-y:auto; }
	.positions-list::-webkit-scrollbar { width:5px; }
	.positions-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08); border-radius:3px; }
	.position-row { display:flex; align-items:center; gap:.6rem; width:100%; padding:.6rem .75rem; background: var(--bg-card-hover); border:1px solid rgba(255,255,255,.04); border-radius:12px; cursor:pointer; transition:all .15s; text-align:left; color:inherit; }
	.position-row:hover { background:rgba(59,130,246,.06); border-color:rgba(59,130,246,.12); }
	.position-row.selected { border-color:rgba(59,130,246,.25); background:rgba(59,130,246,.05); }
	.position-row.unresolved { opacity:.5; }
	.pos-check { font-size:1rem; flex-shrink:0; width:1.2rem; }
	.pos-info { flex:1; min-width:0; }
	.pos-name { display:block; font-size:.78rem; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
	.pos-meta { display:flex; align-items:center; gap:.35rem; font-size:.6rem; color:var(--text-faint); margin-top:.1rem; flex-wrap:wrap; }
	.pos-ticker { font-family:'Monaco','Menlo',monospace; font-weight:600; color:var(--text-muted); }
	.pos-isin { font-family:'Monaco','Menlo',monospace; }
	.pos-no-ticker { color:var(--state-negative); font-weight:600; }
	.pos-exists { color:var(--accent-blue-ink); font-weight:600; padding:.05rem .3rem; background:rgba(59,130,246,.1); border-radius:4px; }
	
	.manual-ticker-edit { padding: 0.5rem 0.75rem 0.75rem; background: var(--bg-card-hover); border-radius: 0 0 12px 12px; margin-top: -4px; border: 1px solid var(--border-subtle); border-top: none; }
	.manual-ticker-edit input { width: 100%; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-primary); padding: 0.4rem 0.6rem; font-size: 0.75rem; font-family: 'Monaco', monospace; outline: none; transition: all 0.2s; }
	.manual-ticker-edit input:focus { border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.05); }

	.pos-numbers { text-align:right; flex-shrink:0; }
	.pos-shares { display:block; font-size:.8rem; font-weight:700; color:var(--text-primary); }
	.pos-cost { display:block; font-size:.6rem; color:var(--text-faint); }

	/* Done */
	.done-state { text-align:center; padding:3rem 1rem; }
	.done-icon { font-size:3rem; margin-bottom:.75rem; }
	.done-title { font-size:1.2rem; font-weight:700; color:var(--text-primary); margin:0; }
	.done-hint { font-size:.8rem; color:var(--text-muted); margin:.5rem 0 0; }
	.done-ledger { font-size:.82rem; line-height:1.55; color:var(--text-primary); margin:.6rem auto 0; max-width:46ch; }

	/* Footer */
	.import-footer { padding:1rem 1.5rem; border-top:1px solid rgba(255,255,255,.06); background: var(--bg-overlay); display:flex; justify-content:center; }
	.btn-import { width:100%; display:flex; align-items:center; justify-content:center; gap:.5rem; padding:.85rem; background:linear-gradient(135deg,var(--surface-green),var(--surface-green)); border:none; border-radius:14px; color:var(--text-on-accent); font-size:.95rem; font-weight:700; cursor:pointer; transition:all .2s cubic-bezier(.4,0,.2,1); box-shadow:0 8px 20px rgba(16,185,129,.3),inset 0 1px 0 rgba(255,255,255,.2); }
	.btn-import:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 25px rgba(16,185,129,.4),inset 0 1px 0 rgba(255,255,255,.2); }
	.btn-import:disabled { opacity:.4; cursor:not-allowed; }
	.btn-cancel { width:100%; padding:.85rem; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:14px; color:var(--text-muted); font-size:.9rem; font-weight:600; cursor:pointer; transition:all .15s; }
	.btn-cancel:hover { background:rgba(255,255,255,.08); color:var(--text-primary); }
</style>
