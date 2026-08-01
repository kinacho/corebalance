import type { Locales } from '$lib/i18n/i18n-types';

/**
 * Lista completa de funcionalidades para el `featureList` del schema
 * `SoftwareApplication` de la landing. Los buscadores generativos responden a
 * preguntas concretas ("¿app que importe el CSV de DEGIRO?", "¿tracker con
 * cuentas remuneradas?"), y este campo es el sitio canónico donde declararlas.
 *
 * ⚠️ Cada entrada afirma algo verificable en el código. Al añadir una feature
 * nueva a la app, añadirla aquí y en las plantillas de `src/content/llms/`.
 */
export const FEATURE_LIST: Record<Locales, string[]> = {
	es: [
		'Cálculo de rebalanceo por aportación (cash-flow rebalancing): distribuye cada aportación entre los activos infraponderados sin necesidad de vender',
		'Asignación de activos con pesos objetivo y desviación en tiempo real, en tres bloques: cartera principal, satélite y acciones',
		'Precios en tiempo real de fondos indexados, ETFs y acciones (Yahoo Finance y Financial Times)',
		'Importación CSV de MyInvestor, DEGIRO, Trading 212, Interactive Brokers y formato genérico, con mapeo manual de columnas si la detección automática falla',
		'Libro de transacciones (compras, ventas, dividendos, traspasos) con cálculo automático del coste medio ponderado',
		'Registro de dividendos que reducen el coste base de la posición',
		'Cuentas remuneradas y depósitos con devengo diario de intereses',
		'Multi-divisa: cartera en EUR, USD o GBP con conversión automática de tipos de cambio',
		'Seguimiento del TER: coste medio ponderado de la cartera y coste anual en euros',
		'Simulador de crisis con escenarios históricos (puntocom 2000, Lehman 2008, COVID 2020)',
		'Proyecciones de patrimonio a futuro con interés compuesto y aportaciones mensuales',
		'Gráficos de distribución y evolución histórica de la cartera',
		'Modo privacidad que oculta los importes para consultar la cartera en público',
		'Local-first: los datos viven en el navegador (IndexedDB), sin registro; sincronización en la nube opcional',
		'PWA instalable con soporte offline',
		'Gratis y de código abierto'
	],
	en: [
		'Cash-flow rebalancing calculation: distributes each contribution across underweighted assets with no need to sell',
		'Asset allocation with target weights and real-time deviation, in three buckets: core portfolio, satellite and stocks',
		'Real-time prices for index funds, ETFs and stocks (Yahoo Finance and Financial Times)',
		'CSV import from MyInvestor, DEGIRO, Trading 212, Interactive Brokers and a generic format, with manual column mapping when auto-detection fails',
		'Transaction ledger (buys, sells, dividends, transfers) with automatic weighted-average cost calculation',
		'Dividend tracking that reduces the position cost basis',
		'Savings accounts and deposits with daily interest accrual',
		'Multi-currency: portfolio in EUR, USD or GBP with automatic exchange-rate conversion',
		'TER tracking: weighted-average portfolio cost and annual cost in euros',
		'Crisis simulator with historical scenarios (dot-com 2000, Lehman 2008, COVID 2020)',
		'Future wealth projections with compound interest and monthly contributions',
		'Allocation and historical evolution charts',
		'Privacy mode that hides amounts so you can check your portfolio in public',
		'Local-first: data lives in the browser (IndexedDB), no sign-up required; optional cloud sync',
		'Installable PWA with offline support',
		'Free and open source'
	]
};
