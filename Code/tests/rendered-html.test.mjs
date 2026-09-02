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
  const [schedule, ganttTimeline, taskGridController, taskGridInteractions, taskGridWbsReorder, taskGridCore, taskGridRow, taskGridColumns, css, layout, dependencies] = await Promise.all([
    readFile(new URL("../components/schedule/ScheduleView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/schedule/GanttTimeline.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/task-grid/useTaskGridController.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/task-grid/useTaskGridInteractions.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/task-grid/useTaskGridWbsReorder.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/task-grid/TaskGrid.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/task-grid/TaskGridRow.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/task-grid/taskGridColumns.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/schedule/dependencies.ts", import.meta.url), "utf8"),
  ]);

  const scheduleContract = `${schedule}${ganttTimeline}${taskGridController}${taskGridInteractions}${taskGridWbsReorder}${taskGridCore}${taskGridRow}${taskGridColumns}`;

  assert.match(scheduleContract, /const \[outlineLevel, setOutlineLevel\] = useState\(4\)/);
  assert.match(scheduleContract, /aria-label="Chèn lên trên"/);
  assert.match(scheduleContract, /aria-label="Chèn xuống dưới"/);
  assert.match(scheduleContract, /aria-label="Thêm hạng mục"/);
  assert.match(scheduleContract, /aria-label="Thêm công tác"/);
  assert.doesNotMatch(scheduleContract, /aria-label="Đẩy vào"|aria-label="Đẩy ra"|action-slot-indent|action-slot-outdent/);
  assert.match(scheduleContract, /aria-label="Xóa"/);
  assert.match(scheduleContract, /item\.type === "project"[\s\S]*\? <button className="action-slot-add" aria-label="Thêm hạng mục"/);
  assert.match(scheduleContract, /item\.type === "workItem" \|\| item\.type === "group"/);
  assert.match(css, /\.row-actions \{[\s\S]*gap:\s*1px/);
  assert.match(css, /\.row-actions button \{[\s\S]*width:\s*16px;[\s\S]*height:\s*16px/);
  assert.match(css, /\.action-trash-icon \{[\s\S]*width:\s*12px;[\s\S]*height:\s*12px/);
  assert.match(css, /grid-template-columns:\s*repeat\(4, 16px\)/);
  assert.match(css, /column-gap:\s*1px/);
  assert.match(css, /\.row-actions \{[\s\S]*justify-content:\s*center/);
  assert.match(css, /\.action-slot-add \{ grid-column: 1; \}/);
  assert.match(css, /\.action-slot-delete \{ grid-column: 4; \}/);
  assert.doesNotMatch(css, /action-arrow-icon/);
  assert.doesNotMatch(scheduleContract, /wbs-drag-handle/);
  assert.match(scheduleContract, /aria-label=\{item\.type === "project" \? undefined : "Kéo để sắp xếp"\}/);
  assert.match(scheduleContract, /data-wbs-row-id=\{item\.id\}/);
  assert.match(scheduleContract, /className=\{`wbs-cell \$\{item\.type === "project" \? "" : "wbs-drag-cell"\}`\}/);
  assert.match(scheduleContract, /setPointerCapture\(event\.pointerId\)/);
  assert.match(scheduleContract, /Math\.hypot\([\s\S]*>= 4/);
  assert.match(scheduleContract, /buildTreeInsertionSlots\(items, visibleItems\.map/);
  assert.match(scheduleContract, /moveTreeItemToSlot\(items, currentDrag\.sourceId, preview\)/);
  assert.match(scheduleContract, /commitItems\(recalculateTaskWbs\(moved\)/);
  assert.match(css, /\.wbs-cell\.wbs-drag-cell \{[\s\S]*cursor:\s*grab/);
  assert.match(scheduleContract, /ref=\{insertionLineRef\} className="wbs-insertion-line"/);
  assert.match(css, /\.wbs-insertion-line \{[\s\S]*position:\s*fixed;[\s\S]*height:\s*2px/);
  assert.doesNotMatch(css, /wbs-drop-inside|wbs-drag-handle|wbs-insertion-before|wbs-insertion-after/);
  assert.match(scheduleContract, /Xem \/ sửa thông tin công tác[\s\S]*Chuyển công tác thành Nhóm[\s\S]*task-context-separator[\s\S]*Xóa công tác/);
  assert.match(scheduleContract, /parent\?\.type !== "workItem"/);
  assert.match(scheduleContract, /dependency\.predecessorTaskId === task\.id \|\| dependency\.successorTaskId === task\.id/);
  assert.match(scheduleContract, /useCommonDialog/);
  assert.match(scheduleContract, /commonDialog\.confirm/);
  assert.doesNotMatch(scheduleContract, /globalThis\.confirm|window\.confirm/);
  assert.match(taskGridInteractions, /const minimumTaskNameColumnWidth = 350/);
  assert.match(scheduleContract, /createTaskGridColumns<TaskItem>\(\{/);
  assert.match(scheduleContract, /createBasicColumns/);
  assert.match(scheduleContract, /createScheduleColumns/);
  assert.match(css, /\.duration-cell input \{[\s\S]*width:\s*50px/);
  assert.match(scheduleContract, /quan hệ công việc liên quan/);
  assert.match(scheduleContract, /current\.dependencies\.filter/);
  assert.match(scheduleContract, /description: `Chuyển \$\{task\.wbs\} · \$\{task\.name\} thành Nhóm`/);
  assert.match(css, /\.task-context-menu \{/);
  assert.match(scheduleContract, /7 \* ganttDayStep/);
  assert.match(scheduleContract, /summary-progress-line/);
  assert.match(schedule, /calculateTaskOrder/);
  assert.doesNotMatch(schedule, /function calculateScheduleOrder/);
  assert.match(scheduleContract, /basic: true, progress: true, estimate: false, resource: false/);
  assert.match(scheduleContract, /aria-label="Nhóm cột TaskGrid"/);
  assert.doesNotMatch(scheduleContract, />Cơ bản<\/button>/);
  assert.match(scheduleContract, />Tất cả<\/button>/);
  assert.match(scheduleContract, /getTaskGridColumnGroupSpan/);
  assert.match(scheduleContract, /Thời lượng/);
  assert.match(scheduleContract, /estimateColumns/);
  assert.match(scheduleContract, /resourceColumns/);
  assert.match(scheduleContract, /visibleTaskGridColumns/);
  assert.match(css, /grid-template-columns:\s*var\(--schedule-grid-template/);
  assert.match(css, /\.summary-bar/);
  assert.match(css, /--summary-height:\s*14px/);
  assert.match(css, /--ui-min-font-size:\s*10px/);
  assert.match(scheduleContract, /taskDetailMode/);
  assert.match(scheduleContract, /ganttBottomScrollRef/);
  assert.match(scheduleContract, /ganttHeaderScrollRef/);
  assert.doesNotMatch(scheduleContract, /pickerOpen|picker-list|project-picker/);
  assert.match(scheduleContract, /dependency-editor/);
  assert.match(scheduleContract, /gantt-dependency-layer/);
  assert.doesNotMatch(scheduleContract, /dependency-start-anchor/);
  assert.doesNotMatch(scheduleContract, /dependency-finish-anchor/);
  assert.match(scheduleContract, /data-dependency-task/);
  assert.match(dependencies, /propagateDependencySchedule/);
  assert.match(css, /--gantt-task-default:\s*#4f81bd/);
  assert.match(dependencies, /predecessorTaskId/);
  assert.match(dependencies, /successorTaskId/);
  assert.match(dependencies, /createsDependencyCycle/);
  assert.match(dependencies, /predecessor\.projectId !== successor\.projectId/);
  assert.match(css, /\.gantt-scrollbar-dock/);
  assert.match(css, /grid-template-rows:\s*30px 74px minmax\(0, 1fr\)/);
  assert.match(css, /\.schedule-board-body/);
  assert.match(css, /\.summary-workItem/);
  assert.match(css, /\.summary-group/);
assert.match(css, /height:\s*32px/);
  assert.match(layout, /lang="vi"/);
});

test("uses the ASP.NET Core API for Project, WBS and dependency production data", async () => {
  const [page, schedule, requestApi, dbContext, dependencyService, scheduleService] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/schedule/ScheduleView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/api/requestApi.ts", import.meta.url), "utf8"),
    readFile(new URL("../Backend/src/AlphaPMS.Infrastructure/Persistence/AlphaPmsDbContext.cs", import.meta.url), "utf8"),
    readFile(new URL("../Backend/src/AlphaPMS.Application/Projects/DependencyService.cs", import.meta.url), "utf8"),
    readFile(new URL("../Backend/src/AlphaPMS.Application/Projects/ProjectScheduleService.cs", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(`${page}${schedule}`, /localStorage/);
  assert.doesNotMatch(`${page}${schedule}`, /initialProjects|initialScheduleItems/);
  assert.match(page, /requestApi<Project\[\]>\("\/api\/projects"\)/);
  assert.match(schedule, /\/api\/projects\/\$\{project\.id\}\/schedule/);
  assert.match(requestApi, /NEXT_PUBLIC_API_BASE_URL/);
  assert.match(schedule, /method: "PUT"/);
  assert.match(dbContext, /DbSet<Project>/);
  assert.match(dbContext, /DbSet<WorkItem>/);
  assert.match(dbContext, /DbSet<TaskDependency>/);
  assert.match(scheduleService, /ExecuteInTransactionAsync/);
  assert.match(scheduleService, /ClearProjectDependenciesCoreAsync/);
  assert.match(dependencyService, /DEPENDENCY_CYCLE/);
  assert.doesNotMatch(`${page}${schedule}${requestApi}`, /Cloudflare D1/);
});

test("auto-schedules FS, SS, FF and SF dependencies through a DAG", async () => {
  const { calculateDependencyConstraint, calculateDependencyLag, calculateFsRequiredStart, propagateDependencySchedule, recalibrateIncomingDependencyLags } = await import(new URL("../lib/schedule/dependencies.ts", import.meta.url).href);
  const task = (id, startDate, finishDate, duration = 5) => ({ id, projectId: "p1", type: "task", startDate, finishDate, duration });
  const a = task("a", "01/08/26", "10/08/26", 10);
  const b = task("b", "20/08/26", "24/08/26");
  const c = task("c", "01/09/26", "05/09/26");
  const finish = new Date("2026-08-07T00:00:00.000Z");
  assert.equal(calculateFsRequiredStart(finish, 0).toISOString().slice(0, 10), "2026-08-08");
  assert.equal(calculateFsRequiredStart(finish, 1).toISOString().slice(0, 10), "2026-08-09");
  assert.equal(calculateFsRequiredStart(finish, -1).toISOString().slice(0, 10), "2026-08-07");
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
  assert.equal(multi.find((item) => item.id === "b").startDate, "20/08/26");

  const fsSuccessor = task("fs-successor", "09/09/26", "11/09/26", 3);
  const ffSuccessor = task("ff-successor", "10/09/26", "12/09/26", 3);
  const septemberPredecessor = task("september-predecessor", "01/09/26", "07/09/26", 7);
  assert.equal(calculateDependencyLag(septemberPredecessor, fsSuccessor, "FS"), 1);
  assert.equal(calculateDependencyLag(septemberPredecessor, fsSuccessor, "SS"), 8);
  assert.equal(calculateDependencyLag(septemberPredecessor, ffSuccessor, "FF"), 5);
  assert.equal(calculateDependencyLag(septemberPredecessor, ffSuccessor, "SF"), 11);
  const recalibrated = recalibrateIncomingDependencyLags([septemberPredecessor, fsSuccessor], [{ id: "fs", projectId: "p1", predecessorTaskId: "september-predecessor", successorTaskId: "fs-successor", dependencyType: "FS", lag: 0 }], "fs-successor", { start: true, finish: false });
  assert.equal(recalibrated[0].lag, 1);
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
