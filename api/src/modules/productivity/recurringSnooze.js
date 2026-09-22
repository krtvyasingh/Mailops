export var SnoozePattern;
(function (SnoozePattern) {
    SnoozePattern["EVERY_MONDAY"] = "EVERY_MONDAY";
    SnoozePattern["EVERY_WEEKDAY"] = "EVERY_WEEKDAY";
    SnoozePattern["MONTHLY"] = "MONTHLY";
    SnoozePattern["CUSTOM_CRON"] = "CUSTOM_CRON";
})(SnoozePattern || (SnoozePattern = {}));
export class RecurringSnoozeManager {
    rules = new Map();
    calculateNextTrigger(pattern, customCron) {
        const now = new Date();
        const next = new Date(now);
        switch (pattern) {
            case SnoozePattern.EVERY_MONDAY:
                next.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
                next.setHours(9, 0, 0, 0);
                break;
            case SnoozePattern.EVERY_WEEKDAY:
                if (now.getDay() >= 5) {
                    next.setDate(now.getDate() + (8 - now.getDay()));
                }
                else {
                    next.setDate(now.getDate() + 1);
                }
                next.setHours(9, 0, 0, 0);
                break;
            case SnoozePattern.MONTHLY:
                next.setMonth(now.getMonth() + 1);
                next.setHours(9, 0, 0, 0);
                break;
            case SnoozePattern.CUSTOM_CRON:
                // Mock parsing for simplicity
                next.setDate(now.getDate() + 1);
                break;
        }
        return next;
    }
    createRecurringSnooze(emailId, pattern, customCron) {
        const rule = {
            id: Math.random().toString(36).substr(2, 9),
            emailId,
            pattern,
            customCron,
            nextTrigger: this.calculateNextTrigger(pattern, customCron),
            active: true
        };
        this.rules.set(rule.id, rule);
        return rule;
    }
    getDueSnoozes() {
        const now = new Date();
        return Array.from(this.rules.values())
            .filter(rule => rule.active && rule.nextTrigger <= now);
    }
    processSnooze(ruleId) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            // Unsnooze email logic here
            rule.nextTrigger = this.calculateNextTrigger(rule.pattern, rule.customCron);
        }
    }
}
