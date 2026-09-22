const attempts = new Map();
export function recordAttempt(key) {
    const attempt = attempts.get(key) || { count: 0, lockedUntil: 0 };
    if (Date.now() < attempt.lockedUntil)
        return;
    attempt.count++;
    if (attempt.count >= 5) {
        attempt.lockedUntil = Date.now() + 15 * 60 * 1000;
    }
    attempts.set(key, attempt);
}
export function isLocked(key) {
    const attempt = attempts.get(key);
    if (!attempt)
        return false;
    if (Date.now() < attempt.lockedUntil) {
        return true;
    }
    if (attempt.lockedUntil > 0) {
        attempt.count = 0;
        attempt.lockedUntil = 0;
        attempts.set(key, attempt);
    }
    return false;
}
export function clearAttempts(key) {
    attempts.delete(key);
}
