/**
 * Module: Smart Forwarder with Sensitive Data Stripping
 *
 * Forwards emails with automated redaction of confidential headers,
 * security tokens, and internal email threads before dispatch.
 */
export function prepareSmartForward(originalSubject, htmlBody, options) {
    const forwardedSubject = `${options.prefixSubject}${originalSubject.replace(/^Fwd:\s*/i, '')}`;
    let cleanHtml = htmlBody;
    if (options.stripInternalComments) {
        cleanHtml = cleanHtml.replace(/<!--\s*INTERNAL_NOTE_START[\s\S]*?INTERNAL_NOTE_END\s*-->/gi, '');
    }
    if (options.redactAuthTokens) {
        cleanHtml = cleanHtml.replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT]');
        cleanHtml = cleanHtml.replace(/(?:api[_-]?key|secret|token)[\s:=]+["']?[a-zA-Z0-9_\-]{16,}["']?/gi, '[REDACTED_API_KEY]');
    }
    return {
        forwardedSubject,
        cleanHtml
    };
}
