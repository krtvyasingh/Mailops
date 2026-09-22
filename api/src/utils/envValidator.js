export function validateEnv(env, requiredKeys) {
    const missing = [];
    for (const key of requiredKeys) {
        if (!env[key]) {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    return true;
}
