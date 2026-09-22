/**
 * Feature 17: Email Thread Merging & Tree View
 * Pure TypeScript implementation of Jamie Zawinski's (JWZ) RFC 5322 Email Threading Algorithm
 * for tree reconstruction from Message-ID, In-Reply-To, and References with ZERO external dependencies.
 */
/**
 * Normalizes email subject by stripping Re:, Fwd:, FW:, bracketed tags [tag], and extra spaces.
 */
export function normalizeSubject(subject) {
    if (!subject)
        return '(no subject)';
    let s = subject.trim();
    let changed = true;
    while (changed) {
        changed = false;
        // Strip [tag] prefixes like [Support], [Jira], [Mailops-123]
        const tagMatch = s.match(/^\[[^\]]+\]\s*/i);
        if (tagMatch) {
            s = s.substring(tagMatch[0].length).trim();
            changed = true;
        }
        // Strip Re:, Fwd:, Fw:, Aw:, Sv:, Vs: (international reply prefixes)
        const replyMatch = s.match(/^(re|fwd|fw|aw|sv|vs)(\[\d+\])?:\s*/i);
        if (replyMatch) {
            s = s.substring(replyMatch[0].length).trim();
            changed = true;
        }
    }
    return s.replace(/\s+/g, ' ').toLowerCase().trim();
}
/**
 * Extracts and sanitizes message IDs from a header string (e.g. "<msg1@host> <msg2@host>").
 */
export function parseMessageIds(headerStr) {
    if (!headerStr)
        return [];
    const ids = [];
    const regex = /<([^>]+)>/g;
    let match;
    while ((match = regex.exec(headerStr)) !== null) {
        const id = match[1].trim();
        if (id)
            ids.push(id);
    }
    // If no angle brackets were found, fallback to whitespace/comma split
    if (ids.length === 0) {
        const parts = headerStr.split(/[\s,]+/).map((s) => s.replace(/[<>]/g, '').trim()).filter(Boolean);
        ids.push(...parts);
    }
    return ids;
}
/**
 * Internal container class for the JWZ algorithm.
 */
class Container {
    messageId;
    email;
    parent;
    child;
    next; // Sibling link
    constructor(messageId) {
        this.messageId = messageId;
    }
    /**
     * Checks if candidate is an ancestor of this container (cycle prevention).
     */
    hasAncestor(candidate) {
        let cur = this.parent;
        while (cur) {
            if (cur === candidate)
                return true;
            cur = cur.parent;
        }
        return false;
    }
    /**
     * Adds a child to this container, ensuring no cycles and proper parenting.
     */
    addChild(child) {
        if (child === this || child.hasAncestor(this) || this.hasAncestor(child)) {
            return; // Prevent cycle
        }
        // If child already has parent, unlink it first
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        child.next = this.child;
        this.child = child;
    }
    /**
     * Removes a direct child from this container.
     */
    removeChild(child) {
        if (this.child === child) {
            this.child = child.next;
            child.next = undefined;
            child.parent = undefined;
            return;
        }
        let cur = this.child;
        while (cur && cur.next) {
            if (cur.next === child) {
                cur.next = child.next;
                child.next = undefined;
                child.parent = undefined;
                return;
            }
            cur = cur.next;
        }
    }
    /**
     * Gets list of immediate child containers.
     */
    getChildren() {
        const children = [];
        let cur = this.child;
        while (cur) {
            children.push(cur);
            cur = cur.next;
        }
        return children;
    }
}
/**
 * Executes the complete JWZ Threading algorithm on a list of emails.
 */
