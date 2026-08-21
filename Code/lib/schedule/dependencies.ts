export type DependencyType = "FS" | "SS" | "FF" | "SF";

export type TaskDependency = {
  id: string;
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: DependencyType;
  lag: number;
};

export type DependencyTask = {
  id: string;
  projectId: string;
  type: string;
};

export type ScheduledDependencyTask = DependencyTask & {
  startDate: string;
  finishDate: string;
  duration: number;
};

export type DependencyValidationResult = { isValid: true } | { isValid: false; message: string };

export function createsDependencyCycle(dependencies: TaskDependency[], predecessorTaskId: string, successorTaskId: string) {
  const successorsByTask = new Map<string, string[]>();
  dependencies.forEach((dependency) => {
    const successors = successorsByTask.get(dependency.predecessorTaskId) ?? [];
    successors.push(dependency.successorTaskId);
    successorsByTask.set(dependency.predecessorTaskId, successors);
  });
  const pending = [successorTaskId];
  const visited = new Set<string>();
  while (pending.length) {
    const taskId = pending.pop()!;
    if (taskId === predecessorTaskId) return true;
    if (visited.has(taskId)) continue;
    visited.add(taskId);
    pending.push(...(successorsByTask.get(taskId) ?? []));
  }
  return false;
}

export function validateTaskDependency(
  candidate: TaskDependency,
  dependencies: TaskDependency[],
  tasks: DependencyTask[],
): DependencyValidationResult {
  const predecessor = tasks.find((task) => task.id === candidate.predecessorTaskId);
  const successor = tasks.find((task) => task.id === candidate.successorTaskId);
  if (!predecessor || !successor || predecessor.type !== "task" || successor.type !== "task") {
    return { isValid: false, message: "Chỉ công tác thực hiện mới được tạo quan hệ" };
  }
  if (predecessor.id === successor.id) return { isValid: false, message: "Không thể liên kết công tác với chính nó" };
  if (predecessor.projectId !== successor.projectId) return { isValid: false, message: "V1 chưa cho phép quan hệ giữa hai dự án" };
  if (dependencies.some((dependency) => dependency.id !== candidate.id
    && dependency.predecessorTaskId === candidate.predecessorTaskId
    && dependency.successorTaskId === candidate.successorTaskId)) {
    return { isValid: false, message: "Quan hệ giữa hai công tác đã tồn tại" };
  }
  const dependenciesWithoutCandidate = dependencies.filter((dependency) => dependency.id !== candidate.id);
  if (createsDependencyCycle(dependenciesWithoutCandidate, candidate.predecessorTaskId, candidate.successorTaskId)) {
    return { isValid: false, message: "Quan hệ này tạo thành vòng phụ thuộc" };
  }
  return { isValid: true };
}

export function formatDependencyLabel(dependency: TaskDependency, orderByTaskId: Map<string, string>) {
  const order = orderByTaskId.get(dependency.predecessorTaskId) ?? "?";
  const lag = dependency.lag > 0 ? `+${dependency.lag}` : dependency.lag < 0 ? String(dependency.lag) : "";
  return `${order}${dependency.dependencyType}${lag}`;
}

function parseScheduleDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(2000 + Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  return date.getUTCDate() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 ? date : null;
}

function formatScheduleDate(date: Date) {
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCFullYear() % 100).padStart(2, "0")}`;
}

function addScheduleDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function calculateFsRequiredStart(predecessorFinish: Date, lag: number) {
  const normalizedLag = Math.trunc(lag);
  return addScheduleDays(predecessorFinish, normalizedLag < 0 ? normalizedLag : normalizedLag + 1);
}

export function calculateDependencyConstraint(
  predecessor: ScheduledDependencyTask,
  successorDuration: number,
  dependencyType: DependencyType,
  lag: number,
) {
  const predecessorStart = parseScheduleDate(predecessor.startDate);
  const predecessorFinish = parseScheduleDate(predecessor.finishDate);
  if (!predecessorStart || !predecessorFinish) return null;
  const duration = Math.max(1, Math.trunc(successorDuration));
  if (dependencyType === "FS") return calculateFsRequiredStart(predecessorFinish, lag);
  const baseDate = dependencyType === "SS" || dependencyType === "SF" ? predecessorStart : predecessorFinish;
  const startOffset = dependencyType === "FF" || dependencyType === "SF" ? lag - duration + 1 : lag;
  return addScheduleDays(baseDate, startOffset);
}

export function propagateDependencySchedule<T extends ScheduledDependencyTask>(
  tasks: T[],
  dependencies: TaskDependency[],
  changedTaskIds: Iterable<string>,
) {
  const nextTasks = tasks.map((task) => ({ ...task }));
  const taskById = new Map(nextTasks.map((task) => [task.id, task]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, TaskDependency[]>();
  dependencies.forEach((dependency) => {
    outgoing.set(dependency.predecessorTaskId, [...(outgoing.get(dependency.predecessorTaskId) ?? []), dependency.successorTaskId]);
    incoming.set(dependency.successorTaskId, [...(incoming.get(dependency.successorTaskId) ?? []), dependency]);
  });

  const affected = new Set<string>();
  const pending = [...changedTaskIds];
  while (pending.length) {
    const taskId = pending.shift()!;
    for (const successorId of outgoing.get(taskId) ?? []) {
      if (affected.has(successorId)) continue;
      affected.add(successorId);
      pending.push(successorId);
    }
  }

  const unresolvedPredecessors = new Map<string, number>();
  affected.forEach((taskId) => {
    const count = (incoming.get(taskId) ?? []).filter((dependency) => affected.has(dependency.predecessorTaskId)).length;
    unresolvedPredecessors.set(taskId, count);
  });
  const ready = [...affected].filter((taskId) => unresolvedPredecessors.get(taskId) === 0);
  while (ready.length) {
    const taskId = ready.shift()!;
    const task = taskById.get(taskId);
    const taskDependencies = incoming.get(taskId) ?? [];
    if (task && task.type === "task" && taskDependencies.length) {
      const constraints = taskDependencies.flatMap((dependency) => {
        const predecessor = taskById.get(dependency.predecessorTaskId);
        const constraint = predecessor
          ? calculateDependencyConstraint(predecessor, task.duration, dependency.dependencyType, dependency.lag)
          : null;
        return constraint ? [constraint] : [];
      });
      if (constraints.length) {
        const start = new Date(Math.max(...constraints.map((date) => date.getTime())));
        task.startDate = formatScheduleDate(start);
        task.finishDate = formatScheduleDate(addScheduleDays(start, Math.max(1, task.duration) - 1));
      }
    }
    for (const successorId of outgoing.get(taskId) ?? []) {
      if (!affected.has(successorId)) continue;
      const remaining = (unresolvedPredecessors.get(successorId) ?? 0) - 1;
      unresolvedPredecessors.set(successorId, remaining);
      if (remaining === 0) ready.push(successorId);
    }
  }
  return nextTasks;
}
