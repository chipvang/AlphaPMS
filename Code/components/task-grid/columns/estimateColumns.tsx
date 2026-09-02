import type { TaskGridColumn } from "../taskGridTypes";

export const estimateColumns: TaskGridColumn[] = [
  { id: "quantity", group: "estimate", label: "Khối lượng", width: 86, alignment: "right", copyable: false },
  { id: "dailyQuantity", group: "estimate", label: "Sản lượng/ngày", width: 100, alignment: "right", copyable: false },
];
