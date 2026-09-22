export class EmailPinningService {
    pinnedItems = new Map(); // domainId -> Set<emailId>
    pinEmail(domainId, emailId) {
        if (!this.pinnedItems.has(domainId)) {
            this.pinnedItems.set(domainId, new Set());
        }
        this.pinnedItems.get(domainId).add(emailId);
    }
    unpinEmail(domainId, emailId) {
        const domainPins = this.pinnedItems.get(domainId);
        if (domainPins) {
            domainPins.delete(emailId);
        }
    }
    getPinnedEmails(domainId) {
        const domainPins = this.pinnedItems.get(domainId);
        return domainPins ? Array.from(domainPins) : [];
    }
}
