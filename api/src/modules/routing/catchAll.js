import { nanoid } from 'nanoid';
export class CatchAllModule {
    db;
    constructor(db) {
        this.db = db;
    }
    async configureCatchAll(domainId, targetFolder, isEnabled) {
        await this.db.prepare(`INSERT INTO catchall_config (domain_id, target_folder, is_enabled)
       VALUES (?, ?, ?)
       ON CONFLICT(domain_id) DO UPDATE SET target_folder=excluded.target_folder, is_enabled=excluded.is_enabled`).bind(domainId, targetFolder, isEnabled ? 1 : 0).run();
        return { domainId, targetFolder, isEnabled };
    }
    async getCatchAllConfig(domainId) {
        const row = await this.db.prepare(`SELECT domain_id as domainId, target_folder as targetFolder, is_enabled as isEnabled
       FROM catchall_config WHERE domain_id = ?`).bind(domainId).first();
        if (!row)
            return null;
        return { ...row, isEnabled: Boolean(row.isEnabled) };
    }
    async routeInboundEmail(toAddress, domainId, aliasResolver) {
        const localPart = toAddress.split('@')[0];
        // 1. Exact match
        const exact = await aliasResolver(domainId, localPart);
        if (exact)
            return { route: exact, type: 'exact' };
        // 2. Plus addressing
        if (localPart.includes('+')) {
            const base = localPart.split('+')[0];
            const plusBase = await aliasResolver(domainId, base);
            if (plusBase)
                return { route: plusBase, type: 'plus' };
        }
        // 3. Catch-all
        const config = await this.getCatchAllConfig(domainId);
        if (config && config.isEnabled) {
            this.logCatchAllCapture(domainId, toAddress);
            return { route: config.targetFolder, type: 'catchall' };
        }
        return { route: 'reject', type: 'reject' };
    }
    async logCatchAllCapture(domainId, toAddress) {
        const id = nanoid();
        await this.db.prepare(`INSERT INTO catchall_logs (id, domain_id, captured_address, captured_at) VALUES (?, ?, ?, ?)`).bind(id, domainId, toAddress, Date.now()).run();
    }
}
