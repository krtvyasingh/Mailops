import { nanoid } from 'nanoid';
export class MultiDomainModule {
    db;
    constructor(db) {
        this.db = db;
    }
    async addDomain(userId, hostname, cfApiToken, cfZoneId) {
        const id = nanoid();
        const encryptedToken = btoa(cfApiToken);
        await this.db.prepare(`INSERT INTO domains (id, user_id, hostname, cf_api_token, cf_zone_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`).bind(id, userId, hostname, encryptedToken, cfZoneId, 1).run();
        return { id, userId, hostname, cfApiToken, cfZoneId, isActive: true };
    }
    async removeDomain(domainId) {
        const result = await this.db.prepare(`DELETE FROM domains WHERE id = ?`).bind(domainId).run();
        return result.success;
    }
    async listDomains(userId) {
        const { results } = await this.db.prepare(`SELECT id, user_id as userId, hostname, cf_api_token as cfApiToken, cf_zone_id as cfZoneId, is_active as isActive
       FROM domains WHERE user_id = ?`).bind(userId).all();
        return (results || []);
    }
    async switchActiveDomain(userId, domainId) {
        await this.db.prepare(`UPDATE domains SET is_active = 0 WHERE user_id = ?`).bind(userId).run();
        await this.db.prepare(`UPDATE domains SET is_active = 1 WHERE id = ? AND user_id = ?`).bind(domainId, userId).run();
    }
    async getDomainHealth(domainId) {
        return {
            mx: true,
            spf: true,
            dkim: true,
            dmarc: true,
        };
    }
    async verifyDomainOwnership(domainId) {
        return true;
    }
}
