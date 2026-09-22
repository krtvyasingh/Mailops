/**
 * Feature 20: Offline Support & Sync Queue
 * Pure TypeScript client/server offline mutation queue, optimistic local state applier,
 * and multi-strategy conflict resolution engine with ZERO external dependencies.
 */
/**
 * Applies a mutation optimistically to an email state object.
 */
export function applyOptimisticMutation(state, mutation) {
    const next = { ...state };
    switch (mutation.type) {
        case 'MARK_READ':
            next.read = true;
            break;
        case 'MARK_UNREAD':
            next.read = false;
            break;
        case 'ARCHIVE':
            next.archived = true;
            next.folderId = 'archive';
            break;
        case 'STAR':
            next.starred = true;
            break;
        case 'UNSTAR':
            next.starred = false;
            break;
        case 'MOVE_FOLDER':
            if (mutation.payload.folderId) {
                next.folderId = mutation.payload.folderId;
            }
            break;
        case 'ADD_LABEL':
            if (mutation.payload.label) {
                const lbl = String(mutation.payload.label);
                const cur = next.labels || [];
                if (!cur.includes(lbl)) {
                    next.labels = [...cur, lbl];
                }
            }
            break;
        case 'REMOVE_LABEL':
            if (mutation.payload.label && Array.isArray(next.labels)) {
                const lbl = String(mutation.payload.label);
                next.labels = next.labels.filter((l) => l !== lbl);
            }
            break;
        case 'UPDATE_DRAFT':
        case 'CREATE_DRAFT':
            Object.assign(next, mutation.payload);
            break;
        case 'DELETE_EMAIL':
            next.trashed = true;
            next.folderId = 'trash';
            break;
        default:
            Object.assign(next, mutation.payload);
            break;
    }
    return next;
}
/**
 * Resolves a conflict between client mutation payload and current server state.
 */
export function resolveConflict(clientMutation, serverState, strategy = 'lww') {
    const serverTimestamp = Number(serverState.updatedAt || serverState.createdAt || 0);
    const clientTimestamp = clientMutation.timestamp;
    if (strategy === 'server_wins') {
        return {
            strategyUsed: 'server_wins',
            resolvedPayload: { ...serverState },
            appliedToClient: true,
            appliedToServer: false,
        };
    }
    if (strategy === 'client_wins') {
        return {
            strategyUsed: 'client_wins',
            resolvedPayload: { ...serverState, ...clientMutation.payload },
            appliedToClient: false,
            appliedToServer: true,
        };
    }
    if (strategy === 'merge') {
        // 3-way / field merge: labels union, text body concatenation or field-level LWW
        const merged = { ...serverState, ...clientMutation.payload };
        // Merge labels if both exist
        if (Array.isArray(serverState.labels) || Array.isArray(clientMutation.payload.labels)) {
            const serverLabels = serverState.labels || [];
            const clientLabels = clientMutation.payload.labels || [];
            merged.labels = Array.from(new Set([...serverLabels, ...clientLabels]));
        }
        // Merge draft text if conflict in draft
        if (typeof serverState.body === 'string' &&
            typeof clientMutation.payload.body === 'string' &&
            serverState.body !== clientMutation.payload.body) {
            if (clientTimestamp >= serverTimestamp) {
                merged.body = clientMutation.payload.body;
            }
            else {
                merged.body = serverState.body;
            }
        }
        return {
            strategyUsed: 'merge',
            resolvedPayload: merged,
            appliedToClient: true,
            appliedToServer: true,
        };
    }
    // Default: LWW (Last-Write-Wins based on timestamp)
    if (clientTimestamp >= serverTimestamp) {
        return {
            strategyUsed: 'lww',
            resolvedPayload: { ...serverState, ...clientMutation.payload },
            appliedToClient: false,
            appliedToServer: true,
        };
    }
    else {
        return {
            strategyUsed: 'lww',
            resolvedPayload: { ...serverState },
            appliedToClient: true,
            appliedToServer: false,
        };
    }
}
/**
 * Offline Sync Queue Manager
 */
export class OfflineSyncManager {
    queue = [];
    maxRetries;
    constructor(initialQueue = [], maxRetries = 3) {
        this.queue = [...initialQueue];
        this.maxRetries = maxRetries;
    }
    enqueue(type, payload, options) {
        const id = options?.id || `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const mutation = {
            id,
            type,
            payload: { ...payload },
            timestamp: options?.timestamp || Date.now(),
            status: 'pending',
            retryCount: 0,
            clientVersion: options?.clientVersion || 1,
        };
        this.queue.push(mutation);
        return mutation;
    }
    getPending() {
        return this.queue.filter((m) => m.status === 'pending' || m.status === 'failed');
    }
    getAll() {
        return [...this.queue];
    }
    /**
     * Replays and syncs pending mutations against a server sync handler.
     */
    async syncWithServer(serverHandler, strategy = 'lww') {
        let syncedCount = 0;
        let failedCount = 0;
        let conflictsResolved = 0;
        const pending = this.getPending().sort((a, b) => a.timestamp - b.timestamp);
        for (const mut of pending) {
            mut.status = 'syncing';
            try {
                const res = await serverHandler(mut);
                if (res.success) {
                    mut.status = 'synced';
                    mut.syncedAt = Date.now();
                    syncedCount++;
                }
                else if (res.conflict && res.serverState) {
                    // Resolve conflict
                    const resolved = resolveConflict(mut, res.serverState, strategy);
                    mut.status = 'synced';
                    mut.payload = resolved.resolvedPayload;
                    mut.syncedAt = Date.now();
                    conflictsResolved++;
                    syncedCount++;
                }
                else {
                    mut.retryCount++;
                    if (mut.retryCount >= this.maxRetries) {
                        mut.status = 'failed';
                        mut.error = res.error || 'Max retries exceeded';
                        failedCount++;
                    }
                    else {
                        mut.status = 'pending';
                    }
                }
            }
            catch (err) {
                mut.retryCount++;
                if (mut.retryCount >= this.maxRetries) {
                    mut.status = 'failed';
                    mut.error = err instanceof Error ? err.message : String(err);
                    failedCount++;
                }
                else {
                    mut.status = 'pending';
                }
            }
        }
        const remainingPending = this.queue.filter((m) => m.status === 'pending').length;
        return {
            totalProcessed: pending.length,
            syncedCount,
            failedCount,
            conflictsResolved,
            remainingPending,
            mutations: [...this.queue],
        };
    }
    clearSynced() {
        this.queue = this.queue.filter((m) => m.status !== 'synced');
    }
    clear() {
        this.queue = [];
    }
}
