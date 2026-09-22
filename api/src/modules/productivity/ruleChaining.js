export class RuleChainEngine {
    rules = new Map();
    buildRuleChain(rulesList) {
        rulesList.forEach(rule => this.rules.set(rule.id, rule));
    }
    async executeAction(email, action, payload) {
        const modifiedEmail = { ...email };
        switch (action) {
            case 'MARK_READ':
                modifiedEmail.isRead = true;
                break;
            case 'ADD_LABEL':
                modifiedEmail.labels = modifiedEmail.labels || [];
                modifiedEmail.labels.push(payload.label);
                break;
            case 'FORWARD':
                // Forwarding logic here
                break;
            case 'ARCHIVE':
                modifiedEmail.isArchived = true;
                break;
        }
        return modifiedEmail;
    }
    async executeChain(email, startRuleId) {
        let currentEmailState = { ...email };
        const queue = [startRuleId];
        const visited = new Set();
        while (queue.length > 0) {
            const ruleId = queue.shift();
            if (visited.has(ruleId))
                continue; // Prevent infinite loops in DAG
            visited.add(ruleId);
            const rule = this.rules.get(ruleId);
            if (!rule)
                continue;
            if (rule.condition(currentEmailState)) {
                currentEmailState = await this.executeAction(currentEmailState, rule.action, rule.actionPayload);
                if (rule.nextRuleIds) {
                    queue.push(...rule.nextRuleIds);
                }
            }
        }
        return currentEmailState;
    }
}
