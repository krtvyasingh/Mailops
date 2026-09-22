/**
 * Module: TLS Cipher Suite Enforcement & Validator
 *
 * Verifies that outbound SMTP connections and inbound webhook relays
 * use modern, non-deprecated cryptographic cipher suites (TLS 1.3 / TLS 1.2).
 */
const DEPRECATED_CIPHERS = ['RC4', 'DES', '3DES', 'MD5', 'NULL', 'EXPORT', 'anon'];
export function validateTLSCipher(tlsVersion, cipherSuite) {
    const vulnerabilities = [];
    if (tlsVersion === 'TLSv1' || tlsVersion === 'TLSv1.1' || tlsVersion === 'SSLv3') {
        vulnerabilities.push(`Insecure TLS version: ${tlsVersion}`);
    }
    for (const dep of DEPRECATED_CIPHERS) {
        if (cipherSuite.toUpperCase().includes(dep)) {
            vulnerabilities.push(`Insecure cipher detected: ${dep}`);
        }
    }
    return {
        isSecure: vulnerabilities.length === 0,
        tlsVersion,
        cipherSuite,
        vulnerabilities
    };
}
