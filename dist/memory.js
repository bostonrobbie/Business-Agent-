"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const db_1 = require("./db");
class MemoryStore {
    static async add(projectId, dept, title, content, tags = '') {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO memories (project_id, dept, title, content, tags, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))");
            stmt.run(projectId, dept, title, content, tags, function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this.lastID);
            });
            stmt.finalize();
        });
    }
    static async search(projectId, dept, query) {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            // Simple LIKE query for v1 of Memory
            const likeQuery = `%${query}%`;
            db.all(`
        SELECT * FROM memories 
        WHERE project_id = ? 
        AND dept = ? 
        AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
        ORDER BY created_at DESC
        LIMIT 5
      `, [projectId, dept, likeQuery, likeQuery, likeQuery], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
}
exports.MemoryStore = MemoryStore;
