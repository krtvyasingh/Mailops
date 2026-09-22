/**
 * Module: Free Subdomain & Custom Handle Dispenser
 *
 * Allows users without a paid custom domain to claim free personalized email handles
 * (e.g. username@mailops.me or you@username.mailops.site) with zero DNS setup.
 */
const RESERVED_HANDLES = new Set([
    'admin', 'support', 'billing', 'security', 'postmaster', 'hostmaster',
    'root', 'abuse', 'mail', 'smtp', 'imap', 'pop', 'webmail', 'api', 'help'
]);
const MANAGED_MASTER_DOMAINS = ['mailops.me', 'mailops.site', 'mailops.dev'];
export class FreeDomainDispenser {
    claims = new Map();
    /**
     * Checks if a free handle is available
     */
    isHandleAvailable(handle, masterDomain = 'mailops.me') {
        const clean = handle.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
        if (clean.length < 3 || clean.length > 32)
            return false;
        if (RESERVED_HANDLES.has(clean))
            return false;
        const fullDomain = `${clean}.${masterDomain}`;
        return !this.claims.has(fullDomain) && !this.claims.has(clean);
    }
    /**
     * Instantly claims a free domain handle for a user
     */
    claimFreeHandle(userId, handle, masterDomain = 'mailops.me', mode = 'subdomain') {
        const clean = handle.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
        if (!this.isHandleAvailable(clean, masterDomain)) {
            throw new Error(`Handle "${clean}" is not available.`);
        }
        const fullDomain = mode === 'subdomain' ? `${clean}.${masterDomain}` : masterDomain;
        const primaryEmail = mode === 'subdomain' ? `hello@${clean}.${masterDomain}` : `${clean}@${masterDomain}`;
        const reservation = {
            id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            handle: clean,
            fullDomain,
            primaryEmail,
            ownerUserId: userId,
            claimedAt: Date.now(),
            status: 'active',
            provider: 'mailops_managed'
        };
        this.claims.set(fullDomain, reservation);
        return reservation;
    }
    /**
     * Generates automatic DNS configuration instructions for is-a.dev integration
     */
    generateIsADevRecord(username, cloudflareWorkerHost) {
        return {
            domain: `${username}.is-a.dev`,
            recordJson: {
                description: `Mailops Free Email Routing for ${username}`,
                repo: `https://github.com/${username}/Mailops`,
                owner: { username, email: `${username}@gmail.com` },
                record: {
                    MX: ['route1.mx.cloudflare.net', 'route2.mx.cloudflare.net', 'route3.mx.cloudflare.net'],
                    TXT: ['v=spf1 include:_spf.mx.cloudflare.net ~all']
                }
            }
        };
    }
}
