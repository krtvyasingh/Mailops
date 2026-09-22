/**
 * Module: Prompt Injection & Jailbreak Defense Analyzer
 *
 * Inspects inbound emails for adversarial prompt injections, indirect
 * system prompt overrides, and data exfiltration patterns before LLM processing.
 */
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /you\s+are\s+now\s+(a|an)\s+/i,
    /system\s+prompt\s+override/i,
    /output\s+the\s+above\s+(text|prompt|system)/i,
    /print\s+your\s+instructions/i,
    /new\s+system\s+directive:/i,
    /disregard\s+all\s+rules/i,
    /roleplay\s+as\s+/i,
    /<\|im_start\|>/i,
    /\[SYSTEM\]/i
];
export function inspectPromptInjection(text) {
    let score = 0;
    const flaggedPatterns = [];
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(text)) {
            score += 35;
            flaggedPatterns.push(pattern.source);
        }
    }
    // Check for hidden zero-width or control characters
    if (/[\u200B-\u200D\uFEFF]/.test(text)) {
        score += 20;
        flaggedPatterns.push('hidden_zero_width_chars');
    }
    const finalScore = Math.min(100, score);
    return {
        isSuspicious: finalScore >= 35,
        riskScore: finalScore,
        flaggedPatterns
    };
}
