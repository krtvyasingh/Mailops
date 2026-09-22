/**
 * Feature 11: Scheduled Send (Send Later)
 * Pure TypeScript implementation for scheduling emails, managing due dispatch queues,
 * status transitions, cancellation, and rescheduling with ZERO external dependencies.
 */
/**
 * Validates a target send timestamp.
 */
export function validateSendTime(sendAt, minLeadTimeMs = 1000, allowPast = false) {
    let ts;
    if (sendAt instanceof Date) {
        ts = sendAt.getTime();
    }
    else if (typeof sendAt === 'number') {
        ts = sendAt;
    }
    else if (typeof sendAt === 'string') {
        ts = new Date(sendAt).getTime();
    }
    else {
        return { valid: false, error: 'Invalid sendAt format', targetTimestamp: 0 };
    }
    if (isNaN(ts) || ts <= 0) {
        return { valid: false, error: 'Invalid date value', targetTimestamp: 0 };
    }
    const now = Date.now();
    if (!allowPast && ts < now + minLeadTimeMs) {
        return {
            valid: false,
            error: `Scheduled time must be at least ${minLeadTimeMs}ms in the future`,
            targetTimestamp: ts,
        };
    }
    return { valid: true, targetTimestamp: ts };
}
/**
 * Scheduled Send Queue Manager
 */
export class ScheduledSendManager {
    queue = new Map();
    constructor(initialItems) {
        if (initialItems) {
            for (const item of initialItems) {
                this.queue.set(item.id, { ...item });
            }
        }
    }
    /**
     * Schedules an email for future dispatch.
     */
    schedule(payload, options) {
        if (!payload.fromAddr || !payload.toAddr || !payload.subject) {
            return { success: false, error: 'Missing required fields: fromAddr, toAddr, or subject' };
        }
        const val = validateSendTime(options.sendAt, options.minLeadTimeMs ?? 1000, options.allowPast ?? false);
        if (!val.valid) {
            return { success: false, error: val.error };
        }
        const id = payload.id || `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const now = Date.now();
        const item = {
            id,
            domainId: payload.domainId,
            fromAddr: payload.fromAddr,
            toAddr: payload.toAddr,
            ccAddr: payload.ccAddr,
            bccAddr: payload.bccAddr,
            subject: payload.subject,
            textBody: payload.textBody || '',
            htmlBody: payload.htmlBody || '',
            sendAt: val.targetTimestamp,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
            metadata: payload.metadata,
        };
        this.queue.set(id, item);
        return { success: true, item };
    }
    /**
     * Cancels a pending scheduled email.
     */
    cancel(id) {
        const item = this.queue.get(id);
        if (!item) {
            return { success: false, error: `Scheduled email not found: ${id}` };
        }
        if (item.status !== 'pending') {
            return { success: false, error: `Cannot cancel email with status '${item.status}'` };
        }
        item.status = 'cancelled';
        item.updatedAt = Date.now();
        this.queue.set(id, item);
        return { success: true, item };
    }
    /**
     * Reschedules a pending scheduled email to a new time.
     */
    reschedule(id, newSendAt, options) {
        const item = this.queue.get(id);
        if (!item) {
            return { success: false, error: `Scheduled email not found: ${id}` };
        }
        if (item.status !== 'pending') {
            return { success: false, error: `Cannot reschedule email with status '${item.status}'` };
        }
        const val = validateSendTime(newSendAt, options?.minLeadTimeMs ?? 1000, options?.allowPast ?? false);
        if (!val.valid) {
            return { success: false, error: val.error };
        }
        item.sendAt = val.targetTimestamp;
        item.updatedAt = Date.now();
        this.queue.set(id, item);
        return { success: true, item };
    }
    /**
     * Finds all pending emails that are due for dispatch given a reference timestamp.
     */
    getDueEmails(now = Date.now()) {
        const refTime = typeof now === 'number' ? now : now.getTime();
        const due = [];
        for (const item of this.queue.values()) {
            if (item.status === 'pending' && item.sendAt <= refTime) {
                due.push({ ...item });
            }
        }
        // Sort by sendAt ascending (earliest first)
        return due.sort((a, b) => a.sendAt - b.sendAt);
    }
    /**
     * Processes all due emails, executing optional send hook, and updating status to 'sent' or 'failed'.
     */
    async processDueEmails(now = Date.now(), sendHook) {
        const refTime = typeof now === 'number' ? now : now.getTime();
        const due = this.getDueEmails(refTime);
        const dispatched = [];
        const failed = [];
        for (const item of due) {
            try {
                let ok = true;
                if (sendHook) {
                    ok = await sendHook(item);
                }
                const current = this.queue.get(item.id);
                if (current && current.status === 'pending') {
                    if (ok) {
                        current.status = 'sent';
                        current.updatedAt = Date.now();
                        dispatched.push({ ...current });
                    }
                    else {
                        current.status = 'failed';
                        current.updatedAt = Date.now();
                        failed.push({ id: item.id, error: 'Send hook returned false' });
                    }
                }
            }
            catch (err) {
                const current = this.queue.get(item.id);
                if (current) {
                    current.status = 'failed';
                    current.updatedAt = Date.now();
                }
                failed.push({
                    id: item.id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
        let remainingPending = 0;
        for (const item of this.queue.values()) {
            if (item.status === 'pending')
                remainingPending++;
        }
        return {
            evaluatedAt: refTime,
            dueCount: due.length,
            dispatched,
            failed,
            remainingPending,
        };
    }
    get(id) {
        const it = this.queue.get(id);
        return it ? { ...it } : undefined;
    }
    list(filter) {
        let result = Array.from(this.queue.values());
        if (filter?.domainId) {
            result = result.filter((i) => i.domainId === filter.domainId);
        }
        if (filter?.status) {
            result = result.filter((i) => i.status === filter.status);
        }
        return result.sort((a, b) => b.createdAt - a.createdAt);
    }
    clear() {
        this.queue.clear();
    }
}
