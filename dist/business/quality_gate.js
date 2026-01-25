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
exports.QualityGate = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class QualityGate {
    static validate(runDir, gate) {
        const targetPath = path.join(runDir, gate.target);
        if (!fs.existsSync(targetPath)) {
            return { success: false, error: `Artifact missing: ${gate.target}` };
        }
        const content = fs.readFileSync(targetPath, 'utf8');
        if (gate.type === 'MARKDOWN_SECTION') {
            const missing = [];
            for (const section of gate.sections) {
                // Heuristic: Check for # Section, ## Section, or **Section:**
                const pattern = new RegExp(`(^#+.*${section}|\\*\\*${section}:?\\*\\*)`, 'mi');
                if (!pattern.test(content)) {
                    missing.push(section);
                }
            }
            if (missing.length > 0) {
                return { success: false, error: `MD Sections missing in ${gate.target}: ${missing.join(', ')}` };
            }
        }
        if (gate.type === 'CSV_COLUMNS') {
            const header = content.split('\n')[0].toLowerCase();
            const missing = [];
            for (const col of gate.columns) {
                if (!header.includes(col.toLowerCase())) {
                    missing.push(col);
                }
            }
            if (missing.length > 0) {
                return { success: false, error: `CSV Columns missing in ${gate.target}: ${missing.join(', ')}` };
            }
        }
        if (gate.type === 'CSV_MIN_ROWS') {
            const rows = content.trim().split('\n').filter(l => l.length > 0);
            const count = rows.length - 1; // Exclude header
            if (count < gate.min) {
                return { success: false, error: `CSV ${gate.target} has only ${count} rows, expected at least ${gate.min}` };
            }
        }
        return { success: true };
    }
}
exports.QualityGate = QualityGate;
