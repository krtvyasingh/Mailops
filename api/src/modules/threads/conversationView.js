export function buildConversation(messages) {
    const nodeMap = new Map();
    const roots = [];
    for (const msg of messages) {
        nodeMap.set(msg.id, { message: msg, children: [] });
    }
    for (const msg of messages) {
        const node = nodeMap.get(msg.id);
        let parentId = msg.inReplyTo;
        if (!parentId && msg.references && msg.references.length > 0) {
            parentId = msg.references[msg.references.length - 1];
        }
        if (parentId && nodeMap.has(parentId)) {
            nodeMap.get(parentId).children.push(node);
        }
        else {
            roots.push(node);
        }
    }
    return roots;
}
export function collapseQuotedText(htmlBody) {
    const lines = htmlBody.split('\n');
    let result = '';
    let inQuote = false;
    for (const line of lines) {
        if (line.trim().startsWith('>')) {
            if (!inQuote) {
                result += '<div class="quoted-text-collapsed" style="display:none;">\n';
                inQuote = true;
            }
            result += line + '\n';
        }
        else {
            if (inQuote) {
                result += '</div>\n';
                inQuote = false;
            }
            result += line + '\n';
        }
    }
    if (inQuote) {
        result += '</div>\n';
    }
    return result;
}
export function extractInlineReplies(htmlBody) {
    const lines = htmlBody.split('\n');
    let newContent = '';
    let quotedContent = '';
    for (const line of lines) {
        if (line.trim().startsWith('>')) {
            quotedContent += line + '\n';
        }
        else {
            newContent += line + '\n';
        }
    }
    return { newContent: newContent.trim(), quotedContent: quotedContent.trim() };
}
export function getConversationParticipants(messages) {
    const participants = new Set();
    for (const msg of messages) {
        participants.add(msg.from);
        msg.to.forEach(p => participants.add(p));
        if (msg.cc) {
            msg.cc.forEach(p => participants.add(p));
        }
    }
    return Array.from(participants);
}
export function getConversationSummary(messages) {
    if (messages.length === 0) {
        throw new Error("No messages in conversation");
    }
    const participants = getConversationParticipants(messages);
    let start = messages[0].date;
    let end = messages[0].date;
    for (const msg of messages) {
        if (msg.date < start)
            start = msg.date;
        if (msg.date > end)
            end = msg.date;
    }
    return {
        messageCount: messages.length,
        participantCount: participants.length,
        participants,
        dateRange: { start, end }
    };
}
