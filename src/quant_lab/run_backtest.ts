
import { Backtester } from './backtesting/backtester';
import { OrbStrategy } from './strategies/OrbStrategy';

async function main() {
    const csvPath = 'c:\\Users\\User\\Documents\\AI\\Trading_System\\StrategyPipeline\\src\\backtesting\\data\\NQ_Extended.csv';

    console.log('Running Final Verification on Optimized Strategy...');
    const strategy = new OrbStrategy(); // Uses defaults: Breakout, Short, RR=3, VWAP=True

    const backtester = new Backtester(strategy);

    try {
        const result = await backtester.run(csvPath);

        console.log('\n--- Final Strategy Results ---');
        console.log(`Total Trades: ${result.metrics.totalTrades}`);
        console.log(`Win Rate: ${(result.metrics.winRate * 100).toFixed(2)}%`);
        console.log(`Profit Factor: ${result.metrics.profitFactor.toFixed(2)}`);
        console.log(`Net PnL: $${result.metrics.totalPnL.toFixed(2)}`);
        console.log(`Max Drawdown: ${(result.metrics.maxDrawdown * 100).toFixed(2)}%`);

        console.log('\n--- Recent 10 Trades ---');
        result.trades.slice(-10).forEach(t => {
            console.log(`${t.entryTime.toISOString()} ${t.direction} @ ${t.entryPrice.toFixed(2)} -> ${t.exitPrice?.toFixed(2)} ($${t.pnl?.toFixed(2)}) [${t.reason}]`);
        });

    } catch (error) {
        console.error('Backtest failed:', error);
    }
}

main();
