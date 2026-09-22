const policies = new Map();
export function setTeamSignature(inboxId, html) {
    policies.set(inboxId, { inboxId, html });
}
export function getSignaturePolicy(inboxId) {
    return policies.get(inboxId);
}
export function enforceSignature(draftContent, inboxId) {
    const policy = getSignaturePolicy(inboxId);
    if (!policy)
        return draftContent;
    return `${draftContent}\n<br>\n${policy.html}`;
}
