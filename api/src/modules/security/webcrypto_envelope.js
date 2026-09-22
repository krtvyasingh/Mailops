/**
 * Feature 33: Email Encryption & Digital Signatures (Client-Side Web Crypto)
 *
 * Cryptographic Envelope Suite:
 * 1. Symmetric Encryption: AES-256-GCM with PBKDF2 (100,000 iterations)
 * 2. Asymmetric Envelope Encryption: RSA-OAEP key wrapping + AES-256-GCM
 * 3. Digital Signatures: RSA-PSS (SHA-256) tamper-proof signing and verification
 *
 * Uses standard W3C Web Crypto API (crypto.subtle) with zero new NPM dependencies.
 */
// Helpers for Uint8Array <-> Base64 conversion
export function uint8ArrayToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
export function base64ToUint8Array(base64) {
    const binary = atob(base64.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
/**
 * Derives an AES-256-GCM key from a passphrase and salt using PBKDF2.
 */
export async function deriveKeyFromPassphrase(passphrase, salt, iterations = 100000) {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt: salt,
        iterations,
        hash: 'SHA-256',
    }, passphraseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
/**
 * Symmetrically encrypts a plaintext message using AES-256-GCM + PBKDF2.
 */
export async function encryptWithPassword(plaintext, passphrase, iterations = 100000) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKeyFromPassphrase(passphrase, salt, iterations);
    const encodedData = new TextEncoder().encode(plaintext);
    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encodedData);
    return {
        version: 1,
        scheme: 'PBKDF2-AES-256-GCM',
        iterations,
        salt: uint8ArrayToBase64(salt),
        iv: uint8ArrayToBase64(iv),
        ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
        tagLength: 128,
    };
}
/**
 * Decrypts a symmetric envelope using AES-256-GCM + PBKDF2.
 */
export async function decryptWithPassword(envelope, passphrase) {
    const salt = base64ToUint8Array(envelope.salt);
    const iv = base64ToUint8Array(envelope.iv);
    const ciphertextBytes = base64ToUint8Array(envelope.ciphertext);
    const key = await deriveKeyFromPassphrase(passphrase, salt, envelope.iterations || 100000);
    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertextBytes);
    return new TextDecoder().decode(decryptedBuffer);
}
/**
 * Generates an RSA-OAEP keypair for asymmetric envelope encryption.
 */
export async function generateRsaOaepKeyPair(modulusLength = 2048) {
    return await crypto.subtle.generateKey({
        name: 'RSA-OAEP',
        modulusLength,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
    }, true, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']);
}
/**
 * Generates an RSA-PSS keypair for digital signatures.
 */
export async function generateRsaPssKeyPair(modulusLength = 2048) {
    return await crypto.subtle.generateKey({
        name: 'RSA-PSS',
        modulusLength,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
    }, true, ['sign', 'verify']);
}
/**
 * Exports a public CryptoKey to SPKI PEM format.
 */
export async function exportPublicKeyToPem(key) {
    const spki = await crypto.subtle.exportKey('spki', key);
    const base64 = uint8ArrayToBase64(new Uint8Array(spki));
    const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;
    return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}
/**
 * Imports an SPKI PEM formatted public key for RSA-OAEP or RSA-PSS.
 */
export async function importPublicKeyFromPem(pem, algorithm = 'RSA-OAEP', usage = ['encrypt', 'wrapKey']) {
    const cleanBase64 = pem
        .replace(/-----BEGIN[^-]+-----/g, '')
        .replace(/-----END[^-]+-----/g, '')
        .replace(/\s+/g, '');
    const der = base64ToUint8Array(cleanBase64);
    return await crypto.subtle.importKey('spki', der, { name: algorithm, hash: 'SHA-256' }, true, usage);
}
/**
 * Asymmetrically encrypts a message using RSA-OAEP key wrapping and AES-256-GCM.
 */
export async function encryptWithPublicKey(plaintext, recipientPublicKey) {
    // 1. Generate ephemeral AES-256-GCM session key
    const sessionKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    // 2. Encrypt plaintext payload with session key
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(plaintext);
    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, sessionKey, encodedData);
    // 3. Wrap (encrypt) session key with recipient's RSA-OAEP public key
    const wrappedKeyBuffer = await crypto.subtle.wrapKey('raw', sessionKey, recipientPublicKey, { name: 'RSA-OAEP' });
    return {
        version: 1,
        scheme: 'RSA-OAEP-AES-256-GCM',
        wrappedKey: uint8ArrayToBase64(new Uint8Array(wrappedKeyBuffer)),
        iv: uint8ArrayToBase64(iv),
        ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
    };
}
/**
 * Decrypts an asymmetric envelope using recipient's RSA-OAEP private key.
 */
export async function decryptWithPrivateKey(envelope, recipientPrivateKey) {
    const wrappedKeyBytes = base64ToUint8Array(envelope.wrappedKey);
    const iv = base64ToUint8Array(envelope.iv);
    const ciphertextBytes = base64ToUint8Array(envelope.ciphertext);
    // 1. Unwrap the AES session key
    const sessionKey = await crypto.subtle.unwrapKey('raw', wrappedKeyBytes, recipientPrivateKey, { name: 'RSA-OAEP' }, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    // 2. Decrypt the payload
    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, sessionKey, ciphertextBytes);
    return new TextDecoder().decode(decryptedBuffer);
}
/**
 * Signs a message payload using an RSA-PSS private key.
 */
export async function signMessage(payload, signingPrivateKey, publicKeyPem) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const signatureBuffer = await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, signingPrivateKey, data);
    return {
        version: 1,
        algorithm: 'RSA-PSS-SHA256',
        payload,
        signature: uint8ArrayToBase64(new Uint8Array(signatureBuffer)),
        publicKeyPem,
        timestamp: Date.now(),
    };
}
/**
 * Verifies a signed message envelope against its public key.
 */
export async function verifySignedMessage(envelope) {
    try {
        const publicKey = await importPublicKeyFromPem(envelope.publicKeyPem, 'RSA-PSS', ['verify']);
        const signatureBytes = base64ToUint8Array(envelope.signature);
        const dataBytes = new TextEncoder().encode(envelope.payload);
        return await crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 32 }, publicKey, signatureBytes, dataBytes);
    }
    catch {
        return false;
    }
}
