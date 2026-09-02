import type { TaskGridColumn } from "../taskGridTypes";

type ScheduleColumnFactoryOptions<Row> = {
  getDurationCopyValue: (row: Row) => string;
  applyDurationPasteValue: (value: string, row: Row) => Partial<Row>;
  getStartDateCopyValue: (row: Row) => string;
  applyStartDatePasteValue: (value: string, row: Row) => Partial<Row>;
  getFinishDateCopyValue: (row: Row) => string;
  applyFinishDatePasteValue: (value: string, row: Row) => Partial<Row>;
  getStatusCopyValue: (row: Row) => string;
};

export function createScheduleColumns<Row>({
  getDurationCopyValue,
  applyDurationPasteValue,
  getStartDateCopyValue,
  applyStartDatePasteValue,
  getFinishDateCopyValue,
  applyFinishDatePasteValue,
  getStatusCopyValue,
}: ScheduleColumnFactoryOptions<Row>): TaskGridColumn<Row>[] {
  return [
    {
      id: "duration",
      group: "progress",
      label: "Thời lượng",
      width: 74,
      alignment: "center",
      editable: true,
      copyable: true,
      getCopyValue: getDurationCopyValue,
      applyPasteValue: (value, context) => applyDurationPasteValue(value, context.row),
    },
    {
      id: "startDate",
      group: "progress",
      label: "Bắt đầu",
      width: 92,
      alignment: "left",
      editable: true,
      copyable: true,
      getCopyValue: getStartDateCopyValue,
      applyPasteValue: (value, context) => applyStartDatePasteValue(value, context.row),
    },
    {
      id: "finishDate",
      group: "progress",
      label: "Kết thúc",
      width: 92,
      alignment: "left",
      editable: true,
      copyable: true,
      getCopyValue: getFinishDateCopyValue,
      applyPasteValue: (value, context) => applyFinishDatePasteValue(value, context.row),
    },
    { id: "predecessors", group: "progress", label: "Trước", width: 50, alignment: "center", editable: true, copyable: false },
    {
      id: "status",
      group: "progress",
      label: "Tình trạng",
      width: 115,
      alignment: "left",
      copyable: true,
      getCopyValue: getStatusCopyValue,
    },
  ];
}
