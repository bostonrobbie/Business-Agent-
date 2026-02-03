
import { Backtester } from './backtesting/backtester';
import { OrbStrategy } from './strategies/OrbStrategy';

async function main() {
    console.log('Running PRECISE Verification (Entry 9:35 Open, Exit 9:45 Open)');
    // Absolute path to the existing datafile
    const csvPath = 'c:\\Users\\User\\Documents\\AI\\Trading_System\\StrategyPipeline\\src\\backtesting\\data\\NQ_Extended.csv';

    // Simulate Strict Costs: 0.5 pts slippage (2 ticks) per side, $2.50 commission
    // Backtester constructor(strategy, capital, commission, slippage) ?? 
    // Wait, checked backtester.ts line 13: constructor(strategy: Strategy, initialCapital: number = 100000)
    // It DOES NOT accept commission/slippage in constructor yet!
    // It has hardcoded costs in closeTrade (Line 132 in Backtester.ts logic).
    // I need to Trust the Hardcoded logic or update it.
    // The hardcoded logic in backtester.ts lines 132-133:
    // const slippagePoints = 1.0; 
    // const commissionPerSide = 2.50; 

    // The user wants validation. 1.0 point slippage is stricter than user's 2 ticks (0.5).
    // So if it passes with 1.0, it passes with 0.5.

    const strategy = new OrbStrategy();
    const backtester = new Backtester(strategy, 25000);
    const result = await backtester.run(csvPath);

    console.log('--- PRECISE TIMING RESULTS ---');
    console.log(`Total Trades: ${result.metrics.totalTrades}`);
    console.log(`Win Rate: ${(result.metrics.winRate * 100).toFixed(2)}%`);
    console.log(`Profit Factor: ${result.metrics.profitFactor.toFixed(2)}`);
    console.log(`Net PnL: $${result.metrics.totalPnL.toFixed(2)}`);
    console.log(`Max Drawdown: ${(result.metrics.maxDrawdown * 100).toFixed(2)}%`);
}

main().catch(console.error);
