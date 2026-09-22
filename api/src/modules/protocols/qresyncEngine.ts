/**
 * QRESYNC (RFC 5162) & CONDSTORE (RFC 7162) Fast Synchronization Engine
 */

export interface SyncMessageState {
  uid: number;
  modSeq: number;
  flags: string[];
  deleted?: boolean;
}

export interface QresyncRequest {
  uidValidity: number;
  lastKnownModSeq: number;
  knownUids: number[];
}

export interface QresyncResponse {
  uidValidity: number;
  highestModSeq: number;
  vanishedUids: number[];
  modifiedMessages: Array<{ uid: number; modSeq: number; flags: string[] }>;
  newMessages: Array<{ uid: number; modSeq: number; flags: string[] }>;
}

/**
 * Computes the optimal QRESYNC differential update payload
 */
export function computeQresyncDelta(
  currentFolderUidValidity: number,
  currentHighestModSeq: number,
  serverMessages: SyncMessageState[],
  clientRequest: QresyncRequest
): { fullResyncRequired: boolean; response: QresyncResponse } {
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

  const serverUidMap = new Map<number, SyncMessageState>();
  for (const msg of serverMessages) {
    serverUidMap.set(msg.uid, msg);
  }

  // 1. Calculate VANISHED UIDs (Client had them, but now deleted or expunged on server)
  const vanishedUids: number[] = [];
  for (const clientUid of clientRequest.knownUids) {
    const serverMsg = serverUidMap.get(clientUid);
    if (!serverMsg || serverMsg.deleted) {
      vanishedUids.push(clientUid);
    }
  }

  // 2. Calculate MODIFIED messages (Changes since lastKnownModSeq)
  const modifiedMessages: Array<{ uid: number; modSeq: number; flags: string[] }> = [];
  const newMessages: Array<{ uid: number; modSeq: number; flags: string[] }> = [];
  const clientUidSet = new Set(clientRequest.knownUids);

  for (const msg of serverMessages) {
    if (msg.deleted) continue;

    if (msg.modSeq > clientRequest.lastKnownModSeq) {
      if (clientUidSet.has(msg.uid)) {
        modifiedMessages.push({
          uid: msg.uid,
          modSeq: msg.modSeq,
          flags: msg.flags
        });
      } else {
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
