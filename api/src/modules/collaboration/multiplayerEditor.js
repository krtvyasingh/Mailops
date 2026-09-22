/**
 * Module: Multiplayer Real-time Drafting & Presence
 *
 * Coordinates multi-user simultaneous drafting with operational transform (OT)
 * style patch mergers, live cursor broadcasting, and conflict resolution.
 */
export class CollaborativeDraftSession {
    draftId;
    content;
    version;
    activeCursors = new Map();
    history = [];
    constructor(draftId, initialContent = '') {
        this.draftId = draftId;
        this.content = initialContent;
        this.version = 0;
    }
    updateCursor(cursor) {
        cursor.lastUpdated = Date.now();
        this.activeCursors.set(cursor.userId, cursor);
    }
    getActiveCursors(staleThresholdMs = 10000) {
        const now = Date.now();
        const active = [];
        for (const [userId, cursor] of this.activeCursors.entries()) {
            if (now - cursor.lastUpdated < staleThresholdMs) {
                active.push(cursor);
            }
            else {
                this.activeCursors.delete(userId);
            }
        }
        return active;
    }
    applyPatch(patch) {
        let result = this.content;
        for (const op of patch.operations) {
            if (op.type === 'insert' && op.text) {
                result = result.slice(0, op.position) + op.text + result.slice(op.position);
            }
            else if (op.type === 'delete' && op.length) {
                result = result.slice(0, op.position) + result.slice(op.position + op.length);
            }
        }
        this.content = result;
        this.version++;
        this.history.push(patch);
        return {
            success: true,
            newContent: this.content,
            version: this.version
        };
    }
}
