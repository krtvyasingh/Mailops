/**
 * Feature 27: Activity Audit Log & History Timeline
 *
 * Provides an append-only, immutable, cryptographically hash-chained audit trail
 * for all collaboration, security, and messaging events with timeline reconstruction.
 */
import { sha256 } from './cryptoUtils';
export const GENESIS_PREV_HASH = '0'.repeat(64);
/**
 * Computes a SHA-256 hash for an audit log entry to ensure cryptographic chaining.
 */
export function computeAuditHash(entry) {
    const payload = [
        entry.previousHash,
        entry.id,
        entry.timestampMs.toString(),
        entry.userId || 'anonymous',
        entry.action,
        entry.targetEntity,
        entry.targetId,
        entry.metadataJson || '{}',
    ].join('|');
    return sha256(payload);
}
/**
 * Appends a new tamper-evident audit record to the log stream.
 */
export function createAuditLogEntry(params, lastEntry) {
    const now = params.createdAt || new Date();
    const previousHash = lastEntry ? lastEntry.entryHash : GENESIS_PREV_HASH;
    const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;
    const entryHash = computeAuditHash({
        id: params.id,
        previousHash,
        timestampMs: now.getTime(),
        userId: params.userId,
        action: params.action,
        targetEntity: params.targetEntity,
        targetId: params.targetId,
        metadataJson,
    });
    return {
        id: params.id,
        userId: params.userId,
        userName: params.userName || (params.userId ? `User (${params.userId})` : 'System'),
        action: params.action,
        targetEntity: params.targetEntity,
        targetId: params.targetId,
        ipAddress: params.ipAddress || null,
        metadata: params.metadata,
        metadataJson,
        previousHash,
        entryHash,
        createdAt: now,
    };
}
/**
 * Verifies the cryptographic integrity of the entire audit chain.
 * Returns true if untampered, or flags any corrupted record index.
 */
export function verifyAuditChain(chain) {
    if (chain.length === 0)
        return { isValid: true };
    let expectedPrevHash = GENESIS_PREV_HASH;
    for (let i = 0; i < chain.length; i++) {
        const entry = chain[i];
        // Check previous hash link
        if (entry.previousHash !== expectedPrevHash) {
            return {
                isValid: false,
                brokenIndex: i,
                reason: `Previous hash mismatch at index ${i}: expected ${expectedPrevHash}, got ${entry.previousHash}`,
            };
        }
        // Recompute current hash
        const calculatedHash = computeAuditHash({
            id: entry.id,
            previousHash: entry.previousHash,
            timestampMs: entry.createdAt.getTime(),
            userId: entry.userId,
            action: entry.action,
            targetEntity: entry.targetEntity,
            targetId: entry.targetId,
            metadataJson: entry.metadataJson || (entry.metadata ? JSON.stringify(entry.metadata) : null),
        });
        if (calculatedHash !== entry.entryHash) {
            return {
                isValid: false,
                brokenIndex: i,
                reason: `Hash verification failure at index ${i}: calculated ${calculatedHash}, stored ${entry.entryHash}`,
            };
        }
        expectedPrevHash = entry.entryHash;
    }
    return { isValid: true };
}
/**
 * Formats raw audit log entries into human-readable timeline UI cards.
 */
export function formatAuditTimelineEntry(entry) {
    const actor = entry.userName || entry.userId || 'System';
    let description = `${actor} performed ${entry.action}`;
    let icon = '📝';
    switch (entry.action) {
        case 'email_read':
            description = `${actor} viewed this thread`;
            icon = '👁️';
            break;
        case 'email_sent':
            description = `${actor} sent an email reply`;
            icon = '🚀';
            break;
        case 'assignment_created':
        case 'assignment_updated':
            description = entry.metadata?.assignedTo
                ? `${actor} assigned this thread to ${entry.metadata.assignedTo}`
                : `${actor} updated the assignment`;
            icon = '👤';
            break;
        case 'assignment_status_changed':
            description = `${actor} changed status to "${entry.metadata?.newStatus || 'unknown'}"`;
            icon = '🔄';
            break;
        case 'note_added':
            description = `${actor} added an internal note`;
            icon = '💬';
            break;
        case 'tag_added':
            description = `${actor} added tag "${entry.metadata?.tagName || 'tag'}"`;
            icon = '🏷️';
            break;
        case 'tag_removed':
            description = `${actor} removed tag "${entry.metadata?.tagName || 'tag'}"`;
            icon = '🗑️';
            break;
        case 'draft_approved':
            description = `${actor} approved collaborative draft`;
            icon = '✅';
            break;
        case 'share_link_created':
            description = `${actor} created a secure shareable link`;
            icon = '🔗';
            break;
    }
    return {
        id: entry.id,
        timestamp: entry.createdAt,
        actor,
        description,
        icon,
        action: entry.action,
        metadata: entry.metadata,
    };
}
/**
 * In-memory manager for audit logs.
 */
export class AuditLogManager {
    entries = [];
    log(params) {
        const lastEntry = this.entries.length > 0 ? this.entries[this.entries.length - 1] : null;
        const newEntry = createAuditLogEntry(params, lastEntry);
        this.entries.push(newEntry);
        return newEntry;
    }
    getTimeline(targetId, limit = 50) {
        let filtered = this.entries;
        if (targetId) {
            filtered = filtered.filter(e => e.targetId === targetId);
        }
        return filtered
            .slice(-limit)
            .reverse()
            .map(formatAuditTimelineEntry);
    }
    verifyChain() {
        return verifyAuditChain(this.entries);
    }
    getAll() {
        return [...this.entries];
    }
}
