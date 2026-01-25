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
exports.Jail = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class Jail {
    static policies;
    static loadPolicies() {
        if (!this.policies) {
            const configPath = path.join(process.cwd(), 'config', 'policies.json');
            if (fs.existsSync(configPath)) {
                this.policies = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            else {
                // Fallback defaults
                this.policies = {
                    allowed_paths: [process.cwd()]
                };
            }
        }
        return this.policies;
    }
    static isPathAllowed(targetPath) {
        const policies = this.loadPolicies();
        const absoluteTarget = path.resolve(targetPath);
        return policies.allowed_paths.some((allowed) => {
            const absoluteAllowed = path.resolve(allowed);
            return absoluteTarget.startsWith(absoluteAllowed);
        });
    }
    static validatePath(targetPath) {
        if (!this.isPathAllowed(targetPath)) {
            throw new Error(`JAIL BREAK DETECTED: Path outside workspace: ${targetPath}`);
        }
    }
}
exports.Jail = Jail;
