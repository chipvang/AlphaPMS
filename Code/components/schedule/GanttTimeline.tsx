"use client";

import type { PointerEvent, RefObject, UIEvent } from "react";
import type { TaskDependency } from "../../lib/schedule/dependencies";
import type { ScheduleItem } from "./ScheduleView";

export type GanttTimelineData = {
  startDate: Date;
  width: number;
  columns: Date[];
  monthGroups: Array<{ key: string; label: string; count: number }>;
  weekGroups: Array<{ key: string; label: string; count: number }>;
  todayColumnIndex: number;
};

type GanttTimelineHeaderProps = { timeline: GanttTimelineData | null; dayStep: number; columnWidth: number; scrollRef: RefObject<HTMLDivElement | null>; formatDate: (date: Date) => string };
export function GanttTimelineHeader({ timeline, dayStep, columnWidth, scrollRef, formatDate }: GanttTimelineHeaderProps) {
  return <div className="gantt-header-pane"><div ref={scrollRef} className="gantt-header-scroll">{timeline ? <div className="gantt-calendar" style={{ width: timeline.width }}><div className="calendar-month">{timeline.monthGroups.map((group) => <span key={group.key} style={{ width: group.count * columnWidth }}>{group.label}</span>)}</div><div className="calendar-week">{timeline.weekGroups.map((group) => <span key={group.key} style={{ width: group.count * columnWidth }}>{group.label}</span>)}</div><div className="calendar-days">{timeline.columns.map((date, index) => <span key={date.toISOString()} className={index === timeline.todayColumnIndex ? "today" : ""} style={{ width: columnWidth }} title={`${formatDate(date)} · ${dayStep} ngày`}>{String(date.getDate()).padStart(2, "0")}</span>)}</div></div> : <div className="gantt-calendar gantt-calendar-empty">Chọn dự án để tạo lịch Gantt.</div>}</div></div>;
}

type GanttTimelineProps = {
  timeline: GanttTimelineData | null;
  items: ScheduleItem[];
  selectedItemId: string;
  dependencies: TaskDependency[];
  selectedDependencyId: string | null;
  onSelectItem: (id: string) => void;
  onSelectDependency: (id: string, doubleClick: boolean) => void;
  getDependencyGeometry: (taskId: string) => { left: number; width: number; y: number } | null;
  getRowBar: (item: ScheduleItem, rowIndex: number) => { left: number; width: number; hasBar: boolean; startDate: string; finishDate: string };
  columnWidth: number;
  dayStep: number;
  formatDate: (date: Date) => string;
  scrollRef: RefObject<HTMLDivElement | null>;
  headerScrollRef: RefObject<HTMLDivElement | null>;
  bottomScrollRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  dependencyDrag: { sourceTaskId: string; sourcePoint: { x: number; y: number }; pointerPosition: { x: number; y: number }; hasExceededThreshold: boolean } | null;
  onStartDependencyDrag: (event: PointerEvent<HTMLSpanElement>, item: ScheduleItem, left: number, width: number, rowIndex: number) => void;
  isValidDependencyTarget: (item: ScheduleItem) => boolean;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
};

