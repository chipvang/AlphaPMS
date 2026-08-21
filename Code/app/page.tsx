"use client";

import { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUndoRedo } from "../lib/history/useUndoRedo";
import { DependencyType, formatDependencyLabel, propagateDependencySchedule, TaskDependency, validateTaskDependency } from "../lib/schedule/dependencies";

type ProjectStatus = "Đang thực hiện" | "Chuẩn bị" | "Tạm dừng" | "Hoàn thành";

type Project = {
  id: string;
  code: string;
  name: string;
  investor: string;
  location: string;
  manager: string;
  startDate: string;
  finishDate: string;
  budget: number;
  progress: number;
  status: ProjectStatus;
  description: string;
  visible: boolean;
  updatedAt: string;
};

const storageKey = "alphapms-projects-v1";

const initialProjects: Project[] = [
  {
    id: "prj-bac-an",
    code: "BA-2026",
    name: "Dự án thoát nước Bắc An",
    investor: "Ban QLDA Hạ tầng Bắc An",
    location: "Bắc An, Hải Phòng",
    manager: "Nguyễn Minh Tuấn",
    startDate: "2026-08-20",
    finishDate: "2027-04-30",
    budget: 18426580000,
    progress: 28,
    status: "Đang thực hiện",
    description: "Thi công hệ thống thoát nước, đường giao thông và hoàn trả hạ tầng.",
    visible: true,
    updatedAt: "17/08/2026 15:40",
  },
  {
    id: "prj-song-xanh",
    code: "CSX-02",
    name: "Dự án cầu Sông Xanh",
    investor: "Sở Xây dựng Thành phố",
    location: "Quận Đông Hải",
    manager: "Trần Hải Nam",
    startDate: "2026-07-01",
    finishDate: "2027-12-15",
    budget: 42614900000,
    progress: 16,
    status: "Đang thực hiện",
    description: "Cầu bê tông cốt thép dự ứng lực và đường dẫn hai đầu cầu.",
    visible: true,
    updatedAt: "16/08/2026 10:12",
  },
  {
    id: "prj-factory-a2",
    code: "NMA2-01",
    name: "Nhà máy sản xuất A2",
    investor: "Công ty Công nghiệp Alpha",
    location: "KCN Nam Đình Vũ",
    manager: "Lê Thu Hà",
    startDate: "2026-10-01",
    finishDate: "2027-08-20",
    budget: 78500000000,
    progress: 4,
    status: "Chuẩn bị",
    description: "Nhà xưởng, hạ tầng kỹ thuật và hệ thống phụ trợ.",
    visible: false,
    updatedAt: "15/08/2026 08:30",
  },
  {
    id: "prj-road-5",
    code: "GT-05",
    name: "Nâng cấp tuyến đường số 5",
    investor: "UBND Quận Nam Sơn",
    location: "Nam Sơn",
    manager: "Phạm Quang Huy",
    startDate: "2025-11-12",
    finishDate: "2026-09-30",
    budget: 21800000000,
    progress: 86,
    status: "Tạm dừng",
    description: "Nâng cấp nền, mặt đường, thoát nước và chiếu sáng.",
    visible: false,
    updatedAt: "12/08/2026 14:05",
  },
];

