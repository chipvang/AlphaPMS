export type ProjectStatus = "Đang thực hiện" | "Chuẩn bị" | "Tạm dừng" | "Hoàn thành";

export type ProjectDto = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  finishDate: string;
  investor: string;
  location: string;
  manager: string;
  budget: number;
  progress: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectInput = Omit<ProjectDto, "id" | "createdAt" | "updatedAt">;

export type WorkItemType = "workItem" | "group" | "task";

export type WorkItemDto = {
  id: string;
  projectId: string;
  parentId: string | null;
  type: WorkItemType;
  name: string;
  unit?: string;
  quantity?: number;
  startDate: string;
  finishDate: string;
  duration: number;
  progress: number;
  machineShiftFactor?: number;
  nclm?: number;
  permanentLabor?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskDependencyDto = {
  id: string;
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: "FS" | "SS" | "FF" | "SF";
  lagDays: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkItemInput = Omit<WorkItemDto, "id" | "createdAt" | "updatedAt"> & { id?: string };

export type ProjectScheduleDto = {
  workItems: WorkItemDto[];
  dependencies: TaskDependencyDto[];
};

export type ApiErrorBody = { error: { code: string; message: string; details?: Record<string, string> } };
