export class TemplateAnalytics {
    statsMap = new Map();
    recordTemplateUsage(templateId, domainId) {
        const stats = this.statsMap.get(templateId) || {
            templateId,
            domainId,
            usageCount: 0,
            replyCount: 0
        };
        stats.usageCount += 1;
        stats.lastUsed = new Date();
        this.statsMap.set(templateId, stats);
    }
    recordTemplateReply(templateId) {
        const stats = this.statsMap.get(templateId);
        if (stats) {
            stats.replyCount += 1;
        }
    }
    getTemplateStats(domainId) {
        return Array.from(this.statsMap.values())
            .filter(stat => stat.domainId === domainId);
    }
    getConversionRate(templateId) {
        const stats = this.statsMap.get(templateId);
        if (!stats || stats.usageCount === 0)
            return 0;
        return stats.replyCount / stats.usageCount;
    }
}
