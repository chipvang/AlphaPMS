"use client";

import { useCallback, useMemo, useReducer } from "react";
import { createHistoryState, historyReducer, HistoryOptions } from "./history";

export function useUndoRedo<T>(initialValue: T, limit = 100) {
  const [history, dispatch] = useReducer(historyReducer<T>, initialValue, createHistoryState);

  const commit = useCallback((next: T | ((current: T) => T), options: HistoryOptions) => {
    const nextValue = typeof next === "function" ? (next as (current: T) => T)(history.present) : next;
    if (Object.is(nextValue, history.present)) return;
    dispatch({
      type: "commit",
      next: nextValue,
      options,
      limit,
      createdAt: Date.now(),
      id: globalThis.crypto?.randomUUID?.() ?? `history-${Date.now()}`,
    });
  }, [history.present, limit]);

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback((next: T) => dispatch({ type: "reset", next }), []);

  return useMemo(() => ({
    value: history.present,
    commit,
    undo,
    redo,
    reset,
    canUndo: history.undoStack.length > 0,
    canRedo: history.redoStack.length > 0,
    undoDescription: history.undoStack.at(-1)?.description,
    redoDescription: history.redoStack[0]?.description,
    undoCount: history.undoStack.length,
    redoCount: history.redoStack.length,
  }), [commit, history, redo, reset, undo]);
}
