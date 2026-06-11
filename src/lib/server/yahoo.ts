import YahooFinance from 'yahoo-finance2';

export const yahooFinance = new YahooFinance({ 
	suppressNotices: ['yahooSurvey', 'ripHistorical'],
	validation: { logErrors: false }
});
