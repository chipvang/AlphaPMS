import type { TaskGridColumn } from "../taskGridTypes";

type BasicColumnFactoryOptions<Row> = {
  getNameCopyValue: (row: Row) => string;
  applyNamePasteValue: (value: string, row: Row) => Partial<Row>;
};

export function createBasicColumns<Row>({
  getNameCopyValue,
  applyNamePasteValue,
}: BasicColumnFactoryOptions<Row>): TaskGridColumn<Row>[] {
  return [
    { id: "order", group: "basic", label: "STT", width: 50, alignment: "center", copyable: false },
    { id: "actions", group: "basic", label: "Tác vụ", width: 75, alignment: "center", copyable: false },
    {
      id: "name",
      group: "basic",
      label: "Tên công việc",
      width: 350,
      minWidth: 350,
      alignment: "left",
      editable: true,
      copyable: true,
      getCopyValue: getNameCopyValue,
      applyPasteValue: (value, context) => applyNamePasteValue(value, context.row),
    },
    { id: "unit", group: "basic", label: "Đơn vị", width: 60, alignment: "left", copyable: false },
  ];
}
