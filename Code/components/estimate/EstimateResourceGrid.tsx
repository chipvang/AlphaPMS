"use client";

import { useEffect, useRef, useState } from "react";

export type EstimateResourceType = "material" | "labor" | "machine";

export type TaskEstimateResource = {
  id: string;
  taskEstimateItemId: string;
  resourceId: string;
  type: EstimateResourceType;
  code: string;
  name: string;
  unit: string;
  baseConsumption: number;
  adjustedConsumption: number;
  coefficient: number;
  demand: number;
};

export type TaskItemResource = {
  id: string;
  taskItemId: string;
  resourceId: string;
  type: EstimateResourceType;
  code: string;
  name: string;
  unit: string;
  baseConsumption: number;
  adjustedConsumption: number;
  coefficient: number;
  demand: number;
};

type EditableField = "code" | "name" | "unit" | "baseConsumption" | "adjustedConsumption" | "coefficient";

type EstimateResourceGridProps = {
  mode: "estimate" | "summary";
  resourceType: EstimateResourceType;
  selectedEstimateItemLabel: string;
  selectedTaskItemLabel: string;
  taskEstimateResources: TaskEstimateResource[];
  taskItemResources: TaskItemResource[];
  onModeChange: (mode: "estimate" | "summary") => void;
  onResourceTypeChange: (type: EstimateResourceType) => void;
  onAdd: () => void;
  onUpdate: (taskEstimateResourceId: string, changes: Partial<Omit<TaskEstimateResource, "id" | "taskEstimateItemId" | "resourceId" | "type" | "demand">>) => void;
  onDelete: (taskEstimateResourceId: string) => void;
  onReorder: (taskEstimateResourceId: string, direction: -1 | 1) => void;
};

const columns: Array<{ field: EditableField; label: string; numeric?: boolean }> = [
  { field: "code", label: "Mã tài nguyên" },
  { field: "name", label: "Tên tài nguyên" },
  { field: "unit", label: "Đơn vị" },
  { field: "baseConsumption", label: "Hao phí gốc", numeric: true },
  { field: "adjustedConsumption", label: "Hao phí ĐC", numeric: true },
  { field: "coefficient", label: "Hệ số", numeric: true },
];

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);

export function EstimateResourceGrid({
  mode,
  resourceType,
  selectedEstimateItemLabel,
  selectedTaskItemLabel,
  taskEstimateResources,
  taskItemResources,
  onModeChange,
  onResourceTypeChange,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: EstimateResourceGridProps) {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isReadOnly = mode === "summary";
  const resources = (isReadOnly ? taskItemResources : taskEstimateResources).filter((resource) => resource.type === resourceType);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingCell]);

  function commit(resource: TaskEstimateResource, field: EditableField, rawValue: string) {
    if (columns.find((column) => column.field === field)?.numeric) {
      const value = Number(rawValue.replace(",", "."));
      if (Number.isNaN(value)) return;
      onUpdate(resource.id, { [field]: value } as Partial<Omit<TaskEstimateResource, "id" | "taskEstimateItemId" | "resourceId" | "type" | "demand">>);
    } else onUpdate(resource.id, { [field]: rawValue } as Partial<Omit<TaskEstimateResource, "id" | "taskEstimateItemId" | "resourceId" | "type" | "demand">>);
    setEditingCell(null);
  }

  return <section className="estimate-pane estimate-resource-pane">
    <header className="estimate-pane-header estimate-resource-header">
      <div><h2>HAO PHÍ TÀI NGUYÊN</h2><div className="estimate-tabs" role="tablist"><button type="button" className={resourceType === "material" ? "active" : ""} onClick={() => onResourceTypeChange("material")}>Vật liệu</button><button type="button" className={resourceType === "labor" ? "active" : ""} onClick={() => onResourceTypeChange("labor")}>Nhân công</button><button type="button" className={resourceType === "machine" ? "active" : ""} onClick={() => onResourceTypeChange("machine")}>Máy thi công</button></div></div>
      <div className="estimate-modes"><button type="button" className={mode === "estimate" ? "active" : ""} onClick={() => onModeChange("estimate")}>Theo công tác dự toán</button><button type="button" className={mode === "summary" ? "active" : ""} onClick={() => onModeChange("summary")}>Tổng hợp công tác tiến độ</button></div>
    </header>
    <p className="estimate-resource-caption">{isReadOnly ? `Công tác tiến độ đang chọn: ${selectedTaskItemLabel}` : `Công tác dự toán đang chọn: ${selectedEstimateItemLabel}`}</p>
    <div className="estimate-table-wrap">
      <table className="estimate-data-grid">
        <thead><tr><th>STT</th><th>Tác vụ</th>{columns.map((column) => <th key={column.field}>{column.label}</th>)}<th>Nhu cầu</th></tr></thead>
        <tbody>{resources.map((resource, index) => <tr key={resource.id} className={resource.id === selectedResourceId ? "selected" : ""} onClick={() => setSelectedResourceId(resource.id)}>
          <td>{index + 1}</td>
          <td className="estimate-actions">{isReadOnly ? "—" : <div className="row-actions estimate-row-actions"><button type="button" className="action-slot-add" aria-label="Thêm hao phí" title="Thêm hao phí" onClick={(event) => { event.stopPropagation(); onAdd(); }}>+</button><button type="button" className="action-slot-insert-above" aria-label="Đưa lên" title="Đưa lên" onClick={(event) => { event.stopPropagation(); onReorder(resource.id, -1); }}>▲</button><button type="button" className="action-slot-insert-below" aria-label="Đưa xuống" title="Đưa xuống" onClick={(event) => { event.stopPropagation(); onReorder(resource.id, 1); }}>▼</button><button type="button" className="action-slot-delete" aria-label="Xóa hao phí" title="Xóa hao phí" onClick={(event) => { event.stopPropagation(); onDelete(resource.id); }}>⌫</button></div>}</td>
          {columns.map((column) => {
            const isEditing = !isReadOnly && editingCell?.id === resource.id && editingCell.field === column.field;
            const value = resource[column.field];
            return <td key={column.field} className={column.numeric ? "estimate-numeric" : undefined}>{isEditing ? <input ref={inputRef} className="estimate-inline-input" defaultValue={String(value)} inputMode={column.numeric ? "decimal" : undefined} onClick={(event) => event.stopPropagation()} onBlur={(event) => commit(resource as TaskEstimateResource, column.field, event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Escape") setEditingCell(null); if (event.key === "Enter") { event.preventDefault(); commit(resource as TaskEstimateResource, column.field, event.currentTarget.value); } }} /> : <button type="button" className="estimate-cell-value" disabled={isReadOnly} onClick={(event) => { event.stopPropagation(); setSelectedResourceId(resource.id); setEditingCell({ id: resource.id, field: column.field }); }}>{column.numeric ? formatNumber(value as number) : String(value)}</button>}</td>;
          })}
          <td className="estimate-numeric">{formatNumber(resource.demand)}</td>
        </tr>)}{!resources.length && <tr><td colSpan={9} className="estimate-empty">Không có hao phí phù hợp.</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}
