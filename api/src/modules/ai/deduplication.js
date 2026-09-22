export class DeduplicationEngine {
    async generateHash(content) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    normalizeContent(text) {
        return text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .trim();
    }
    async findDuplicates(emails, domainId) {
        const domainEmails = emails.filter(e => e.domainId === domainId);
        const hashToIds = new Map();
        for (const email of domainEmails) {
            const normalizedSubject = this.normalizeContent(email.subject);
            const normalizedBody = this.normalizeContent(email.body);
            const combined = `${email.sender}:${normalizedSubject}:${normalizedBody}`;
            const hash = await this.generateHash(combined);
            if (!hashToIds.has(hash)) {
                hashToIds.set(hash, []);
            }
            hashToIds.get(hash).push(email.id);
        }
        const duplicates = [];
        for (const ids of hashToIds.values()) {
            if (ids.length > 1) {
                duplicates.push(ids);
            }
        }
        return duplicates;
    }
    mergeDuplicates(ids) {
        if (ids.length === 0)
            return '';
        // Typically keep the first one, soft-delete or merge metadata of others
        const primaryId = ids[0];
        const toMerge = ids.slice(1);
        // Simulate merge action
        console.log(`Merging ${toMerge.join(', ')} into ${primaryId}`);
        return primaryId;
    }
}
