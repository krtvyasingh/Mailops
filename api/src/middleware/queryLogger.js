export class LoggedDB {
    db;
    constructor(db) {
        this.db = db;
    }
    prepare(query) {
        const stmt = this.db.prepare(query);
        return {
            bind: (...params) => {
                const bound = stmt.bind(...params);
                return this.wrapStmt(bound, query);
            },
            ...this.wrapStmt(stmt, query)
        };
    }
    wrapStmt(stmt, query) {
        return {
            all: async () => this.measure(query, () => stmt.all()),
            run: async () => this.measure(query, () => stmt.run()),
            first: async () => this.measure(query, () => stmt.first())
        };
    }
    async measure(query, fn) {
        const start = Date.now();
        try {
            return await fn();
        }
        finally {
            const duration = Date.now() - start;
            if (duration > 100) {
                console.warn(`[SLOW QUERY] ${duration}ms: ${query}`);
                // Optionally run EXPLAIN here if supported by DB
            }
        }
    }
}
