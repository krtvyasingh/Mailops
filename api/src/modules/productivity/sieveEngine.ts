/**
 * Sieve Email Filtering Language Parser and Execution Engine (RFC 5228)
 */

export interface EmailContext {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  headers: Record<string, string>;
  sizeBytes: number;
  body: string;
}

export interface SieveExecutionResult {
  action: 'deliver' | 'fileinto' | 'reject' | 'discard' | 'redirect';
  targetFolder?: string;
  redirectAddress?: string;
  rejectReason?: string;
  flags: string[];
  stopped: boolean;
  matchedRules: string[];
}

export interface SieveRule {
  description?: string;
  conditions: Array<{
    field: string;
    comparator: 'contains' | 'is' | 'matches' | 'exists';
    values: string[];
    negated?: boolean;
  }>;
  conditionMode: 'allof' | 'anyof';
  actions: Array<{
    type: 'fileinto' | 'reject' | 'discard' | 'redirect' | 'setflag' | 'stop';
    param?: string;
  }>;
}

/**
 * Evaluates an email message against an array of Sieve rules
 */
export function executeSieveRules(email: EmailContext, rules: SieveRule[]): SieveExecutionResult {
  const result: SieveExecutionResult = {
    action: 'deliver',
    flags: [],
    stopped: false,
    matchedRules: []
  };

  for (const rule of rules) {
    if (result.stopped) break;

    const conditionResults = rule.conditions.map(cond => evaluateCondition(email, cond));
    const isMatch = rule.conditionMode === 'anyof'
      ? conditionResults.some(Boolean)
      : conditionResults.every(Boolean);

    if (isMatch) {
      if (rule.description) {
        result.matchedRules.push(rule.description);
      }

      for (const act of rule.actions) {
        switch (act.type) {
          case 'fileinto':
            result.action = 'fileinto';
            result.targetFolder = act.param || 'INBOX';
            break;
          case 'redirect':
            result.action = 'redirect';
            result.redirectAddress = act.param;
            break;
          case 'discard':
            result.action = 'discard';
            break;
          case 'reject':
            result.action = 'reject';
            result.rejectReason = act.param || 'Rejected by mail filter policy';
            break;
          case 'setflag':
            if (act.param && !result.flags.includes(act.param)) {
              result.flags.push(act.param);
            }
            break;
          case 'stop':
            result.stopped = true;
            break;
        }
      }
    }
  }

  return result;
}

function evaluateCondition(
  email: EmailContext,
  condition: SieveRule['conditions'][0]
): boolean {
  const fieldLower = condition.field.toLowerCase();
  let candidateValues: string[] = [];

  if (fieldLower === 'from') {
    candidateValues = [email.from];
  } else if (fieldLower === 'to') {
    candidateValues = [email.to];
  } else if (fieldLower === 'subject') {
    candidateValues = [email.subject];
  } else if (fieldLower === 'cc') {
    candidateValues = email.cc ? [email.cc] : [];
  } else if (email.headers[fieldLower]) {
    candidateValues = [email.headers[fieldLower]];
  }

function safeWildcardMatch(str: string, pattern: string): boolean {
  let s = 0, p = 0, match = 0, starIdx = -1;
  while (s < str.length) {
    if (p < pattern.length && (pattern[p] === '?' || pattern[p] === str[s])) {
      s++;
      p++;
    } else if (p < pattern.length && pattern[p] === '*') {
      starIdx = p;
      match = s;
      p++;
    } else if (starIdx !== -1) {
      p = starIdx + 1;
      match++;
      s = match;
    } else {
      return false;
    }
  }
  while (p < pattern.length && pattern[p] === '*') {
    p++;
  }
  return p === pattern.length;
}

  if (condition.comparator === 'exists') {
    const exists = candidateValues.length > 0 && candidateValues[0].trim().length > 0;
    return condition.negated ? !exists : exists;
  }

  const matchFound = candidateValues.some(val => {
    const valLower = val.toLowerCase();
    return condition.values.some(target => {
      const targetLower = target.toLowerCase();
      if (condition.comparator === 'contains') {
        return valLower.includes(targetLower);
      } else if (condition.comparator === 'is') {
        return valLower === targetLower;
      } else if (condition.comparator === 'matches') {
        return safeWildcardMatch(valLower, targetLower);
      }
      return false;
    });
  });

  return condition.negated ? !matchFound : matchFound;
}


/**
 * Compiles a human-readable Sieve script into structured SieveRule objects
 */
export function compileSieveScript(script: string): SieveRule[] {
  const rules: SieveRule[] = [];
  const clean = script.replace(/#.*$/gm, '').trim(); // Strip comments
  
  // Basic Regex matcher for standard simple Sieve blocks
  const ifBlocks = clean.split(/(?:if|elsif)\s+/i).filter(b => b.trim().length > 0);

  for (const block of ifBlocks) {
    const openBrace = block.indexOf('{');
    const closeBrace = block.lastIndexOf('}');
    if (openBrace === -1 || closeBrace === -1) continue;

    const conditionPart = block.substring(0, openBrace).trim();
    const actionPart = block.substring(openBrace + 1, closeBrace).trim();

    const rule: SieveRule = {
      conditions: [],
      conditionMode: conditionPart.includes('anyof') ? 'anyof' : 'allof',
      actions: []
    };

    // Parse conditions
    const condMatches = conditionPart.matchAll(/header\s+:(contains|is|matches)\s+"([^"]+)"\s+"([^"]+)"/gi);
    for (const m of condMatches) {
      rule.conditions.push({
        field: m[2],
        comparator: m[1].toLowerCase() as any,
        values: [m[3]]
      });
    }

    // Parse actions
    const fileintoMatches = actionPart.matchAll(/fileinto\s+"([^"]+)"/gi);
    for (const m of fileintoMatches) {
      rule.actions.push({ type: 'fileinto', param: m[1] });
    }

    const redirectMatches = actionPart.matchAll(/redirect\s+"([^"]+)"/gi);
    for (const m of redirectMatches) {
      rule.actions.push({ type: 'redirect', param: m[1] });
    }

    if (/discard\s*;/i.test(actionPart)) {
      rule.actions.push({ type: 'discard' });
    }
    if (/stop\s*;/i.test(actionPart)) {
      rule.actions.push({ type: 'stop' });
    }

    if (rule.conditions.length > 0) {
      rules.push(rule);
    }
  }

  return rules;
}
