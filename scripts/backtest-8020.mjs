/**
 * Backtest de una cartera 80/20 con y sin rebalanceo, con datos reales de mercado.
 *
 * Sirve para tener **datos citables propios**: los buscadores generativos citan
 * números con fuente, no explicaciones genéricas. Un artículo que explica qué es el
 * rebalanceo no genera citas; una cifra propia y reproducible, sí.
 *
 * Nada de esto está inventado: las series se descargan de Yahoo Finance y el
 * resultado se guarda con la fecha de descarga y los tickers usados, para que
 * cualquiera pueda repetirlo.
 *
 * Uso:
 *   node scripts/backtest-8020.mjs            # descarga, calcula y guarda el JSON
 *   node scripts/backtest-8020.mjs --print    # además imprime la tabla por consola
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YahooFinance from 'yahoo-finance2';

// Misma configuración que usa la app en src/lib/server/yahoo.ts.
const yahooFinance = new YahooFinance({
	suppressNotices: ['yahooSurvey', 'ripHistorical'],
	validation: { logErrors: false }
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(ROOT, 'src', 'lib', 'data', 'backtest-8020.json');

/**
 * Instrumentos proxy. Se eligen por tener serie continua desde 2010 y por ser
 * representativos de una cartera global sencilla; se documentan en el resultado
 * para que la cifra sea auditable.
 */
const EQUITY = { ticker: 'ACWI', name: 'iShares MSCI ACWI ETF (renta variable global)' };
const BONDS = { ticker: 'BND', name: 'Vanguard Total Bond Market ETF (renta fija)' };

const START = '2010-01-01';
const TARGET_EQUITY = 0.8;

/** Serie mensual de cierres ajustados (incluye dividendos reinvertidos). */
async function monthlySeries(ticker) {
	const result = await yahooFinance.chart(ticker, {
		period1: START,
		interval: '1mo',
		events: 'div|split'
	});

	const rows = (result.quotes ?? [])
		.filter((q) => q.adjclose != null || q.close != null)
		.map((q) => ({
			date: new Date(q.date).toISOString().slice(0, 10),
			price: q.adjclose ?? q.close
		}));

	if (rows.length === 0) throw new Error(`Sin datos para ${ticker}`);
	return rows;
}

/** Alinea las dos series por mes, quedándose sólo con los meses presentes en ambas. */
function align(equity, bonds) {
	const byMonth = (rows) => {
		const map = new Map();
		for (const r of rows) map.set(r.date.slice(0, 7), r);
		return map;
	};

	const e = byMonth(equity);
	const b = byMonth(bonds);
	const months = [...e.keys()].filter((m) => b.has(m)).sort();

	return months.map((m) => ({
		month: m,
		date: e.get(m).date,
		equity: e.get(m).price,
		bonds: b.get(m).price
	}));
}

/**
 * Simula la cartera.
 * @param {{month:string, equity:number, bonds:number}[]} series
 * @param {'never'|'annual'} mode
 */
function simulate(series, mode) {
	const initial = 10000;
	let unitsEquity = (initial * TARGET_EQUITY) / series[0].equity;
	let unitsBonds = (initial * (1 - TARGET_EQUITY)) / series[0].bonds;

	let rebalances = 0;
	let maxEquityWeight = TARGET_EQUITY;
	let minEquityWeight = TARGET_EQUITY;
	let peak = initial;
	let maxDrawdown = 0;
	const history = [];

	for (let i = 0; i < series.length; i++) {
		const row = series[i];
		const valueEquity = unitsEquity * row.equity;
		const valueBonds = unitsBonds * row.bonds;
		const total = valueEquity + valueBonds;
		const weight = valueEquity / total;

		maxEquityWeight = Math.max(maxEquityWeight, weight);
		minEquityWeight = Math.min(minEquityWeight, weight);

		peak = Math.max(peak, total);
		maxDrawdown = Math.max(maxDrawdown, (peak - total) / peak);

		history.push({ month: row.month, total: Math.round(total), equityWeight: Number(weight.toFixed(4)) });

		// Rebalanceo anual: en el último mes del año, y nunca en el último punto.
		const isYearEnd = row.month.endsWith('-12');
		if (mode === 'annual' && isYearEnd && i < series.length - 1) {
			unitsEquity = (total * TARGET_EQUITY) / row.equity;
			unitsBonds = (total * (1 - TARGET_EQUITY)) / row.bonds;
			rebalances++;
		}
	}

	const last = history.at(-1);
	const years = series.length / 12;
	const cagr = Math.pow(last.total / initial, 1 / years) - 1;

	return {
		initial,
		finalValue: last.total,
		cagr: Number((cagr * 100).toFixed(2)),
		maxDrawdown: Number((maxDrawdown * 100).toFixed(2)),
		finalEquityWeight: Number((last.equityWeight * 100).toFixed(1)),
		maxEquityWeight: Number((maxEquityWeight * 100).toFixed(1)),
		minEquityWeight: Number((minEquityWeight * 100).toFixed(1)),
		rebalances,
		history
	};
}

