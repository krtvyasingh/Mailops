/**
 * Autocrypt Level 1 Specification Implementation & Opportunistic OpenPGP Key Exchange
 * Reference: https://autocrypt.org/level1.html
 */
/**
 * Formats a valid Autocrypt header per Autocrypt Level 1 Section 3
 */
export function formatAutocryptHeader(options) {
    if (!options.addr || !options.keyData) {
        throw new Error('Autocrypt header requires both addr and keyData');
    }
    const cleanAddr = options.addr.trim().toLowerCase();
    const prefer = options.preferEncrypt || 'nopreference';
    const cleanKey = options.keyData.replace(/\s+/g, '');
    const type = options.type || 'p';
    return `addr=${cleanAddr}; prefer-encrypt=${prefer}; type=${type}; keydata=${cleanKey}`;
}
/**
 * Parses an incoming Autocrypt header into structured attributes
 */
export function parseAutocryptHeader(headerValue) {
    if (!headerValue || typeof headerValue !== 'string')
        return null;
    const parts = headerValue.split(';').map(p => p.trim());
    const attributes = {};
    for (const part of parts) {
        const eqIdx = part.indexOf('=');
        if (eqIdx === -1)
            continue;
        const key = part.slice(0, eqIdx).trim().toLowerCase();
        const value = part.slice(eqIdx + 1).trim();
        if (key && value) {
            attributes[key] = value;
        }
    }
    if (!attributes['addr'] || !attributes['keydata']) {
        return null;
    }
    // Autocrypt spec: type defaults to 'p' (OpenPGP)
    const type = attributes['type'] || 'p';
    if (type !== 'p') {
        return null; // Ignore unknown key types
    }
    const preferEncrypt = attributes['prefer-encrypt'] === 'mutual' ? 'mutual' : 'nopreference';
    return {
        addr: attributes['addr'].toLowerCase(),
        preferEncrypt,
        keyData: attributes['keydata'].replace(/\s+/g, ''),
        type,
        lastSeen: new Date()
    };
}
/**
 * Evaluates inbound email headers and extracts the latest valid Autocrypt key
 */
export function processInboundAutocrypt(headers, senderAddr) {
    const rawHeader = headers['autocrypt'] || headers['Autocrypt'];
    if (!rawHeader)
        return null;
    const headerValues = Array.isArray(rawHeader) ? rawHeader : [rawHeader];
    const targetSender = senderAddr.trim().toLowerCase();
    for (const val of headerValues) {
        const record = parseAutocryptHeader(val);
        if (record && record.addr === targetSender) {
            return record;
        }
    }
    return null;
}
/**
 * Formats Autocrypt-Gossip headers for multi-recipient encrypted threads
 */
export function generateAutocryptGossipHeaders(recipients) {
    return recipients.map(r => {
        const cleanKey = r.keyData.replace(/\s+/g, '');
        return `addr=${r.email.trim().toLowerCase()}; type=p; keydata=${cleanKey}`;
    });
}
/**
 * Parses Autocrypt-Gossip headers from decrypted incoming multi-party messages
 */
export function parseAutocryptGossipHeaders(headers) {
    const rawHeader = headers['autocrypt-gossip'] || headers['Autocrypt-Gossip'];
    if (!rawHeader)
        return [];
    const values = Array.isArray(rawHeader) ? rawHeader : [rawHeader];
    const records = [];
    for (const val of values) {
        const parts = val.split(';').map(p => p.trim());
        let addr = '';
        let keyData = '';
        for (const p of parts) {
            const eq = p.indexOf('=');
            if (eq === -1)
                continue;
            const k = p.slice(0, eq).trim().toLowerCase();
            const v = p.slice(eq + 1).trim();
            if (k === 'addr')
                addr = v.toLowerCase();
            if (k === 'keydata')
                keyData = v.replace(/\s+/g, '');
        }
        if (addr && keyData) {
            records.push({ addr, keyData });
        }
    }
    return records;
}
/**
 * Recommendation decision engine: decides if outgoing message should be encrypted
 */
export function recommendEncryption(peerRecord, userPreference = 'mutual') {
    if (userPreference === 'force') {
        if (!peerRecord?.keyData) {
            return { shouldEncrypt: false, reason: 'Encryption forced but recipient public key is missing' };
        }
        return { shouldEncrypt: true, reason: 'Forced encryption enabled with valid recipient key' };
    }
    if (!peerRecord) {
        return { shouldEncrypt: false, reason: 'No Autocrypt key available for recipient' };
    }
    if (userPreference === 'mutual' && peerRecord.preferEncrypt === 'mutual') {
        return { shouldEncrypt: true, reason: 'Mutual encryption preference negotiated with peer' };
    }
    return { shouldEncrypt: false, reason: 'Opportunistic mode: peer or user preference is nopreference' };
}
