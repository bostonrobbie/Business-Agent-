import * as fs from 'fs';
import * as path from 'path';
import { Candle, Strategy, StrategyResult, Trade, TradeAction } from '../strategies/types';

export class Backtester {
    private strategy: Strategy;
    private initialCapital: number;
    private equity: number;
    private trades: Trade[] = [];
    private currentTrade: Trade | null = null;
    private equityCurve: { time: Date; equity: number }[] = [];

    constructor(strategy: Strategy, initialCapital: number = 100000) {
        this.strategy = strategy;
        this.initialCapital = initialCapital;
        this.equity = initialCapital;
    }

    public async run(data: string | Candle[]): Promise<StrategyResult> {
        console.log(`Starting backtest for ${this.strategy.name}`);

        let candles: Candle[];
        if (typeof data === 'string') {
            candles = await this.loadCsv(data);
        } else {
            candles = data;
        }

        // console.log(`Processing ${candles.length} candles...`);

        if (candles.length === 0) {
            throw new Error('No data loaded');
        }

        // Group by day to handle "Session Start" logic if needed, 
        // but for now we iterate sequentially and let the strategy handle time checks.
        // Assuming data is sorted.

        let lastDateString = '';

        for (const candle of candles) {
            const dateString = candle.time.toISOString().split('T')[0];
            if (dateString !== lastDateString) {
                if (this.strategy.onSessionStart) {
                    this.strategy.onSessionStart(candle.time);
                }
                lastDateString = dateString;
            }

            // Check for exits on existing trade
            if (this.currentTrade) {
                this.checkExit(this.currentTrade, candle);
            }

            // If still in trade, skip entry logic (assuming 1 trade at a time)
            if (this.currentTrade) continue;

            const action = this.strategy.onCandle(candle);
            if (action && action.type === 'ENTRY') {
                this.executeEntry(action, candle);
            }
        }

        // Close any open trade at end
        if (this.currentTrade) {
            this.closeTrade(this.currentTrade, candles[candles.length - 1].close, candles[candles.length - 1].time, 'End of Data');
        }

        return this.calculateMetrics();
    }

    private executeEntry(action: TradeAction, candle: Candle) {
        // Simplified Execution Model: Market Orders fill at Close (or Open of next? using Start for now implies Close of current)
        // For ORB, usually we enter on a Stop Limit.
        // If the strategy says ENTRY, we assume condition met.

        const price = action.price || candle.close;
        const quantity = action.quantity || 1; // Default 1 contract

        this.currentTrade = {
            id: Math.random().toString(36).substring(7),
            entryTime: candle.time,
            direction: action.direction || 'LONG',
            entryPrice: price,
            quantity: quantity,
            status: 'OPEN'
        };

        // attach SL/TP metadata if needed? simplified for now.
        (this.currentTrade as any).stopLoss = action.stopLoss;
        (this.currentTrade as any).takeProfit = action.takeProfit;
    }

    private checkExit(trade: Trade, candle: Candle) {
        // Check SL/TP
        if ((trade as any).stopLoss) {
            if (trade.direction === 'SHORT' && candle.high >= (trade as any).stopLoss) {
                this.closeTrade(trade, (trade as any).stopLoss, candle.time, 'Stop Loss');
                return;
            }
            if (trade.direction === 'LONG' && candle.low <= (trade as any).stopLoss) {
                this.closeTrade(trade, (trade as any).stopLoss, candle.time, 'Stop Loss');
                return;
            }
        }

        // Check TP
        if ((trade as any).takeProfit) {
            if (trade.direction === 'SHORT' && candle.low <= (trade as any).takeProfit) {
                this.closeTrade(trade, (trade as any).takeProfit, candle.time, 'Take Profit');
                return;
            }
            if (trade.direction === 'LONG' && candle.high >= (trade as any).takeProfit) {
                this.closeTrade(trade, (trade as any).takeProfit, candle.time, 'Take Profit');
                return;
            }
        }

        // Time Limit Exit (9:45 AM)
        // Candle time is the OPEN time.
        // We want to be OUT by 9:45.
        // If current candle is 9:40->9:45, we exit at Close (9:45).
        // If current candle is 9:45->9:50, it's too late (but we catch it if loop hits 9:45)

        const h = candle.time.getHours();
        const m = candle.time.getMinutes();

        if (h === 9 && m === 40) {
            // This candle ends at 9:45. We Must Exit.
            this.closeTrade(trade, candle.close, candle.time, 'Time Exit (9:45)');
        }
    }

