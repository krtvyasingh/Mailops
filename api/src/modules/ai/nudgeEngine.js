/**
 * Feature 8: Smart Follow-Up Nudge Engine
 * Pure TypeScript response expectation tracker identifying unanswered sent
 * and inbound emails needing replies after N days. Zero external dependencies.
 */
export function detectFollowUpNudges(threads, nowMs = Date.now(), daysThreshold = 3) {
    if (!threads || threads.length === 0)
        return [];
    const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
    const nudges = [];
    for (const thread of threads) {
        if (thread.replied)
            continue;
        const elapsedMs = nowMs - thread.lastMessageTimestamp;
        if (elapsedMs < 0)
            continue; // Future timestamp safeguard
        if (elapsedMs >= thresholdMs) {
            const daysWaiting = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
            if (thread.lastSentByMe && thread.hasQuestionOrCommitment) {
                nudges.push({
                    threadId: thread.threadId,
                    subject: thread.subject,
                    daysWaiting,
                    type: 'need_followup',
                });
            }
            else if (!thread.lastSentByMe && thread.hasQuestionOrCommitment) {
                nudges.push({
                    threadId: thread.threadId,
                    subject: thread.subject,
                    daysWaiting,
                    type: 'need_reply',
                });
            }
        }
    }
    return nudges;
}
