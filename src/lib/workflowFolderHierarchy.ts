import type { WorkflowFolder } from "@/hooks/useWorkflowFolders";

export interface FolderNode extends WorkflowFolder {
  children: FolderNode[];
  depth: number;
}

/**
 * Builds a hierarchical tree of folders from flat list
 */
export function buildFolderTree(folders: WorkflowFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  for (const f of folders) {
    map.set(f.id, { ...f, children: [], depth: 0 });
  }

  const roots: FolderNode[] = [];
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId) && f.parentId !== f.id) {
      const parent = map.get(f.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Set depth recursively
  function setDepth(nodes: FolderNode[], depth: number) {
    for (const node of nodes) {
      node.depth = depth;
      setDepth(node.children, depth + 1);
    }
  }
  setDepth(roots, 0);

  return roots;
}

/**
 * Flattens the hierarchical tree in visual display order with depth
 */
export function flattenFolderTree(nodes: FolderNode[]): FolderNode[] {
  const result: FolderNode[] = [];
  function traverse(list: FolderNode[]) {
    for (const item of list) {
      result.push(item);
      if (item.children.length > 0) {
        traverse(item.children);
      }
    }
  }
  traverse(nodes);
  return result;
}

/**
 * Returns all folder IDs that are descendants of targetFolderId (plus targetFolderId itself)
 */
export function getFolderAndDescendantIds(targetFolderId: string, folders: WorkflowFolder[]): string[] {
  const result: string[] = [targetFolderId];
  const childrenMap = new Map<string, string[]>();
  for (const f of folders) {
    if (f.parentId) {
      const existing = childrenMap.get(f.parentId) || [];
      existing.push(f.id);
      childrenMap.set(f.parentId, existing);
    }
  }

  function addChildren(id: string) {
    const children = childrenMap.get(id) || [];
    for (const childId of children) {
      if (!result.includes(childId)) {
        result.push(childId);
        addChildren(childId);
      }
    }
  }
  addChildren(targetFolderId);
  return result;
}

/**
 * Checks if targetParentId is a descendant of folderId (to prevent cycles)
 */
export function isDescendantOf(folderId: string, potentialChildId: string, folders: WorkflowFolder[]): boolean {
  if (folderId === potentialChildId) return true;
  const descendants = getFolderAndDescendantIds(folderId, folders);
  return descendants.includes(potentialChildId);
}
