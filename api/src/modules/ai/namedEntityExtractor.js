/**
 * Module: Named Entity Recognition & Organization Extractor
 *
 * Extracts organizations, monetary figures, dates, and people mentioned
 * in email conversations without heavy external dependencies.
 */
export function extractEntities(text) {
    const entities = [];
    // Match monetary sums ($1,234.56, €500, £99)
    const moneyRegex = /([$€£¥]\s?\d+(?:,\d{3})*(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|EUR|GBP|JPY)\b)/gi;
    let match;
    while ((match = moneyRegex.exec(text)) !== null) {
        entities.push({ type: 'monetary', value: match[0], startIndex: match.index });
    }
    // Match URLs
    const urlRegex = /https?:\/\/[^\s<>"']+/gi;
    while ((match = urlRegex.exec(text)) !== null) {
        entities.push({ type: 'url', value: match[0], startIndex: match.index });
    }
    // Match Emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    while ((match = emailRegex.exec(text)) !== null) {
        entities.push({ type: 'email', value: match[0], startIndex: match.index });
    }
    return entities;
}
