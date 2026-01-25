
import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { DB } from '../db';

const app = express();
const PORT = 3030;

app.use(cors());
app.use(express.json());

// Serve static dashboard files
app.use(express.static(path.join(__dirname, '../../src/dashboard')));

// --- DIAGNOSTICS & QA LAYER ---

// 0. System Health Check
app.get('/api/health', async (req, res) => {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        status: 'HEALTHY',
        checks: {}
    };

    // Check Database
    try {
        const db = DB.getInstance().getDb();
        await new Promise((resolve, reject) => {
            db.get("SELECT 1", (err) => err ? reject(err) : resolve(true));
        });
        diagnostics.checks.database = 'CONNECTED';
    } catch (e) {
        diagnostics.status = 'DEGRADED';
        diagnostics.checks.database = 'DISCONNECTED';
    }

    // Check Directories
    const requiredDirs = ['logs', 'runs', 'prompts', 'processes'];
    diagnostics.checks.directories = {};
    requiredDirs.forEach(dir => {
        diagnostics.checks.directories[dir] = fs.existsSync(path.join(process.cwd(), dir)) ? 'EXISTS' : 'MISSING';
    });

    // Check Logs Activity
    const intercomPath = path.join(process.cwd(), 'logs', 'INTERCOM.log');
    if (fs.existsSync(intercomPath)) {
        const stats = fs.statSync(intercomPath);
        diagnostics.checks.last_activity = stats.mtime;
    } else {
        diagnostics.checks.last_activity = 'NO_LOGS_YET';
    }

    res.json(diagnostics);
});

// 1. Get Company Stats
app.get('/api/stats', async (req, res) => {
    const db = DB.getInstance().getDb();
    const stats: any = {};

    try {
        stats.total_runs = await new Promise((resolve) => db.get("SELECT COUNT(*) as c FROM runs", (err, row: any) => resolve(row ? row.c : 0)));
        stats.active_runs = await new Promise((resolve) => db.get("SELECT COUNT(*) as c FROM runs WHERE status = 'RUNNING'", (err, row: any) => resolve(row ? row.c : 0)));
        stats.total_tasks = await new Promise((resolve) => db.get("SELECT COUNT(*) as c FROM tasks", (err, row: any) => resolve(row ? row.c : 0)));
        stats.total_kpis = await new Promise((resolve) => db.get("SELECT COUNT(*) as c FROM kpis", (err, row: any) => resolve(row ? row.c : 0)));

        // Latest KPI Stream
        stats.latest_kpis = await new Promise((resolve) => db.all("SELECT * FROM kpis ORDER BY created_at DESC LIMIT 5", (err, rows) => resolve(rows || [])));

        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// 2. Get Intercom Logs (Peer-to-Peer Chat)
app.get('/api/intercom', (req, res) => {
    const logPath = path.join(process.cwd(), 'logs', 'INTERCOM.log');
    if (!fs.existsSync(logPath)) return res.json({ logs: [] });

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n').reverse().slice(0, 50); // Last 50 entries
    res.json({ logs: lines });
});

// 3. Get Thought Stream (Inner Monologue)
app.get('/api/thoughts', (req, res) => {
    const logPath = path.join(process.cwd(), 'logs', 'THOUGHTS_STREAM.log');
    if (!fs.existsSync(logPath)) return res.json({ thoughts: [] });

    const content = fs.readFileSync(logPath, 'utf8');
    const sections = content.trim().split('---\n').reverse().slice(0, 20); // Last 20 thoughts
    res.json({ thoughts: sections });
});

// 4. Get Current Active Work
app.get('/api/active-tasks', (req, res) => {
    const db = DB.getInstance().getDb();
    db.all("SELECT * FROM tasks WHERE status = 'RUNNING' ORDER BY updated_at DESC", (err, rows) => {
        res.json({ tasks: rows || [] });
    });
});

// 5. Get Business Reports (Artifacts)
app.get('/api/reports', (req, res) => {
    const db = DB.getInstance().getDb();
    db.all(`
        SELECT a.*, r.objective 
        FROM artifacts a 
        JOIN runs r ON a.run_id = r.id 
        ORDER BY a.created_at DESC 
        LIMIT 20
    `, (err, rows) => {
        res.json({ reports: rows || [] });
    });
});

// 6. Get Global Timeline
app.get('/api/timeline', (req, res) => {
    const intercomPath = path.join(process.cwd(), 'logs', 'INTERCOM.log');
    const thoughtPath = path.join(process.cwd(), 'logs', 'THOUGHTS_STREAM.log');

    let events: any[] = [];

    if (fs.existsSync(intercomPath)) {
        const lines = fs.readFileSync(intercomPath, 'utf8').trim().split('\n');
        events = events.concat(lines.map(l => ({ type: 'INTERCOM', content: l })));
    }

    if (fs.existsSync(thoughtPath)) {
        const sections = fs.readFileSync(thoughtPath, 'utf8').trim().split('---\n');
        events = events.concat(sections.map(s => ({ type: 'THOUGHT', content: s })));
    }

    const timeline = events.reverse().slice(0, 200);
    res.json({ timeline });
});

// 7. Get Red Team Audits (v8)
app.get('/api/audits', (req, res) => {
    // For now, we extract "Red Team" messages from INTERCOM.log
    const logPath = path.join(process.cwd(), 'logs', 'INTERCOM.log');
    if (!fs.existsSync(logPath)) return res.json({ audits: [] });

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n');
    const audits = lines
        .filter(l => l.includes('🔴 Red Team') || l.includes('🛠 Starting Self-Correction'))
        .reverse()
        .slice(0, 20);

    res.json({ audits });
});

// 8. Hardware Modes (v8.5)
app.get('/api/hardware/status', (req, res) => {
    try {
        const configPath = path.join(process.cwd(), 'config', 'hardware_modes.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.json({
            active: config.active_mode,
            options: Object.keys(config.modes),
            details: config.modes[config.active_mode]
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to load hardware config' });
    }
});

app.post('/api/hardware/mode', (req, res) => {
    const { mode } = req.body;
    try {
        const configPath = path.join(process.cwd(), 'config', 'hardware_modes.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.modes[mode]) return res.status(400).json({ error: 'Invalid mode' });

        config.active_mode = mode;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        res.json({ success: true, mode });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update hardware mode' });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 [CONTROL ROOM READY]`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Status: Operational`);
});
