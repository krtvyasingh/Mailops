export class PriorityInboxLearner {
    keywords = ['urgent', 'important', 'action required', 'asap'];
    extractFeatures(email, userHistory) {
        const subjectLower = email.subject.toLowerCase();
        const hasKeyword = this.keywords.some(kw => subjectLower.includes(kw));
        return {
            senderFrequency: userHistory.getSenderFrequency(email.sender) || 0,
            containsImportantKeywords: hasKeyword,
            timeOfDay: email.date.getHours(),
            isDirectReply: !!email.inReplyTo,
            historicalReadRate: userHistory.getSenderReadRate(email.sender) || 0.5
        };
    }
    scoreEmail(features) {
        let score = 0;
        // Naive Bayes simplified scoring
        if (features.isDirectReply)
            score += 30;
        if (features.containsImportantKeywords)
            score += 20;
        // Weight sender interaction
        score += (features.senderFrequency * 10);
        score += (features.historicalReadRate * 40);
        return Math.min(100, Math.max(0, score));
    }
    processInbox(emails, userHistory) {
        return emails.map(email => {
            const features = this.extractFeatures(email, userHistory);
            const score = this.scoreEmail(features);
            return { ...email, priorityScore: score };
        }).sort((a, b) => b.priorityScore - a.priorityScore);
    }
}
