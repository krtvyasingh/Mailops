const drafts = new Map();
export function submitForApproval(draftId, approverIds) {
    const draft = drafts.get(draftId);
    if (!draft || draft.status !== 'draft')
        return false;
    draft.status = 'pending';
    draft.approvers = approverIds;
    return true;
}
export function approveDraft(draftId, approverId) {
    const draft = drafts.get(draftId);
    if (!draft || draft.status !== 'pending')
        return false;
    if (!draft.approvers.includes(approverId))
        return false;
    draft.status = 'approved';
    return true;
}
export function rejectDraft(draftId, reason) {
    const draft = drafts.get(draftId);
    if (!draft || draft.status !== 'pending')
        return false;
    draft.status = 'rejected';
    return true;
}
export function getApprovalQueue(userId) {
    return Array.from(drafts.values()).filter(d => d.status === 'pending' && d.approvers.includes(userId));
}
