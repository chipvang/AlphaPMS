"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ScheduleView } from "../components/schedule/ScheduleView";
import { EstimateView } from "../components/estimate/EstimateView";
import { requestApi } from "../lib/api/requestApi";
import type { ProjectDto, ProjectInput } from "../lib/projects/types";
import { useCommonDialog } from "../lib/ui/useCommonDialog";
import { useSharedTaskState } from "../lib/task-workspace/useSharedTaskState";
type Project = ProjectDto;
type ProjectStatus = ProjectDto["status"];

const blankProject: ProjectInput = {
  code: "",
  name: "",
  investor: "",
  location: "",
  manager: "",
  startDate: "",
  finishDate: "",
  budget: 0,
  progress: 0,
  status: "Chuẩn bị",
  description: "",
  visible: true,
};

type SidebarIconName = "projects" | "schedule" | "estimate" | "resources" | "catalogs" | "settings";

const menuItems = [
  ["projects", "projects", "Danh sách dự án"],
  ["schedule", "schedule", "Quản lý tiến độ"],
  ["estimate", "estimate", "Quản lý dự toán"],
  ["resources", "resources", "Nguồn lực & chi phí"],
  ["catalogs", "catalogs", "Danh mục dùng chung"],
] as const;

function SidebarIcon({ name }: { name: SidebarIconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const content = name === "projects" ? <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v16M3 9h18" /></>
    : name === "schedule" ? <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 15l3-3 3 2 4-5M7 8h.01M11 8h.01" /></>
      : name === "estimate" ? <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M7 7h10M8 11h2M14 11h2M8 15h2M14 15h2" /></>
        : name === "resources" ? <><path d="M4 19V9M10 19V5M16 19v-7M2 19h20" /><path d="M3 8h2M9 4h2M15 11h2" /></>
          : name === "catalogs" ? <><path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" /><path d="M4 12l8 4.5 8-4.5M4 16.5 12 21l8-4.5" /></>
            : <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.08a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 7.15 15a1.65 1.65 0 0 0-1.51-1H5.5v-3h.14a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.88 6l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V4.8h3v.08a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33L17.65 6l2.12 2.12-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1h.08v3h-.08a1.65 1.65 0 0 0-1.49 1Z" /></>;
  return <svg className="sidebar-icon" viewBox="0 0 24 24" aria-hidden="true" {...common}>{content}</svg>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const commonDialog = useCommonDialog();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("projects");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Tất cả" | ProjectStatus>("Tất cả");
  const [selectedId, setSelectedId] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(blankProject);
  const [notice, setNotice] = useState("Đang kết nối cơ sở dữ liệu...");
  const taskState = useSharedTaskState(projects, setNotice);

  async function loadProjects() {
    setProjectsLoading(true);
    try {
      const loaded = await requestApi<Project[]>("/api/projects");
      setProjects(loaded);
      setSelectedId((current) => loaded.some((project) => project.id === current) ? current : loaded[0]?.id ?? "");
      setNotice("Đã tải dữ liệu dự án từ cơ sở dữ liệu");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể tải danh sách dự án");
    } finally { setProjectsLoading(false); }
  }

  useEffect(() => { globalThis.queueMicrotask(() => void loadProjects()); }, []);

  const selectedProject = projects.find((project) => project.id === selectedId) ?? projects[0];
  const visibleCount = projects.filter((project) => project.visible).length;
  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi");
    return projects.filter((project) => {
      const matchesStatus = statusFilter === "Tất cả" || project.status === statusFilter;
      const matchesQuery = !keyword || [project.code, project.name, project.investor, project.location, project.manager]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(keyword);
      return matchesStatus && matchesQuery;
    });
  }, [projects, query, statusFilter]);

  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);
  const activeCount = projects.filter((project) => project.status === "Đang thực hiện").length;

  async function toggleVisibility(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    try {
      const saved = await requestApi<Project>(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ ...project, visible: !project.visible }) });
      setProjects((current) => current.map((item) => item.id === projectId ? saved : item));
      setNotice("Đã cập nhật phạm vi dự án trong cơ sở dữ liệu");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật dự án"); }
  }

  function openCreate() {
    setDraft({ ...blankProject });
    setModalMode("create");
  }

  function openEdit(project: Project) {
    setDraft({
      code: project.code,
      name: project.name,
      investor: project.investor,
      location: project.location,
      manager: project.manager,
      startDate: project.startDate,
      finishDate: project.finishDate,
      budget: project.budget,
      progress: project.progress,
      status: project.status,
      description: project.description,
      visible: project.visible,
    });
    setModalMode("edit");
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.code.trim() || !draft.name.trim()) return;
    try {
      if (modalMode === "create") {
        const project = await requestApi<Project>("/api/projects", { method: "POST", body: JSON.stringify(draft) });
        setProjects((current) => [project, ...current]);
        setSelectedId(project.id);
        setNotice(`Đã tạo và lưu ${project.name}`);
      } else if (selectedProject) {
        const project = await requestApi<Project>(`/api/projects/${selectedProject.id}`, { method: "PATCH", body: JSON.stringify(draft) });
        setProjects((current) => current.map((item) => item.id === project.id ? project : item));
        setNotice(`Đã cập nhật ${project.name}`);
      }
      setModalMode(null);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể lưu dự án"); }
  }

  async function duplicateProject(project: Project) {
    const copy: ProjectInput = {
      ...project,
      code: `${project.code}-CP`,
      name: `${project.name} — Bản sao`,
      status: "Chuẩn bị",
      progress: 0,
      visible: false,
    };
    try {
      const saved = await requestApi<Project>("/api/projects", { method: "POST", body: JSON.stringify(copy) });
      setProjects((current) => [saved, ...current]); setSelectedId(saved.id);
      setNotice("Đã nhân bản dự án vào cơ sở dữ liệu");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể nhân bản dự án"); }
  }

  async function archiveProject(project: Project) {
    if (!await commonDialog.confirm({
      title: "Hoàn thành dự án",
      message: `Chuyển “${project.name}” sang trạng thái Hoàn thành?`,
      detail: "Dự án sẽ được bỏ khỏi phạm vi hiển thị hiện tại.",
      confirmText: "Hoàn thành",
      tone: "warning",
    })) return;
    try {
      const saved = await requestApi<Project>(`/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ ...project, status: "Hoàn thành", visible: false }) });
      setProjects((current) => current.map((item) => item.id === project.id ? saved : item));
      setNotice("Đã hoàn thành và lưu trạng thái dự án");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật dự án"); }
  }

  async function removeProject(project: Project) {
    if (!await commonDialog.confirm({
      title: "Xóa dự án",
      message: `Xóa dự án “${project.name}”?`,
      detail: "Toàn bộ cây WBS và các quan hệ công việc của dự án cũng sẽ bị xóa. Thao tác này không thể hoàn tác sau khi lưu.",
      confirmText: "Xóa dự án",
      tone: "danger",
    })) return;
    try {
      await requestApi<void>(`/api/projects/${project.id}`, { method: "DELETE" });
      const remaining = projects.filter((item) => item.id !== project.id);
      setProjects(remaining); setSelectedId(remaining[0]?.id ?? "");
      setNotice("Đã xóa dự án và toàn bộ cây WBS");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể xóa dự án"); }
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <aside className="app-sidebar">
        <div className="brand-row">
          <div className="brand-mark">A</div>
          {sidebarOpen && <div><strong>AlphaPMS</strong><span>Project Control</span></div>}
          <button className="icon-button collapse-button" onClick={() => setSidebarOpen((value) => !value)} aria-label={sidebarOpen ? "Thu gọn thanh bên" : "Mở rộng thanh bên"}>{sidebarOpen ? "‹" : "›"}</button>
        </div>

        <nav className="main-nav" aria-label="Phân hệ">
          {menuItems.map(([id, icon, label]) => <button key={id} className={activeMenu === id ? "active" : ""} onClick={() => { setActiveMenu(id); setNotice(id === "projects" ? "Đang ở Quản lý dự án" : id === "schedule" ? "Đang ở Quản lý tiến độ nhiều dự án" : id === "estimate" ? "Đang ở Quản lý dự toán" : `${label} sẽ được hoàn thiện ở bước tiếp theo`); }} title={!sidebarOpen ? label : undefined}>
            <span className="menu-symbol"><SidebarIcon name={icon} /></span>{sidebarOpen && <span>{label}</span>}
          </button>)}
        </nav>

        <div className="sidebar-footer">
          <button title={!sidebarOpen ? "Cấu hình" : undefined}><span className="menu-symbol"><SidebarIcon name="settings" /></span>{sidebarOpen && <span>Cấu hình</span>}</button>
          <div className="user-row"><div className="avatar">TP</div>{sidebarOpen && <div><strong>Tuấn Phạm</strong><span>Quản trị dự án</span></div>}</div>
        </div>
      </aside>

      <main className="app-main">
        {activeMenu !== "schedule" && activeMenu !== "estimate" && <header className="topbar">
          {activeMenu === "projects" ? <>
            <div><p>Danh mục dự án</p><h1>Quản lý dự án</h1></div>
            <div className="topbar-actions"><button className="button secondary" disabled={projectsLoading} onClick={loadProjects}>Làm mới</button><button className="button primary" onClick={openCreate}><span>＋</span> Tạo dự án</button></div>
          </> : <>
            <div><p>Phân hệ AlphaPMS</p><h1>{menuItems.find(([id]) => id === activeMenu)?.[2]}</h1></div>
          </>}
        </header>}

        {activeMenu === "schedule" ? <ScheduleView projects={projects} onNotice={setNotice} taskState={taskState} /> : activeMenu === "estimate" ? <EstimateView projects={projects} onNotice={setNotice} taskState={taskState} /> : activeMenu !== "projects" ? (
          <section className="placeholder-panel"><span className="placeholder-icon">◇</span><h2>{menuItems.find(([id]) => id === activeMenu)?.[2]}</h2><p>Phân hệ này sẽ được hoàn thiện ở bước tiếp theo. Chọn “Danh sách dự án” để tiếp tục quản lý phạm vi dự án.</p><button className="button primary" onClick={() => setActiveMenu("projects")}>Mở Danh sách dự án</button></section>
        ) : <>
          <section className="summary-grid" aria-label="Tổng quan dự án">
            <article><span>Tổng dự án</span><strong>{projects.length}</strong><small>{activeCount} đang thực hiện</small></article>
            <article><span>Đang hiển thị</span><strong>{visibleCount}</strong><small>Dùng chung cho tiến độ, dự toán</small></article>
            <article><span>Tổng giá trị</span><strong>{(totalBudget / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ</strong><small>Giá trị dữ liệu mẫu</small></article>
            <article><span>Cập nhật gần nhất</span><strong>Hôm nay</strong><small>{selectedProject?.updatedAt}</small></article>
          </section>

          <section className="project-workspace">
            <div className="list-pane">
              <div className="list-tools">
                <label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên, chủ đầu tư, địa điểm..." /></label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "Tất cả" | ProjectStatus)} aria-label="Lọc trạng thái">
                  <option>Tất cả</option><option>Đang thực hiện</option><option>Chuẩn bị</option><option>Tạm dừng</option><option>Hoàn thành</option>
                </select>
              </div>
              <div className="project-count">{filteredProjects.length} dự án <span>· Chọn một dòng để xem và chỉnh sửa</span></div>
              <div className="table-wrap"><table className="project-table"><thead><tr><th>Hiển thị</th><th>Mã</th><th>Tên dự án</th><th>Trạng thái</th><th>Tiến độ</th><th>Giá trị</th></tr></thead><tbody>
                {filteredProjects.map((project) => <tr key={project.id} className={project.id === selectedId ? "selected" : ""} onClick={() => setSelectedId(project.id)}>
                  <td onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={project.visible} onChange={() => toggleVisibility(project.id)} aria-label={`Hiển thị ${project.name}`} /></td>
                  <td><strong>{project.code}</strong></td><td><strong>{project.name}</strong><small>{project.investor}</small></td><td><span className={`status status-${project.status.replaceAll(" ", "-").toLowerCase()}`}>{project.status}</span></td>
                  <td><div className="progress-cell"><div><i style={{ width: `${project.progress}%` }} /></div><span>{project.progress}%</span></div></td><td className="number">{formatCurrency(project.budget)}</td>
                </tr>)}
                {!filteredProjects.length && <tr><td colSpan={6} className="empty-row">Không tìm thấy dự án phù hợp.</td></tr>}
              </tbody></table></div>
            </div>

            {selectedProject && <aside className="detail-pane">
              <div className="detail-head"><div className="project-avatar">{selectedProject.code.slice(0, 2)}</div><div><span>{selectedProject.code}</span><h2>{selectedProject.name}</h2></div><span className="grow" /><button className="icon-button" onClick={() => openEdit(selectedProject)} aria-label="Sửa dự án">✎</button></div>
              <div className="detail-actions"><button className="button primary" onClick={() => openEdit(selectedProject)}>Chỉnh sửa</button><button className="button secondary" onClick={() => duplicateProject(selectedProject)}>Nhân bản</button><button className="button secondary" onClick={() => archiveProject(selectedProject)}>Hoàn thành</button><button className="button secondary" onClick={() => removeProject(selectedProject)}>Xóa</button></div>
              <dl className="detail-grid"><div><dt>Chủ đầu tư</dt><dd>{selectedProject.investor}</dd></div><div><dt>Chủ nhiệm dự án</dt><dd>{selectedProject.manager}</dd></div><div><dt>Địa điểm</dt><dd>{selectedProject.location}</dd></div><div><dt>Trạng thái</dt><dd>{selectedProject.status}</dd></div><div><dt>Ngày bắt đầu</dt><dd>{selectedProject.startDate || "Chưa xác định"}</dd></div><div><dt>Ngày kết thúc</dt><dd>{selectedProject.finishDate || "Chưa xác định"}</dd></div><div><dt>Tổng giá trị</dt><dd>{formatCurrency(selectedProject.budget)} đ</dd></div><div><dt>Tiến độ tổng hợp</dt><dd>{selectedProject.progress}%</dd></div></dl>
              <div className="description-box"><span>Mô tả</span><p>{selectedProject.description || "Chưa có mô tả."}</p></div>
              <div className="scope-box"><div><span>Phạm vi hiển thị</span><strong>{selectedProject.visible ? "Đang bật" : "Đang tắt"}</strong></div><button className="switch" role="switch" aria-checked={selectedProject.visible} onClick={() => toggleVisibility(selectedProject.id)}><i /></button></div>
              <div className="activity-note"><span>◷</span><div><strong>Cập nhật gần nhất</strong><p>{new Date(selectedProject.updatedAt).toLocaleString("vi-VN")} · Đã lưu trong cơ sở dữ liệu</p></div></div>
            </aside>}
          </section>
        </>}

        <footer className="statusbar"><span className="online-dot" /> Localhost đang hoạt động <span>·</span><span>{notice}</span><span className="grow" /><span>ASP.NET Core · SQLite</span></footer>
      </main>

      {commonDialog.dialog}

      {modalMode && <div className="modal-backdrop">
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
          <header><div><span>{modalMode === "create" ? "Dự án mới" : selectedProject?.code}</span><h2 id="project-modal-title">{modalMode === "create" ? "Tạo dự án" : "Chỉnh sửa dự án"}</h2></div><button className="icon-button" onClick={() => setModalMode(null)} aria-label="Đóng">×</button></header>
          <form onSubmit={saveProject}>
            <div className="form-grid">
              <label><span>Mã dự án *</span><input required value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="VD: BA-2026" /></label>
              <label className="wide"><span>Tên dự án *</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Tên đầy đủ của dự án" /></label>
              <label className="wide"><span>Chủ đầu tư</span><input value={draft.investor} onChange={(event) => setDraft({ ...draft, investor: event.target.value })} /></label>
              <label><span>Chủ nhiệm dự án</span><input value={draft.manager} onChange={(event) => setDraft({ ...draft, manager: event.target.value })} /></label>
              <label><span>Địa điểm</span><input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
              <label><span>Ngày bắt đầu</span><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
              <label><span>Ngày kết thúc</span><input type="date" value={draft.finishDate} onChange={(event) => setDraft({ ...draft, finishDate: event.target.value })} /></label>
              <label><span>Tổng giá trị (đồng)</span><input type="number" min="0" value={draft.budget} onChange={(event) => setDraft({ ...draft, budget: Number(event.target.value) })} /></label>
              <label><span>Tiến độ (%)</span><input type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Math.min(100, Math.max(0, Number(event.target.value))) })} /></label>
              <label><span>Trạng thái</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ProjectStatus })}><option>Chuẩn bị</option><option>Đang thực hiện</option><option>Tạm dừng</option><option>Hoàn thành</option></select></label>
              <label className="wide"><span>Mô tả</span><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label className="checkbox-field wide"><input type="checkbox" checked={draft.visible} onChange={(event) => setDraft({ ...draft, visible: event.target.checked })} /><span>Hiển thị dự án trong các phân hệ tiến độ, dự toán và biểu đồ</span></label>
            </div>
            <footer><button type="button" className="button secondary" onClick={() => setModalMode(null)}>Hủy</button><button type="submit" className="button primary">{modalMode === "create" ? "Tạo dự án" : "Lưu thay đổi"}</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
