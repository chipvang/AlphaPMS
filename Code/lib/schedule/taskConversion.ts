import type { TreeReorderItem } from "./treeReorder";

type TaskConversionItem = TreeReorderItem;

function compareDirectChildren<T extends TaskConversionItem>(items: T[], left: T, right: T) {
  const sortDifference = (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER);
  return sortDifference || items.indexOf(left) - items.indexOf(right);
}

export function convertTaskToGroupWithFollowingTasks<T extends TaskConversionItem>(
  items: T[],
  taskId: string,
  convertTask: (task: T) => T,
): T[] | null {
  const task = items.find((item) => item.id === taskId);
  if (!task || task.type !== "task") return null;

  const parent = items.find((item) => item.id === task.parentId);
  if (!parent || parent.type !== "workItem" || parent.projectId !== task.projectId) return null;

  const directChildren = items
    .filter((item) => item.parentId === parent.id)
    .sort((left, right) => compareDirectChildren(items, left, right));
  const taskIndex = directChildren.findIndex((item) => item.id === task.id);
  if (taskIndex < 0) return null;

  const adoptedTaskIds = new Set<string>();
  for (const sibling of directChildren.slice(taskIndex + 1)) {
    if (sibling.type === "group") break;
    if (sibling.type === "task") adoptedTaskIds.add(sibling.id);
  }

  const remainingParentChildren = directChildren.filter((item) => !adoptedTaskIds.has(item.id));
  const parentSortOrder = new Map(remainingParentChildren.map((item, index) => [item.id, index + 1]));
  const groupSortOrder = new Map([...adoptedTaskIds].map((id, index) => [id, index + 1]));

  return items.map((item) => {
    if (item.id === task.id) return { ...convertTask(item), sortOrder: parentSortOrder.get(item.id) };
    if (adoptedTaskIds.has(item.id)) return { ...item, parentId: task.id, sortOrder: groupSortOrder.get(item.id) };
    const normalizedSortOrder = parentSortOrder.get(item.id);
    return normalizedSortOrder == null ? item : { ...item, sortOrder: normalizedSortOrder };
  });
}
