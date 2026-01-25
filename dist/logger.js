"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const db_1 = require("./db");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Logger {
    runId;
    logDir;
    constructor(runId, logDir) {
        this.runId = runId || null;
        this.logDir = logDir || (runId ? path.join(process.cwd(), 'runs', `run_${runId}`) : path.join(process.cwd(), 'logs'));
    }
    async info(message, taskId) {
        return this.log('INFO', message, taskId);
    }
    async error(message, taskId) {
        return this.log('ERROR', message, taskId);
    }
    async log(level, message, taskId) {
        const db = db_1.DB.getInstance().getDb();
        const ts = new Date().toISOString();
        // Console log
        console.log(`[${ts}] [${level}] ${message}`);
        // DB Log if runId exists
        if (this.runId) {
            db.run("INSERT INTO logs (run_id, task_id, ts, level, message) VALUES (?, ?, ?, ?, ?)", [this.runId, taskId || null, ts, level, message]);
        }
        // File Log (AGENT_LOG.md)
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        const logFile = path.join(this.logDir, 'AGENT_LOG.md');
        fs.appendFileSync(logFile, `[${ts}] [${level}] ${message}\n`);
    }
}
exports.Logger = Logger;
