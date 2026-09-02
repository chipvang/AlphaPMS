"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** WBS row presentation; ScheduleView supplies only state and domain callbacks. */
type TaskGridRowProps = {
  item: any;
  context: any;
};

export function TaskGridRow({ item, context }: TaskGridRowProps) {
  const {
    selectedItem, hasChildren, summaryDates, getProjectScheduleStatus, projectStatusById,
    incomingDependencies, formatDependencyLabel, scheduleOrder, itemById, wbsDrag,
    suppressWbsClickRef, setSelectedItemId, openTaskContextMenu, startWbsDrag,
    addChildItem, insertScheduleItem, deleteItem, autoEditItemId, setAutoEditItemId,
    getScheduleTreeDepth, collapsedIds, toggleCollapse, InlineNameEditor, commitItems,
    onNotice, columnGroupVisibility, updateDuration, InlineDateEditor,
    updateScheduleDate, openDependencyEditor, ScheduleStatusChip, formatOptionalNumber,
  } = context;            const isSelected = item.id === selectedItem?.id;
            const expandable = hasChildren(item.id);
            const derivedDates = item.type === "task" ? null : summaryDates.get(item.id);
            const displayStatus = item.type === "project" ? getProjectScheduleStatus(projectStatusById.get(item.projectId)) : "NOT_STARTED";
            const itemDependencies = incomingDependencies.get(item.id) ?? [];
            const predecessorText = itemDependencies.length ? itemDependencies.map((dependency) => formatDependencyLabel(dependency, scheduleOrder)).join(";") : "—";
            const predecessorTooltip = itemDependencies.map((dependency) => {
              const predecessor = itemById.get(dependency.predecessorTaskId);
              const lagText = dependency.lag ? ` ${dependency.lag > 0 ? "+" : ""}${dependency.lag} ngày` : "";
              return `${scheduleOrder.get(dependency.predecessorTaskId) ?? "?"} — ${predecessor?.name ?? "Không tìm thấy công tác"} — ${dependency.dependencyType}${lagText}`;
            }).join("\n");
            return <div key={item.id} data-wbs-row-id={item.id} className={`schedule-table-grid schedule-row row-${item.type} ${isSelected ? "selected" : ""} ${wbsDrag?.sourceId === item.id && wbsDrag.isActive ? "wbs-drag-source" : ""}`} role="button" tabIndex={0} onClick={() => { if (suppressWbsClickRef.current) { suppressWbsClickRef.current = false; return; } setSelectedItemId(item.id); }} onContextMenu={(event) => openTaskContextMenu(event, item)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) setSelectedItemId(item.id); }}>
              <div className={`wbs-cell ${item.type === "project" ? "" : "wbs-drag-cell"}`} aria-label={item.type === "project" ? undefined : "Kéo để sắp xếp"} title={item.type === "project" ? `WBS: ${item.wbs}` : `STT ${scheduleOrder.get(item.id)} · Kéo để sắp xếp`} onPointerDown={(event) => startWbsDrag(event, item)}>{scheduleOrder.get(item.id)}</div>
              <div className="row-actions">
                {item.type === "project"
                  ? <button className="action-slot-add" aria-label="Thêm hạng mục" title="Thêm hạng mục" onClick={() => addChildItem(item)}>+</button>
                  : <>{(item.type === "workItem" || item.type === "group") && <button className="action-slot-add" aria-label="Thêm công tác" title="Thêm công tác" onClick={() => addChildItem(item)}>+</button>}<button className="action-slot-insert-above" aria-label="Chèn lên trên" title="Chèn lên trên" onClick={() => insertScheduleItem(item, "before")}><span className="action-triangle">▲</span></button><button className="action-slot-insert-below" aria-label="Chèn xuống dưới" title="Chèn xuống dưới" onClick={() => insertScheduleItem(item, "after")}><span className="action-triangle">▼</span></button><button className="action-slot-delete" aria-label="Xóa" title="Xóa" onClick={() => deleteItem(item)}><svg className="action-trash-icon" aria-hidden="true" viewBox="0 0 16 16"><path d="M5 5v7m3-7v7m3-7v7M3.5 3.5h9l-.6 10h-7.8l-.6-10ZM6 3.5V2h4v1.5M2.5 3.5h11" /></svg></button></>}
              </div>
              <div className={`task-name ${autoEditItemId === item.id ? "is-editing" : ""}`} style={{ paddingLeft: `${10 + getScheduleTreeDepth(item, itemById) * 12}px` }} onDoubleClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button, input")) return;
                event.stopPropagation();
                setSelectedItemId(item.id);
                setAutoEditItemId(item.id);
              }}>
                {expandable ? <button className="tree-toggle" type="button" aria-label={collapsedIds.has(item.id) ? "Mở rộng" : "Thu gọn"} aria-expanded={!collapsedIds.has(item.id)} onClick={(event) => { event.stopPropagation(); toggleCollapse(item.id); }}><svg viewBox="0 0 16 16" aria-hidden="true"><path d={collapsedIds.has(item.id) ? "m6 3 5 5-5 5" : "m3 6 5 5 5-5"} /></svg></button> : <span className="tree-spacer" />}
                <InlineNameEditor key={`${item.id}-${autoEditItemId === item.id ? "editing" : "display"}`} value={item.name} autoEdit={autoEditItemId === item.id} onFinishEditing={() => setAutoEditItemId((currentId) => currentId === item.id ? null : currentId)} onCommit={(name) => { setSelectedItemId(item.id); commitItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, name } : currentItem), { description: `Đổi tên ${item.wbs} thành “${name}”` }); onNotice(`Đã đổi tên ${item.wbs}`); }} />{item.nature && autoEditItemId !== item.id && <small>{item.nature}</small>}
              </div>
              <div className="plain-data-cell">{item.type === "task" ? item.unit ?? "—" : "—"}</div>
              {columnGroupVisibility.progress && <>{item.type === "task" ? <><div className="duration-cell"><input aria-label={`Thời lượng ${item.name}`} type="number" min="1" value={item.duration} onFocus={(event) => { setSelectedItemId(item.id); event.currentTarget.select(); }} onChange={(event) => updateDuration(item, Number(event.target.value))} onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Enter") event.currentTarget.blur(); }} /><span>n</span></div>
              <div className="date-cell"><InlineDateEditor key={`${item.id}-start-${item.startDate}`} label={`Ngày bắt đầu ${item.name}`} value={item.startDate} onCommit={(value) => { setSelectedItemId(item.id); return updateScheduleDate(item, "startDate", value); }} onInvalid={() => onNotice("Ngày bắt đầu phải đúng định dạng dd/MM/yy")} /></div>
              <div className="date-cell"><InlineDateEditor key={`${item.id}-finish-${item.finishDate}`} label={`Ngày kết thúc ${item.name}`} value={item.finishDate} onCommit={(value) => { setSelectedItemId(item.id); return updateScheduleDate(item, "finishDate", value); }} onInvalid={() => onNotice("Ngày kết thúc phải đúng định dạng dd/MM/yy")} /></div></> : <><div className="duration-cell summary-value"><span>{derivedDates?.duration ?? "—"} {derivedDates ? "ngày" : ""}</span></div><div className="date-cell summary-value"><span>{derivedDates?.startDate ?? "—"}</span></div><div className="date-cell summary-value"><span>{derivedDates?.finishDate ?? "—"}</span></div></>}
              <div className={`predecessor-cell ${item.type === "task" ? "editable" : ""}`} title={predecessorTooltip || "Không có công tác trước"} onDoubleClick={() => openDependencyEditor(item)}><span>{item.type === "task" ? predecessorText : "—"}</span></div>
              <div className="schedule-status-cell"><ScheduleStatusChip status={displayStatus} /></div></>}
              {columnGroupVisibility.estimate && <><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.quantity) : "—"}</div><div className="numeric-data-cell">{item.type === "task" && item.quantity != null && item.duration > 0 ? formatOptionalNumber(item.quantity / item.duration) : "—"}</div></>}
              {columnGroupVisibility.resource && <><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.machineShiftCoefficient) : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.machineCount) : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.managedLabor) : "—"}</div><div className="numeric-data-cell">{item.type === "task" ? formatOptionalNumber(item.permanentLabor) : "—"}</div></>}
            </div>;
}
