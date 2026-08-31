"use client";

import { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUndoRedo } from "../lib/history/useUndoRedo";
import type { ProjectDto, ProjectInput, ProjectScheduleDto, WorkItemDto } from "../lib/projects/types";
import { DependencyType, formatDependencyLabel, propagateDependencySchedule, recalibrateIncomingDependencyLags, TaskDependency, validateTaskDependency } from "../lib/schedule/dependencies";
import { buildTreeInsertionSlots, moveTreeItemToSlot, TreeInsertionSlot } from "../lib/schedule/treeReorder";
import { convertTaskToGroupWithFollowingTasks } from "../lib/schedule/taskConversion";
import { useCommonDialog } from "../lib/ui/useCommonDialog";

type Project = ProjectDto;
type ProjectStatus = ProjectDto["status"];

type ScheduleDisplayStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PAUSED" | "ON_HOLD" | "CANCELLED";

const scheduleStatusPresentation: Record<ScheduleDisplayStatus, { label: string; icon: "circle" | "play" | "check" | "pause" | "clock" | "cancel" }> = {
  NOT_STARTED: { label: "Chưa thi công", icon: "circle" },
  IN_PROGRESS: { label: "Đang thi công", icon: "play" },
  COMPLETED: { label: "Hoàn thành", icon: "check" },
  PAUSED: { label: "Tạm dừng", icon: "pause" },
  ON_HOLD: { label: "Chờ thực hiện", icon: "clock" },
  CANCELLED: { label: "Không thực hiện", icon: "cancel" },
};

function getProjectScheduleStatus(status: ProjectStatus | undefined): ScheduleDisplayStatus {
  if (status === "Đang thực hiện") return "IN_PROGRESS";
  if (status === "Hoàn thành") return "COMPLETED";
  if (status === "Tạm dừng") return "PAUSED";
  return "ON_HOLD";
}

function ScheduleStatusChip({ status }: { status: ScheduleDisplayStatus }) {
  const presentation = scheduleStatusPresentation[status];
  return <span className={`schedule-status-chip status-${status.toLowerCase().replaceAll("_", "-")}`} title={presentation.label} aria-label={`Tình trạng: ${presentation.label}`}>
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {presentation.icon === "circle" && <circle cx="8" cy="8" r="5.25" />}
      {presentation.icon === "play" && <path d="m5.25 3.5 7 4.5-7 4.5z" />}
      {presentation.icon === "check" && <><circle cx="8" cy="8" r="5.5" /><path d="m5.2 8.1 1.8 1.9 3.8-4" /></>}
      {presentation.icon === "pause" && <><path d="M5.3 4v8M10.7 4v8" /></>}
      {presentation.icon === "clock" && <><circle cx="8" cy="8" r="5.5" /><path d="M8 4.8v3.5l2.2 1.3" /></>}
      {presentation.icon === "cancel" && <><circle cx="8" cy="8" r="5.5" /><path d="m5.9 5.9 4.2 4.2m0-4.2-4.2 4.2" /></>}
    </svg>
    <span>{presentation.label}</span>
  </span>;
}

const blankProject: ProjectInput = {
  code: "",
  name: "",
  investor: "",
  location: "",
  manager: "",
  startDate: "",
  finishDate: "",
  budget: 0,
  progress: 0,
  status: "Chuẩn bị",
  description: "",
  visible: true,
};

const menuItems = [
  ["projects", "◫", "Danh sách dự án"],
  ["schedule", "▤", "Quản lý tiến độ"],
  ["estimate", "▦", "Quản lý dự toán"],
  ["resources", "⌁", "Nguồn lực & chi phí"],
  ["catalogs", "▱", "Danh mục dùng chung"],
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

function formatOptionalNumber(value?: number) {
  return value == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  const response = await fetch(`${baseUrl}${url}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (response.status === 204) return undefined as T;
  const body = await response.json() as { data?: T; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "Không thể kết nối máy chủ.");
  return body.data as T;
}

function isoToDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value;
}

function displayToIsoDate(value: string) {
  const parsed = parseDisplayDate(value);
  if (!parsed) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function createEntityId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function buildScheduleItems(projects: Project[], records: WorkItemDto[]) {
  const byProject = new Map<string, WorkItemDto[]>();
  records.forEach((record) => byProject.set(record.projectId, [...(byProject.get(record.projectId) ?? []), record]));
  const result: ScheduleItem[] = [];
  projects.forEach((project, projectIndex) => {
    result.push({ id: project.id, projectId: project.id, parentId: null, type: "project", wbs: String.fromCharCode(65 + projectIndex), name: project.name.toLocaleUpperCase("vi"), duration: 1, startDate: isoToDisplayDate(project.startDate), finishDate: isoToDisplayDate(project.finishDate), progress: project.progress, ganttLeft: 0, ganttWidth: 1 });
    const projectItems = byProject.get(project.id) ?? [];
    const children = new Map<string | null, WorkItemDto[]>();
    projectItems.forEach((item) => children.set(item.parentId, [...(children.get(item.parentId) ?? []), item]));
    children.forEach((items) => items.sort((a, b) => a.sortOrder - b.sortOrder));
    const append = (parentId: string | null, uiParentId: string) => {
      (children.get(parentId) ?? []).forEach((item) => {
        result.push({ ...item, parentId: uiParentId, wbs: "", startDate: isoToDisplayDate(item.startDate), finishDate: isoToDisplayDate(item.finishDate), machineShiftCoefficient: item.machineShiftFactor, managedLabor: item.nclm, ganttLeft: 0, ganttWidth: 1 });
        append(item.id, item.id);
      });
    };
    append(null, project.id);
  });
  return recalculateScheduleWbs(result);
}

type ScheduleItemType = "project" | "workItem" | "group" | "task";

type ScheduleItem = {
  id: string;
  projectId: string;
  parentId: string | null;
  type: ScheduleItemType;
  wbs: string;
  name: string;
  duration: number;
  startDate: string;
  finishDate: string;
  progress: number;
  ganttLeft: number;
  ganttWidth: number;
  sortOrder?: number;
  nature?: string;
  critical?: boolean;
  delayed?: boolean;
  unit?: string;
  quantity?: number;
  machineShiftCoefficient?: number;
  machineCount?: number;
  managedLabor?: number;
  permanentLabor?: number;
  allocation?: {
    code: string;
    name: string;
    allocated: number;
    total: number;
    unit: string;
  };
};

type TaskGridColumnGroup = "basic" | "progress" | "estimate" | "resource";
type TaskGridColumnGroupVisibility = Record<TaskGridColumnGroup, boolean>;

type ScheduleState = {
  items: ScheduleItem[];
  dependencies: TaskDependency[];
};

function buildProjectSchedulePayload(projectId: string, items: ScheduleItem[], dependencies: TaskDependency[]) {
  const siblingCounts = new Map<string, number>();
  return {
    workItems: items.filter((item) => item.projectId === projectId && item.type !== "project").map((item) => {
      const parentId = item.parentId === projectId ? null : item.parentId;
      const siblingKey = parentId ?? "root";
      const sortOrder = (siblingCounts.get(siblingKey) ?? 0) + 1;
      siblingCounts.set(siblingKey, sortOrder);
      return {
        id: item.id, projectId, parentId, type: item.type, name: item.name,
        unit: item.type === "task" ? item.unit : null,
        quantity: item.type === "task" ? item.quantity : null,
        startDate: item.type === "task" ? displayToIsoDate(item.startDate) : null,
        finishDate: item.type === "task" ? displayToIsoDate(item.finishDate) : null,
        duration: item.type === "task" ? item.duration : 1,
        progress: item.type === "task" ? item.progress : 0,
        machineShiftFactor: item.type === "task" ? item.machineShiftCoefficient : null,
        nclm: item.type === "task" ? item.managedLabor : null,
        permanentLabor: item.type === "task" ? item.permanentLabor : null,
        sortOrder,
      };
    }),
    dependencies: dependencies.filter((dependency) => dependency.projectId === projectId).map((dependency) => ({
      predecessorTaskId: dependency.predecessorTaskId,
      successorTaskId: dependency.successorTaskId,
      dependencyType: dependency.dependencyType,
      lagDays: dependency.lag,
    })),
  };
}

type DependencyDraft = Pick<TaskDependency, "id" | "predecessorTaskId" | "dependencyType" | "lag">;

type DependencyDragState = {
  sourceTaskId: string;
  sourcePoint: { x: number; y: number };
  pointerPosition: { x: number; y: number };
  initialPointerPosition: { x: number; y: number };
  hasExceededThreshold: boolean;
};

type WbsDragState = {
  sourceId: string;
  pointerId: number;
  startX: number;
  startY: number;
  isActive: boolean;
};

type WbsSlotGeometry = TreeInsertionSlot & { x: number; y: number };
type TaskContextMenuState = { taskId: string; x: number; y: number };

const initialScheduleState: ScheduleState = { items: [], dependencies: [] };

const ganttColumnWidth = 20;
const minimumTaskNameColumnWidth = 350;
const maximumTaskNameColumnWidth = 700;
const scheduleRowHeight = 32;

function isScheduleDescendant(item: ScheduleItem, ancestorId: string, itemMap: Map<string, ScheduleItem>) {
  let parentId = item.parentId;
  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = itemMap.get(parentId)?.parentId ?? null;
  }
  return false;
}

function getScheduleTreeDepth(item: ScheduleItem, itemMap: Map<string, ScheduleItem>) {
  let depth = 0;
  let parentId = item.parentId;
  while (parentId) {
    depth += 1;
    parentId = itemMap.get(parentId)?.parentId ?? null;
  }
  return depth;
}

function recalculateScheduleWbs(items: ScheduleItem[]) {
  const nextItemMap = new Map<string, ScheduleItem>();
  const childCounts = new Map<string, number>();
  return items.map((item) => {
    if (!item.parentId) {
      const root = { ...item };
      nextItemMap.set(root.id, root);
      return root;
    }
    const parent = nextItemMap.get(item.parentId);
    const childNumber = (childCounts.get(item.parentId) ?? 0) + 1;
    childCounts.set(item.parentId, childNumber);
    const nextItem = { ...item, wbs: `${parent?.wbs ?? item.wbs}.${childNumber}` };
    nextItemMap.set(nextItem.id, nextItem);
    return nextItem;
  });
}

function toRoman(value: number) {
  const symbols: Array<[number, string]> = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = Math.max(1, Math.trunc(value));
  return symbols.reduce((result, [number, symbol]) => {
    while (remaining >= number) {
      result += symbol;
      remaining -= number;
    }
    return result;
  }, "");
}

function toAlphabeticOrder(value: number) {
  let remaining = Math.max(1, Math.trunc(value));
  let result = "";
  while (remaining > 0) {
    remaining -= 1;
    result = String.fromCharCode(65 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

function calculateScheduleOrder(items: ScheduleItem[]) {
  const result = new Map<string, string>();
  const siblingCounters = new Map<string, number>();
  let projectIndex = 0;
  items.forEach((item) => {
    if (item.type === "project") {
      projectIndex += 1;
      result.set(item.id, toAlphabeticOrder(projectIndex));
      return;
    }
    const parentKey = `${item.parentId ?? item.projectId}:${item.type}`;
    const siblingIndex = (siblingCounters.get(parentKey) ?? 0) + 1;
    siblingCounters.set(parentKey, siblingIndex);
    if (item.type === "workItem") result.set(item.id, toRoman(siblingIndex));
    else if (item.type === "group") result.set(item.id, `${result.get(item.parentId ?? "") ?? "I"}.${siblingIndex}`);
    else result.set(item.id, String(siblingIndex));
  });
  return result;
}

function parseDisplayDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function formatDisplayDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear() % 100).padStart(2, "0")}`;
}

function calculateFinishDate(startDate: string, duration: number) {
  const start = parseDisplayDate(startDate);
  if (!start) return null;
  const finish = new Date(start);
  finish.setDate(finish.getDate() + Math.max(1, duration) - 1);
  return formatDisplayDate(finish);
}

function calculateDuration(startDate: string, finishDate: string) {
  const start = parseDisplayDate(startDate);
  const finish = parseDisplayDate(finishDate);
  if (!start || !finish) return null;
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const finishUtc = Date.UTC(finish.getFullYear(), finish.getMonth(), finish.getDate());
  const duration = Math.round((finishUtc - startUtc) / millisecondsPerDay) + 1;
  return duration > 0 ? duration : null;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addCalendarDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function differenceInCalendarDays(laterDate: Date, earlierDate: Date) {
  const laterUtc = Date.UTC(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate());
  const earlierUtc = Date.UTC(earlierDate.getFullYear(), earlierDate.getMonth(), earlierDate.getDate());
  return Math.round((laterUtc - earlierUtc) / (24 * 60 * 60 * 1000));
}

function getIsoWeek(date: Date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}

function InlineNameEditor({ value, autoEdit = false, onCommit, onFinishEditing }: { value: string; autoEdit?: boolean; onCommit: (value: string) => void; onFinishEditing: () => void }) {
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [draftValue, setDraftValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function finishEdit(shouldCommit: boolean) {
    const nextValue = draftValue.trim();
    if (shouldCommit && nextValue && nextValue !== value) onCommit(nextValue);
    else setDraftValue(value);
    setIsEditing(false);
    onFinishEditing();
  }

  if (!isEditing) {
    return <span className="inline-name-value" title="Bấm kép để sửa">{value}</span>;
  }

  return <input
    ref={inputRef}
    className="inline-name-input"
    value={draftValue}
    onClick={(event) => event.stopPropagation()}
    onChange={(event) => setDraftValue(event.target.value)}
    onBlur={() => finishEdit(true)}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === "Enter") finishEdit(true);
      if (event.key === "Escape") finishEdit(false);
    }}
  />;
}

function InlineDateEditor({ label, value, onCommit, onInvalid }: { label: string; value: string; onCommit: (value: string) => boolean | void; onInvalid: () => void }) {
  const getDateParts = (dateValue: string) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(dateValue);
    return match ? { day: match[1], month: match[2], year: match[3] } : { day: "", month: "", year: String(new Date().getFullYear() % 100).padStart(2, "0") };
  };
  const [dateParts, setDateParts] = useState(() => getDateParts(value));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ left: 0, top: 0 });
  const [viewMonth, setViewMonth] = useState(() => parseDisplayDate(value) ?? new Date());
  const dayInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    function closeCalendar(event: globalThis.PointerEvent) {
      const target = event.target as Node;
      if (!calendarRef.current?.contains(target) && !calendarButtonRef.current?.contains(target)) setCalendarOpen(false);
    }
    function handleCalendarKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setCalendarOpen(false);
    }
    document.addEventListener("pointerdown", closeCalendar);
    document.addEventListener("keydown", handleCalendarKeyDown);
    return () => {
      document.removeEventListener("pointerdown", closeCalendar);
      document.removeEventListener("keydown", handleCalendarKeyDown);
    };
  }, [calendarOpen]);

  function draftDateValue() {
    return `${dateParts.day.padStart(2, "0")}/${dateParts.month.padStart(2, "0")}/${dateParts.year.padStart(2, "0")}`;
  }

  function commitDraft() {
    const draftValue = draftDateValue();
    if (draftValue === value) return;
    const date = parseDisplayDate(draftValue);
    if (!date) {
      setDateParts(getDateParts(value));
      onInvalid();
      return;
    }
    const formattedValue = formatDisplayDate(date);
    setDateParts(getDateParts(formattedValue));
    if (onCommit(formattedValue) === false) setDateParts(getDateParts(value));
  }

  function focusPart(part: "day" | "month" | "year") {
    const input = part === "day" ? dayInputRef.current : part === "month" ? monthInputRef.current : yearInputRef.current;
    input?.focus();
    input?.select();
  }

  function updatePart(part: "day" | "month" | "year", rawValue: string) {
    const nextValue = rawValue.replace(/\D/g, "").slice(0, 2);
    setDateParts((current) => ({ ...current, [part]: nextValue }));
    if (nextValue.length !== 2) return;
    if (part === "day") globalThis.requestAnimationFrame(() => focusPart("month"));
    if (part === "month") globalThis.requestAnimationFrame(() => focusPart("year"));
  }

  function handlePartKeyDown(event: ReactKeyboardEvent<HTMLInputElement>, part: "day" | "month" | "year") {
    event.stopPropagation();
    const input = event.currentTarget;
    if (event.key === "Enter") {
      commitDraft();
      input.blur();
      return;
    }
    if (event.key === "Escape") {
      setDateParts(getDateParts(value));
      input.blur();
      return;
    }
    const previous = part === "year" ? "month" : part === "month" ? "day" : null;
    const next = part === "day" ? "month" : part === "month" ? "year" : null;
    if ((event.key === "/" || event.key === ".") && next) {
      event.preventDefault();
      focusPart(next);
      return;
    }
    if ((event.key === "ArrowLeft" && input.selectionStart === 0) || (event.key === "Backspace" && !input.value && previous)) {
      if (previous) {
        event.preventDefault();
        focusPart(previous);
      }
    }
    if (event.key === "ArrowRight" && input.selectionStart === input.value.length && next) {
      event.preventDefault();
      focusPart(next);
    }
  }

  function openDatePicker() {
    const button = calendarButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const selectedDate = parseDisplayDate(draftDateValue()) ?? new Date();
    setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setCalendarPosition({
      left: Math.max(8, Math.min(rect.right - 252, globalThis.innerWidth - 260)),
      top: Math.max(8, Math.min(rect.bottom + 4, globalThis.innerHeight - 302)),
    });
    setCalendarOpen((current) => !current);
  }

  function selectCalendarDate(date: Date) {
    const nextValue = formatDisplayDate(date);
    if (onCommit(nextValue) !== false) setDateParts(getDateParts(nextValue));
    else setDateParts(getDateParts(value));
    setCalendarOpen(false);
  }

  const calendarYear = viewMonth.getFullYear();
  const calendarMonth = viewMonth.getMonth();
  const firstDayOffset = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const calendarStart = new Date(calendarYear, calendarMonth, 1 - firstDayOffset);
  const selectedDate = parseDisplayDate(value);
  const today = new Date();
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });

  return <div className="inline-date-editor" onBlur={(event) => { if (!calendarOpen && !event.currentTarget.contains(event.relatedTarget as Node)) commitDraft(); }}>
    <div className="inline-date-mask" aria-label={label}>
      <input ref={dayInputRef} className="inline-date-text inline-date-part" aria-label={`${label} ngày`} inputMode="numeric" maxLength={2} value={dateParts.day} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updatePart("day", event.target.value)} onKeyDown={(event) => handlePartKeyDown(event, "day")} />
      <span aria-hidden="true">/</span>
      <input ref={monthInputRef} className="inline-date-text inline-date-part" aria-label={`${label} tháng`} inputMode="numeric" maxLength={2} value={dateParts.month} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updatePart("month", event.target.value)} onKeyDown={(event) => handlePartKeyDown(event, "month")} />
      <span aria-hidden="true">/</span>
      <input ref={yearInputRef} className="inline-date-text inline-date-part" aria-label={`${label} năm`} inputMode="numeric" maxLength={2} value={dateParts.year} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updatePart("year", event.target.value)} onKeyDown={(event) => handlePartKeyDown(event, "year")} />
    </div>
    <button ref={calendarButtonRef} type="button" className="inline-date-button" title={`Chọn ${label.toLocaleLowerCase("vi")}`} aria-label={`Chọn ${label.toLocaleLowerCase("vi")}`} onMouseDown={(event) => event.preventDefault()} onClick={openDatePicker}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3.5h10v9H3zM5 2v3M11 2v3M3 6h10M5.5 8.5h2M9 8.5h1.5M5.5 11h2" /></svg></button>
    {calendarOpen && createPortal(<div ref={calendarRef} className="vi-calendar" style={{ left: calendarPosition.left, top: calendarPosition.top }} role="dialog" aria-label={`Lịch chọn ${label.toLocaleLowerCase("vi")}`}>
      <header><button type="button" aria-label="Tháng trước" onClick={() => setViewMonth(new Date(calendarYear, calendarMonth - 1, 1))}>‹</button><strong>Tháng {calendarMonth + 1} năm {calendarYear}</strong><button type="button" aria-label="Tháng sau" onClick={() => setViewMonth(new Date(calendarYear, calendarMonth + 1, 1))}>›</button></header>
      <div className="vi-calendar-weekdays">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
      <div className="vi-calendar-days">{calendarDays.map((date) => {
        const isOutside = date.getMonth() !== calendarMonth;
        const isSelected = selectedDate?.toDateString() === date.toDateString();
        const isToday = today.toDateString() === date.toDateString();
        return <button key={formatDisplayDate(date)} type="button" className={`${isOutside ? "outside" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`} onClick={() => selectCalendarDate(date)}>{date.getDate()}</button>;
      })}</div>
      <footer><button type="button" onClick={() => selectCalendarDate(new Date())}>Hôm nay</button></footer>
    </div>, document.body)}
  </div>;
}

