import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function test() {
    const tickers = ['AAPL', 'MSFT', 'IWDA.AS', 'VWRD.L', 'BTC-EUR'];
    const quotes = await yahooFinance.quote(tickers);
    for (const q of quotes) {
        console.log(`Ticker: ${q.symbol}`);
        console.log(`  ytdReturn: ${q.ytdReturn}`);
        console.log(`  ytdChangePercent: ${q.ytdChangePercent}`);
        console.log(`  fiftyTwoWeekHighChangePercent: ${q.fiftyTwoWeekHighChangePercent}`);
    }
}

test();
