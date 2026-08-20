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
  assert.match(html, /Dự án hiển thị/);
});

test("keeps the committed schedule interaction contract", async () => {
  const [page, css, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const \[outlineLevel, setOutlineLevel\] = useState\(4\)/);
  assert.match(page, /aria-label="Chèn phía trên"/);
  assert.match(page, /aria-label="Chèn phía dưới"/);
  assert.match(page, /7 \* ganttDayStep/);
  assert.match(page, /summary-progress-line/);
  assert.match(page, /calculateScheduleOrder/);
  assert.match(css, /--schedule-name-width, 400px/);
  assert.match(css, /\.summary-bar/);
  assert.match(css, /--summary-height:\s*14px/);
  assert.match(css, /--ui-min-font-size:\s*10px/);
  assert.match(page, /taskDetailMode/);
  assert.match(page, /ganttBottomScrollRef/);
  assert.match(page, /ganttHeaderScrollRef/);
  assert.match(css, /\.gantt-scrollbar-dock/);
  assert.match(css, /grid-template-rows:\s*74px minmax\(0, 1fr\) 17px/);
  assert.match(css, /\.schedule-board-body/);
  assert.match(css, /\.summary-workItem/);
  assert.match(css, /\.summary-group/);
  assert.match(css, /height:\s*35px/);
  assert.match(layout, /lang="vi"/);
});
