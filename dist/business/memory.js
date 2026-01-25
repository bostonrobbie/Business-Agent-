"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const db_1 = require("../db");
class MemoryStore {
    static async add(projectId, dept, title, content, tags = '', timelineIndex = 0) {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO memories (project_id, dept, title, content, tags, timeline_index, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");
            stmt.run(projectId, dept, title, content, tags, timelineIndex, function (err) {
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
            const likeQuery = `%${query}%`;
            db.all(`
        SELECT * FROM memories 
        WHERE project_id = ? 
        AND (dept = ? OR dept = 'system')
        AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
        ORDER BY timeline_index DESC, created_at DESC
        LIMIT 5
      `, [projectId, dept, likeQuery, likeQuery, likeQuery], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    static async getTimeline(projectId, limit = 20) {
        const db = db_1.DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            db.all(`
        SELECT * FROM memories 
        WHERE project_id = ? 
        ORDER BY timeline_index ASC, created_at ASC
        LIMIT ?
      `, [projectId, limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
}
exports.MemoryStore = MemoryStore;
