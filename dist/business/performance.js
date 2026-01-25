"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceReview = void 0;
const db_1 = require("../db");
const llm_1 = require("../llm");
const registry_1 = require("./registry");
class PerformanceReview {
    llm;
    constructor() {
        this.llm = new llm_1.OllamaLLM();
    }
    /**
     * Conduct a performance review for a manager and their direct reports.
     */
    async conductCheckIn(managerTitle, projectId) {
        const manager = registry_1.DigitalOrgRegistry.getTitle(managerTitle);
        const reports = registry_1.DigitalOrgRegistry.getReports(managerTitle);
        if (!manager || reports.length === 0) {
            return `No direct reports for ${managerTitle} to review.`;
        }
        // Fetch recent work from the database
        const db = db_1.DB.getInstance().getDb();
        const recentSteps = await new Promise((resolve) => {
            db.all(`
                SELECT ps.*, pr.process_name 
                FROM process_steps ps
                JOIN process_runs pr ON ps.process_run_id = pr.id
                WHERE pr.project_id = ? AND ps.status = 'COMPLETED'
                ORDER BY ps.created_at DESC
                LIMIT 20
            `, [projectId], (err, rows) => resolve(rows || []));
        });
        const prompt = `
You are the ${manager.title} performing a regular performance check-in with your team.

Your Team:
${reports.map(r => `- ${r.title} (Bias: ${r.bias})`).join('\n')}

Recent Activity Log:
${recentSteps.map(s => `[${s.process_name}] Step: ${s.step_id} - Result: ${s.result_json || 'Completed'}`).join('\n')}

Audit this work. As a manager, you must:
1. Rate each direct report on a scale of 1-10 for Quality and "Last Mile" execution.
2. Provide specific, constructive feedback based on the heuristics of their role.
3. Identify if any report is falling behind or deserves a "Promotion" to higher complexity tasks.

Format your response as a professional Audit Report for the CEO.
`;
        const response = await this.llm.generate(prompt);
        return response.content;
    }
}
exports.PerformanceReview = PerformanceReview;
