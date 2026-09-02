import type { TaskGridColumn } from "../taskGridTypes";

export const resourceColumns: TaskGridColumn[] = [
  { id: "machineShiftCoefficient", group: "resource", label: "HSM", width: 50, alignment: "right", copyable: false },
  { id: "machineCount", group: "resource", label: "SLM", width: 50, alignment: "right", copyable: false },
  { id: "managedLabor", group: "resource", label: "NCLM", width: 60, alignment: "right", copyable: false },
  { id: "permanentLabor", group: "resource", label: "NCCH", width: 60, alignment: "right", copyable: false },
];
