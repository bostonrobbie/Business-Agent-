import * as path from 'path';
import * as fs from 'fs';
import { Backtester } from './backtesting/backtester';
import { OrbStrategy, OrbConfig } from './strategies/OrbStrategy';

// --- Configuration Grid ---
const DIRECTIONS = ['SHORT', 'LONG', 'BOTH'] as const;
const PROFIT_RATIOS = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
const MIN_RANGES = [5, 12, 20]; // 5 (low noise), 12 (medium), 20 (high volatility only)
const VWAP_FILTERS = [true, false];

interface Result {
    config: OrbConfig;
    metrics: {
        totalTrades: number;
        netPnL: number;
        profitFactor: number;
        winRate: number;
        drawdown: number;
    };
    score: number; // Custom robustness metric
}

async function runHelper() {
    // Exact path verified by user
    const dataPath = path.join('C:', 'Users', 'User', 'Desktop', 'AI-Workspace', 'Quant_Lab', 'data', 'Intra OHLC', 'A2API-NQ-m5.csv');

    if (!fs.existsSync(dataPath)) {
        console.error(`Data file not found: ${dataPath}`);
        return;
    }

    console.log(`Starting Optimization on ${dataPath}...`);

    // --- Pre-load Data ---
    console.log('Loading data into memory...');
    const dummyStrategy = new OrbStrategy();
    const loader = new Backtester(dummyStrategy);
    const candles = await loader.loadCsv(dataPath);
    console.log(`Data loaded: ${candles.length} candles.`);

    const totalRuns = DIRECTIONS.length * PROFIT_RATIOS.length * MIN_RANGES.length * VWAP_FILTERS.length;
    console.log(`Testing ${totalRuns} variants...`);

    const results: Result[] = [];
    let count = 0;

    // --- Optimization Loop ---
    for (const direction of DIRECTIONS) {
        for (const ratio of PROFIT_RATIOS) {
            for (const range of MIN_RANGES) {
                for (const vwap of VWAP_FILTERS) {
                    count++;

                    const config: OrbConfig = {
                        direction: direction,
                        profitRatio: ratio,
                        minRangePoints: range,
                        useVwapFilter: vwap
                    };

                    const strategy = new OrbStrategy(config);
                    // Initial Capital $100k
                    const backtester = new Backtester(strategy, 100000);

                    try {
                        // Pass in-memory candles for speed
                        const result = await backtester.run(candles);
                        const stats = result.metrics; // Correct API property

                        let score = 0;
                        if (stats.totalTrades > 50) {
                            // Robustness Score Calculation
                            // 1. Profit Factor is King (Weight 2.0)
                            // 2. Log(Trades) rewards sample size
                            // 3. PnL acts as a tie-breaker bonus

                            if (stats.profitFactor < 1.0) {
                                score = -100;
                            } else {
                                score = (stats.profitFactor * 2) + Math.log10(stats.totalTrades) + (stats.totalPnL / 50000);
                            }
                        }

                        results.push({
                            config,
                            metrics: {
                                totalTrades: stats.totalTrades,
                                netPnL: stats.totalPnL,
                                profitFactor: stats.profitFactor,
                                winRate: stats.winRate,
                                drawdown: stats.maxDrawdown
                            },
                            score
                        });

                        if (count % 10 === 0) process.stdout.write(`\rProgress: ${count}/${totalRuns}`);

                    } catch (e) {
                        console.error(`\nError with config ${JSON.stringify(config)}:`, e);
                    }
                }
            }
        }
    }

    console.log('\nOptimization Complete.');
    console.log('------------------------------------------------');

    // --- Sort & Display ---
    results.sort((a, b) => b.score - a.score);

    const top10 = results.slice(0, 10);

    console.log('Top 10 Robust Strategies:');
    top10.forEach((res, index) => {
        console.log(`#${index + 1}: $${res.metrics.netPnL.toFixed(2)} PnL | PF: ${res.metrics.profitFactor.toFixed(2)} | Trades: ${res.metrics.totalTrades}`);
        console.log(`   Config: Dir=${res.config.direction}, R:R=${res.config.profitRatio}, MinRange=${res.config.minRangePoints}, VWAP=${res.config.useVwapFilter}`);
        console.log('------------------------------------------------');
    });

    console.log('\n"Simple & Robust" Candidate (Max PF with >100 trades):');
    const robustCandidates = results.filter(r => r.metrics.totalTrades > 100).sort((a, b) => b.metrics.profitFactor - a.metrics.profitFactor);
    if (robustCandidates.length > 0) {
        const best = robustCandidates[0];
        console.log(`PnL: $${best.metrics.netPnL.toFixed(2)}, PF: ${best.metrics.profitFactor.toFixed(2)}, Trades: ${best.metrics.totalTrades}`);
        console.log(`Config: ${JSON.stringify(best.config)}`);
    } else {
        console.log('No candidate found with > 100 trades and positive PF.');
    }
}

runHelper().catch(console.error);
