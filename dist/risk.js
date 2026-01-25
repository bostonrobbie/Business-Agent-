"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskEngine = void 0;
class RiskEngine {
    static evaluate(action) {
        switch (action.type) {
            case 'FILE_WRITE':
                // Safe to write files within the repo/workspace
                return 'SAFE';
            case 'COMMAND':
                // Analyzing the command payload
                const cmd = (action.payload.command || '').toLowerCase();
                // Allowed innocent commands
                if (['ls', 'dir', 'echo', 'mkdir', 'cd', 'pwd', 'git status', 'git add', 'git commit'].some(safe => cmd.startsWith(safe))) {
                    return 'SAFE';
                }
                // Install commands are REVIEW
                if (cmd.includes('npm install') || cmd.includes('pip install')) {
                    return 'REVIEW';
                }
                // Any other command is REVIEW by default to be safe
                return 'REVIEW';
            case 'NETWORK':
                // All network calls are REVIEW unless whitelisted (none for now)
                return 'REVIEW';
            case 'SPEND':
            case 'MESSAGE':
            case 'TRADING':
                // Strictly BLOCKED
                return 'BLOCKED';
            default:
                // Unknown actions are REVIEW
                return 'REVIEW';
        }
    }
}
exports.RiskEngine = RiskEngine;
