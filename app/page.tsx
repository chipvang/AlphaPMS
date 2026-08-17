"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ProjectStatus = "Đang thực hiện" | "Chuẩn bị" | "Tạm dừng" | "Hoàn thành";

type Project = {
  id: string;
  code: string;
  name: string;
  investor: string;
  location: string;
  manager: string;
  startDate: string;
  finishDate: string;
  budget: number;
  progress: number;
  status: ProjectStatus;
  description: string;
  visible: boolean;
  updatedAt: string;
};

const storageKey = "alphapms-projects-v1";

const initialProjects: Project[] = [
  {
    id: "prj-bac-an",
    code: "BA-2026",
    name: "Dự án thoát nước Bắc An",
    investor: "Ban QLDA Hạ tầng Bắc An",
    location: "Bắc An, Hải Phòng",
    manager: "Nguyễn Minh Tuấn",
    startDate: "2026-08-20",
    finishDate: "2027-04-30",
    budget: 18426580000,
    progress: 28,
    status: "Đang thực hiện",
    description: "Thi công hệ thống thoát nước, đường giao thông và hoàn trả hạ tầng.",
    visible: true,
    updatedAt: "17/08/2026 15:40",
  },
  {
    id: "prj-song-xanh",
    code: "CSX-02",
    name: "Dự án cầu Sông Xanh",
    investor: "Sở Xây dựng Thành phố",
    location: "Quận Đông Hải",
    manager: "Trần Hải Nam",
    startDate: "2026-07-01",
    finishDate: "2027-12-15",
    budget: 42614900000,
    progress: 16,
    status: "Đang thực hiện",
    description: "Cầu bê tông cốt thép dự ứng lực và đường dẫn hai đầu cầu.",
    visible: true,
    updatedAt: "16/08/2026 10:12",
  },
  {
    id: "prj-factory-a2",
    code: "NMA2-01",
    name: "Nhà máy sản xuất A2",
    investor: "Công ty Công nghiệp Alpha",
    location: "KCN Nam Đình Vũ",
    manager: "Lê Thu Hà",
    startDate: "2026-10-01",
    finishDate: "2027-08-20",
    budget: 78500000000,
    progress: 4,
    status: "Chuẩn bị",
    description: "Nhà xưởng, hạ tầng kỹ thuật và hệ thống phụ trợ.",
    visible: false,
    updatedAt: "15/08/2026 08:30",
  },
  {
    id: "prj-road-5",
    code: "GT-05",
    name: "Nâng cấp tuyến đường số 5",
    investor: "UBND Quận Nam Sơn",
    location: "Nam Sơn",
    manager: "Phạm Quang Huy",
    startDate: "2025-11-12",
    finishDate: "2026-09-30",
    budget: 21800000000,
    progress: 86,
    status: "Tạm dừng",
    description: "Nâng cấp nền, mặt đường, thoát nước và chiếu sáng.",
    visible: false,
    updatedAt: "12/08/2026 14:05",
  },
];

