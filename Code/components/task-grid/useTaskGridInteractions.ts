"use client";

import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo } from "react";
import type { RefObject } from "react";
import type { TaskGridColumn } from "./taskGridTypes";
import { useTaskGridController } from "./useTaskGridController";

type TaskGridItem = { id: string; type?: string };

type CommitItems<TItem> = (items: TItem[], options: { description: string; mergeKey?: string }) => void;
type TaskGridScrollSource = "header" | "body" | "dock";
const minimumTaskNameColumnWidth = 350;
const maximumTaskNameColumnWidth = 700;

type UseTaskGridInteractionsOptions<TItem extends TaskGridItem> = {
  visibleItems: TItem[];
  allItems: TItem[];
  visibleColumns: TaskGridColumn<TItem>[];
  taskGridController: ReturnType<typeof useTaskGridController>;
  bodyScrollRef: RefObject<HTMLDivElement | null>;
  commitItems: CommitItems<TItem>;
  onNotice: (message: string) => void;
};

/** Shared pointer selection for the visible TaskGrid surface. */
export function useTaskGridInteractions<TItem extends TaskGridItem>({
  visibleItems,
  allItems,
  visibleColumns,
  taskGridController,
  bodyScrollRef,
  commitItems,
  onNotice,
}: UseTaskGridInteractionsOptions<TItem>) {
  const {
    taskGridSelection,
    setTaskGridSelection,
    taskGridCopyActive,
    setTaskGridCopyActive,
    taskGridSelectingRef,
    taskGridSelectionRef,
    taskGridFillSourceRef,
    taskGridFillModeRef,
    taskGridHandleDragRef,
    taskGridCtrlRef,
    taskGridHeaderScrollRef,
    taskGridBodyScrollRef,
    taskGridBottomScrollRef,
    taskNameColumnWidth,
    setTaskNameColumnWidth,
  } = taskGridController;
  const visibleItemIds = useMemo(() => new Set(visibleItems.map((item) => item.id)), [visibleItems]);
  const visibleRowIndexById = useMemo(() => new Map(visibleItems.map((item, index) => [item.id, index])), [visibleItems]);

  const syncTaskGridHorizontalScroll = useCallback((scrollLeft: number, source: TaskGridScrollSource) => {
    const targets = [
      source === "header" ? null : taskGridHeaderScrollRef.current,
      source === "body" ? null : taskGridBodyScrollRef.current,
      source === "dock" ? null : taskGridBottomScrollRef.current,
    ];
    targets.forEach((target) => {
      if (target && Math.abs(target.scrollLeft - scrollLeft) > 1) target.scrollLeft = scrollLeft;
    });
  }, [taskGridBodyScrollRef, taskGridBottomScrollRef, taskGridHeaderScrollRef]);

  const startTaskNameColumnResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
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
  }, [setTaskNameColumnWidth, taskNameColumnWidth]);

  const getTaskGridCellFromPoint = useCallback((clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const cell = target?.closest<HTMLElement>(".schedule-row > div");
    const row = cell?.parentElement;
    if (!cell || !row || cell.classList.contains("wbs-cell") || target?.closest("button, input, select, textarea")) return null;
    const rowId = row.dataset.wbsRowId;
    const columnId = cell.dataset.columnId;
    return rowId && columnId && visibleItemIds.has(rowId) ? { rowId, columnId } : null;
  }, [visibleItemIds]);

  const startTaskGridSelection = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const cell = getTaskGridCellFromPoint(event.clientX, event.clientY);
    if (!cell) return;
    event.preventDefault();
    event.currentTarget.focus();
    const selectedRowId = taskGridSelection?.focusRowId;
    const selectedColumnId = taskGridSelection?.focusColumnId;
    const targetElement = event.target as HTMLElement;
    const targetRect = targetElement.closest<HTMLElement>(".schedule-row > div")?.getBoundingClientRect();
    if (taskGridSelection && cell.rowId === selectedRowId && cell.columnId === selectedColumnId && targetRect && event.clientX >= targetRect.right - 8 && event.clientY >= targetRect.bottom - 8) {
      taskGridFillModeRef.current = event.ctrlKey;
      taskGridFillSourceRef.current = taskGridSelection;
      taskGridHandleDragRef.current = true;
      taskGridSelectingRef.current = true;
      return;
    }
    taskGridSelectingRef.current = true;
    setTaskGridCopyActive(false);
    taskGridHandleDragRef.current = false;
    taskGridFillModeRef.current = false;
    taskGridFillSourceRef.current = null;
    const selection = { anchorRowId: cell.rowId, anchorColumnId: cell.columnId, focusRowId: cell.rowId, focusColumnId: cell.columnId };
    taskGridSelectionRef.current = selection;
    setTaskGridSelection(selection);
  }, [getTaskGridCellFromPoint, setTaskGridCopyActive, setTaskGridSelection, taskGridFillModeRef, taskGridFillSourceRef, taskGridHandleDragRef, taskGridSelectingRef, taskGridSelection, taskGridSelectionRef]);

  useEffect(() => {
    function updateTaskGridSelection(event: globalThis.PointerEvent) {
      if (!taskGridSelectingRef.current) return;
      if (taskGridHandleDragRef.current && (event.ctrlKey || taskGridCtrlRef.current)) taskGridFillModeRef.current = true;
      const cell = getTaskGridCellFromPoint(event.clientX, event.clientY);
      if (cell) setTaskGridSelection((current) => {
        if (!current) return current;
        const next = { ...current, focusRowId: cell.rowId, focusColumnId: cell.columnId };
        taskGridSelectionRef.current = next;
        return next;
      });
    }
    document.addEventListener("pointermove", updateTaskGridSelection);
    return () => document.removeEventListener("pointermove", updateTaskGridSelection);
  }, [getTaskGridCellFromPoint, setTaskGridSelection, taskGridCtrlRef, taskGridFillModeRef, taskGridHandleDragRef, taskGridSelectingRef, taskGridSelectionRef]);

  useEffect(() => {
    const anchorRowIndex = taskGridSelection ? visibleRowIndexById.get(taskGridSelection.anchorRowId) ?? -1 : -1;
    const focusRowIndex = taskGridSelection ? visibleRowIndexById.get(taskGridSelection.focusRowId) ?? -1 : -1;
    const rowStart = Math.min(anchorRowIndex, focusRowIndex);
    const rowEnd = Math.max(anchorRowIndex, focusRowIndex);
    const anchorColumnIndex = taskGridSelection ? visibleColumns.findIndex((column) => column.id === taskGridSelection.anchorColumnId) : -1;
    const focusColumnIndex = taskGridSelection ? visibleColumns.findIndex((column) => column.id === taskGridSelection.focusColumnId) : -1;
    const columnStart = Math.min(anchorColumnIndex, focusColumnIndex);
    const columnEnd = Math.max(anchorColumnIndex, focusColumnIndex);
    const body = bodyScrollRef.current;
    if (!body) return;
    body.querySelectorAll<HTMLElement>(".schedule-row").forEach((row) => {
      const rowIndex = visibleRowIndexById.get(row.dataset.wbsRowId ?? "") ?? -1;
      Array.from(row.children).forEach((cell) => {
        const columnIndex = visibleColumns.findIndex((column) => column.id === (cell as HTMLElement).dataset.columnId);
        const selected = rowIndex >= rowStart && rowIndex <= rowEnd && columnIndex >= columnStart && columnIndex <= columnEnd;
        cell.classList.toggle("task-grid-cell-selected", selected);
        cell.classList.toggle("task-grid-cell-selection-top", selected && rowIndex === rowStart);
        cell.classList.toggle("task-grid-cell-selection-bottom", selected && rowIndex === rowEnd);
        cell.classList.toggle("task-grid-cell-selection-left", selected && columnIndex === columnStart);
        cell.classList.toggle("task-grid-cell-selection-right", selected && columnIndex === columnEnd);
        cell.classList.toggle("task-grid-cell-copying", selected && taskGridCopyActive);
      });
    });
  }, [bodyScrollRef, taskGridCopyActive, taskGridSelection, visibleColumns, visibleRowIndexById]);

  useEffect(() => {
    function copyTaskGridSelection(event: ClipboardEvent) {
      if (!taskGridSelection) return;
      const anchorRowIndex = visibleRowIndexById.get(taskGridSelection.anchorRowId);
      const focusRowIndex = visibleRowIndexById.get(taskGridSelection.focusRowId);
      if (anchorRowIndex == null || focusRowIndex == null) return;
      const rowStart = Math.min(anchorRowIndex, focusRowIndex);
      const rowEnd = Math.max(anchorRowIndex, focusRowIndex);
      const anchorColumnIndex = visibleColumns.findIndex((column) => column.id === taskGridSelection.anchorColumnId);
      const focusColumnIndex = visibleColumns.findIndex((column) => column.id === taskGridSelection.focusColumnId);
      const copyColumns = visibleColumns.slice(Math.min(anchorColumnIndex, focusColumnIndex), Math.max(anchorColumnIndex, focusColumnIndex) + 1).filter((column) => column.copyable && column.getCopyValue);
      if (!copyColumns.length) return;
      const lines = visibleItems
        .slice(rowStart, rowEnd + 1)
        .map((item) => copyColumns.map((column) => (column.getCopyValue?.(item) ?? "").replace(/\s+/g, " ").trim()).join("\t"));
      if (!lines.length) return;
      event.preventDefault();
      const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
      const html = `<table>${lines.map((line) => `<tr>${line.split("\t").map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</table>`;
      event.clipboardData?.setData("text/plain", lines.join("\n"));
      event.clipboardData?.setData("text/html", html);
      setTaskGridCopyActive(true);
    }
    document.addEventListener("copy", copyTaskGridSelection);
    return () => document.removeEventListener("copy", copyTaskGridSelection);
  }, [setTaskGridCopyActive, taskGridSelection, visibleColumns, visibleItems, visibleRowIndexById]);

  useEffect(() => {
    function pasteTaskGridData(event: ClipboardEvent) {
      if (!taskGridSelection) return;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      const matrix = text.replace(/\r/g, "").split("\n").filter((line) => line.length > 0).map((line) => line.split("\t"));
      const startRow = visibleRowIndexById.get(taskGridSelection.anchorRowId);
      if (startRow == null) return;
      const startColumn = visibleColumns.findIndex((column) => column.id === taskGridSelection.anchorColumnId);
      const targetColumns = visibleColumns
        .slice(startColumn)
        .filter((column) => column.copyable && column.applyPasteValue);
      if (!targetColumns.length) return;
      let changed = 0;
      const pastedChanges = new Map<string, Partial<TItem>>();
      matrix.forEach((row, sourceRow) => {
        const item = visibleItems[startRow + sourceRow];
        if (!item || item.type !== "task") return;
        const changes = row.reduce((result, value, sourceColumn) => {
          const column = targetColumns[sourceColumn];
          return column ? { ...result, ...column.applyPasteValue?.(value.trim(), { row: item }) } : result;
        }, {} as Partial<TItem>);
        if (Object.keys(changes).length) pastedChanges.set(item.id, changes);
      });
      const nextItems = allItems.map((item) => {
        const changes = pastedChanges.get(item.id);
        if (!changes) return item;
        changed += 1;
        return { ...item, ...changes };
      });
      if (!changed) return;
      event.preventDefault();
      commitItems(nextItems, { description: `Dán ${changed} dòng dữ liệu từ Excel`, mergeKey: "paste-task-grid" });
      onNotice(`Đã dán dữ liệu từ Excel vào ${changed} công tác`);
    }
    document.addEventListener("paste", pasteTaskGridData);
    return () => document.removeEventListener("paste", pasteTaskGridData);
  }, [allItems, commitItems, onNotice, taskGridSelection, visibleColumns, visibleItems, visibleRowIndexById]);

  const finishTaskGridSelection = useCallback((event: globalThis.PointerEvent) => {
    if (event.ctrlKey || taskGridCtrlRef.current) taskGridFillModeRef.current = true;
    try {
      if (!taskGridSelectingRef.current || !taskGridFillModeRef.current || !taskGridFillSourceRef.current || !taskGridSelectionRef.current) return;
      const source = taskGridFillSourceRef.current;
      const target = taskGridSelectionRef.current;
      const sourceAnchorRowIndex = visibleRowIndexById.get(source.anchorRowId);
      const sourceFocusRowIndex = visibleRowIndexById.get(source.focusRowId);
      const targetAnchorRowIndex = visibleRowIndexById.get(target.anchorRowId);
      const targetFocusRowIndex = visibleRowIndexById.get(target.focusRowId);
      if (sourceAnchorRowIndex == null || sourceFocusRowIndex == null || targetAnchorRowIndex == null || targetFocusRowIndex == null) return;
      const sourceRowStart = Math.min(sourceAnchorRowIndex, sourceFocusRowIndex);
      const sourceRowEnd = Math.max(sourceAnchorRowIndex, sourceFocusRowIndex);
      const sourceAnchorColumnIndex = visibleColumns.findIndex((column) => column.id === source.anchorColumnId);
      const sourceFocusColumnIndex = visibleColumns.findIndex((column) => column.id === source.focusColumnId);
      const targetAnchorColumnIndex = visibleColumns.findIndex((column) => column.id === target.anchorColumnId);
      const targetFocusColumnIndex = visibleColumns.findIndex((column) => column.id === target.focusColumnId);
      if (sourceAnchorColumnIndex < 0 || sourceFocusColumnIndex < 0 || targetAnchorColumnIndex < 0 || targetFocusColumnIndex < 0) return;
      const sourceColumnStart = Math.min(sourceAnchorColumnIndex, sourceFocusColumnIndex);
      const sourceColumnEnd = Math.max(sourceAnchorColumnIndex, sourceFocusColumnIndex);
      const targetRowStart = Math.min(targetAnchorRowIndex, targetFocusRowIndex);
      const targetRowEnd = Math.max(targetAnchorRowIndex, targetFocusRowIndex);
      const targetColumnStart = Math.min(targetAnchorColumnIndex, targetFocusColumnIndex);
      const targetColumnEnd = Math.max(targetAnchorColumnIndex, targetFocusColumnIndex);
      const filledChanges = new Map<string, Partial<TItem>>();
      for (let targetRow = targetRowStart; targetRow <= targetRowEnd; targetRow += 1) {
        const item = visibleItems[targetRow];
        if (!item || item.type !== "task") continue;
        const sourceRow = sourceRowStart + ((targetRow - sourceRowStart) % Math.max(1, sourceRowEnd - sourceRowStart + 1));
        const sourceItem = visibleItems[sourceRow];
        if (!sourceItem || sourceItem.type !== "task") continue;
        let changes: Partial<TItem> = {};
        for (let targetColumnIndex = targetColumnStart; targetColumnIndex <= targetColumnEnd; targetColumnIndex += 1) {
          const targetColumn = visibleColumns[targetColumnIndex];
          const sourceColumnIndex = sourceColumnStart + ((targetColumnIndex - sourceColumnStart) % Math.max(1, sourceColumnEnd - sourceColumnStart + 1));
          const sourceColumn = visibleColumns[sourceColumnIndex];
          if (!targetColumn?.applyPasteValue || !sourceColumn?.getCopyValue) continue;
          changes = { ...changes, ...targetColumn.applyPasteValue(sourceColumn.getCopyValue(sourceItem), { row: item }) };
        }
        if (Object.keys(changes).length) filledChanges.set(item.id, changes);
      }
      const nextItems = allItems.map((item) => {
        const changes = filledChanges.get(item.id);
        return changes ? { ...item, ...changes } : item;
      });
      if (nextItems.some((item, index) => item !== allItems[index])) {
        commitItems(nextItems, { description: "Sao chép vùng dữ liệu trong TaskGrid", mergeKey: "fill-task-grid" });
      }
    } finally {
      taskGridSelectingRef.current = false;
      taskGridFillModeRef.current = false;
      taskGridFillSourceRef.current = null;
      taskGridHandleDragRef.current = false;
    }
  }, [allItems, commitItems, taskGridCtrlRef, taskGridFillModeRef, taskGridFillSourceRef, taskGridHandleDragRef, taskGridSelectingRef, taskGridSelectionRef, visibleColumns, visibleItems, visibleRowIndexById]);

  useEffect(() => {
    document.addEventListener("pointerup", finishTaskGridSelection);
    document.addEventListener("pointercancel", finishTaskGridSelection);
    return () => {
      document.removeEventListener("pointerup", finishTaskGridSelection);
      document.removeEventListener("pointercancel", finishTaskGridSelection);
    };
  }, [finishTaskGridSelection]);

  return { startTaskGridSelection, finishTaskGridSelection, syncTaskGridHorizontalScroll, startTaskNameColumnResize };
}
