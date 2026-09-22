const auditTrail = new Map();
export function generateComplianceReport(domainId, dateRange) {
    const events = auditTrail.get(domainId) || [];
    const filtered = events.filter(e => e.timestamp >= dateRange.start && e.timestamp <= dateRange.end);
    return {
        domainId,
        reportGeneratedAt: new Date(),
        eventCount: filtered.length,
        events: filtered
    };
}
export function exportAuditTrail(domainId, format) {
    const events = auditTrail.get(domainId) || [];
    if (format === 'json') {
        return JSON.stringify(events, null, 2);
    }
    const csv = ['id,timestamp,action,userId'];
    for (const e of events) {
        csv.push(`${e.id},${e.timestamp.toISOString()},${e.action},${e.userId}`);
    }
    return csv.join('\n');
}
