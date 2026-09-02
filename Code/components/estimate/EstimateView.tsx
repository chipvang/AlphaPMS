"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectDto } from "../../lib/projects/types";
import type { SharedTaskState } from "../../lib/task-workspace/useSharedTaskState";
import { TaskGrid } from "../schedule/ScheduleView";
import type { ScheduleItem } from "../schedule/ScheduleView";
import { EstimateResourceGrid } from "./EstimateResourceGrid";
import type { EstimateResourceType, TaskEstimateResource, TaskItemResource } from "./EstimateResourceGrid";
import { TaskEstimateItemGrid } from "./TaskEstimateItemGrid";
import type { TaskEstimateItem } from "./TaskEstimateItemGrid";

type EstimateViewProps = { projects: ProjectDto[]; onNotice: (message: string) => void; taskState: SharedTaskState };

export function EstimateView({ projects, onNotice, taskState }: EstimateViewProps) {
  const [selectedTaskItem, setSelectedTaskItem] = useState<Pick<ScheduleItem, "id" | "type" | "wbs" | "name" | "unit" | "quantity">>();
  const [estimateItems, setEstimateItems] = useState<TaskEstimateItem[]>([]);
  const [resources, setResources] = useState<TaskEstimateResource[]>([]);
  const [selectedEstimateItemId, setSelectedEstimateItemId] = useState("");
  const [resourceMode, setResourceMode] = useState<"estimate" | "summary">("estimate");
  const [resourceType, setResourceType] = useState<EstimateResourceType>("material");

  const taskEstimateItems = estimateItems.filter((item) => item.taskItemId === selectedTaskItem?.id);
  const selectedEstimateItem = taskEstimateItems.find((item) => item.id === selectedEstimateItemId) ?? taskEstimateItems[0];

  const createDefaultResources = useCallback((taskEstimateItemId: string): TaskEstimateResource[] => [
    { id: `resource-${taskEstimateItemId}-material`, taskEstimateItemId, resourceId: "diesel-do", type: "material", code: "VL00123", name: "Xăng dầu DO 0,05S-II", unit: "lít", baseConsumption: .02, adjustedConsumption: .02, coefficient: 1, demand: 0 },
    { id: `resource-${taskEstimateItemId}-labor`, taskEstimateItemId, resourceId: "labor-3-5", type: "labor", code: "NC3.5/7", name: "Nhân công bậc 3,5/7", unit: "công", baseConsumption: .08, adjustedConsumption: .08, coefficient: 1, demand: 0 },
    { id: `resource-${taskEstimateItemId}-machine`, taskEstimateItemId, resourceId: "mower", type: "machine", code: "MTC-01", name: "Máy phát cỏ", unit: "ca", baseConsumption: .015, adjustedConsumption: .015, coefficient: 1, demand: 0 },
  ], []);

  const handleSelectedTaskItem = useCallback((item: Pick<ScheduleItem, "id" | "type" | "wbs" | "name" | "unit" | "quantity"> | undefined) => {
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
      <section className="estimate-pane estimate-task-pane estimate-shared-task-grid"><TaskGrid projects={projects} onNotice={onNotice} taskState={taskState} className="estimate-task-grid" /></section>
      <div className="estimate-right-panes">
        <TaskEstimateItemGrid items={taskEstimateItems} selectedItemId={selectedEstimateItem?.id ?? null} taskItemLabel={`${selectedTaskItem?.wbs ?? "—"} - ${selectedTaskItem?.name ?? "Chưa chọn"}`} onSelect={setSelectedEstimateItemId} onAdd={addEstimateItem} onUpdate={updateEstimateItem} onDelete={deleteEstimateItem} onReorder={reorderEstimateItem} onRequestNormLookup={setSelectedEstimateItemId} />
        <EstimateResourceGrid mode={resourceMode} resourceType={resourceType} selectedEstimateItemLabel={`${selectedEstimateItem?.normCode ?? "—"} - ${selectedEstimateItem?.name ?? "Chưa chọn"}`} selectedTaskItemLabel={`${selectedTaskItem?.wbs ?? "—"} - ${selectedTaskItem?.name ?? "Chưa chọn"}`} taskEstimateResources={taskEstimateResources} taskItemResources={taskItemResources} onModeChange={setResourceMode} onResourceTypeChange={setResourceType} onAdd={addResource} onUpdate={updateResource} onDelete={deleteResource} onReorder={reorderResource} />
      </div>
    </div>
  </section>;
}
