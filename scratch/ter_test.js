import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ 
	suppressNotices: ['yahooSurvey', 'ripHistorical'],
	validation: { logErrors: false }
});

async function test() {
	const ticker1 = 'VOO';
	const ticker2 = '0P0001XF3Z.F';

	console.log('Fetching quote for ticker1:', ticker1);
	try {
		const res1 = await yahooFinance.quote(ticker1);
		console.log('ticker1 quote keys:', Object.keys(res1));
		console.log('ticker1 netExpenseRatio:', res1.netExpenseRatio);
	} catch (e) {
		console.error('Error fetching ticker1:', e);
	}

	console.log('\nFetching quoteSummary for ticker1 (VOO):');
	try {
		const summary1 = await yahooFinance.quoteSummary(ticker1, {
			modules: ['defaultKeyStatistics', 'fundProfile', 'summaryDetail']
		}, { validateResult: false });
		/** @type {any} */
		const s1 = summary1;
		console.log('ticker1 summaryDetail.expenseRatio:', s1.summaryDetail?.expenseRatio);
		console.log('ticker1 defaultKeyStatistics.annualReportExpenseRatio:', s1.defaultKeyStatistics?.annualReportExpenseRatio);
	} catch (e) {
		console.error('Error summary detail:', e);
	}

	console.log('\nFetching quoteSummary for ticker2 (0P0001XF3Z.F):');
	try {
		const summary2 = await yahooFinance.quoteSummary(ticker2, {
			modules: ['defaultKeyStatistics', 'fundProfile', 'summaryDetail']
		}, { validateResult: false });
		/** @type {any} */
		const s2 = summary2;
		console.log('ticker2 summaryDetail.expenseRatio:', s2.summaryDetail?.expenseRatio);
		console.log('ticker2 defaultKeyStatistics.annualReportExpenseRatio:', s2.defaultKeyStatistics?.annualReportExpenseRatio);
	} catch (e) {
		console.error('Error summary2:', e);
	}
}

test();
