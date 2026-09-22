export class TypingIndicatorManager {
    activeTyping = new Map(); // threadId -> Set<userId>
    timeoutMap = new Map();
    subscribers = new Map();
    broadcastTyping(threadId, userId) {
        if (!this.activeTyping.has(threadId)) {
            this.activeTyping.set(threadId, new Set());
        }
        this.activeTyping.get(threadId).add(userId);
        this.notifySubscribers(threadId);
        // Debounce clear
        const timeoutKey = `${threadId}:${userId}`;
        if (this.timeoutMap.has(timeoutKey)) {
            clearTimeout(this.timeoutMap.get(timeoutKey));
        }
        this.timeoutMap.set(timeoutKey, setTimeout(() => {
            const threadSet = this.activeTyping.get(threadId);
            if (threadSet) {
                threadSet.delete(userId);
                this.notifySubscribers(threadId);
            }
        }, 3000));
    }
    subscribeToTyping(threadId, callback) {
        if (!this.subscribers.has(threadId)) {
            this.subscribers.set(threadId, new Set());
        }
        this.subscribers.get(threadId).add(callback);
        // Initial call
        const currentTyping = Array.from(this.activeTyping.get(threadId) || []);
        callback(currentTyping);
        return () => {
            this.subscribers.get(threadId)?.delete(callback);
        };
    }
    notifySubscribers(threadId) {
        const callbacks = this.subscribers.get(threadId);
        if (callbacks) {
            const activeUsers = Array.from(this.activeTyping.get(threadId) || []);
            callbacks.forEach(cb => cb(activeUsers));
        }
    }
}
