
import { DB } from '../db';

export class MemoryStore {
    public static async add(projectId: number, dept: string, title: string, content: string, tags: string = '', timelineIndex: number = 0) {
        const db = DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO memories (project_id, dept, title, content, tags, timeline_index, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");
            stmt.run(projectId, dept, title, content, tags, timelineIndex, function (this: any, err: Error) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            stmt.finalize();
        });
    }

    public static async search(projectId: number, dept: string, query: string): Promise<any[]> {
        const db = DB.getInstance().getDb();
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
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    public static async getTimeline(projectId: number, limit: number = 20): Promise<any[]> {
        const db = DB.getInstance().getDb();
        return new Promise((resolve, reject) => {
            db.all(`
        SELECT * FROM memories 
        WHERE project_id = ? 
        ORDER BY timeline_index ASC, created_at ASC
        LIMIT ?
      `, [projectId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}
