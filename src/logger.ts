
import { DB } from './db';
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
    private runId: number | null;
    private logDir: string;

    constructor(runId?: number, logDir?: string) {
        this.runId = runId || null;
        this.logDir = logDir || (runId ? path.join(process.cwd(), 'runs', `run_${runId}`) : path.join(process.cwd(), 'logs'));
    }

    public async info(message: string, taskId?: number) {
        return this.log('INFO', message, taskId);
    }

    public async error(message: string, taskId?: number) {
        return this.log('ERROR', message, taskId);
    }

    public async log(level: string, message: string, taskId?: number) {
        const db = DB.getInstance().getDb();
        const ts = new Date().toISOString();

        // Console log
        console.log(`[${ts}] [${level}] ${message}`);

        // DB Log if runId exists
        if (this.runId) {
            db.run("INSERT INTO logs (run_id, task_id, ts, level, message) VALUES (?, ?, ?, ?, ?)",
                [this.runId, taskId || null, ts, level, message]);
        }

        // File Log (AGENT_LOG.md)
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        const logFile = path.join(this.logDir, 'AGENT_LOG.md');
        fs.appendFileSync(logFile, `[${ts}] [${level}] ${message}\n`);
    }
}
