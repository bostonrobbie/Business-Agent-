import { Candle, Strategy, TradeAction } from './types';

export interface OrbConfig {
    profitRatio: number;
    useVwapFilter: boolean;
    minRangePoints: number;
    direction: 'SHORT' | 'LONG' | 'BOTH';
}

export class OrbStrategy implements Strategy {
    name: string;
    description: string;

    private dailyTradeTaken = false;
    private openingRangeHigh: number | null = null;
    private openingRangeLow: number | null = null;
    private openingRangeValid = false;

    // Default Config (Optimized: PF 1.75)
    private config: OrbConfig = {
        profitRatio: 4.5,
        useVwapFilter: false,
        minRangePoints: 12,
        direction: 'BOTH'
    };

    constructor(config?: Partial<OrbConfig>) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.name = `NQ_ORB_Opt_${this.config.direction}_${this.config.profitRatio}R`;
        this.description = `ORB Strategy [${this.config.direction}] R:R ${this.config.profitRatio} MinRange: ${this.config.minRangePoints}`;
    }

    onCandle(candle: Candle): TradeAction | null {
        const hour = candle.time.getHours();
        const minute = candle.time.getMinutes();

        // 1. Reset Daily (9:30 or earlier)
        if (hour === 9 && minute === 30) {
            this.dailyTradeTaken = false;
            this.openingRangeHigh = candle.high;
            this.openingRangeLow = candle.low;
            this.openingRangeValid = true;
            return null;
        }

        // 2. Trade Window (9:35 Candle)
        if (hour === 9 && minute === 35) {
            if (!this.openingRangeValid || this.dailyTradeTaken) return null;

            // Min Range Filter
            const rangeSize = (this.openingRangeHigh! - this.openingRangeLow!);
            if (rangeSize < this.config.minRangePoints) return null;

            // Trend Filters
            const close = candle.close;
            const vwap = candle.vwapW; // Using Weekly VWAP if available in CSV

            // --- SHORT LOGIC ---
            const wantShort = (this.config.direction === 'SHORT' || this.config.direction === 'BOTH');
            const shortTrendOk = !this.config.useVwapFilter || (vwap && close < vwap);

            if (wantShort && shortTrendOk && this.openingRangeLow && candle.low < this.openingRangeLow) {
                // Determine Entry & Targets
                const entryPrice = this.openingRangeLow;
                const stopLoss = this.openingRangeHigh!;
                const risk = stopLoss - entryPrice;
                // Min risk check to avoid micro trades
                if (risk < 1) return null;

                const target = entryPrice - (risk * this.config.profitRatio);

                this.dailyTradeTaken = true;
                return {
                    type: 'ENTRY',
                    direction: 'SHORT',
                    orderType: 'STOP',
                    price: entryPrice,
                    stopLoss: stopLoss,
                    takeProfit: target,
                    comment: 'Short ORB'
                };
            }

            // --- LONG LOGIC ---
            const wantLong = (this.config.direction === 'LONG' || this.config.direction === 'BOTH');
            const longTrendOk = !this.config.useVwapFilter || (vwap && close > vwap);

            if (wantLong && longTrendOk && this.openingRangeHigh && candle.high > this.openingRangeHigh) {
                const entryPrice = this.openingRangeHigh;
                const stopLoss = this.openingRangeLow!;
                const risk = entryPrice - stopLoss;
                if (risk < 1) return null;

                const target = entryPrice + (risk * this.config.profitRatio);

                this.dailyTradeTaken = true;
                return {
                    type: 'ENTRY',
                    direction: 'LONG',
                    orderType: 'STOP',
                    price: entryPrice,
                    stopLoss: stopLoss,
                    takeProfit: target,
                    comment: 'Long ORB'
                };
            }
        }

        // 3. Hard Exit at 9:40 Close (9:45 Open)
        if (hour === 9 && minute === 40) {
            return {
                type: 'EXIT',
                orderType: 'MARKET',
                comment: 'Time Exit 9:45'
            };
        }

        return null;
    }
}
