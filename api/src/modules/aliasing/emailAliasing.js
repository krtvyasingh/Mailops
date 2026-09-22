import { nanoid } from 'nanoid';
export class EmailAliasingModule {
    db;
    constructor(db) {
        this.db = db;
    }
    async createAlias(domainId, aliasName, targetEmail) {
        if (!this.isValidAlias(aliasName) && aliasName !== '*') {
            throw new Error('Invalid alias name');
        }
        const isCatchAll = aliasName === '*';
        const id = nanoid();
        const createdAt = Date.now();
        await this.db.prepare(`INSERT INTO email_aliases (id, domain_id, alias_name, target_email, is_catch_all, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`).bind(id, domainId, aliasName, targetEmail, isCatchAll ? 1 : 0, createdAt).run();
        return { id, domainId, aliasName, targetEmail, isCatchAll, createdAt };
    }
    async resolveAlias(domainId, aliasName) {
        const row = await this.db.prepare(`SELECT target_email FROM email_aliases WHERE domain_id = ? AND alias_name = ?`).bind(domainId, aliasName).first();
        if (row)
            return row.target_email;
        // Check catch-all
        const catchAllRow = await this.db.prepare(`SELECT target_email FROM email_aliases WHERE domain_id = ? AND is_catch_all = 1 LIMIT 1`).bind(domainId).first();
        return catchAllRow ? catchAllRow.target_email : null;
    }
    async listAliases(domainId) {
        const { results } = await this.db.prepare(`SELECT id, domain_id as domainId, alias_name as aliasName, target_email as targetEmail, 
       is_catch_all as isCatchAll, created_at as createdAt 
       FROM email_aliases WHERE domain_id = ?`).bind(domainId).all();
        return results || [];
    }
    async deleteAlias(id) {
        const result = await this.db.prepare(`DELETE FROM email_aliases WHERE id = ?`).bind(id).run();
        return result.success;
    }
    async generateRandomAlias(domainId, targetEmail) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let alias = '';
        for (let i = 0; i < 8; i++) {
            alias += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return this.createAlias(domainId, alias, targetEmail);
    }
    isValidAlias(aliasName) {
        if (aliasName.length > 50)
            return false;
        return /^[a-zA-Z0-9.\-_+]+$/.test(aliasName);
    }
}
