"use client";

import { cloneElement, isValidElement } from "react";
import type { ComponentType, Dispatch, MutableRefObject, PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, SetStateAction } from "react";
import type { ProjectDto } from "../../lib/projects/types";
import type { TaskDependency } from "../../lib/schedule/dependencies";
import type { TaskItem } from "../../lib/task-workspace/taskTypes";
import type { ScheduleDisplayStatus } from "../../lib/schedule/scheduleTypes";
import type { TaskGridColumn } from "./taskGridTypes";

type InlineNameEditorProps = { value: string; autoEdit?: boolean; onCommit: (value: string) => void; onFinishEditing: () => void };
type InlineDateEditorProps = { label: string; value: string; onCommit: (value: string) => boolean | void; onInvalid: () => void };
type CommitItems = (next: TaskItem[] | ((current: TaskItem[]) => TaskItem[]), options: { description: string; mergeKey?: string }) => void;

export type TaskGridRowBaseContext = {
  selectedItem: TaskItem | undefined;
  itemById: Map<string, TaskItem>;
  taskOrder: Map<string, string>;
  hasChildren: (itemId: string) => boolean;
  wbsDrag: { sourceId: string; isActive: boolean } | null;
  suppressWbsClickRef: MutableRefObject<boolean>;
  setSelectedItemId: (id: string) => void;
  openTaskContextMenu: (event: ReactMouseEvent<HTMLDivElement>, item: TaskItem) => void;
  startWbsDrag: (event: ReactPointerEvent<HTMLDivElement>, item: TaskItem) => void;
  addChildItem: (parent: TaskItem) => void;
  insertScheduleItem: (context: TaskItem | undefined, position: "before" | "after") => void;
  deleteItem: (item?: TaskItem) => void;
  autoEditItemId: string | null;
  setAutoEditItemId: Dispatch<SetStateAction<string | null>>;
  getScheduleTreeDepth: (item: TaskItem, itemMap: Map<string, TaskItem>) => number;
  collapsedIds: Set<string>;
  toggleCollapse: (itemId: string) => void;
  InlineNameEditor: ComponentType<InlineNameEditorProps>;
  commitItems: CommitItems;
  onNotice: (message: string) => void;
  columnGroupVisibility: { basic: boolean; progress: boolean; estimate: boolean; resource: boolean };
  formatOptionalNumber: (value?: number) => string;
};

export type TaskGridScheduleRowContext = {
  summaryDates: Map<string, { startDate: string; finishDate: string; duration: number }>;
  getProjectScheduleStatus: (status: ProjectDto["status"] | undefined) => ScheduleDisplayStatus;
  projectStatusById: Map<string, ProjectDto["status"]>;
  incomingDependencies: Map<string, TaskDependency[]>;
  formatDependencyLabel: (dependency: TaskDependency, scheduleOrder: Map<string, string>) => string;
  updateDuration: (target: TaskItem, duration: number) => void;
  InlineDateEditor: ComponentType<InlineDateEditorProps>;
  updateScheduleDate: (target: TaskItem, field: "startDate" | "finishDate", value: string) => boolean | void;
  openDependencyEditor: (task: TaskItem, dependencyId?: string) => void;
  ScheduleStatusChip: ComponentType<{ status: ScheduleDisplayStatus }>;
};

export type TaskGridRowContext = { base: TaskGridRowBaseContext; schedule?: TaskGridScheduleRowContext };

type TaskGridRowProps = { item: TaskItem; context: TaskGridRowContext; visibleColumns: TaskGridColumn[] };

