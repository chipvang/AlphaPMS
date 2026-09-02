"use client";

import { useRef } from "react";
import type { CSSProperties, ReactNode, UIEvent } from "react";

type ScheduleBoardProps = {
  style?: CSSProperties;
  taskGrid: ReactNode;
  ganttTimeline: ReactNode;
};

/** Layout group only: keeps the two independent vertical viewports row-aligned. */
export function ScheduleBoard({ style, taskGrid, ganttTimeline }: ScheduleBoardProps) {
  const syncingRef = useRef(false);
  const taskGridViewportRef = useRef<HTMLDivElement | null>(null);
  const ganttViewportRef = useRef<HTMLDivElement | null>(null);

  function syncVerticalScroll(source: HTMLDivElement, target: HTMLDivElement | null) {
    if (syncingRef.current || !target) return;
    syncingRef.current = true;
    target.scrollTop = source.scrollTop;
    globalThis.requestAnimationFrame(() => { syncingRef.current = false; });
  }

  function bindTaskGridViewport(element: HTMLDivElement | null) { taskGridViewportRef.current = element; }
  function bindGanttViewport(element: HTMLDivElement | null) { ganttViewportRef.current = element; }
  function onTaskGridVerticalScroll(event: UIEvent<HTMLDivElement>) { syncVerticalScroll(event.currentTarget, ganttViewportRef.current); }
  function onGanttVerticalScroll(event: UIEvent<HTMLDivElement>) { syncVerticalScroll(event.currentTarget, taskGridViewportRef.current); }

  return <div className="schedule-board-layout" style={style}>
    <div className="schedule-board-task-grid" ref={bindTaskGridViewport} onScroll={onTaskGridVerticalScroll}>{taskGrid}</div>
    <div className="vertical-block-splitter" aria-hidden="true" />
    <div className="schedule-board-gantt" ref={bindGanttViewport} onScroll={onGanttVerticalScroll}>{ganttTimeline}</div>
  </div>;
}
