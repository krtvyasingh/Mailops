/**
 * Feature 12: Undo Send Grace Buffer
 * Pure TypeScript implementation of a configurable 5-30s grace period buffer
 * with instant cancellation tokens and zero external dependencies.
 */
export const DEFAULT_UNDO_CONFIG = {
    defaultGraceSeconds: 10,
    minGraceSeconds: 5,
    maxGraceSeconds: 30,
};
/**
 * Validates and clamps a grace period within allowed bounds (5 - 30s).
 */
export function validateGracePeriod(seconds, config = DEFAULT_UNDO_CONFIG) {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
        return {
            valid: false,
            clampedSeconds: config.defaultGraceSeconds,
            error: 'Grace period must be a valid number',
        };
    }
    if (seconds < config.minGraceSeconds) {
        return {
            valid: false,
            clampedSeconds: config.minGraceSeconds,
            error: `Grace period cannot be less than ${config.minGraceSeconds} seconds`,
        };
    }
    if (seconds > config.maxGraceSeconds) {
        return {
            valid: false,
            clampedSeconds: config.maxGraceSeconds,
            error: `Grace period cannot exceed ${config.maxGraceSeconds} seconds`,
        };
    }
    return { valid: true, clampedSeconds: Math.round(seconds) };
}
/**
 * Undo Send Buffer Manager
 */
export class UndoSendManager {
    buffer = new Map();
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_UNDO_CONFIG, ...config };
    }
    /**
     * Updates default grace period.
     */
    setGracePeriod(seconds) {
        const res = validateGracePeriod(seconds, this.config);
        if (res.valid) {
            this.config.defaultGraceSeconds = res.clampedSeconds;
            return { success: true, seconds: res.clampedSeconds };
        }
        return { success: false, seconds: this.config.defaultGraceSeconds, error: res.error };
    }
    getGracePeriod() {
        return this.config.defaultGraceSeconds;
    }
    /**
     * Enqueues an email payload into the undo grace buffer.
     */
    enqueue(email, customGraceSeconds) {
        const grace = customGraceSeconds !== undefined
            ? validateGracePeriod(customGraceSeconds, this.config).clampedSeconds
            : this.config.defaultGraceSeconds;
        const now = Date.now();
        const token = `undo_${now}_${Math.random().toString(36).substring(2, 10)}`;
        const expiresAt = now + grace * 1000;
        const ticket = {
            token,
            email: { ...email },
            bufferedAt: now,
            gracePeriodSeconds: grace,
            expiresAt,
            status: 'buffered',
        };
        this.buffer.set(token, ticket);
        return { success: true, ticket };
    }
    /**
     * Cancels a buffered send using the cancellation token.
     */
    cancel(token, now = Date.now()) {
        const ticket = this.buffer.get(token);
        if (!ticket) {
            return { success: false, message: `Ticket ${token} not found` };
        }
        if (ticket.status === 'cancelled') {
            return { success: false, ticket, message: 'Send already cancelled' };
        }
        if (ticket.status === 'dispatched') {
            return { success: false, ticket, message: 'Email has already been dispatched' };
        }
        if (now > ticket.expiresAt) {
            ticket.status = 'dispatched';
            ticket.dispatchedAt = ticket.expiresAt;
            return { success: false, ticket, message: 'Grace period has expired; email dispatched' };
        }
        ticket.status = 'cancelled';
        ticket.cancelledAt = now;
        this.buffer.set(token, ticket);
        return {
            success: true,
            ticket,
            message: 'Email send successfully cancelled',
        };
    }
    /**
     * Gets remaining grace time in milliseconds for a ticket.
     */
    getRemainingTime(token, now = Date.now()) {
        const ticket = this.buffer.get(token);
        if (!ticket) {
            return { status: 'dispatched', remainingMs: 0 };
        }
        if (ticket.status !== 'buffered') {
            return { status: ticket.status, remainingMs: 0, ticket };
        }
        const remaining = ticket.expiresAt - now;
        if (remaining <= 0) {
            ticket.status = 'dispatched';
            ticket.dispatchedAt = ticket.expiresAt;
            return { status: 'dispatched', remainingMs: 0, ticket };
        }
        return { status: 'buffered', remainingMs: remaining, ticket };
    }
    /**
     * Flushes expired tickets ready for dispatch.
     */
    flushExpired(now = Date.now()) {
        const readyToDispatch = [];
        for (const ticket of this.buffer.values()) {
            if (ticket.status === 'buffered' && now >= ticket.expiresAt) {
                ticket.status = 'dispatched';
                ticket.dispatchedAt = now;
                readyToDispatch.push({ ...ticket });
            }
        }
        return readyToDispatch;
    }
    getTicket(token) {
        const ticket = this.buffer.get(token);
        return ticket ? { ...ticket } : undefined;
    }
    listActive(now = Date.now()) {
        const active = [];
        for (const ticket of this.buffer.values()) {
            if (ticket.status === 'buffered' && now < ticket.expiresAt) {
                active.push({ ...ticket });
            }
        }
        return active;
    }
    clear() {
        this.buffer.clear();
    }
}