    private closeTrade(trade: Trade, price: number, time: Date, reason: string) {
        // Apply Slippage (simulating worse fill)
        // If Long: Entry increased, Exit decreased
        // If Short: Entry decreased (worse sell), Exit increased (worse buy)
        const slippagePoints = 1.0; // 1 point per side (aggressive stress test)
        const commissionPerSide = 2.50; // $2.50 IBKR/Topstep typical

        let adjustedEntry = trade.entryPrice;
        let adjustedExit = price;

        if (trade.direction === 'LONG') {
            adjustedEntry += slippagePoints;
            adjustedExit -= slippagePoints;
        } else {
            adjustedEntry -= slippagePoints;
            adjustedExit += slippagePoints;
        }

        trade.exitPrice = adjustedExit; // Log average fill

        // PnL calc
        let grossPnl = 0;
        if (trade.direction === 'LONG') {
            grossPnl = (adjustedExit - adjustedEntry) * trade.quantity * 20;
        } else {
            grossPnl = (adjustedEntry - adjustedExit) * trade.quantity * 20;
        }

        // Deduct Commission (Round Trip)
        const totalCommission = commissionPerSide * 2 * trade.quantity;
        trade.pnl = grossPnl - totalCommission;

        trade.exitTime = time;
        trade.status = 'CLOSED';
        trade.reason = reason + ` (Slippage: ${slippagePoints}pt)`;

        this.equity += trade.pnl;
        this.trades.push(trade);
        this.equityCurve.push({ time, equity: this.equity });
        this.currentTrade = null;
    }

    private calculateMetrics(): StrategyResult {
        const winningTrades = this.trades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = this.trades.filter(t => (t.pnl || 0) <= 0);

        const totalWin = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

        let maxEquity = this.initialCapital;
        let maxDrawdown = 0;

        // Recalculate equity curve accurately
        let currentEquity = this.initialCapital;
        for (const t of this.trades) {
            currentEquity += (t.pnl || 0);
            if (currentEquity > maxEquity) maxEquity = currentEquity;
            const dd = (maxEquity - currentEquity) / maxEquity;
            if (dd > maxDrawdown) maxDrawdown = dd;
        }

        return {
            trades: this.trades,
            metrics: {
                totalTrades: this.trades.length,
                totalPnL: this.equity - this.initialCapital,
                winRate: this.trades.length > 0 ? winningTrades.length / this.trades.length : 0,
                profitFactor: totalLoss > 0 ? totalWin / totalLoss : totalWin,
                maxDrawdown: maxDrawdown
            },
            equityCurve: this.equityCurve
        };
    }

    public async loadCsv(filePath: string): Promise<Candle[]> {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const candles: Candle[] = [];

        // Header: time,symbol,tf,open,high,low,close,volume,...
        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(',');
            if (parts.length < 8) continue;

            const timeStr = parts[0]; // "2010-06-02 18:05:00 -04:00"
            // Parse Date
            const time = new Date(timeStr);
            if (isNaN(time.getTime())) continue;

            candles.push({
                time: time,
                open: parseFloat(parts[3]),
                high: parseFloat(parts[4]),
                low: parseFloat(parts[5]),
                close: parseFloat(parts[6]),
                volume: parseFloat(parts[7]),
                symbol: parts[1],
                vwapW: parts.length > 11 ? parseFloat(parts[11]) : undefined
            } as any); // Cast to any to store extra fields
        }
        return candles;
    }
}