const blankProject: Omit<Project, "id" | "updatedAt"> = {
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

function todayLabel() {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
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

type DependencyDraft = Pick<TaskDependency, "id" | "predecessorTaskId" | "dependencyType" | "lag">;

type DependencyDragState = {
  sourceTaskId: string;
  sourcePoint: { x: number; y: number };
  pointerPosition: { x: number; y: number };
  initialPointerPosition: { x: number; y: number };
  hasExceededThreshold: boolean;
};

const initialScheduleItems: ScheduleItem[] = [
  { id: "ba", projectId: "prj-bac-an", parentId: null, type: "project", wbs: "A", name: "DỰ ÁN THOÁT NƯỚC BẮC AN", duration: 254, startDate: "20/08/26", finishDate: "30/04/27", progress: 28, ganttLeft: 2, ganttWidth: 92 },
  { id: "ba-road", projectId: "prj-bac-an", parentId: "ba", type: "workItem", wbs: "A.1", name: "Hạng mục đường giao thông", duration: 128, startDate: "20/08/26", finishDate: "25/12/26", progress: 31, ganttLeft: 3, ganttWidth: 63 },
  { id: "ba-fill", projectId: "prj-bac-an", parentId: "ba-road", type: "group", wbs: "A.1.1", name: "Nhóm san lấp nền đường", duration: 42, startDate: "20/08/26", finishDate: "30/09/26", progress: 46, ganttLeft: 4, ganttWidth: 32, nature: "San lấp" },
  { id: "ba-k95", projectId: "prj-bac-an", parentId: "ba-fill", type: "task", wbs: "A.1.1.1", name: "Thi công nền đường K95 đoạn 1", duration: 23, startDate: "20/08/26", finishDate: "11/09/26", progress: 50, ganttLeft: 5, ganttWidth: 22, nature: "San lấp", critical: true, allocation: { code: "BB.22410", name: "Lắp cống D600", allocated: 240, total: 480, unit: "m" } },
  { id: "ba-base", projectId: "prj-bac-an", parentId: "ba-road", type: "group", wbs: "A.1.2", name: "Nhóm móng mặt đường", duration: 51, startDate: "01/10/26", finishDate: "20/11/26", progress: 12, ganttLeft: 35, ganttWidth: 30, nature: "Base" },
  { id: "ba-base-task", projectId: "prj-bac-an", parentId: "ba-base", type: "task", wbs: "A.1.2.1", name: "Rải cấp phối đá dăm loại I", duration: 18, startDate: "05/10/26", finishDate: "22/10/26", progress: 10, ganttLeft: 39, ganttWidth: 17, nature: "Base", delayed: true, allocation: { code: "AD.23230", name: "Làm móng cấp phối đá dăm", allocated: 1250, total: 1800, unit: "m³" } },
  { id: "sx", projectId: "prj-song-xanh", parentId: null, type: "project", wbs: "B", name: "DỰ ÁN CẦU SÔNG XANH", duration: 533, startDate: "01/07/26", finishDate: "15/12/27", progress: 16, ganttLeft: 0, ganttWidth: 98 },
  { id: "sx-bridge", projectId: "prj-song-xanh", parentId: "sx", type: "workItem", wbs: "B.1", name: "Hạng mục cầu chính", duration: 310, startDate: "01/07/26", finishDate: "06/05/27", progress: 19, ganttLeft: 1, ganttWidth: 77 },
  { id: "sx-pile", projectId: "prj-song-xanh", parentId: "sx-bridge", type: "group", wbs: "B.1.1", name: "Nhóm thi công móng trụ", duration: 96, startDate: "10/08/26", finishDate: "13/11/26", progress: 24, ganttLeft: 10, ganttWidth: 39, nature: "Cọc" },
  { id: "sx-pile-task", projectId: "prj-song-xanh", parentId: "sx-pile", type: "task", wbs: "B.1.1.1", name: "Khoan cọc nhồi trụ T1", duration: 31, startDate: "22/08/26", finishDate: "21/09/26", progress: 35, ganttLeft: 15, ganttWidth: 25, nature: "Cọc", allocation: { code: "AG.31121", name: "Khoan tạo lỗ cọc nhồi", allocated: 186, total: 420, unit: "m" } },
];

const initialTaskDependencies: TaskDependency[] = [
  { id: "dep-ba-k95-base", projectId: "prj-bac-an", predecessorTaskId: "ba-k95", successorTaskId: "ba-base-task", dependencyType: "FS", lag: 0 },
];

const initialScheduleState: ScheduleState = { items: initialScheduleItems, dependencies: initialTaskDependencies };

const scheduleDepth: Record<ScheduleItemType, number> = { project: 0, workItem: 1, group: 2, task: 3 };
const scheduleTypeByDepth: ScheduleItemType[] = ["project", "workItem", "group", "task"];
const ganttColumnWidth = 20;

function isScheduleDescendant(item: ScheduleItem, ancestorId: string, itemMap: Map<string, ScheduleItem>) {
  let parentId = item.parentId;
  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = itemMap.get(parentId)?.parentId ?? null;
  }
  return false;
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

function InlineNameEditor({ value, autoEdit = false, onCommit }: { value: string; autoEdit?: boolean; onCommit: (value: string) => void }) {
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
  }

  if (!isEditing) {
    return <span className="inline-name-value" title="Bấm kép để sửa" onDoubleClick={(event) => { event.stopPropagation(); setDraftValue(value); setIsEditing(true); }}>{value}</span>;
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
  const [draftValue, setDraftValue] = useState(value);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ left: 0, top: 0 });
  const [viewMonth, setViewMonth] = useState(() => parseDisplayDate(value) ?? new Date());
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

  function commitDraft() {
    if (draftValue === value) return;
    const date = parseDisplayDate(draftValue);
    if (!date) {
      setDraftValue(value);
      onInvalid();
      return;
    }
    const formattedValue = formatDisplayDate(date);
    setDraftValue(formattedValue);
    if (onCommit(formattedValue) === false) setDraftValue(value);
  }

  function openDatePicker() {
    const button = calendarButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const selectedDate = parseDisplayDate(draftValue) ?? new Date();
    setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setCalendarPosition({
      left: Math.max(8, Math.min(rect.right - 252, globalThis.innerWidth - 260)),
      top: Math.max(8, Math.min(rect.bottom + 4, globalThis.innerHeight - 302)),
    });
    setCalendarOpen((current) => !current);
  }

  function selectCalendarDate(date: Date) {
    const nextValue = formatDisplayDate(date);
    if (onCommit(nextValue) !== false) setDraftValue(nextValue);
    else setDraftValue(value);
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

  return <div className="inline-date-editor">
    <input
      className="inline-date-text"
      aria-label={label}
      inputMode="numeric"
      maxLength={8}
      value={draftValue}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraftValue(value);
          event.currentTarget.blur();
        }
      }}
    />
    <button ref={calendarButtonRef} type="button" className="inline-date-button" title={`Chọn ${label.toLocaleLowerCase("vi")}`} aria-label={`Chọn ${label.toLocaleLowerCase("vi")}`} onMouseDown={(event) => event.preventDefault()} onClick={openDatePicker}>▣</button>
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
  const { items, dependencies } = scheduleHistory.value;
  const [selectedItemId, setSelectedItemId] = useState("ba-k95");
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | null>(null);
  const [dependencyEditorTaskId, setDependencyEditorTaskId] = useState<string | null>(null);
  const [dependencyDrafts, setDependencyDrafts] = useState<DependencyDraft[]>([]);
  const [dependencySearch, setDependencySearch] = useState("");
  const [dependencyEditorError, setDependencyEditorError] = useState("");
  const [dependencyDrag, setDependencyDrag] = useState<DependencyDragState | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [outlineLevel, setOutlineLevel] = useState(4);
  const [autoEditItemId, setAutoEditItemId] = useState<string | null>(null);
  const [taskDetailMode, setTaskDetailMode] = useState<"docked" | "collapsed" | "hidden">("docked");
  const [ganttDayStep, setGanttDayStep] = useState(1);
  const [taskNameColumnWidth, setTaskNameColumnWidth] = useState(415);
  const [columnGroupVisibility, setColumnGroupVisibility] = useState<TaskGridColumnGroupVisibility>({ basic: true, progress: true, estimate: false, resource: false });
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const taskGridHeaderScrollRef = useRef<HTMLDivElement>(null);
  const taskGridBodyScrollRef = useRef<HTMLDivElement>(null);
  const ganttHeaderScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const ganttBottomScrollRef = useRef<HTMLDivElement>(null);
  const ganttContentRef = useRef<HTMLDivElement>(null);
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const confirmDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const visibleProjectIds = useMemo(() => new Set(projects.filter((project) => project.visible).map((project) => project.id)), [projects]);
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
    if (scheduleDepth[item.type] + 1 > outlineLevel) return false;
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
  const basicColumnWidths = [50, 116, taskNameColumnWidth];
  const scheduleColumnWidths = [60, 70, 70, 50, 96];
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
  const deleteTarget = items.find((item) => item.id === deleteTargetId);
  const deleteChildCount = deleteTarget ? items.filter((item) => {
    let parentId = item.parentId;
    while (parentId) {
      if (parentId === deleteTarget.id) return true;
      parentId = itemById.get(parentId)?.parentId ?? null;
    }
    return false;
  }).length : 0;
  const hasChildren = (itemId: string) => items.some((item) => item.parentId === itemId);
  const areAllColumnGroupsVisible = Object.values(columnGroupVisibility).every(Boolean);

  function toggleColumnGroup(group: Exclude<TaskGridColumnGroup, "basic">) {
    setColumnGroupVisibility((current) => ({ ...current, [group]: !current[group] }));
  }

  function syncTaskGridHorizontalScroll(scrollLeft: number, source: "header" | "body") {
    const target = source === "header" ? taskGridBodyScrollRef.current : taskGridHeaderScrollRef.current;
    if (target && Math.abs(target.scrollLeft - scrollLeft) > 1) target.scrollLeft = scrollLeft;
  }

  function commitItems(next: ScheduleItem[] | ((current: ScheduleItem[]) => ScheduleItem[]), options: { description: string; mergeKey?: string }) {
    scheduleHistory.commit((current) => ({
      ...current,
      items: typeof next === "function" ? next(current.items) : next,
    }), options);
  }

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

  function deleteSelectedDependency() {
    const dependency = dependencies.find((item) => item.id === selectedDependencyId);
    if (!dependency) return;
    const predecessor = itemById.get(dependency.predecessorTaskId);
    const successor = itemById.get(dependency.successorTaskId);
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

  function getBranchRange(targetId: string) {
    const startIndex = items.findIndex((item) => item.id === targetId);
    if (startIndex < 0) return null;
    let endIndex = startIndex + 1;
    while (endIndex < items.length && isScheduleDescendant(items[endIndex], targetId, itemById)) endIndex += 1;
    return { startIndex, endIndex };
  }

  function findVerticalTarget(target: ScheduleItem, direction: "up" | "down") {
    const targetIndex = items.indexOf(target);
    if (direction === "up") {
      for (let index = targetIndex - 1; index >= 0; index -= 1) {
        const candidate = items[index];
        if (candidate.projectId !== target.projectId) break;
        if (candidate.type === target.type) return candidate;
      }
      return null;
    }
    const range = getBranchRange(target.id);
    if (!range) return null;
    for (let index = range.endIndex; index < items.length; index += 1) {
      const candidate = items[index];
      if (candidate.projectId !== target.projectId) break;
      if (candidate.type === target.type) return candidate;
    }
    return null;
  }

  function findPreviousSibling(target: ScheduleItem) {
    const targetIndex = items.indexOf(target);
    for (let index = targetIndex - 1; index >= 0; index -= 1) {
      const candidate = items[index];
      if (candidate.projectId !== target.projectId) break;
      if (candidate.parentId === target.parentId && candidate.type === target.type) return candidate;
    }
    return null;
  }

  function canOutdent(target: ScheduleItem) {
    return target.type === "group" || target.type === "task";
  }

  function canIndent(target: ScheduleItem) {
    if (target.type === "project" || target.type === "task" || !findPreviousSibling(target)) return false;
    const range = getBranchRange(target.id);
    if (!range) return false;
    return !items.slice(range.startIndex, range.endIndex).some((item) => item.type === "task");
  }

  function moveScheduleItem(target: ScheduleItem, direction: "up" | "down") {
    const candidate = findVerticalTarget(target, direction);
    const targetRange = getBranchRange(target.id);
    if (!candidate || !targetRange || target.type === "project") {
      onNotice(`Không thể dịch ${direction === "up" ? "lên" : "xuống"} dòng này trong phạm vi dự án`);
      return;
    }
    const movingBranch = items.slice(targetRange.startIndex, targetRange.endIndex).map((item, index) => index === 0 ? { ...item, parentId: candidate.parentId } : item);
    const remainingItems = [...items.slice(0, targetRange.startIndex), ...items.slice(targetRange.endIndex)];
    let insertIndex: number;
    if (direction === "up") {
      insertIndex = remainingItems.findIndex((item) => item.id === candidate.id);
    } else {
      const remainingMap = new Map(remainingItems.map((item) => [item.id, item]));
      const candidateIndex = remainingItems.findIndex((item) => item.id === candidate.id);
      insertIndex = candidateIndex + 1;
      while (insertIndex < remainingItems.length && isScheduleDescendant(remainingItems[insertIndex], candidate.id, remainingMap)) insertIndex += 1;
    }
    const nextItems = recalculateScheduleWbs([
      ...remainingItems.slice(0, insertIndex),
      ...movingBranch,
      ...remainingItems.slice(insertIndex),
    ]);
    commitItems(nextItems, { description: `Dịch ${target.wbs} ${direction === "up" ? "lên" : "xuống"}` });
    setSelectedItemId(target.id);
    onNotice(`Đã dịch “${target.name}” ${direction === "up" ? "lên" : "xuống"}`);
  }

  function outdentScheduleItem(target: ScheduleItem) {
    if (!canOutdent(target)) {
      onNotice("Hạng mục không thể giảm tiếp thành cấp dự án");
      return;
    }
    const targetRange = getBranchRange(target.id);
    const oldParent = itemById.get(target.parentId ?? "");
    if (!targetRange || !oldParent) return;
    const transformedBranch = items.slice(targetRange.startIndex, targetRange.endIndex).map((item, index) => ({
      ...item,
      type: scheduleTypeByDepth[scheduleDepth[item.type] - 1],
      parentId: index === 0 ? oldParent.parentId : item.parentId,
    }));
    const remainingItems = [...items.slice(0, targetRange.startIndex), ...items.slice(targetRange.endIndex)];
    const remainingMap = new Map(remainingItems.map((item) => [item.id, item]));
    let insertIndex = remainingItems.findIndex((item) => item.id === oldParent.id) + 1;
    while (insertIndex < remainingItems.length && isScheduleDescendant(remainingItems[insertIndex], oldParent.id, remainingMap)) insertIndex += 1;
    const nextItems = recalculateScheduleWbs([
      ...remainingItems.slice(0, insertIndex),
      ...transformedBranch,
      ...remainingItems.slice(insertIndex),
    ]);
    commitItems(nextItems, { description: `Giảm cấp ${target.wbs} · ${target.name}` });
    setSelectedItemId(target.id);
    onNotice(`Đã chuyển “${target.name}” thành ${target.type === "task" ? "Nhóm công việc" : "Hạng mục"}`);
  }

  function indentScheduleItem(target: ScheduleItem) {
    const previousSibling = findPreviousSibling(target);
    const targetRange = getBranchRange(target.id);
    if (!previousSibling || !targetRange || !canIndent(target)) {
      onNotice("Không có dòng cùng cấp phía trên phù hợp hoặc nhánh sẽ vượt quá cấp Công tác");
      return;
    }
    const transformedBranch = items.slice(targetRange.startIndex, targetRange.endIndex).map((item, index) => ({
      ...item,
      type: scheduleTypeByDepth[scheduleDepth[item.type] + 1],
      parentId: index === 0 ? previousSibling.id : item.parentId,
    }));
    const nextItems = recalculateScheduleWbs([
      ...items.slice(0, targetRange.startIndex),
      ...transformedBranch,
      ...items.slice(targetRange.endIndex),
    ]);
    commitItems(nextItems, { description: `Tăng cấp ${target.wbs} · ${target.name}` });
    setSelectedItemId(target.id);
    onNotice(`Đã chuyển “${target.name}” thành ${target.type === "workItem" ? "Nhóm công việc" : "Công tác"}`);
  }

  useEffect(() => {
    if (!deleteTargetId) return;
    cancelDeleteButtonRef.current?.focus();
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const shortcut = event.key.toLocaleLowerCase();
      if (event.altKey && shortcut === "h") {
        event.preventDefault();
        setDeleteTargetId(null);
        return;
      }
      if (event.altKey && shortcut === "x") {
        event.preventDefault();
        confirmDeleteButtonRef.current?.click();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setDeleteTargetId(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusableElements = Array.from(deleteDialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
      if (!focusableElements.length) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleteTargetId]);

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
      setTaskNameColumnWidth(Math.max(415, Math.min(915, startWidth + pointerEvent.clientX - startX)));
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
    const startDate = field === "startDate" ? value : target.startDate;
    const finishDate = field === "finishDate" ? value : target.finishDate;
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
      return { ...current, items: propagateDependencySchedule(changedItems, current.dependencies, [target.id]) };
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
      id: `task-${Date.now()}`,
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

  function deleteItem(targetItem?: ScheduleItem) {
    const target = targetItem ?? selectedItem;
    if (!target || target.type === "project") {
      onNotice("Không xóa dự án tại màn hình tiến độ");
      return;
    }
    setDeleteTargetId(target.id);
  }

  function confirmDeleteItem() {
    const target = items.find((item) => item.id === deleteTargetId);
    if (!target) {
      setDeleteTargetId(null);
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
    scheduleHistory.commit(
      (current) => ({
        items: current.items.filter((item) => !idsToDelete.has(item.id)),
        dependencies: current.dependencies.filter((dependency) => !idsToDelete.has(dependency.predecessorTaskId) && !idsToDelete.has(dependency.successorTaskId)),
      }),
      { description: `Xóa ${target.wbs} · ${target.name}${idsToDelete.size > 1 ? ` và ${idsToDelete.size - 1} dòng con` : ""}` },
    );
    setSelectedItemId(target.parentId ?? visibleItems[0]?.id ?? "");
    setDeleteTargetId(null);
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
    return { left, width, y: rowIndex * 35 + 17.5 };
  }

  function startDependencyDrag(event: ReactPointerEvent<HTMLSpanElement>, task: ScheduleItem, barLeft: number, barWidth: number, rowIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const sourcePoint = { x: barLeft + barWidth, y: rowIndex * 35 + 17.5 };
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
        <button className="button primary" onClick={() => onNotice("Đã lưu dữ liệu tiến độ nháp trên phiên làm việc")}>▣ Lưu thay đổi</button>
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
      <div ref={taskGridBodyScrollRef} className="schedule-table-pane" onScroll={(event) => syncTaskGridHorizontalScroll(event.currentTarget.scrollLeft, "body")}>
        <div className="schedule-rows">
          {visibleItems.map((item) => {
            const isSelected = item.id === selectedItem?.id;
            const expandable = hasChildren(item.id);
            const derivedDates = item.type === "task" ? null : summaryDates.get(item.id);
            const itemDependencies = incomingDependencies.get(item.id) ?? [];
            const predecessorText = itemDependencies.length ? itemDependencies.map((dependency) => formatDependencyLabel(dependency, scheduleOrder)).join(";") : "—";
            const predecessorTooltip = itemDependencies.map((dependency) => {
              const predecessor = itemById.get(dependency.predecessorTaskId);
              const lagText = dependency.lag ? ` ${dependency.lag > 0 ? "+" : ""}${dependency.lag} ngày` : "";
              return `${scheduleOrder.get(dependency.predecessorTaskId) ?? "?"} — ${predecessor?.name ?? "Không tìm thấy công tác"} — ${dependency.dependencyType}${lagText}`;
            }).join("\n");
            return <div key={item.id} className={`schedule-table-grid schedule-row row-${item.type} ${isSelected ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSelectedItemId(item.id)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) setSelectedItemId(item.id); }}>
              <div className="wbs-cell" title={`WBS: ${item.wbs}`}>{scheduleOrder.get(item.id)}</div>
              <div className="row-actions">
                <button title="Dịch lên" disabled={item.type === "project" || !findVerticalTarget(item, "up")} onClick={() => moveScheduleItem(item, "up")}>↑</button><button title="Dịch xuống" disabled={item.type === "project" || !findVerticalTarget(item, "down")} onClick={() => moveScheduleItem(item, "down")}>↓</button><button title="Giảm cấp" disabled={!canOutdent(item)} onClick={() => outdentScheduleItem(item)}>←</button><button title="Tăng cấp" disabled={!canIndent(item)} onClick={() => indentScheduleItem(item)}>→</button><button aria-label="Chèn phía trên" title="Chèn phía trên" onClick={() => insertScheduleItem(item, "before")}>↥</button><button aria-label="Chèn phía dưới" title="Chèn phía dưới" onClick={() => insertScheduleItem(item, "after")}>↧</button><button title="Xóa" disabled={item.type === "project"} onClick={() => deleteItem(item)}>⌫</button>
              </div>
              <div className="task-name" style={{ paddingLeft: `${10 + scheduleDepth[item.type] * 18}px` }}>
                {expandable ? <button className="tree-toggle" onClick={(event) => { event.stopPropagation(); toggleCollapse(item.id); }}>{collapsedIds.has(item.id) ? "›" : "⌄"}</button> : <span className="tree-spacer" />}
                <InlineNameEditor value={item.name} autoEdit={autoEditItemId === item.id} onCommit={(name) => { setAutoEditItemId(null); setSelectedItemId(item.id); commitItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, name } : currentItem), { description: `Đổi tên ${item.wbs} thành “${name}”` }); onNotice(`Đã đổi tên ${item.wbs}`); }} />{item.nature && <small>{item.nature}</small>}
              </div>
              {columnGroupVisibility.progress && <>{item.type === "task" ? <><div className="duration-cell"><input aria-label={`Thời lượng ${item.name}`} type="number" min="1" value={item.duration} onFocus={() => setSelectedItemId(item.id)} onChange={(event) => updateDuration(item, Number(event.target.value))} onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Enter") event.currentTarget.blur(); }} /><span>ngày</span></div>
              <div className="date-cell"><InlineDateEditor key={`${item.id}-start-${item.startDate}`} label={`Ngày bắt đầu ${item.name}`} value={item.startDate} onCommit={(value) => { setSelectedItemId(item.id); return updateScheduleDate(item, "startDate", value); }} onInvalid={() => onNotice("Ngày bắt đầu phải đúng định dạng dd/MM/yy")} /></div>
              <div className="date-cell"><InlineDateEditor key={`${item.id}-finish-${item.finishDate}`} label={`Ngày kết thúc ${item.name}`} value={item.finishDate} onCommit={(value) => { setSelectedItemId(item.id); return updateScheduleDate(item, "finishDate", value); }} onInvalid={() => onNotice("Ngày kết thúc phải đúng định dạng dd/MM/yy")} /></div></> : <><div className="duration-cell summary-value"><span>{derivedDates?.duration ?? "—"} {derivedDates ? "ngày" : ""}</span></div><div className="date-cell summary-value"><span>{derivedDates?.startDate ?? "—"}</span></div><div className="date-cell summary-value"><span>{derivedDates?.finishDate ?? "—"}</span></div></>}
              <div className={`predecessor-cell ${item.type === "task" ? "editable" : ""}`} title={predecessorTooltip || "Không có công tác trước"} onDoubleClick={() => openDependencyEditor(item)}><span>{item.type === "task" ? predecessorText : "—"}</span></div>
              <div className="plain-data-cell">—</div></>}
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
            <svg className="gantt-dependency-layer" width={timeline.width} height={visibleItems.length * 35} aria-label="Quan hệ công việc trên Gantt">
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
      <div className="gantt-scrollbar-spacer" />
      <div ref={ganttBottomScrollRef} className="gantt-scrollbar-dock" onScroll={(event) => {
        const timelineScroll = ganttScrollRef.current;
        if (timelineScroll && Math.abs(timelineScroll.scrollLeft - event.currentTarget.scrollLeft) > 1) timelineScroll.scrollLeft = event.currentTarget.scrollLeft;
        const header = ganttHeaderScrollRef.current;
        if (header && Math.abs(header.scrollLeft - event.currentTarget.scrollLeft) > 1) header.scrollLeft = event.currentTarget.scrollLeft;
      }}><div className="gantt-scrollbar-content" style={{ width: timeline?.width ?? 0 }} /></div>
    </div>
    </div>

    <div className="schedule-legend"><span><i className="legend-current" />Kế hoạch hiện tại</span><span><i className="legend-baseline" />Baseline</span><span><i className="legend-delayed" />Chậm tiến độ</span><span><i className="legend-critical" />Đường găng</span><strong>Đang chọn: {selectedItem?.name ?? "Chưa có"}</strong><div className="task-detail-controls" aria-label="Chế độ vùng chi tiết"><button type="button" className={taskDetailMode === "docked" ? "active" : ""} aria-pressed={taskDetailMode === "docked"} title="Ghim vùng chi tiết ở đáy" onClick={() => setTaskDetailMode("docked")}>Ghim dưới</button><button type="button" className={taskDetailMode === "collapsed" ? "active" : ""} aria-pressed={taskDetailMode === "collapsed"} title="Thu nhỏ vùng chi tiết" onClick={() => setTaskDetailMode("collapsed")}>Thu nhỏ</button><button type="button" className={taskDetailMode === "hidden" ? "active" : ""} aria-pressed={taskDetailMode === "hidden"} title="Ẩn vùng chi tiết" onClick={() => setTaskDetailMode("hidden")}>Ẩn</button></div></div>

    {selectedItem && taskDetailMode === "collapsed" && <div className="schedule-detail-collapsed"><strong>Chi tiết công việc</strong><span>{selectedItem.name}</span><button type="button" onClick={() => setTaskDetailMode("docked")}>Mở rộng</button></div>}

    {selectedItem && taskDetailMode === "docked" && <div className="schedule-detail">
      <div className="task-detail-form">
        <h3>Chi tiết công việc</h3>
        <div className="task-detail-grid">
          <label><span>Tên công việc</span><input value={selectedItem.name} onChange={(event) => updateSelected({ name: event.target.value })} /></label>
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

    {deleteTarget && <div className="confirm-backdrop">
      <div ref={deleteDialogRef} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
        <header className="confirm-caption">
          <div><span className="confirm-caption-icon">⌫</span><strong id="delete-dialog-title">Xóa dòng tiến độ</strong></div>
          <button type="button" className="confirm-close" onClick={() => setDeleteTargetId(null)} aria-label="Đóng cửa sổ">×</button>
        </header>
        <div className="confirm-content">
          <div className="delete-symbol" aria-hidden="true">⌫</div>
          <div>
            <h3>Xóa “{deleteTarget.name}”?</h3>
            <p id="delete-dialog-description">Dòng <strong>{deleteTarget.wbs}</strong> sẽ bị xóa khỏi kế hoạch tiến độ.{deleteChildCount > 0 ? ` Toàn bộ ${deleteChildCount} dòng con cũng sẽ bị xóa.` : ""}</p>
            <small>Thao tác này đang áp dụng trên dữ liệu nháp và chưa gửi lên cơ sở dữ liệu.</small>
          </div>
        </div>
        <footer className="confirm-actions">
          <button ref={cancelDeleteButtonRef} type="button" className="button secondary" title="Phím tắt: Alt + H" onClick={() => setDeleteTargetId(null)}>Hủy bỏ</button>
          <button ref={confirmDeleteButtonRef} type="button" className="button primary" title="Phím tắt: Alt + X" onClick={confirmDeleteItem}>⌫ Xóa</button>
        </footer>
      </div>
    </div>}

  </section>;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [storageReady, setStorageReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("projects");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Tất cả" | ProjectStatus>("Tất cả");
  const [selectedId, setSelectedId] = useState(initialProjects[0].id);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(blankProject);
  const [notice, setNotice] = useState("Dữ liệu mẫu đã sẵn sàng để thao tác");

  useEffect(() => {
    const saved = globalThis.localStorage?.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Project[];
        if (Array.isArray(parsed) && parsed.length) {
          globalThis.queueMicrotask(() => {
            setProjects(parsed);
            setStorageReady(true);
          });
          return;
        }
      } catch {
        globalThis.localStorage?.removeItem(storageKey);
      }
    }
    globalThis.queueMicrotask(() => setStorageReady(true));
  }, []);

  useEffect(() => {
    if (storageReady) globalThis.localStorage?.setItem(storageKey, JSON.stringify(projects));
  }, [projects, storageReady]);

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

  function toggleVisibility(projectId: string) {
    setProjects((current) => current.map((project) => project.id === projectId ? { ...project, visible: !project.visible } : project));
    setNotice("Đã cập nhật phạm vi dự án hiển thị trên các phân hệ");
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

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.code.trim() || !draft.name.trim()) return;
    if (modalMode === "create") {
      const project: Project = {
        ...draft,
        id: `prj-${Date.now()}`,
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        updatedAt: todayLabel(),
      };
      setProjects((current) => [project, ...current]);
      setSelectedId(project.id);
      setNotice(`Đã tạo ${project.name}`);
    } else if (selectedProject) {
      setProjects((current) => current.map((project) => project.id === selectedProject.id ? {
        ...project,
        ...draft,
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        updatedAt: todayLabel(),
      } : project));
      setNotice(`Đã cập nhật ${draft.name}`);
    }
    setModalMode(null);
  }

  function duplicateProject(project: Project) {
    const copy: Project = {
      ...project,
      id: `prj-${Date.now()}`,
      code: `${project.code}-CP`,
      name: `${project.name} — Bản sao`,
      status: "Chuẩn bị",
      progress: 0,
      visible: false,
      updatedAt: todayLabel(),
    };
    setProjects((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Đã nhân bản dự án; bản sao đang ở trạng thái Chuẩn bị");
  }

  function archiveProject(project: Project) {
    if (!globalThis.confirm(`Chuyển “${project.name}” sang trạng thái Hoàn thành?`)) return;
    setProjects((current) => current.map((item) => item.id === project.id ? { ...item, status: "Hoàn thành", visible: false, updatedAt: todayLabel() } : item));
    setNotice("Đã hoàn thành và bỏ dự án khỏi phạm vi hiển thị");
  }

  function resetDemo() {
    if (!globalThis.confirm("Khôi phục toàn bộ dữ liệu dự án mẫu ban đầu?")) return;
    setProjects(initialProjects);
    setSelectedId(initialProjects[0].id);
    setQuery("");
    setStatusFilter("Tất cả");
    setNotice("Đã khôi phục dữ liệu mẫu");
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
            <div className="topbar-actions"><button className="button secondary" onClick={resetDemo}>Khôi phục dữ liệu mẫu</button><button className="button primary" onClick={openCreate}><span>＋</span> Tạo dự án</button></div>
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
              <div className="detail-actions"><button className="button primary" onClick={() => openEdit(selectedProject)}>Chỉnh sửa</button><button className="button secondary" onClick={() => duplicateProject(selectedProject)}>Nhân bản</button><button className="button secondary" onClick={() => archiveProject(selectedProject)}>Hoàn thành</button></div>
              <dl className="detail-grid"><div><dt>Chủ đầu tư</dt><dd>{selectedProject.investor}</dd></div><div><dt>Chủ nhiệm dự án</dt><dd>{selectedProject.manager}</dd></div><div><dt>Địa điểm</dt><dd>{selectedProject.location}</dd></div><div><dt>Trạng thái</dt><dd>{selectedProject.status}</dd></div><div><dt>Ngày bắt đầu</dt><dd>{selectedProject.startDate || "Chưa xác định"}</dd></div><div><dt>Ngày kết thúc</dt><dd>{selectedProject.finishDate || "Chưa xác định"}</dd></div><div><dt>Tổng giá trị</dt><dd>{formatCurrency(selectedProject.budget)} đ</dd></div><div><dt>Tiến độ tổng hợp</dt><dd>{selectedProject.progress}%</dd></div></dl>
              <div className="description-box"><span>Mô tả</span><p>{selectedProject.description || "Chưa có mô tả."}</p></div>
              <div className="scope-box"><div><span>Phạm vi hiển thị</span><strong>{selectedProject.visible ? "Đang bật" : "Đang tắt"}</strong></div><button className="switch" role="switch" aria-checked={selectedProject.visible} onClick={() => toggleVisibility(selectedProject.id)}><i /></button></div>
              <div className="activity-note"><span>◷</span><div><strong>Cập nhật gần nhất</strong><p>{selectedProject.updatedAt} · Dữ liệu được lưu trên trình duyệt này</p></div></div>
            </aside>}
          </section>
        </>}

        <footer className="statusbar"><span className="online-dot" /> Localhost đang hoạt động <span>·</span><span>{notice}</span><span className="grow" /><span>Chưa kết nối cơ sở dữ liệu thật</span></footer>
      </main>

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
