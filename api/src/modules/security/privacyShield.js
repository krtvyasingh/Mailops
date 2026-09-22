/**
 * Privacy Shield & Remote Content Blocker (Inspired by Thunderbird Content Policy & K-9 Privacy)
 */
/**
 * Sanitizes HTML content by neutralizing remote resource fetches unless sender is explicitly whitelisted
 */
export function applyPrivacyShield(html, senderEmail, whitelistedSenders = []) {
    if (!html || typeof html !== 'string') {
        return {
            sanitizedHtml: '',
            blockedRemoteResourcesCount: 0,
            blockedUrls: [],
            isWhitelisted: false
        };
    }
    const cleanSender = senderEmail.trim().toLowerCase();
    const isWhitelisted = whitelistedSenders.some(s => s.trim().toLowerCase() === cleanSender);
    if (isWhitelisted) {
        return {
            sanitizedHtml: html,
            blockedRemoteResourcesCount: 0,
            blockedUrls: [],
            isWhitelisted: true
        };
    }
    const blockedUrls = [];
    // 1. Block external <img> tags (except CID: and data: URIs)
    let sanitized = html.replace(/<img([^>]*?)src=["'](https?:\/\/[^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
        blockedUrls.push(src);
        return `<span class="mailops-blocked-image" data-original-src="${src}" style="display:inline-flex; align-items:center; padding:4px 8px; font-size:11px; background:#f1f5f9; color:#64748b; border:1px dashed #cbd5e1; border-radius:6px; margin:2px;">🖼️ Remote image blocked for privacy</span>`;
    });
    // 2. Block CSS background-image: url(...)
    sanitized = sanitized.replace(/url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi, (match, url) => {
        blockedUrls.push(url);
        return 'none';
    });
    // 3. Strip external <link rel="stylesheet">
    sanitized = sanitized.replace(/<link[^>]*?href=["'](https?:\/\/[^"']+)["'][^>]*?>/gi, (match, href) => {
        blockedUrls.push(href);
        return '<!-- Remote stylesheet blocked -->';
    });
    return {
        sanitizedHtml: sanitized,
        blockedRemoteResourcesCount: blockedUrls.length,
        blockedUrls,
        isWhitelisted: false
    };
}
