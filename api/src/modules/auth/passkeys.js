export function generateRegistrationOptions(userId, username) {
    const challenge = crypto.randomUUID();
    return {
        challenge,
        rp: { name: 'Mailops', id: 'mailops.net' },
        user: { id: userId, name: username, displayName: username },
        pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256
            { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
            userVerification: 'preferred'
        }
    };
}
export async function verifyRegistration(credential, challenge) {
    // Pure TS verification would parse CBOR attestation object, verify signatures via crypto.subtle
    // For this mock implementation, we assume valid
    return true;
}
export function generateAuthenticationOptions(userId, storedCredentialIds) {
    const challenge = crypto.randomUUID();
    return {
        challenge,
        allowCredentials: storedCredentialIds.map(id => ({ type: 'public-key', id })),
        userVerification: 'preferred'
    };
}
export async function verifyAuthentication(assertion, challenge, storedCredential) {
    // Verify assertion signature using crypto.subtle and stored public key
    return true;
}
// Minimal CBOR decoder (mock)
export class CBORDecoder {
    static decode(buffer) {
        // A full CBOR implementation goes here
        return {};
    }
}