export function TaskGridRow({ item, context, visibleColumns }: TaskGridRowProps) {
  const { base, schedule } = context;
  const {
    selectedItem, hasChildren, wbsDrag,
    suppressWbsClickRef, setSelectedItemId, openTaskContextMenu, startWbsDrag,
    addChildItem, insertScheduleItem, deleteItem, autoEditItemId, setAutoEditItemId,
    getScheduleTreeDepth, collapsedIds, toggleCollapse, InlineNameEditor, commitItems,
    onNotice, formatOptionalNumber,
  } = base;
            const { itemById, taskOrder } = base;
            const InlineDateEditor = schedule?.InlineDateEditor;
            const ScheduleStatusChip = schedule?.ScheduleStatusChip;
            const isSelected = item.id === selectedItem?.id;
            const expandable = hasChildren(item.id);
            const derivedDates = item.type === "task" ? null : schedule?.summaryDates.get(item.id);
            const displayStatus = item.type === "project" && schedule ? schedule.getProjectScheduleStatus(schedule.projectStatusById.get(item.projectId)) : "NOT_STARTED";
            const itemDependencies = schedule?.incomingDependencies.get(item.id) ?? [];
            const predecessorText = itemDependencies.length && schedule ? itemDependencies.map((dependency) => schedule.formatDependencyLabel(dependency, taskOrder)).join(";") : "—";
            const renderCell = (columnId: string) => {
              switch (columnId) {
                case "order": return <div className={`wbs-cell ${item.type === "project" ? "" : "wbs-drag-cell"}`} aria-label={item.type === "project" ? undefined : "Kéo để sắp xếp"} title={item.type === "project" ? `WBS: ${item.wbs}` : `STT ${taskOrder.get(item.id)} · Kéo để sắp xếp`} onPointerDown={(event) => startWbsDrag(event, item)}>{taskOrder.get(item.id)}</div>;
                case "actions": return <div className="row-actions">{item.type === "project" ? <button className="action-slot-add" aria-label="Thêm hạng mục" title="Thêm hạng mục" onClick={() => addChildItem(item)}>+</button> : <>{(item.type === "workItem" || item.type === "group") && <button className="action-slot-add" aria-label="Thêm công tác" title="Thêm công tác" onClick={() => addChildItem(item)}>+</button>}<button className="action-slot-insert-above" aria-label="Chèn lên trên" title="Chèn lên trên" onClick={() => insertScheduleItem(item, "before")}><span className="action-triangle">▲</span></button><button className="action-slot-insert-below" aria-label="Chèn xuống dưới" title="Chèn xuống dưới" onClick={() => insertScheduleItem(item, "after")}><span className="action-triangle">▼</span></button><button className="action-slot-delete" aria-label="Xóa" title="Xóa" onClick={() => deleteItem(item)}><svg className="action-trash-icon" aria-hidden="true" viewBox="0 0 16 16"><path d="M5 5v7m3-7v7m3-7v7M3.5 3.5h9l-.6 10h-7.8l-.6-10ZM6 3.5V2h4v1.5M2.5 3.5h11" /></svg></button></>}</div>;
                case "name": return <div className={`task-name ${autoEditItemId === item.id ? "is-editing" : ""}`} style={{ paddingLeft: `${10 + getScheduleTreeDepth(item, itemById) * 12}px` }} onDoubleClick={(event) => { const target = event.target as HTMLElement; if (target.closest("button, input")) return; event.stopPropagation(); setSelectedItemId(item.id); setAutoEditItemId(item.id); }}>{expandable ? <button className="tree-toggle" type="button" aria-label={collapsedIds.has(item.id) ? "Mở rộng" : "Thu gọn"} aria-expanded={!collapsedIds.has(item.id)} onClick={(event) => { event.stopPropagation(); toggleCollapse(item.id); }}><svg viewBox="0 0 16 16" aria-hidden="true"><path d={collapsedIds.has(item.id) ? "m6 3 5 5-5 5" : "m3 6 5 5 5-5"} /></svg></button> : <span className="tree-spacer" />}<InlineNameEditor key={`${item.id}-${autoEditItemId === item.id ? "editing" : "display"}`} value={item.name} autoEdit={autoEditItemId === item.id} onFinishEditing={() => setAutoEditItemId((currentId) => currentId === item.id ? null : currentId)} onCommit={(name) => { setSelectedItemId(item.id); commitItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, name } : currentItem), { description: `Đổi tên ${item.wbs} thành “${name}”` }); onNotice(`Đã đổi tên ${item.wbs}`); }} />{item.nature && autoEditItemId !== item.id && <small>{item.nature}</small>}</div>;
                case "unit": return <div className="plain-data-cell">{item.type === "task" ? item.unit ?? "—" : "—"}</div>;
                case "duration": return item.type === "task" && schedule ? <div className="duration-cell"><input type="number" value={item.duration} onChange={(event) => schedule.updateDuration(item, Number(event.target.value))} /><span>n</span></div> : <div className="duration-cell summary-value">{derivedDates?.duration ?? "—"}</div>;
                case "startDate": return <div className="date-cell">{item.type === "task" && schedule && InlineDateEditor ? <InlineDateEditor label={`Ngày bắt đầu ${item.name}`} value={item.startDate} onCommit={(value) => schedule.updateScheduleDate(item, "startDate", value)} onInvalid={() => onNotice("Ngày bắt đầu phải đúng định dạng dd/MM/yy")} /> : derivedDates?.startDate ?? "—"}</div>;
                case "finishDate": return <div className="date-cell">{item.type === "task" && schedule && InlineDateEditor ? <InlineDateEditor label={`Ngày kết thúc ${item.name}`} value={item.finishDate} onCommit={(value) => schedule.updateScheduleDate(item, "finishDate", value)} onInvalid={() => onNotice("Ngày kết thúc phải đúng định dạng dd/MM/yy")} /> : derivedDates?.finishDate ?? "—"}</div>;
                case "predecessors": return <div className="predecessor-cell" onDoubleClick={() => schedule?.openDependencyEditor(item)}>{item.type === "task" ? predecessorText : "—"}</div>;
                case "status": return <div className="schedule-status-cell">{ScheduleStatusChip && <ScheduleStatusChip status={displayStatus} />}</div>;
                case "quantity": return <div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.quantity) : "—"}</div>;
                case "dailyQuantity": return <div className="numeric-data-cell">{item.type === "task" && item.quantity != null && item.duration > 0 ? formatOptionalNumber(item.quantity / item.duration) : "—"}</div>;
                case "machineShiftCoefficient": return <div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.machineShiftCoefficient) : "—"}</div>;
                case "machineCount": return <div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.machineCount) : "—"}</div>;
                case "managedLabor": return <div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.managedLabor) : "—"}</div>;
                case "permanentLabor": return <div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.permanentLabor) : "—"}</div>;
                default: return null;
              }
            };
            return <div key={item.id} data-wbs-row-id={item.id} className={`schedule-table-grid schedule-row row-${item.type} ${isSelected ? "selected" : ""} ${wbsDrag?.sourceId === item.id && wbsDrag.isActive ? "wbs-drag-source" : ""}`} role="button" tabIndex={0} onClick={() => { if (suppressWbsClickRef.current) { suppressWbsClickRef.current = false; return; } setSelectedItemId(item.id); }} onContextMenu={(event) => openTaskContextMenu(event, item)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) setSelectedItemId(item.id); }}>
              {visibleColumns.map((column) => { const cell = renderCell(column.id); return isValidElement(cell) ? cloneElement(cell, { key: column.id, "data-column-id": column.id }) : cell; })}
              {/*
              <div className="row-actions">
                {item.type === "project"
                  ? <button className="action-slot-add" aria-label="Thêm hạng mục" title="Thêm hạng mục" onClick={() => addChildItem(item)}>+</button>
                  : <>{(item.type === "workItem" || item.type === "group") && <button className="action-slot-add" aria-label="Thêm công tác" title="Thêm công tác" onClick={() => addChildItem(item)}>+</button>}<button className="action-slot-insert-above" aria-label="Chèn lên trên" title="Chèn lên trên" onClick={() => insertScheduleItem(item, "before")}><span className="action-triangle">▲</span></button><button className="action-slot-insert-below" aria-label="Chèn xuống dưới" title="Chèn xuống dưới" onClick={() => insertScheduleItem(item, "after")}><span className="action-triangle">▼</span></button><button className="action-slot-delete" aria-label="Xóa" title="Xóa" onClick={() => deleteItem(item)}><svg className="action-trash-icon" aria-hidden="true" viewBox="0 0 16 16"><path d="M5 5v7m3-7v7m3-7v7M3.5 3.5h9l-.6 10h-7.8l-.6-10ZM6 3.5V2h4v1.5M2.5 3.5h11" /></svg></button></>}
              </div>
              <div className={`task-name ${autoEditItemId === item.id ? "is-editing" : ""}`} style={{ paddingLeft: `${10 + getScheduleTreeDepth(item, itemById) * 12}px` }} onDoubleClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button, input")) return;
                event.stopPropagation();
                setSelectedItemId(item.id);
                setAutoEditItemId(item.id);
              }}>
                {expandable ? <button className="tree-toggle" type="button" aria-label={collapsedIds.has(item.id) ? "Mở rộng" : "Thu gọn"} aria-expanded={!collapsedIds.has(item.id)} onClick={(event) => { event.stopPropagation(); toggleCollapse(item.id); }}><svg viewBox="0 0 16 16" aria-hidden="true"><path d={collapsedIds.has(item.id) ? "m6 3 5 5-5 5" : "m3 6 5 5 5-5"} /></svg></button> : <span className="tree-spacer" />}
                <InlineNameEditor key={`${item.id}-${autoEditItemId === item.id ? "editing" : "display"}`} value={item.name} autoEdit={autoEditItemId === item.id} onFinishEditing={() => setAutoEditItemId((currentId) => currentId === item.id ? null : currentId)} onCommit={(name) => { setSelectedItemId(item.id); commitItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, name } : currentItem), { description: `Đổi tên ${item.wbs} thành “${name}”` }); onNotice(`Đã đổi tên ${item.wbs}`); }} />{item.nature && autoEditItemId !== item.id && <small>{item.nature}</small>}
              </div>
              <div className="plain-data-cell">{item.type === "task" ? item.unit ?? "—" : "—"}</div>
              {columnGroupVisibility.progress && schedule && <>{item.type === "task" ? <><div className="duration-cell"><input aria-label={`Thời lượng ${item.name}`} type="number" min="1" value={item.duration} onFocus={(event) => { setSelectedItemId(item.id); event.currentTarget.select(); }} onChange={(event) => schedule.updateDuration(item, Number(event.target.value))} onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Enter") event.currentTarget.blur(); }} /><span>n</span></div>
              <div className="date-cell">{InlineDateEditor && <InlineDateEditor key={`${item.id}-start-${item.startDate}`} label={`Ngày bắt đầu ${item.name}`} value={item.startDate} onCommit={(value) => { setSelectedItemId(item.id); return schedule.updateScheduleDate(item, "startDate", value); }} onInvalid={() => onNotice("Ngày bắt đầu phải đúng định dạng dd/MM/yy")} />}</div>
              <div className="date-cell">{InlineDateEditor && <InlineDateEditor key={`${item.id}-finish-${item.finishDate}`} label={`Ngày kết thúc ${item.name}`} value={item.finishDate} onCommit={(value) => { setSelectedItemId(item.id); return schedule.updateScheduleDate(item, "finishDate", value); }} onInvalid={() => onNotice("Ngày kết thúc phải đúng định dạng dd/MM/yy")} />}</div></> : <><div className="duration-cell summary-value"><span>{derivedDates?.duration ?? "—"} {derivedDates ? "ngày" : ""}</span></div><div className="date-cell summary-value"><span>{derivedDates?.startDate ?? "—"}</span></div><div className="date-cell summary-value"><span>{derivedDates?.finishDate ?? "—"}</span></div></>}
              <div className={`predecessor-cell ${item.type === "task" ? "editable" : ""}`} title={predecessorTooltip || "Không có công tác trước"} onDoubleClick={() => schedule.openDependencyEditor(item)}><span>{item.type === "task" ? predecessorText : "—"}</span></div>
              <div className="schedule-status-cell">{ScheduleStatusChip && <ScheduleStatusChip status={displayStatus} />}</div></>}
              {columnGroupVisibility.estimate && <><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.quantity) : "—"}</div><div className="numeric-data-cell">{item.type === "task" && item.quantity != null && item.duration > 0 ? formatOptionalNumber(item.quantity / item.duration) : "—"}</div></>}
              {columnGroupVisibility.resource && <><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.machineShiftCoefficient) : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.machineCount) : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.managedLabor) : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.permanentLabor) : "—"}</div></>}
              */}
            </div>;
}
