import * as fs from 'fs';
import * as path from 'path';

interface TradeRow {
    tradeNum: number;
    type: string;
    signal: string;
    time: Date;
    price: number;
    contracts: number;
    profit: number;
}

async function verifyCsv() {
    // Literal path to handle special chars
    const csvPath = "C:\\Users\\User\\Downloads\\NQ_9_30_ORB_[Clean_Slate_V2]_CME_MINI_NQ1!_2026-01-30.csv";

    if (!fs.existsSync(csvPath)) {
        console.error("File not found:", csvPath);
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');

    // Header verification
    // Trade #,Type,Date and time,Signal,Price USD,Position size (qty),Position size (value),Net P&L USD,...

    const validTrades: TradeRow[] = [];
    const errors: string[] = [];

    let totalPnL = 0;
    let winCount = 0;
    let longCount = 0;
    let shortCount = 0;

    // Skip Header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV Parsing (Handling commas inside quotes is rare here but possible, splitting by comma okay for simple numeric TV export)
        const parts = line.split(',');
        if (parts.length < 5) continue;

        const tradeNum = parseInt(parts[0]);
        const type = parts[1]; // "Entry long", "Exit short"
        const timeStr = parts[2]; // "2011-03-03 09:35"
        const signal = parts[3];
        const price = parseFloat(parts[4]);
        const contracts = parseFloat(parts[5]);
        const profit = parseFloat(parts[7]); // Net P&L USD

        const time = new Date(timeStr);

        // --- TIMING CHECKS ---
        const h = time.getHours();
        const m = time.getMinutes();

        // Strict Window: 09:30 - 09:45
        // Entry should be 09:35 (Close of 9:30-9:35 bar?) or 09:30?
        // Strategy says: "Entry on 9:35 Open" -> so timestamp 09:35.
        // Exit on 9:45 Open -> timestamp 09:45.

        if (h !== 9) {
            errors.push(`Trade #${tradeNum} at ${timeStr}: Outside 9 AM hour.`);
        } else {
            if (m < 30 || m > 45) {
                // Allow 9:45 exit.
                errors.push(`Trade #${tradeNum} at ${timeStr}: Outside 09:30-09:45 window.`);
            }
        }

        // --- POSITION CHECKS ---
        if (type.toLowerCase().includes('entry')) {
            if (type.toLowerCase().includes('long')) longCount++;
            if (type.toLowerCase().includes('short')) shortCount++;
        }

        // --- PnL Accumulation (Only on Exits) ---
        if (type.toLowerCase().includes('exit')) {
            totalPnL += profit;
            if (profit > 0) winCount++;
        }

        validTrades.push({ tradeNum, type, signal, time, price, contracts, profit });
    }

    // --- REPORT ---
    const totalExits = longCount + shortCount; // Approx
    // Actually strictly count exits for WinRate
    const exitCount = validTrades.filter(t => t.type.toLowerCase().includes('exit')).length;

    // Check Max Contracts
    let maxContracts = 0;
    validTrades.forEach(t => {
        if (t.contracts > maxContracts) maxContracts = t.contracts;
    });

    console.log("=== VERIFICATION REPORT ===");
    console.log(`File: ${path.basename(csvPath)}`);
    console.log(`Max Contracts Used: ${maxContracts}`);
    if (maxContracts > 1) {
        console.warn("⚠️ WARNING: More than 1 contract used in some trades!");
    } else {
        console.log("✅ Contract Sizing: Strictly 1 Contract per trade.");
    }
    console.log(`Total Rows Processed: ${validTrades.length}`);
    console.log(`Total Trades (Exits): ${exitCount}`);
    console.log(`Net PnL: $${totalPnL.toFixed(2)}`);
    console.log(`Win Rate: ${((winCount / exitCount) * 100).toFixed(2)}%`);
    console.log(`Long Entries: ${longCount}`);
    console.log(`Short Entries: ${shortCount}`);
    console.log(`Symmetry: ${longCount} / ${shortCount} (${(longCount / shortCount).toFixed(2)} ratio)`);

    console.log("\n--- SAFETY CHECKS ---");
    if (errors.length === 0) {
        console.log("✅ TIMING VERIFIED: All trades executed within 09:30 - 09:45 window.");
    } else {
        console.log(`❌ TIMING ERRORS: ${errors.length} violations found.`);
        // Show first 5 errors
        errors.slice(0, 5).forEach(e => console.log(e));
    }

    // Overnight Check
    // We already verified H==9. If all H==9, there are no overnight holds (unless held 24h exactly? Unlikely for M5 strategy closing same bar).
    // The "Entry" and "Exit" lines are separate.
    // We can check Duration implies intraday.
    // TradingView Export format makes it hard to link Entry/Exit explicitly without parsing Trade# groups.
    // But if ALL timestamps are 9:xx, then it's impossible to hold overnight (which would exit at 9:xx next day? - implies holding 24h).
    // Let's assume verifying H=9 is sufficient for "No Overnight held until 2am".
}

verifyCsv().catch(console.error);
