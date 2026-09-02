"use client";

import { useEffect, useRef, useState } from "react";

export type TaskEstimateItem = {
  id: string;
  taskItemId: string;
  normCode: string;
  alphaCode: string;
  name: string;
  unit: string;
  componentName: string;
  componentCount: number;
  length?: number;
  width?: number;
  height?: number;
  coefficient: number;
  extraQuantity: number;
  quantity: number;
};

type EditableField = Exclude<keyof TaskEstimateItem, "id" | "taskItemId">;

type TaskEstimateItemGridProps = {
  items: TaskEstimateItem[];
  selectedItemId: string | null;
  taskItemLabel: string;
  onSelect: (taskEstimateItemId: string) => void;
  onAdd: () => void;
  onUpdate: (taskEstimateItemId: string, changes: Partial<Omit<TaskEstimateItem, "id" | "taskItemId">>) => void;
  onDelete: (taskEstimateItemId: string) => void;
  onReorder: (taskEstimateItemId: string, direction: -1 | 1) => void;
  onRequestNormLookup: (taskEstimateItemId: string) => void;
};

const columns: Array<{ field: EditableField; label: string; numeric?: boolean }> = [
  { field: "normCode", label: "Mã định mức" },
  { field: "alphaCode", label: "Mã Alpha" },
  { field: "name", label: "Tên công tác dự toán" },
  { field: "unit", label: "Đơn vị" },
  { field: "componentName", label: "Tên cấu kiện" },
  { field: "componentCount", label: "Số cấu kiện", numeric: true },
  { field: "length", label: "Dài", numeric: true },
  { field: "width", label: "Rộng", numeric: true },
  { field: "height", label: "Cao", numeric: true },
  { field: "coefficient", label: "Hệ số", numeric: true },
  { field: "extraQuantity", label: "KL phụ", numeric: true },
  { field: "quantity", label: "Khối lượng", numeric: true },
];

const formatNumber = (value?: number) => value == null ? "" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);

function isNumericField(field: EditableField) {
  return columns.find((column) => column.field === field)?.numeric ?? false;
}

export function TaskEstimateItemGrid({
  items,
  selectedItemId,
  taskItemLabel,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onRequestNormLookup,
}: TaskEstimateItemGridProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingCell]);

  function commit(item: TaskEstimateItem, field: EditableField, rawValue: string) {
    if (isNumericField(field)) {
      const value = rawValue.trim() === "" ? undefined : Number(rawValue.replace(",", "."));
      if (value !== undefined && Number.isNaN(value)) return;
      onUpdate(item.id, { [field]: value } as Partial<Omit<TaskEstimateItem, "id" | "taskItemId">>);
    } else {
      onUpdate(item.id, { [field]: rawValue } as Partial<Omit<TaskEstimateItem, "id" | "taskItemId">>);
    }
    setEditingCell(null);
  }

  return <section className="estimate-pane estimate-item-pane">
    <header className="estimate-pane-header">
      <h2>CÔNG TÁC DỰ TOÁN (TASK ESTIMATE ITEM)</h2>
      <p>Công tác tiến độ đang chọn: <strong>{taskItemLabel}</strong></p>
    </header>
    <div className="estimate-table-wrap">
      <table className="estimate-data-grid">
        <thead>
          <tr><th>STT</th><th>Tác vụ</th>{columns.map((column) => <th key={column.field}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((item, index) => <tr key={item.id} className={item.id === selectedItemId ? "selected" : ""} onClick={() => onSelect(item.id)}>
            <td>{index + 1}</td>
            <td className="estimate-actions">
              <div className="row-actions estimate-row-actions">
                <button type="button" className="action-slot-add" aria-label="Thêm công tác dự toán" title="Thêm công tác dự toán" onClick={(event) => { event.stopPropagation(); onAdd(); }}>+</button>
                <button type="button" className="action-slot-insert-above" aria-label="Đưa lên" title="Đưa lên" onClick={(event) => { event.stopPropagation(); onReorder(item.id, -1); }}>▲</button>
                <button type="button" className="action-slot-insert-below" aria-label="Đưa xuống" title="Đưa xuống" onClick={(event) => { event.stopPropagation(); onReorder(item.id, 1); }}>▼</button>
                <button type="button" className="action-slot-delete" aria-label="Xóa công tác dự toán" title="Xóa công tác dự toán" onClick={(event) => { event.stopPropagation(); onDelete(item.id); }}>⌫</button>
              </div>
            </td>
            {columns.map((column) => {
              const isEditing = editingCell?.id === item.id && editingCell.field === column.field;
              const value = item[column.field];
              return <td key={column.field} className={column.numeric ? "estimate-numeric" : undefined}>
                {isEditing ? <input
                  ref={inputRef}
                  className="estimate-inline-input"
                  defaultValue={column.numeric ? String(value ?? "") : String(value ?? "")}
                  inputMode={column.numeric ? "decimal" : undefined}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={(event) => commit(item, column.field, event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setEditingCell(null);
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commit(item, column.field, event.currentTarget.value);
                      if (column.field === "normCode") onRequestNormLookup(item.id);
                    }
                  }}
                /> : <button type="button" className="estimate-cell-value" onClick={(event) => { event.stopPropagation(); onSelect(item.id); setEditingCell({ id: item.id, field: column.field }); }}>
                  {column.numeric ? formatNumber(value as number | undefined) : String(value ?? "")}
                </button>}
              </td>;
            })}
          </tr>)}
          {!items.length && <tr><td colSpan={14} className="estimate-empty">Chưa có công tác dự toán cho dòng đang chọn.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
