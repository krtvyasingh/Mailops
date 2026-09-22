/**
 * Feature 19: Out-of-Office / Vacation Responder
 * Pure TypeScript RFC 3834 compliant vacation auto-responder with 24h per-sender
 * cooldown rate limiting and loop prevention, with ZERO external dependencies.
 */
export const SYSTEM_SENDERS = [
    'mailer-daemon',
    'postmaster',
    'noreply',
    'no-reply',
    'donotreply',
    'do-not-reply',
    'notifications',
    'alert',
    'support',
];
/**
 * Normalizes email address (lowercased, trimmed).
 */
export function normalizeEmail(email) {
    if (!email)
        return '';
    const match = email.match(/<([^>]+)>/);
    const target = match ? match[1] : email;
    return target.toLowerCase().trim();
}
/**
 * Checks if header matches forbidden RFC 3834 criteria.
 */
export function isAutoSubmittedOrMailingList(headers) {
    if (!headers)
        return { isExcluded: false };
    const getHeader = (name) => {
        for (const [k, v] of Object.entries(headers)) {
            if (k.toLowerCase() === name.toLowerCase()) {
                return Array.isArray(v) ? v.join(' ') : String(v);
            }
        }
        return '';
    };
    const autoSubmitted = getHeader('Auto-Submitted').toLowerCase();
    if (autoSubmitted && autoSubmitted !== 'no') {
        return { isExcluded: true, reason: `Auto-Submitted header present: ${autoSubmitted}` };
    }
    const precedence = getHeader('Precedence').toLowerCase();
    if (['bulk', 'junk', 'list', 'auto_reply'].includes(precedence)) {
        return { isExcluded: true, reason: `Precedence header indicates bulk/list: ${precedence}` };
    }
    const listId = getHeader('List-Id');
    if (listId) {
        return { isExcluded: true, reason: 'List-Id header present (mailing list)' };
    }
    const listUnsubscribe = getHeader('List-Unsubscribe');
    if (listUnsubscribe) {
        return { isExcluded: true, reason: 'List-Unsubscribe header present (newsletter)' };
    }
    const xAutoResponse = getHeader('X-Auto-Response-Suppress');
    if (xAutoResponse) {
        return { isExcluded: true, reason: `X-Auto-Response-Suppress: ${xAutoResponse}` };
    }
    return { isExcluded: false };
}
/**
 * Out-of-Office / Vacation Responder Engine
 */
export class VacationResponder {
    cooldowns = new Map(); // senderKey -> lastSentTimestamp
    /**
     * Evaluates an inbound email against vacation settings and RFC 3834 criteria.
     */
    evaluate(settings, inbound, now = Date.now()) {
        if (!settings.isActive) {
            return { shouldRespond: false, reason: 'Vacation responder is inactive' };
        }
        if (now < settings.startDate) {
            return { shouldRespond: false, reason: 'Vacation period has not started yet' };
        }
        if (now > settings.endDate) {
            return { shouldRespond: false, reason: 'Vacation period has already ended' };
        }
        if (inbound.isSpam) {
            return { shouldRespond: false, reason: 'Inbound email is classified as spam' };
        }
        const sender = normalizeEmail(inbound.fromAddr);
        const recipient = normalizeEmail(settings.userEmail || inbound.toAddr);
        if (!sender) {
            return { shouldRespond: false, reason: 'Sender email is missing or empty' };
        }
        // Do not respond to self
        if (sender === recipient) {
            return { shouldRespond: false, reason: 'Sender is the recipient account itself' };
        }
        // Check system sender prefixes
        const senderLocal = sender.split('@')[0];
        if (SYSTEM_SENDERS.some((prefix) => senderLocal.includes(prefix))) {
            return { shouldRespond: false, reason: `Sender ${sender} is a system or automated address` };
        }
        // Check RFC 3834 headers
        const headerCheck = isAutoSubmittedOrMailingList(inbound.headers);
        if (headerCheck.isExcluded) {
            return { shouldRespond: false, reason: headerCheck.reason };
        }
        // Check Cooldown (default 24 hours)
        const cooldownMs = (settings.cooldownHours ?? 24) * 60 * 60 * 1000;
        const cooldownKey = `${settings.domainId}:${sender}`;
        const lastSent = this.cooldowns.get(cooldownKey);
        if (lastSent && now - lastSent < cooldownMs) {
            const remainingHours = ((cooldownMs - (now - lastSent)) / (1000 * 60 * 60)).toFixed(1);
            return {
                shouldRespond: false,
                reason: `Sender is in cooldown window (${remainingHours}h remaining)`,
            };
        }
        // Record cooldown timestamp
        this.cooldowns.set(cooldownKey, now);
        // Build RFC 3834 compliant response headers & payload
        const originalSubj = inbound.subject || '';
        const replySubject = settings.subject.includes('{{subject}}')
            ? settings.subject.replace('{{subject}}', originalSubj)
            : settings.subject || `Auto-Reply: ${originalSubj}`;
        const references = [inbound.references, inbound.messageId].filter(Boolean).join(' ');
        const payload = {
            to: inbound.fromAddr,
            from: settings.userEmail,
            subject: replySubject,
            body: settings.body,
            inReplyTo: inbound.messageId,
            references: references || undefined,
            headers: {
                'Auto-Submitted': 'auto-replied',
                'Precedence': 'bulk',
                'X-Auto-Response-Suppress': 'All',
            },
        };
        return {
            shouldRespond: true,
            responsePayload: payload,
        };
    }
    getCooldown(domainId, senderEmail) {
        return this.cooldowns.get(`${domainId}:${normalizeEmail(senderEmail)}`);
    }
    setCooldown(domainId, senderEmail, timestamp) {
        this.cooldowns.set(`${domainId}:${normalizeEmail(senderEmail)}`, timestamp);
    }
    clearCooldowns() {
        this.cooldowns.clear();
    }
}
