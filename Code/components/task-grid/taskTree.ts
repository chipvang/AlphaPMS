import type { TaskItem } from "../../lib/task-workspace/taskTypes";

export function getTaskTreeDepth(item: TaskItem, itemById: Map<string, TaskItem>) {
  let depth = 0;
  for (let parentId = item.parentId; parentId; parentId = itemById.get(parentId)?.parentId ?? null) depth += 1;
  return depth;
}

export function calculateTaskOrder(items: TaskItem[]) {
  const result = new Map<string, string>();
  const siblingCounters = new Map<string, number>();
  let projectIndex = 0;
  const roman = (value: number) => {
    const symbols: Array<[number, string]> = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let remaining = Math.max(1, Math.trunc(value));
    return symbols.reduce((result, [number, symbol]) => { while (remaining >= number) { result += symbol; remaining -= number; } return result; }, "");
  };
  const alphabetic = (value: number) => { let remaining = Math.max(1, Math.trunc(value)); let result = ""; while (remaining > 0) { remaining -= 1; result = String.fromCharCode(65 + (remaining % 26)) + result; remaining = Math.floor(remaining / 26); } return result; };
  items.forEach((item) => {
    if (item.type === "project") { projectIndex += 1; result.set(item.id, alphabetic(projectIndex)); return; }
    const key = `${item.parentId ?? item.projectId}:${item.type}`;
    const index = (siblingCounters.get(key) ?? 0) + 1;
    siblingCounters.set(key, index);
    result.set(item.id, item.type === "workItem" ? roman(index) : item.type === "group" ? `${result.get(item.parentId ?? "") ?? "I"}.${index}` : String(index));
  });
  return result;
}

export function recalculateTaskWbs(items: TaskItem[]) {
  const byId = new Map<string, TaskItem>();
  const childCounts = new Map<string, number>();
  return items.map((item) => {
    if (!item.parentId) { const root = { ...item }; byId.set(root.id, root); return root; }
    const count = (childCounts.get(item.parentId) ?? 0) + 1;
    childCounts.set(item.parentId, count);
    const next = { ...item, wbs: `${byId.get(item.parentId)?.wbs ?? item.wbs}.${count}` };
    byId.set(next.id, next);
    return next;
  });
}

export function insertTaskChild(items: TaskItem[], parent: TaskItem, newItem: TaskItem, placement: "first" | "last" = "last") {
  const byId = new Map(items.map((item) => [item.id, item]));
  let index = items.findIndex((item) => item.id === parent.id) + 1;
  if (placement === "last") while (index < items.length && isTaskDescendant(items[index], parent.id, byId)) index += 1;
  return recalculateTaskWbs([...items.slice(0, index), newItem, ...items.slice(index)]);
}

export function insertTaskSibling(items: TaskItem[], context: TaskItem, newItem: TaskItem, position: "before" | "after") {
  const byId = new Map(items.map((item) => [item.id, item]));
  let index = items.findIndex((item) => item.id === context.id);
  if (position === "after") { index += 1; while (index < items.length && isTaskDescendant(items[index], context.id, byId)) index += 1; }
  return recalculateTaskWbs([...items.slice(0, index), newItem, ...items.slice(index)]);
}

export function removeTaskSubtree(items: TaskItem[], targetId: string) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const removedIds = new Set(items.filter((item) => item.id === targetId || isTaskDescendant(item, targetId, byId)).map((item) => item.id));
  return { items: recalculateTaskWbs(items.filter((item) => !removedIds.has(item.id))), removedIds };
}

function isTaskDescendant(item: TaskItem, ancestorId: string, byId: Map<string, TaskItem>) {
  for (let parentId = item.parentId; parentId; parentId = byId.get(parentId)?.parentId ?? null) if (parentId === ancestorId) return true;
  return false;
}
