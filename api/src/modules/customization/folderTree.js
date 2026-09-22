/**
 * Feature 48: Drag-and-Drop Folder Organization
 * Pure TypeScript nested folder tree hierarchy builder,
 * cycle detector, ordering calculator, and DnD state resolver.
 */
/**
 * Builds a hierarchical tree from a flat list of folder records.
 */
export function buildFolderTree(folders, emailCountsByFolder = {}) {
    const nodeMap = new Map();
    const rootNodes = [];
    // Sort by orderPriority ascending, then by name
    const sorted = [...folders].sort((a, b) => {
        const pA = a.orderPriority ?? 0;
        const pB = b.orderPriority ?? 0;
        if (pA !== pB)
            return pA - pB;
        return a.name.localeCompare(b.name);
    });
    // Initialize nodes
    for (const f of sorted) {
        nodeMap.set(f.id, {
            ...f,
            depth: 0,
            path: f.name,
            children: [],
            emailCount: emailCountsByFolder[f.id] || 0,
        });
    }
    // Build tree hierarchy
    for (const f of sorted) {
        const node = nodeMap.get(f.id);
        if (f.parentId && nodeMap.has(f.parentId)) {
            const parent = nodeMap.get(f.parentId);
            parent.children.push(node);
        }
        else {
            rootNodes.push(node);
        }
    }
    // Recursive pass to accurately compute depth and path
    const updateHierarchy = (nodes, currentDepth, parentPath) => {
        for (const node of nodes) {
            node.depth = currentDepth;
            node.path = parentPath ? `${parentPath} / ${node.name}` : node.name;
            if (node.children.length > 0) {
                updateHierarchy(node.children, currentDepth + 1, node.path);
            }
        }
    };
    updateHierarchy(rootNodes, 0);
    return rootNodes;
}
/**
 * Traverses descendant folder IDs to prevent circular hierarchy loops.
 */
export function getDescendantFolderIds(folderId, folders) {
    const descendants = new Set();
    const childrenMap = new Map();
    for (const f of folders) {
        if (f.parentId) {
            const existing = childrenMap.get(f.parentId) || [];
            existing.push(f.id);
            childrenMap.set(f.parentId, existing);
        }
    }
    const queue = [...(childrenMap.get(folderId) || [])];
    while (queue.length > 0) {
        const current = queue.shift();
        descendants.add(current);
        const nextChildren = childrenMap.get(current) || [];
        for (const childId of nextChildren) {
            if (!descendants.has(childId)) {
                queue.push(childId);
            }
        }
    }
    return descendants;
}
/**
 * Validates whether a drag item can be dropped onto target folder.
 */
export function validateFolderDrop(dragItem, targetFolderId, allFolders) {
    if (dragItem.type === 'email') {
        if (dragItem.sourceFolderId === targetFolderId) {
            return { valid: false, reason: 'Already in target folder', targetFolderId };
        }
        return { valid: true, targetFolderId };
    }
    if (dragItem.type === 'folder') {
        // Cannot drop folder onto itself
        if (dragItem.folderId === targetFolderId) {
            return { valid: false, reason: 'Cannot drop folder onto itself', targetFolderId };
        }
        // Cannot drop folder into one of its own descendants (would create cycle)
        const descendants = getDescendantFolderIds(dragItem.folderId, allFolders);
        if (descendants.has(targetFolderId)) {
            return { valid: false, reason: 'Cannot move folder into its own subfolder', targetFolderId };
        }
        return {
            valid: true,
            targetFolderId,
            newParentId: targetFolderId,
        };
    }
    return { valid: false, reason: 'Unknown drag item type', targetFolderId };
}
/**
 * Flattens a tree back to a depth-first list for select dropdowns or table rendering.
 */
export function flattenFolderTree(nodes) {
    const result = [];
    const traverse = (nodeList) => {
        for (const node of nodeList) {
            result.push(node);
            if (node.children.length > 0) {
                traverse(node.children);
            }
        }
    };
    traverse(nodes);
    return result;
}
