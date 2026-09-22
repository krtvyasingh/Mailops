export class SLATimerService {
    configs = new Map();
    setSLA(inboxId, hours) {
        this.configs.set(inboxId, { inboxId, targetHours: hours });
    }
    checkSLABreaches(inboxId, openConversations) {
        const config = this.configs.get(inboxId);
        if (!config)
            return [];
        const now = new Date().getTime();
        const breachedIds = [];
        const thresholdMs = config.targetHours * 60 * 60 * 1000;
        for (const conv of openConversations) {
            const elapsed = now - new Date(conv.createdAt).getTime();
            if (elapsed > thresholdMs) {
                breachedIds.push(conv.id);
            }
        }
        return breachedIds;
    }
    getSLAReport(inboxId, closedConversations) {
        const config = this.configs.get(inboxId);
        if (!config)
            return { metSLA: 0, breachedSLA: 0 };
        let metSLA = 0;
        let breachedSLA = 0;
        const thresholdMs = config.targetHours * 60 * 60 * 1000;
        for (const conv of closedConversations) {
            const elapsed = new Date(conv.closedAt).getTime() - new Date(conv.createdAt).getTime();
            if (elapsed <= thresholdMs) {
                metSLA++;
            }
            else {
                breachedSLA++;
            }
        }
        return { metSLA, breachedSLA };
    }
}
