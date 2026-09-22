/**
 * Multi-Identity / Persona Management Module (Inspired by Thunderbird Account Identities)
 */
/**
 * Resolves the best identity to use when replying or sending from a specific email address
 */
export function resolveIdentityForSender(identities, targetEmail) {
    if (identities.length === 0)
        return null;
    if (targetEmail) {
        const cleanTarget = targetEmail.trim().toLowerCase();
        const exactMatch = identities.find(i => i.email.toLowerCase() === cleanTarget);
        if (exactMatch)
            return exactMatch;
        // Check plus-address match (e.g. user+news@domain.com matches user@domain.com)
        const baseTarget = cleanTarget.replace(/\+[^@]+@/, '@');
        const baseMatch = identities.find(i => i.email.toLowerCase() === baseTarget);
        if (baseMatch)
            return baseMatch;
    }
    // Fallback to default identity or first identity
    return identities.find(i => i.isDefault) || identities[0];
}
/**
 * Formats a RFC 5322 From: header string for an identity
 */
export function formatFromHeader(identity) {
    if (identity.name && identity.name.trim().length > 0) {
        const escapedName = identity.name.replace(/"/g, '\\"');
        return `"${escapedName}" <${identity.email.trim()}>`;
    }
    return `<${identity.email.trim()}>`;
}
