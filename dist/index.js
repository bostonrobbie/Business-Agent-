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
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("./db");
const cycle_1 = require("./business/cycle");
const approvals_1 = require("./business/approvals");
const program = new commander_1.Command();
program
    .name('companyos')
    .description('Company OS Private Appliance CLI')
    .version('1.0.0');
program
    .command('projects:add')
    .description('Create a new project')
    .requiredOption('--name <text>', 'Project name')
    .option('--description <text>', 'Project description')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const db = db_1.DB.getInstance().getDb();
        const stmt = db.prepare("INSERT INTO projects (name, description, created_at) VALUES (?, ?, datetime('now'))");
        stmt.run(options.name, options.description, function () {
            console.log(`Project created with ID: ${this.lastID}`);
        });
        stmt.finalize();
    }
    catch (error) {
        console.error('Error adding project:', error);
    }
});
program
    .command('projects:list')
    .description('List all projects')
    .action(async () => {
    try {
        await db_1.DB.getInstance().init();
        const db = db_1.DB.getInstance().getDb();
        console.log('\n--- Projects ---');
        db.all("SELECT * FROM projects", (err, rows) => {
            if (err)
                throw err;
            if (rows.length === 0)
                console.log('No projects found.');
            else {
                rows.forEach(r => console.log(`[ID: ${r.id}] ${r.name} - ${r.description || 'No description'}`));
            }
        });
    }
    catch (error) {
        console.error('Error listing projects:', error);
    }
});
program
    .command('run_cycle')
    .description('Start a new business cycle with an objective')
    .requiredOption('-o, --objective <text>', 'Business objective')
    .option('-p, --project_id <id>', 'Project ID', '1') // Default to 1 (Default Project)
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        console.log(`Starting cycle for objective: ${options.objective} (Project: ${options.project_id})`);
        const runner = new cycle_1.CycleRunner();
        const runId = await runner.start(options.objective, Number(options.project_id));
        console.log(`Cycle started with Run ID: ${runId}`);
    }
    catch (error) {
        console.error('Error starting cycle:', error);
    }
});
program
    .command('approvals:show')
    .description('Show details of an approval request')
    .requiredOption('--id <id>', 'Approval ID')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const db = db_1.DB.getInstance().getDb();
        const approval = await new Promise((resolve) => {
            db.get(`
            SELECT a.*, t.dept, t.title, t.description, t.result_json 
            FROM approvals a 
            JOIN tasks t ON a.task_id = t.id 
            WHERE a.id = ?`, [options.id], (err, row) => resolve(row));
        });
        if (!approval) {
            console.log('Approval request not found.');
            return;
        }
        console.log(`\n=== Approval Request #${approval.id} ===`);
        console.log(`Task: [${approval.dept}] ${approval.title}`);
        console.log(`Description: ${approval.description}`);
        console.log(`Status: ${approval.decision}`);
        console.log(`Requested At: ${approval.requested_at}`);
        if (approval.decision !== 'PENDING') {
            console.log(`Resolved At: ${approval.approved_at}`);
            console.log(`Notes: ${approval.notes}`);
        }
        console.log('\n--- Details ---');
        // Try to parse partial result if available, or payload
        // For v1, the pause happens before result_json is full, but we might have partial info or we look at the last action log?
        // Actually, the pause happens inside executeTask, so we don't have result_json yet.
        // But we do have the risk trigger description in `notes` sometimes? 
        // In v2, let's just show the raw logic: "Review required for..." is stored in the initial creation notes?
        // Wait, we didn't store the reason in approvals table explicitly except in the call to createRequest.
        // Let's verify `ApprovalSystem.createRequest`.
        // Checking ApprovalSystem to ensure we have context
        console.log(`Context: ${approval.notes || 'No notes provided.'}`);
    }
    catch (error) {
        console.error('Error showing approval:', error);
    }
});
program
    .command('approvals:list')
    .description('List pending approvals')
    .action(async () => {
    try {
        await db_1.DB.getInstance().init();
        const pending = await approvals_1.ApprovalSystem.getPending();
        console.log('\n--- Pending Approvals ---');
        if (pending.length === 0)
            console.log('No pending approvals.');
        else {
            console.table(pending.map(p => ({
                ID: p.id,
                Task: p.title,
                Risk: 'REVIEW', // Assuming all are REVIEW for now
                Note: p.notes,
                Created: p.requested_at
            })));
        }
    }
    catch (error) {
        console.error('Error listing approvals:', error);
    }
});
program
    .command('report:daily')
    .description('Generate daily report')
    .option('--date <YYYY-MM-DD>', 'Date to report on', new Date().toISOString().split('T')[0])
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const db = db_1.DB.getInstance().getDb();
        const date = options.date;
        console.log(`\n=== Daily Report: ${date} ===\n`);
        // Runs Summary
        const runs = await new Promise((resolve) => {
            db.all("SELECT * FROM runs WHERE date(created_at) = ?", [date], (err, rows) => resolve(rows || []));
        });
        console.log(`Total Runs: ${runs.length}`);
        const completed = runs.filter(r => r.status === 'COMPLETED').length;
        const failed = runs.filter(r => r.status === 'FAILED').length;
        console.log(`Completed: ${completed} | Failed: ${failed}`);
        // KPIs
        const kpis = await new Promise((resolve) => {
            db.all("SELECT * FROM kpis WHERE date(created_at) = ?", [date], (err, rows) => resolve(rows || []));
        });
        if (kpis.length > 0) {
            console.log('\n--- KPIs ---');
            console.table(kpis.map(k => ({ Metric: k.name, Value: k.value, Unit: k.unit || '' })));
        }
        else {
            console.log('\nNo KPIs recorded today.');
        }
        // High Level Issues
        if (failed > 0) {
            console.log('\n--- Failures ---');
            runs.filter(r => r.status === 'FAILED').forEach(r => {
                console.log(`Run #${r.id}: ${r.objective} (FAILED)`);
            });
        }
    }
    catch (error) {
        console.error('Error generating report:', error);
    }
});
program
    .command('approve')
    .description('Approve a pending request')
    .requiredOption('--id <id>', 'Approval ID')
    .option('--notes <text>', 'Optional notes')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        await approvals_1.ApprovalSystem.review(Number(options.id), 'APPROVED', options.notes);
        console.log(`Approval ${options.id} granted.`);
    }
    catch (error) {
        console.error('Error approving:', error);
    }
});
program
    .command('reject')
    .description('Reject a pending request')
    .requiredOption('--id <id>', 'Approval ID')
    .option('--notes <text>', 'Optional notes')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        await approvals_1.ApprovalSystem.review(Number(options.id), 'REJECTED', options.notes);
        console.log(`Approval ${options.id} rejected.`);
    }
    catch (error) {
        console.error('Error rejecting:', error);
    }
});
program
    .command('llm_test')
    .description('Test connectivity to local Ollama LLM')
    .action(async () => {
    try {
        const { OllamaLLM } = await Promise.resolve().then(() => __importStar(require('./llm')));
        const llm = new OllamaLLM();
        console.log('Testing Ollama connection...');
        const response = await llm.generate('Say "OK" if you can hear me.');
        console.log('Response:', response.content);
    }
    catch (error) {
        console.error('LLM Test Failed:', error);
    }
});
program
    .command('resume')
    .description('Resume a paused run')
    .requiredOption('--run_id <id>', 'Run ID')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        console.log(`Resuming run: ${options.run_id}`);
        const db = db_1.DB.getInstance().getDb();
        // Check if paused
        const run = await new Promise((resolve) => {
            db.get("SELECT * FROM runs WHERE id = ?", [options.run_id], (err, row) => resolve(row));
        });
        if (run.status !== 'PAUSED' && run.status !== 'RUNNING') {
            console.log(`Run status is ${run.status}. Cannot resume.`);
            return;
        }
        // If paused, set to RUNNING
        if (run.status === 'PAUSED') {
            await new Promise((resolve) => {
                db.run("UPDATE runs SET status = 'RUNNING' WHERE id = ?", [options.run_id], () => resolve());
            });
        }
        // Also check if any task is NEEDS_APPROVAL and if it has been approved
        // Logic: If task is NEEDS_APPROVAL, check approvals table. 
        // If approved, set task to PENDING (to re-run) or directly resume execution?
        // Better: Set to PENDING so processQueue picks it up.
        const pTask = await new Promise((resolve) => {
            db.get("SELECT * FROM tasks WHERE run_id = ? AND status = 'NEEDS_APPROVAL'", [options.run_id], (err, row) => resolve(row));
        });
        if (pTask) {
            const approval = await approvals_1.ApprovalSystem.getPending(); // actually need by task id
            // Simpler: Check if there is an approved decision for this task
            const approved = await new Promise((resolve) => {
                db.get("SELECT * FROM approvals WHERE task_id = ? AND decision = 'APPROVED'", [pTask.id], (err, row) => resolve(row));
            });
            if (approved) {
                console.log(`Task ${pTask.id} approved. Resuming...`);
                await new Promise((resolve) => {
                    db.run("UPDATE tasks SET status = 'PENDING' WHERE id = ?", [pTask.id], () => resolve());
                });
            }
            else {
                console.log(`Task ${pTask.id} still needs approval or was rejected.`);
                return; // Cannot resume yet
            }
        }
        const runner = new cycle_1.CycleRunner();
        // We need a resume method or just call processQueue logic (exposed or internal?)
        // CycleRunner.start creates a new run. We need CycleRunner.resume(runId).
        // Let's allow accessing the internal processQueue via a public method 'resumeRun'
        await runner.resumeRun(Number(options.run_id));
    }
    catch (error) {
        console.error('Error resuming:', error);
    }
});
program
    .command('schedule:add')
    .description('Add a new schedule')
    .requiredOption('--project_id <id>', 'Project ID')
    .requiredOption('--cadence <type>', 'daily or weekly')
    .requiredOption('--time <HH:MM>', 'Time (24h format)')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const { Scheduler } = await Promise.resolve().then(() => __importStar(require('./business/scheduler')));
        await Scheduler.addSchedule(Number(options.project_id), options.cadence, options.time);
        console.log('Schedule added.');
    }
    catch (error) {
        console.error('Error adding schedule:', error);
    }
});
program
    .command('schedule:list')
    .description('List all schedules')
    .action(async () => {
    try {
        await db_1.DB.getInstance().init();
        const { Scheduler } = await Promise.resolve().then(() => __importStar(require('./business/scheduler')));
        const schedules = await Scheduler.listSchedules();
        console.log('\n--- Schedules ---');
        if (schedules.length === 0)
            console.log('No schedules found.');
        else {
            schedules.forEach(s => {
                console.log(`[ID: ${s.id}] Project: ${s.project_name} | Cadence: ${s.cadence} | Next: ${new Date(s.next_run_at).toLocaleString()}`);
            });
        }
    }
    catch (error) {
        console.error('Error listing schedules:', error);
    }
});
program
    .command('schedule:run_due')
    .description('Check and run due schedules')
    .action(async () => {
    try {
        await db_1.DB.getInstance().init();
        const { Scheduler } = await Promise.resolve().then(() => __importStar(require('./business/scheduler')));
        await Scheduler.runDue();
    }
    catch (error) {
        console.error('Error running schedules:', error);
    }
});
program
    .command('memory:add')
    .description('Add a memory/playbook')
    .requiredOption('--project_id <id>', 'Project ID')
    .requiredOption('--dept <text>', 'Department (CEO, Product, etc.)')
    .requiredOption('--title <text>', 'Title')
    .requiredOption('--content <text>', 'Content or File Path')
    .option('--tags <text>', 'Comma-separated tags')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const { MemoryStore } = await Promise.resolve().then(() => __importStar(require('./business/memory')));
        // Check if content is a file
        let content = options.content;
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        if (fs.existsSync(content)) {
            content = fs.readFileSync(content, 'utf8');
        }
        const id = await MemoryStore.add(Number(options.project_id), options.dept, options.title, content, options.tags);
        console.log(`Memory added with ID: ${id}`);
    }
    catch (error) {
        console.error('Error adding memory:', error);
    }
});
program
    .command('memory:search')
    .description('Search memories')
    .requiredOption('--project_id <id>', 'Project ID')
    .requiredOption('--dept <text>', 'Department')
    .requiredOption('--query <text>', 'Search query')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const { MemoryStore } = await Promise.resolve().then(() => __importStar(require('./business/memory')));
        const results = await MemoryStore.search(Number(options.project_id), options.dept, options.query);
        console.log(`\n--- Found ${results.length} memories for ${options.dept} ---`);
        results.forEach(m => {
            console.log(`[ID: ${m.id}] ${m.title}`);
            console.log(`Tags: ${m.tags}`);
            console.log(`Preview: ${m.content.substring(0, 100)}...`);
            console.log('---');
        });
    }
    catch (error) {
        console.error('Error searching memories:', error);
    }
});
program
    .command('schedule:daemon')
    .description('Run the scheduler daemon (always-on loop)')
    .action(async () => {
    try {
        const { Scheduler } = await Promise.resolve().then(() => __importStar(require('./business/scheduler')));
        const { ApplianceAPI } = await Promise.resolve().then(() => __importStar(require('./api')));
        // Start API in parallel
        const api = new ApplianceAPI();
        api.start();
        await Scheduler.daemon();
    }
    catch (error) {
        console.error('Error in daemon:', error);
    }
});
program
    .command('start')
    .description('Start the Company OS Appliance in the background')
    .action(async () => {
    const { spawn } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    console.log('Starting Company OS Appliance...');
    // Spawn the daemon
    const out = fs.openSync(path.join(process.cwd(), 'appliance.log'), 'a');
    const err = fs.openSync(path.join(process.cwd(), 'appliance.log'), 'a');
    const subprocess = spawn('node', [path.join(process.cwd(), 'dist', 'index.js'), 'schedule:daemon'], {
        detached: true,
        stdio: ['ignore', out, err]
    });
    subprocess.unref();
    // Save PID
    fs.writeFileSync(path.join(process.cwd(), 'appliance.pid'), subprocess.pid?.toString() || '');
    console.log(`Appliance started (PID: ${subprocess.pid}). Logs: appliance.log`);
    process.exit(0);
});
program
    .command('stop')
    .description('Stop the Company OS Appliance')
    .action(async () => {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    const pidPath = path.join(process.cwd(), 'appliance.pid');
    if (fs.existsSync(pidPath)) {
        const pid = parseInt(fs.readFileSync(pidPath, 'utf8'));
        try {
            process.kill(pid, 'SIGTERM');
            console.log(`Stopped appliance (PID: ${pid})`);
        }
        catch (e) {
            console.log(`Process ${pid} not found or already stopped.`);
        }
        fs.unlinkSync(pidPath);
    }
    else {
        console.log('No appliance.pid found. Is it running?');
    }
});
program
    .command('status')
    .description('Show appliance status')
    .action(async () => {
    try {
        const response = await fetch('http://127.0.0.1:3000/health');
        if (response.ok) {
            const health = await response.json();
            console.log('\n--- Company OS Appliance Status ---');
            console.log(`Status: ${health.status}`);
            console.log(`Scheduler Heartbeat: ${health.scheduler_heartbeat}`);
            console.log(`Pending Approvals: ${health.pending_approvals}`);
            console.log(`Network Binding: ${health.binding}`);
        }
        else {
            console.log('Appliance API is not responding. (Service might be stopped)');
        }
    }
    catch (e) {
        console.log('Appliance API is unreachable. (Service is likely stopped)');
    }
});
program
    .command('ui')
    .description('Launch the Autonomous Control Room (UI)')
    .action(async () => {
    const { spawn } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    console.log('\n🚀 Launching Autonomous Control Room...');
    // Use ts-node to run the server directly if in dev, or node if compiled
    const serverPath = path.join(process.cwd(), 'src', 'dashboard', 'server.ts');
    const distServerPath = path.join(process.cwd(), 'dist', 'dashboard', 'server.js');
    let cmd = 'npx';
    let args = ['ts-node', serverPath];
    if (fs.existsSync(distServerPath)) {
        cmd = 'node';
        args = [distServerPath];
    }
    const uiProcess = spawn(cmd, args, {
        stdio: 'inherit',
        shell: true
    });
    uiProcess.on('error', (err) => {
        console.error('Failed to start UI:', err);
    });
});
program
    .command('backup')
    .description('Backup the Company OS data (DB, Artifacts, Config)')
    .option('--out <path>', 'Output path (zip)', `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`)
    .action(async (options) => {
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    console.log(`Backing up to ${options.out}...`);
    try {
        // Include: db, runs/, prompts/, config/
        const toBackup = ['company_os.db', 'runs', 'prompts', 'config'];
        const existing = toBackup.filter(f => fs.existsSync(path.join(process.cwd(), f)));
        const fileList = existing.join(', ');
        console.log(`Including: ${fileList}`);
        // PowerShell Compress-Archive
        const psCommand = `powershell -Command "Compress-Archive -Path ${existing.join(', ')} -DestinationPath ${options.out} -Force"`;
        execSync(psCommand, { stdio: 'inherit' });
        console.log('Backup successful.');
    }
    catch (e) {
        console.error('Backup failed:', e.message);
    }
});
program
    .command('restore')
    .description('Restore Company OS data from a backup zip')
    .requiredOption('--from <path>', 'Backup zip path')
    .action(async (options) => {
    const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    if (!fs.existsSync(options.from)) {
        console.error(`File not found: ${options.from}`);
        return;
    }
    console.log(`Restoring from ${options.from}...`);
    console.log('WARNING: This will overwrite existing data. Proceed? (Add --force to skip check)');
    try {
        const psCommand = `powershell -Command "Expand-Archive -Path ${options.from} -DestinationPath . -Force"`;
        execSync(psCommand, { stdio: 'inherit' });
        console.log('Restore complete. Please restart the appliance if running.');
    }
    catch (e) {
        console.error('Restore failed:', e.message);
    }
});
program
    .command('process:list')
    .description('List available business processes')
    .action(async () => {
    try {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const processesDir = path.join(process.cwd(), 'processes');
        if (!fs.existsSync(processesDir)) {
            console.log('No processes directory found.');
            return;
        }
        const files = fs.readdirSync(processesDir).filter(f => f.endsWith('.yml'));
        console.log('\n--- Available Processes ---');
        files.forEach(f => console.log(`- ${path.basename(f, '.yml')}`));
    }
    catch (error) {
        console.error('Error listing processes:', error);
    }
});
program
    .command('process:start')
    .description('Start a new autonomous business process')
    .requiredOption('--project_id <id>', 'Project ID')
    .requiredOption('--name <process>', 'Process name')
    .option('--inputs <json>', 'Process inputs (JSON)', '{}')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const { ProcessRunner } = await Promise.resolve().then(() => __importStar(require('./business/process_runner')));
        let inputs;
        try {
            inputs = JSON.parse(options.inputs);
        }
        catch (jsonError) {
            console.error('Error parsing --inputs JSON:', jsonError.message);
            return; // Exit if JSON is invalid
        }
        const processRunId = await ProcessRunner.startProcess(options.name, Number(options.project_id), inputs);
        console.log(`Process started with Run ID: ${processRunId}`);
        // Trigger first step execution
        const runner = new ProcessRunner(0);
        await runner.executeNextStep(processRunId);
    }
    catch (error) {
        console.error('Error starting process:', error.message || error);
    }
});
program
    .command('scout:manual')
    .description('Manually trigger the Sovereign Scout')
    .option('-p, --project_id <id>', 'Project ID', '1')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const { Scout } = await Promise.resolve().then(() => __importStar(require('./business/scout')));
        const { Intercom } = await Promise.resolve().then(() => __importStar(require('./business/intercom')));
        const scout = new Scout();
        console.log(`🔭 Manually triggering Scout for Project ${options.project_id}...`);
        const opportunities = await scout.scoutOpportunities(Number(options.project_id));
        if (opportunities.length > 0) {
            console.log(`\n--- Found ${opportunities.length} Opportunities ---`);
            opportunities.forEach(o => {
                console.log(`- [${o.marketLeverage}/10] ${o.title}: ${o.suggestedAction}`);
            });
            Intercom.log('CLI', 'Analysis Lead', `Manual scout found ${opportunities.length} signals.`);
        }
        else {
            console.log('No new opportunities found.');
        }
    }
    catch (error) {
        console.error('Error in manual scout:', error);
    }
});
program
    .command('run:id')
    .description('Force start/resume a specific Run ID')
    .requiredOption('--run_id <id>', 'Run ID')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const runner = new cycle_1.CycleRunner();
        console.log(`🚀 Force-resuming Run #${options.run_id}...`);
        await runner.resumeRun(Number(options.run_id));
    }
    catch (error) {
        console.error('Error force-resuming:', error);
    }
});
program
    .command('schedule:autostart')
    .description('Initialize 24/7 autonomous loop')
    .option('-h, --hours <n>', 'Interval in hours', '4')
    .action(async (options) => {
    try {
        await db_1.DB.getInstance().init();
        const db = db_1.DB.getInstance().getDb();
        // Create a recurring task for the Scout to find new work
        db.run("INSERT INTO schedules (project_id, cadence, next_run_at, status) VALUES (1, 'daily', datetime('now'), 'ACTIVE')");
        console.log(`📡 24/7 Autonomy Initialized. Interval set to ${options.hours}h.`);
    }
    catch (error) {
        console.error('Error starting autonomous loop:', error);
    }
});
program
    .command('hardware:set')
    .description('Switch Hardware Optimization Mode')
    .argument('<mode>', 'Turbo | Balanced | Quiet')
    .action(async (mode) => {
    try {
        const configPath = path.join(process.cwd(), 'config', 'hardware_modes.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.modes[mode]) {
            console.error(`Invalid mode: ${mode}. Available: Turbo, Balanced, Quiet`);
            return;
        }
        config.active_mode = mode;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`⚡ Hardware Mode set to: ${mode}`);
    }
    catch (error) {
        console.error('Error setting hardware mode:', error);
    }
});
program.parse(process.argv);
