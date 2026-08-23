import assert from "node:assert/strict";
import test from "node:test";
import { createHistoryState, historyReducer } from "../lib/history/history.ts";
import { convertTaskToGroupWithFollowingTasks } from "../lib/schedule/taskConversion.ts";

const row = (id, type, parentId, sortOrder, projectId = "p1") => ({ id, type, parentId, sortOrder, projectId, name: id });
const initial = [
  row("p1", "project", null, 1),
  row("wp", "workItem", "p1", 1),
  row("t1", "task", "wp", 1),
  row("t2", "task", "wp", 2),
  row("t3", "task", "wp", 3),
  row("g1", "group", "wp", 4),
  row("g1-t1", "task", "g1", 1),
  row("t4", "task", "wp", 5),
  row("t5", "task", "wp", 6),
];
const convert = (item) => ({ ...item, type: "group" });
const byId = (items, id) => items.find((item) => item.id === id);

test("converts the first direct Task and adopts consecutive Tasks until the next Group", () => {
  const result = convertTaskToGroupWithFollowingTasks(initial, "t1", convert);
  assert.equal(byId(result, "t1").type, "group");
  assert.equal(byId(result, "t1").parentId, "wp");
  assert.equal(byId(result, "t2").parentId, "t1");
  assert.equal(byId(result, "t3").parentId, "t1");
  assert.equal(byId(result, "t2").sortOrder, 1);
  assert.equal(byId(result, "t3").sortOrder, 2);
  assert.equal(byId(result, "t4").parentId, "wp");
});

test("converts a middle Task and stops adoption at the next Group", () => {
  const result = convertTaskToGroupWithFollowingTasks(initial, "t2", convert);
  assert.equal(byId(result, "t2").type, "group");
  assert.equal(byId(result, "t3").parentId, "t2");
  assert.equal(byId(result, "t4").parentId, "wp");
  assert.deepEqual(result.filter((item) => item.parentId === "wp").map((item) => [item.id, item.sortOrder]), [
    ["t1", 1], ["t2", 2], ["g1", 3], ["t4", 4], ["t5", 5],
  ]);
});

test("converts the final Task to a valid empty Group", () => {
  const result = convertTaskToGroupWithFollowingTasks(initial, "t5", convert);
  assert.equal(byId(result, "t5").type, "group");
  assert.equal(result.some((item) => item.parentId === "t5"), false);
});

test("rejects converting a Task whose parent is already a Group", () => {
  assert.equal(convertTaskToGroupWithFollowingTasks(initial, "g1-t1", convert), null);
});

test("conversion, reparenting and dependency preservation are one history action", () => {
  const before = { items: initial, dependencies: [{ id: "d1", predecessorTaskId: "t4", successorTaskId: "t5" }] };
  let history = createHistoryState(before);
  const convertedItems = convertTaskToGroupWithFollowingTasks(before.items, "t2", convert);
  history = historyReducer(history, {
    type: "commit",
    next: { ...before, items: convertedItems },
    options: { description: "convert" },
    limit: 100,
    createdAt: 1,
    id: "conversion-1",
  });
  assert.equal(history.undoStack.length, 1);
  assert.equal(history.present.dependencies, before.dependencies);
  history = historyReducer(history, { type: "undo" });
  assert.deepEqual(history.present, before);
  history = historyReducer(history, { type: "redo" });
  assert.equal(byId(history.present.items, "t3").parentId, "t2");
});
