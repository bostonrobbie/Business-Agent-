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
exports.DataIngestor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jail_1 = require("./jail");
const logger_1 = require("../logger");
class DataIngestor {
    logger;
    constructor() {
        this.logger = new logger_1.Logger();
    }
    async ingestDirectory(targetPath) {
        jail_1.Jail.validatePath(targetPath);
        const files = fs.readdirSync(targetPath);
        const report = {
            total_files: files.length,
            conversations_summary: [],
            documents: []
        };
        // 1. Process conversations.json
        const convoPath = path.join(targetPath, 'conversations.json');
        if (fs.existsSync(convoPath)) {
            console.log('[INGESTION] Processing conversations.json (this may take a moment)...');
            try {
                const raw = fs.readFileSync(convoPath, 'utf8');
                const convos = JSON.parse(raw);
                console.log(`[INGESTION] Loaded ${convos.length} conversations.`);
                // Extract top 20 most recent
                report.conversations_summary = convos
                    .slice(0, 50) // Take top 50
                    .map((c) => ({
                    title: c.title,
                    create_time: c.create_time ? new Date(c.create_time * 1000).toISOString() : 'Unknown',
                    // Extract first msg or system prompt if possible? usually structure is complex.
                    // Simplified: just title for now to save tokens.
                }));
            }
            catch (e) {
                console.error('[INGESTION] Failed to parse conversations.json', e.message);
            }
        }
        // 2. List PDF/MD Documents
        report.documents = files.filter(f => f.endsWith('.pdf') || f.endsWith('.md'));
        // Generate Summary Markdown
        let md = `# Proprietary Data Ingestion Report\n\n`;
        md += `**Source**: ${targetPath}\n`;
        md += `**Total Files**: ${files.length}\n\n`;
        md += `## Key Documents (PDF/MD)\n`;
        report.documents.forEach(d => md += `- ${d}\n`);
        md += `\n## Recent Chat History (Top 50)\n`;
        report.conversations_summary.forEach(c => {
            md += `- **${c.title}** (${c.create_time})\n`;
        });
        return md;
    }
}
exports.DataIngestor = DataIngestor;