async function main() {
	console.log(`[backtest] Descargando series mensuales desde ${START}…`);
	const [equity, bonds] = await Promise.all([
		monthlySeries(EQUITY.ticker),
		monthlySeries(BONDS.ticker)
	]);

	const series = align(equity, bonds);
	console.log(`[backtest] ${series.length} meses alineados: ${series[0].month} → ${series.at(-1).month}`);

	const never = simulate(series, 'never');
	const annual = simulate(series, 'annual');

	const result = {
		// Metadatos para que la cifra sea auditable y citable.
		generatedAt: new Date().toISOString().slice(0, 10),
		source: 'Yahoo Finance (cierres mensuales ajustados, dividendos reinvertidos)',
		instruments: { equity: EQUITY, bonds: BONDS },
		period: { from: series[0].month, to: series.at(-1).month, months: series.length },
		targetAllocation: {
			equity: Math.round(TARGET_EQUITY * 100),
			bonds: Math.round((1 - TARGET_EQUITY) * 100)
		},
		initialCapital: never.initial,
		assumptions: [
			'Aportación única inicial, sin aportaciones periódicas posteriores.',
			'Rebalanceo anual al cierre de diciembre en el escenario rebalanceado.',
			'Sin comisiones de compraventa, custodia ni impacto fiscal.',
			'Cierres mensuales ajustados: los dividendos se consideran reinvertidos.'
		],
		// Sin el histórico mensual a propósito: el componente que pinta la tabla
		// importa este JSON, y 199 puntos × 2 escenarios engordarían el bundle del
		// cliente sin que nada los use. Quien quiera la serie, reejecuta el script.
		scenarios: {
			never: { ...never, history: undefined },
			annual: { ...annual, history: undefined }
		},
		difference: {
			finalValue: annual.finalValue - never.finalValue,
			equityWeightDrift: Number((never.finalEquityWeight - annual.finalEquityWeight).toFixed(1))
		}
	};

	await mkdir(dirname(OUT_PATH), { recursive: true });
	await writeFile(OUT_PATH, JSON.stringify(result, null, 2) + '\n', 'utf8');
	console.log(`[backtest] Guardado en ${OUT_PATH.replace(ROOT, '.')}`);

	const t = (label, s) =>
		`${label.padEnd(22)} ${String(s.finalValue).padStart(9)} €  ${String(s.cagr).padStart(6)} %  ${String(s.maxDrawdown).padStart(6)} %  ${String(s.finalEquityWeight).padStart(6)} %  ${String(s.maxEquityWeight).padStart(6)} %`;

	console.log('');
	console.log('escenario                 final      CAGR    caída máx.  RV final  RV máx.');
	console.log(t('Sin rebalancear', never));
	console.log(t('Rebalanceo anual', annual));

	if (process.argv.includes('--print')) {
		console.log('\nJSON:\n' + JSON.stringify(result.scenarios, null, 2));
	}
}

main().catch((error) => {
	console.error('[backtest] Falló:', error.message);
	process.exit(1);
});
