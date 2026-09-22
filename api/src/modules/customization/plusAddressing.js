/**
 * Feature 45: Plus-Addressing & Custom Aliases
 * Pure TypeScript RFC 5233 sub-addressing parser,
 * identity selector, and alias routing resolver.
 */
/**
 * Parses an email address according to RFC 5233 sub-addressing specifications.
 * Supports delimiters like '+' (standard), '-', etc.
 */
export function parsePlusAddress(address, delimiters = ['+']) {
    const trimmed = (address || '').trim();
    const atIndex = trimmed.lastIndexOf('@');
    if (atIndex === -1) {
        return {
            raw: trimmed,
            localPart: trimmed,
            baseUser: trimmed,
            tag: null,
            domain: '',
            normalized: trimmed.toLowerCase(),
            isSubAddressed: false,
        };
    }
    const localPart = trimmed.slice(0, atIndex);
    const domain = trimmed.slice(atIndex + 1).toLowerCase();
    // Find first matching delimiter
    let foundDelim = null;
    let delimIndex = -1;
    for (const d of delimiters) {
        const idx = localPart.indexOf(d);
        if (idx !== -1 && (delimIndex === -1 || idx < delimIndex)) {
            delimIndex = idx;
            foundDelim = d;
        }
    }
    if (delimIndex !== -1 && foundDelim) {
        const baseUser = localPart.slice(0, delimIndex);
        const tag = localPart.slice(delimIndex + foundDelim.length);
        return {
            raw: trimmed,
            localPart,
            baseUser,
            tag: tag || null,
            domain,
            normalized: `${baseUser}@${domain}`.toLowerCase(),
            isSubAddressed: true,
        };
    }
    return {
        raw: trimmed,
        localPart,
        baseUser: localPart,
        tag: null,
        domain,
        normalized: `${localPart}@${domain}`.toLowerCase(),
        isSubAddressed: false,
    };
}
/**
 * Generates an RFC 5233 sub-address given base email and tag.
 */
export function generateSubAddress(baseEmail, tag, delimiter = '+') {
    const parsed = parsePlusAddress(baseEmail);
    const cleanTag = tag.trim().replace(/[^a-zA-Z0-9._-]/g, '');
    if (!cleanTag)
        return baseEmail;
    return `${parsed.baseUser}${delimiter}${cleanTag}@${parsed.domain}`;
}
/**
 * Formats an RFC 5322 From/Reply-To header string with display name.
 */
export function formatAddressHeader(displayName, email) {
    const cleanEmail = email.trim();
    if (!displayName || !displayName.trim()) {
        return cleanEmail;
    }
    const cleanName = displayName.trim().replace(/"/g, '\\"');
    return `"${cleanName}" <${cleanEmail}>`;
}
/**
 * Resolves inbound routing for a received email address against registered aliases.
 */
export function resolveAliasRouting(recipientAddress, registeredAliases, defaultFolder = 'inbox') {
    const parsed = parsePlusAddress(recipientAddress);
    const matched = registeredAliases.find((a) => a.isActive && (a.aliasName.toLowerCase() === parsed.localPart.toLowerCase() ||
        (parsed.tag && a.aliasName.toLowerCase() === parsed.tag.toLowerCase())));
    const appliedTagIds = [];
    if (matched?.autoTagId) {
        appliedTagIds.push(matched.autoTagId);
    }
    return {
        targetFolderId: matched?.targetFolderId || defaultFolder,
        appliedTagIds,
        matchedAlias: matched ? matched.aliasName : null,
        tag: parsed.tag,
    };
}
