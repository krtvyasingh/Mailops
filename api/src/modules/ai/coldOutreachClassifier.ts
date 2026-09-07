/**
 * Module: Cold Outreach & Sales Pitch Classifier
 * 
 * Accurately isolates automated cold outbound sales emails from genuine
 * business discussions and personal correspondence.
 */

export interface PitchClassificationResult {
  isColdOutreach: boolean;
  confidence: number;
  indicators: string[];
}

const COLD_TRIGGERS = [
  'quick 15 min',
  '15-minute call',
  'hop on a call',
  'growth strategy',
  'lead generation',
  'outsource',
  'synergy',
  'bump this in your inbox',
  'following up on my last email',
  'thought you might be the right person',
  'scale your revenue',
  'book a time on my calendar',
  'calendly.com'
];

export function classifyColdOutreach(subject: string, body: string, isSenderInContacts: boolean): PitchClassificationResult {
  if (isSenderInContacts) {
    return { isColdOutreach: false, confidence: 0.95, indicators: ['sender_in_contacts'] };
  }

  const combined = `${subject} ${body}`.toLowerCase();
  const indicators: string[] = [];

  for (const trigger of COLD_TRIGGERS) {
    if (combined.includes(trigger)) {
      indicators.push(trigger);
    }
  }

  const confidence = Math.min(1.0, indicators.length * 0.28);

  return {
    isColdOutreach: indicators.length >= 2,
    confidence,
    indicators
  };
}
