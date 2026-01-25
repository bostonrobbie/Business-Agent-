"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
const db_1 = require("./db");
const cycle_1 = require("./cycle");
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
        console.log(`Found ${due.length} due schedules.`);
        for (const schedule of due) {
            console.log(`Executing schedule ${schedule.id} for project ${schedule.project_id}`);
            // Start Run
            const runner = new cycle_1.CycleRunner();
            // In v2 we assume a default objective for scheduled runs or we could allow storing it in schedule
            // For now, let's use a generic "Daily Business Cycle" objective
            const runId = await runner.start("Daily Scheduled Business Cycle", schedule.project_id);
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
}
exports.Scheduler = Scheduler;
