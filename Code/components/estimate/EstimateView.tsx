"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectDto } from "../../lib/projects/types";
import type { SharedTaskState } from "../../lib/task-workspace/useSharedTaskState";
import type { TaskItem } from "../../lib/task-workspace/taskTypes";
import { createBasicColumns, createTaskGridColumns, estimateColumns, getTaskGridColumnWidth, getVisibleTaskGridColumns, resourceColumns, taskGridColumnGroups } from "../task-grid/taskGridColumns";
import { TaskGrid } from "../task-grid/TaskGrid";
import type { TaskGridColumn } from "../task-grid/taskGridTypes";
import { useTaskGridController } from "../task-grid/useTaskGridController";
import { useTaskGridInteractions } from "../task-grid/useTaskGridInteractions";
import { useTaskGridWbsReorder } from "../task-grid/useTaskGridWbsReorder";
import { calculateTaskOrder, getTaskTreeDepth, insertTaskChild, insertTaskSibling, removeTaskSubtree } from "../task-grid/taskTree";
import { EstimateResourceGrid } from "./EstimateResourceGrid";
import type { EstimateResourceType, TaskEstimateResource, TaskItemResource } from "./EstimateResourceGrid";
import { TaskEstimateItemGrid } from "./TaskEstimateItemGrid";
import type { TaskEstimateItem } from "./TaskEstimateItemGrid";

type EstimateViewProps = { projects: ProjectDto[]; onNotice: (message: string) => void; taskState: SharedTaskState };
function EstimateInlineNameEditor({ value, autoEdit = false, onCommit, onFinishEditing }: { value: string; autoEdit?: boolean; onCommit: (value: string) => void; onFinishEditing: () => void }) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(value);
  if (!editing) return <button type="button" className="task-name-display" onDoubleClick={() => setEditing(true)}>{value}</button>;
  return <input aria-label="Tên công việc" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { onCommit(draft.trim() || value); setEditing(false); onFinishEditing(); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(value); setEditing(false); onFinishEditing(); } }} />;
}

