"use client";

import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { buildTreeInsertionSlots, moveTreeItemToSlot, type TreeInsertionSlot, type TreeReorderItem } from "../../lib/schedule/treeReorder";
import { recalculateTaskWbs } from "./taskTree";

export type WbsDragState = {
  sourceId: string;
  pointerId: number;
  startX: number;
  startY: number;
  isActive: boolean;
};

export type WbsSlotGeometry = TreeInsertionSlot & { x: number; y: number };

type WbsReorderItem = TreeReorderItem & { wbs: string; name: string };
type CommitItems<TItem> = (items: TItem[], options: { description: string; mergeKey?: string }) => void;

type UseTaskGridWbsReorderOptions<TItem extends WbsReorderItem> = {
  items: TItem[];
  visibleItems: TItem[];
  bodyScrollRef: RefObject<HTMLDivElement | null>;
  setSelectedItemId: (id: string) => void;
  commitItems: CommitItems<TItem>;
  onNotice: (message: string) => void;
};

/** Shared WBS drag setup and insertion-slot geometry for TaskGrid consumers. */
export function useTaskGridWbsReorder<TItem extends WbsReorderItem>({
  items,
  visibleItems,
  bodyScrollRef,
  setSelectedItemId,
  commitItems,
  onNotice,
}: UseTaskGridWbsReorderOptions<TItem>) {
  const [wbsDrag, setWbsDrag] = useState<WbsDragState | null>(null);
  const wbsDragRef = useRef<WbsDragState | null>(null);
  const wbsDropPreviewRef = useRef<TreeInsertionSlot | null>(null);
  const wbsSlotGeometriesRef = useRef<WbsSlotGeometry[]>([]);
  const wbsCaptureElementRef = useRef<HTMLDivElement | null>(null);
  const wbsInsertionLineRef = useRef<HTMLDivElement | null>(null);
  const suppressWbsClickRef = useRef(false);

  const startWbsDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>, item: TItem) => {
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
  }, [setSelectedItemId]);

  const refreshWbsSlotGeometries = useCallback((sourceId: string) => {
    const pane = bodyScrollRef.current;
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
      const nameCellRect = row.querySelector<HTMLElement>('[data-column-id="name"]')?.getBoundingClientRect();
      return [{ ...slot, y: slot.lineEdge === "before" ? rowRect.top : rowRect.bottom, x: (nameCellRect?.left ?? rowRect.left) + 10 + slot.depth * 18 }];
    });
    wbsSlotGeometriesRef.current = geometries;
    return geometries;
  }, [bodyScrollRef, items, visibleItems]);

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
      const paneRect = bodyScrollRef.current?.getBoundingClientRect();
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
      const paneRect = bodyScrollRef.current?.getBoundingClientRect();
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
          commitItems(recalculateTaskWbs(moved), { description: `Di chuyển ${source?.wbs ?? "dòng"} · ${source?.name ?? "WBS"}` });
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
  }, [bodyScrollRef, commitItems, items, onNotice, refreshWbsSlotGeometries, setSelectedItemId, wbsDrag]);

  return {
    wbsDrag,
    setWbsDrag,
    wbsDragRef,
    wbsDropPreviewRef,
    wbsSlotGeometriesRef,
    wbsCaptureElementRef,
    wbsInsertionLineRef,
    suppressWbsClickRef,
    startWbsDrag,
    refreshWbsSlotGeometries,
  };
}
