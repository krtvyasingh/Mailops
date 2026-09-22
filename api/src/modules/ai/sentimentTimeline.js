/**
 * Module: Multi-Turn Sentiment Timeline Tracker
 *
 * Tracks progression of emotional sentiment across multi-turn email threads
 * to alert operators when customer frustration or escalation is trending upward.
 */
const POSITIVE_WORDS = new Set(['great', 'thanks', 'appreciate', 'helpful', 'awesome', 'excellent', 'resolved', 'perfect']);
const NEGATIVE_WORDS = new Set(['unhappy', 'frustrated', 'terrible', 'broken', 'issue', 'fail', 'waiting', 'slow', 'bad', 'disappointed']);
const ESCALATION_TRIGGERS = new Set(['lawyer', 'refund', 'cancel', 'manager', 'unacceptable', 'sue', 'complaint']);
export function calculateSentiment(text) {
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    let pos = 0;
    let neg = 0;
    let isEscalation = false;
    for (const w of words) {
        if (POSITIVE_WORDS.has(w))
            pos++;
        if (NEGATIVE_WORDS.has(w))
            neg++;
        if (ESCALATION_TRIGGERS.has(w))
            isEscalation = true;
    }
    const total = pos + neg || 1;
    const score = Math.max(-1, Math.min(1, (pos - neg) / total));
    if (isEscalation && score < 0)
        return { score: -1, label: 'escalation' };
    if (score > 0.2)
        return { score, label: 'positive' };
    if (score < -0.2)
        return { score, label: 'negative' };
    return { score: 0, label: 'neutral' };
}
export function computeSentimentTrajectory(threadId, messages) {
    const points = messages.map(m => {
        const { score, label } = calculateSentiment(m.text);
        return {
            messageId: m.id,
            sender: m.sender,
            timestamp: m.timestamp,
            score,
            label
        };
    });
    let trend = 'stable';
    if (points.length >= 2) {
        const firstScore = points[0].score;
        const lastScore = points[points.length - 1].score;
        if (lastScore - firstScore > 0.3)
            trend = 'improving';
        else if (firstScore - lastScore > 0.3)
            trend = 'deteriorating';
    }
    const requiresIntervention = points.some(p => p.label === 'escalation') || trend === 'deteriorating';
    return {
        threadId,
        points,
        trend,
        requiresIntervention
    };
}
