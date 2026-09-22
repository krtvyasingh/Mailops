export class DailyDigestCompiler {
    configs = new Map();
    scheduleDigest(domainId, hour) {
        this.configs.set(domainId, { domainId, scheduleHour: hour });
    }
    compileDailyDigest(domainId, unreadEmails) {
        if (unreadEmails.length === 0) {
            return '<h1>Daily Digest</h1><p>You have no unread emails. Great job!</p>';
        }
        let html = `<h1>Daily Digest</h1>`;
        html += `<p>You have ${unreadEmails.length} unread emails requiring your attention.</p>`;
        html += `<ul>`;
        unreadEmails.slice(0, 10).forEach(email => {
            html += `<li><strong>${email.sender}</strong>: ${email.subject}</li>`;
        });
        html += `</ul>`;
        if (unreadEmails.length > 10) {
            html += `<p>...and ${unreadEmails.length - 10} more.</p>`;
        }
        return html;
    }
}
