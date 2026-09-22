export class FollowUpTracker {
    reminders = new Map();
    setFollowUp(emailId, domainId, days) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        const reminder = {
            emailId,
            domainId,
            dueDate,
            status: 'PENDING'
        };
        this.reminders.set(emailId, reminder);
        return reminder;
    }
    getOverdueFollowUps(domainId) {
        const now = new Date();
        return Array.from(this.reminders.values())
            .filter(r => r.domainId === domainId && r.status === 'PENDING' && r.dueDate <= now);
    }
    clearFollowUp(emailId) {
        const reminder = this.reminders.get(emailId);
        if (reminder) {
            reminder.status = 'COMPLETED';
        }
    }
    cancelFollowUp(emailId) {
        const reminder = this.reminders.get(emailId);
        if (reminder) {
            reminder.status = 'CANCELLED';
        }
    }
}