const blankProject: Omit<Project, "id" | "updatedAt"> = {
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

const menuItems = [
  ["schedule", "▤", "Quản lý tiến độ"],
  ["estimate", "▦", "Quản lý dự toán"],
  ["resources", "⌁", "Nguồn lực & chi phí"],
  ["projects", "□", "Quản lý dự án"],
  ["catalogs", "▱", "Danh mục dùng chung"],
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

function todayLabel() {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [storageReady, setStorageReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("projects");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Tất cả" | ProjectStatus>("Tất cả");
  const [selectedId, setSelectedId] = useState(initialProjects[0].id);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState(blankProject);
  const [notice, setNotice] = useState("Dữ liệu mẫu đã sẵn sàng để thao tác");

  useEffect(() => {
    const saved = globalThis.localStorage?.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Project[];
        if (Array.isArray(parsed) && parsed.length) {
          globalThis.queueMicrotask(() => {
            setProjects(parsed);
            setStorageReady(true);
          });
          return;
        }
      } catch {
        globalThis.localStorage?.removeItem(storageKey);
      }
    }
    globalThis.queueMicrotask(() => setStorageReady(true));
  }, []);

  useEffect(() => {
    if (storageReady) globalThis.localStorage?.setItem(storageKey, JSON.stringify(projects));
  }, [projects, storageReady]);

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

  function toggleVisibility(projectId: string) {
    setProjects((current) => current.map((project) => project.id === projectId ? { ...project, visible: !project.visible } : project));
    setNotice("Đã cập nhật phạm vi dự án hiển thị trên các phân hệ");
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

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.code.trim() || !draft.name.trim()) return;
    if (modalMode === "create") {
      const project: Project = {
        ...draft,
        id: `prj-${Date.now()}`,
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        updatedAt: todayLabel(),
      };
      setProjects((current) => [project, ...current]);
      setSelectedId(project.id);
      setNotice(`Đã tạo ${project.name}`);
    } else if (selectedProject) {
      setProjects((current) => current.map((project) => project.id === selectedProject.id ? {
        ...project,
        ...draft,
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        updatedAt: todayLabel(),
      } : project));
      setNotice(`Đã cập nhật ${draft.name}`);
    }
    setModalMode(null);
  }

  function duplicateProject(project: Project) {
    const copy: Project = {
      ...project,
      id: `prj-${Date.now()}`,
      code: `${project.code}-CP`,
      name: `${project.name} — Bản sao`,
      status: "Chuẩn bị",
      progress: 0,
      visible: false,
      updatedAt: todayLabel(),
    };
    setProjects((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Đã nhân bản dự án; bản sao đang ở trạng thái Chuẩn bị");
  }

  function archiveProject(project: Project) {
    if (!globalThis.confirm(`Chuyển “${project.name}” sang trạng thái Hoàn thành?`)) return;
    setProjects((current) => current.map((item) => item.id === project.id ? { ...item, status: "Hoàn thành", visible: false, updatedAt: todayLabel() } : item));
    setNotice("Đã hoàn thành và bỏ dự án khỏi phạm vi hiển thị");
  }

  function resetDemo() {
    if (!globalThis.confirm("Khôi phục toàn bộ dữ liệu dự án mẫu ban đầu?")) return;
    setProjects(initialProjects);
    setSelectedId(initialProjects[0].id);
    setQuery("");
    setStatusFilter("Tất cả");
    setNotice("Đã khôi phục dữ liệu mẫu");
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <aside className="app-sidebar">
        <div className="brand-row">
          <div className="brand-mark">A</div>
          {sidebarOpen && <div><strong>AlphaPMS</strong><span>Project Control</span></div>}
          <button className="icon-button collapse-button" onClick={() => setSidebarOpen((value) => !value)} aria-label={sidebarOpen ? "Thu gọn thanh bên" : "Mở rộng thanh bên"}>{sidebarOpen ? "‹" : "›"}</button>
        </div>

        <section className="project-picker">
          <button className="picker-heading" onClick={() => setPickerOpen((value) => !value)} aria-expanded={pickerOpen}>
            <span className="menu-symbol">◫</span>
            {sidebarOpen && <><span><strong>Dự án hiển thị</strong><small>{visibleCount}/{projects.length} dự án được chọn</small></span><b>{pickerOpen ? "⌃" : "⌄"}</b></>}
          </button>
          {sidebarOpen && pickerOpen && <div className="picker-list">
            {projects.map((project) => <label key={project.id} className="project-check">
              <input type="checkbox" checked={project.visible} onChange={() => toggleVisibility(project.id)} aria-label={`Hiển thị ${project.name}`} />
              <span><strong>{project.name}</strong><small>{project.code} · {project.status}</small></span>
            </label>)}
          </div>}
        </section>

        <nav className="main-nav" aria-label="Phân hệ">
          {menuItems.map(([id, icon, label]) => <button key={id} className={activeMenu === id ? "active" : ""} onClick={() => { setActiveMenu(id); setNotice(id === "projects" ? "Đang ở Quản lý dự án" : `${label} sẽ được hoàn thiện ở bước tiếp theo`); }} title={!sidebarOpen ? label : undefined}>
            <span className="menu-symbol">{icon}</span>{sidebarOpen && <span>{label}</span>}
          </button>)}
        </nav>

        <div className="sidebar-footer">
          <button title={!sidebarOpen ? "Cấu hình" : undefined}><span className="menu-symbol">⚙</span>{sidebarOpen && <span>Cấu hình</span>}</button>
          <div className="user-row"><div className="avatar">TP</div>{sidebarOpen && <div><strong>Tuấn Phạm</strong><span>Quản trị dự án</span></div>}</div>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div><p>Danh mục dự án</p><h1>Quản lý dự án</h1></div>
          <div className="topbar-actions"><button className="button secondary" onClick={resetDemo}>Khôi phục dữ liệu mẫu</button><button className="button primary" onClick={openCreate}><span>＋</span> Tạo dự án</button></div>
        </header>

        {activeMenu !== "projects" ? (
          <section className="placeholder-panel"><span className="placeholder-icon">◇</span><h2>{menuItems.find(([id]) => id === activeMenu)?.[2]}</h2><p>Khung điều hướng đã hoạt động. Chọn “Quản lý dự án” để tiếp tục thử dữ liệu dự án.</p><button className="button primary" onClick={() => setActiveMenu("projects")}>Quay lại Quản lý dự án</button></section>
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
              <div className="detail-actions"><button className="button primary" onClick={() => openEdit(selectedProject)}>Chỉnh sửa</button><button className="button secondary" onClick={() => duplicateProject(selectedProject)}>Nhân bản</button><button className="button secondary" onClick={() => archiveProject(selectedProject)}>Hoàn thành</button></div>
              <dl className="detail-grid"><div><dt>Chủ đầu tư</dt><dd>{selectedProject.investor}</dd></div><div><dt>Chủ nhiệm dự án</dt><dd>{selectedProject.manager}</dd></div><div><dt>Địa điểm</dt><dd>{selectedProject.location}</dd></div><div><dt>Trạng thái</dt><dd>{selectedProject.status}</dd></div><div><dt>Ngày bắt đầu</dt><dd>{selectedProject.startDate || "Chưa xác định"}</dd></div><div><dt>Ngày kết thúc</dt><dd>{selectedProject.finishDate || "Chưa xác định"}</dd></div><div><dt>Tổng giá trị</dt><dd>{formatCurrency(selectedProject.budget)} đ</dd></div><div><dt>Tiến độ tổng hợp</dt><dd>{selectedProject.progress}%</dd></div></dl>
              <div className="description-box"><span>Mô tả</span><p>{selectedProject.description || "Chưa có mô tả."}</p></div>
              <div className="scope-box"><div><span>Phạm vi hiển thị</span><strong>{selectedProject.visible ? "Đang bật" : "Đang tắt"}</strong></div><button className="switch" role="switch" aria-checked={selectedProject.visible} onClick={() => toggleVisibility(selectedProject.id)}><i /></button></div>
              <div className="activity-note"><span>◷</span><div><strong>Cập nhật gần nhất</strong><p>{selectedProject.updatedAt} · Dữ liệu được lưu trên trình duyệt này</p></div></div>
            </aside>}
          </section>
        </>}

        <footer className="statusbar"><span className="online-dot" /> Localhost đang hoạt động <span>·</span><span>{notice}</span><span className="grow" /><span>Chưa kết nối cơ sở dữ liệu thật</span></footer>
      </main>

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
