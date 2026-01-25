"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalSystem = void 0;
const db_1 = require("./db");
// Add ValidatedApproval to types.ts first or define inline? 
// I'll assume I update types.ts later or just use what I have.
// Wait, I didn't verify ValidatedApproval in types.ts. It's not there.
// I'll stick to the table structure 'approvals'.
class ApprovalSystem {
    static async createRequest(taskId, notes) {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
        INSERT INTO approvals (task_id, requested_at, decision, notes)
        VALUES (?, datetime('now'), 'PENDING', ?)
      `);
            stmt.run(taskId, notes, function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
            stmt.finalize();
        });
    }
    static async checkStatus(approvalId) {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            db.get('SELECT decision FROM approvals WHERE id = ?', [approvalId], (err, row) => {
                if (err)
                    reject(err);
                else if (!row)
                    reject(new Error('Approval not found'));
                else
                    resolve(row.decision);
            });
        });
    }
    static async review(approvalId, decision, notes) {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            db.run(`
        UPDATE approvals 
        SET decision = ?, approved_at = datetime('now'), notes = COALESCE(?, notes)
        WHERE id = ?
      `, [decision, notes, approvalId], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    static async isApproved(taskId) {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            db.get("SELECT id FROM approvals WHERE task_id = ? AND decision = 'APPROVED'", [taskId], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(!!row);
            });
        });
    }
    static async getPending() {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            db.all(`
        SELECT a.id, a.task_id, a.requested_at, a.notes, t.title 
        FROM approvals a
        JOIN tasks t ON a.task_id = t.id
        WHERE a.decision = 'PENDING'
      `, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
}
exports.ApprovalSystem = ApprovalSystem;
