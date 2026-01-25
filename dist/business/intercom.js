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
exports.Intercom = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Intercom {
    static logFile = path.join(process.cwd(), 'logs', 'INTERCOM.log');
    static log(from, to, message, meta) {
        const ts = new Date().toISOString();
        const logEntry = `[${ts}] [${from} -> ${to}] ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
        if (!fs.existsSync(path.dirname(this.logFile))) {
            fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
        }
        fs.appendFileSync(this.logFile, logEntry);
        console.log(`[INTERCOM] ${from} -> ${to}: ${message.substring(0, 100)}...`);
    }
    static logThought(agent, thought) {
        const ts = new Date().toISOString();
        const thoughtFile = path.join(process.cwd(), 'logs', 'THOUGHTS_STREAM.log');
        const logEntry = `[${ts}] [${agent}] THOUGHT: ${thought}\n---\n`;
        if (!fs.existsSync(path.dirname(thoughtFile))) {
            fs.mkdirSync(path.dirname(thoughtFile), { recursive: true });
        }
        fs.appendFileSync(thoughtFile, logEntry);
    }
}
exports.Intercom = Intercom;
