const loginHistory = new Map();
export function recordLogin(userId, ip, userAgent, geo) {
    const history = loginHistory.get(userId) || [];
    history.push({ userId, ip, userAgent, geo, timestamp: new Date() });
    loginHistory.set(userId, history);
}
export function isLoginSuspicious(userId, ip, userAgent) {
    const history = loginHistory.get(userId) || [];
    if (history.length === 0)
        return false;
    const lastLogin = history[history.length - 1];
    const newIp = lastLogin.ip !== ip;
    const newUserAgent = lastLogin.userAgent !== userAgent;
    return newIp && newUserAgent;
}
export function getLoginHistory(userId) {
    return loginHistory.get(userId) || [];
}
