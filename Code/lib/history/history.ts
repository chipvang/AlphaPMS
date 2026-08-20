export type HistoryEntry<T> = {
  id: string;
  description: string;
  before: T;
  after: T;
  createdAt: number;
  mergeKey?: string;
};

export type HistoryState<T> = {
  present: T;
  undoStack: HistoryEntry<T>[];
  redoStack: HistoryEntry<T>[];
};

export type HistoryOptions = {
  description: string;
  mergeKey?: string;
};

export type HistoryAction<T> =
  | { type: "commit"; next: T; options: HistoryOptions; limit: number; createdAt: number; id: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; next: T };

export function createHistoryState<T>(initialValue: T): HistoryState<T> {
  return { present: initialValue, undoStack: [], redoStack: [] };
}

export function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  if (action.type === "reset") return createHistoryState(action.next);

  if (action.type === "undo") {
    const entry = state.undoStack.at(-1);
    if (!entry) return state;
    return {
      present: entry.before,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [entry, ...state.redoStack],
    };
  }

  if (action.type === "redo") {
    const entry = state.redoStack[0];
    if (!entry) return state;
    return {
      present: entry.after,
      undoStack: [...state.undoStack, entry],
      redoStack: state.redoStack.slice(1),
    };
  }

  const previousEntry = state.undoStack.at(-1);
  const canMerge = Boolean(
    action.options.mergeKey
      && previousEntry?.mergeKey === action.options.mergeKey
      && action.createdAt - previousEntry.createdAt <= 1_000,
  );
  const entry: HistoryEntry<T> = {
    id: action.id,
    description: action.options.description,
    before: canMerge && previousEntry ? previousEntry.before : state.present,
    after: action.next,
    createdAt: action.createdAt,
    mergeKey: action.options.mergeKey,
  };
  const baseStack = canMerge ? state.undoStack.slice(0, -1) : state.undoStack;
  return {
    present: action.next,
    undoStack: [...baseStack, entry].slice(-action.limit),
    redoStack: [],
  };
}
