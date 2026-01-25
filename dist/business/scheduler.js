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
exports.Scheduler = void 0;
const db_1 = require("../db");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Scheduler {
    static async addSchedule(projectId, cadence, time) {
        const db = db_1.DB.getInstance().getDb();
        let nextRun = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
        if (nextRun < new Date()) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
        return new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO schedules (project_id, cadence, next_run_at, status) VALUES (?, ?, ?, 'ACTIVE')");
            stmt.run(projectId, cadence, nextRun.toISOString(), (err) => {
                if (err)
                    reject(err);
                else
                    resolve(true);
            });
            stmt.finalize();
        });
    }
    static async listSchedules() {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            db.all(`
        SELECT s.*, p.name as project_name 
        FROM schedules s 
        JOIN projects p ON s.project_id = p.id
      `, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    static async runDue() {
        const db = db_1.DB.getInstance().getDb();
        const now = new Date().toISOString();
        // Find due schedules
        const due = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM schedules WHERE status = 'ACTIVE' AND next_run_at <= ?", [now], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
        if (due.length > 0) {
            console.log(`[DAEMON] Found ${due.length} due schedules.`);
        }
        for (const schedule of due) {
            console.log(`[DAEMON] Executing schedule ${schedule.id} for project ${schedule.project_id}`);
            // Start Autonomous Flywheel (v9)
            const { ProcessRunner } = await Promise.resolve().then(() => __importStar(require('./process_runner')));
            console.log(`[DAEMON] Triggering SCOUTING cycle for project ${schedule.project_id}`);
            const processRunId = await ProcessRunner.startProcess('opportunity_scout_cycle', schedule.project_id, {
                objective: "Daily autonomous market audit and opportunity scouting."
            });
            const pRunner = new ProcessRunner(0);
            await pRunner.executeNextStep(processRunId);
            // Calculate next run
            const nextRun = new Date(schedule.next_run_at);
            if (schedule.cadence === 'daily') {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            else if (schedule.cadence === 'weekly') {
                nextRun.setDate(nextRun.getDate() + 7);
            }
            // Update Schedule
            await new Promise((resolve, reject) => {
                db.run("UPDATE schedules SET next_run_at = ? WHERE id = ?", [nextRun.toISOString(), schedule.id], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
    }
    static async daemon() {
        console.log('[DAEMON] Starting Company OS Scheduler Daemon...');
        console.log('[DAEMON] Loop interval: 60s');
        while (true) {
            try {
                await db_1.DB.getInstance().init();
                await this.runDue();
                // Heartbeat
                const now = new Date().toISOString();
                fs.writeFileSync(path.join(process.cwd(), 'daemon_heartbeat.json'), JSON.stringify({
                    last_tick: now,
                    status: 'OK'
                }));
            }
            catch (e) {
                console.error(`[DAEMON ERROR] ${e.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
    }
}
exports.Scheduler = Scheduler;
