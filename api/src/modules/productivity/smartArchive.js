export class SmartArchiveManager {
    configs = new Map();
    configureAutoArchive(domainId, daysThreshold) {
        this.configs.set(domainId, {
            domainId,
            daysThreshold,
            isActive: true
        });
    }
    runAutoArchive(domainId, emails) {
        const config = this.configs.get(domainId);
        if (!config || !config.isActive)
            return [];
        const now = new Date();
        const thresholdTime = now.getTime() - (config.daysThreshold * 24 * 60 * 60 * 1000);
        const archivedIds = [];
        emails.forEach(email => {
            if (!email.isArchived && !email.hasReply) {
                const receivedTime = new Date(email.receivedAt).getTime();
                if (receivedTime < thresholdTime) {
                    email.isArchived = true;
                    archivedIds.push(email.id);
                }
            }
        });
        return archivedIds;
    }
}