export function GanttTimeline({ timeline, items, selectedItemId, dependencies, selectedDependencyId, onSelectItem, onSelectDependency, getDependencyGeometry, getRowBar, columnWidth, dayStep, formatDate, scrollRef, headerScrollRef, bottomScrollRef, contentRef, dependencyDrag, onStartDependencyDrag, isValidDependencyTarget, onScroll }: GanttTimelineProps) {
  return <section className="gantt-timeline-block">
    <GanttTimelineHeader timeline={timeline} dayStep={dayStep} columnWidth={columnWidth} scrollRef={headerScrollRef} formatDate={formatDate} />
    <div className="gantt-pane"><div ref={scrollRef} className="gantt-horizontal-scroll" onScroll={onScroll}>{timeline ? <div ref={contentRef} className="gantt-content" style={{ width: timeline.width }}><svg className="gantt-dependency-layer" width={timeline.width} height={items.length * 32} aria-label="Quan hệ công việc trên Gantt"><defs><marker id="dependency-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker></defs>{dependencies.map((dependency) => { const source = getDependencyGeometry(dependency.predecessorTaskId); const target = getDependencyGeometry(dependency.successorTaskId); if (!source || !target) return null; const sourceX = dependency.dependencyType === "SS" || dependency.dependencyType === "SF" ? source.left : source.left + source.width; const targetX = dependency.dependencyType === "FF" || dependency.dependencyType === "SF" ? target.left + target.width : target.left; const elbowX = sourceX <= targetX ? sourceX + 12 : Math.max(sourceX, targetX) + 12; const path = `M ${sourceX} ${source.y} H ${elbowX} V ${target.y} H ${targetX}`; return <g key={dependency.id} className={`dependency-connector ${dependency.id === selectedDependencyId ? "selected" : ""}`} onClick={(event) => { event.stopPropagation(); onSelectDependency(dependency.id, event.detail === 2); }} onDoubleClick={(event) => event.stopPropagation()}><path className="dependency-hit-path" d={path} /><path className="dependency-visible-path" d={path} markerEnd="url(#dependency-arrow)" /></g>; })}{dependencyDrag?.hasExceededThreshold && <path className="dependency-draft-path" d={`M ${dependencyDrag.sourcePoint.x} ${dependencyDrag.sourcePoint.y} H ${dependencyDrag.sourcePoint.x + 12} V ${dependencyDrag.pointerPosition.y} H ${dependencyDrag.pointerPosition.x}`} />}</svg><div className="gantt-rows">{items.map((item, rowIndex) => { const bar = getRowBar(item, rowIndex); return <div key={item.id} className={`gantt-row row-${item.type} ${item.id === selectedItemId ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => onSelectItem(item.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelectItem(item.id); }}>{timeline.todayColumnIndex >= 0 && <span className="today-column" style={{ left: timeline.todayColumnIndex * columnWidth, width: columnWidth }} />}{bar.hasBar && (item.type === "task" ? <span className={`gantt-bar task-bar ${dependencyDrag?.sourceTaskId === item.id && dependencyDrag.hasExceededThreshold ? "dependency-source-active" : ""} ${dependencyDrag?.hasExceededThreshold && isValidDependencyTarget(item) ? "dependency-target-valid" : ""}`} data-dependency-task data-task-id={item.id} style={{ left: bar.left, width: bar.width }} title={`${item.name}: ${item.startDate}–${item.finishDate} · ${item.progress}%`} onPointerDown={(event) => onStartDependencyDrag(event, item, bar.left, bar.width, rowIndex)}><i style={{ width: `${Math.max(0, Math.min(100, item.progress || 0))}%` }} /><b>{item.progress}%</b></span> : <span className={`summary-bar summary-${item.type}`} style={{ left: bar.left, width: bar.width }} title={`${item.name}: ${bar.startDate}–${bar.finishDate} · ${item.progress || 0}%`}><span className="summary-start-label">{bar.startDate.slice(0, 5)}</span><span className="summary-finish-label">{bar.finishDate.slice(0, 5)}</span><i className="summary-progress-line" style={{ width: `${Math.max(0, Math.min(100, item.progress || 0))}%` }} /></span>)}</div>; })}</div></div> : <div className="gantt-empty">Chọn dự án để tạo lịch Gantt.</div>}</div></div>
    <GanttTimelineScrollbar timelineWidth={timeline?.width ?? 0} scrollRef={bottomScrollRef} headerScrollRef={headerScrollRef} timelineScrollRef={scrollRef} />
  </section>;
}

export function GanttTimelineScrollbar({ timelineWidth, scrollRef, headerScrollRef, timelineScrollRef }: { timelineWidth: number; scrollRef: RefObject<HTMLDivElement | null>; headerScrollRef: RefObject<HTMLDivElement | null>; timelineScrollRef: RefObject<HTMLDivElement | null> }) {
  return <div ref={scrollRef} className="gantt-scrollbar-dock" onScroll={(event) => { const timeline = timelineScrollRef.current; if (timeline && Math.abs(timeline.scrollLeft - event.currentTarget.scrollLeft) > 1) timeline.scrollLeft = event.currentTarget.scrollLeft; const header = headerScrollRef.current; if (header && Math.abs(header.scrollLeft - event.currentTarget.scrollLeft) > 1) header.scrollLeft = event.currentTarget.scrollLeft; }}><div className="gantt-scrollbar-content" style={{ width: timelineWidth }} /></div>;
}

