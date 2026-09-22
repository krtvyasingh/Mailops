/**
 * Module: Signature Auto-Selector
 *
 * Automatically selects and injects the appropriate corporate or personal
 * signature based on the recipient's domain and internal/external context.
 */
export function selectSignature(recipientEmail, userDomain, rules) {
    const recipientDomain = recipientEmail.split('@')[1]?.toLowerCase();
    const isInternal = recipientDomain === userDomain.toLowerCase();
    // 1. Check exact domain match
    const domainRule = rules.find(r => r.matchType === 'domain_match' && r.targetDomain?.toLowerCase() === recipientDomain);
    if (domainRule)
        return domainRule.signatureHtml;
    // 2. Check internal vs external
    if (isInternal) {
        const internalRule = rules.find(r => r.matchType === 'internal');
        if (internalRule)
            return internalRule.signatureHtml;
    }
    else {
        const externalRule = rules.find(r => r.matchType === 'external');
        if (externalRule)
            return externalRule.signatureHtml;
    }
    // 3. Fallback default
    const defaultRule = rules.find(r => r.matchType === 'default');
    return defaultRule ? defaultRule.signatureHtml : '';
}
