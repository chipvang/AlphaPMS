"use client";

import { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { requestApi } from "../../lib/api/requestApi";
import type { ProjectDto, ProjectScheduleDto } from "../../lib/projects/types";
import type { SharedTaskState } from "../../lib/task-workspace/useSharedTaskState";
import type { TaskItem, TaskItemType } from "../../lib/task-workspace/taskTypes";
import { buildProjectSchedulePayload } from "../../lib/task-workspace/taskScheduleAdapter";
import type { ScheduleDisplayStatus } from "../../lib/schedule/scheduleTypes";
import { DependencyType, formatDependencyLabel, propagateDependencySchedule, recalibrateIncomingDependencyLags, TaskDependency, validateTaskDependency } from "../../lib/schedule/dependencies";
import { convertTaskToGroupWithFollowingTasks } from "../../lib/schedule/taskConversion";
import { useCommonDialog } from "../../lib/ui/useCommonDialog";
import {
  createBasicColumns,
  createScheduleColumns,
  createTaskGridColumns,
  estimateColumns,
  getTaskGridColumnWidth,
  getVisibleTaskGridColumns,
  resourceColumns,
  taskGridColumnGroups,
} from "../task-grid/taskGridColumns";
import type { TaskGridColumn, TaskGridColumnGroup } from "../task-grid/taskGridTypes";
import { TaskGrid } from "../task-grid/TaskGrid";
import { useTaskGridController } from "../task-grid/useTaskGridController";
import { useTaskGridInteractions } from "../task-grid/useTaskGridInteractions";
import { useTaskGridWbsReorder } from "../task-grid/useTaskGridWbsReorder";
import { calculateTaskOrder, getTaskTreeDepth } from "../task-grid/taskTree";
import { insertTaskChild, insertTaskSibling, recalculateTaskWbs, removeTaskSubtree } from "../task-grid/taskTree";
import { GanttTimeline } from "./GanttTimeline";
import { ScheduleBoard } from "./ScheduleBoard";

type Project = ProjectDto;
type ProjectStatus = ProjectDto["status"];
type DependencyDraft = Pick<TaskDependency, "id" | "predecessorTaskId" | "dependencyType" | "lag">;
type DependencyDragState = {
  sourceTaskId: string;
  sourcePoint: { x: number; y: number };
  pointerPosition: { x: number; y: number };
  initialPointerPosition: { x: number; y: number };
  hasExceededThreshold: boolean;
};
type TaskContextMenuState = { taskId: string; x: number; y: number };

const scheduleStatusPresentation: Record<ScheduleDisplayStatus, { label: string; icon: "circle" | "play" | "check" | "pause" | "clock" | "cancel" }> = {
  NOT_STARTED: { label: "Chưa thi công", icon: "circle" },
  IN_PROGRESS: { label: "Đang thi công", icon: "play" },
  COMPLETED: { label: "Hoàn thành", icon: "check" },
  PAUSED: { label: "Tạm dừng", icon: "pause" },
  ON_HOLD: { label: "Chờ thực hiện", icon: "clock" },
  CANCELLED: { label: "Không thực hiện", icon: "cancel" },
};

const ganttColumnWidth = 20;
const scheduleRowHeight = 32;

function getProjectScheduleStatus(status: ProjectStatus | undefined): ScheduleDisplayStatus {
  if (status === "Đang thực hiện") return "IN_PROGRESS";
  if (status === "Hoàn thành") return "COMPLETED";
  if (status === "Tạm dừng") return "PAUSED";
  return "ON_HOLD";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

function formatOptionalNumber(value?: number) {
  return value == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function createEntityId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function isScheduleDescendant(item: TaskItem, ancestorId: string, itemMap: Map<string, TaskItem>) {
  let parentId = item.parentId;
  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = itemMap.get(parentId)?.parentId ?? null;
  }
  return false;
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

function normalizePastedDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(value.trim());
  if (!match) return null;
  const normalized = `${match[1]}/${match[2]}/${match[3].slice(-2)}`;
  return parseDisplayDate(normalized) ? normalized : null;
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
  const [isEditing, setIsEditing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ left: 0, top: 0 });
  const [viewMonth, setViewMonth] = useState(() => parseDisplayDate(value) ?? new Date());
  const dayInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isEditing) {
      dayInputRef.current?.focus();
      dayInputRef.current?.select();
    }
  }, [isEditing]);

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
    if (draftValue === value) {
      setIsEditing(false);
      return;
    }
    const date = parseDisplayDate(draftValue);
    if (!date) {
      setDateParts(getDateParts(value));
      onInvalid();
      setIsEditing(false);
      return;
    }
    const formattedValue = formatDisplayDate(date);
    setDateParts(getDateParts(formattedValue));
    if (onCommit(formattedValue) === false) setDateParts(getDateParts(value));
    setIsEditing(false);
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
      setIsEditing(false);
      setCalendarOpen(false);
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
    setIsEditing(false);
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

  if (!isEditing) {
    return <div className="inline-date-editor inline-date-display-mode" onDoubleClick={(event) => {
      event.stopPropagation();
      setDateParts(getDateParts(value));
      setIsEditing(true);
    }} title="Bấm kép để sửa ngày">
      <span className="inline-date-display" aria-label={label}>{value}</span>
    </div>;
  }

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