export function EstimateView({ projects, onNotice, taskState }: EstimateViewProps) {
  const [selectedTaskItem, setSelectedTaskItem] = useState<Pick<TaskItem, "id" | "type" | "wbs" | "name" | "unit" | "quantity">>();
  const [estimateItems, setEstimateItems] = useState<TaskEstimateItem[]>([]);
  const [resources, setResources] = useState<TaskEstimateResource[]>([]);
  const [selectedEstimateItemId, setSelectedEstimateItemId] = useState("");
  const [resourceMode, setResourceMode] = useState<"estimate" | "summary">("estimate");
  const [resourceType, setResourceType] = useState<EstimateResourceType>("material");
  const [autoEditItemId, setAutoEditItemId] = useState<string | null>(null);
  const taskGridController = useTaskGridController();
  const { collapsedIds, setCollapsedIds, outlineLevel, setOutlineLevel, taskNameColumnWidth, columnGroupVisibility, setColumnGroupVisibility, taskGridHeaderScrollRef, taskGridBodyScrollRef, taskGridBottomScrollRef } = taskGridController;
  const items = taskState.history.value.items;
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const taskOrder = useMemo(() => calculateTaskOrder(items), [items]);
  const visibleProjectIds = useMemo(() => new Set(projects.filter((project) => project.visible).map((project) => project.id)), [projects]);
  const visibleTaskItems = useMemo(() => items.filter((item) => {
    if (!visibleProjectIds.has(item.projectId) || getTaskTreeDepth(item, itemById) + 1 > outlineLevel) return false;
    for (let parentId = item.parentId; parentId; parentId = itemById.get(parentId)?.parentId ?? null) if (collapsedIds.has(parentId)) return false;
    return true;
  }), [collapsedIds, itemById, items, outlineLevel, visibleProjectIds]);
  const selectedGridItem = items.find((item) => item.id === taskState.selectedTaskItemId) ?? visibleTaskItems[0];
  const hasChildren = useCallback((itemId: string) => items.some((item) => item.parentId === itemId), [items]);
  const commitItems = useCallback((next: TaskItem[] | ((current: TaskItem[]) => TaskItem[]), options: { description: string; mergeKey?: string }) => {
    taskState.history.commit((current) => ({ ...current, items: typeof next === "function" ? next(current.items) : next }), options);
  }, [taskState.history]);
  const taskGridColumns = useMemo<TaskGridColumn<TaskItem>[]>(() => createTaskGridColumns<TaskItem>({
    basicColumns: createBasicColumns<TaskItem>({ getNameCopyValue: (item) => item.name, applyNamePasteValue: (value) => value ? { name: value } : {} }),
    scheduleColumns: [],
    estimateColumns: estimateColumns as TaskGridColumn<TaskItem>[],
    resourceColumns: resourceColumns as TaskGridColumn<TaskItem>[],
  }), []);
  const estimateColumnVisibility = { ...columnGroupVisibility, progress: false, estimate: true, resource: true };
  const visibleTaskGridColumns = getVisibleTaskGridColumns(taskGridColumns, estimateColumnVisibility, taskNameColumnWidth);
  const taskGridWidth = getTaskGridColumnWidth(visibleTaskGridColumns);
  const taskGridStyle = { "--schedule-name-width": `${taskNameColumnWidth}px`, "--schedule-table-width": `${taskGridWidth}px`, "--schedule-grid-template": visibleTaskGridColumns.map((column) => `${column.width}px`).join(" ") } as CSSProperties;
  const { startTaskGridSelection, syncTaskGridHorizontalScroll, startTaskNameColumnResize } = useTaskGridInteractions({
    visibleItems: visibleTaskItems,
    allItems: items,
    visibleColumns: visibleTaskGridColumns,
    taskGridController,
    bodyScrollRef: taskGridBodyScrollRef,
    commitItems,
    onNotice,
  });
  const { wbsDrag, suppressWbsClickRef, wbsInsertionLineRef, startWbsDrag } = useTaskGridWbsReorder({
    items,
    visibleItems: visibleTaskItems,
    bodyScrollRef: taskGridBodyScrollRef,
    commitItems,
    setSelectedItemId: taskState.setSelectedTaskItemId,
    onNotice,
  });

  function toggleCollapse(itemId: string) { setCollapsedIds((current) => { const next = new Set(current); if (next.has(itemId)) next.delete(itemId); else next.add(itemId); return next; }); }
  function addChildItem(parent: TaskItem) {
    const type = parent.type === "project" ? "workItem" : parent.type === "workItem" ? "task" : parent.type === "group" ? "task" : null;
    if (!type) return;
    const id = globalThis.crypto?.randomUUID?.() ?? `task-${Date.now()}`;
    const child: TaskItem = { id, projectId: parent.projectId, parentId: parent.id, type, wbs: "", name: type === "workItem" ? "Hạng mục mới" : "Công tác mới", duration: 1, startDate: parent.startDate, finishDate: parent.finishDate, progress: 0, ganttLeft: 0, ganttWidth: 1, unit: "" };
    commitItems((current) => insertTaskChild(current, parent, child, "last"), { description: `Thêm ${child.name}` });
    taskState.setSelectedTaskItemId(id);
    setAutoEditItemId(id);
  }
  function insertTaskItem(context: TaskItem | undefined, position: "before" | "after") {
    if (!context || context.type === "project") return;
    const id = globalThis.crypto?.randomUUID?.() ?? `task-${Date.now()}`;
    const item: TaskItem = { ...context, id, wbs: "", name: "Công tác mới", duration: 1, progress: 0, ganttLeft: 0, ganttWidth: 1 };
    commitItems((current) => insertTaskSibling(current, context, item, position), { description: "Chèn công tác" });
    taskState.setSelectedTaskItemId(id);
    setAutoEditItemId(id);
  }
  function deleteItem(item?: TaskItem) {
    if (!item || item.type === "project") return;
    taskState.history.commit((current) => {
      const result = removeTaskSubtree(current.items, item.id);
      return { items: result.items, dependencies: current.dependencies.filter((dependency) => !result.removedIds.has(dependency.predecessorTaskId) && !result.removedIds.has(dependency.successorTaskId)) };
    }, { description: `Xóa ${item.name}` });
    taskState.setSelectedTaskItemId(item.parentId ?? "");
  }
  const taskEstimateItems = estimateItems.filter((item) => item.taskItemId === selectedTaskItem?.id);
  const selectedEstimateItem = taskEstimateItems.find((item) => item.id === selectedEstimateItemId) ?? taskEstimateItems[0];

  const createDefaultResources = useCallback((taskEstimateItemId: string): TaskEstimateResource[] => [
    { id: `resource-${taskEstimateItemId}-material`, taskEstimateItemId, resourceId: "diesel-do", type: "material", code: "VL00123", name: "Xăng dầu DO 0,05S-II", unit: "lít", baseConsumption: .02, adjustedConsumption: .02, coefficient: 1, demand: 0 },
    { id: `resource-${taskEstimateItemId}-labor`, taskEstimateItemId, resourceId: "labor-3-5", type: "labor", code: "NC3.5/7", name: "Nhân công bậc 3,5/7", unit: "công", baseConsumption: .08, adjustedConsumption: .08, coefficient: 1, demand: 0 },
    { id: `resource-${taskEstimateItemId}-machine`, taskEstimateItemId, resourceId: "mower", type: "machine", code: "MTC-01", name: "Máy phát cỏ", unit: "ca", baseConsumption: .015, adjustedConsumption: .015, coefficient: 1, demand: 0 },
  ], []);

  const handleSelectedTaskItem = useCallback((item: Pick<TaskItem, "id" | "type" | "wbs" | "name" | "unit" | "quantity"> | undefined) => {
    setSelectedTaskItem(item);
    if (!item || item.type !== "task") { setSelectedEstimateItemId(""); return; }
    const id = `estimate-${item.id}`;
    setSelectedEstimateItemId(id);
    setEstimateItems((current) => current.some((estimate) => estimate.taskItemId === item.id) ? current : [...current, { id, taskItemId: item.id, normCode: "", alphaCode: "", name: item.name, unit: item.unit ?? "", componentName: "", componentCount: 0, coefficient: 1, extraQuantity: 0, quantity: item.quantity ?? 0 }]);
    setResources((current) => current.some((resource) => resource.taskEstimateItemId === id) ? current : [...current, ...createDefaultResources(id)]);
  }, [createDefaultResources]);

  useEffect(() => {
    const item = taskState.history.value.items.find((candidate) => candidate.id === taskState.selectedTaskItemId);
    const timer = globalThis.setTimeout(() => handleSelectedTaskItem(item), 0);
    return () => globalThis.clearTimeout(timer);
  }, [handleSelectedTaskItem, taskState.history.value.items, taskState.selectedTaskItemId]);

  const taskEstimateResources = useMemo(() => resources.filter((resource) => resource.taskEstimateItemId === selectedEstimateItem?.id).map((resource) => ({ ...resource, demand: (selectedEstimateItem?.quantity ?? 0) * resource.adjustedConsumption * resource.coefficient })), [resources, selectedEstimateItem]);
  const taskItemResources = useMemo<TaskItemResource[]>(() => {
    if (!selectedTaskItem) return [];
    const grouped = new Map<string, TaskItemResource>();
    resources.forEach((resource) => {
      const estimateItem = estimateItems.find((item) => item.id === resource.taskEstimateItemId && item.taskItemId === selectedTaskItem.id);
      if (!estimateItem) return;
      const requirement = estimateItem.quantity * resource.adjustedConsumption * resource.coefficient;
      const current = grouped.get(resource.resourceId);
      if (current) current.demand += requirement;
      else grouped.set(resource.resourceId, { id: `task-item-resource-${selectedTaskItem.id}-${resource.resourceId}`, taskItemId: selectedTaskItem.id, resourceId: resource.resourceId, type: resource.type, code: resource.code, name: resource.name, unit: resource.unit, baseConsumption: resource.baseConsumption, adjustedConsumption: resource.adjustedConsumption, coefficient: resource.coefficient, demand: requirement });
    });
    return [...grouped.values()];
  }, [estimateItems, resources, selectedTaskItem]);

  function addEstimateItem() { if (!selectedTaskItem || selectedTaskItem.type !== "task") return; const id = `estimate-${crypto.randomUUID()}`; setEstimateItems((current) => [...current, { id, taskItemId: selectedTaskItem.id, normCode: "", alphaCode: "", name: "Công tác dự toán mới", unit: selectedTaskItem.unit ?? "", componentName: "", componentCount: 0, coefficient: 1, extraQuantity: 0, quantity: selectedTaskItem.quantity ?? 0 }]); setResources((current) => [...current, ...createDefaultResources(id)]); setSelectedEstimateItemId(id); }
  function updateEstimateItem(id: string, changes: Partial<Omit<TaskEstimateItem, "id" | "taskItemId">>) { setEstimateItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item)); }
  function deleteEstimateItem(id: string) { setEstimateItems((current) => current.filter((item) => item.id !== id)); }
  function reorderEstimateItem(id: string, direction: -1 | 1) { setEstimateItems((current) => { const index = current.findIndex((item) => item.id === id); const target = index + direction; if (index < 0 || target < 0 || target >= current.length || current[index].taskItemId !== current[target].taskItemId) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); }
  function addResource() { if (!selectedEstimateItem) return; const id = `resource-${crypto.randomUUID()}`; setResources((current) => [...current, { id, taskEstimateItemId: selectedEstimateItem.id, resourceId: `manual-${id}`, type: resourceType, code: "", name: "Tài nguyên mới", unit: "", baseConsumption: 0, adjustedConsumption: 0, coefficient: 1, demand: 0 }]); }
  function updateResource(id: string, changes: Partial<Omit<TaskEstimateResource, "id" | "taskEstimateItemId" | "resourceId" | "type" | "demand">>) { setResources((current) => current.map((resource) => resource.id === id ? { ...resource, ...changes } : resource)); }
  function deleteResource(id: string) { setResources((current) => current.filter((resource) => resource.id !== id)); }
  function reorderResource(id: string, direction: -1 | 1) { setResources((current) => { const index = current.findIndex((resource) => resource.id === id); const target = index + direction; if (index < 0 || target < 0 || target >= current.length || current[index].taskEstimateItemId !== current[target].taskEstimateItemId || current[index].type !== current[target].type) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); }

  return <section className="estimate-screen">
    <div className="estimate-toolbar"><div><button className="button primary" type="button">▣ Nhập từ Excel</button><button className="button secondary" type="button">↶ Hoàn tác</button><button className="button secondary" type="button">↷ Làm lại</button><button className="button" type="button">☰ Lọc</button></div><div><button className="button secondary" type="button">◷ Lịch sử</button><button className="button primary" type="button">▣ Lưu thay đổi</button></div></div>
    <div className="estimate-workspace">
      <section className="estimate-pane estimate-task-pane estimate-shared-task-grid" style={taskGridStyle}>
        <TaskGrid
          visibleItems={visibleTaskItems}
          rowContext={{ base: {
            selectedItem: selectedGridItem,
            itemById,
            taskOrder,
            hasChildren,
            wbsDrag,
            suppressWbsClickRef,
            setSelectedItemId: taskState.setSelectedTaskItemId,
            openTaskContextMenu: (event) => event.preventDefault(),
            startWbsDrag,
            addChildItem,
            insertScheduleItem: insertTaskItem,
            deleteItem,
            autoEditItemId,
            setAutoEditItemId,
            getScheduleTreeDepth: getTaskTreeDepth,
            collapsedIds,
            toggleCollapse,
            InlineNameEditor: EstimateInlineNameEditor,
            commitItems,
            onNotice,
            columnGroupVisibility: estimateColumnVisibility,
            formatOptionalNumber: (value) => value == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value),
          } }}
          emptyContent={<div className="schedule-empty">Chưa chọn dự án nào trong “Danh sách dự án”.</div>}
          visibleColumns={visibleTaskGridColumns}
          columnGroups={taskGridColumnGroups.filter((group) => group.id !== "progress")}
          columnGroupVisibility={estimateColumnVisibility}
          onToggleColumnGroup={(group) => { if (group !== "progress") setColumnGroupVisibility((current) => ({ ...current, [group]: !current[group] })); }}
          onShowAllColumnGroups={() => setColumnGroupVisibility({ basic: true, progress: false, estimate: true, resource: true })}
          headerScrollRef={taskGridHeaderScrollRef}
          onHeaderScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "header")}
          nameColumnHeader={<><span>Tên công việc</span><span className="outline-controls" aria-label="Cấp Outline">{[1, 2, 3, 4].map((level) => <button key={level} type="button" className={outlineLevel === level ? "active" : ""} aria-pressed={outlineLevel === level} onClick={() => setOutlineLevel(level)}>{level}</button>)}</span><button type="button" className="column-resizer" aria-label="Kéo để thay đổi độ rộng cột Tên công việc" title={`Độ rộng hiện tại: ${Math.round(taskNameColumnWidth)}px`} onPointerDown={startTaskNameColumnResize} /></>}
          bodyScrollRef={taskGridBodyScrollRef}
          insertionLineRef={wbsInsertionLineRef}
          onBodyPointerDown={startTaskGridSelection}
          onBodyScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "body")}
          bottomScrollRef={taskGridBottomScrollRef}
          tableWidth={taskGridWidth}
          onBottomScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "dock")}
        />
      </section>
      <div className="estimate-right-panes">
        <TaskEstimateItemGrid items={taskEstimateItems} selectedItemId={selectedEstimateItem?.id ?? null} taskItemLabel={`${selectedTaskItem?.wbs ?? "—"} - ${selectedTaskItem?.name ?? "Chưa chọn"}`} onSelect={setSelectedEstimateItemId} onAdd={addEstimateItem} onUpdate={updateEstimateItem} onDelete={deleteEstimateItem} onReorder={reorderEstimateItem} onRequestNormLookup={setSelectedEstimateItemId} />
        <EstimateResourceGrid mode={resourceMode} resourceType={resourceType} selectedEstimateItemLabel={`${selectedEstimateItem?.normCode ?? "—"} - ${selectedEstimateItem?.name ?? "Chưa chọn"}`} selectedTaskItemLabel={`${selectedTaskItem?.wbs ?? "—"} - ${selectedTaskItem?.name ?? "Chưa chọn"}`} taskEstimateResources={taskEstimateResources} taskItemResources={taskItemResources} onModeChange={setResourceMode} onResourceTypeChange={setResourceType} onAdd={addResource} onUpdate={updateResource} onDelete={deleteResource} onReorder={reorderResource} />
      </div>
    </div>
  </section>;
}