export function buildJwzThreads(emails) {
    if (!emails || emails.length === 0)
        return [];
    const idTable = new Map();
    const getOrCreate = (msgId) => {
        let c = idTable.get(msgId);
        if (!c) {
            c = new Container(msgId);
            idTable.set(msgId, c);
        }
        return c;
    };
    // -------------------------------------------------------------
    // Phase 1: Build table and link References & In-Reply-To
    // -------------------------------------------------------------
    for (const email of emails) {
        const msgId = email.messageId || email.id;
        const current = getOrCreate(msgId);
        current.email = email;
        // Parse References and In-Reply-To
        const refIds = parseMessageIds(email.references);
        const inReplyToIds = parseMessageIds(email.inReplyTo);
        const allRefs = [];
        for (const r of refIds) {
            if (!allRefs.includes(r))
                allRefs.push(r);
        }
        for (const irt of inReplyToIds) {
            if (!allRefs.includes(irt))
                allRefs.push(irt);
        }
        if (allRefs.length > 0) {
            let prevContainer = undefined;
            for (const refId of allRefs) {
                if (refId === msgId)
                    continue;
                const refContainer = getOrCreate(refId);
                if (prevContainer && !refContainer.parent && !refContainer.hasAncestor(prevContainer)) {
                    prevContainer.addChild(refContainer);
                }
                prevContainer = refContainer;
            }
            // Link last reference to current message container
            if (prevContainer && !current.parent && !current.hasAncestor(prevContainer)) {
                prevContainer.addChild(current);
            }
        }
    }
    // -------------------------------------------------------------
    // Phase 2: Find Root Containers
    // -------------------------------------------------------------
    const rootContainers = [];
    for (const container of idTable.values()) {
        if (!container.parent) {
            rootContainers.push(container);
        }
    }
    // -------------------------------------------------------------
    // Phase 3: Prune Empty Containers
    // -------------------------------------------------------------
    const prunedRoots = [];
    for (const root of rootContainers) {
        if (!root.email) {
            const children = root.getChildren();
            if (children.length === 0) {
                // Discard dead dummy
                continue;
            }
            else if (children.length === 1) {
                // Promote sole child to root
                const sole = children[0];
                root.removeChild(sole);
                prunedRoots.push(sole);
                continue;
            }
        }
        prunedRoots.push(root);
    }
    // -------------------------------------------------------------
    // Phase 4: Group Roots by Subject
    // -------------------------------------------------------------
    const subjectTable = new Map();
    const finalRoots = [];
    for (const root of prunedRoots) {
        let subj = '';
        if (root.email?.subject) {
            subj = normalizeSubject(root.email.subject);
        }
        else {
            // Look for first non-dummy child subject
            const findChildSubject = (c) => {
                if (c.email?.subject)
                    return normalizeSubject(c.email.subject);
                for (const child of c.getChildren()) {
                    const s = findChildSubject(child);
                    if (s)
                        return s;
                }
                return '';
            };
            subj = findChildSubject(root);
        }
        if (!subj) {
            finalRoots.push(root);
            continue;
        }
        const existing = subjectTable.get(subj);
        if (!existing) {
            subjectTable.set(subj, root);
            finalRoots.push(root);
        }
        else {
            // Merge into existing root if not creating cycles
            if (root.email && !existing.email) {
                existing.addChild(root);
            }
            else if (!root.email && existing.email) {
                for (const ch of root.getChildren()) {
                    root.removeChild(ch);
                    existing.addChild(ch);
                }
            }
            else {
                existing.addChild(root);
            }
        }
    }
    // -------------------------------------------------------------
    // Phase 5: Convert to ThreadTree and sort chronologically
    // -------------------------------------------------------------
    const summaries = [];
    for (const root of finalRoots) {
        const node = containerToNode(root, 0);
        if (node.subtreeMessageCount === 0 && !node.email)
            continue;
        const rootSubj = node.email?.subject || emails.find((e) => e.messageId === node.messageId)?.subject || '(No Subject)';
        const threadId = node.email?.id || node.messageId || `thread_${node.minDate}`;
        // Count unread
        const emailsInTree = flattenNodeEmails(node);
        const unreadCount = emailsInTree.filter((e) => !e.read).length;
        summaries.push({
            threadId,
            rootSubject: rootSubj,
            messageCount: node.subtreeMessageCount,
            unreadCount,
            participants: node.participants,
            firstDate: node.minDate,
            lastDate: node.maxDate,
            tree: node,
        });
    }
    // Sort thread summaries by latest activity (lastDate descending)
    return summaries.sort((a, b) => b.lastDate - a.lastDate);
}
function getTimestamp(d) {
    if (!d)
        return 0;
    return typeof d === 'number' ? d : d.getTime();
}
function containerToNode(c, depth) {
    const childrenNodes = c.getChildren().map((child) => containerToNode(child, depth + 1));
    // Sort sibling children chronologically (earliest first)
    childrenNodes.sort((a, b) => a.minDate - b.minDate);
    let msgCount = c.email ? 1 : 0;
    let minDate = c.email ? getTimestamp(c.email.createdAt) : Number.MAX_SAFE_INTEGER;
    let maxDate = c.email ? getTimestamp(c.email.createdAt) : 0;
    const participantSet = new Set();
    if (c.email?.fromAddr) {
        participantSet.add(c.email.fromAddr);
    }
    for (const child of childrenNodes) {
        msgCount += child.subtreeMessageCount;
        if (child.minDate < minDate)
            minDate = child.minDate;
        if (child.maxDate > maxDate)
            maxDate = child.maxDate;
        child.participants.forEach((p) => participantSet.add(p));
    }
    if (minDate === Number.MAX_SAFE_INTEGER)
        minDate = Date.now();
    if (maxDate === 0)
        maxDate = minDate;
    return {
        id: c.email?.id || c.messageId,
        messageId: c.messageId,
        email: c.email,
        children: childrenNodes,
        depth,
        isDummy: !c.email,
        subtreeMessageCount: msgCount,
        minDate,
        maxDate,
        participants: Array.from(participantSet),
    };
}
function flattenNodeEmails(node) {
    const result = [];
    if (node.email)
        result.push(node.email);
    for (const child of node.children) {
        result.push(...flattenNodeEmails(child));
    }
    return result;
}
/**
 * Flattens a ThreadNode tree into a chronological list of emails.
 */
export function flattenThread(root) {
    const list = flattenNodeEmails(root);
    return list.sort((a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt));
}
