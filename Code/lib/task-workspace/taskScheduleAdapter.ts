import type { ProjectDto, WorkItemDto } from "../projects/types";
import type { TaskDependency } from "../schedule/dependencies";
import { recalculateTaskWbs } from "../../components/task-grid/taskTree";
import type { TaskItem } from "./taskTypes";

function isoToDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value;
}

function displayToIsoDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildScheduleItems(projects: ProjectDto[], records: WorkItemDto[]): TaskItem[] {
  const byProject = new Map<string, WorkItemDto[]>();
  records.forEach((record) => byProject.set(record.projectId, [...(byProject.get(record.projectId) ?? []), record]));
  const result: TaskItem[] = [];
  projects.forEach((project, projectIndex) => {
    result.push({ id: project.id, projectId: project.id, parentId: null, type: "project", wbs: String.fromCharCode(65 + projectIndex), name: project.name.toLocaleUpperCase("vi"), duration: 1, startDate: isoToDisplayDate(project.startDate), finishDate: isoToDisplayDate(project.finishDate), progress: project.progress, ganttLeft: 0, ganttWidth: 1 });
    const projectItems = byProject.get(project.id) ?? [];
    const children = new Map<string | null, WorkItemDto[]>();
    projectItems.forEach((item) => children.set(item.parentId, [...(children.get(item.parentId) ?? []), item]));
    children.forEach((items) => items.sort((a, b) => a.sortOrder - b.sortOrder));
    const append = (parentId: string | null, uiParentId: string) => {
      (children.get(parentId) ?? []).forEach((item) => {
        result.push({ ...item, parentId: uiParentId, wbs: "", startDate: isoToDisplayDate(item.startDate), finishDate: isoToDisplayDate(item.finishDate), machineShiftCoefficient: item.machineShiftFactor, managedLabor: item.nclm, ganttLeft: 0, ganttWidth: 1 });
        append(item.id, item.id);
      });
    };
    append(null, project.id);
  });
  return recalculateTaskWbs(result);
}

export function buildProjectSchedulePayload(projectId: string, items: TaskItem[], dependencies: TaskDependency[]) {
  const siblingCounts = new Map<string, number>();
  return {
    workItems: items.filter((item) => item.projectId === projectId && item.type !== "project").map((item) => {
      const parentId = item.parentId === projectId ? null : item.parentId;
      const siblingKey = parentId ?? "root";
      const sortOrder = (siblingCounts.get(siblingKey) ?? 0) + 1;
      siblingCounts.set(siblingKey, sortOrder);
      return {
        id: item.id, projectId, parentId, type: item.type, name: item.name,
        unit: item.type === "task" ? item.unit : null,
        quantity: item.type === "task" ? item.quantity : null,
        startDate: item.type === "task" ? displayToIsoDate(item.startDate) : null,
        finishDate: item.type === "task" ? displayToIsoDate(item.finishDate) : null,
        duration: item.type === "task" ? item.duration : 1,
        progress: item.type === "task" ? item.progress : 0,
        machineShiftFactor: item.type === "task" ? item.machineShiftCoefficient : null,
        nclm: item.type === "task" ? item.managedLabor : null,
        permanentLabor: item.type === "task" ? item.permanentLabor : null,
        sortOrder,
      };
    }),
    dependencies: dependencies.filter((dependency) => dependency.projectId === projectId).map((dependency) => ({
      predecessorTaskId: dependency.predecessorTaskId,
      successorTaskId: dependency.successorTaskId,
      dependencyType: dependency.dependencyType,
      lagDays: dependency.lag,
    })),
  };
}
