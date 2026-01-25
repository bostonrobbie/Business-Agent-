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
exports.ApplianceAPI = void 0;
const http = __importStar(require("http"));
const db_1 = require("./db");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ApplianceAPI {
    server;
    port = 3000;
    constructor() {
        this.server = http.createServer(async (req, res) => {
            if (req.url === '/health' && req.method === 'GET') {
                await this.handleHealth(req, res);
            }
            else {
                res.writeHead(404);
                res.end();
            }
        });
    }
    async handleHealth(req, res) {
        try {
            await db_1.DB.getInstance().init();
            const db = db_1.DB.getInstance().getDb();
            // Check pending approvals
            const pending = await new Promise((resolve) => {
                db.get("SELECT count(*) as c FROM approvals WHERE decision = 'PENDING'", (err, row) => resolve(row ? row.c : 0));
            });
            // Check heartbeat
            let heartbeat = 'UNKNOWN';
            const hbPath = path.join(process.cwd(), 'daemon_heartbeat.json');
            if (fs.existsSync(hbPath)) {
                const data = JSON.parse(fs.readFileSync(hbPath, 'utf8'));
                heartbeat = data.last_tick;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'UP',
                db: 'OK',
                pending_approvals: pending,
                scheduler_heartbeat: heartbeat,
                binding: '127.0.0.1'
            }));
        }
        catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ status: 'DOWN', error: e.message }));
        }
    }
    start() {
        this.server.listen(this.port, '127.0.0.1', () => {
            console.log(`[API] Appliance Health API running at http://127.0.0.1:${this.port}/health`);
        });
    }
    stop() {
        this.server.close();
    }
}
exports.ApplianceAPI = ApplianceAPI;