type ScheduleViewProps = {
  projects: Project[];
  onNotice: (message: string) => void;
  taskState: SharedTaskState;
  className?: string;
};

export function ScheduleWorkspace({ projects, onNotice, taskState, className }: ScheduleViewProps) {
  const scheduleHistory = taskState.history;
  const { persistedProjectFingerprintsRef } = taskState;
  const { items, dependencies } = scheduleHistory.value;
  const { selectedTaskItemId: selectedItemId, setSelectedTaskItemId: setSelectedItemId, loading: scheduleLoading } = taskState;
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | null>(null);
  const [dependencyEditorTaskId, setDependencyEditorTaskId] = useState<string | null>(null);
  const [dependencyDrafts, setDependencyDrafts] = useState<DependencyDraft[]>([]);
  const [dependencySearch, setDependencySearch] = useState("");
  const [dependencyEditorError, setDependencyEditorError] = useState("");
  const [dependencyDrag, setDependencyDrag] = useState<DependencyDragState | null>(null);
  const taskGridController = useTaskGridController();
  const { collapsedIds, setCollapsedIds, outlineLevel, setOutlineLevel, taskNameColumnWidth, columnGroupVisibility, setColumnGroupVisibility, taskGridSelection, setTaskGridSelection, setTaskGridCopyActive, taskGridSelectingRef, taskGridSelectionRef, taskGridFillSourceRef, taskGridFillModeRef, taskGridHandleDragRef, taskGridCtrlRef, taskGridHeaderScrollRef, taskGridBodyScrollRef, taskGridBottomScrollRef } = taskGridController;
  const commonDialog = useCommonDialog();
  const [autoEditItemId, setAutoEditItemId] = useState<string | null>(null);
  const [taskDetailMode, setTaskDetailMode] = useState<"docked" | "collapsed" | "hidden">("docked");
  const [ganttDayStep, setGanttDayStep] = useState(1);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [taskContextMenu, setTaskContextMenu] = useState<TaskContextMenuState | null>(null);
  const ganttHeaderScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const ganttBottomScrollRef = useRef<HTMLDivElement>(null);
  const ganttContentRef = useRef<HTMLDivElement>(null);
  const taskDetailNameInputRef = useRef<HTMLInputElement>(null);
  const visibleProjectIds = useMemo(() => new Set(projects.filter((project) => project.visible).map((project) => project.id)), [projects]);
  const projectStatusById = useMemo(() => new Map(projects.map((project) => [project.id, project.status])), [projects]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const scheduleOrder = useMemo(() => calculateTaskOrder(items), [items]);
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
    if (getTaskTreeDepth(item, itemById) + 1 > outlineLevel) return false;
    let parentId = item.parentId;
    while (parentId) {
      if (collapsedIds.has(parentId)) return false;
      parentId = itemById.get(parentId)?.parentId ?? null;
    }
    return true;
  }), [collapsedIds, itemById, items, outlineLevel, visibleProjectIds]);
  const timeline = useMemo(() => {
    const taskStartDates = items
      .filter((item) => visibleProjectIds.has(item.projectId) && item.type === "task")
      .map((item) => parseDisplayDate(item.startDate))
      .filter((date): date is Date => Boolean(date));
    const fallbackProjectStartDates = projects
      .filter((project) => visibleProjectIds.has(project.id))
      .map((project) => parseIsoDate(project.startDate))
      .filter((date): date is Date => Boolean(date));
    const projectStartDates = taskStartDates.length ? taskStartDates : fallbackProjectStartDates;
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
    const startDate = addCalendarDays(minimumProjectStartDate, -7 * ganttDayStep);
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
  const scheduleTaskGridColumns = useMemo<TaskGridColumn<TaskItem>[]>(() => createTaskGridColumns<TaskItem>({
    basicColumns: createBasicColumns<TaskItem>({
      getNameCopyValue: (item) => item.name,
      applyNamePasteValue: (value) => value ? { name: value } : {},
    }),
    scheduleColumns: createScheduleColumns<TaskItem>({
      getDurationCopyValue: (item) => item.type === "task" ? String(item.duration) : String(summaryDates.get(item.id)?.duration ?? ""),
      applyDurationPasteValue: (value) => /^\d+(?:[.,]\d+)?$/.test(value) ? { duration: Math.max(1, Math.trunc(Number(value.replace(",", ".")))) } : {},
      getStartDateCopyValue: (item) => item.type === "task" ? item.startDate : summaryDates.get(item.id)?.startDate ?? "",
      applyStartDatePasteValue: (value) => {
        const date = normalizePastedDate(value);
        return date ? { startDate: date } : {};
      },
      getFinishDateCopyValue: (item) => item.type === "task" ? item.finishDate : summaryDates.get(item.id)?.finishDate ?? "",
      applyFinishDatePasteValue: (value) => {
        const date = normalizePastedDate(value);
        return date ? { finishDate: date } : {};
      },
      getStatusCopyValue: (item) => scheduleStatusPresentation[(item.type === "project" ? getProjectScheduleStatus(projectStatusById.get(item.projectId)) : "NOT_STARTED")].label,
    }),
    estimateColumns: estimateColumns as TaskGridColumn<TaskItem>[],
    resourceColumns: resourceColumns as TaskGridColumn<TaskItem>[],
  }), [projectStatusById, summaryDates]);
  const visibleTaskGridColumns = getVisibleTaskGridColumns(scheduleTaskGridColumns, columnGroupVisibility, taskNameColumnWidth);
  const scheduleTableWidth = getTaskGridColumnWidth(visibleTaskGridColumns);
  const scheduleGridTemplate = visibleTaskGridColumns.map((column) => `${column.width}px`).join(" ");
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

  const commitItems = useCallback((next: TaskItem[] | ((current: TaskItem[]) => TaskItem[]), options: { description: string; mergeKey?: string }) => {
    scheduleHistory.commit((current) => ({
      ...current,
      items: typeof next === "function" ? next(current.items) : next,
    }), options);
  }, [scheduleHistory]);
  const { wbsDrag, wbsInsertionLineRef, suppressWbsClickRef, startWbsDrag } = useTaskGridWbsReorder({
    items,
    visibleItems,
    bodyScrollRef: taskGridBodyScrollRef,
    setSelectedItemId,
    commitItems,
    onNotice,
  });
  const { startTaskGridSelection, syncTaskGridHorizontalScroll, startTaskNameColumnResize } = useTaskGridInteractions({
    visibleItems,
    allItems: items,
    visibleColumns: visibleTaskGridColumns,
    taskGridController,
    bodyScrollRef: taskGridBodyScrollRef,
    commitItems,
    onNotice,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Control") taskGridCtrlRef.current = true;
      if (event.key === "Escape") {
        event.preventDefault();
        taskGridSelectingRef.current = false;
        taskGridFillModeRef.current = false;
        taskGridFillSourceRef.current = null;
        taskGridHandleDragRef.current = false;
        taskGridSelectionRef.current = null;
        setTaskGridSelection(null);
        setTaskGridCopyActive(false);
        taskGridBodyScrollRef.current?.focus();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.key === "Control") taskGridCtrlRef.current = false; };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => { taskGridSelectionRef.current = taskGridSelection; }, [taskGridSelection]);

  useEffect(() => {
    function clearTaskGridSelection(event: globalThis.PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".schedule-table-pane")) {
        taskGridSelectionRef.current = null;
        setTaskGridSelection(null);
        setTaskGridCopyActive(false);
      }
    }
    document.addEventListener("pointerdown", clearTaskGridSelection);
    return () => document.removeEventListener("pointerdown", clearTaskGridSelection);
  }, []);

  function openTaskContextMenu(event: ReactMouseEvent<HTMLDivElement>, task: TaskItem) {
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

  function openTaskDetails(task: TaskItem) {
    setSelectedItemId(task.id);
    setTaskDetailMode("docked");
    setTaskContextMenu(null);
    globalThis.requestAnimationFrame(() => {
      taskDetailNameInputRef.current?.focus();
      taskDetailNameInputRef.current?.select();
    });
  }

  function getTaskToGroupHierarchyValidation(task: TaskItem) {
    const parent = itemById.get(task.parentId ?? "");
    if (parent?.type !== "workItem") return "Chỉ có thể chuyển Công tác trực tiếp dưới Hạng mục thành Nhóm.";
    return null;
  }

  async function convertTaskToGroup(task: TaskItem) {
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
          items: recalculateTaskWbs(converted),
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

  function openDependencyEditor(task: TaskItem, dependencyId?: string) {
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

  function updateSelected(changes: Partial<TaskItem>, description?: string, mergeKey?: string) {
    if (!selectedItem) return;
    commitItems(
      (current) => current.map((item) => item.id === selectedItem.id ? { ...item, ...changes } : item),
      { description: description ?? `Sửa ${selectedItem.wbs} · ${selectedItem.name}`, mergeKey: mergeKey ?? `edit-${selectedItem.id}` },
    );
    onNotice(`Đã cập nhật nháp: ${selectedItem.name}`);
  }

  function updateDuration(target: TaskItem, durationValue: number) {
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

  function updateScheduleDate(target: TaskItem, field: "startDate" | "finishDate", value: string) {
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
    const changes: Partial<TaskItem> = { startDate, finishDate, duration, ganttWidth };
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

  function insertScheduleItem(context: TaskItem | undefined, position: "before" | "after") {
    const projectId = context?.projectId ?? projects.find((project) => project.visible)?.id;
    if (!projectId) {
      onNotice("Hãy chọn ít nhất một dự án trước khi thêm công việc");
      return;
    }
    const projectRoot = items.find((item) => item.projectId === projectId && item.type === "project");
    if (!context || !projectRoot) return;
    const isProjectRoot = context.type === "project";
    const parentId = isProjectRoot ? context.id : context.parentId;
    const itemType: TaskItemType = isProjectRoot ? "workItem" : context.type;
    const defaultNames: Record<TaskItemType, string> = {
      project: "Dự án mới",
      workItem: "Hạng mục mới",
      group: "Nhóm công việc mới",
      task: "Công tác mới",
    };
    const newItem: TaskItem = {
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
    const nextItems = context.type === "project"
      ? insertTaskChild(items, context, newItem, position === "before" ? "first" : "last")
      : insertTaskSibling(items, context, newItem, position);
    const insertedItem = nextItems.find((item) => item.id === newItem.id) ?? newItem;
    commitItems(nextItems, { description: `Chèn ${insertedItem.wbs} · ${insertedItem.name} ${position === "before" ? "phía trên" : "phía dưới"}` });
    setSelectedItemId(newItem.id);
    setAutoEditItemId(newItem.id);
    onNotice(`Đã chèn “${insertedItem.name}” ${position === "before" ? "phía trên" : "phía dưới"} dòng hiện tại`);
  }

  function addChildItem(parent: TaskItem) {
    if (parent.type !== "project" && parent.type !== "workItem" && parent.type !== "group") return;
    const itemType: TaskItemType = parent.type === "project" ? "workItem" : "task";
    const itemName = itemType === "workItem" ? "Hạng mục mới" : "Công tác mới";
    const newItem: TaskItem = {
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
    const nextItems = insertTaskChild(items, parent, newItem, "last");
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

  async function deleteItem(targetItem?: TaskItem) {
    const target = targetItem ?? selectedItem;
    if (!target || target.type === "project") {
      onNotice("Không xóa dự án tại màn hình tiến độ");
      return;
    }
    const preview = removeTaskSubtree(items, target.id);
    if (!await commonDialog.confirm({
      title: "Xóa dòng tiến độ",
      message: `Xóa “${target.name}” khỏi kế hoạch tiến độ?`,
      detail: preview.removedIds.size > 1 ? `Toàn bộ ${preview.removedIds.size - 1} dòng con và các quan hệ công việc liên quan cũng sẽ bị xóa.` : "Các quan hệ công việc liên quan cũng sẽ bị xóa.",
      confirmText: "Xóa",
      tone: "danger",
    })) return;
    scheduleHistory.commit(
      (current) => {
        const result = removeTaskSubtree(current.items, target.id);
        return { items: result.items, dependencies: current.dependencies.filter((dependency) => !result.removedIds.has(dependency.predecessorTaskId) && !result.removedIds.has(dependency.successorTaskId)) };
      },
      { description: `Xóa ${target.wbs} · ${target.name}${preview.removedIds.size > 1 ? ` và ${preview.removedIds.size - 1} dòng con` : ""}` },
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

  function getGanttRowBar(item: TaskItem, rowIndex: number) {
    if (!timeline) return { left: 0, width: 0, hasBar: false, startDate: "", finishDate: "" };
    const derivedDates = item.type === "task" ? null : summaryDates.get(item.id);
    const startDate = derivedDates?.startDate ?? item.startDate;
    const finishDate = derivedDates?.finishDate ?? item.finishDate;
    const start = parseDisplayDate(startDate);
    const finish = parseDisplayDate(finishDate);
    if (!start || !finish || (item.type !== "task" && !derivedDates)) return { left: 0, width: 0, hasBar: false, startDate, finishDate };
    const left = Math.max(0, differenceInCalendarDays(start, timeline.startDate) / ganttDayStep * ganttColumnWidth);
    const width = Math.max(4, (differenceInCalendarDays(finish, start) + 1) / ganttDayStep * ganttColumnWidth);
    return { left, width, hasBar: true, startDate, finishDate, rowIndex };
  }

  function startDependencyDrag(event: ReactPointerEvent<HTMLSpanElement>, task: TaskItem, barLeft: number, barWidth: number, rowIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const sourcePoint = { x: barLeft + barWidth, y: rowIndex * scheduleRowHeight + scheduleRowHeight / 2 };
    setSelectedItemId(task.id);
    setSelectedDependencyId(null);
    setDependencyDrag({ sourceTaskId: task.id, sourcePoint, pointerPosition: sourcePoint, initialPointerPosition: { x: event.clientX, y: event.clientY }, hasExceededThreshold: false });
  }

  function isValidDependencyTarget(target: TaskItem) {
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

  return <section className={`schedule-screen ${className ?? ""}`}>
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

    <ScheduleBoard
      style={scheduleBoardStyle}
      taskGrid={<TaskGrid
      visibleItems={visibleItems}
      rowContext={{ base: { selectedItem, itemById, taskOrder: scheduleOrder, hasChildren, wbsDrag, suppressWbsClickRef, setSelectedItemId, openTaskContextMenu, startWbsDrag, addChildItem, insertScheduleItem, deleteItem, autoEditItemId, setAutoEditItemId, getScheduleTreeDepth: getTaskTreeDepth, collapsedIds, toggleCollapse, InlineNameEditor, commitItems, onNotice, columnGroupVisibility, formatOptionalNumber }, schedule: { summaryDates, getProjectScheduleStatus, projectStatusById, incomingDependencies, formatDependencyLabel, updateDuration, InlineDateEditor, updateScheduleDate, openDependencyEditor, ScheduleStatusChip } }}      emptyContent={<div className="schedule-empty">Chưa chọn dự án nào trong “Danh sách dự án”.</div>}
        visibleColumns={visibleTaskGridColumns}
        columnGroups={taskGridColumnGroups}
        columnGroupVisibility={columnGroupVisibility}
        onToggleColumnGroup={toggleColumnGroup}
        onShowAllColumnGroups={() => setColumnGroupVisibility({ basic: true, progress: true, estimate: true, resource: true })}
        headerScrollRef={taskGridHeaderScrollRef}
        onHeaderScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "header")}
        nameColumnHeader={<><span>Tên công việc</span><span className="outline-controls" aria-label="Cấp Outline">{[1, 2, 3, 4].map((level) => <button key={level} type="button" className={outlineLevel === level ? "active" : ""} aria-pressed={outlineLevel === level} title={`Outline ${level}`} onClick={() => setOutlineLevel(level)}>{level}</button>)}</span><button type="button" className="column-resizer" aria-label="Kéo để thay đổi độ rộng cột Tên công việc" title={`Độ rộng hiện tại: ${Math.round(taskNameColumnWidth)}px`} onPointerDown={startTaskNameColumnResize} /></>}
      bodyScrollRef={taskGridBodyScrollRef}
      insertionLineRef={wbsInsertionLineRef}
      onBodyPointerDown={startTaskGridSelection}
      onBodyScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "body")}
      bottomScrollRef={taskGridBottomScrollRef}
      tableWidth={scheduleTableWidth}
      onBottomScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "dock")}
    />}
      ganttTimeline={<GanttTimeline timeline={timeline} items={visibleItems} selectedItemId={selectedItem?.id ?? ""} dependencies={dependencies} selectedDependencyId={selectedDependencyId} onSelectItem={setSelectedItemId} onSelectDependency={(id, doubleClick) => { setSelectedDependencyId(id); if (doubleClick) { const successor = itemById.get(dependencies.find((dependency) => dependency.id === id)?.successorTaskId ?? ""); if (successor) openDependencyEditor(successor, id); } }} getDependencyGeometry={getTaskBarGeometry} getRowBar={getGanttRowBar} columnWidth={ganttColumnWidth} dayStep={ganttDayStep} formatDate={formatDisplayDate} scrollRef={ganttScrollRef} headerScrollRef={ganttHeaderScrollRef} bottomScrollRef={ganttBottomScrollRef} contentRef={ganttContentRef} dependencyDrag={dependencyDrag} onStartDependencyDrag={startDependencyDrag} isValidDependencyTarget={isValidDependencyTarget} onScroll={(event) => { const dock = ganttBottomScrollRef.current; if (dock && Math.abs(dock.scrollLeft - event.currentTarget.scrollLeft) > 1) dock.scrollLeft = event.currentTarget.scrollLeft; const header = ganttHeaderScrollRef.current; if (header && Math.abs(header.scrollLeft - event.currentTarget.scrollLeft) > 1) header.scrollLeft = event.currentTarget.scrollLeft; }} />}
    />

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

export function ScheduleView(props: Omit<ScheduleViewProps, "className">) {
  return <ScheduleWorkspace {...props} />;
}

