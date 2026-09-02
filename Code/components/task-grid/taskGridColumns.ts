import { createBasicColumns } from "./columns/basicColumns";
import { estimateColumns } from "./columns/estimateColumns";
import { resourceColumns } from "./columns/resourceColumns";
import { createScheduleColumns } from "./columns/scheduleColumns";
import type { TaskGridColumn, TaskGridColumnGroupDefinition, TaskGridColumnGroupVisibility } from "./taskGridTypes";

export const taskGridColumnGroups: TaskGridColumnGroupDefinition[] = [
  { id: "basic", label: "Cơ bản", alwaysVisible: true },
  { id: "progress", label: "Tiến độ" },
  { id: "estimate", label: "Dự toán" },
  { id: "resource", label: "Nguồn lực" },
];

type TaskGridColumnSetOptions<Row> = {
  basicColumns: TaskGridColumn<Row>[];
  scheduleColumns: TaskGridColumn<Row>[];
  estimateColumns?: TaskGridColumn<Row>[];
  resourceColumns?: TaskGridColumn<Row>[];
};

export function createTaskGridColumns<Row>({
  basicColumns,
  scheduleColumns,
  estimateColumns: estimateColumnSet = estimateColumns as TaskGridColumn<Row>[],
  resourceColumns: resourceColumnSet = resourceColumns as TaskGridColumn<Row>[],
}: TaskGridColumnSetOptions<Row>) {
  return [...basicColumns, ...scheduleColumns, ...estimateColumnSet, ...resourceColumnSet];
}

export function getVisibleTaskGridColumns<Row>(
  columns: TaskGridColumn<Row>[],
  visibility: TaskGridColumnGroupVisibility,
  nameColumnWidth: number,
) {
  return columns.filter((column) => visibility[column.group]).map((column) =>
    column.id === "name" ? { ...column, width: nameColumnWidth } : column,
  );
}

export function getTaskGridColumnWidth<Row>(columns: TaskGridColumn<Row>[]) {
  return columns.reduce((sum, column) => sum + column.width, 0);
}

export function getTaskGridColumnGroupSpan<Row>(columns: TaskGridColumn<Row>[], groupId: TaskGridColumnGroupDefinition["id"]) {
  return columns.filter((column) => column.group === groupId).length;
}

export { createBasicColumns, createScheduleColumns, estimateColumns, resourceColumns };
