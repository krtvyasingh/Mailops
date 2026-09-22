/**
 * Feature 28: Shareable Email Thread Links
 *
 * Provides cryptographically secure tokenized snapshot links with expiration timestamps,
 * password protection, view count limits, and data sanitization for external stakeholders.
 */
import { sha256, generateRandomToken } from './cryptoUtils';
/**
 * Generates a cryptographically strong URL-safe random token.
 */
export function generateSecureToken(byteLength = 32) {
    return generateRandomToken(byteLength);
}
/**
 * Hashes a plain-text password using SHA-256 for protected share links.
 */
export function hashPassword(password) {
    return sha256(password);
}
/**
 * Creates a new share link configuration.
 */
export function createShareLink(threadId, options = {}) {
    const now = new Date();
    const token = generateSecureToken(32);
    const expiresAt = options.expiresInMs ? new Date(now.getTime() + options.expiresInMs) : null;
    const passwordHash = options.password ? hashPassword(options.password) : null;
    return {
        id: options.id || `share-${Date.now()}-${token.substring(0, 8)}`,
        threadId,
        token,
        passwordHash,
        expiresAt,
        viewCount: 0,
        maxViews: options.maxViews || null,
        isRevoked: false,
        createdAt: now,
    };
}
/**
 * Validates access to a share link against revocation, expiration, view counts, and password.
 * Increments view count upon successful access.
 */
export function validateAndAccessShareLink(link, passwordAttempt, now = new Date()) {
    if (link.isRevoked) {
        return { canAccess: false, error: 'Share link has been revoked by the owner.' };
    }
    if (link.expiresAt && link.expiresAt.getTime() < now.getTime()) {
        return { canAccess: false, error: 'Share link has expired.' };
    }
    if (link.maxViews && link.viewCount >= link.maxViews) {
        return { canAccess: false, error: 'Maximum view limit for this share link has been reached.' };
    }
    if (link.passwordHash) {
        if (!passwordAttempt) {
            return { canAccess: false, error: 'Password required to access this share link.' };
        }
        const attemptHash = hashPassword(passwordAttempt);
        if (attemptHash !== link.passwordHash) {
            return { canAccess: false, error: 'Incorrect password.' };
        }
    }
    const updatedLink = {
        ...link,
        viewCount: link.viewCount + 1,
    };
    return {
        canAccess: true,
        updatedLink,
    };
}
/**
 * Sanitizes a thread of email objects, strictly stripping internal metadata,
 * BCC addresses, system routing IDs, and private note references before public rendering.
 */
export function sanitizeThreadForShare(threadId, rawEmails) {
    const sanitizedMessages = rawEmails.map(e => ({
        id: e.id,
        fromAddr: e.fromAddr,
        toAddr: e.toAddr,
        ccAddr: e.ccAddr || null,
        subject: e.subject || null,
        textBody: e.textBody || null,
        htmlBody: e.htmlBody || null,
        createdAt: e.createdAt,
    }));
    return {
        threadId,
        sharedAt: new Date(),
        messages: sanitizedMessages,
        isExpired: false,
    };
}
/**
 * In-memory manager for shareable links.
 */
export class ShareLinkManager {
    links = new Map(); // token -> record
    create(threadId, options) {
        const link = createShareLink(threadId, options);
        this.links.set(link.token, link);
        return link;
    }
    getByToken(token) {
        return this.links.get(token);
    }
    revoke(token) {
        const link = this.links.get(token);
        if (!link)
            return false;
        link.isRevoked = true;
        return true;
    }
    access(token, password) {
        const link = this.links.get(token);
        if (!link) {
            return { canAccess: false, error: 'Share link not found.' };
        }
        const result = validateAndAccessShareLink(link, password);
        if (result.canAccess && result.updatedLink) {
            this.links.set(token, result.updatedLink);
            return { canAccess: true, link: result.updatedLink };
        }
        return { canAccess: false, error: result.error };
    }
}
