/**
 * Module: Bounce Classification & Suppression List Manager
 *
 * Accurately parses SMTP bounce return codes and manages automated
 * suppression lists to protect sender domain reputation.
 */
export function classifySMTPBounce(recipient, rawDsnMessage) {
    const is550 = rawDsnMessage.includes('550') || rawDsnMessage.includes('5.1.1');
    const isMailboxFull = rawDsnMessage.toLowerCase().includes('mailbox is full') || rawDsnMessage.includes('4.2.2');
    const isPolicy = rawDsnMessage.includes('5.7.1') || rawDsnMessage.toLowerCase().includes('blocked');
    if (is550) {
        return { recipient, bounceType: 'hard_bounce', smtpCode: '550 5.1.1', reason: 'User unknown', shouldSuppress: true };
    }
    if (isMailboxFull) {
        return { recipient, bounceType: 'mailbox_full', smtpCode: '452 4.2.2', reason: 'Quota exceeded', shouldSuppress: false };
    }
    if (isPolicy) {
        return { recipient, bounceType: 'policy_block', smtpCode: '554 5.7.1', reason: 'Policy rejection', shouldSuppress: false };
    }
    return { recipient, bounceType: 'soft_bounce', smtpCode: '400', reason: 'Temporary delivery error', shouldSuppress: false };
}
