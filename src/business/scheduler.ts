import { DB } from '../db';
import { CycleRunner } from './cycle';
import { Logger } from '../logger';
import * as fs from 'fs';
import * as path from 'path';

export class Scheduler {
    public static async addSchedule(projectId: number, cadence: 'daily' | 'weekly', time: string) {
        const db = DB.getInstance().getDb();

        let nextRun = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);

        if (nextRun < new Date()) {
            nextRun.setDate(nextRun.getDate() + 1);
        }

        return new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO schedules (project_id, cadence, next_run_at, status) VALUES (?, ?, ?, 'ACTIVE')");
            stmt.run(projectId, cadence, nextRun.toISOString(), (err: Error) => {
                if (err) reject(err);
                else resolve(true);
            });
            stmt.finalize();
        });
    }

    public static async listSchedules(): Promise<any[]> {
        const db = DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            db.all(`
        SELECT s.*, p.name as project_name 
        FROM schedules s 
        JOIN projects p ON s.project_id = p.id
      `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    public static async runDue() {
        const db = DB.getInstance().getDb();
        const now = new Date().toISOString();

        // Find due schedules
        const due: any[] = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM schedules WHERE status = 'ACTIVE' AND next_run_at <= ?", [now], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (due.length > 0) {
            console.log(`[DAEMON] Found ${due.length} due schedules.`);
        }

        for (const schedule of due) {
            console.log(`[DAEMON] Executing schedule ${schedule.id} for project ${schedule.project_id}`);

            // Start Autonomous Flywheel (v9)
            const { ProcessRunner } = await import('./process_runner');
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
            } else if (schedule.cadence === 'weekly') {
                nextRun.setDate(nextRun.getDate() + 7);
            }

            // Update Schedule
            await new Promise<void>((resolve, reject) => {
                db.run("UPDATE schedules SET next_run_at = ? WHERE id = ?", [nextRun.toISOString(), schedule.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }

    public static async daemon() {
        console.log('[DAEMON] Starting Company OS Scheduler Daemon...');
        console.log('[DAEMON] Loop interval: 60s');

        while (true) {
            try {
                await DB.getInstance().init();
                await this.runDue();
                // Heartbeat
                const now = new Date().toISOString();
                fs.writeFileSync(path.join(process.cwd(), 'daemon_heartbeat.json'), JSON.stringify({
                    last_tick: now,
                    status: 'OK'
                }));
            } catch (e: any) {
                console.error(`[DAEMON ERROR] ${e.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
    }
}
