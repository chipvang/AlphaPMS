"use client";

import { useRef, useState } from "react";
import type { TaskGridColumnGroupVisibility } from "./taskGridTypes";

export type TaskGridSelection = { anchorRowId: string; anchorColumnId: string; focusRowId: string; focusColumnId: string };

/** Grid-local UI state only. Domain, schedule and Gantt state remain with their owners. */
export function useTaskGridController() {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [outlineLevel, setOutlineLevel] = useState(4);
  const [taskNameColumnWidth, setTaskNameColumnWidth] = useState(350);
  const [columnGroupVisibility, setColumnGroupVisibility] = useState<TaskGridColumnGroupVisibility>({ basic: true, progress: true, estimate: false, resource: false });
  const [taskGridSelection, setTaskGridSelection] = useState<TaskGridSelection | null>(null);
  const [taskGridCopyActive, setTaskGridCopyActive] = useState(false);
  const taskGridSelectingRef = useRef(false);
  const taskGridSelectionRef = useRef<TaskGridSelection | null>(null);
  const taskGridFillSourceRef = useRef<TaskGridSelection | null>(null);
  const taskGridFillModeRef = useRef(false);
  const taskGridHandleDragRef = useRef(false);
  const taskGridCtrlRef = useRef(false);
  const taskGridHeaderScrollRef = useRef<HTMLDivElement>(null);
  const taskGridBodyScrollRef = useRef<HTMLDivElement>(null);
  const taskGridBottomScrollRef = useRef<HTMLDivElement>(null);

  return {
    collapsedIds, setCollapsedIds, outlineLevel, setOutlineLevel,
    taskNameColumnWidth, setTaskNameColumnWidth, columnGroupVisibility, setColumnGroupVisibility,
    taskGridSelection, setTaskGridSelection, taskGridCopyActive, setTaskGridCopyActive,
    taskGridSelectingRef, taskGridSelectionRef, taskGridFillSourceRef, taskGridFillModeRef, taskGridHandleDragRef, taskGridCtrlRef,
    taskGridHeaderScrollRef, taskGridBodyScrollRef, taskGridBottomScrollRef,
  };
}
