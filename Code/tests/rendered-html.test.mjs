import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the AlphaPMS application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="vi">/i);
  assert.match(html, /<title>AlphaPMS - Quản lý dự án<\/title>/i);
  assert.match(html, /AlphaPMS/);
  assert.match(html, /Quản lý tiến độ/);
  assert.match(html, /Quản lý dự án/);
  assert.match(html, /Danh sách dự án/);
});

test("keeps the committed schedule interaction contract", async () => {
  const [page, css, layout, dependencies] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/schedule/dependencies.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const \[outlineLevel, setOutlineLevel\] = useState\(4\)/);
  assert.match(page, /aria-label="Chèn phía trên"/);
  assert.match(page, /aria-label="Chèn phía dưới"/);
  assert.match(page, /7 \* ganttDayStep/);
  assert.match(page, /summary-progress-line/);
  assert.match(page, /calculateScheduleOrder/);
  assert.match(page, /basic: true, progress: true, estimate: false, resource: false/);
  assert.match(page, /aria-label="Nhóm cột TaskGrid"/);
  assert.doesNotMatch(page, />Cơ bản<\/button>/);
  assert.match(page, />Tất cả<\/button>/);
  assert.match(page, /gridColumn: "span 5"[^\n]*>Tiến độ<\/div>/);
  assert.match(page, />Sản lượng\/ngày<\/div>/);
  assert.match(page, /const basicColumnWidths = \[50, 116, taskNameColumnWidth\]/);
  assert.match(page, /const scheduleColumnWidths = \[60, 70, 70, 50, 96\]/);
  assert.match(page, /const estimateColumnWidths = \[60, 86, 100\]/);
  assert.match(page, /const resourceColumnWidths = \[50, 50, 60, 60\]/);
  assert.match(page, /<div>HSM<\/div><div>SLM<\/div><div>NCLM<\/div><div>NCCH<\/div>/);
  assert.match(css, /grid-template-columns:\s*var\(--schedule-grid-template/);
  assert.match(css, /\.summary-bar/);
  assert.match(css, /--summary-height:\s*14px/);
  assert.match(css, /--ui-min-font-size:\s*10px/);
  assert.match(page, /taskDetailMode/);
  assert.match(page, /ganttBottomScrollRef/);
  assert.match(page, /ganttHeaderScrollRef/);
  assert.doesNotMatch(page, /pickerOpen|picker-list|project-picker/);
  assert.match(page, />Trước<\/div>/);
  assert.match(page, /dependency-editor/);
  assert.match(page, /gantt-dependency-layer/);
  assert.doesNotMatch(page, /dependency-start-anchor/);
  assert.doesNotMatch(page, /dependency-finish-anchor/);
  assert.match(page, /data-dependency-task/);
  assert.match(dependencies, /propagateDependencySchedule/);
  assert.match(css, /--gantt-task-default:\s*#4f81bd/);
  assert.match(dependencies, /predecessorTaskId/);
  assert.match(dependencies, /successorTaskId/);
  assert.match(dependencies, /createsDependencyCycle/);
  assert.match(dependencies, /predecessor\.projectId !== successor\.projectId/);
  assert.match(css, /\.gantt-scrollbar-dock/);
  assert.match(css, /grid-template-rows:\s*30px 74px minmax\(0, 1fr\) 17px/);
  assert.match(css, /\.schedule-board-body/);
  assert.match(css, /\.summary-workItem/);
  assert.match(css, /\.summary-group/);
  assert.match(css, /height:\s*35px/);
  assert.match(layout, /lang="vi"/);
});

test("auto-schedules FS, SS, FF and SF dependencies through a DAG", async () => {
  const { calculateDependencyConstraint, calculateFsRequiredStart, propagateDependencySchedule } = await import(new URL("../lib/schedule/dependencies.ts", import.meta.url).href);
  const task = (id, startDate, finishDate, duration = 5) => ({ id, projectId: "p1", type: "task", startDate, finishDate, duration });
  const a = task("a", "01/08/26", "10/08/26", 10);
  const b = task("b", "20/08/26", "24/08/26");
  const c = task("c", "01/09/26", "05/09/26");
  const finish = new Date("2026-08-07T00:00:00.000Z");
  assert.equal(calculateFsRequiredStart(finish, 0).toISOString().slice(0, 10), "2026-08-08");
  assert.equal(calculateFsRequiredStart(finish, 1).toISOString().slice(0, 10), "2026-08-09");
  assert.equal(calculateFsRequiredStart(finish, -1).toISOString().slice(0, 10), "2026-08-06");
  assert.equal(calculateDependencyConstraint(a, 5, "FS", 0).toISOString().slice(0, 10), "2026-08-11");
  assert.equal(calculateDependencyConstraint(a, 5, "SS", 2).toISOString().slice(0, 10), "2026-08-03");
  assert.equal(calculateDependencyConstraint(a, 5, "FF", 0).toISOString().slice(0, 10), "2026-08-06");
  assert.equal(calculateDependencyConstraint(a, 5, "SF", 0).toISOString().slice(0, 10), "2026-07-28");
  const dependencies = [
    { id: "ab", projectId: "p1", predecessorTaskId: "a", successorTaskId: "b", dependencyType: "FS", lag: 0 },
    { id: "bc", projectId: "p1", predecessorTaskId: "b", successorTaskId: "c", dependencyType: "FS", lag: 2 },
  ];
  const result = propagateDependencySchedule([a, b, c], dependencies, ["a"]);
  assert.deepEqual(result.map(({ startDate, finishDate }) => [startDate, finishDate]), [
    ["01/08/26", "10/08/26"], ["11/08/26", "15/08/26"], ["18/08/26", "22/08/26"],
  ]);

  const late = task("late", "01/08/26", "20/08/26", 20);
  const multi = propagateDependencySchedule([a, late, b], [
    { id: "ab", projectId: "p1", predecessorTaskId: "a", successorTaskId: "b", dependencyType: "FS", lag: 0 },
    { id: "late-b", projectId: "p1", predecessorTaskId: "late", successorTaskId: "b", dependencyType: "FS", lag: -1 },
  ], ["a", "late"]);
  assert.equal(multi.find((item) => item.id === "b").startDate, "19/08/26");
});

test("validates task dependencies by stable task ids", async () => {
  const { formatDependencyLabel, validateTaskDependency } = await import(new URL("../lib/schedule/dependencies.ts", import.meta.url).href);
  const tasks = [
    { id: "a", projectId: "p1", type: "task" },
    { id: "b", projectId: "p1", type: "task" },
    { id: "c", projectId: "p1", type: "task" },
    { id: "x", projectId: "p2", type: "task" },
    { id: "summary", projectId: "p1", type: "group" },
  ];
  const ab = { id: "ab", projectId: "p1", predecessorTaskId: "a", successorTaskId: "b", dependencyType: "FS", lag: 0 };
  const bc = { id: "bc", projectId: "p1", predecessorTaskId: "b", successorTaskId: "c", dependencyType: "SS", lag: 2 };
  assert.equal(validateTaskDependency(ab, [], tasks).isValid, true);
  assert.equal(validateTaskDependency({ ...ab, id: "self", successorTaskId: "a" }, [], tasks).isValid, false);
  assert.equal(validateTaskDependency({ ...ab, id: "cross", successorTaskId: "x" }, [], tasks).isValid, false);
  assert.equal(validateTaskDependency({ ...ab, id: "summary", successorTaskId: "summary" }, [], tasks).isValid, false);
  assert.equal(validateTaskDependency({ ...ab, id: "duplicate" }, [ab], tasks).isValid, false);
  assert.equal(validateTaskDependency({ id: "cycle", projectId: "p1", predecessorTaskId: "c", successorTaskId: "a", dependencyType: "FS", lag: 0 }, [ab, bc], tasks).isValid, false);
  assert.equal(formatDependencyLabel(bc, new Map([["b", "4"]])), "4SS+2");
  assert.equal(formatDependencyLabel({ ...ab, lag: -1 }, new Map([["a", "1"]])), "1FS-1");
});
