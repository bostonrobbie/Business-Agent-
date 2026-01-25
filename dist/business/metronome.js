"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metronome = void 0;
const db_1 = require("../db");
class Metronome {
    static async takeSnapshot(projectId) {
        const db = db_1.DB.getInstance().getDb();
        // 1. Holistic Gather
        const kpis = await new Promise((resolve) => {
            db.all("SELECT * FROM kpis WHERE project_id = ? ORDER BY created_at DESC LIMIT 10", [projectId], (err, rows) => resolve(rows || []));
        });
        const recentRuns = await new Promise((resolve) => {
            db.all("SELECT id, process_name, status FROM process_runs WHERE project_id = ? ORDER BY started_at DESC LIMIT 5", [projectId], (err, rows) => resolve(rows || []));
        });
        // 2. Synthesize Summary (In a real app, this might involve an LLM call)
        let summary = `Business Snapshot for Project #${projectId}\n`;
        summary += `Total Runs Checked: ${recentRuns.length}\n`;
        summary += `Latest Status: ${recentRuns[0]?.status || 'N/A'}\n`;
        const metadata = JSON.stringify({
            kpi_count: kpis.length,
            process_count: recentRuns.length,
            timestamp: new Date().toISOString()
        });
        // 3. Save Snapshot
        return new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO snapshots (project_id, summary, metadata_json, created_at) VALUES (?, ?, ?, datetime('now'))");
            stmt.run(projectId, summary, metadata, function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
            stmt.finalize();
        });
    }
    static async getLatestSnapshot(projectId) {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve) => {
            db.get("SELECT * FROM snapshots WHERE project_id = ? ORDER BY created_at DESC LIMIT 1", [projectId], (err, row) => resolve(row));
        });
    }
}
exports.Metronome = Metronome;
