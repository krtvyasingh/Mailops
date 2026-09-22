export class RoundRobinService {
    rotations = new Map();
    configureRotation(inboxId, memberIds) {
        this.rotations.set(inboxId, {
            inboxId,
            memberIds,
            currentIndex: 0,
            unavailableMembers: new Set()
        });
    }
    skipUnavailable(inboxId, memberId, isUnavailable) {
        const rotation = this.rotations.get(inboxId);
        if (!rotation)
            return;
        if (isUnavailable) {
            rotation.unavailableMembers.add(memberId);
        }
        else {
            rotation.unavailableMembers.delete(memberId);
        }
    }
    getNextAssignee(inboxId) {
        const rotation = this.rotations.get(inboxId);
        if (!rotation || rotation.memberIds.length === 0)
            return null;
        let attempts = 0;
        const totalMembers = rotation.memberIds.length;
        while (attempts < totalMembers) {
            const candidateId = rotation.memberIds[rotation.currentIndex];
            // Advance pointer
            rotation.currentIndex = (rotation.currentIndex + 1) % totalMembers;
            if (!rotation.unavailableMembers.has(candidateId)) {
                return candidateId;
            }
            attempts++;
        }
        // Everyone is unavailable
        return null;
    }
}
