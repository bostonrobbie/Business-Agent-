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
exports.CycleRunner = void 0;
const db_1 = require("./db");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const risk_1 = require("./risk");
const logger_1 = require("./logger");
const llm_1 = require("./llm");
const approvals_1 = require("./approvals");
const memory_1 = require("./memory");
const schemas_1 = require("./schemas");
class CycleRunner {
    llm;
    constructor() {
        this.llm = new llm_1.OllamaLLM();
    }
    async start(objective, projectId = 1) {
        const db = db_1.DB.getInstance().getDb();
        // 1. Create Run in DB
        const runId = await new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO runs (objective, project_id, created_at, status) VALUES (?, ?, datetime('now'), 'RUNNING')");
            stmt.run(objective, projectId, function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
            stmt.finalize();
        });
        // 2. Create Run Directory
        const runDir = path.join(process.cwd(), 'runs', `run_${runId}`);
        if (!fs.existsSync(runDir)) {
            fs.mkdirSync(runDir, { recursive: true });
        }
        // 3. Initialize Logger
        const logger = new logger_1.Logger(runId);
        await logger.log('INFO', `Starting cycle with objective: ${objective}`);
        // 4. Create Initial Task (CEO)
        await this.createTask(runId, 'CEO', 'Analyze and Delegate', 'CEO Agent starts the cycle', objective);
        // 5. Process Queue
        await this.processQueue(runId, logger);
        // 6. Generate Report
        await this.generateReport(runId, objective, logger);
        // 7. Finish
        // 7. Finish (only if not paused)
        const finalCheck = await new Promise((resolve) => {
            db.get("SELECT status FROM runs WHERE id = ?", [runId], (err, row) => resolve(row));
        });
        if (finalCheck && finalCheck.status !== 'PAUSED') {
            await new Promise((resolve, reject) => {
                db.run("UPDATE runs SET status = 'COMPLETED' WHERE id = ?", [runId], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            await logger.log('INFO', 'Cycle Completed.');
        }
        else {
            await logger.log('INFO', 'Cycle Paused. Pending Approval.');
        }
        return runId;
    }
    async resumeRun(runId) {
        const logger = new logger_1.Logger(runId);
        await logger.log('INFO', `Resuming Cycle...`);
        await this.processQueue(runId, logger);
        // Generate Report (Idempotent-ish)
        // Retrieve objective to pass to report?
        const db = db_1.DB.getInstance().getDb();
        const run = await new Promise((resolve) => {
            db.get("SELECT objective FROM runs WHERE id = ?", [runId], (err, row) => resolve(row));
        });
        if (run) {
            await this.generateReport(runId, run.objective, logger);
            // Check if all tasks done
            const pending = await new Promise((resolve) => {
                db.get("SELECT count(*) as c FROM tasks WHERE run_id = ? AND status != 'COMPLETED'", [runId], (err, row) => resolve(row.c));
            });
            if (pending === 0) {
                await new Promise((resolve, reject) => {
                    db.run("UPDATE runs SET status = 'COMPLETED' WHERE id = ?", [runId], (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                });
                await logger.log('INFO', 'Cycle Completed.');
            }
            else {
                await logger.log('INFO', 'Cycle Paused or Incomplete.');
            }
        }
    }
    async createTask(runId, dept, title, description, payload) {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
        INSERT INTO tasks (run_id, dept, title, description, risk_level, status, payload_json, created_at, updated_at) 
        VALUES (?, ?, ?, ?, 'SAFE', 'PENDING', ?, datetime('now'), datetime('now'))
      `);
            stmt.run(runId, dept, title, description, payload, function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
            stmt.finalize();
        });
    }
    async processQueue(runId, logger) {
        const db = db_1.DB.getInstance().getDb();
        while (true) {
            // Get next pending task
            const task = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM tasks WHERE run_id = ? AND status = 'PENDING' ORDER BY id ASC LIMIT 1", [runId], (err, row) => {
                    if (err)
                        reject(err);
                    else
                        resolve(row);
                });
            });
            if (!task)
                break; // No more tasks
            await logger.log('INFO', `Starting Task ${task.id}: [${task.dept}] ${task.title}`, task.id);
            // Update status to RUNNING
            // Update status to RUNNING
            await new Promise((resolve, reject) => {
                db.run("UPDATE tasks SET status = 'RUNNING' WHERE id = ?", [task.id], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            // Get Project ID for this run
            const projectId = await new Promise((resolve) => {
                db.get("SELECT project_id FROM runs WHERE id = ?", [runId], (err, row) => resolve(row ? row.project_id : 1));
            });
            try {
                // Execute Task
                const result = await this.executeTask(task, runId, projectId, logger);
                if (result && result.paused) {
                    await logger.log('INFO', `Run ${runId} PAUSED requiring approval.`, task.id);
                    break; // Exit queue processing
                }
                // Update status to COMPLETED
                // Update status to COMPLETED
                await new Promise((resolve, reject) => {
                    db.run("UPDATE tasks SET status = 'COMPLETED', updated_at = datetime('now') WHERE id = ?", [task.id], (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                });
                await logger.log('INFO', `Task ${task.id} Completed`, task.id);
            }
            catch (error) {
                console.error(error);
                db.run("UPDATE tasks SET status = 'FAILED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify({ error: error.message }), task.id]);
                await logger.log('ERROR', `Task ${task.id} Failed: ${error.message}`, task.id);
            }
        }
    }
    async executeTask(task, runId, projectId, logger) {
        const promptPath = path.join(process.cwd(), 'prompts', `${task.dept.toLowerCase()}.md`);
        let promptTemplate = '';
        if (fs.existsSync(promptPath)) {
            promptTemplate = fs.readFileSync(promptPath, 'utf8');
        }
        else {
            promptTemplate = `Role: ${task.dept} Agent\nObjective: {{objective}}\nInstructions: Return JSON matching schema.`;
        }
        // Fetch Memories
        const memories = await memory_1.MemoryStore.search(projectId, task.dept, task.payload_json || '');
        let memoryContext = '';
        if (memories.length > 0) {
            memoryContext = `\n\nExisting Project Knowledge (Use if relevant):\n` +
                memories.map(m => `- [${m.title}]: ${m.content.substring(0, 200)}...`).join('\n');
        }
        const prompt = promptTemplate.replace('{{objective}}', task.payload_json) + memoryContext;
        let parsed;
        let attempts = 0;
        const maxAttempts = 3;
        let lastError = '';
        while (attempts < maxAttempts) {
            attempts++;
            try {
                let currentPrompt = prompt;
                if (attempts > 1) {
                    currentPrompt += `\n\nPrevious response was invalid JSON. Error: ${lastError}\nEnsure valid JSON only. NO markdown.`;
                    await logger.log('WARN', `Retrying Task ${task.id} due to invalid JSON (Attempt ${attempts})`, task.id);
                }
                const response = await this.llm.generate(currentPrompt);
                let cleanContent = response.content.trim();
                const jsonStart = cleanContent.indexOf('{');
                const jsonEnd = cleanContent.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
                }
                else {
                    // Fallback cleanup if no braces found (unlikely but possible)
                    if (cleanContent.startsWith('```json'))
                        cleanContent = cleanContent.replace(/^```json/, '').replace(/```$/, '');
                    else if (cleanContent.startsWith('```'))
                        cleanContent = cleanContent.replace(/^```/, '').replace(/```$/, '');
                }
                parsed = JSON.parse(cleanContent);
                break;
            }
            catch (e) {
                lastError = e.message;
                if (attempts === maxAttempts)
                    throw new Error(`Failed to parse JSON after ${maxAttempts} attempts: ${e.message}`);
            }
        }
        // Validate Schema
        const resultSchema = schemas_1.AgentResponseSchema;
        // In a real scenario, we might pick specific schema based on dept, 
        // but Union schema handles basic checking.
        // Let's rely on loose typing + specific checks for processing for now to keep it simple v1
        // Store Result JSON in DB
        const db = db_1.DB.getInstance().getDb();
        db.run("UPDATE tasks SET result_json = ? WHERE id = ?", [JSON.stringify(parsed), task.id]);
        // Process Outputs (Normalized from different schemas)
        // 0. KPIs (Common)
        if (parsed.kpis && Array.isArray(parsed.kpis)) {
            for (const kpi of parsed.kpis) {
                db.run("INSERT INTO kpis (run_id, project_id, name, value, unit, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))", [runId, projectId, kpi.name, kpi.value, kpi.unit || null]);
                await logger.log('INFO', `Tracked KPI: ${kpi.name} = ${kpi.value} ${kpi.unit || ''}`, task.id);
            }
        }
        // 1. Tasks (CEO)
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
            for (const subTask of parsed.tasks) {
                await this.createTask(runId, subTask.dept, subTask.title, subTask.description || subTask.title, task.payload_json);
                await logger.log('INFO', `Delegated task to ${subTask.dept}`, task.id);
            }
        }
        // 2. Files (Everyone else)
        if (parsed.files_to_create && Array.isArray(parsed.files_to_create)) {
            for (const file of parsed.files_to_create) {
                // Risk Check
                const risk = risk_1.RiskEngine.evaluate({ type: 'FILE_WRITE', payload: file });
                if (risk === 'BLOCKED') {
                    await logger.log('WARN', `Blocked SAFE action: Write ${file.path}`, task.id);
                    continue;
                }
                if (risk === 'REVIEW') {
                    // Check if already approved
                    const isApproved = await approvals_1.ApprovalSystem.isApproved(task.id);
                    if (isApproved) {
                        await logger.log('INFO', `Action APPROVED (Pre-authorized): Write ${file.path}`, task.id);
                        // Proceed to write
                    }
                    else {
                        // Create approval request
                        const approvalId = await approvals_1.ApprovalSystem.createRequest(task.id, `Review required for file write: ${file.path}`);
                        await logger.log('WARN', `Action requires REVIEW: Write ${file.path}. Pausing run. Approval ID: ${approvalId}`, task.id);
                        // Mark task as NEEDS_APPROVAL and run as PAUSED
                        await new Promise((resolve, reject) => {
                            const db = db_1.DB.getInstance().getDb();
                            db.serialize(() => {
                                db.run("UPDATE tasks SET status = 'NEEDS_APPROVAL' WHERE id = ?", [task.id]);
                                db.run("UPDATE runs SET status = 'PAUSED' WHERE id = ?", [runId]);
                            });
                            resolve();
                        });
                        return { paused: true };
                    }
                }
                // Write File
                const fullPath = path.join(process.cwd(), 'runs', `run_${runId}`, file.path);
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(fullPath, file.content);
                await logger.log('INFO', `Generated artifact: ${file.path}`, task.id);
                db.run("INSERT INTO artifacts (run_id, task_id, path, type, created_at) VALUES (?, ?, ?, ?, datetime('now'))", [runId, task.id, file.path, 'file']);
            }
        }
        // 3. Commands (Engineering)
        if (parsed.commands_to_run && Array.isArray(parsed.commands_to_run)) {
            for (const cmd of parsed.commands_to_run) {
                const risk = risk_1.RiskEngine.evaluate({ type: 'COMMAND', payload: { command: cmd } });
                if (risk === 'BLOCKED') {
                    await logger.log('WARN', `Blocked SAFE action: Command ${cmd}`, task.id);
                    continue;
                }
                if (risk === 'REVIEW') {
                    const isApproved = await approvals_1.ApprovalSystem.isApproved(task.id);
                    if (isApproved) {
                        await logger.log('INFO', `Action APPROVED (Pre-authorized): Command ${cmd}`, task.id);
                    }
                    else {
                        const approvalId = await approvals_1.ApprovalSystem.createRequest(task.id, `Review required for command: ${cmd}`);
                        await logger.log('WARN', `Action requires REVIEW: Command ${cmd}. Pausing run. Approval ID: ${approvalId}`, task.id);
                        await new Promise((resolve, reject) => {
                            const db = db_1.DB.getInstance().getDb();
                            db.serialize(() => {
                                db.run("UPDATE tasks SET status = 'NEEDS_APPROVAL' WHERE id = ?", [task.id]);
                                db.run("UPDATE runs SET status = 'PAUSED' WHERE id = ?", [runId]);
                            });
                            resolve();
                        });
                        return { paused: true };
                    }
                }
                // SAFE command (e.g. ls, echo)
                await logger.log('INFO', `Executed SAFE command: ${cmd}`, task.id);
            }
        }
        // 3. Normalized Output Rendering (Optional: Create standard markdown from structured data)
        // For v1, we rely on the agent generating files_to_create directly as per prompt instructions.
    }
    async generateReport(runId, objective, logger) {
        const db = db_1.DB.getInstance().getDb();
        // Fetch Artifacts
        const artifacts = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM artifacts WHERE run_id = ?", [runId], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
        // Fetch Tasks
        const tasks = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM tasks WHERE run_id = ?", [runId], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
        let report = `# Run Report #${runId}\n\n`;
        report += `**Objective**: ${objective}\n`;
        report += `**Date**: ${new Date().toISOString()}\n\n`;
        report += `## Summary\n`;
        report += `Executed ${tasks.length} tasks.\n`;
        report += `Generated ${artifacts.length} artifacts.\n\n`;
        report += `## Artifacts\n`;
        artifacts.forEach(a => {
            report += `- [${a.path}](${a.path}) (${a.type})\n`;
        });
        report += `\n`;
        report += `## Tasks\n`;
        tasks.forEach(t => {
            report += `- **${t.dept}**: ${t.title} - ${t.status}\n`;
        });
        const reportPath = path.join(process.cwd(), 'runs', `run_${runId}`, 'RUN_REPORT.md');
        fs.writeFileSync(reportPath, report);
        await logger.log('INFO', `Generated artifact: RUN_REPORT.md`);
    }
}
exports.CycleRunner = CycleRunner;
