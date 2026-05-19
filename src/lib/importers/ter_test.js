import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function test() {
	const ticker1 = 'VOO';
	const ticker2 = '0P0001XF3Z.F';

	console.log('Fetching quote for ticker1:', ticker1);
	try {
		const res1 = await yahooFinance.quote(ticker1);
		console.log('ticker1 quote keys:', Object.keys(res1));
		console.log('ticker1 quote details:', JSON.stringify(res1, null, 2));
	} catch (e) {
		console.error('Error fetching ticker1:', e);
	}

	console.log('\nFetching quoteSummary for ticker1 (VOO):');
	try {
		const summary1 = await yahooFinance.quoteSummary(ticker1, {
			modules: ['defaultKeyStatistics', 'fundProfile', 'summaryDetail']
		});
		console.log('ticker1 summaryDetail keys:', Object.keys(summary1.summaryDetail || {}));
		console.log('ticker1 defaultKeyStatistics keys:', Object.keys(summary1.defaultKeyStatistics || {}));
		console.log('ticker1 fundProfile keys:', Object.keys(summary1.fundProfile || {}));
		console.log('summaryDetail.expenseRatio:', summary1.summaryDetail?.expenseRatio);
		console.log('defaultKeyStatistics.annualReportExpenseRatio:', summary1.defaultKeyStatistics?.annualReportExpenseRatio);
		console.log('fundProfile.feesExpensesDecs:', summary1.fundProfile?.feesExpensesDecs);
	} catch (e) {
		console.error('Error summary detail:', e);
	}

	console.log('\nFetching quoteSummary for ticker2 (0P0001XF3Z.F):');
	try {
		const summary2 = await yahooFinance.quoteSummary(ticker2, {
			modules: ['defaultKeyStatistics', 'fundProfile', 'summaryDetail']
		});
		console.log('ticker2 summaryDetail.expenseRatio:', summary2.summaryDetail?.expenseRatio);
		console.log('ticker2 defaultKeyStatistics.annualReportExpenseRatio:', summary2.defaultKeyStatistics?.annualReportExpenseRatio);
	} catch (e) {
		console.error('Error summary2:', e);
	}
}

test();