function ScheduleView({ projects, onNotice }: { projects: Project[]; onNotice: (message: string) => void }) {
  const scheduleHistory = useUndoRedo(initialScheduleState, 100);
  const persistedProjectFingerprintsRef = useRef(new Map<string, string>());
  const { items, dependencies } = scheduleHistory.value;
  const [selectedItemId, setSelectedItemId] = useState("ba-k95");
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | null>(null);
  const [dependencyEditorTaskId, setDependencyEditorTaskId] = useState<string | null>(null);
  const [dependencyDrafts, setDependencyDrafts] = useState<DependencyDraft[]>([]);
  const [dependencySearch, setDependencySearch] = useState("");
  const [dependencyEditorError, setDependencyEditorError] = useState("");
  const [dependencyDrag, setDependencyDrag] = useState<DependencyDragState | null>(null);
  const [wbsDrag, setWbsDrag] = useState<WbsDragState | null>(null);
  const wbsDragRef = useRef<WbsDragState | null>(null);
  const wbsDropPreviewRef = useRef<TreeInsertionSlot | null>(null);
  const wbsSlotGeometriesRef = useRef<WbsSlotGeometry[]>([]);
  const wbsCaptureElementRef = useRef<HTMLDivElement | null>(null);
  const wbsInsertionLineRef = useRef<HTMLDivElement | null>(null);
  const suppressWbsClickRef = useRef(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const commonDialog = useCommonDialog();
  const [outlineLevel, setOutlineLevel] = useState(4);
  const [autoEditItemId, setAutoEditItemId] = useState<string | null>(null);
  const [taskDetailMode, setTaskDetailMode] = useState<"docked" | "collapsed" | "hidden">("docked");
  const [ganttDayStep, setGanttDayStep] = useState(1);
  const [taskNameColumnWidth, setTaskNameColumnWidth] = useState(minimumTaskNameColumnWidth);
  const [columnGroupVisibility, setColumnGroupVisibility] = useState<TaskGridColumnGroupVisibility>({ basic: true, progress: true, estimate: false, resource: false });
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [taskContextMenu, setTaskContextMenu] = useState<TaskContextMenuState | null>(null);
  const taskGridHeaderScrollRef = useRef<HTMLDivElement>(null);
  const taskGridBodyScrollRef = useRef<HTMLDivElement>(null);
  const taskGridBottomScrollRef = useRef<HTMLDivElement>(null);
  const ganttHeaderScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const ganttBottomScrollRef = useRef<HTMLDivElement>(null);
  const ganttContentRef = useRef<HTMLDivElement>(null);
  const taskDetailNameInputRef = useRef<HTMLInputElement>(null);
  const visibleProjectIds = useMemo(() => new Set(projects.filter((project) => project.visible).map((project) => project.id)), [projects]);
  const projectStatusById = useMemo(() => new Map(projects.map((project) => [project.id, project.status])), [projects]);
  const projectIdsKey = projects.map((project) => project.id).sort().join("|");
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const scheduleOrder = useMemo(() => calculateScheduleOrder(items), [items]);
  const incomingDependencies = useMemo(() => {
    const result = new Map<string, TaskDependency[]>();
    dependencies.forEach((dependency) => result.set(dependency.successorTaskId, [...(result.get(dependency.successorTaskId) ?? []), dependency]));
    return result;
  }, [dependencies]);
  const summaryDates = useMemo(() => {
    const result = new Map<string, { startDate: string; finishDate: string; duration: number }>();
    items.filter((item) => item.type !== "task").forEach((summary) => {
      const taskDates = items
        .filter((item) => item.type === "task" && isScheduleDescendant(item, summary.id, itemById))
        .map((item) => ({ start: parseDisplayDate(item.startDate), finish: parseDisplayDate(item.finishDate) }))
        .filter((dates): dates is { start: Date; finish: Date } => Boolean(dates.start && dates.finish));
      if (!taskDates.length) return;
      const start = new Date(Math.min(...taskDates.map((dates) => dates.start.getTime())));
      const finish = new Date(Math.max(...taskDates.map((dates) => dates.finish.getTime())));
      result.set(summary.id, { startDate: formatDisplayDate(start), finishDate: formatDisplayDate(finish), duration: differenceInCalendarDays(finish, start) + 1 });
    });
    return result;
  }, [itemById, items]);
  const visibleItems = useMemo(() => items.filter((item) => {
    if (!visibleProjectIds.has(item.projectId)) return false;
    if (getScheduleTreeDepth(item, itemById) + 1 > outlineLevel) return false;
    let parentId = item.parentId;
    while (parentId) {
      if (collapsedIds.has(parentId)) return false;
      parentId = itemById.get(parentId)?.parentId ?? null;
    }
    return true;
  }), [collapsedIds, itemById, items, outlineLevel, visibleProjectIds]);
  const timeline = useMemo(() => {
    const scheduleProjectStartDates = items
      .filter((item) => visibleProjectIds.has(item.projectId) && item.type === "project")
      .map((item) => parseDisplayDate(item.startDate))
      .filter((date): date is Date => Boolean(date));
    const fallbackProjectStartDates = projects
      .filter((project) => visibleProjectIds.has(project.id))
      .map((project) => parseIsoDate(project.startDate))
      .filter((date): date is Date => Boolean(date));
    const projectStartDates = scheduleProjectStartDates.length ? scheduleProjectStartDates : fallbackProjectStartDates;
    const taskFinishDates = items
      .filter((item) => visibleProjectIds.has(item.projectId) && item.type === "task")
      .map((item) => parseDisplayDate(item.finishDate))
      .filter((date): date is Date => Boolean(date));
    const fallbackFinishDates = projects
      .filter((project) => visibleProjectIds.has(project.id))
      .map((project) => parseIsoDate(project.finishDate))
      .filter((date): date is Date => Boolean(date));
    if (!projectStartDates.length) return null;
    const minimumProjectStartDate = new Date(Math.min(...projectStartDates.map((date) => date.getTime())));
    const startDate = addCalendarDays(minimumProjectStartDate, -3 * ganttDayStep);
    const finishCandidates = taskFinishDates.length ? taskFinishDates : fallbackFinishDates;
    const finishDate = finishCandidates.length
      ? new Date(Math.max(...finishCandidates.map((date) => date.getTime())))
      : new Date(startDate);
    const maximumFinishDate = finishDate < startDate ? new Date(startDate) : finishDate;
    const safeFinishDate = addCalendarDays(maximumFinishDate, 7 * ganttDayStep);
    const columnCount = Math.floor(differenceInCalendarDays(safeFinishDate, startDate) / ganttDayStep) + 1;
    const columns = Array.from({ length: columnCount }, (_, index) => addCalendarDays(startDate, index * ganttDayStep));
    const createGroups = (getKey: (date: Date) => string, getLabel: (date: Date) => string) => {
      const groups: Array<{ key: string; label: string; count: number }> = [];
      columns.forEach((date) => {
        const key = getKey(date);
        const previous = groups.at(-1);
        if (previous?.key === key) previous.count += 1;
        else groups.push({ key, label: getLabel(date), count: 1 });
      });
      return groups;
    };
    const monthGroups = createGroups(
      (date) => `${date.getFullYear()}-${date.getMonth()}`,
      (date) => `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
    );
    const weekGroups = createGroups(
      (date) => `${date.getFullYear()}-${getIsoWeek(date)}`,
      (date) => `Tuần ${getIsoWeek(date)}`,
    );
    const today = new Date();
    const todayOffset = differenceInCalendarDays(today, startDate);
    const timelineDuration = differenceInCalendarDays(safeFinishDate, startDate);
    const todayColumnIndex = todayOffset >= 0 && todayOffset <= timelineDuration ? Math.floor(todayOffset / ganttDayStep) : -1;
    return {
      startDate,
      finishDate: safeFinishDate,
      columns,
      monthGroups,
      weekGroups,
      todayColumnIndex,
      width: columns.length * ganttColumnWidth,
    };
  }, [ganttDayStep, items, projects, visibleProjectIds]);
  const timelineStartTime = timeline?.startDate.getTime();
  const visibleProjectKey = [...visibleProjectIds].sort().join("|");

  useEffect(() => {
    if (ganttScrollRef.current) ganttScrollRef.current.scrollLeft = 0;
    if (ganttHeaderScrollRef.current) ganttHeaderScrollRef.current.scrollLeft = 0;
    if (ganttBottomScrollRef.current) ganttBottomScrollRef.current.scrollLeft = 0;
  }, [timelineStartTime, visibleProjectKey]);
  const basicColumnWidths = [50, 75, taskNameColumnWidth];
  const scheduleColumnWidths = [74, 92, 92, 50, 115];
  const estimateColumnWidths = [60, 86, 100];
  const resourceColumnWidths = [50, 50, 60, 60];
  const visibleColumnWidths = [
    ...basicColumnWidths,
    ...(columnGroupVisibility.progress ? scheduleColumnWidths : []),
    ...(columnGroupVisibility.estimate ? estimateColumnWidths : []),
    ...(columnGroupVisibility.resource ? resourceColumnWidths : []),
  ];
  const scheduleTableWidth = visibleColumnWidths.reduce((sum, width) => sum + width, 0);
  const scheduleGridTemplate = visibleColumnWidths.map((width) => `${width}px`).join(" ");
  const scheduleBoardStyle = {
    "--schedule-name-width": `${taskNameColumnWidth}px`,
    "--schedule-table-width": `${scheduleTableWidth}px`,
    "--schedule-grid-template": scheduleGridTemplate,
  } as CSSProperties;
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? visibleItems[0];
  const dependencyEditorTask = items.find((item) => item.id === dependencyEditorTaskId);
  const dependencyCandidates = items.filter((item) => {
    if (!dependencyEditorTask || item.type !== "task" || item.projectId !== dependencyEditorTask.projectId || item.id === dependencyEditorTask.id) return false;
    const keyword = dependencySearch.trim().toLocaleLowerCase("vi");
    return !keyword || `${scheduleOrder.get(item.id) ?? ""} ${item.name}`.toLocaleLowerCase("vi").includes(keyword);
  });
  const selectedSummaryDates = selectedItem?.type === "task" ? null : summaryDates.get(selectedItem?.id ?? "");
  const contextTask = taskContextMenu ? items.find((item) => item.id === taskContextMenu.taskId && item.type === "task") : undefined;
  const hasChildren = (itemId: string) => items.some((item) => item.parentId === itemId);
  const areAllColumnGroupsVisible = Object.values(columnGroupVisibility).every(Boolean);

  useEffect(() => {
    let cancelled = false;
    Promise.all(projects.map((project) => requestApi<ProjectScheduleDto>(`/api/projects/${project.id}/schedule`)))
      .then((groups) => {
        if (cancelled) return;
        const loadedState: ScheduleState = {
          items: buildScheduleItems(projects, groups.flatMap((group) => group.workItems)),
          dependencies: groups.flatMap((group) => group.dependencies.map((dependency) => ({
            id: dependency.id,
            projectId: dependency.projectId,
            predecessorTaskId: dependency.predecessorTaskId,
            successorTaskId: dependency.successorTaskId,
            dependencyType: dependency.dependencyType,
            lag: dependency.lagDays,
          }))),
        };
        scheduleHistory.reset(loadedState);
        persistedProjectFingerprintsRef.current = new Map(projects.map((project) =>
          [project.id, JSON.stringify(buildProjectSchedulePayload(project.id, loadedState.items, loadedState.dependencies))]));
        setSelectedItemId(projects[0]?.id ?? "");
        setScheduleLoading(false);
      })
      .catch((error: Error) => { if (!cancelled) { setScheduleLoading(false); onNotice(error.message); } });
    return () => { cancelled = true; };
  // Reload WBS only when the project collection changes, not when visibility/details change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdsKey]);

  async function saveSchedule() {
    setScheduleSaving(true);
    try {
      const dirtyProjects = projects.map((project) => ({ project, payload: buildProjectSchedulePayload(project.id, items, dependencies) }))
        .filter(({ project, payload }) => persistedProjectFingerprintsRef.current.get(project.id) !== JSON.stringify(payload));
      if (!dirtyProjects.length) { onNotice("Không có thay đổi cần lưu"); return; }
      const results = await Promise.allSettled(dirtyProjects.map(async ({ project, payload }) => {
        await requestApi<ProjectScheduleDto>(`/api/projects/${project.id}/schedule`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        persistedProjectFingerprintsRef.current.set(project.id, JSON.stringify(payload));
        return project;
      }));
      const failures = results.flatMap((result, index) => result.status === "rejected"
        ? [`${dirtyProjects[index].project.name}: ${result.reason instanceof Error ? result.reason.message : "Không thể lưu"}`]
        : []);
      if (failures.length) {
        onNotice(`Một số dự án chưa lưu được: ${failures.join("; ")}`);
        return;
      }
      scheduleHistory.reset({ items, dependencies });
      onNotice("Đã lưu cây WBS và quan hệ công việc vào cơ sở dữ liệu");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể lưu cây WBS");
    } finally { setScheduleSaving(false); }
  }

  function toggleColumnGroup(group: Exclude<TaskGridColumnGroup, "basic">) {
    setColumnGroupVisibility((current) => ({ ...current, [group]: !current[group] }));
  }

  function syncTaskGridHorizontalScroll(scrollLeft: number, source: "header" | "body" | "dock") {
    const targets = [
      source === "header" ? null : taskGridHeaderScrollRef.current,
      source === "body" ? null : taskGridBodyScrollRef.current,
      source === "dock" ? null : taskGridBottomScrollRef.current,
    ];
    targets.forEach((target) => {
      if (target && Math.abs(target.scrollLeft - scrollLeft) > 1) target.scrollLeft = scrollLeft;
    });
  }

  const commitItems = useCallback((next: ScheduleItem[] | ((current: ScheduleItem[]) => ScheduleItem[]), options: { description: string; mergeKey?: string }) => {
    scheduleHistory.commit((current) => ({
      ...current,
      items: typeof next === "function" ? next(current.items) : next,
    }), options);
  }, [scheduleHistory]);

  function openTaskContextMenu(event: ReactMouseEvent<HTMLDivElement>, task: ScheduleItem) {
    if (task.type !== "task") return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedItemId(task.id);
    setTaskContextMenu({
      taskId: task.id,
      x: Math.max(4, Math.min(event.clientX, globalThis.innerWidth - 238)),
      y: Math.max(4, Math.min(event.clientY, globalThis.innerHeight - 132)),
    });
  }

  function openTaskDetails(task: ScheduleItem) {
    setSelectedItemId(task.id);
    setTaskDetailMode("docked");
    setTaskContextMenu(null);
    globalThis.requestAnimationFrame(() => {
      taskDetailNameInputRef.current?.focus();
      taskDetailNameInputRef.current?.select();
    });
  }

  function getTaskToGroupHierarchyValidation(task: ScheduleItem) {
    const parent = itemById.get(task.parentId ?? "");
    if (parent?.type !== "workItem") return "Chỉ có thể chuyển Công tác trực tiếp dưới Hạng mục thành Nhóm.";
    return null;
  }

  async function convertTaskToGroup(task: ScheduleItem) {
    const validationMessage = getTaskToGroupHierarchyValidation(task);
    setTaskContextMenu(null);
    if (validationMessage) {
      onNotice(validationMessage);
      return;
    }
    const hasRelations = dependencies.some((dependency) => dependency.predecessorTaskId === task.id || dependency.successorTaskId === task.id);
    const hasTaskData = Boolean(task.unit || task.quantity != null || task.machineShiftCoefficient != null || task.machineCount != null || task.managedLabor != null || task.permanentLabor != null || task.allocation || task.nature || task.progress !== 0);
    if ((hasRelations || hasTaskData) && !await commonDialog.confirm({
      title: "Chuyển Công tác thành Nhóm",
      message: `Công tác “${task.name}” có ${hasRelations ? "quan hệ công việc" : "dữ liệu nghiệp vụ riêng"}${hasRelations && hasTaskData ? " và dữ liệu nghiệp vụ riêng" : ""}.`,
      detail: "Khi tiếp tục, các quan hệ công việc liên quan và dữ liệu chỉ dành cho Công tác sẽ bị xóa.",
      confirmText: "Bỏ liên kết và chuyển",
      tone: "warning",
    })) return;

    scheduleHistory.commit(
      (current) => {
        const converted = convertTaskToGroupWithFollowingTasks(current.items, task.id, (item) => ({
          ...item,
          type: "group",
          unit: undefined,
          quantity: undefined,
          progress: 0,
          machineShiftCoefficient: undefined,
          machineCount: undefined,
          managedLabor: undefined,
          permanentLabor: undefined,
          allocation: undefined,
          nature: undefined,
        }));
        if (!converted) return current;
        return {
          items: recalculateScheduleWbs(converted),
          dependencies: current.dependencies.filter((dependency) => dependency.predecessorTaskId !== task.id && dependency.successorTaskId !== task.id),
        };
      },
      { description: `Chuyển ${task.wbs} · ${task.name} thành Nhóm` },
    );
    setSelectedItemId(task.id);
    onNotice(`Đã chuyển “${task.name}” thành Nhóm`);
  }

  useEffect(() => {
    if (!taskContextMenu) return;
    function closeOnPointerDown(event: globalThis.PointerEvent) {
      if (!(event.target as HTMLElement | null)?.closest(".task-context-menu")) setTaskContextMenu(null);
    }
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setTaskContextMenu(null);
    }
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [taskContextMenu]);

  function startWbsDrag(event: ReactPointerEvent<HTMLDivElement>, item: ScheduleItem) {
    if (event.button !== 0 || item.type === "project") return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextDrag = { sourceId: item.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, isActive: false };
    wbsCaptureElementRef.current = event.currentTarget;
    wbsDragRef.current = nextDrag;
    wbsDropPreviewRef.current = null;
    wbsSlotGeometriesRef.current = [];
    setWbsDrag(nextDrag);
    setSelectedItemId(item.id);
  }

  const refreshWbsSlotGeometries = useCallback((sourceId: string) => {
    const pane = taskGridBodyScrollRef.current;
    if (!pane) return [];
    const rowElements = new Map<string, HTMLElement>();
    pane.querySelectorAll<HTMLElement>("[data-wbs-row-id]").forEach((row) => {
      if (row.dataset.wbsRowId) rowElements.set(row.dataset.wbsRowId, row);
    });
    const slots = buildTreeInsertionSlots(items, visibleItems.map((item) => item.id), sourceId);
    const geometries = slots.flatMap<WbsSlotGeometry>((slot) => {
      const row = rowElements.get(slot.lineItemId);
      if (!row) return [];
      const rowRect = row.getBoundingClientRect();
      const nameCellRect = row.children.item(2)?.getBoundingClientRect();
      return [{ ...slot, y: slot.lineEdge === "before" ? rowRect.top : rowRect.bottom, x: (nameCellRect?.left ?? rowRect.left) + 10 + slot.depth * 18 }];
    });
    wbsSlotGeometriesRef.current = geometries;
    return geometries;
  }, [items, visibleItems]);

  useEffect(() => {
    if (!wbsDrag) return;
    function clearDrag() {
      const currentDrag = wbsDragRef.current;
      const captureElement = wbsCaptureElementRef.current;
      if (currentDrag && captureElement?.hasPointerCapture(currentDrag.pointerId)) captureElement.releasePointerCapture(currentDrag.pointerId);
      document.documentElement.classList.remove("wbs-reordering");
      globalThis.getSelection()?.removeAllRanges();
      wbsDragRef.current = null;
      wbsDropPreviewRef.current = null;
      wbsSlotGeometriesRef.current = [];
      wbsCaptureElementRef.current = null;
      if (wbsInsertionLineRef.current) wbsInsertionLineRef.current.style.display = "none";
      setWbsDrag(null);
    }
    function renderInsertionLine(slot: WbsSlotGeometry | null) {
      const line = wbsInsertionLineRef.current;
      const paneRect = taskGridBodyScrollRef.current?.getBoundingClientRect();
      if (!line || !slot || !paneRect) {
        if (line) line.style.display = "none";
        return;
      }
      line.style.display = "block";
      line.style.left = `${paneRect.left}px`;
      line.style.top = `${slot.y - 1}px`;
      line.style.width = `${paneRect.width}px`;
    }
    function handlePointerMove(event: globalThis.PointerEvent) {
      const currentDrag = wbsDragRef.current;
      if (!currentDrag || event.pointerId !== currentDrag.pointerId) return;
      const hasExceededThreshold = currentDrag.isActive || Math.hypot(event.clientX - currentDrag.startX, event.clientY - currentDrag.startY) >= 4;
      if (!hasExceededThreshold) return;
      event.preventDefault();
      if (!currentDrag.isActive) {
        const activeDrag = { ...currentDrag, isActive: true };
        wbsDragRef.current = activeDrag;
        setWbsDrag(activeDrag);
        document.documentElement.classList.add("wbs-reordering");
        refreshWbsSlotGeometries(currentDrag.sourceId);
      }
      const paneRect = taskGridBodyScrollRef.current?.getBoundingClientRect();
      if (!paneRect || event.clientX < paneRect.left || event.clientX > paneRect.right || event.clientY < paneRect.top || event.clientY > paneRect.bottom) {
        wbsDropPreviewRef.current = null;
        renderInsertionLine(null);
        return;
      }
      const geometries = wbsSlotGeometriesRef.current;
      const closestY = Math.min(...geometries.map((slot) => Math.abs(slot.y - event.clientY)));
      const verticalCandidates = geometries.filter((slot) => Math.abs(Math.abs(slot.y - event.clientY) - closestY) < .5);
      const preview = closestY <= 22
        ? verticalCandidates.reduce<WbsSlotGeometry | null>((closest, slot) => !closest || Math.abs(slot.x - event.clientX) < Math.abs(closest.x - event.clientX) ? slot : closest, null)
        : null;
      if (preview?.id === wbsDropPreviewRef.current?.id) return;
      wbsDropPreviewRef.current = preview;
      renderInsertionLine(preview);
    }
    function finishDrag(event: globalThis.PointerEvent) {
      const currentDrag = wbsDragRef.current;
      if (!currentDrag || event.pointerId !== currentDrag.pointerId) return;
      const preview = wbsDropPreviewRef.current;
      if (currentDrag.isActive && preview) {
        const moved = moveTreeItemToSlot(items, currentDrag.sourceId, preview);
        if (moved) {
          const source = items.find((item) => item.id === currentDrag.sourceId);
          commitItems(recalculateScheduleWbs(moved), { description: `Di chuyển ${source?.wbs ?? "dòng"} · ${source?.name ?? "WBS"}` });
          setSelectedItemId(currentDrag.sourceId);
          onNotice(`Đã di chuyển “${source?.name ?? "dòng WBS"}”`);
        }
      }
      suppressWbsClickRef.current = currentDrag.isActive;
      clearDrag();
    }
    function cancelDrag(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      clearDrag();
    }
    function refreshGeometry() {
      const currentDrag = wbsDragRef.current;
      if (currentDrag?.isActive) {
        const geometries = refreshWbsSlotGeometries(currentDrag.sourceId);
        const activeSlot = geometries.find((slot) => slot.id === wbsDropPreviewRef.current?.id) ?? null;
        wbsDropPreviewRef.current = activeSlot;
        renderInsertionLine(activeSlot);
      }
    }
    document.addEventListener("pointermove", handlePointerMove, { passive: false });
    document.addEventListener("pointerup", finishDrag);
    document.addEventListener("pointercancel", clearDrag);
    document.addEventListener("keydown", cancelDrag);
    document.addEventListener("scroll", refreshGeometry, true);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", finishDrag);
      document.removeEventListener("pointercancel", clearDrag);
      document.removeEventListener("keydown", cancelDrag);
      document.removeEventListener("scroll", refreshGeometry, true);
    };
  }, [commitItems, items, onNotice, refreshWbsSlotGeometries, wbsDrag]);

  function createDependencyId() {
    return globalThis.crypto?.randomUUID?.() ?? `dependency-${Date.now()}`;
  }

  function commitDependency(candidate: TaskDependency, description: string) {
    const validation = validateTaskDependency(candidate, dependencies, items);
    if (!validation.isValid) {
      onNotice(validation.message);
      return false;
    }
    scheduleHistory.commit((current) => {
      const nextDependencies = [...current.dependencies, candidate];
      return {
        dependencies: nextDependencies,
        items: propagateDependencySchedule(current.items, nextDependencies, [candidate.predecessorTaskId]),
      };
    }, { description });
    setSelectedDependencyId(candidate.id);
    return true;
  }

  function openDependencyEditor(task: ScheduleItem, dependencyId?: string) {
    if (task.type !== "task") {
      onNotice("Chỉ công tác thực hiện mới có quan hệ trước–sau");
      return;
    }
    setDependencyEditorTaskId(task.id);
    setDependencyDrafts((incomingDependencies.get(task.id) ?? []).map((dependency) => ({
      id: dependency.id,
      predecessorTaskId: dependency.predecessorTaskId,
      dependencyType: dependency.dependencyType,
      lag: dependency.lag,
    })));
    setDependencySearch("");
    setDependencyEditorError("");
    setSelectedDependencyId(dependencyId ?? null);
  }

  function addDependencyDraft() {
    const successor = items.find((item) => item.id === dependencyEditorTaskId);
    if (!successor) return;
    const usedIds = new Set(dependencyDrafts.map((draft) => draft.predecessorTaskId));
    const predecessor = items.find((item) => item.type === "task" && item.projectId === successor.projectId && item.id !== successor.id && !usedIds.has(item.id));
    if (!predecessor) {
      setDependencyEditorError("Không còn công tác trước hợp lệ để thêm");
      return;
    }
    setDependencyDrafts((current) => [...current, { id: createDependencyId(), predecessorTaskId: predecessor.id, dependencyType: "FS", lag: 0 }]);
    setDependencyEditorError("");
  }

  function saveDependencyEditor() {
    const successor = items.find((item) => item.id === dependencyEditorTaskId);
    if (!successor) return;
    const untouchedDependencies = dependencies.filter((dependency) => dependency.successorTaskId !== successor.id);
    const nextIncoming: TaskDependency[] = [];
    for (const draft of dependencyDrafts) {
      const candidate: TaskDependency = {
        ...draft,
        projectId: successor.projectId,
        successorTaskId: successor.id,
        lag: Math.trunc(Number(draft.lag) || 0),
      };
      const validation = validateTaskDependency(candidate, [...untouchedDependencies, ...nextIncoming], items);
      if (!validation.isValid) {
        setDependencyEditorError(validation.message);
        return;
      }
      nextIncoming.push(candidate);
    }
    scheduleHistory.commit((current) => ({
      dependencies: [...current.dependencies.filter((dependency) => dependency.successorTaskId !== successor.id), ...nextIncoming],
      items: propagateDependencySchedule(
        current.items,
        [...current.dependencies.filter((dependency) => dependency.successorTaskId !== successor.id), ...nextIncoming],
        nextIncoming.length ? nextIncoming.map((dependency) => dependency.predecessorTaskId) : [successor.id],
      ),
    }), { description: `Cập nhật quan hệ công việc của ${successor.name}` });
    setDependencyEditorTaskId(null);
    setDependencyEditorError("");
    onNotice(`Đã cập nhật quan hệ công việc của ${successor.name}`);
  }

  async function deleteSelectedDependency() {
    const dependency = dependencies.find((item) => item.id === selectedDependencyId);
    if (!dependency) return;
    const predecessor = itemById.get(dependency.predecessorTaskId);
    const successor = itemById.get(dependency.successorTaskId);
    if (!await commonDialog.confirm({
      title: "Bỏ quan hệ công việc",
      message: `Bỏ quan hệ ${dependency.dependencyType} giữa “${predecessor?.name ?? "Công tác trước"}” và “${successor?.name ?? "Công tác sau"}”?`,
      detail: "Lịch tiến độ sẽ được tính lại sau khi bỏ quan hệ này.",
      confirmText: "Bỏ liên kết",
      tone: "warning",
    })) return;
    scheduleHistory.commit((current) => {
      const nextDependencies = current.dependencies.filter((item) => item.id !== dependency.id);
      const hasRemainingPredecessor = nextDependencies.some((item) => item.successorTaskId === dependency.successorTaskId);
      return {
        dependencies: nextDependencies,
        items: hasRemainingPredecessor
          ? propagateDependencySchedule(current.items, nextDependencies, [dependency.predecessorTaskId])
          : current.items,
      };
    }, {
      description: `Xóa quan hệ ${dependency.dependencyType} giữa ${predecessor?.name ?? "công tác trước"} và ${successor?.name ?? "công tác sau"}`,
    });
    setSelectedDependencyId(null);
    onNotice("Đã xóa quan hệ công việc");
  }


  useEffect(() => {
    function handleHistoryShortcut(event: globalThis.KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLocaleLowerCase();
      if (key === "z" && !event.shiftKey && scheduleHistory.canUndo) {
        event.preventDefault();
        const description = scheduleHistory.undoDescription;
        scheduleHistory.undo();
        onNotice(`Đã hoàn tác: ${description}`);
      } else if ((key === "y" || (key === "z" && event.shiftKey)) && scheduleHistory.canRedo) {
        event.preventDefault();
        const description = scheduleHistory.redoDescription;
        scheduleHistory.redo();
        onNotice(`Đã làm lại: ${description}`);
      }
    }
    document.addEventListener("keydown", handleHistoryShortcut);
    return () => document.removeEventListener("keydown", handleHistoryShortcut);
  }, [onNotice, scheduleHistory]);

  useEffect(() => {
    function handleDependencyDelete(event: globalThis.KeyboardEvent) {
      if (event.key !== "Delete" || !selectedDependencyId) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      deleteSelectedDependency();
    }
    document.addEventListener("keydown", handleDependencyDelete);
    return () => document.removeEventListener("keydown", handleDependencyDelete);
  });

  useEffect(() => {
    if (!dependencyDrag) return;
    const sourceTaskId = dependencyDrag.sourceTaskId;
    function handlePointerMove(event: globalThis.PointerEvent) {
      const content = ganttContentRef.current;
      if (!content) return;
      const rect = content.getBoundingClientRect();
      setDependencyDrag((current) => {
        if (!current) return null;
        const distance = Math.hypot(event.clientX - current.initialPointerPosition.x, event.clientY - current.initialPointerPosition.y);
        return { ...current, pointerPosition: { x: event.clientX - rect.left, y: event.clientY - rect.top }, hasExceededThreshold: current.hasExceededThreshold || distance >= 5 };
      });
    }
    function finishDrag(event: globalThis.PointerEvent) {
      const activeDrag = dependencyDrag;
      if (!activeDrag.hasExceededThreshold) {
        setDependencyDrag(null);
        return;
      }
      const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-dependency-task]");
      const successorTaskId = targetElement?.dataset.taskId;
      if (successorTaskId) {
        const predecessor = items.find((item) => item.id === sourceTaskId);
        const successor = items.find((item) => item.id === successorTaskId);
        if (predecessor && successor) {
          const candidate: TaskDependency = { id: createDependencyId(), projectId: predecessor.projectId, predecessorTaskId: predecessor.id, successorTaskId: successor.id, dependencyType: "FS", lag: 0 };
          if (commitDependency(candidate, `Tạo quan hệ FS giữa ${predecessor.name} và ${successor.name}`)) {
            onNotice(`Đã tạo quan hệ FS: ${predecessor.name} → ${successor.name}`);
          }
        }
      }
      setDependencyDrag(null);
    }
    function cancelDrag(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setDependencyDrag(null);
    }
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", finishDrag, { once: true });
    document.addEventListener("pointercancel", finishDrag, { once: true });
    document.addEventListener("keydown", cancelDrag);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", finishDrag);
      document.removeEventListener("pointercancel", finishDrag);
      document.removeEventListener("keydown", cancelDrag);
    };
    // Pointer move chỉ cập nhật tọa độ; listener được tạo lại khi nguồn kéo thay đổi, không theo từng pixel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencyDrag?.hasExceededThreshold, dependencyDrag?.sourceTaskId]);

  function toggleCollapse(itemId: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  }

  function startTaskNameColumnResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = taskNameColumnWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    function handlePointerMove(pointerEvent: globalThis.PointerEvent) {
      setTaskNameColumnWidth(Math.max(minimumTaskNameColumnWidth, Math.min(maximumTaskNameColumnWidth, startWidth + pointerEvent.clientX - startX)));
    }
    function finishResize() {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", finishResize);
      document.removeEventListener("pointercancel", finishResize);
    }
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", finishResize);
    document.addEventListener("pointercancel", finishResize);
  }

  function updateSelected(changes: Partial<ScheduleItem>, description?: string, mergeKey?: string) {
    if (!selectedItem) return;
    commitItems(
      (current) => current.map((item) => item.id === selectedItem.id ? { ...item, ...changes } : item),
      { description: description ?? `Sửa ${selectedItem.wbs} · ${selectedItem.name}`, mergeKey: mergeKey ?? `edit-${selectedItem.id}` },
    );
    onNotice(`Đã cập nhật nháp: ${selectedItem.name}`);
  }

  function updateDuration(target: ScheduleItem, durationValue: number) {
    const duration = Math.max(1, Math.trunc(durationValue || 1));
    const finishDate = calculateFinishDate(target.startDate, duration) ?? target.finishDate;
    const ganttWidthPerDay = target.ganttWidth / Math.max(1, target.duration);
    const ganttWidth = Math.max(1, Math.min(100 - target.ganttLeft, ganttWidthPerDay * duration));
    scheduleHistory.commit((current) => {
      const changedItems = current.items.map((item) => item.id === target.id ? { ...item, duration, finishDate, ganttWidth } : item);
      return { ...current, items: propagateDependencySchedule(changedItems, current.dependencies, [target.id]) };
    }, { description: `Đổi thời lượng ${target.wbs} thành ${duration} ngày`, mergeKey: `duration-${target.id}` });
    onNotice(`Đã cập nhật thời lượng và ngày kết thúc của ${target.name}`);
  }

  function updateScheduleDate(target: ScheduleItem, field: "startDate" | "finishDate", value: string) {
    const oldDuration = Math.max(1, target.duration);
    const startDate = field === "startDate" ? value : target.startDate;
    let finishDate = field === "finishDate" ? value : target.finishDate;
    if (field === "startDate" && calculateDuration(startDate, finishDate) == null) {
      finishDate = calculateFinishDate(startDate, oldDuration) ?? finishDate;
    }
    const duration = calculateDuration(startDate, finishDate);
    if (!duration) {
      onNotice("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu");
      return false;
    }
    const ganttWidthPerDay = target.ganttWidth / Math.max(1, target.duration);
    const ganttWidth = Math.max(1, Math.min(100 - target.ganttLeft, ganttWidthPerDay * duration));
    const changes: Partial<ScheduleItem> = { startDate, finishDate, duration, ganttWidth };
    scheduleHistory.commit((current) => {
      const changedItems = current.items.map((item) => item.id === target.id ? { ...item, ...changes } : item);
      const recalibratedDependencies = recalibrateIncomingDependencyLags(changedItems, current.dependencies, target.id, {
        start: field === "startDate",
        finish: field === "finishDate" || finishDate !== target.finishDate,
      });
      return { dependencies: recalibratedDependencies, items: propagateDependencySchedule(changedItems, recalibratedDependencies, [target.id]) };
    }, { description: `Đổi ${field === "startDate" ? "ngày bắt đầu" : "ngày kết thúc"} ${target.wbs}`, mergeKey: `date-${field}-${target.id}` });
    onNotice(`Đã cập nhật ngày, thời lượng và Gantt của ${target.name}`);
    return true;
  }

  function insertScheduleItem(context: ScheduleItem | undefined, position: "before" | "after") {
    const projectId = context?.projectId ?? projects.find((project) => project.visible)?.id;
    if (!projectId) {
      onNotice("Hãy chọn ít nhất một dự án trước khi thêm công việc");
      return;
    }
    const projectRoot = items.find((item) => item.projectId === projectId && item.type === "project");
    if (!context || !projectRoot) return;
    const isProjectRoot = context.type === "project";
    const parentId = isProjectRoot ? context.id : context.parentId;
    const itemType: ScheduleItemType = isProjectRoot ? "workItem" : context.type;
    const defaultNames: Record<ScheduleItemType, string> = {
      project: "Dự án mới",
      workItem: "Hạng mục mới",
      group: "Nhóm công việc mới",
      task: "Công tác mới",
    };
    const newItem: ScheduleItem = {
      id: createEntityId(),
      projectId,
      parentId,
      type: itemType,
      wbs: "",
      name: defaultNames[itemType],
      duration: 5,
      startDate: "03/09/26",
      finishDate: "07/09/26",
      progress: 0,
      ganttLeft: 44,
      ganttWidth: 10,
    };
    let insertIndex = items.indexOf(context);
    if (isProjectRoot) {
      if (position === "before") insertIndex += 1;
      else {
        insertIndex += 1;
        while (insertIndex < items.length && items[insertIndex].projectId === context.projectId) insertIndex += 1;
      }
    } else if (position === "after") {
      insertIndex += 1;
      while (insertIndex < items.length && isScheduleDescendant(items[insertIndex], context.id, itemById)) insertIndex += 1;
    }
    const nextItems = recalculateScheduleWbs([
      ...items.slice(0, insertIndex),
      newItem,
      ...items.slice(insertIndex),
    ]);
    const insertedItem = nextItems.find((item) => item.id === newItem.id) ?? newItem;
    commitItems(nextItems, { description: `Chèn ${insertedItem.wbs} · ${insertedItem.name} ${position === "before" ? "phía trên" : "phía dưới"}` });
    setSelectedItemId(newItem.id);
    setAutoEditItemId(newItem.id);
    onNotice(`Đã chèn “${insertedItem.name}” ${position === "before" ? "phía trên" : "phía dưới"} dòng hiện tại`);
  }

  function addChildItem(parent: ScheduleItem) {
    if (parent.type !== "project" && parent.type !== "workItem" && parent.type !== "group") return;
    const itemType: ScheduleItemType = parent.type === "project" ? "workItem" : "task";
    const itemName = itemType === "workItem" ? "Hạng mục mới" : "Công tác mới";
    const newItem: ScheduleItem = {
      // ID is generated only when the user clicks an action button.
      id: createEntityId(),
      projectId: parent.projectId,
      parentId: parent.id,
      type: itemType,
      wbs: "",
      name: itemName,
      duration: 5,
      startDate: "03/09/26",
      finishDate: "07/09/26",
      progress: 0,
      ganttLeft: 44,
      ganttWidth: 10,
    };
    let insertIndex = items.indexOf(parent) + 1;
    while (insertIndex < items.length && isScheduleDescendant(items[insertIndex], parent.id, itemById)) insertIndex += 1;
    const nextItems = recalculateScheduleWbs([
      ...items.slice(0, insertIndex),
      newItem,
      ...items.slice(insertIndex),
    ]);
    commitItems(nextItems, { description: `${itemType === "workItem" ? "Thêm hạng mục" : "Thêm công tác con"} · ${parent.name}` });
    setCollapsedIds((current) => {
      if (!current.has(parent.id)) return current;
      const next = new Set(current);
      next.delete(parent.id);
      return next;
    });
    setSelectedItemId(newItem.id);
    setAutoEditItemId(newItem.id);
    onNotice(`Đã thêm “${newItem.name}” vào “${parent.name}”`);
  }

  async function deleteItem(targetItem?: ScheduleItem) {
    const target = targetItem ?? selectedItem;
    if (!target || target.type === "project") {
      onNotice("Không xóa dự án tại màn hình tiến độ");
      return;
    }
    const idsToDelete = new Set([target.id]);
    let changed = true;
    while (changed) {
      changed = false;
      items.forEach((item) => {
        if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
          idsToDelete.add(item.id);
          changed = true;
        }
      });
    }
    if (!await commonDialog.confirm({
      title: "Xóa dòng tiến độ",
      message: `Xóa “${target.name}” khỏi kế hoạch tiến độ?`,
      detail: idsToDelete.size > 1 ? `Toàn bộ ${idsToDelete.size - 1} dòng con và các quan hệ công việc liên quan cũng sẽ bị xóa.` : "Các quan hệ công việc liên quan cũng sẽ bị xóa.",
      confirmText: "Xóa",
      tone: "danger",
    })) return;
    scheduleHistory.commit(
      (current) => ({
        items: current.items.filter((item) => !idsToDelete.has(item.id)),
        dependencies: current.dependencies.filter((dependency) => !idsToDelete.has(dependency.predecessorTaskId) && !idsToDelete.has(dependency.successorTaskId)),
      }),
      { description: `Xóa ${target.wbs} · ${target.name}${idsToDelete.size > 1 ? ` và ${idsToDelete.size - 1} dòng con` : ""}` },
    );
    setSelectedItemId(target.parentId ?? visibleItems[0]?.id ?? "");
    onNotice(`Đã xóa “${target.name}” khỏi dữ liệu nháp tiến độ`);
  }

  function getTaskBarGeometry(taskId: string) {
    if (!timeline) return null;
    const rowIndex = visibleItems.findIndex((item) => item.id === taskId);
    const task = visibleItems[rowIndex];
    if (!task || task.type !== "task") return null;
    const startDate = parseDisplayDate(task.startDate);
    const finishDate = parseDisplayDate(task.finishDate);
    if (!startDate || !finishDate) return null;
    const left = Math.max(0, differenceInCalendarDays(startDate, timeline.startDate) / ganttDayStep * ganttColumnWidth);
    const durationDays = Math.max(1, differenceInCalendarDays(finishDate, startDate) + 1);
    const width = Math.max(4, durationDays / ganttDayStep * ganttColumnWidth);
    return { left, width, y: rowIndex * scheduleRowHeight + scheduleRowHeight / 2 };
  }

  function startDependencyDrag(event: ReactPointerEvent<HTMLSpanElement>, task: ScheduleItem, barLeft: number, barWidth: number, rowIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const sourcePoint = { x: barLeft + barWidth, y: rowIndex * scheduleRowHeight + scheduleRowHeight / 2 };
    setSelectedItemId(task.id);
    setSelectedDependencyId(null);
    setDependencyDrag({ sourceTaskId: task.id, sourcePoint, pointerPosition: sourcePoint, initialPointerPosition: { x: event.clientX, y: event.clientY }, hasExceededThreshold: false });
  }

  function isValidDependencyTarget(target: ScheduleItem) {
    if (!dependencyDrag || target.type !== "task") return false;
    const source = items.find((item) => item.id === dependencyDrag.sourceTaskId);
    if (!source) return false;
    const candidate: TaskDependency = {
      id: "dependency-drag-preview",
      projectId: source.projectId,
      predecessorTaskId: source.id,
      successorTaskId: target.id,
      dependencyType: "FS",
      lag: 0,
    };
    return validateTaskDependency(candidate, dependencies, items).isValid;
  }

  return <section className="schedule-screen">
    <div className="schedule-toolbar">
      <div className="schedule-toolbar-left">
        <button className="button primary" onClick={() => onNotice("Nhập tiến độ từ Excel sẽ được kết nối ở bước tiếp theo")}>▣ Nhập từ Excel</button>
        <button className="button secondary history-button" disabled={!scheduleHistory.canUndo} title={scheduleHistory.undoDescription ? `Hoàn tác: ${scheduleHistory.undoDescription} (Ctrl+Z)` : "Không có thao tác để hoàn tác"} onClick={() => { const description = scheduleHistory.undoDescription; scheduleHistory.undo(); onNotice(`Đã hoàn tác: ${description}`); }}>↶ Hoàn tác</button>
        <button className="button secondary history-button" disabled={!scheduleHistory.canRedo} title={scheduleHistory.redoDescription ? `Làm lại: ${scheduleHistory.redoDescription} (Ctrl+Y)` : "Không có thao tác để làm lại"} onClick={() => { const description = scheduleHistory.redoDescription; scheduleHistory.redo(); onNotice(`Đã làm lại: ${description}`); }}>↷ Làm lại</button>
        <button className="button" onClick={() => onNotice("Bộ lọc chi tiết sẽ được thiết kế ở bước tiếp theo")}>☰ Lọc</button>
      </div>
      <div className="schedule-toolbar-right">
        <button className="button" onClick={() => onNotice("Lịch làm việc sẽ quản lý ngày nghỉ, ca và ngoại lệ")}>▣ Lịch làm việc</button>
        <label className="gantt-step-control"><span>Cách nhau:</span><input type="number" min="1" max="365" value={ganttDayStep} aria-label="Số ngày trong một cột Gantt" onChange={(event) => setGanttDayStep(Math.max(1, Math.min(365, Math.trunc(Number(event.target.value) || 1))))} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><small>ngày</small></label>
        <button className="button secondary" onClick={() => onNotice("Lịch sử thay đổi sẽ được kết nối sau")}>◷ Lịch sử</button>
        <button className="button primary" disabled={scheduleSaving || scheduleLoading} onClick={saveSchedule}>▣ {scheduleSaving ? "Đang lưu..." : "Lưu thay đổi"}</button>
      </div>
    </div>

    <div className="schedule-board-shell" style={scheduleBoardStyle}>
      <div className="task-grid-column-selector" aria-label="Nhóm cột TaskGrid">
        <button type="button" className={columnGroupVisibility.progress ? "active" : ""} aria-pressed={columnGroupVisibility.progress} onClick={() => toggleColumnGroup("progress")}>Tiến độ</button>
        <button type="button" className={columnGroupVisibility.estimate ? "active" : ""} aria-pressed={columnGroupVisibility.estimate} onClick={() => toggleColumnGroup("estimate")}>Dự toán</button>
        <button type="button" className={columnGroupVisibility.resource ? "active" : ""} aria-pressed={columnGroupVisibility.resource} onClick={() => toggleColumnGroup("resource")}>Nguồn lực</button>
        <button type="button" className={areAllColumnGroupsVisible ? "active" : ""} aria-pressed={areAllColumnGroupsVisible} onClick={() => setColumnGroupVisibility({ basic: true, progress: true, estimate: true, resource: true })}>Tất cả</button>
      </div>
      <div className="schedule-board-header">
        <div ref={taskGridHeaderScrollRef} className="task-grid-header-scroll" onScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "header")}>
          <div className="task-grid-header-content" style={{ width: scheduleTableWidth }}>
            <div className="schedule-table-grid schedule-group-header">
              <div style={{ gridColumn: "span 3" }}>Cơ bản</div>
              {columnGroupVisibility.progress && <div style={{ gridColumn: "span 5" }}>Tiến độ</div>}
              {columnGroupVisibility.estimate && <div style={{ gridColumn: "span 3" }}>Dự toán</div>}
              {columnGroupVisibility.resource && <div style={{ gridColumn: "span 4" }}>Nguồn lực</div>}
            </div>
            <div className="schedule-table-grid schedule-grid-header">
              <div>STT</div><div>Tác vụ</div><div className="task-name-column-header"><span>Tên công việc</span><span className="outline-controls" aria-label="Cấp Outline">{[1, 2, 3, 4].map((level) => <button key={level} type="button" className={outlineLevel === level ? "active" : ""} aria-pressed={outlineLevel === level} title={`Outline ${level}`} onClick={() => setOutlineLevel(level)}>{level}</button>)}</span><button type="button" className="column-resizer" aria-label="Kéo để thay đổi độ rộng cột Tên công việc" title={`Độ rộng hiện tại: ${Math.round(taskNameColumnWidth)}px`} onPointerDown={startTaskNameColumnResize} /></div>
              {columnGroupVisibility.progress && <><div>Thời lượng</div><div>Bắt đầu</div><div>Kết thúc</div><div>Trước</div><div>Tình trạng</div></>}
              {columnGroupVisibility.estimate && <><div>Đơn vị</div><div>Khối lượng</div><div>Sản lượng/ngày</div></>}
              {columnGroupVisibility.resource && <><div>HSM</div><div>SLM</div><div>NCLM</div><div>NCCH</div></>}
            </div>
          </div>
        </div>
        <div className="gantt-header-pane">
          <div ref={ganttHeaderScrollRef} className="gantt-header-scroll">
            {timeline ? <div className="gantt-calendar" style={{ width: timeline.width }}>
              <div className="calendar-month">{timeline.monthGroups.map((group) => <span key={group.key} style={{ width: group.count * ganttColumnWidth }}>{group.label}</span>)}</div>
              <div className="calendar-week">{timeline.weekGroups.map((group) => <span key={group.key} style={{ width: group.count * ganttColumnWidth }}>{group.label}</span>)}</div>
              <div className="calendar-days">{timeline.columns.map((date, index) => <span key={date.toISOString()} className={index === timeline.todayColumnIndex ? "today" : ""} style={{ width: ganttColumnWidth }} title={`${formatDisplayDate(date)} · ${ganttDayStep} ngày`}>{String(date.getDate()).padStart(2, "0")}</span>)}</div>
            </div> : <div className="gantt-calendar gantt-calendar-empty">Chọn dự án để tạo lịch Gantt.</div>}
          </div>
        </div>
      </div>

      <div className="schedule-board-body">
      <div className="schedule-board-scroll" onScroll={() => setTaskContextMenu(null)}>
      <div ref={taskGridBodyScrollRef} className="schedule-table-pane" onScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "body")}>
        <div ref={wbsInsertionLineRef} className="wbs-insertion-line" aria-hidden="true" />
        <div className="schedule-rows">
          {visibleItems.map((item) => {
            const isSelected = item.id === selectedItem?.id;
            const expandable = hasChildren(item.id);
            const derivedDates = item.type === "task" ? null : summaryDates.get(item.id);
            const displayStatus = item.type === "project" ? getProjectScheduleStatus(projectStatusById.get(item.projectId)) : "NOT_STARTED";
            const itemDependencies = incomingDependencies.get(item.id) ?? [];
            const predecessorText = itemDependencies.length ? itemDependencies.map((dependency) => formatDependencyLabel(dependency, scheduleOrder)).join(";") : "—";
            const predecessorTooltip = itemDependencies.map((dependency) => {
              const predecessor = itemById.get(dependency.predecessorTaskId);
              const lagText = dependency.lag ? ` ${dependency.lag > 0 ? "+" : ""}${dependency.lag} ngày` : "";
              return `${scheduleOrder.get(dependency.predecessorTaskId) ?? "?"} — ${predecessor?.name ?? "Không tìm thấy công tác"} — ${dependency.dependencyType}${lagText}`;
            }).join("\n");
            return <div key={item.id} data-wbs-row-id={item.id} className={`schedule-table-grid schedule-row row-${item.type} ${isSelected ? "selected" : ""} ${wbsDrag?.sourceId === item.id && wbsDrag.isActive ? "wbs-drag-source" : ""}`} role="button" tabIndex={0} onClick={() => { if (suppressWbsClickRef.current) { suppressWbsClickRef.current = false; return; } setSelectedItemId(item.id); }} onContextMenu={(event) => openTaskContextMenu(event, item)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) setSelectedItemId(item.id); }}>
              <div className={`wbs-cell ${item.type === "project" ? "" : "wbs-drag-cell"}`} aria-label={item.type === "project" ? undefined : "Kéo để sắp xếp"} title={item.type === "project" ? `WBS: ${item.wbs}` : `STT ${scheduleOrder.get(item.id)} · Kéo để sắp xếp`} onPointerDown={(event) => startWbsDrag(event, item)}>{scheduleOrder.get(item.id)}</div>
              <div className="row-actions">
                {item.type === "project"
                  ? <button className="action-slot-add" aria-label="Thêm hạng mục" title="Thêm hạng mục" onClick={() => addChildItem(item)}>+</button>
                  : <>{(item.type === "workItem" || item.type === "group") && <button className="action-slot-add" aria-label="Thêm công tác" title="Thêm công tác" onClick={() => addChildItem(item)}>+</button>}<button className="action-slot-insert-above" aria-label="Chèn lên trên" title="Chèn lên trên" onClick={() => insertScheduleItem(item, "before")}><span className="action-triangle">▲</span></button><button className="action-slot-insert-below" aria-label="Chèn xuống dưới" title="Chèn xuống dưới" onClick={() => insertScheduleItem(item, "after")}><span className="action-triangle">▼</span></button><button className="action-slot-delete" aria-label="Xóa" title="Xóa" onClick={() => deleteItem(item)}><svg className="action-trash-icon" aria-hidden="true" viewBox="0 0 16 16"><path d="M5 5v7m3-7v7m3-7v7M3.5 3.5h9l-.6 10h-7.8l-.6-10ZM6 3.5V2h4v1.5M2.5 3.5h11" /></svg></button></>}
              </div>
              <div className={`task-name ${autoEditItemId === item.id ? "is-editing" : ""}`} style={{ paddingLeft: `${10 + getScheduleTreeDepth(item, itemById) * 18}px` }} onDoubleClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button, input")) return;
                event.stopPropagation();
                setSelectedItemId(item.id);
                setAutoEditItemId(item.id);
              }}>
                {expandable ? <button className="tree-toggle" onClick={(event) => { event.stopPropagation(); toggleCollapse(item.id); }}>{collapsedIds.has(item.id) ? "›" : "⌄"}</button> : <span className="tree-spacer" />}
                <InlineNameEditor key={`${item.id}-${autoEditItemId === item.id ? "editing" : "display"}`} value={item.name} autoEdit={autoEditItemId === item.id} onFinishEditing={() => setAutoEditItemId((currentId) => currentId === item.id ? null : currentId)} onCommit={(name) => { setSelectedItemId(item.id); commitItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, name } : currentItem), { description: `Đổi tên ${item.wbs} thành “${name}”` }); onNotice(`Đã đổi tên ${item.wbs}`); }} />{item.nature && autoEditItemId !== item.id && <small>{item.nature}</small>}
              </div>
              {columnGroupVisibility.progress && <>{item.type === "task" ? <><div className="duration-cell"><input aria-label={`Thời lượng ${item.name}`} type="number" min="1" value={item.duration} onFocus={(event) => { setSelectedItemId(item.id); event.currentTarget.select(); }} onChange={(event) => updateDuration(item, Number(event.target.value))} onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Enter") event.currentTarget.blur(); }} /><span>n</span></div>
              <div className="date-cell"><InlineDateEditor key={`${item.id}-start-${item.startDate}`} label={`Ngày bắt đầu ${item.name}`} value={item.startDate} onCommit={(value) => { setSelectedItemId(item.id); return updateScheduleDate(item, "startDate", value); }} onInvalid={() => onNotice("Ngày bắt đầu phải đúng định dạng dd/MM/yy")} /></div>
              <div className="date-cell"><InlineDateEditor key={`${item.id}-finish-${item.finishDate}`} label={`Ngày kết thúc ${item.name}`} value={item.finishDate} onCommit={(value) => { setSelectedItemId(item.id); return updateScheduleDate(item, "finishDate", value); }} onInvalid={() => onNotice("Ngày kết thúc phải đúng định dạng dd/MM/yy")} /></div></> : <><div className="duration-cell summary-value"><span>{derivedDates?.duration ?? "—"} {derivedDates ? "ngày" : ""}</span></div><div className="date-cell summary-value"><span>{derivedDates?.startDate ?? "—"}</span></div><div className="date-cell summary-value"><span>{derivedDates?.finishDate ?? "—"}</span></div></>}
              <div className={`predecessor-cell ${item.type === "task" ? "editable" : ""}`} title={predecessorTooltip || "Không có công tác trước"} onDoubleClick={() => openDependencyEditor(item)}><span>{item.type === "task" ? predecessorText : "—"}</span></div>
              <div className="schedule-status-cell"><ScheduleStatusChip status={displayStatus} /></div></>}
              {columnGroupVisibility.estimate && <><div className="plain-data-cell">{item.type === "task" ? item.unit ?? "—" : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.quantity) : "—"}</div><div className="numeric-data-cell">{item.type === "task" && item.quantity != null && item.duration > 0 ? formatOptionalNumber(item.quantity / item.duration) : "—"}</div></>}
              {columnGroupVisibility.resource && <><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.machineShiftCoefficient) : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.machineCount) : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.managedLabor) : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.permanentLabor) : "—"}</div></>}
            </div>;
          })}
          {!visibleItems.length && <div className="schedule-empty">Chưa chọn dự án nào trong “Danh sách dự án”.</div>}
        </div>
      </div>

      <div className="gantt-pane">
        <div ref={ganttScrollRef} className="gantt-horizontal-scroll" onScroll={(event) => {
          const dock = ganttBottomScrollRef.current;
          if (dock && Math.abs(dock.scrollLeft - event.currentTarget.scrollLeft) > 1) dock.scrollLeft = event.currentTarget.scrollLeft;
          const header = ganttHeaderScrollRef.current;
          if (header && Math.abs(header.scrollLeft - event.currentTarget.scrollLeft) > 1) header.scrollLeft = event.currentTarget.scrollLeft;
        }}>
          {timeline ? <div ref={ganttContentRef} className="gantt-content" style={{ width: timeline.width }}>
            <svg className="gantt-dependency-layer" width={timeline.width} height={visibleItems.length * scheduleRowHeight} aria-label="Quan hệ công việc trên Gantt">
              <defs><marker id="dependency-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker></defs>
              {dependencies.map((dependency) => {
                const source = getTaskBarGeometry(dependency.predecessorTaskId);
                const target = getTaskBarGeometry(dependency.successorTaskId);
                if (!source || !target) return null;
                const sourceX = dependency.dependencyType === "SS" || dependency.dependencyType === "SF" ? source.left : source.left + source.width;
                const targetX = dependency.dependencyType === "FF" || dependency.dependencyType === "SF" ? target.left + target.width : target.left;
                const elbowX = sourceX <= targetX ? sourceX + 12 : Math.max(sourceX, targetX) + 12;
                const path = `M ${sourceX} ${source.y} H ${elbowX} V ${target.y} H ${targetX}`;
                const isSelected = dependency.id === selectedDependencyId;
                return <g key={dependency.id} className={`dependency-connector ${isSelected ? "selected" : ""}`} onClick={(event) => { event.stopPropagation(); setSelectedDependencyId(dependency.id); if (event.detail === 2) { const successor = itemById.get(dependency.successorTaskId); if (successor) openDependencyEditor(successor, dependency.id); } }} onDoubleClick={(event) => event.stopPropagation()}>
                  <path className="dependency-hit-path" d={path} />
                  <path className="dependency-visible-path" d={path} markerEnd="url(#dependency-arrow)" />
                </g>;
              })}
              {dependencyDrag?.hasExceededThreshold && <path className="dependency-draft-path" d={`M ${dependencyDrag.sourcePoint.x} ${dependencyDrag.sourcePoint.y} H ${dependencyDrag.sourcePoint.x + 12} V ${dependencyDrag.pointerPosition.y} H ${dependencyDrag.pointerPosition.x}`} />}
            </svg>
            <div className="gantt-rows">
              {visibleItems.map((item, rowIndex) => {
                const derivedDates = item.type === "task" ? null : summaryDates.get(item.id);
                const itemStartDate = parseDisplayDate(derivedDates?.startDate ?? item.startDate);
                const itemFinishDate = parseDisplayDate(derivedDates?.finishDate ?? item.finishDate);
                const hasValidBar = Boolean(itemStartDate && itemFinishDate && (item.type === "task" || derivedDates));
                const safeStartDate = itemStartDate ?? timeline.startDate;
                const safeFinishDate = itemFinishDate ?? safeStartDate;
                const barLeft = Math.max(0, differenceInCalendarDays(safeStartDate, timeline.startDate) / ganttDayStep * ganttColumnWidth);
                const durationDays = Math.max(1, differenceInCalendarDays(safeFinishDate, safeStartDate) + 1);
                const barWidth = Math.max(4, durationDays / ganttDayStep * ganttColumnWidth);
                return <div key={item.id} className={`gantt-row row-${item.type} ${item.id === selectedItem?.id ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSelectedItemId(item.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedItemId(item.id); }}>
                  {timeline.todayColumnIndex >= 0 && <span className="today-column" style={{ left: timeline.todayColumnIndex * ganttColumnWidth, width: ganttColumnWidth }} />}
                  {hasValidBar && (item.type === "task" ? <span className={`gantt-bar task-bar ${dependencyDrag?.sourceTaskId === item.id && dependencyDrag.hasExceededThreshold ? "dependency-source-active" : ""} ${dependencyDrag?.hasExceededThreshold && isValidDependencyTarget(item) ? "dependency-target-valid" : ""}`} data-dependency-task data-task-id={item.id} style={{ left: barLeft, width: barWidth }} title={`${item.name}: ${item.startDate}–${item.finishDate} · ${item.progress}%`} onPointerDown={(event) => startDependencyDrag(event, item, barLeft, barWidth, rowIndex)}><i style={{ width: `${Math.max(0, Math.min(100, item.progress || 0))}%` }} /><b>{item.progress}%</b></span> : <span className={`summary-bar summary-${item.type}`} style={{ left: barLeft, width: barWidth }} title={`${item.name}: ${derivedDates?.startDate}–${derivedDates?.finishDate} · ${item.progress || 0}%`}><span className="summary-start-label">{derivedDates?.startDate.slice(0, 5)}</span><span className="summary-finish-label">{derivedDates?.finishDate.slice(0, 5)}</span><i className="summary-progress-line" style={{ width: `${Math.max(0, Math.min(100, item.progress || 0))}%` }} /></span>)}
                </div>;
              })}
            </div>
          </div> : <div className="gantt-empty">Chọn dự án để tạo lịch Gantt.</div>}
        </div>
      </div>
      </div>
    <div className="gantt-scrollbar-row" aria-hidden="true">
      <div ref={taskGridBottomScrollRef} className="task-grid-scrollbar-dock" onScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "dock")}><div className="task-grid-scrollbar-content" style={{ width: scheduleTableWidth }} /></div>
      <div ref={ganttBottomScrollRef} className="gantt-scrollbar-dock" onScroll={(event) => {
        const timelineScroll = ganttScrollRef.current;
        if (timelineScroll && Math.abs(timelineScroll.scrollLeft - event.currentTarget.scrollLeft) > 1) timelineScroll.scrollLeft = event.currentTarget.scrollLeft;
        const header = ganttHeaderScrollRef.current;
        if (header && Math.abs(header.scrollLeft - event.currentTarget.scrollLeft) > 1) header.scrollLeft = event.currentTarget.scrollLeft;
      }}><div className="gantt-scrollbar-content" style={{ width: timeline?.width ?? 0 }} /></div>
    </div>
    </div>
    </div>

    <div className="schedule-legend"><span><i className="legend-current" />Kế hoạch hiện tại</span><span><i className="legend-baseline" />Baseline</span><span><i className="legend-delayed" />Chậm tiến độ</span><span><i className="legend-critical" />Đường găng</span><strong>Đang chọn: {selectedItem?.name ?? "Chưa có"}</strong><div className="task-detail-controls" aria-label="Chế độ vùng chi tiết"><button type="button" className={taskDetailMode === "docked" ? "active" : ""} aria-pressed={taskDetailMode === "docked"} title="Ghim vùng chi tiết ở đáy" onClick={() => setTaskDetailMode("docked")}>Ghim dưới</button><button type="button" className={taskDetailMode === "collapsed" ? "active" : ""} aria-pressed={taskDetailMode === "collapsed"} title="Thu nhỏ vùng chi tiết" onClick={() => setTaskDetailMode("collapsed")}>Thu nhỏ</button><button type="button" className={taskDetailMode === "hidden" ? "active" : ""} aria-pressed={taskDetailMode === "hidden"} title="Ẩn vùng chi tiết" onClick={() => setTaskDetailMode("hidden")}>Ẩn</button></div></div>

    {selectedItem && taskDetailMode === "collapsed" && <div className="schedule-detail-collapsed"><strong>Chi tiết công việc</strong><span>{selectedItem.name}</span><button type="button" onClick={() => setTaskDetailMode("docked")}>Mở rộng</button></div>}

    {selectedItem && taskDetailMode === "docked" && <div className="schedule-detail">
      <div className="task-detail-form">
        <h3>Chi tiết công việc</h3>
        <div className="task-detail-grid">
          <label><span>Tên công việc</span><input ref={taskDetailNameInputRef} value={selectedItem.name} onChange={(event) => updateSelected({ name: event.target.value })} /></label>
          <label><span>Thời lượng</span><input type="number" min="1" disabled={selectedItem.type !== "task"} value={selectedSummaryDates?.duration ?? selectedItem.duration} onChange={(event) => updateDuration(selectedItem, Number(event.target.value))} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
          <label><span>Bắt đầu</span><input disabled={selectedItem.type !== "task"} value={selectedSummaryDates?.startDate ?? selectedItem.startDate} onChange={(event) => updateSelected({ startDate: event.target.value })} /></label>
          <label><span>Kết thúc</span><input disabled={selectedItem.type !== "task"} value={selectedSummaryDates?.finishDate ?? selectedItem.finishDate} onChange={(event) => updateSelected({ finishDate: event.target.value })} /></label>
        </div>
      </div>
      <div className="boq-allocation">
        <div><h3>Khối lượng dự toán đã phân bổ</h3>{selectedItem.allocation ? <><strong>{selectedItem.allocation.code} · {selectedItem.allocation.name}</strong><small>{formatCurrency(selectedItem.allocation.allocated)} / {formatCurrency(selectedItem.allocation.total)} {selectedItem.allocation.unit} · DT-03</small></> : <small>Chưa phân bổ BOQ cho dòng đang chọn.</small>}</div>
        {selectedItem.allocation && <div className="allocation-progress"><span><i style={{ width: `${Math.min(100, selectedItem.allocation.allocated / selectedItem.allocation.total * 100)}%` }} /></span><b>{Math.round(selectedItem.allocation.allocated / selectedItem.allocation.total * 100)}%</b></div>}
      </div>
    </div>}

    {taskContextMenu && contextTask && <div className="task-context-menu" role="menu" aria-label={`Tác vụ cho ${contextTask.name}`} style={{ left: taskContextMenu.x, top: taskContextMenu.y }}>
      <button type="button" role="menuitem" onClick={() => openTaskDetails(contextTask)}>Xem / sửa thông tin công tác</button>
      <button type="button" role="menuitem" onClick={() => convertTaskToGroup(contextTask)}>Chuyển công tác thành Nhóm</button>
      <div className="task-context-separator" role="separator" />
      <button type="button" role="menuitem" onClick={() => { setTaskContextMenu(null); deleteItem(contextTask); }}>Xóa công tác</button>
    </div>}

    {dependencyEditorTask && <div className="dependency-editor-backdrop">
      <section className="dependency-editor" role="dialog" aria-modal="true" aria-labelledby="dependency-editor-title">
        <header><div><span>⌘</span><strong id="dependency-editor-title">Quan hệ công việc</strong></div><button type="button" aria-label="Đóng cửa sổ quan hệ" onClick={() => setDependencyEditorTaskId(null)}>×</button></header>
        <div className="dependency-editor-target"><span>Công tác sau</span><strong>{scheduleOrder.get(dependencyEditorTask.id)} · {dependencyEditorTask.name}</strong></div>
        <label className="dependency-search"><span>Tìm công tác trước</span><input value={dependencySearch} onChange={(event) => setDependencySearch(event.target.value)} placeholder="Nhập STT hoặc tên công tác..." /></label>
        <div className="dependency-editor-grid dependency-editor-grid-header"><span>Công tác trước</span><span>Kiểu liên kết</span><span>Trễ / Sớm</span><span /></div>
        <div className="dependency-editor-rows">
          {dependencyDrafts.map((draft) => <div className="dependency-editor-grid" key={draft.id}>
            <select aria-label="Công tác trước" value={draft.predecessorTaskId} onChange={(event) => setDependencyDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, predecessorTaskId: event.target.value } : item))}>
              {dependencyCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{scheduleOrder.get(candidate.id)} · {candidate.name}</option>)}
              {!dependencyCandidates.some((candidate) => candidate.id === draft.predecessorTaskId) && <option value={draft.predecessorTaskId}>{scheduleOrder.get(draft.predecessorTaskId)} · {itemById.get(draft.predecessorTaskId)?.name}</option>}
            </select>
            <select aria-label="Loại quan hệ" value={draft.dependencyType} onChange={(event) => setDependencyDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, dependencyType: event.target.value as DependencyType } : item))}><option value="FS">FS — Finish to Start</option><option value="SS">SS — Start to Start</option><option value="FF">FF — Finish to Finish</option><option value="SF">SF — Start to Finish</option></select>
            <input aria-label="Trễ hoặc sớm" type="number" value={draft.lag} onChange={(event) => setDependencyDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, lag: Math.trunc(Number(event.target.value) || 0) } : item))} />
            <button type="button" aria-label="Xóa liên kết" title="Xóa liên kết" onClick={() => setDependencyDrafts((current) => current.filter((item) => item.id !== draft.id))}>⌫</button>
          </div>)}
          {!dependencyDrafts.length && <p className="dependency-editor-empty">Công tác chưa có quan hệ trước.</p>}
        </div>
        <div className="dependency-editor-helper"><button type="button" className="dependency-add-button" onClick={addDependencyDraft}>＋ Thêm quan hệ</button><small>Số dương = trễ · Số âm = sớm</small></div>
        {dependencyEditorError && <p className="dependency-editor-error" role="alert">{dependencyEditorError}</p>}
        <footer><button type="button" className="button secondary" onClick={() => setDependencyEditorTaskId(null)}>Hủy</button><button type="button" className="button primary" onClick={saveDependencyEditor}>OK</button></footer>
      </section>
    </div>}

    {commonDialog.dialog}

  </section>;
}

