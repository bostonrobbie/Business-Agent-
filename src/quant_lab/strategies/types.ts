
export interface Candle {
    time: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    symbol?: string;
    vwapW?: number;
}

export interface Trade {
    id: string;
    entryTime: Date;
    exitTime?: Date;
    direction: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    pnl?: number;
    status: 'OPEN' | 'CLOSED';
    reason?: string;
}

export interface StrategyResult {
    trades: Trade[];
    metrics: {
        totalTrades: number;
        winRate: number;
        profitFactor: number;
        totalPnL: number;
        maxDrawdown: number;
        sharpeRatio?: number;
    };
    equityCurve: { time: Date; equity: number }[];
}

export interface Strategy {
    name: string;
    description: string;

    /**
     * Called before processing a new day or session
     */
    onSessionStart?(date: Date): void;

    /**
     * Process a new candle
     * @param candle The current candle
     * @returns A TradeAction if the strategy wants to trade
     */
    onCandle(candle: Candle): TradeAction | null;

    /**
     * Called at the end of the session
     */
    onSessionEnd?(): void;
}

export interface TradeAction {
    type: 'ENTRY' | 'EXIT';
    direction?: 'LONG' | 'SHORT';
    price?: number; // Limit price if applicable
    orderType: 'MARKET' | 'LIMIT' | 'STOP';
    quantity?: number;
    stopLoss?: number;
    takeProfit?: number;
    comment?: string;
}
