import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ 
	suppressNotices: ['yahooSurvey', 'ripHistorical'],
	validation: { logErrors: false }
});

async function test() {
	const isin1 = 'IE000QAZP7L2';
	const isin2 = 'IE000ZYRH0Q7';

	console.log('Searching isin1:', isin1);
	const res1 = await yahooFinance.search(isin1);
	console.log('isin1 results:', JSON.stringify(res1.quotes, null, 2));

	console.log('Searching isin2:', isin2);
	const res2 = await yahooFinance.search(isin2);
	console.log('isin2 results:', JSON.stringify(res2.quotes, null, 2));
}

test();