export default function Home() {
  const commonDialog = useCommonDialog();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("projects");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Tất cả" | ProjectStatus>("Tất cả");
  const [selectedId, setSelectedId] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(blankProject);
  const [notice, setNotice] = useState("Đang kết nối cơ sở dữ liệu...");

  async function loadProjects() {
    setProjectsLoading(true);
    try {
      const loaded = await requestApi<Project[]>("/api/projects");
      setProjects(loaded);
      setSelectedId((current) => loaded.some((project) => project.id === current) ? current : loaded[0]?.id ?? "");
      setNotice("Đã tải dữ liệu dự án từ cơ sở dữ liệu");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể tải danh sách dự án");
    } finally { setProjectsLoading(false); }
  }

  useEffect(() => { globalThis.queueMicrotask(() => void loadProjects()); }, []);

  const selectedProject = projects.find((project) => project.id === selectedId) ?? projects[0];
  const visibleCount = projects.filter((project) => project.visible).length;
  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi");
    return projects.filter((project) => {
      const matchesStatus = statusFilter === "Tất cả" || project.status === statusFilter;
      const matchesQuery = !keyword || [project.code, project.name, project.investor, project.location, project.manager]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(keyword);
      return matchesStatus && matchesQuery;
    });
  }, [projects, query, statusFilter]);

  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
  const activeCount = projects.filter((project) => project.status === "Đang thực hiện").length;

  async function toggleVisibility(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    try {
      const saved = await requestApi<Project>(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ ...project, visible: !project.visible }) });
      setProjects((current) => current.map((item) => item.id === projectId ? saved : item));
      setNotice("Đã cập nhật phạm vi dự án trong cơ sở dữ liệu");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật dự án"); }
  }

  function openCreate() {
    setDraft({ ...blankProject });
    setModalMode("create");
  }

  function openEdit(project: Project) {
    setDraft({
      code: project.code,
      name: project.name,
      investor: project.investor,
      location: project.location,
      manager: project.manager,
      startDate: project.startDate,
      finishDate: project.finishDate,
      budget: project.budget,
      progress: project.progress,
      status: project.status,
      description: project.description,
      visible: project.visible,
    });
    setModalMode("edit");
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.code.trim() || !draft.name.trim()) return;
    try {
      if (modalMode === "create") {
        const project = await requestApi<Project>("/api/projects", { method: "POST", body: JSON.stringify(draft) });
        setProjects((current) => [project, ...current]);
        setSelectedId(project.id);
        setNotice(`Đã tạo và lưu ${project.name}`);
      } else if (selectedProject) {
        const project = await requestApi<Project>(`/api/projects/${selectedProject.id}`, { method: "PATCH", body: JSON.stringify(draft) });
        setProjects((current) => current.map((item) => item.id === project.id ? project : item));
        setNotice(`Đã cập nhật ${project.name}`);
      }
      setModalMode(null);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể lưu dự án"); }
  }

  async function duplicateProject(project: Project) {
    const copy: ProjectInput = {
      ...project,
      code: `${project.code}-CP`,
      name: `${project.name} — Bản sao`,
      status: "Chuẩn bị",
      progress: 0,
      visible: false,
    };
    try {
      const saved = await requestApi<Project>("/api/projects", { method: "POST", body: JSON.stringify(copy) });
      setProjects((current) => [saved, ...current]); setSelectedId(saved.id);
      setNotice("Đã nhân bản dự án vào cơ sở dữ liệu");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể nhân bản dự án"); }
  }

  async function archiveProject(project: Project) {
    if (!await commonDialog.confirm({
      title: "Hoàn thành dự án",
      message: `Chuyển “${project.name}” sang trạng thái Hoàn thành?`,
      detail: "Dự án sẽ được bỏ khỏi phạm vi hiển thị hiện tại.",
      confirmText: "Hoàn thành",
      tone: "warning",
    })) return;
    try {
      const saved = await requestApi<Project>(`/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ ...project, status: "Hoàn thành", visible: false }) });
      setProjects((current) => current.map((item) => item.id === project.id ? saved : item));
      setNotice("Đã hoàn thành và lưu trạng thái dự án");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật dự án"); }
  }

  async function removeProject(project: Project) {
    if (!await commonDialog.confirm({
      title: "Xóa dự án",
      message: `Xóa dự án “${project.name}”?`,
      detail: "Toàn bộ cây WBS và các quan hệ công việc của dự án cũng sẽ bị xóa. Thao tác này không thể hoàn tác sau khi lưu.",
      confirmText: "Xóa dự án",
      tone: "danger",
    })) return;
    try {
      await requestApi<void>(`/api/projects/${project.id}`, { method: "DELETE" });
      const remaining = projects.filter((item) => item.id !== project.id);
      setProjects(remaining); setSelectedId(remaining[0]?.id ?? "");
      setNotice("Đã xóa dự án và toàn bộ cây WBS");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể xóa dự án"); }
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <aside className="app-sidebar">
        <div className="brand-row">
          <div className="brand-mark">A</div>
          {sidebarOpen && <div><strong>AlphaPMS</strong><span>Project Control</span></div>}
          <button className="icon-button collapse-button" onClick={() => setSidebarOpen((value) => !value)} aria-label={sidebarOpen ? "Thu gọn thanh bên" : "Mở rộng thanh bên"}>{sidebarOpen ? "‹" : "›"}</button>
        </div>

        <nav className="main-nav" aria-label="Phân hệ">
          {menuItems.map(([id, icon, label]) => <button key={id} className={activeMenu === id ? "active" : ""} onClick={() => { setActiveMenu(id); setNotice(id === "projects" ? "Đang ở Quản lý dự án" : id === "schedule" ? "Đang ở Quản lý tiến độ nhiều dự án" : `${label} sẽ được hoàn thiện ở bước tiếp theo`); }} title={!sidebarOpen ? label : undefined}>
            <span className="menu-symbol">{icon}</span>{sidebarOpen && <span>{label}</span>}
          </button>)}
        </nav>

        <div className="sidebar-footer">
          <button title={!sidebarOpen ? "Cấu hình" : undefined}><span className="menu-symbol">⚙</span>{sidebarOpen && <span>Cấu hình</span>}</button>
          <div className="user-row"><div className="avatar">TP</div>{sidebarOpen && <div><strong>Tuấn Phạm</strong><span>Quản trị dự án</span></div>}</div>
        </div>
      </aside>

      <main className="app-main">
        {activeMenu !== "schedule" && <header className="topbar">
          {activeMenu === "projects" ? <>
            <div><p>Danh mục dự án</p><h1>Quản lý dự án</h1></div>
            <div className="topbar-actions"><button className="button secondary" disabled={projectsLoading} onClick={loadProjects}>Làm mới</button><button className="button primary" onClick={openCreate}><span>＋</span> Tạo dự án</button></div>
          </> : <>
            <div><p>Phân hệ AlphaPMS</p><h1>{menuItems.find(([id]) => id === activeMenu)?.[2]}</h1></div>
          </>}
        </header>}

        {activeMenu === "schedule" ? <ScheduleView projects={projects} onNotice={setNotice} /> : activeMenu !== "projects" ? (
          <section className="placeholder-panel"><span className="placeholder-icon">◇</span><h2>{menuItems.find(([id]) => id === activeMenu)?.[2]}</h2><p>Phân hệ này sẽ được hoàn thiện ở bước tiếp theo. Chọn “Danh sách dự án” để tiếp tục quản lý phạm vi dự án.</p><button className="button primary" onClick={() => setActiveMenu("projects")}>Mở Danh sách dự án</button></section>
        ) : <>
          <section className="summary-grid" aria-label="Tổng quan dự án">
            <article><span>Tổng dự án</span><strong>{projects.length}</strong><small>{activeCount} đang thực hiện</small></article>
            <article><span>Đang hiển thị</span><strong>{visibleCount}</strong><small>Dùng chung cho tiến độ, dự toán</small></article>
            <article><span>Tổng giá trị</span><strong>{(totalBudget / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ</strong><small>Giá trị dữ liệu mẫu</small></article>
            <article><span>Cập nhật gần nhất</span><strong>Hôm nay</strong><small>{selectedProject?.updatedAt}</small></article>
          </section>

          <section className="project-workspace">
            <div className="list-pane">
              <div className="list-tools">
                <label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên, chủ đầu tư, địa điểm..." /></label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "Tất cả" | ProjectStatus)} aria-label="Lọc trạng thái">
                  <option>Tất cả</option><option>Đang thực hiện</option><option>Chuẩn bị</option><option>Tạm dừng</option><option>Hoàn thành</option>
                </select>
              </div>
              <div className="project-count">{filteredProjects.length} dự án <span>· Chọn một dòng để xem và chỉnh sửa</span></div>
              <div className="table-wrap"><table className="project-table"><thead><tr><th>Hiển thị</th><th>Mã</th><th>Tên dự án</th><th>Trạng thái</th><th>Tiến độ</th><th>Giá trị</th></tr></thead><tbody>
                {filteredProjects.map((project) => <tr key={project.id} className={project.id === selectedId ? "selected" : ""} onClick={() => setSelectedId(project.id)}>
                  <td onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={project.visible} onChange={() => toggleVisibility(project.id)} aria-label={`Hiển thị ${project.name}`} /></td>
                  <td><strong>{project.code}</strong></td><td><strong>{project.name}</strong><small>{project.investor}</small></td><td><span className={`status status-${project.status.replaceAll(" ", "-").toLowerCase()}`}>{project.status}</span></td>
                  <td><div className="progress-cell"><div><i style={{ width: `${project.progress}%` }} /></div><span>{project.progress}%</span></div></td><td className="number">{formatCurrency(project.budget)}</td>
                </tr>)}
                {!filteredProjects.length && <tr><td colSpan={6} className="empty-row">Không tìm thấy dự án phù hợp.</td></tr>}
              </tbody></table></div>
            </div>

            {selectedProject && <aside className="detail-pane">
              <div className="detail-head"><div className="project-avatar">{selectedProject.code.slice(0, 2)}</div><div><span>{selectedProject.code}</span><h2>{selectedProject.name}</h2></div><span className="grow" /><button className="icon-button" onClick={() => openEdit(selectedProject)} aria-label="Sửa dự án">✎</button></div>
              <div className="detail-actions"><button className="button primary" onClick={() => openEdit(selectedProject)}>Chỉnh sửa</button><button className="button secondary" onClick={() => duplicateProject(selectedProject)}>Nhân bản</button><button className="button secondary" onClick={() => archiveProject(selectedProject)}>Hoàn thành</button><button className="button secondary" onClick={() => removeProject(selectedProject)}>Xóa</button></div>
              <dl className="detail-grid"><div><dt>Chủ đầu tư</dt><dd>{selectedProject.investor}</dd></div><div><dt>Chủ nhiệm dự án</dt><dd>{selectedProject.manager}</dd></div><div><dt>Địa điểm</dt><dd>{selectedProject.location}</dd></div><div><dt>Trạng thái</dt><dd>{selectedProject.status}</dd></div><div><dt>Ngày bắt đầu</dt><dd>{selectedProject.startDate || "Chưa xác định"}</dd></div><div><dt>Ngày kết thúc</dt><dd>{selectedProject.finishDate || "Chưa xác định"}</dd></div><div><dt>Tổng giá trị</dt><dd>{formatCurrency(selectedProject.budget)} đ</dd></div><div><dt>Tiến độ tổng hợp</dt><dd>{selectedProject.progress}%</dd></div></dl>
              <div className="description-box"><span>Mô tả</span><p>{selectedProject.description || "Chưa có mô tả."}</p></div>
              <div className="scope-box"><div><span>Phạm vi hiển thị</span><strong>{selectedProject.visible ? "Đang bật" : "Đang tắt"}</strong></div><button className="switch" role="switch" aria-checked={selectedProject.visible} onClick={() => toggleVisibility(selectedProject.id)}><i /></button></div>
              <div className="activity-note"><span>◷</span><div><strong>Cập nhật gần nhất</strong><p>{new Date(selectedProject.updatedAt).toLocaleString("vi-VN")} · Đã lưu trong cơ sở dữ liệu</p></div></div>
            </aside>}
          </section>
        </>}

        <footer className="statusbar"><span className="online-dot" /> Localhost đang hoạt động <span>·</span><span>{notice}</span><span className="grow" /><span>ASP.NET Core · SQLite</span></footer>
      </main>

      {commonDialog.dialog}

      {modalMode && <div className="modal-backdrop">
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
          <header><div><span>{modalMode === "create" ? "Dự án mới" : selectedProject?.code}</span><h2 id="project-modal-title">{modalMode === "create" ? "Tạo dự án" : "Chỉnh sửa dự án"}</h2></div><button className="icon-button" onClick={() => setModalMode(null)} aria-label="Đóng">×</button></header>
          <form onSubmit={saveProject}>
            <div className="form-grid">
              <label><span>Mã dự án *</span><input required value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="VD: BA-2026" /></label>
              <label className="wide"><span>Tên dự án *</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Tên đầy đủ của dự án" /></label>
              <label className="wide"><span>Chủ đầu tư</span><input value={draft.investor} onChange={(event) => setDraft({ ...draft, investor: event.target.value })} /></label>
              <label><span>Chủ nhiệm dự án</span><input value={draft.manager} onChange={(event) => setDraft({ ...draft, manager: event.target.value })} /></label>
              <label><span>Địa điểm</span><input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
              <label><span>Ngày bắt đầu</span><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
              <label><span>Ngày kết thúc</span><input type="date" value={draft.finishDate} onChange={(event) => setDraft({ ...draft, finishDate: event.target.value })} /></label>
              <label><span>Tổng giá trị (đồng)</span><input type="number" min="0" value={draft.budget} onChange={(event) => setDraft({ ...draft, budget: Number(event.target.value) })} /></label>
              <label><span>Tiến độ (%)</span><input type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Math.min(100, Math.max(0, Number(event.target.value))) })} /></label>
              <label><span>Trạng thái</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ProjectStatus })}><option>Chuẩn bị</option><option>Đang thực hiện</option><option>Tạm dừng</option><option>Hoàn thành</option></select></label>
              <label className="wide"><span>Mô tả</span><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label className="checkbox-field wide"><input type="checkbox" checked={draft.visible} onChange={(event) => setDraft({ ...draft, visible: event.target.checked })} /><span>Hiển thị dự án trong các phân hệ tiến độ, dự toán và biểu đồ</span></label>
            </div>
            <footer><button type="button" className="button secondary" onClick={() => setModalMode(null)}>Hủy</button><button type="submit" className="button primary">{modalMode === "create" ? "Tạo dự án" : "Lưu thay đổi"}</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
