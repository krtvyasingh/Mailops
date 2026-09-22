export function verifyARCChain(headers) {
    if (!headers.arcSeal || !headers.arcMessageSignature || !headers.arcAuthenticationResults) {
        return false;
    }
    const sealValid = headers.arcSeal.includes('cv=pass') || headers.arcSeal.includes('cv=none');
    const signatureValid = headers.arcMessageSignature.includes('a=rsa-sha256');
    const authResultsValid = headers.arcAuthenticationResults.includes('dkim=pass') || headers.arcAuthenticationResults.includes('spf=pass');
    return sealValid && signatureValid && authResultsValid;
}
