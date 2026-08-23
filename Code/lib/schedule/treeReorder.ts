export type TreeItemType = "project" | "workItem" | "group" | "task";

export type TreeReorderItem = { id: string; projectId: string; parentId: string | null; type: TreeItemType; sortOrder?: number };

export type TreeInsertionSlot = {
  id: string;
  targetParentId: string;
  targetIndex: number;
  depth: number;
  lineItemId: string;
  lineEdge: "before" | "after";
};

function isDescendant<T extends TreeReorderItem>(item: T, ancestorId: string, itemById: Map<string, T>) {
  for (let parentId = item.parentId; parentId; parentId = itemById.get(parentId)?.parentId ?? null) {
    if (parentId === ancestorId) return true;
  }
  return false;
}

function canContain(parentType: TreeItemType, childType: TreeItemType) {
  if (parentType === "project") return childType === "workItem";
  if (parentType === "workItem") return childType === "group" || childType === "task";
  return parentType === "group" && childType === "task";
}

function getDepth<T extends TreeReorderItem>(item: T, itemById: Map<string, T>) {
  let depth = 0;
  for (let parentId = item.parentId; parentId; parentId = itemById.get(parentId)?.parentId ?? null) depth += 1;
  return depth;
}

export function buildTreeInsertionSlots<T extends TreeReorderItem>(items: T[], visibleItemIds: string[], draggedId: string): TreeInsertionSlot[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const dragged = itemById.get(draggedId);
  if (!dragged || dragged.type === "project") return [];
  const visibleIds = new Set(visibleItemIds);
  const visibleIndex = new Map(visibleItemIds.map((id, index) => [id, index]));
  const excludedIds = new Set(items.filter((item) => item.id === draggedId || isDescendant(item, draggedId, itemById)).map((item) => item.id));
  const slots: TreeInsertionSlot[] = [];

  for (const parent of items) {
    if (!visibleIds.has(parent.id) || parent.projectId !== dragged.projectId || excludedIds.has(parent.id) || !canContain(parent.type, dragged.type)) continue;
    const siblings = items.filter((item) => item.parentId === parent.id && !excludedIds.has(item.id));
    for (let targetIndex = 0; targetIndex <= siblings.length; targetIndex += 1) {
      let lineItemId = parent.id;
      let lineEdge: "before" | "after" = "after";
      if (targetIndex < siblings.length) {
        const nextSibling = siblings[targetIndex];
        if (!visibleIds.has(nextSibling.id)) continue;
        lineItemId = nextSibling.id;
        lineEdge = "before";
      } else if (siblings.length) {
        const lastSibling = siblings.at(-1)!;
        const lastVisibleDescendant = visibleItemIds
          .filter((id) => {
            const item = itemById.get(id);
            return item && (item.id === lastSibling.id || isDescendant(item, lastSibling.id, itemById));
          })
          .sort((a, b) => (visibleIndex.get(a) ?? 0) - (visibleIndex.get(b) ?? 0))
          .at(-1);
        if (!lastVisibleDescendant) continue;
        lineItemId = lastVisibleDescendant;
        lineEdge = "after";
      }
      slots.push({ id: `${parent.id}:${targetIndex}`, targetParentId: parent.id, targetIndex, depth: getDepth(parent, itemById) + 1, lineItemId, lineEdge });
    }
  }
  return slots;
}

export function moveTreeItemToSlot<T extends TreeReorderItem>(items: T[], draggedId: string, slot: Pick<TreeInsertionSlot, "targetParentId" | "targetIndex">): T[] | null {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const dragged = itemById.get(draggedId);
  const targetParent = itemById.get(slot.targetParentId);
  if (!dragged || !targetParent || dragged.type === "project" || dragged.projectId !== targetParent.projectId || !canContain(targetParent.type, dragged.type)) return null;
  if (targetParent.id === dragged.id || isDescendant(targetParent, dragged.id, itemById)) return null;

  const draggedIndex = items.findIndex((item) => item.id === draggedId);
  let branchEnd = draggedIndex + 1;
  while (branchEnd < items.length && isDescendant(items[branchEnd], draggedId, itemById)) branchEnd += 1;
  const branch = items.slice(draggedIndex, branchEnd);
  const remaining = [...items.slice(0, draggedIndex), ...items.slice(branchEnd)];
  const remainingById = new Map(remaining.map((item) => [item.id, item]));
  const siblings = remaining.filter((item) => item.parentId === targetParent.id);
  const targetIndex = Math.max(0, Math.min(slot.targetIndex, siblings.length));
  let insertIndex: number;
  if (targetIndex < siblings.length) {
    insertIndex = remaining.findIndex((item) => item.id === siblings[targetIndex].id);
  } else if (siblings.length) {
    const lastSibling = siblings.at(-1)!;
    insertIndex = remaining.findIndex((item) => item.id === lastSibling.id) + 1;
    while (insertIndex < remaining.length && isDescendant(remaining[insertIndex], lastSibling.id, remainingById)) insertIndex += 1;
  } else {
    insertIndex = remaining.findIndex((item) => item.id === targetParent.id) + 1;
  }

  const movedBranch = branch.map((item, index) => index === 0 ? { ...item, parentId: targetParent.id } : item);
  const moved = [...remaining.slice(0, insertIndex), ...movedBranch, ...remaining.slice(insertIndex)];
  const affectedParentIds = new Set([dragged.parentId, targetParent.id]);
  const siblingCounts = new Map<string, number>();
  const normalized = moved.map((item) => {
    if (!affectedParentIds.has(item.parentId)) return item;
    const key = `${item.projectId}:${item.parentId ?? "root"}`;
    const sortOrder = (siblingCounts.get(key) ?? 0) + 1;
    siblingCounts.set(key, sortOrder);
    return { ...item, sortOrder };
  });
  const unchanged = normalized.every((item, index) => item.id === items[index]?.id && item.parentId === items[index]?.parentId);
  return unchanged ? null : normalized;
}
