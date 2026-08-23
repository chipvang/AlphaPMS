import assert from "node:assert/strict";
import test from "node:test";
import { createHistoryState, historyReducer } from "../lib/history/history.ts";
import { buildTreeInsertionSlots, moveTreeItemToSlot } from "../lib/schedule/treeReorder.ts";

const row = (id, type, parentId, projectId = "p1") => ({ id, type, parentId, projectId, sortOrder: 1 });
const initial = [
  row("p1", "project", null),
  row("wp-a", "workItem", "p1"),
  row("g-a1", "group", "wp-a"),
  row("t-a1", "task", "g-a1"),
  row("t-a2", "task", "g-a1"),
  row("g-a2", "group", "wp-a"),
  row("t-a3", "task", "g-a2"),
  row("t-direct", "task", "wp-a"),
  row("wp-b", "workItem", "p1"),
  row("g-b1", "group", "wp-b"),
  row("t-b1", "task", "g-b1"),
];
const visibleIds = initial.map((item) => item.id);
const byId = (items, id) => items.find((item) => item.id === id);
const ids = (items) => items.map((item) => item.id);
const slot = (draggedId, parentId, targetIndex) => {
  const result = buildTreeInsertionSlots(initial, visibleIds, draggedId).find((item) => item.targetParentId === parentId && item.targetIndex === targetIndex);
  assert.ok(result, `missing slot ${parentId}:${targetIndex} for ${draggedId}`);
  return result;
};

test("builds only valid insertion slots with first, middle and last positions", () => {
  const taskSlots = buildTreeInsertionSlots(initial, visibleIds, "t-a2");
  assert.ok(taskSlots.some((item) => item.targetParentId === "g-a2" && item.targetIndex === 0 && item.lineEdge === "before"));
  assert.ok(taskSlots.some((item) => item.targetParentId === "g-a1" && item.targetIndex === 1));
  assert.ok(taskSlots.some((item) => item.targetParentId === "g-a2" && item.targetIndex === 1 && item.lineEdge === "after"));
  assert.ok(taskSlots.some((item) => item.targetParentId === "wp-b"));
  assert.ok(taskSlots.every((item) => byId(initial, item.targetParentId).type === "workItem" || byId(initial, item.targetParentId).type === "group"));

  const groupSlots = buildTreeInsertionSlots(initial, visibleIds, "g-a1");
  assert.ok(groupSlots.every((item) => byId(initial, item.targetParentId).type === "workItem"));
  const packageSlots = buildTreeInsertionSlots(initial, visibleIds, "wp-a");
  assert.ok(packageSlots.length > 0 && packageSlots.every((item) => byId(initial, item.targetParentId).type === "project"));
});

test("reorders WorkPackage and carries its complete subtree", () => {
  const moved = moveTreeItemToSlot(initial, "wp-b", slot("wp-b", "p1", 0));
  assert.ok(moved);
  assert.deepEqual(ids(moved).slice(1, 5), ["wp-b", "g-b1", "t-b1", "wp-a"]);
  assert.equal(byId(moved, "g-b1").parentId, "wp-b");
});

test("reorders Group and moves its subtree to another WorkPackage", () => {
  const reordered = moveTreeItemToSlot(initial, "g-a2", slot("g-a2", "wp-a", 0));
  assert.ok(ids(reordered).indexOf("g-a2") < ids(reordered).indexOf("g-a1"));
  const moved = moveTreeItemToSlot(initial, "g-a1", slot("g-a1", "wp-b", 1));
  assert.equal(byId(moved, "g-a1").parentId, "wp-b");
  assert.equal(byId(moved, "t-a1").parentId, "g-a1");
  assert.equal(byId(moved, "t-a2").parentId, "g-a1");
});

test("moves Task between Group and WorkPackage at first, middle and last slots", () => {
  const reordered = moveTreeItemToSlot(initial, "t-a2", slot("t-a2", "g-a1", 0));
  assert.ok(ids(reordered).indexOf("t-a2") < ids(reordered).indexOf("t-a1"));
  const first = moveTreeItemToSlot(initial, "t-a2", slot("t-a2", "g-a2", 0));
  assert.equal(byId(first, "t-a2").parentId, "g-a2");
  assert.ok(ids(first).indexOf("t-a2") < ids(first).indexOf("t-a3"));
  const last = moveTreeItemToSlot(initial, "t-a2", slot("t-a2", "g-a2", 1));
  assert.ok(ids(last).indexOf("t-a2") > ids(last).indexOf("t-a3"));
  assert.equal(byId(moveTreeItemToSlot(initial, "t-a2", slot("t-a2", "wp-a", 3)), "t-a2").parentId, "wp-a");
  assert.equal(byId(moveTreeItemToSlot(initial, "t-direct", slot("t-direct", "g-a2", 1)), "t-direct").parentId, "g-a2");
  assert.equal(byId(moveTreeItemToSlot(initial, "t-a2", slot("t-a2", "wp-b", 1)), "t-a2").parentId, "wp-b");
});

test("rejects invalid hierarchy, descendants and cross-project targets", () => {
  assert.equal(moveTreeItemToSlot(initial, "g-a1", { targetParentId: "g-a2", targetIndex: 0 }), null);
  assert.equal(moveTreeItemToSlot(initial, "t-a1", { targetParentId: "t-a2", targetIndex: 0 }), null);
  assert.equal(moveTreeItemToSlot(initial, "wp-a", { targetParentId: "wp-b", targetIndex: 0 }), null);
  assert.equal(moveTreeItemToSlot(initial, "g-a1", { targetParentId: "t-a1", targetIndex: 0 }), null);
  const crossProject = [...initial, row("p2", "project", null, "p2"), row("wp-c", "workItem", "p2", "p2")];
  assert.equal(moveTreeItemToSlot(crossProject, "t-a1", { targetParentId: "wp-c", targetIndex: 0 }), null);
});

test("normalizes SortOrder for old and new parents without touching unrelated branches", () => {
  const moved = moveTreeItemToSlot(initial, "t-a2", slot("t-a2", "g-a2", 1));
  assert.deepEqual(moved.filter((item) => item.parentId === "g-a1").map((item) => item.sortOrder), [1]);
  assert.deepEqual(moved.filter((item) => item.parentId === "g-a2").map((item) => item.sortOrder), [1, 2]);
  assert.equal(byId(moved, "t-b1"), byId(initial, "t-b1"));
});

test("one slot drop is one shared Undo/Redo history action", () => {
  const moved = moveTreeItemToSlot(initial, "t-a2", slot("t-a2", "g-a2", 1));
  let history = createHistoryState(initial);
  history = historyReducer(history, { type: "commit", next: moved, options: { description: "Di chuyển Task A2" }, limit: 100, id: "move-1", createdAt: 1 });
  assert.equal(history.undoStack.length, 1);
  history = historyReducer(history, { type: "undo" });
  assert.equal(byId(history.present, "t-a2").parentId, "g-a1");
  history = historyReducer(history, { type: "redo" });
  assert.equal(byId(history.present, "t-a2").parentId, "g-a2");
});
