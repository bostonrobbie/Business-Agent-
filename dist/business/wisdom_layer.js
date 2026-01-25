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
exports.WisdomLayer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../db");
class WisdomLayer {
    static async synthesizeHistory(projectId, limit = 5) {
        const db = db_1.DB.getInstance().getDb();
        // Find last N completed process runs
        const runs = await new Promise((resolve) => {
            db.all("SELECT id FROM process_runs WHERE project_id = ? AND status = 'COMPLETED' ORDER BY id DESC LIMIT ?", [projectId, limit], (err, rows) => resolve(rows || []));
        });
        if (runs.length === 0)
            return "No prior history available.";
        let synthesis = "Historical Patterns and Lessons Learned:\n\n";
        for (const run of runs) {
            const processDir = path.join(process.cwd(), 'runs', `process_${run.id}`);
            const reportPath = path.join(processDir, 'PROCESS_REPORT.md');
            if (fs.existsSync(reportPath)) {
                const content = fs.readFileSync(reportPath, 'utf8');
                // Extract summary or results
                synthesis += `--- Run #${run.id} ---\n`;
                synthesis += content.substring(0, 500) + "...\n";
            }
        }
        return synthesis;
    }
    static applyLoveEquation(actions) {
        // Roemmele's Love Equation in this context: Empathy for the Owner's Time
        // Friction = Time * Complexity
        // We prioritize low friction, high ROI
        return actions.map(a => {
            const time = parseInt(a.estimated_time) || 30;
            const complexity = a.complexity || 5;
            const friction = time * complexity;
            return { ...a, friction_score: friction };
        }).sort((a, b) => a.friction_score - b.friction_score);
    }
}
exports.WisdomLayer = WisdomLayer;
