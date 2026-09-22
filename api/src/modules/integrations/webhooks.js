import { nanoid } from 'nanoid';
export class WebhookModule {
    db;
    constructor(db) {
        this.db = db;
    }
    async registerWebhook(domainId, url, events, secret) {
        const id = nanoid();
        const eventsStr = JSON.stringify(events);
        await this.db.prepare(`INSERT INTO webhooks (id, domain_id, url, events, secret, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`).bind(id, domainId, url, eventsStr, secret || null, Date.now()).run();
        return { id, domainId, url, events, secret };
    }
    async listWebhooks(domainId) {
        const { results } = await this.db.prepare(`SELECT id, domain_id as domainId, url, events, secret FROM webhooks WHERE domain_id = ?`).bind(domainId).all();
        return results.map((r) => ({
            ...r,
            events: JSON.parse(r.events)
        }));
    }
    async deleteWebhook(id) {
        const result = await this.db.prepare(`DELETE FROM webhooks WHERE id = ?`).bind(id).run();
        return result.success;
    }
    async verifyWebhookSignature(payload, signature, secret) {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
        const sigBuf = new Uint8Array(signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        return await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(payload));
    }
    async fireWebhook(webhook, event, payload) {
        if (!webhook.events.includes(event))
            return false;
        const body = JSON.stringify({ event, payload, timestamp: Date.now() });
        let signature = '';
        if (webhook.secret) {
            const enc = new TextEncoder();
            const key = await crypto.subtle.importKey('raw', enc.encode(webhook.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(body));
            signature = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        const headers = { 'Content-Type': 'application/json' };
        if (signature)
            headers['X-Mailops-Signature'] = signature;
        let attempts = 0;
        while (attempts < 3) {
            try {
                const resp = await fetch(webhook.url, { method: 'POST', body, headers });
                if (resp.ok)
                    return true;
            }
            catch (e) {
                // failed
            }
            attempts++;
            await new Promise(r => setTimeout(r, Math.pow(2, attempts) * 1000));
        }
        return false;
    }
}
