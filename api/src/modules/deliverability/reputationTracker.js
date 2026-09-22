/**
 * Module: Domain Deliverability & Sender Score Tracker
 *
 * Aggregates daily bounce rates, spam complaints, SPF/DKIM pass ratios,
 * and inbox placement rates into a composite sender reputation score (0–100).
 */
export function calculateSenderScore(metrics) {
    const { totalSent, deliveredCount, hardBounceCount, spamComplaintCount, dkimPassRate, spfPassRate } = metrics;
    if (totalSent === 0) {
        return { ...metrics, calculatedScore: 100, healthStatus: 'EXCELLENT' };
    }
    let score = 100;
    // Penalize for hard bounces (>2% is alarming)
    const bounceRate = (hardBounceCount / totalSent) * 100;
    if (bounceRate > 5)
        score -= 30;
    else if (bounceRate > 2)
        score -= 15;
    else if (bounceRate > 1)
        score -= 5;
    // Penalize heavily for spam complaints (>0.1% is critical)
    const complaintRate = (spamComplaintCount / totalSent) * 100;
    if (complaintRate > 0.3)
        score -= 40;
    else if (complaintRate > 0.1)
        score -= 20;
    // Penalize for authentication failures
    if (dkimPassRate < 95)
        score -= 15;
    if (spfPassRate < 95)
        score -= 15;
    const calculatedScore = Math.max(0, Math.min(100, score));
    let healthStatus = 'EXCELLENT';
    if (calculatedScore < 50)
        healthStatus = 'CRITICAL';
    else if (calculatedScore < 75)
        healthStatus = 'WARNING';
    else if (calculatedScore < 90)
        healthStatus = 'GOOD';
    return {
        ...metrics,
        calculatedScore,
        healthStatus
    };
}
