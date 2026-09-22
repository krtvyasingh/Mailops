export class FocusModeFilter {
    applyFocusFilter(emails, mode, currentUserId) {
        switch (mode) {
            case 'UNREAD_ONLY':
                return emails.filter(e => !e.isRead);
            case 'STARRED_ONLY':
                return emails.filter(e => e.isStarred);
            case 'ASSIGNED_TO_ME':
                if (!currentUserId)
                    return [];
                return emails.filter(e => e.assigneeId === currentUserId);
            case 'NONE':
            default:
                return emails;
        }
    }
}
