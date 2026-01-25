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
exports.RiskEngine = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class RiskEngine {
    static policies;
    static loadPolicies() {
        if (!this.policies) {
            const configPath = path.join(process.cwd(), 'config', 'policies.json');
            if (fs.existsSync(configPath)) {
                this.policies = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            else {
                this.policies = { safe_command_patterns: [] };
            }
        }
        return this.policies;
    }
    static evaluate(action) {
        const policies = this.loadPolicies();
        switch (action.type) {
            case 'FILE_WRITE':
                // Jail handled separately in CycleRunner for granular control
                return 'SAFE';
            case 'COMMAND':
                const cmd = (action.payload.command || '').trim();
                // 1. Explicitly Blocked
                if (policies.blocked_commands && policies.blocked_commands.some((p) => cmd.includes(p))) {
                    return 'BLOCKED';
                }
                // 2. Safe Allowlist (Regex based)
                if (policies.safe_command_patterns && policies.safe_command_patterns.some((pattern) => new RegExp(pattern).test(cmd))) {
                    return 'SAFE';
                }
                // 3. Known Risky
                if (cmd.includes('npm install') || cmd.includes('pip install') || cmd.includes('npm i ')) {
                    return 'REVIEW';
                }
                // Default to REVIEW
                return 'REVIEW';
            case 'NETWORK':
                return 'REVIEW';
            case 'SPEND':
            case 'MESSAGE':
            case 'TRADING':
                return 'BLOCKED';
            default:
                return 'REVIEW';
        }
    }
}
exports.RiskEngine = RiskEngine;
