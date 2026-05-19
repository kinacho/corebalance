import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function test() {
	const ticker = '0P0001XF3Z.F';
	try {
		const res = await yahooFinance.quote(ticker);
		console.log('Quote for 0P0001XF3Z.F keys:', Object.keys(res));
		console.log('netExpenseRatio:', res.netExpenseRatio);
		console.log('expenseRatio:', res.expenseRatio);
	} catch (e) {
		console.error('Error:', e);
	}
}

test();
