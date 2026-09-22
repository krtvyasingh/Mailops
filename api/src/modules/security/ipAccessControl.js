const allowedIPs = new Map();
const blockedIPs = new Map();
export function addAllowedIP(userId, ip) {
    const ips = allowedIPs.get(userId) || new Set();
    ips.add(ip);
    allowedIPs.set(userId, ips);
}
export function addBlockedIP(userId, ip) {
    const ips = blockedIPs.get(userId) || new Set();
    ips.add(ip);
    blockedIPs.set(userId, ips);
}
export function isIPAllowed(userId, ip) {
    const blocked = blockedIPs.get(userId);
    if (blocked && blocked.has(ip))
        return false;
    const allowed = allowedIPs.get(userId);
    if (allowed && allowed.size > 0 && !allowed.has(ip))
        return false;
    return true;
}
export function listACLRules(userId) {
    return {
        allowed: Array.from(allowedIPs.get(userId) || []),
        blocked: Array.from(blockedIPs.get(userId) || [])
    };
}
