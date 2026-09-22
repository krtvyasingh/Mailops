/**
 * QRESYNC (RFC 5162) & CONDSTORE (RFC 7162) Fast Synchronization Engine
 */
/**
 * Computes the optimal QRESYNC differential update payload
 */
export function computeQresyncDelta(currentFolderUidValidity, currentHighestModSeq, serverMessages, clientRequest) {
    // If UIDVALIDITY changed, client cache is invalid and full resync is mandatory
    if (clientRequest.uidValidity !== currentFolderUidValidity) {
        const activeMessages = serverMessages.filter(m => !m.deleted);
        return {
            fullResyncRequired: true,
            response: {
                uidValidity: currentFolderUidValidity,
                highestModSeq: currentHighestModSeq,
                vanishedUids: [],
                modifiedMessages: [],
                newMessages: activeMessages.map(m => ({ uid: m.uid, modSeq: m.modSeq, flags: m.flags }))
            }
        };
    }
    const serverUidMap = new Map();
    for (const msg of serverMessages) {
        serverUidMap.set(msg.uid, msg);
    }
    // 1. Calculate VANISHED UIDs (Client had them, but now deleted or expunged on server)
    const vanishedUids = [];
    for (const clientUid of clientRequest.knownUids) {
        const serverMsg = serverUidMap.get(clientUid);
        if (!serverMsg || serverMsg.deleted) {
            vanishedUids.push(clientUid);
        }
    }
    // 2. Calculate MODIFIED messages (Changes since lastKnownModSeq)
    const modifiedMessages = [];
    const newMessages = [];
    const clientUidSet = new Set(clientRequest.knownUids);
    for (const msg of serverMessages) {
        if (msg.deleted)
            continue;
        if (msg.modSeq > clientRequest.lastKnownModSeq) {
            if (clientUidSet.has(msg.uid)) {
                modifiedMessages.push({
                    uid: msg.uid,
                    modSeq: msg.modSeq,
                    flags: msg.flags
                });
            }
            else {
                newMessages.push({
                    uid: msg.uid,
                    modSeq: msg.modSeq,
                    flags: msg.flags
                });
            }
        }
    }
    return {
        fullResyncRequired: false,
        response: {
            uidValidity: currentFolderUidValidity,
            highestModSeq: currentHighestModSeq,
            vanishedUids,
            modifiedMessages,
            newMessages
        }
    };
}
