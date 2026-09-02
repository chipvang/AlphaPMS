export type TaskGridColumnGroup = "basic" | "progress" | "estimate" | "resource";

export type TaskGridColumnAlignment = "left" | "center" | "right";

export type TaskGridColumnGroupVisibility = Record<TaskGridColumnGroup, boolean>;

export type TaskGridColumnPasteContext<Row> = {
  row: Row;
};

export type TaskGridColumn<Row = unknown> = {
  id: string;
  group: TaskGridColumnGroup;
  label: string;
  width: number;
  minWidth?: number;
  alignment?: TaskGridColumnAlignment;
  editable?: boolean;
  copyable: boolean;
  getCopyValue?: (row: Row) => string;
  applyPasteValue?: (value: string, context: TaskGridColumnPasteContext<Row>) => Partial<Row>;
};

export type TaskGridColumnGroupDefinition = {
  id: TaskGridColumnGroup;
  label: string;
  alwaysVisible?: boolean;
};
