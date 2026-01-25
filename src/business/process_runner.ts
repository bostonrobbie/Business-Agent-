
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { DB } from '../db';
import { CycleRunner } from './cycle';
import { Logger } from '../logger';

export interface ProcessDefinition {
    name: string;
    objective_template: string;
    steps: ProcessStepDefinition[];
    done_criteria: any[];
}

export interface ProcessStepDefinition {
    id: string;
    dept: string;
    action_type: 'LLM_TASK' | 'WRITE_ARTIFACT' | 'RUN_COMMAND' | 'UPDATE_MEMORY' | 'WISDOM_SYNTHESIS' | 'SNAPSHOT' | 'MULTIPLEX' | 'POLISH' | 'ROUTING' | 'DELIVERY_PACKET' | 'EXECUTIVE_SUMMARY' | 'PERFORMANCE_AUDIT' | 'SCOUTING' | 'DEEP_TRUTH_AUDIT' | 'DATA_INGESTION';
    risk_level: string;
    prompt_template: string;
    expected_artifacts?: string[];
    quality_gates?: any[];
    multiplex_personas?: any[];
}

export class ProcessRunner {
    private logger: Logger;

    constructor(runId: number) {
        this.logger = new Logger(runId);
    }

    public static async startProcess(processName: string, projectId: number, inputs: any): Promise<number> {
        const db = DB.getInstance().getDb();
        const processPath = path.join(process.cwd(), 'processes', `${processName}.yml`);

        if (!fs.existsSync(processPath)) {
            throw new Error(`Process definition not found: ${processName}`);
        }

        const def = yaml.load(fs.readFileSync(processPath, 'utf8')) as ProcessDefinition;

        const processRunId = await new Promise<number>((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO process_runs (process_name, project_id, status, inputs_json, started_at) VALUES (?, ?, 'RUNNING', ?, datetime('now'))");
            stmt.run(processName, projectId, JSON.stringify(inputs), function (this: any, err: any) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            stmt.finalize();
        });

        // Initialize steps
        for (const step of def.steps) {
            await new Promise((resolve, reject) => {
                const stmt = db.prepare("INSERT INTO process_steps (process_run_id, step_id, status, created_at, updated_at) VALUES (?, ?, 'PENDING', datetime('now'), datetime('now'))");
                stmt.run(processRunId, step.id, (err: any) => {
                    if (err) reject(err);
                    else resolve(true);
                });
                stmt.finalize();
            });
        }

        return processRunId;
    }

    public async executeNextStep(processRunId: number) {
        const db = DB.getInstance().getDb();

        const step: any = await new Promise((resolve) => {
            db.get("SELECT * FROM process_steps WHERE process_run_id = ? AND status = 'PENDING' ORDER BY id ASC LIMIT 1", [processRunId], (err: any, row: any) => resolve(row));
        });

        if (!step) {
            await this.finalizeProcess(processRunId);
            return;
        }

        // Update step status
        await new Promise((resolve) => {
            db.run("UPDATE process_steps SET status = 'RUNNING', updated_at = datetime('now') WHERE id = ?", [step.id], () => resolve(true));
        });

        const run: any = await new Promise((resolve) => {
            db.get("SELECT * FROM process_runs WHERE id = ?", [processRunId], (err: any, row: any) => resolve(row));
        });

        const processDir = path.join(process.cwd(), 'runs', `process_${processRunId}`);
        if (!fs.existsSync(processDir)) fs.mkdirSync(processDir, { recursive: true });

        const processPath = path.join(process.cwd(), 'processes', `${run.process_name}.yml`);
        const def = yaml.load(fs.readFileSync(processPath, 'utf8')) as ProcessDefinition;
        const stepDef = def.steps.find((s: any) => s.id === step.step_id)!;

        // Trace & Transparency: Log the start of the step
        const { Intercom } = await import('./intercom');
        Intercom.log('ProcessRunner', stepDef.dept, `Executing ${stepDef.action_type} for step ${stepDef.id}`);

        try {
            // Shared prompt interpolation logic for multiple action types
            let prompt = stepDef.prompt_template;
            const inputs = JSON.parse(run.inputs_json);
            for (const [key, val] of Object.entries(inputs)) {
                prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
            }

            // Resolve previous steps results
            const prevSteps: any[] = await new Promise((resolve) => {
                db.all("SELECT step_id, result_json FROM process_steps WHERE process_run_id = ? AND status = 'COMPLETED'", [processRunId], (err, rows) => resolve(rows || []));
            });
            for (const ps of prevSteps) {
                if (ps.result_json) {
                    try {
                        const result = JSON.parse(ps.result_json);
                        // Support {{step_id.result}} or {{step_id.result.key}}
                        if (prompt.includes(`{{${ps.step_id}.result}}`)) {
                            prompt = prompt.replace(new RegExp(`{{${ps.step_id}.result}}`, 'g'), ps.result_json);
                        }
                        // Shallow match for keys
                        for (const [resKey, resVal] of Object.entries(result)) {
                            const placeholder = `{{${ps.step_id}.result.${resKey}}}`;
                            if (prompt.includes(placeholder)) {
                                prompt = prompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(resVal));
                            }
                        }
                    } catch (e) { }
                }
            }

            if (stepDef.action_type === 'LLM_TASK') {
                const runner = new CycleRunner();
                const runId = await runner.start(prompt, Number(run.project_id), processDir);

                // Quality Gates Check (with v6.3.2 Recursive Self-Correction)
                if (stepDef.quality_gates) {
                    const { QualityGate } = await import('./quality_gate');
                    const { OllamaLLM } = await import('../llm');
                    const managerLLM = new OllamaLLM();

                    for (const gate of stepDef.quality_gates) {
                        const result = QualityGate.validate(processDir, gate);
                        if (!result.success) {
                            Intercom.log('ProcessRunner', 'Manager', `Quality Gate Failed for ${stepDef.id}: ${result.error}. Triggering Self-Correction.`);

                            // 1. Debrief
                            const debriefPrompt = `The agent failed a quality gate for step "${stepDef.id}".
Error: ${result.error}
Objective: ${prompt}
Provide a brief manager's debrief on why it failed and how to fix it. Limit to 1 paragraph.`;
                            const debrief = await managerLLM.generate(debriefPrompt);
                            Intercom.logThought('Manager', `DEBRIEF for ${stepDef.id}: ${debrief.content}`);

                            // 2. Retry with correction context
                            const retryPrompt = `
### RECURSIVE CORRECTION CYCLE ###
Your previous attempt for step "${stepDef.id}" failed a quality gate.
ERROR: ${result.error}
MANAGER FEEDBACK: ${debrief.content}

Please re-execute the original objective with these corrections:
${prompt}
`;
                            const retryRunId = await runner.start(retryPrompt, Number(run.project_id), processDir);

                            // Re-validate
                            const secondResult = QualityGate.validate(processDir, gate);
                            if (!secondResult.success) {
                                throw new Error(`Quality Gate Failed after recursive correction: ${secondResult.error}`);
                            }

                            Intercom.log('ProcessRunner', 'Manager', `Self-Correction SUCCESSFUL for ${stepDef.id}`);
                        }
                    }
                }

                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET task_id = ?, status = 'COMPLETED', updated_at = datetime('now') WHERE id = ?", [runId, step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'WRITE_ARTIFACT') {
                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', updated_at = datetime('now') WHERE id = ?", [step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'WISDOM_SYNTHESIS') {
                const { WisdomLayer } = await import('./wisdom_layer');
                const history = await WisdomLayer.synthesizeHistory(Number(run.project_id));

                const wisdomPath = path.join(processDir, 'WISDOM_AUDIT.md');
                fs.writeFileSync(wisdomPath, history);

                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify({ path: 'WISDOM_AUDIT.md', content: history }), step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'SNAPSHOT') {
                const { Metronome } = await import('./metronome');
                const snapshotId = await Metronome.takeSnapshot(Number(run.project_id));
                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify({ snapshot_id: snapshotId }), step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'MULTIPLEX') {
                const { Multiplexer } = await import('./multiplex');
                const mux = new Multiplexer();
                let result = await mux.synthesizeConsensus(prompt, stepDef.multiplex_personas || []);

                // Extract thoughts if any
                const thoughtMatch = result.match(/<thought>([\s\S]*?)<\/thought>/);
                if (thoughtMatch) {
                    Intercom.logThought(stepDef.dept, thoughtMatch[1]);
                    result = result.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
                }

                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify({ content: result }), step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'POLISH') {
                const { Polisher } = await import('./polisher');
                const polisher = new Polisher();
                const targetFile = path.join(processDir, prompt); // Use interpolated prompt as filename
                await polisher.polishArtifact(targetFile, `Polishing requested in process ${run.process_name}`);
                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', updated_at = datetime('now') WHERE id = ?", [step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'ROUTING') {
                const { UniversalProxy } = await import('./universal_proxy');
                const proxy = new UniversalProxy();
                const route = await proxy.routeTask(prompt);
                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify(route), step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'DELIVERY_PACKET') {
                const { Logger } = await import('../logger');
                const logger = new Logger(undefined, processDir);
                const deliveryDir = path.join(processDir, 'DELIVERY_PACKET');
                if (!fs.existsSync(deliveryDir)) fs.mkdirSync(deliveryDir, { recursive: true });

                // Copy expected artifacts to delivery packet
                if (stepDef.expected_artifacts) {
                    for (const art of stepDef.expected_artifacts) {
                        const src = path.join(processDir, art);
                        const dest = path.join(deliveryDir, path.basename(art));
                        if (fs.existsSync(src)) {
                            fs.copyFileSync(src, dest);
                            await logger.info(`Added ${art} to Delivery Packet`);
                        }
                    }
                }

                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', updated_at = datetime('now') WHERE id = ?", [step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'EXECUTIVE_SUMMARY') {
                const { OllamaLLM } = await import('../llm');
                const llm = new OllamaLLM();
                const { DigitalOrgRegistry } = await import('./registry');
                const ceo = DigitalOrgRegistry.getTitle('CEO')!;
                const prevSteps: any[] = await new Promise((resolve) => {
                    db.all("SELECT step_id, result_json FROM process_steps WHERE process_run_id = ? AND status = 'COMPLETED'", [processRunId], (err, rows) => resolve(rows || []));
                });

                const summaryPrompt = `
You are the CEO Synthesis Engine. Summarize the work done in this autonomous cycle.

Objective: ${run.project_name} - ${run.process_name}
Work performed:
${prevSteps.map(ps => `- [${ps.step_id}]: ${ps.result_json || 'Completed'}`).join('\n')}

Create a high-level Executive Summary for the business owner. 
Focus on:
1. WHAT was delivered.
2. WHY it matters (Business Value).
3. THE LOVE EQUATION (Owner time saved vs leverage gained).
4. NEXT ACTIONS for the owner.

Format as a professional Markdown report.
`;
                const summary = await llm.generate(summaryPrompt, {
                    ...ceo.hardwareProfile,
                    isDeepTruth: ceo.isDeepTruthEnabled
                });

                let summaryContent = summary.content;
                const thoughtMatch = summaryContent.match(/<thought>([\s\S]*?)<\/thought>/);
                if (thoughtMatch) {
                    Intercom.logThought(ceo.title, thoughtMatch[1]);
                    summaryContent = summaryContent.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
                }

                const summaryPath = path.join(processDir, 'EXECUTIVE_SUMMARY.md');
                fs.writeFileSync(summaryPath, summaryContent);

                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify({ path: 'EXECUTIVE_SUMMARY.md', content: summaryContent }), step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'PERFORMANCE_AUDIT') {
                const { PerformanceReview } = await import('./performance');
                const audit = new PerformanceReview();
                // dept acts as the manager's department or title filter
                const report = await audit.conductCheckIn(stepDef.dept, Number(run.project_id));
                const auditPath = path.join(processDir, 'PERFORMANCE_AUDIT.md');
                fs.writeFileSync(auditPath, report);

                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify({ path: 'PERFORMANCE_AUDIT.md', content: report }), step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'SCOUTING') {
                const { Scout } = await import('./scout');
                const scout = new Scout();
                const opportunities = await scout.scoutOpportunities(Number(run.project_id));
                const scoutPath = path.join(processDir, 'SCOUT_REPORT.md');
                const reportContent = `# Proactive Opportunity Report\n\n${opportunities.map(o => `### ${o.title} (${o.ownerFriction} Friction)\n- **Description**: ${o.description}\n- **Leverage**: ${o.marketLeverage}\n- **Next Action**: ${o.suggestedAction}`).join('\n\n')}`;
                fs.writeFileSync(scoutPath, reportContent);

                // --- v7.3 AUTONOMY FLYWHEEL TRIGGER ---
                const highConfidence = opportunities.filter(o => Number(o.marketLeverage) >= 8 && Number(o.ownerFriction) <= 3);
                for (const opp of highConfidence) {
                    Intercom.log('ProcessRunner', 'Analysis Lead', `FLYWHEEL TRIGGER: High-Confidence Opportunity detected: ${opp.title}. Initiating Auto-Project.`);

                    // Trigger a new process cycle for this specific opportunity
                    // We assume a 'business_plan' process exists or use a generic one
                    try {
                        const newProcessRunId = await ProcessRunner.startProcess('business_plan', Number(run.project_id), {
                            objective: `Develop full business plan and execution strategy for: ${opp.title}. Description: ${opp.description}`
                        });
                        Intercom.log('ProcessRunner', 'CEO', `Autonomous Project Started for ${opp.title}. ID: ${newProcessRunId}`);
                    } catch (e: any) {
                        Intercom.log('ProcessRunner', 'CEO', `Flywheel Trigger Failed for ${opp.title}: ${e.message}`);
                    }
                }

                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify({ opportunities }), step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'DEEP_TRUTH_AUDIT') {
                const { OllamaLLM } = await import('../llm');
                const llm = new OllamaLLM();
                const { DigitalOrgRegistry } = await import('./registry');
                const ceo = DigitalOrgRegistry.getTitle('CEO')!;

                const auditPrompt = `
Objective: ${run.project_name} - ${run.process_name}
Context: ${prompt}

Perform a DEEP TRUTH AUDIT on the current progress. 
1. Identify any hidden assumptions.
2. Demand forensic proof for the most recent claims.
3. Label all non-empirical statements as [SUBJECTIVE].
4. State exactly what evidence would prove this strategy wrong.
`;
                const response = await llm.generate(auditPrompt, {
                    ...ceo.hardwareProfile,
                    isDeepTruth: true
                });

                // Extract thoughts if present
                let content = response.content;
                const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/);
                if (thoughtMatch) {
                    Intercom.logThought(ceo.title, thoughtMatch[1]);
                    content = content.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
                }

                const auditPath = path.join(processDir, 'DEEP_TRUTH_AUDIT.md');
                fs.writeFileSync(auditPath, content);

                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify({ path: 'DEEP_TRUTH_AUDIT.md', content }), step.id], () => resolve(true));
                });
            } else if (stepDef.action_type === 'DATA_INGESTION') {
                const { DataIngestor } = await import('./ingestion');
                const ingestor = new DataIngestor();
                // prompt is used as the target path here
                const targetPath = prompt;
                const summary = await ingestor.ingestDirectory(targetPath);

                const reportPath = path.join(processDir, 'DATA_INGESTION_REPORT.md');
                fs.writeFileSync(reportPath, summary);

                await new Promise((resolve) => {
                    db.run("UPDATE process_steps SET status = 'COMPLETED', result_json = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify({ path: 'DATA_INGESTION_REPORT.md', content: summary }), step.id], () => resolve(true));
                });
            }

            // Trigger next step
            await this.executeNextStep(processRunId);
        } catch (e: any) {
            await new Promise((resolve) => {
                db.run("UPDATE process_steps SET status = 'FAILED', error = ?, updated_at = datetime('now') WHERE id = ?", [e.message, step.id], () => resolve(true));
                db.run("UPDATE process_runs SET status = 'FAILED', finished_at = datetime('now') WHERE id = ?", [processRunId], () => resolve(true));
            });
        }
    }

    private async finalizeProcess(processRunId: number) {
        const db = DB.getInstance().getDb();
        const processDir = path.join(process.cwd(), 'runs', `process_${processRunId}`);

        // Generate Final PROCESS_REPORT.md
        let report = `# Process Run Report #${processRunId}\n\n`;

        const run: any = await new Promise((resolve) => {
            db.get("SELECT * FROM process_runs WHERE id = ?", [processRunId], (err, row) => resolve(row));
        });

        report += `**Process**: ${run.process_name}\n`;
        report += `**Status**: COMPLETED\n\n`;

        // Check for HUMAN_ACTIONS.md to extract top 3
        const humanActionsPath = path.join(processDir, 'HUMAN_ACTIONS.md');
        if (fs.existsSync(humanActionsPath)) {
            const actions = fs.readFileSync(humanActionsPath, 'utf8');
            report += `## Top Human Actions\n`;
            // Get first few list items
            const matches = actions.match(/^- .*/gm);
            if (matches) report += matches.slice(0, 3).join('\n') + '\n\n';
        }

        // Artifacts Summary
        report += `## Packets Generated\n`;
        ['OUTREACH_READY', 'LANDING_READY', 'OPS_READY'].forEach(pkg => {
            const pkgPath = path.join(processDir, pkg);
            if (fs.existsSync(pkgPath)) {
                report += `- **${pkg}**: Ready\n`;
            }
        });

        fs.writeFileSync(path.join(processDir, 'PROCESS_REPORT.md'), report);

        await new Promise((resolve) => {
            db.run("UPDATE process_runs SET status = 'COMPLETED', finished_at = datetime('now') WHERE id = ?", [processRunId], () => resolve(true));
        });
        console.log(`[PROCESS] Run ${processRunId} completed.`);
    }
}
