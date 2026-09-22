import { nanoid } from 'nanoid';
export class AddressBookModule {
    db;
    constructor(db) {
        this.db = db;
    }
    async addContact(email, name, company, notes) {
        const id = nanoid();
        const now = Date.now();
        await this.db.prepare(`INSERT INTO contacts (id, email, name, company, notes, interaction_count, last_contact_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, email, name || null, company || null, notes || null, 1, now).run();
        return { id, email, name, company, notes, interactionCount: 1, lastContactAt: now };
    }
    async searchContacts(query, limit = 10) {
        const likeQuery = `%${query}%`;
        const { results } = await this.db.prepare(`SELECT * FROM contacts 
       WHERE email LIKE ? OR name LIKE ? OR company LIKE ?
       ORDER BY (interaction_count * last_contact_at) DESC
       LIMIT ?`).bind(likeQuery, likeQuery, likeQuery, limit).all();
        return this.mapRows(results);
    }
    async autoLearnContact(email, name) {
        await this.db.prepare(`INSERT INTO contacts (id, email, name, interaction_count, last_contact_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(email) DO UPDATE SET 
         interaction_count = interaction_count + 1,
         last_contact_at = ?,
         name = COALESCE(excluded.name, name)`).bind(nanoid(), email, name || null, Date.now(), Date.now()).run();
    }
    async getContactSuggestions(partialInput) {
        // Prefix match
        const likeQuery = `${partialInput}%`;
        const { results } = await this.db.prepare(`SELECT * FROM contacts 
       WHERE email LIKE ? OR name LIKE ?
       ORDER BY (interaction_count * last_contact_at) DESC
       LIMIT 5`).bind(likeQuery, likeQuery).all();
        return this.mapRows(results);
    }
    async getContactProfile(email) {
        const row = await this.db.prepare(`SELECT * FROM contacts WHERE email = ?`).bind(email).first();
        return row ? this.mapRow(row) : null;
    }
    async mergeContacts(primaryId, duplicateId) {
        // Merge stats
        await this.db.prepare(`UPDATE contacts 
       SET interaction_count = interaction_count + (SELECT interaction_count FROM contacts WHERE id = ?),
           last_contact_at = MAX(last_contact_at, (SELECT last_contact_at FROM contacts WHERE id = ?))
       WHERE id = ?`).bind(duplicateId, duplicateId, primaryId).run();
        // Delete duplicate
        const res = await this.db.prepare(`DELETE FROM contacts WHERE id = ?`).bind(duplicateId).run();
        return res.success;
    }
    mapRows(rows) {
        return rows.map(r => this.mapRow(r));
    }
    mapRow(r) {
        return {
            id: r.id,
            email: r.email,
            name: r.name,
            company: r.company,
            notes: r.notes,
            interactionCount: r.interaction_count,
            lastContactAt: r.last_contact_at
        };
    }
}
