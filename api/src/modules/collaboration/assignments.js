/**
 * Feature 22: Email Assignment & Delegation
 *
 * Provides pure TypeScript state machines and workload balance tracking for delegating
 * email threads among team members, tracking assignment lifecycles, and managing status workflows.
 */
// Allowed state transitions in assignment lifecycle state machine
const ALLOWED_TRANSITIONS = {
    unassigned: ['in_progress', 'waiting', 'resolved'],
    in_progress: ['waiting', 'resolved', 'unassigned'],
    waiting: ['in_progress', 'resolved', 'unassigned'],
    resolved: ['in_progress', 'unassigned', 'waiting'],
};
/**
 * Validates whether a proposed status transition conforms to the lifecycle state machine.
 */
export function isValidStatusTransition(current, next) {
    if (current === next)
        return true;
    const allowed = ALLOWED_TRANSITIONS[current];
    return allowed ? allowed.includes(next) : false;
}
/**
 * Executes an assignment update or reassignment, enforcing lifecycle rules and recording immutable history.
 */
export function assignEmailThread(current, params) {
    const now = new Date();
    const prevAssignee = current ? current.assignedToUserId : null;
    const prevStatus = current ? current.status : 'unassigned';
    let nextAssignee = params.assignedToUserId !== undefined ? params.assignedToUserId : prevAssignee;
    let nextStatus = params.status || (nextAssignee ? (prevStatus === 'unassigned' ? 'in_progress' : prevStatus) : 'unassigned');
    // If unassigning, default status to 'unassigned' unless explicitly requested otherwise
    if (!nextAssignee) {
        nextAssignee = null;
        if (!params.status) {
            nextStatus = 'unassigned';
        }
    }
    if (!isValidStatusTransition(prevStatus, nextStatus)) {
        throw new Error(`Invalid status transition from '${prevStatus}' to '${nextStatus}'`);
    }
    const historyItem = {
        timestamp: now,
        actorUserId: params.assignedByUserId,
        previousAssignee: prevAssignee,
        newAssignee: nextAssignee,
        previousStatus: prevStatus,
        newStatus: nextStatus,
        note: params.note,
    };
    const assignment = {
        id: current ? current.id : params.id,
        emailId: params.emailId,
        assignedToUserId: nextAssignee,
        assignedByUserId: params.assignedByUserId,
        status: nextStatus,
        note: params.note || current?.note,
        history: current ? [...current.history, historyItem] : [historyItem],
        updatedAt: now,
        createdAt: current ? current.createdAt : now,
    };
    return { assignment, historyItem };
}
/**
 * Filters assignment records based on specified query filters.
 */
export function filterAssignments(assignments, filters) {
    return assignments.filter(item => {
        if (filters.unassignedOnly && item.assignedToUserId !== null) {
            return false;
        }
        if (filters.assignedOnly && item.assignedToUserId === null) {
            return false;
        }
        if (filters.userId && item.assignedToUserId !== filters.userId) {
            return false;
        }
        if (filters.status && item.status !== filters.status) {
            return false;
        }
        return true;
    });
}
/**
 * Computes workload balance metrics across all team members.
 */
export function calculateTeamWorkload(assignments) {
    const metrics = {};
    for (const item of assignments) {
        if (!item.assignedToUserId)
            continue;
        const uid = item.assignedToUserId;
        if (!metrics[uid]) {
            metrics[uid] = {
                userId: uid,
                totalAssigned: 0,
                inProgress: 0,
                waiting: 0,
                resolved: 0,
                activeLoad: 0,
            };
        }
        metrics[uid].totalAssigned += 1;
        if (item.status === 'in_progress') {
            metrics[uid].inProgress += 1;
            metrics[uid].activeLoad += 1;
        }
        else if (item.status === 'waiting') {
            metrics[uid].waiting += 1;
            metrics[uid].activeLoad += 1;
        }
        else if (item.status === 'resolved') {
            metrics[uid].resolved += 1;
        }
    }
    return metrics;
}
/**
 * State manager for thread assignments.
 */
export class AssignmentManager {
    assignments = new Map(); // emailId -> record
    assign(params) {
        const existing = this.assignments.get(params.emailId) || null;
        const { assignment } = assignEmailThread(existing, params);
        this.assignments.set(params.emailId, assignment);
        return assignment;
    }
    get(emailId) {
        return this.assignments.get(emailId);
    }
    list(filters = {}) {
        return filterAssignments(Array.from(this.assignments.values()), filters);
    }
    getWorkload() {
        return calculateTeamWorkload(Array.from(this.assignments.values()));
    }
}
