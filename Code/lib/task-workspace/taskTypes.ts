import type { TaskDependency } from "../schedule/dependencies";

export type TaskItemType = "project" | "workItem" | "group" | "task";

export type TaskItem = {
  id: string;
  projectId: string;
  parentId: string | null;
  type: TaskItemType;
  wbs: string;
  name: string;
  duration: number;
  startDate: string;
  finishDate: string;
  progress: number;
  ganttLeft: number;
  ganttWidth: number;
  sortOrder?: number;
  nature?: string;
  critical?: boolean;
  delayed?: boolean;
  unit?: string;
  quantity?: number;
  machineShiftCoefficient?: number;
  machineCount?: number;
  managedLabor?: number;
  permanentLabor?: number;
  allocation?: {
    code: string;
    name: string;
    allocated: number;
    total: number;
    unit: string;
  };
};

export type TaskState = {
  items: TaskItem[];
  dependencies: TaskDependency[];
};
